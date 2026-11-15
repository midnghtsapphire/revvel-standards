#!/usr/bin/env python3
"""Generate repo file changes from an issue, Layer 0 first.

The model call goes through `scripts/local_llm.py`, which cascades LM Studio ->
Ollama -> OpenRouter. This script used to POST to OpenRouter directly, which
made every work request a paid call and turned a shut spend gate into a hard
failure instead of a free local run (#17849; learnings.md 2026-08-21).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests

# `scripts/` is not an importable package, so put it on the path explicitly.
_SCRIPTS_DIR = Path(__file__).resolve().parents[2] / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import local_llm  # noqa: E402  (requires the sys.path line above)


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def extract_json_payload(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if not text:
        raise ValueError("The model returned empty content.")

    for match in re.finditer(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text):
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            continue

    candidate = text

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end == -1 or end < start:
            raise ValueError("Model response did not include valid JSON.") from None
        return json.loads(candidate[start : end + 1])


def validate_rel_path(path_value: str) -> Path:
    normalized_path = path_value.strip()
    if not normalized_path:
        raise ValueError("File path must not be empty.")

    rel_path = Path(normalized_path)
    if rel_path == Path(".") or rel_path.is_absolute() or ".." in rel_path.parts:
        raise ValueError(f"Unsafe file path: {path_value}")
    return rel_path


def write_files(files: list[dict[str, Any]], repo_root: Path) -> list[str]:
    written: list[str] = []
    for item in files:
        path_value = item.get("path")
        content = item.get("content")
        if not isinstance(path_value, str) or not isinstance(content, str):
            raise ValueError("Each file entry must include string `path` and `content`.")

        rel_path = validate_rel_path(path_value)
        full_path = repo_root / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        written.append(str(rel_path))
    return written


def comment_issue(repo: str, issue_number: str, github_token: str, body: str) -> None:
    if not (repo and issue_number and github_token):
        return

    owner, _, name = repo.partition("/")
    if not owner or not name:
        return

    url = f"https://api.github.com/repos/{owner}/{name}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "openrouter-coder-workflow",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    try:
        response = requests.post(url, headers=headers, json={"body": body}, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"Warning: failed to post issue comment: {exc}", file=sys.stderr)


MISSION_CONTEXT = """
## MISSION: $10M in 3 Years
**PRIME DIRECTIVE:** Start at $10k/month → Scale to $10M total by year 3

## GOAL STRUCTURE
- Phase 1: $10k/month (Month 1-6)
- Phase 2: $30k/month (Month 6-18)
- Phase 3: $100k/month (Month 18-30)
- Phase 4: $10M total (Month 30-36)

## FOCUS AREAS
1. POLAR.SH - GitHub funding platform
2. OSINT tools
3. Automated product pipeline
"""

def build_system_prompt() -> str:
    return (
        "You are an automated coding agent working in a GitHub repository.\n"
        "Use the issue title/body to decide exact file edits.\n"
        "ALWAYS prioritize the PRIME DIRECTIVE: $10k/month → $10M in 3 years.\n"
        + MISSION_CONTEXT + "\n"
        "Return ONLY JSON in this exact shape:\n"
        '{"files":[{"path":"relative/path.ext","content":"full file content"}],'
        '"commit_message":"feat: short message"}\n'
        "Rules:\n"
        "- Use relative repository paths only.\n"
        "- Return full file content for each changed file.\n"
        "- Keep commit_message concise and imperative.\n"
        "- If no safe change is possible, return {\"files\":[],\"commit_message\":\"chore: no changes\"}."
    )


def build_prompt(repo: str, issue_title: str, issue_body: str) -> str:
    """One flat prompt — the local lanes do not all accept a separate system role."""
    selected_context = ""
    # Opt in while relevance is evaluated against historical WRs. Failure is
    # explicit: silently dropping mandatory owner rules would be unsafe context.
    if env("REVVEL_CONTEXT_GRAPH") == "1":
        from context_graph import select_context
        selected = select_context(
            _SCRIPTS_DIR.parent, f"{issue_title}\n{issue_body}",
            max_chars=int(env("REVVEL_CONTEXT_MAX_CHARS", "60000")),
        )
        selected_context = "\n\n" + selected["content"]
        if env("REVVEL_PROMPT_COMPRESSION") == "1":
            from prompt_compression import compress_context
            # Owner instructions are never compressed. Only optional references
            # are candidates, so compression cannot silently weaken those rules.
            from context_graph import MANDATORY, build_graph
            documents, _ = build_graph(_SCRIPTS_DIR.parent)
            mandatory = "\n\n".join(documents[name] for name in MANDATORY)
            references = "\n\n".join(
                documents[name] for name in selected["paths"] if name not in MANDATORY
            )
            compressed = compress_context(references, float(env("REVVEL_COMPRESSION_RATE", "0.3")))
            selected_context = "\n\n" + mandatory + "\n\n" + compressed["content"]
    return (
        f"{build_system_prompt()}\n\n"
        f"Repository: {repo or '(unknown)'}\n\n"
        f"Issue title:\n{issue_title or '(no title)'}\n\n"
        f"Issue body:\n{issue_body or '(no body)'}\n"
        + selected_context
    )


def generate_changes(
    model: str, repo: str, issue_title: str, issue_body: str
) -> tuple[dict[str, Any], local_llm.Completion]:
    """Run the work request through the cascade: LM Studio, Ollama, OpenRouter.

    The spend gate (#17850) is unchanged but now guards only the last lane:
    `local_llm.cloud_allowed()` is consulted inside `local_llm.call_openrouter`,
    which raises `CloudBlocked` only *after* the free local lanes were tried.
    So REVVEL_LLM_ALLOW_CLOUD being unset means "use the laptop", not "fail".
    """
    # WR_MODEL names a *cloud* model ("anthropic/claude-opus-4.7"), so it must
    # reach the paid lane and nothing else. Passing it to complete(model=...)
    # would forward it to LM Studio, which does not have a model by that name,
    # 404 the request, and drop the cascade straight through to the lane we were
    # trying to avoid — a local-first router that always pays. Each local lane
    # picks its own model (LMSTUDIO_MODEL / OLLAMA_MODEL, else whatever is
    # loaded); OPENROUTER_MODEL is where the paid lane reads its pin, so the
    # pin is applied there and the cascade is called without a model.
    if model and not env("OPENROUTER_MODEL"):
        os.environ["OPENROUTER_MODEL"] = model

    completion = local_llm.complete(build_prompt(repo, issue_title, issue_body))
    parsed = extract_json_payload(completion.text)
    if not isinstance(parsed, dict):
        raise ValueError(f"{completion.lane} response JSON must be an object.")
    return parsed, completion


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-path", required=True)
    args = parser.parse_args()

    github_token = env("GITHUB_TOKEN")
    repo = env("GITHUB_REPOSITORY")
    issue_number = env("ISSUE_NUMBER")
    issue_title = env("ISSUE_TITLE")
    issue_body = env("ISSUE_BODY")
    model = env("WR_MODEL", "anthropic/claude-opus-4.7")

    try:
        # Deliberately no OPENROUTER_API_KEY precondition: the local lanes are
        # keyless, and demanding a paid credential up front is exactly what made
        # Layer 0 unreachable from here. local_llm raises on the paid lane if the
        # key is missing, by which point the free lanes have already been tried.
        if not repo or not issue_number:
            raise RuntimeError("GITHUB_REPOSITORY and ISSUE_NUMBER are required.")

        result, completion = generate_changes(model, repo, issue_title, issue_body)
        files = result.get("files")
        if not isinstance(files, list):
            raise ValueError(f"{completion.lane} payload must include `files` as an array.")

        commit_message = result.get("commit_message")
        if not isinstance(commit_message, str) or not commit_message.strip():
            commit_message = "feat: apply OpenRouter coding changes"

        repo_root = Path.cwd()
        files_written = write_files(files, repo_root)

        # `lane` and `paid` are the record of whether this work request cost
        # money. Without them a free local run and a billed run are
        # indistinguishable after the fact (RVS-VERIFY-001).
        output_payload = {
            "commit_message": commit_message.strip(),
            "files_written": files_written,
            "lane": completion.lane,
            "model": completion.model,
            "paid": not completion.is_local,
        }
        Path(args.output_path).write_text(json.dumps(output_payload), encoding="utf-8")
        print(json.dumps(output_payload))
        return 0
    except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
        message = (
            f"❌ Coder failed for issue #{issue_number}.\n\n"
            f"Error: `{exc}`\n\n"
            "Lanes are tried in order: LM Studio, Ollama, then OpenRouter. "
            "Start LM Studio to run this free on Layer 0 "
            "(see `docs/LOCAL_LLM_SETUP.md`), or set `REVVEL_LLM_ALLOW_CLOUD=1` "
            "and `OPENROUTER_API_KEY` to permit the paid lane."
        )
        comment_issue(repo, issue_number, github_token, message)
        print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
