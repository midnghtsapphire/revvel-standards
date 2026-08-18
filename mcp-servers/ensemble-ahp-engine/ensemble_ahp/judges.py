"""Heterogeneous judge client: OpenRouter primary + WR-4481 failover.

Triggers (WR-4481):
  - HTTP 402 → immediate failover to keyless/tier-2 (no retry on primary)
  - HTTP 429 → one backoff (≤30s), then failover
  - 5xx ×2 consecutive → failover

Every call is ledgered (success and failure). Diversity unit is model FAMILY.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Sequence

from .ahp_math import Matrix, clamp_saaty, reciprocal_close
from .config import (
    BACKOFF_429_SECONDS,
    DEFAULT_JUDGES,
    OPENROUTER_URL,
    PERPLEXITY_KEYLESS_HINT,
    JudgeLane,
)
from .ledger import FailureLedger


@dataclass
class JudgeResponse:
    text: str
    model: str
    family: str
    judge_id: str
    lane: str
    service: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float | None = None
    mock: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class JudgeCallResult:
    ok: bool
    response: JudgeResponse | None
    error: str | None = None


def _env_truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def force_mock() -> bool:
    if _env_truthy("AHP_FORCE_MOCK"):
        return True
    if _env_truthy("AHP_MOCK_JUDGES"):
        return True
    # Offline-safe default: no key → mock so steps 1-7 still complete locally.
    if not os.environ.get("OPENROUTER_API_KEY", "").strip():
        return True
    return False


def _sleep(seconds: float, sleeper: Callable[[float], None] | None = None) -> None:
    (sleeper or time.sleep)(seconds)


def _http_post_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    timeout: float = 60.0,
) -> tuple[int, dict[str, Any] | str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            try:
                return int(resp.status), json.loads(body)
            except json.JSONDecodeError:
                return int(resp.status), body
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed: dict[str, Any] | str = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return int(exc.code), parsed
    except urllib.error.URLError as exc:
        return 0, {"error": str(exc.reason if hasattr(exc, "reason") else exc)}


def _estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float | None:
    """Best-effort cost line from published OpenRouter list prices.

    Returns None when the model price is unknown rather than inventing a number
    (WR-4482: no fabricated precision). Live OpenRouter `usage.total_cost` is
    preferred when present.
    """
    # USD per 1M tokens (prompt, completion). Sparse table — unknown → None.
    # Confidence: MEDIUM — list prices move; prefer provider-reported total_cost.
    PRICE_PER_MTOK: dict[str, tuple[float, float]] = {
        "anthropic/claude-opus-4.7": (5.0, 25.0),
        "anthropic/claude-haiku-4.5": (1.0, 5.0),
        "openai/gpt-4o-mini": (0.15, 0.60),
        "google/gemini-2.5-flash": (0.30, 2.50),
        "openrouter/free": (0.0, 0.0),
        "openrouter/auto": (0.0, 0.0),
    }
    prices = PRICE_PER_MTOK.get(model)
    if prices is None:
        return None
    pin, pout = prices
    return (prompt_tokens / 1_000_000.0) * pin + (completion_tokens / 1_000_000.0) * pout


class JudgeClient:
    """Calls one judge lane with WR-4481 failover and ledger side-effects."""

    def __init__(
        self,
        ledger: FailureLedger,
        *,
        api_key: str | None = None,
        mock: bool | None = None,
        backoff_seconds: float = BACKOFF_429_SECONDS,
        sleeper: Callable[[float], None] | None = None,
        http_post: Callable[..., tuple[int, dict[str, Any] | str]] | None = None,
        task_ref: str | None = None,
    ):
        self.ledger = ledger
        self.api_key = (api_key if api_key is not None else os.environ.get("OPENROUTER_API_KEY", "")).strip()
        self.mock = force_mock() if mock is None else mock
        self.backoff_seconds = backoff_seconds
        self.sleeper = sleeper
        self.http_post = http_post or _http_post_json
        self.task_ref = task_ref
        self.total_cost_usd = 0.0
        self.cost_known = True  # flips False if any call cannot price
        self.families_used: list[str] = []
        self.models_used: list[str] = []

    def _record_family(self, family: str, model: str) -> None:
        if family and family not in self.families_used:
            self.families_used.append(family)
        if model and model not in self.models_used:
            self.models_used.append(model)

    def _mock_completion(self, lane: JudgeLane, step: str, prompt: str) -> JudgeResponse:
        """Deterministic offline judge — labelled mock, not live inference."""
        seed = int(hashlib.sha256(f"{lane.family}:{step}:{prompt[:200]}".encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        text = self._mock_payload_for_step(lane, step, prompt, rng)
        self._record_family(lane.family, f"mock:{lane.family}")
        return JudgeResponse(
            text=text,
            model=f"mock:{lane.family}",
            family=lane.family,
            judge_id=lane.id,
            lane="text/mock",
            service="mock",
            prompt_tokens=0,
            completion_tokens=0,
            cost_usd=0.0,
            mock=True,
        )

    def _mock_payload_for_step(
        self, lane: JudgeLane, step: str, prompt: str, rng: random.Random
    ) -> str:
        # STRUCTURE / GENERATE / VOTE / COMPARE produce JSON the pipeline parses.
        if step == "STRUCTURE":
            return json.dumps(
                {
                    "depth": 2,
                    "k_judges": 3,
                    "n_criteria": 5,
                    "n_alternatives": 4,
                    "notes": f"mock structure from family={lane.family}",
                }
            )
        if step == "GENERATE":
            # Slight family-skewed naming so vote aggregation is non-trivial.
            suffix = lane.family[:3]
            return json.dumps(
                {
                    "criteria": [
                        f"Cost-{suffix}",
                        f"Quality-{suffix}",
                        f"Risk-{suffix}",
                        f"Speed-{suffix}",
                        f"Support-{suffix}",
                        f"Compliance-{suffix}",
                    ],
                    "alternatives": [
                        f"Option-A-{suffix}",
                        f"Option-B-{suffix}",
                        f"Option-C-{suffix}",
                        f"Option-D-{suffix}",
                        f"Option-E-{suffix}",
                    ],
                }
            )
        if step == "VOTE":
            # Scores 1-9 for each name listed after "ITEMS:" in the prompt.
            items = _extract_items(prompt)
            scores = {item: rng.randint(4, 9) for item in items}
            return json.dumps({"scores": scores})
        if step == "COMPARE":
            labels = _extract_items(prompt)
            n = max(len(labels), 1)
            matrix = _random_consistent_matrix(n, rng)
            return json.dumps({"labels": labels, "matrix": matrix})
        return json.dumps({"ok": True, "family": lane.family, "step": step})

    def complete(
        self,
        lane: JudgeLane,
        *,
        step: str,
        system: str,
        user: str,
    ) -> JudgeCallResult:
        if self.mock or not self.api_key:
            resp = self._mock_completion(lane, step, user)
            self.ledger.log_judge_call(
                judge_id=lane.id,
                family=lane.family,
                model=resp.model,
                step=step,
                ok=True,
                lane=resp.lane,
                service=resp.service,
                cost_usd=0.0,
                prompt_tokens=0,
                completion_tokens=0,
                trigger="judge-call-mock",
                detail="offline mock judge (no live model invocation)",
                task_ref=self.task_ref,
            )
            self.total_cost_usd += 0.0
            return JudgeCallResult(ok=True, response=resp)

        # Primary OpenRouter attempt
        primary = self._openrouter_once(
            lane,
            model=lane.primary_model,
            step=step,
            system=system,
            user=user,
            lane_name="text/primary",
        )
        if primary.ok:
            return primary

        err_code = _extract_http_code(primary.error or "")
        # 402 → immediate keyless failover (no retry)
        if err_code == 402:
            self.ledger.log_failover(
                judge_id=lane.id,
                family=lane.family,
                from_lane="text/primary",
                to_lane="text/tier2-keyless",
                http_code=402,
                task_ref=self.task_ref,
            )
            return self._keyless_once(lane, step=step, system=system, user=user)

        # 429 → one backoff then failover
        if err_code == 429:
            self.ledger.append(
                agent=f"ensemble-ahp/{lane.id}",
                class_="lane-429",
                trigger="429",
                summary=f"backoff {self.backoff_seconds}s then failover family={lane.family}",
                lane="text/primary",
                service="openrouter",
                task_ref=self.task_ref,
                attempts=1,
            )
            _sleep(self.backoff_seconds, self.sleeper)
            retry = self._openrouter_once(
                lane,
                model=lane.primary_model,
                step=step,
                system=system,
                user=user,
                lane_name="text/primary-retry",
            )
            if retry.ok:
                return retry
            self.ledger.log_failover(
                judge_id=lane.id,
                family=lane.family,
                from_lane="text/primary",
                to_lane="text/tier2-keyless",
                http_code=429,
                task_ref=self.task_ref,
                attempts=2,
            )
            return self._keyless_once(lane, step=step, system=system, user=user)

        # 5xx — try once more on primary, then failover
        if err_code in {500, 502, 503, 504, 0}:
            retry = self._openrouter_once(
                lane,
                model=lane.fallback_model,
                step=step,
                system=system,
                user=user,
                lane_name="text/primary-fallback-model",
            )
            if retry.ok:
                return retry
            self.ledger.log_failover(
                judge_id=lane.id,
                family=lane.family,
                from_lane="text/primary",
                to_lane="text/tier2-keyless",
                http_code=err_code or "5xx",
                task_ref=self.task_ref,
                attempts=2,
            )
            return self._keyless_once(lane, step=step, system=system, user=user)

        # Other errors: try family fallback model, then keyless
        fb = self._openrouter_once(
            lane,
            model=lane.fallback_model,
            step=step,
            system=system,
            user=user,
            lane_name="text/family-fallback",
        )
        if fb.ok:
            return fb
        return self._keyless_once(lane, step=step, system=system, user=user)

    def _openrouter_once(
        self,
        lane: JudgeLane,
        *,
        model: str,
        step: str,
        system: str,
        user: str,
        lane_name: str,
    ) -> JudgeCallResult:
        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
            "X-Title": "WR-4483 ensemble-ahp-engine",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
        }
        status, body = self.http_post(OPENROUTER_URL, payload, headers)
        if status != 200 or not isinstance(body, dict):
            detail = body if isinstance(body, str) else json.dumps(body)[:200]
            self.ledger.log_judge_call(
                judge_id=lane.id,
                family=lane.family,
                model=model,
                step=step,
                ok=False,
                lane=lane_name,
                service="openrouter",
                cost_usd=None,
                trigger=str(status or "network"),
                class_=_class_for_status(status),
                detail=detail,
                task_ref=self.task_ref,
            )
            return JudgeCallResult(ok=False, response=None, error=f"http:{status}:{detail}")

        text = _extract_message_text(body)
        usage = body.get("usage") or {}
        pin = int(usage.get("prompt_tokens") or 0)
        pout = int(usage.get("completion_tokens") or 0)
        cost: float | None
        if "total_cost" in usage and usage["total_cost"] is not None:
            cost = float(usage["total_cost"])
        else:
            cost = _estimate_cost_usd(model, pin, pout)
            if cost is None:
                self.cost_known = False
        if cost is not None:
            self.total_cost_usd += cost
        else:
            self.cost_known = False

        resp = JudgeResponse(
            text=text,
            model=str(body.get("model") or model),
            family=lane.family,
            judge_id=lane.id,
            lane=lane_name,
            service="openrouter",
            prompt_tokens=pin,
            completion_tokens=pout,
            cost_usd=cost,
            mock=False,
            raw=body,
        )
        self._record_family(lane.family, resp.model)
        self.ledger.log_judge_call(
            judge_id=lane.id,
            family=lane.family,
            model=resp.model,
            step=step,
            ok=True,
            lane=lane_name,
            service="openrouter",
            cost_usd=cost,
            prompt_tokens=pin,
            completion_tokens=pout,
            task_ref=self.task_ref,
        )
        return JudgeCallResult(ok=True, response=resp)

    def _keyless_once(
        self,
        lane: JudgeLane,
        *,
        step: str,
        system: str,
        user: str,
    ) -> JudgeCallResult:
        """Tier-2 keyless lane.

        Tries OpenRouter free model id if a key still exists (some free models
        need a key but zero credits). If that fails or no key, falls through to
        the deterministic mock labelled as keyless-bridge so the pipeline still
        completes and the failover is ledgered (never silent).
        """
        if self.api_key:
            free = self._openrouter_once(
                lane,
                model=lane.keyless_model,
                step=step,
                system=system,
                user=user,
                lane_name="text/tier2-keyless",
            )
            if free.ok:
                return free

        # Final degrade: labelled synthetic completion (not silent).
        resp = self._mock_completion(lane, step, user)
        resp.lane = "text/tier2-keyless-bridge"
        resp.service = "keyless-bridge"
        resp.model = PERPLEXITY_KEYLESS_HINT + f"+mock:{lane.family}"
        self.ledger.log_judge_call(
            judge_id=lane.id,
            family=lane.family,
            model=resp.model,
            step=step,
            ok=True,
            lane=resp.lane,
            service=resp.service,
            cost_usd=0.0,
            trigger="judge-call-keyless",
            class_="lane-failover",
            detail="keyless bridge synthetic completion after ladder exhaust",
            task_ref=self.task_ref,
        )
        self._record_family(lane.family, resp.model)
        return JudgeCallResult(ok=True, response=resp)


def _class_for_status(status: int) -> str:
    if status == 402:
        return "lane-402"
    if status == 429:
        return "lane-429"
    if status in {500, 502, 503, 504}:
        # Ledger schema only allows the aggregate "lane-5xx" class (see
        # ledger.ALLOWED_CLASSES); exact per-status classes like "lane-500"
        # would raise ValueError and crash failover.
        return "lane-5xx"
    return "other"


def _extract_http_code(error: str) -> int:
    # error format: http:{status}:{detail}
    if error.startswith("http:"):
        parts = error.split(":", 2)
        try:
            return int(parts[1])
        except (ValueError, IndexError):
            return 0
    return 0


def _extract_message_text(body: dict[str, Any]) -> str:
    choices = body.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return str(content or "")


def _extract_items(prompt: str) -> list[str]:
    """Pull newline/comma-separated labels after an ITEMS: marker."""
    marker = "ITEMS:"
    if marker not in prompt:
        return []
    tail = prompt.split(marker, 1)[1].strip()
    # Stop at next ALLCAPS section header if present
    lines = []
    for line in tail.splitlines():
        if line.strip().endswith(":") and line.strip().isupper():
            break
        lines.append(line)
    blob = "\n".join(lines)
    items: list[str] = []
    for part in blob.replace("\n", ",").split(","):
        name = part.strip().strip("-").strip()
        if name:
            items.append(name)
    return items


def _random_consistent_matrix(n: int, rng: random.Random) -> Matrix:
    """Build a nearly-consistent reciprocal matrix from a hidden weight vector."""
    # Positive weights → perfectly consistent pairwise ratios, lightly jittered.
    weights = [rng.uniform(0.5, 2.0) for _ in range(n)]
    matrix: Matrix = [[1.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            ratio = weights[i] / weights[j]
            # Mild jitter keeps dispersion non-zero across judges without chaos.
            jitter = rng.uniform(0.85, 1.15)
            matrix[i][j] = clamp_saaty(ratio * jitter)
            matrix[j][i] = 1.0 / matrix[i][j]
    return reciprocal_close(matrix)


def parse_json_object(text: str) -> dict[str, Any]:
    """Extract the first JSON object from a model response."""
    text = text.strip()
    if not text:
        raise ValueError("empty model response")
    try:
        val = json.loads(text)
        if isinstance(val, dict):
            return val
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        val = json.loads(text[start:end + 1])
        if isinstance(val, dict):
            return val
    raise ValueError("no JSON object in model response")


def default_panel() -> Sequence[JudgeLane]:
    return DEFAULT_JUDGES
