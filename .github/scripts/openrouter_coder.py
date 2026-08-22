#!/usr/bin/env python3
"""Generate repo file changes from an issue (OpenRouter first, LM Studio fallback).

Lane order for THIS script only — not the fleet cascade in scripts/local_llm.py:

  1. OpenRouter (paid; still spend-gated)
  2. LM Studio at LMSTUDIO_ENDPOINT (default http://127.0.0.1:1234/v1)

The LM Studio step is refused on a GitHub-hosted runner. ubuntu-latest is an
Azure VM; 127.0.0.1 there is the runner, not Audrey's laptop. Wiring a
localhost fallback into openrouter-coder.yml would always fail and look like
a working fallback. Local CLI and a future self-hosted runner on the laptop
can actually reach LM Studio.

Default model is moonshotai/kimi-k2 (same cheap coding default as
scripts/local_llm.py). Do not set WR_MODEL=anthropic/claude-opus-4.7 — that
burns the $16 credit. If a secret/var still supplies opus, that still burns.

Local (LM Studio reachable):

  ISSUE_NUMBER=123 ISSUE_TITLE="..." ISSUE_BODY="..." \\
  GITHUB_REPOSITORY=midnghtsapphire/revvel-standards \\
  python .github/scripts/openrouter_coder.py --output-path /tmp/coder.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Callable

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Cheap in-repo coding default. The previous default (anthropic/claude-opus-4.7)
# would burn the $16 OpenRouter credit on every Coder turn.
DEFAULT_OPENROUTER_MODEL = "moonshotai/kimi-k2"
LANE_OPENROUTER = "lane-1-openrouter"
LANE_LMSTUDIO = "lane-0-lmstudio"


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def resolve_model() -> str:
    """WR_MODEL if set, else the cheap in-repo default. Never invent opus."""
    return env("WR_MODEL") or DEFAULT_OPENROUTER_MODEL


def is_github_hosted_runner() -> bool:
    """True when this process cannot see a laptop LM Studio.

    GitHub sets RUNNER_ENVIRONMENT to github-hosted or self-hosted. A local
    CLI has neither that nor GITHUB_ACTIONS. Fail closed on Actions when the
    runner env is missing — do not probe localhost from a hosted VM.
    """
    runner = env("RUNNER_ENVIRONMENT").lower()
    if runner == "github-hosted":
        return True
    if runner == "self-hosted":
        return False
    return env("GITHUB_ACTIONS").lower() == "true"


def lmstudio_fallback_allowed() -> bool:
    """LM Studio fallback only when this machine can actually reach it."""
    return not is_github_hosted_runner()


def _load_local_llm():
    """Import scripts/local_llm.py without touching its Layer-0-first complete()."""
    scripts_dir = Path(__file__).resolve().parents[2] / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    import local_llm  # noqa: WPS433 - repo-local module, not a third-party dep

    return local_llm


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


def _assert_cloud_allowed(call_site: str) -> None:
    """Spend gate (#17850). Refuse a paid call unless someone deliberately said yes.

    Mirrors `cloud_allowed()` in scripts/local_llm.py and the JS gate in
    scripts/llm-spend-gate.js — one variable name, one decision, every language.
    Must be exactly "1": `true` / `yes` fail closed rather than open.
    """
    if os.environ.get("REVVEL_LLM_ALLOW_CLOUD", "").strip() != "1":
        raise RuntimeError(
            f'Refusing to call a paid LLM API from "{call_site}": '
            "REVVEL_LLM_ALLOW_CLOUD is not set to \"1\". This is a spend gate, "
            "not a bug. Set it in the calling workflow's env, with a comment "
            "saying why the work cannot run on Layer 0 "
            "(see docs/LOCAL_LLM_SETUP.md)."
        )


def call_openrouter(api_key: str, model: str, repo: str, issue_title: str, issue_body: str) -> dict[str, Any]:
    _assert_cloud_allowed("openrouter_coder")
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


def call_lmstudio_for_coder(repo: str, issue_title: str, issue_body: str) -> dict[str, Any]:
    """Free local lane. Reuses scripts/local_llm.call_lmstudio; does not invert complete()."""
    local_llm = _load_local_llm()
    user_content = (
        f"Issue title:\n{issue_title or '(no title)'}\n\n"
        f"Issue body:\n{issue_body or '(no body)'}"
    )
    prompt = f"{build_system_prompt()}\n\n{user_content}"
    completion = local_llm.call_lmstudio(prompt)
    parsed = extract_json_payload(completion.text)
    if not isinstance(parsed, dict):
        raise ValueError("LM Studio response JSON must be an object.")
    return parsed


def complete_with_fallback(
    api_key: str,
    model: str,
    repo: str,
    issue_title: str,
    issue_body: str,
    *,
    openrouter_fn: Callable[..., dict[str, Any]] | None = None,
    lmstudio_fn: Callable[..., dict[str, Any]] | None = None,
) -> tuple[dict[str, Any], str, str]:
    """OpenRouter first; LM Studio only when this machine can reach it.

    Returns (payload, lane, model_used). Names the lane so logs cannot lie
    about which provider actually ran.
    """
    openrouter_fn = openrouter_fn or call_openrouter
    lmstudio_fn = lmstudio_fn or call_lmstudio_for_coder
    openrouter_error: Exception | None = None

    if not api_key:
        openrouter_error = RuntimeError("OPENROUTER_API_KEY is missing.")
    else:
        try:
            parsed = openrouter_fn(api_key, model, repo, issue_title, issue_body)
            print(f"coder lane={LANE_OPENROUTER} model={model}", file=sys.stderr)
            return parsed, LANE_OPENROUTER, model
        except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
            openrouter_error = exc

    if lmstudio_fallback_allowed():
        print(
            f"OpenRouter failed ({openrouter_error}); falling back to LM Studio "
            f"at LMSTUDIO_ENDPOINT (default http://127.0.0.1:1234/v1)",
            file=sys.stderr,
        )
        parsed = lmstudio_fn(repo, issue_title, issue_body)
        print(f"coder lane={LANE_LMSTUDIO}", file=sys.stderr)
        return parsed, LANE_LMSTUDIO, env("LMSTUDIO_MODEL") or "lmstudio-loaded"

    raise RuntimeError(
        f"OpenRouter failed and LM Studio fallback is not available here. "
        f"This job is on a GitHub-hosted runner (ubuntu-latest): it CANNOT "
        f"reach http://127.0.0.1:1234 on the laptop. Spend gate stays required "
        f"until a self-hosted runner that can see LM Studio exists. "
        f"OpenRouter error: {openrouter_error}"
    )


def _self_test() -> int:
    """Offline checks for the hosted-runner guard and the cheap default."""
    saved = dict(os.environ)
    try:
        os.environ.pop("WR_MODEL", None)
        assert resolve_model() == DEFAULT_OPENROUTER_MODEL
        assert DEFAULT_OPENROUTER_MODEL == "moonshotai/kimi-k2"
        assert "opus" not in DEFAULT_OPENROUTER_MODEL.lower()

        os.environ["WR_MODEL"] = "anthropic/claude-opus-4.7"
        assert resolve_model() == "anthropic/claude-opus-4.7", (
            "an explicit WR_MODEL must still win — document the burn risk, "
            "do not silently ignore it"
        )
        os.environ.pop("WR_MODEL", None)

        os.environ["RUNNER_ENVIRONMENT"] = "github-hosted"
        os.environ.pop("GITHUB_ACTIONS", None)
        assert is_github_hosted_runner() is True
        assert lmstudio_fallback_allowed() is False

        os.environ["RUNNER_ENVIRONMENT"] = "self-hosted"
        os.environ["GITHUB_ACTIONS"] = "true"
        assert is_github_hosted_runner() is False
        assert lmstudio_fallback_allowed() is True

        os.environ.pop("RUNNER_ENVIRONMENT", None)
        os.environ.pop("GITHUB_ACTIONS", None)
        assert is_github_hosted_runner() is False
        assert lmstudio_fallback_allowed() is True

        os.environ["GITHUB_ACTIONS"] = "true"
        os.environ.pop("RUNNER_ENVIRONMENT", None)
        assert is_github_hosted_runner() is True
        assert lmstudio_fallback_allowed() is False

        os.environ["RUNNER_ENVIRONMENT"] = "github-hosted"
        lm_calls: list[int] = []

        def boom_lmstudio(*_a: object, **_k: object) -> dict[str, Any]:
            lm_calls.append(1)
            raise AssertionError("LM Studio must not be called on github-hosted")

        try:
            complete_with_fallback(
                "",
                resolve_model(),
                "midnghtsapphire/revvel-standards",
                "t",
                "b",
                lmstudio_fn=boom_lmstudio,
            )
            raise AssertionError("github-hosted missing key must fail, not succeed")
        except RuntimeError as exc:
            text = str(exc).lower()
            assert "cannot" in text and "127.0.0.1:1234" in text
            assert lm_calls == []

        os.environ.pop("RUNNER_ENVIRONMENT", None)
        os.environ.pop("GITHUB_ACTIONS", None)

        def fail_openrouter(*_a: object, **_k: object) -> dict[str, Any]:
            raise RuntimeError("OpenRouter error HTTP 402: insufficient credits")

        def ok_lmstudio(*_a: object, **_k: object) -> dict[str, Any]:
            return {"files": [], "commit_message": "chore: no changes"}

        parsed, lane, _model = complete_with_fallback(
            "sk-or-test",
            resolve_model(),
            "midnghtsapphire/revvel-standards",
            "t",
            "b",
            openrouter_fn=fail_openrouter,
            lmstudio_fn=ok_lmstudio,
        )
        assert lane == LANE_LMSTUDIO
        assert parsed["files"] == []

        def ok_openrouter(*_a: object, **_k: object) -> dict[str, Any]:
            return {"files": [], "commit_message": "feat: from openrouter"}

        parsed, lane, _model = complete_with_fallback(
            "sk-or-test",
            resolve_model(),
            "midnghtsapphire/revvel-standards",
            "t",
            "b",
            openrouter_fn=ok_openrouter,
            lmstudio_fn=boom_lmstudio,
        )
        assert lane == LANE_OPENROUTER
        assert parsed["commit_message"] == "feat: from openrouter"
        assert lm_calls == []
    finally:
        os.environ.clear()
        os.environ.update(saved)
    print("self-test ok")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-path", required=False, default="")
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run offline guard/default checks and exit.",
    )
    args = parser.parse_args()
    if args.self_test:
        return _self_test()
    if not args.output_path:
        parser.error("--output-path is required unless --self-test is set")

    api_key = env("OPENROUTER_API_KEY")
    github_token = env("GITHUB_TOKEN")
    repo = env("GITHUB_REPOSITORY")
    issue_number = env("ISSUE_NUMBER")
    issue_title = env("ISSUE_TITLE")
    issue_body = env("ISSUE_BODY")
    model = resolve_model()

    try:
        if not repo or not issue_number:
            raise RuntimeError("GITHUB_REPOSITORY and ISSUE_NUMBER are required.")

        result, lane, model_used = complete_with_fallback(
            api_key, model, repo, issue_title, issue_body
        )
        files = result.get("files")
        if not isinstance(files, list):
            raise ValueError("Model payload must include `files` as an array.")

        commit_message = result.get("commit_message")
        if not isinstance(commit_message, str) or not commit_message.strip():
            commit_message = "feat: apply OpenRouter coding changes"

        repo_root = Path.cwd()
        files_written = write_files(files, repo_root)

        output_payload = {
            "commit_message": commit_message.strip(),
            "files_written": files_written,
            "lane": lane,
            "model": model_used,
        }
        Path(args.output_path).write_text(json.dumps(output_payload), encoding="utf-8")
        print(json.dumps(output_payload))
        return 0
    except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
        message = (
            f"❌ OpenRouter coder failed for issue #{issue_number}.\n\n"
            f"Error: `{exc}`\n\n"
            "GitHub-hosted ubuntu-latest CANNOT reach LM Studio on the laptop. "
            "Verify `OPENROUTER_API_KEY` and the spend gate, or run this script "
            "locally next to a loaded LM Studio."
        )
        comment_issue(repo, issue_number, github_token, message)
        print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
