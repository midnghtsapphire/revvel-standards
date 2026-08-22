#!/usr/bin/env python3
"""OpenRouter Agent: OpenRouter first, LM Studio fallback when reachable.

This is the script behind `.github/workflows/openrouter-agent.yml`. That
workflow stays on ubuntu-latest. GitHub-hosted ubuntu CANNOT reach
http://127.0.0.1:1234 on Audrey's laptop — do not treat a localhost probe
from that job as a fallback.

Fallback is real only when this process is a local CLI or a self-hosted
runner on the machine that is actually running LM Studio.

Default model is moonshotai/kimi-k2. Setting WR_MODEL (or AGENT_MODEL) to
anthropic/claude-opus-4.7 still burns the $16 credit.

Local:

  EVENT_NAME=issue_comment COMMENT_BODY="@openrouter-agent what is Layer 0?" \\
  ISSUE_TITLE="…" SENDER=midnghtsapphire \\
  python .github/scripts/openrouter_agent.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Callable

import requests

# Same directory as openrouter_coder.py — reuse its hosted-runner guard and
# OpenRouter call helpers so the two lanes cannot drift apart.
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from openrouter_coder import (  # noqa: E402
    DEFAULT_OPENROUTER_MODEL,
    LANE_LMSTUDIO,
    LANE_OPENROUTER,
    OPENROUTER_URL,
    _assert_cloud_allowed,
    _load_local_llm,
    env,
    is_github_hosted_runner,
    lmstudio_fallback_allowed,
    resolve_model,
)


def build_agent_messages() -> tuple[str, str]:
    event_name = env("EVENT_NAME")
    issue_title = env("ISSUE_TITLE")
    issue_body = env("ISSUE_BODY")
    comment_body = env("COMMENT_BODY").replace("@openrouter-agent", "").strip()
    sender = env("SENDER") or "user"

    if event_name == "issues":
        system = (
            "You are a helpful GitHub assistant for the revvel-standards "
            "repository. A new issue was just opened. Provide a concise "
            "summary and suggest next steps or relevant standards."
        )
        prompt = f"Issue title: {issue_title}\n\nIssue body:\n{issue_body}"
    else:
        system = (
            "You are a helpful GitHub assistant for the revvel-standards "
            "repository. Answer the user's question clearly and concisely. "
            "Reference relevant standards or patterns when applicable."
        )
        prompt = (
            f"Context - Issue/PR: {issue_title}\n\n"
            f"User ({sender}) asked: {comment_body}"
        )
    return system, prompt


def call_openrouter_agent(api_key: str, model: str, system: str, prompt: str) -> str:
    _assert_cloud_allowed("openrouter_agent")
    repo = env("GITHUB_REPOSITORY") or "midnghtsapphire/revvel-standards"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": f"https://github.com/{repo}",
        "X-Title": f"{repo} OpenRouter Agent",
    }
    payload = {
        "model": model,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=120)
    if response.status_code >= 400:
        raise RuntimeError(f"OpenRouter error HTTP {response.status_code}: {response.text[:400]}")
    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError("OpenRouter returned empty content.")
    return content


def call_lmstudio_agent(system: str, prompt: str) -> str:
    local_llm = _load_local_llm()
    completion = local_llm.call_lmstudio(f"{system}\n\n{prompt}")
    if not completion.text:
        raise ValueError("LM Studio returned empty content.")
    return completion.text


def complete_agent_with_fallback(
    api_key: str,
    model: str,
    system: str,
    prompt: str,
    *,
    openrouter_fn: Callable[..., str] | None = None,
    lmstudio_fn: Callable[..., str] | None = None,
) -> tuple[str, str, str]:
    """OpenRouter first; LM Studio only when this machine can reach it."""
    openrouter_fn = openrouter_fn or call_openrouter_agent
    lmstudio_fn = lmstudio_fn or call_lmstudio_agent
    openrouter_error: Exception | None = None

    if not api_key:
        openrouter_error = RuntimeError("OPENROUTER_API_KEY is missing.")
    else:
        try:
            text = openrouter_fn(api_key, model, system, prompt)
            print(f"agent lane={LANE_OPENROUTER} model={model}", file=sys.stderr)
            return text, LANE_OPENROUTER, model
        except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
            openrouter_error = exc

    if lmstudio_fallback_allowed():
        print(
            f"OpenRouter failed ({openrouter_error}); falling back to LM Studio "
            f"at LMSTUDIO_ENDPOINT (default http://127.0.0.1:1234/v1)",
            file=sys.stderr,
        )
        text = lmstudio_fn(system, prompt)
        print(f"agent lane={LANE_LMSTUDIO}", file=sys.stderr)
        return text, LANE_LMSTUDIO, env("LMSTUDIO_MODEL") or "lmstudio-loaded"

    raise RuntimeError(
        f"OpenRouter failed and LM Studio fallback is not available here. "
        f"This job is on a GitHub-hosted runner (ubuntu-latest): it CANNOT "
        f"reach http://127.0.0.1:1234 on the laptop. Spend gate stays required "
        f"until a self-hosted runner that can see LM Studio exists. "
        f"OpenRouter error: {openrouter_error}"
    )


def write_github_output(reply: str, lane: str, model: str) -> None:
    path = env("GITHUB_OUTPUT")
    payload = {"reply": reply, "lane": lane, "model": model}
    print(json.dumps(payload))
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(f"lane={lane}\n")
        handle.write(f"model={model}\n")
        handle.write("reply<<EOF\n")
        handle.write(reply)
        if not reply.endswith("\n"):
            handle.write("\n")
        handle.write("EOF\n")


def _self_test() -> int:
    saved = dict(os.environ)
    try:
        os.environ.pop("WR_MODEL", None)
        os.environ.pop("AGENT_MODEL", None)
        assert resolve_model() == DEFAULT_OPENROUTER_MODEL
        assert "opus" not in DEFAULT_OPENROUTER_MODEL.lower()

        os.environ["RUNNER_ENVIRONMENT"] = "github-hosted"
        lm_calls: list[int] = []

        def boom_lm(*_a: object, **_k: object) -> str:
            lm_calls.append(1)
            raise AssertionError("LM Studio must not be called on github-hosted")

        try:
            complete_agent_with_fallback(
                "",
                resolve_model(),
                "sys",
                "prompt",
                lmstudio_fn=boom_lm,
            )
            raise AssertionError("github-hosted missing key must fail")
        except RuntimeError as exc:
            text = str(exc).lower()
            assert "cannot" in text and "127.0.0.1:1234" in text
            assert lm_calls == []

        os.environ.pop("RUNNER_ENVIRONMENT", None)
        os.environ.pop("GITHUB_ACTIONS", None)

        def fail_or(*_a: object, **_k: object) -> str:
            raise RuntimeError("OpenRouter error HTTP 401: unauthorized")

        def ok_lm(*_a: object, **_k: object) -> str:
            return "local reply"

        text, lane, _model = complete_agent_with_fallback(
            "sk-or-test",
            resolve_model(),
            "sys",
            "prompt",
            openrouter_fn=fail_or,
            lmstudio_fn=ok_lm,
        )
        assert lane == LANE_LMSTUDIO
        assert text == "local reply"

        def ok_or(*_a: object, **_k: object) -> str:
            return "cloud reply"

        text, lane, _model = complete_agent_with_fallback(
            "sk-or-test",
            resolve_model(),
            "sys",
            "prompt",
            openrouter_fn=ok_or,
            lmstudio_fn=boom_lm,
        )
        assert lane == LANE_OPENROUTER
        assert text == "cloud reply"
        assert lm_calls == []
        assert is_github_hosted_runner() is False
        assert lmstudio_fallback_allowed() is True
    finally:
        os.environ.clear()
        os.environ.update(saved)
    print("self-test ok")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return _self_test()

    api_key = env("OPENROUTER_API_KEY")
    model = env("AGENT_MODEL") or resolve_model()
    system, prompt = build_agent_messages()
    try:
        reply, lane, model_used = complete_agent_with_fallback(
            api_key, model, system, prompt
        )
        write_github_output(reply, lane, model_used)
        return 0
    except (RuntimeError, ValueError, requests.RequestException, json.JSONDecodeError, OSError) as exc:
        print(f"OpenRouter agent failed: {exc}", file=sys.stderr)
        if is_github_hosted_runner():
            write_github_output(
                "CANNOT reach LM Studio from this GitHub-hosted ubuntu-latest "
                f"job. {exc}",
                "none",
                "none",
            )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
