"""FAILURE-LEDGER-compatible JSONL writer for WR-4483 judge calls.

Schema source of truth: agent-pack/failure-ledger.schema.json
  required: ts, agent, class, trigger, summary
  optional: lane, service, repo, task_ref, root_cause, fix_ref, attempts
  additionalProperties: false

Every judge call (success or failure) is one line. The family-diversity
assertion is also written as a ledger line so auditors can grep it without
parsing the full run report.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

# Allowed `class` values from agent-pack/failure-ledger.schema.json
ALLOWED_CLASSES = frozenset(
    {
        "lint-loop-exhausted",
        "ci-heal-exhausted",
        "gate-tamper",
        "hook-bypass",
        "runtime-500",
        "runtime-502",
        "runtime-503",
        "runtime-504",
        "lane-402",
        "lane-429",
        "lane-5xx",
        "lane-failover",
        "lane-recovery",
        "restart",
        "capture-gap",
        "other",
    }
)

DEFAULT_AGENT = "ensemble-ahp"
DEFAULT_REPO = "midnghtsapphire/revvel-standards"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_ledger_path() -> Path:
    """Prefer env override; else logs/ensemble-ahp/<run>.jsonl under repo/CWD."""
    override = os.environ.get("AHP_LEDGER_PATH", "").strip()
    if override:
        return Path(override)
    base = Path(os.environ.get("AHP_LEDGER_DIR", "logs/ensemble-ahp"))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return base / f"run-{stamp}.jsonl"


class FailureLedger:
    """Append-only JSONL ledger. Never deletes or rewrites prior lines."""

    def __init__(self, path: Path | str | None = None, *, repo: str = DEFAULT_REPO):
        self.path = Path(path) if path else default_ledger_path()
        self.repo = repo
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # Touch so callers can always point at an existing file after init.
        if not self.path.exists():
            self.path.touch()

    def append(
        self,
        *,
        agent: str,
        class_: str,
        trigger: str,
        summary: str,
        lane: str | None = None,
        service: str | None = None,
        task_ref: str | None = None,
        root_cause: str | None = None,
        fix_ref: str | None = None,
        attempts: int | None = None,
        ts: str | None = None,
    ) -> dict[str, Any]:
        if class_ not in ALLOWED_CLASSES:
            raise ValueError(f"invalid failure-ledger class: {class_!r}")
        entry: dict[str, Any] = {
            "ts": ts or utc_now_iso(),
            "agent": agent,
            "class": class_,
            "trigger": str(trigger),
            "summary": str(summary)[:500],
            "repo": self.repo,
        }
        if lane is not None:
            entry["lane"] = lane
        if service is not None:
            entry["service"] = service
        if task_ref is not None:
            entry["task_ref"] = task_ref
        if root_cause is not None:
            entry["root_cause"] = root_cause
        if fix_ref is not None:
            entry["fix_ref"] = fix_ref
        if attempts is not None:
            entry["attempts"] = int(attempts)

        line = json.dumps(entry, separators=(",", ":"), ensure_ascii=False)
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
        return entry

    def log_judge_call(
        self,
        *,
        judge_id: str,
        family: str,
        model: str,
        step: str,
        ok: bool,
        lane: str,
        service: str,
        cost_usd: float | None,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        trigger: str = "judge-call",
        class_: str = "other",
        detail: str = "",
        attempts: int = 1,
        task_ref: str | None = None,
    ) -> dict[str, Any]:
        cost_part = (
            f"cost_usd={cost_usd:.6f}" if cost_usd is not None else "cost_usd=unmetered"
        )
        tok_part = ""
        if prompt_tokens is not None or completion_tokens is not None:
            tok_part = (
                f" tokens_in={prompt_tokens or 0} tokens_out={completion_tokens or 0}"
            )
        status = "ok" if ok else "fail"
        summary = (
            f"judge={judge_id} family={family} model={model} step={step} "
            f"status={status} {cost_part}{tok_part}"
        )
        if detail:
            summary = f"{summary} | {detail}"
        return self.append(
            agent=f"{DEFAULT_AGENT}/{judge_id}",
            class_=class_,
            trigger=trigger,
            summary=summary,
            lane=lane,
            service=service,
            task_ref=task_ref,
            attempts=attempts,
        )

    def log_failover(
        self,
        *,
        judge_id: str,
        family: str,
        from_lane: str,
        to_lane: str,
        http_code: int | str,
        task_ref: str | None = None,
        attempts: int = 1,
    ) -> dict[str, Any]:
        code = int(http_code) if str(http_code).isdigit() else 0
        if code == 402:
            cls = "lane-402"
        elif code == 429:
            cls = "lane-429"
        elif code in {500, 502, 503, 504}:
            cls = f"lane-{code}" if f"lane-{code}" in ALLOWED_CLASSES else "lane-5xx"
        else:
            cls = "lane-failover"
        return self.append(
            agent=f"{DEFAULT_AGENT}/{judge_id}",
            class_=cls,
            trigger=str(http_code),
            summary=(
                f"failover family={family} from={from_lane} to={to_lane} "
                f"trigger_http={http_code}"
            ),
            lane=from_lane,
            service="openrouter",
            task_ref=task_ref,
            attempts=attempts,
            root_cause=f"HTTP {http_code} on primary lane",
        )

    def assert_distinct_families(
        self,
        families: Sequence[str],
        *,
        minimum: int = 2,
        task_ref: str | None = None,
    ) -> dict[str, Any]:
        unique = sorted({f for f in families if f})
        ok = len(unique) >= minimum
        summary = (
            f"distinct_model_families={len(unique)} "
            f"families=[{','.join(unique)}] "
            f"minimum={minimum} assertion={'PASS' if ok else 'FAIL'}"
        )
        entry = self.append(
            agent=DEFAULT_AGENT,
            class_="other" if ok else "capture-gap",
            trigger="family-assert",
            summary=summary,
            lane="text",
            service="ensemble-ahp",
            task_ref=task_ref,
            root_cause=None if ok else "fewer than 2 distinct model families invoked",
        )
        if not ok:
            raise RuntimeError(summary)
        return entry

    def read_entries(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        out: list[dict[str, Any]] = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return out

    def families_invoked(self) -> list[str]:
        found: list[str] = []
        for entry in self.read_entries():
            summary = entry.get("summary") or ""
            # Parse "family=xyz" tokens written by log_judge_call
            for part in summary.split():
                if part.startswith("family="):
                    fam = part.split("=", 1)[1]
                    if fam and fam not in found:
                        found.append(fam)
        return found


def validate_entry_shape(entry: dict[str, Any]) -> list[str]:
    """Return a list of schema violations (empty == ok). Lightweight local check."""
    errors: list[str] = []
    for req in ("ts", "agent", "class", "trigger", "summary"):
        if req not in entry:
            errors.append(f"missing required field: {req}")
    if "class" in entry and entry["class"] not in ALLOWED_CLASSES:
        errors.append(f"invalid class: {entry['class']}")
    if "summary" in entry and len(str(entry["summary"])) > 500:
        errors.append("summary exceeds 500 chars")
    allowed = {
        "ts",
        "agent",
        "class",
        "trigger",
        "summary",
        "lane",
        "service",
        "repo",
        "task_ref",
        "root_cause",
        "fix_ref",
        "attempts",
    }
    for key in entry:
        if key not in allowed:
            errors.append(f"additional property not allowed: {key}")
    return errors


def all_entries_valid(entries: Iterable[dict[str, Any]]) -> bool:
    return all(not validate_entry_shape(e) for e in entries)
