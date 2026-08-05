"""Planner / orchestrator: plan -> dry_run -> apply.

``apply`` is intentionally refused in the MVP: there are no live adapters, so the
runner records a refusal event in the audit chain instead of mutating anything.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from . import policy as policy_engine
from .audit import AuditLog
from .config import Settings
from .connectors import registry
from .models import (
    ActionProposal,
    AutonomyMode,
    Disposition,
    Phase,
    Plan,
    PlanItem,
    new_id,
)
from .skills import email_cleanup


class ApplyRefused(RuntimeError):
    """Raised when apply() is attempted in the MVP."""


def new_run_id() -> str:
    return new_id("run")


def _proposal_payload(proposal: ActionProposal) -> dict[str, Any]:
    return {
        "proposal_id": proposal.proposal_id,
        "skill": proposal.skill,
        "connector": proposal.connector,
        "capability": proposal.capability,
        "permission": proposal.permission.value,
        "identity": proposal.identity,
        "summary": proposal.summary,
        "target_ref": proposal.target_ref,
        "risk_tier": proposal.risk_tier.value,
        "reversibility": proposal.reversibility.value,
        "externally_visible": proposal.externally_visible,
        "rollback_ref": proposal.rollback_ref,
        "evidence_ids": [e.evidence_id for e in proposal.evidence],
        "evidence_digests": [e.digest for e in proposal.evidence],
        "content_hash": proposal.content_hash(),
    }


def build_plan(
    proposals: Iterable[ActionProposal],
    settings: Settings,
    audit: AuditLog,
    skill: str,
    autonomy_mode: AutonomyMode | None = None,
) -> Plan:
    mode = autonomy_mode or settings.policy.autonomy_mode
    plan = Plan(run_id=audit.run_id, skill=skill, autonomy_mode=mode)

    audit.append(
        "plan.started",
        {"skill": skill, "autonomy_mode": mode.value, "dry_run_default": settings.policy.dry_run_default},
        phase=Phase.plan,
    )

    for proposal in proposals:
        connector = registry.get(proposal.connector)
        capability = connector.manifest.capability(proposal.capability) if connector else None
        if capability is None:
            audit.append(
                "proposal.rejected_unknown_capability",
                {"proposal": _proposal_payload(proposal)},
                phase=Phase.plan,
                identity=proposal.identity,
                subject_ref=proposal.target_ref,
            )
            continue

        audit.append(
            "proposal.created",
            {"proposal": _proposal_payload(proposal)},
            phase=Phase.plan,
            identity=proposal.identity,
            subject_ref=proposal.target_ref,
        )

        decision = policy_engine.evaluate(proposal, settings.policy, settings.identities, mode)

        # A connector-declared gate may only tighten, never loosen.
        gate_order = {
            Disposition.allow: 0,
            Disposition.propose: 1,
            Disposition.require_approval: 2,
            Disposition.deny: 3,
        }
        try:
            connector_gate = Disposition(capability.approval_gate)
        except ValueError:
            connector_gate = Disposition.require_approval
        if gate_order[connector_gate] > gate_order[decision.disposition]:
            decision.disposition = connector_gate
            decision.policy_rule_ids.append("R100-connector-gate-tightens")
            decision.reasons.append(f"connector gate {connector_gate.value} is stricter")

        audit.append(
            "policy.decided",
            {
                "proposal_id": proposal.proposal_id,
                "decision_id": decision.decision_id,
                "confidence": decision.confidence,
                "disposition": decision.disposition.value,
                "rules": decision.policy_rule_ids,
                "reasons": decision.reasons,
                "decision_hash": decision.content_hash(),
            },
            phase=Phase.plan,
            identity=proposal.identity,
            subject_ref=proposal.target_ref,
        )
        plan.items.append(PlanItem(proposal=proposal, decision=decision))

    counts = plan.counts()
    plan.notes.append(f"dispositions={counts}")
    audit.append("plan.completed", {"plan_id": plan.plan_id, "counts": counts, "items": len(plan.items)}, phase=Phase.plan)
    return plan


def dry_run(plan: Plan, audit: AuditLog) -> dict[str, Any]:
    """Simulate every non-denied item. No network calls occur."""
    audit.append("dry_run.started", {"plan_id": plan.plan_id}, phase=Phase.dry_run)
    simulated: list[dict[str, Any]] = []
    skipped = 0

    for item in plan.items:
        if item.decision.disposition is Disposition.deny:
            skipped += 1
            audit.append(
                "dry_run.skipped_denied",
                {"proposal_id": item.proposal.proposal_id, "capability": item.proposal.capability},
                phase=Phase.dry_run,
                subject_ref=item.proposal.target_ref,
            )
            continue
        connector = registry.get(item.proposal.connector)
        result = connector.dry_run(item.proposal) if connector else {"error": "unknown_connector"}
        result["disposition"] = item.decision.disposition.value
        result["confidence"] = item.decision.confidence
        result["proposal_id"] = item.proposal.proposal_id
        simulated.append(result)
        audit.append(
            "dry_run.simulated",
            {"proposal_id": item.proposal.proposal_id, "result": result},
            phase=Phase.dry_run,
            identity=item.proposal.identity,
            subject_ref=item.proposal.target_ref,
        )

    report = {
        "plan_id": plan.plan_id,
        "run_id": plan.run_id,
        "simulated": len(simulated),
        "skipped_denied": skipped,
        "counts": plan.counts(),
        "network_calls": 0,
        "results": simulated,
    }
    audit.append(
        "dry_run.completed",
        {k: v for k, v in report.items() if k != "results"},
        phase=Phase.dry_run,
    )
    return report


def apply(plan: Plan, audit: AuditLog, approval_token: str | None = None) -> dict[str, Any]:
    """Always refuses in the MVP, and records the refusal."""
    audit.append(
        "apply.refused",
        {
            "plan_id": plan.plan_id,
            "reason": "no live connector adapters are implemented in the MVP",
            "approval_token_present": bool(approval_token),
        },
        phase=Phase.apply,
    )
    raise ApplyRefused(
        "apply is disabled: the MVP ships skeleton adapters only. Implement a live "
        "adapter, obtain approval, and set REVVEL_ALLOW_APPLY explicitly before enabling."
    )


def load_and_plan(
    fixture_path: Path | str,
    settings: Settings,
    audit: AuditLog,
    identity: str,
    autonomy_mode: AutonomyMode | None = None,
    now: datetime | None = None,
) -> Plan:
    messages = email_cleanup.load_fixture(fixture_path)
    audit.append(
        "fixture.loaded",
        {
            "path": str(fixture_path),
            "messages": len(messages),
            "categories": email_cleanup.category_counts(messages),
            "source": "local_fixture_no_network",
        },
        phase=Phase.plan,
        identity=identity,
    )
    proposals = email_cleanup.build_proposals(messages, identity=identity, now=now)
    return build_plan(proposals, settings, audit, skill="email_cleanup", autonomy_mode=autonomy_mode)
