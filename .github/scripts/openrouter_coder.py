#!/usr/bin/env python3
"""Generate repo file changes from an issue using OpenRouter."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def extract_json_payload(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if not text:
        raise ValueError("OpenRouter returned empty content.")

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
            raise ValueError("OpenRouter response did not include valid JSON.") from None
        return json.loads(candidate[start : end + 1])


# RCE-close per the strict-reviewer audit: the model used to be able to write
# anywhere inside the repo, including the very workflow and gate scripts that
# invoke it. Overwriting `.github/workflows/*.yml` or `.github/scripts/*.py`
# means the next workflow run (which holds `contents: write`) executes
# attacker-controlled YAML. We therefore deny-list infrastructure paths and
# executable file types at write time, in addition to the existing traversal
# and absolute-path checks.
_DENY_PATH_PREFIXES: tuple[str, ...] = (
    ".github/",
    "wr/scripts/",
    "scripts/openrouter-personas",
    "scripts/persona-",
)
_DENY_SUFFIXES: tuple[str, ...] = (".yml", ".yaml", ".sh")


def validate_rel_path(path_value: str) -> Path:
    """Validate a model-supplied relative repo path before writing to it.

    RCE-close per the strict-reviewer audit: rejects traversal, absolute
    paths, AND any write that targets the gate infrastructure
    (`.github/`, `wr/scripts/`, persona scripts) or executable formats
    (`*.yml`, `*.yaml`, `*.sh`, and `*.mjs` under any `scripts/` dir).
    Raises ``PermissionError`` when the deny-list matches so the caller
    can surface a clear, auditable failure to the issue thread.
    """
    normalized_path = path_value.strip()
    if not normalized_path:
        raise ValueError("File path must not be empty.")

    rel_path = Path(normalized_path)
    if rel_path == Path(".") or rel_path.is_absolute() or ".." in rel_path.parts:
        raise ValueError(f"Unsafe file path: {path_value}")

    # Normalize to forward slashes for prefix/suffix matching regardless of OS.
    posix_path = rel_path.as_posix()
    lowered = posix_path.lower()

    for prefix in _DENY_PATH_PREFIXES:
        if posix_path.startswith(prefix):
            raise PermissionError(
                f"Refusing to write {path_value!r}: path is under the "
                f"protected prefix {prefix!r} (RCE-close: model must not "
                "overwrite workflow gates or persona scripts)."
            )

    for suffix in _DENY_SUFFIXES:
        if lowered.endswith(suffix):
            raise PermissionError(
                f"Refusing to write {path_value!r}: file extension "
                f"{suffix!r} is denied (RCE-close: workflows and shell "
                "scripts are not model-writable)."
            )

    # `*.mjs` is only denied when it lives under a `scripts/` directory —
    # those are the ones wired into automation lanes.
    if lowered.endswith(".mjs") and (
        posix_path.startswith("scripts/") or "/scripts/" in posix_path
    ):
        raise PermissionError(
            f"Refusing to write {path_value!r}: `.mjs` files under a "
            "`scripts/` directory are denied (RCE-close: would let the "
            "model replace automation entrypoints)."
        )

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


def call_openrouter(api_key: str, model: str, repo: str, issue_title: str, issue_body: str) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": f"https://github.com/{repo}",
        "X-Title": f"{repo} OpenRouter Coder",
    }
    payload = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": build_system_prompt()},
            {
                "role": "user",
                "content": f"Issue title:\n{issue_title or '(no title)'}\n\nIssue body:\n{issue_body or '(no body)'}",
            },
        ],
    }

    response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=120)
    if response.status_code >= 400:
        raise RuntimeError(f"OpenRouter error HTTP {response.status_code}: {response.text[:400]}")

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = extract_json_payload(content)
    if not isinstance(parsed, dict):
        raise ValueError("OpenRouter response JSON must be an object.")
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-path", required=True)
    args = parser.parse_args()

    api_key = env("OPENROUTER_API_KEY")
    github_token = env("GITHUB_TOKEN")
    repo = env("GITHUB_REPOSITORY")
    issue_number = env("ISSUE_NUMBER")
    issue_title = env("ISSUE_TITLE")
    issue_body = env("ISSUE_BODY")
    model = env("WR_MODEL", "anthropic/claude-opus-4.7")

    try:
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is missing.")
        if not repo or not issue_number:
            raise RuntimeError("GITHUB_REPOSITORY and ISSUE_NUMBER are required.")

        result = call_openrouter(api_key, model, repo, issue_title, issue_body)
        files = result.get("files")
        if not isinstance(files, list):
            raise ValueError("OpenRouter payload must include `files` as an array.")

        commit_message = result.get("commit_message")
        if not isinstance(commit_message, str) or not commit_message.strip():
            commit_message = "feat: apply OpenRouter coding changes"

        repo_root = Path.cwd()
        files_written = write_files(files, repo_root)

        output_payload = {"commit_message": commit_message.strip(), "files_written": files_written}
        Path(args.output_path).write_text(json.dumps(output_payload), encoding="utf-8")
        print(json.dumps(output_payload))
        return 0
    except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
        message = (
            f"❌ OpenRouter coder failed for issue #{issue_number}.\n\n"
            f"Error: `{exc}`\n\n"
            "Please verify `OPENROUTER_API_KEY`, issue content, and model configuration."
        )
        comment_issue(repo, issue_number, github_token, message)
        print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
