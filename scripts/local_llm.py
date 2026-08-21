#!/usr/bin/env python3
"""Layer 0 first: a shared LM Studio -> Ollama -> OpenRouter client.

`wr/agents/HIERARCHY.md` puts local LLMs at Layer 0 with a target share of
60-70% of all work, and says the router should "default to Layer 0." Until now
the only implementation of that cascade lived inside `scripts/wr_rewrite.py`,
reachable from exactly one workflow, so every other caller in the repo went
straight to OpenRouter. This module is that cascade, extracted so anything can
use it.

Two design decisions are load-bearing:

1. **Cloud is opt-in, not fallback.** A cascade that silently ends at a paid API
   is how ~270 scheduled OpenRouter calls/day went unnoticed (#17849). Here the
   cloud lane is refused unless `REVVEL_LLM_ALLOW_CLOUD=1` is set, so the
   failure mode of "LM Studio was asleep" is a loud error, not a bill.

2. **Every result names its lane.** Callers get `Completion.lane`, so "did this
   actually run locally?" is answerable after the fact rather than assumed.

Stdlib only, to match `wr_rewrite.py` and run anywhere Python 3.9+ does.

Environment:
  LMSTUDIO_ENDPOINT          default http://127.0.0.1:1234/v1
  LMSTUDIO_MODEL             default: whatever LM Studio has loaded
  OLLAMA_ENDPOINT            default http://127.0.0.1:11434
  OLLAMA_MODEL               default gemma3
  OPENROUTER_API_KEY         required for the cloud lane
  OPENROUTER_MODEL           default moonshotai/kimi-k2
  REVVEL_LLM_ALLOW_CLOUD     "1" to permit the paid lane. Unset = local only.
  REVVEL_LLM_TIMEOUT         per-request seconds, default 180

CLI:
  python3 scripts/local_llm.py doctor        # what is reachable from here
  python3 scripts/local_llm.py ask "prompt"  # one completion, prints the lane
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

LANE_LMSTUDIO = "lane-0-lmstudio"
LANE_OLLAMA = "lane-0b-ollama"
LANE_OPENROUTER = "lane-1-openrouter"

LOCAL_LANES = (LANE_LMSTUDIO, LANE_OLLAMA)

DEFAULT_LMSTUDIO_ENDPOINT = "http://127.0.0.1:1234/v1"
DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434"
DEFAULT_OLLAMA_MODEL = "gemma3"
DEFAULT_OPENROUTER_MODEL = "moonshotai/kimi-k2"
DEFAULT_TIMEOUT = 180


class LaneUnavailable(RuntimeError):
    """One lane could not serve the request. Try the next one."""


class CloudBlocked(RuntimeError):
    """Local lanes failed and the paid lane is not permitted.

    Raised instead of spending money. Set REVVEL_LLM_ALLOW_CLOUD=1 to allow it.
    """


class AllLanesFailed(RuntimeError):
    """Every permitted lane failed. Carries the per-lane reasons."""


@dataclass
class Completion:
    text: str
    lane: str
    model: str
    tokens: int = 0

    @property
    def is_local(self) -> bool:
        return self.lane in LOCAL_LANES


@dataclass
class LaneStatus:
    lane: str
    endpoint: str
    reachable: bool
    detail: str = ""
    models: list = field(default_factory=list)


def _timeout() -> int:
    raw = os.environ.get("REVVEL_LLM_TIMEOUT", "")
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_TIMEOUT


def cloud_allowed() -> bool:
    """True only on an explicit opt-in. Anything else means local-only."""
    return os.environ.get("REVVEL_LLM_ALLOW_CLOUD", "").strip() == "1"


def _endpoint(var: str, default: str) -> str:
    return (os.environ.get(var) or default).rstrip("/")


LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1", "0.0.0.0")

# One opener with proxies disabled, reused for local lanes.
_DIRECT_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def is_loopback(url: str) -> bool:
    """True when the URL points at this machine.

    Matters because urllib honours http_proxy/https_proxy for *every* request,
    including ones to 127.0.0.1. On a machine behind a corporate proxy or a VPN
    — which a work laptop usually is — that silently routes the LM Studio call
    out to the proxy, which cannot reach it, and Layer 0 looks broken for a
    reason that has nothing to do with LM Studio. Local lanes must go direct.
    """
    host = (urllib.parse.urlsplit(url).hostname or "").lower()
    return host in LOOPBACK_HOSTS


def _open(req, timeout: int, direct: bool):
    opener = _DIRECT_OPENER if direct else urllib.request
    with opener.open(req, timeout=timeout) as resp:  # noqa: S310
        return json.loads(resp.read().decode())


def _post_json(url: str, payload: dict, headers: dict, timeout: int) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json", **headers},
    )
    return _open(req, timeout, is_loopback(url))


def _get_json(url: str, timeout: int) -> dict:
    req = urllib.request.Request(url, method="GET")
    return _open(req, timeout, is_loopback(url))


def _openai_chat(endpoint: str, model: str, prompt: str, headers: dict,
                 timeout: int) -> tuple:
    out = _post_json(
        f"{endpoint}/chat/completions",
        {"model": model, "messages": [{"role": "user", "content": prompt}]},
        headers,
        timeout,
    )
    choices = out.get("choices") or []
    if not choices:
        raise LaneUnavailable(f"no choices in response from {endpoint}")
    text = (choices[0].get("message") or {}).get("content")
    if text is None:
        raise LaneUnavailable(f"no message content in response from {endpoint}")
    tokens = (out.get("usage") or {}).get("total_tokens", 0) or 0
    return text, out.get("model") or model, int(tokens)


def lmstudio_models(timeout: int = 10) -> list:
    """Model ids LM Studio currently has loaded. Empty list if unreachable."""
    endpoint = _endpoint("LMSTUDIO_ENDPOINT", DEFAULT_LMSTUDIO_ENDPOINT)
    try:
        out = _get_json(f"{endpoint}/models", timeout)
    except Exception:  # noqa: BLE001 - probing; unreachable is an answer
        return []
    return [m.get("id") for m in (out.get("data") or []) if m.get("id")]


def call_lmstudio(prompt: str, model: str = "") -> Completion:
    """Layer 0. LM Studio's OpenAI-compatible server on the local machine."""
    endpoint = _endpoint("LMSTUDIO_ENDPOINT", DEFAULT_LMSTUDIO_ENDPOINT)
    if not endpoint:
        raise LaneUnavailable("LMSTUDIO_ENDPOINT is empty")
    model = model or os.environ.get("LMSTUDIO_MODEL", "")
    if not model:
        loaded = lmstudio_models()
        if not loaded:
            raise LaneUnavailable(
                f"no model loaded and {endpoint}/models did not answer — "
                "is LM Studio running with its server started?")
        model = loaded[0]
    try:
        text, resolved, tokens = _openai_chat(
            endpoint, model, prompt, {}, _timeout())
    except urllib.error.URLError as exc:
        raise LaneUnavailable(f"{endpoint} unreachable: {exc.reason}") from exc
    except Exception as exc:  # noqa: BLE001
        raise LaneUnavailable(f"{endpoint} failed: {exc}") from exc
    return Completion(text, LANE_LMSTUDIO, resolved, tokens)


def call_ollama(prompt: str, model: str = "") -> Completion:
    """Layer 0b. Ollama on the local machine."""
    endpoint = _endpoint("OLLAMA_ENDPOINT", DEFAULT_OLLAMA_ENDPOINT)
    if not endpoint:
        raise LaneUnavailable("OLLAMA_ENDPOINT is empty")
    model = model or os.environ.get("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    try:
        out = _post_json(
            f"{endpoint}/api/generate",
            {"model": model, "prompt": prompt, "stream": False},
            {},
            _timeout(),
        )
    except urllib.error.URLError as exc:
        raise LaneUnavailable(f"{endpoint} unreachable: {exc.reason}") from exc
    except Exception as exc:  # noqa: BLE001
        raise LaneUnavailable(f"{endpoint} failed: {exc}") from exc
    text = out.get("response")
    if not text:
        raise LaneUnavailable(f"{endpoint} returned an empty response")
    return Completion(text, LANE_OLLAMA, model, 0)


def call_openrouter(prompt: str, model: str = "") -> Completion:
    """Layer 1. Costs money. Refused unless REVVEL_LLM_ALLOW_CLOUD=1."""
    if not cloud_allowed():
        raise CloudBlocked(
            "the OpenRouter lane costs money and REVVEL_LLM_ALLOW_CLOUD is not "
            "set to 1 — refusing to spend. Start LM Studio, or set "
            "REVVEL_LLM_ALLOW_CLOUD=1 to permit the paid lane.")
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        raise LaneUnavailable("OPENROUTER_API_KEY is unset")
    model = model or os.environ.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)
    try:
        text, resolved, tokens = _openai_chat(
            "https://openrouter.ai/api/v1", model, prompt,
            {"Authorization": f"Bearer {key}"}, _timeout())
    except Exception as exc:  # noqa: BLE001
        raise LaneUnavailable(f"openrouter failed: {exc}") from exc
    return Completion(text, LANE_OPENROUTER, resolved, tokens)


def complete(prompt: str, *, model: str = "", allow_cloud: bool = None) -> Completion:
    """Run the prompt through the cascade, Layer 0 first.

    `allow_cloud=None` defers to REVVEL_LLM_ALLOW_CLOUD. Passing False forbids
    the paid lane regardless of environment; passing True permits it only if the
    environment also allows it — a caller can narrow the gate, never widen it.
    """
    reasons = []
    for fn in (call_lmstudio, call_ollama):
        try:
            return fn(prompt, model if fn is call_lmstudio else "")
        except LaneUnavailable as exc:
            reasons.append(str(exc))

    if allow_cloud is False:
        raise AllLanesFailed(
            "local lanes failed and the caller forbade the cloud lane:\n  - "
            + "\n  - ".join(reasons))
    try:
        return call_openrouter(prompt)
    except CloudBlocked as exc:
        raise CloudBlocked(
            f"{exc}\n\nLocal lanes were tried first and failed:\n  - "
            + "\n  - ".join(reasons)) from exc
    except LaneUnavailable as exc:
        reasons.append(str(exc))
        raise AllLanesFailed(
            "every permitted lane failed:\n  - " + "\n  - ".join(reasons)) from exc


def probe() -> list:
    """Check each lane without spending anything. Used by `doctor`."""
    out = []

    lm_endpoint = _endpoint("LMSTUDIO_ENDPOINT", DEFAULT_LMSTUDIO_ENDPOINT)
    models = lmstudio_models()
    out.append(LaneStatus(
        LANE_LMSTUDIO, lm_endpoint, bool(models),
        f"{len(models)} model(s) loaded" if models
        else "no answer — LM Studio not running, or its server is not started",
        models))

    ol_endpoint = _endpoint("OLLAMA_ENDPOINT", DEFAULT_OLLAMA_ENDPOINT)
    try:
        tags = _get_json(f"{ol_endpoint}/api/tags", 10)
        names = [m.get("name") for m in (tags.get("models") or []) if m.get("name")]
        out.append(LaneStatus(LANE_OLLAMA, ol_endpoint, True,
                              f"{len(names)} model(s) available", names))
    except Exception:  # noqa: BLE001 - unreachable is the answer
        out.append(LaneStatus(LANE_OLLAMA, ol_endpoint, False,
                              "no answer — Ollama not running (optional)"))

    if not cloud_allowed():
        detail = "blocked — REVVEL_LLM_ALLOW_CLOUD is not 1 (this is the default)"
    elif not os.environ.get("OPENROUTER_API_KEY"):
        detail = "permitted but OPENROUTER_API_KEY is unset"
    else:
        detail = "PERMITTED — this lane costs money"
    out.append(LaneStatus(LANE_OPENROUTER, "https://openrouter.ai/api/v1",
                          cloud_allowed(), detail))
    return out


def _cmd_doctor(_args) -> int:
    statuses = probe()
    print("Layer 0 first — lane status\n")
    for st in statuses:
        mark = "OK  " if st.reachable else "DOWN"
        if st.lane == LANE_OPENROUTER:
            mark = "OPEN" if st.reachable else "SHUT"
        print(f"[{mark}] {st.lane}")
        print(f"       endpoint: {st.endpoint}")
        print(f"       {st.detail}")
        for name in st.models[:5]:
            print(f"         - {name}")
        print()

    local_up = [s for s in statuses if s.lane in LOCAL_LANES and s.reachable]
    if local_up:
        print(f"Ready: work will run on {local_up[0].lane} at no cost.")
        return 0
    if cloud_allowed():
        print("No local lane is up. The paid OpenRouter lane WILL be used.")
        return 1
    print("No local lane is up, and the paid lane is blocked, so nothing will run.")
    print("Start LM Studio and click 'Start Server' on its Developer tab.")
    print("See docs/LOCAL_LLM_SETUP.md for the Windows steps.")
    return 1


def _cmd_ask(args) -> int:
    prompt = args.prompt
    if prompt == "-":
        prompt = sys.stdin.read()
    try:
        result = complete(prompt, model=args.model)
    except CloudBlocked as exc:
        print(f"refused: {exc}", file=sys.stderr)
        return 2
    except AllLanesFailed as exc:
        print(f"failed: {exc}", file=sys.stderr)
        return 1
    cost = "free (local)" if result.is_local else "BILLED (cloud)"
    print(f"[{result.lane} · {result.model} · {cost}]", file=sys.stderr)
    print(result.text)
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    doctor = sub.add_parser("doctor", help="report which lanes are reachable")
    doctor.set_defaults(func=_cmd_doctor)

    ask = sub.add_parser("ask", help="run one prompt through the cascade")
    ask.add_argument("prompt", help="the prompt, or - to read stdin")
    ask.add_argument("--model", default="", help="override the local model id")
    ask.set_defaults(func=_cmd_ask)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
