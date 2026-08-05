"""Email cleanup skill: build proposals from fixture metadata.

This skill consumes *already-fetched metadata* (fixtures in this MVP) and emits
ActionProposal objects. It never calls Gmail, never mutates anything, and never
reads message bodies — only headers/metadata that the fixture provides.

Categories produced: newsletter, notification, receipt, promotion, personal,
security, unknown. Categorization is deterministic and rule-based so results are
reproducible and auditable.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from ..models import (
    ActionProposal,
    Evidence,
    Permission,
    Reversibility,
    RiskTier,
)

CATEGORY_RULES: list[tuple[str, dict[str, Any]]] = [
    ("security", {"list_id": False, "subject_any": ["security alert", "verify", "2fa", "sign-in"]}),
    ("receipt", {"subject_any": ["receipt", "invoice", "order", "payment", "statement"]}),
    ("newsletter", {"requires_list_id": True, "subject_any": []}),
    ("promotion", {"subject_any": ["% off", "sale", "deal", "save now", "limited time"]}),
    ("notification", {"sender_any": ["noreply", "no-reply", "notifications@", "alerts@"]}),
]

PROTECTED_CATEGORIES = {"security", "personal", "receipt"}
LABEL_NAMESPACE = "Revvel"


def _lower(value: Any) -> str:
    return str(value or "").lower()


def categorize(message: dict[str, Any]) -> tuple[str, list[str]]:
    """Return (category, signals). Deterministic, metadata only."""
    signals: list[str] = []
    subject = _lower(message.get("subject"))
    sender = _lower(message.get("from"))
    has_list_id = bool(message.get("list_id"))
    has_unsub = bool(message.get("list_unsubscribe"))

    if has_list_id:
        signals.append("list_id_present")
    if has_unsub:
        signals.append("list_unsubscribe_present")
    if message.get("thread_message_count", 1) > 1:
        signals.append("multi_message_thread")

    for keyword in ("security alert", "verify your", "2fa", "sign-in attempt", "password"):
        if keyword in subject:
            signals.append(f"security_keyword:{keyword}")
            return "security", signals

    for keyword in ("receipt", "invoice", "order #", "payment", "statement"):
        if keyword in subject:
            signals.append(f"receipt_keyword:{keyword}")
            return "receipt", signals

    for keyword in ("% off", "sale", "deal", "save now", "limited time", "flash"):
        if keyword in subject:
            signals.append(f"promo_keyword:{keyword}")
            return "promotion", signals

    if has_list_id or has_unsub:
        signals.append("bulk_sender")
        return "newsletter", signals

    for token in ("noreply", "no-reply", "notifications@", "alerts@", "donotreply"):
        if token in sender:
            signals.append(f"automated_sender:{token}")
            return "notification", signals

    if message.get("in_reply_to") or message.get("personal_contact"):
        signals.append("human_correspondent")
        return "personal", signals

    signals.append("no_matching_rule")
    return "unknown", signals


def _age_days(message: dict[str, Any], now: datetime) -> int:
    raw = message.get("last_message_at") or message.get("date")
    if not raw:
        return 0
    try:
        stamp = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return 0
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return max(0, (now - stamp).days)


def _evidence(message: dict[str, Any], signal: str, note: str = "") -> Evidence:
    return Evidence(
        connector="gmail",
        source_ref=str(message.get("thread_id") or message.get("id")),
        signal=signal,
        notes=note,
    ).finalize()


def load_fixture(path: Path | str) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return data["messages"] if isinstance(data, dict) else data


def build_proposals(
    messages: Iterable[dict[str, Any]],
    identity: str,
    now: datetime | None = None,
    stale_days: int = 120,
    min_bulk_volume: int = 8,
) -> list[ActionProposal]:
    """Produce label / archive / unsubscribe / delete proposals.

    Every proposal is a *proposal*. Nothing here executes, and delete proposals
    are always Trash (recoverable) rather than permanent deletion.
    """
    now = now or datetime.now(timezone.utc)
    proposals: list[ActionProposal] = []

    for message in messages:
        category, signals = categorize(message)
        thread_ref = str(message.get("thread_id") or message.get("id"))
        age = _age_days(message, now)
        volume = int(message.get("sender_volume_90d", 0))
        unread = bool(message.get("unread", False))
        starred = bool(message.get("starred", False))
        base_evidence = [_evidence(message, s) for s in signals[:4]]

        # 1) Label — reversible, internal only, always safe to propose.
        proposals.append(
            ActionProposal(
                skill="email_cleanup",
                connector="gmail",
                capability="gmail.labels.apply",
                permission=Permission.write,
                identity=identity,
                summary=f"Label thread as {LABEL_NAMESPACE}/{category}",
                target_ref=thread_ref,
                parameters={
                    "label": f"{LABEL_NAMESPACE}/{category}",
                    "category": category,
                    "create_label_if_missing": True,
                },
                risk_tier=RiskTier.low,
                reversibility=Reversibility.reversible,
                externally_visible=False,
                rollback_ref=f"label_snapshot:{thread_ref}",
                rollback_procedure="Remove the Revvel/* label; pre-existing labels are untouched.",
                evidence=base_evidence,
                heuristic_score=90 if category != "unknown" else 45,
                tags=["categorize", category],
            )
        )

        # 2) Archive — reversible, internal only. Skip protected/starred/unread-recent.
        archivable = (
            category in {"newsletter", "notification", "promotion"}
            and not starred
            and age >= 14
            and not (unread and age < 30)
        )
        if archivable:
            proposals.append(
                ActionProposal(
                    skill="email_cleanup",
                    connector="gmail",
                    capability="gmail.threads.archive",
                    permission=Permission.write,
                    identity=identity,
                    summary=f"Archive {category} thread inactive {age}d",
                    target_ref=thread_ref,
                    parameters={"remove_labels": ["INBOX"], "age_days": age},
                    risk_tier=RiskTier.medium,
                    reversibility=Reversibility.reversible,
                    externally_visible=False,
                    rollback_ref=f"restore_inbox:{thread_ref}",
                    rollback_procedure="Re-apply the INBOX label to restore the thread.",
                    evidence=base_evidence + [_evidence(message, "inactive_thread", f"{age}d")],
                    heuristic_score=min(95, 55 + age // 6),
                    tags=["archive", category],
                )
            )

        # 3) Unsubscribe — externally visible, irreversible, always approval-gated.
        if (
            message.get("list_unsubscribe")
            and category in {"newsletter", "promotion"}
            and volume >= min_bulk_volume
            and not message.get("engaged_recently", False)
        ):
            proposals.append(
                ActionProposal(
                    skill="email_cleanup",
                    connector="gmail",
                    capability="gmail.subscriptions.unsubscribe",
                    permission=Permission.unsubscribe,
                    identity=identity,
                    summary=f"Propose unsubscribe from {message.get('sender_domain', 'sender')}",
                    target_ref=thread_ref,
                    parameters={
                        "method": "list_unsubscribe_header",
                        "sender_domain": message.get("sender_domain"),
                        "volume_90d": volume,
                        "dispatch": "never_automatic",
                    },
                    risk_tier=RiskTier.high,
                    reversibility=Reversibility.irreversible,
                    externally_visible=True,
                    rollback_ref=None,
                    rollback_procedure="No rollback. Operator must resubscribe manually if needed.",
                    evidence=base_evidence
                    + [_evidence(message, "high_volume_low_engagement", f"{volume}/90d")],
                    heuristic_score=min(90, 40 + volume),
                    tags=["unsubscribe", category],
                )
            )

        # 4) Delete (Trash only) — never for protected categories, always gated.
        deletable = (
            category in {"promotion", "notification"}
            and age >= stale_days
            and not starred
            and category not in PROTECTED_CATEGORIES
        )
        if deletable:
            proposals.append(
                ActionProposal(
                    skill="email_cleanup",
                    connector="gmail",
                    capability="gmail.threads.trash",
                    permission=Permission.delete,
                    identity=identity,
                    summary=f"Move stale {category} thread to Trash ({age}d old)",
                    target_ref=thread_ref,
                    parameters={
                        "destination": "TRASH",
                        "permanent_delete": False,
                        "age_days": age,
                    },
                    risk_tier=RiskTier.high,
                    reversibility=Reversibility.conditionally_reversible,
                    externally_visible=False,
                    rollback_ref=f"untrash:{thread_ref}",
                    rollback_procedure="Untrash within the provider retention window (~30 days).",
                    evidence=base_evidence + [_evidence(message, "stale_low_value", f"{age}d")],
                    heuristic_score=min(85, 35 + age // 10),
                    tags=["trash", category],
                )
            )

    return proposals


def category_counts(messages: Iterable[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for message in messages:
        category, _ = categorize(message)
        counts[category] = counts.get(category, 0) + 1
    return counts
