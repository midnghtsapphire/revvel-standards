"""Policy engine: confidence scoring (0-100) plus action disposition.

Design rules (Revvel Standards):
  * Confidence and disposition are computed separately. A high score never
    unlocks a capability that policy forbids.
  * High-risk, irreversible, or externally visible actions are blocked for
    approval by default, regardless of score.
  * Identity binding is enforced before any other rule.
  * Unknown capability => require_approval, never allow.
"""

from __future__ import annotations

from datetime import timedelta

from .config import IdentityConfig, PolicyConfig
from .models import (
    ActionProposal,
    AutonomyMode,
    Disposition,
    Permission,
    PolicyDecision,
    Reversibility,
    RiskTier,
    utc_now,
)


def score_confidence(proposal: ActionProposal, policy: PolicyConfig) -> tuple[int, list[str]]:
    """Return a 0-100 confidence score and the reasons that shaped it."""
    w = policy.weights
    reasons: list[str] = []
    score = 20
    reasons.append("base=20")

    ev_points = min(len(proposal.evidence) * w.evidence_count, w.evidence_cap)
    if ev_points:
        score += ev_points
        reasons.append(f"evidence(+{ev_points}) from {len(proposal.evidence)} item(s)")
    else:
        reasons.append("no_evidence(+0)")

    if proposal.reversibility is Reversibility.reversible:
        score += w.reversible_bonus
        reasons.append(f"reversible(+{w.reversible_bonus})")
    elif proposal.reversibility is Reversibility.conditionally_reversible:
        score += w.conditionally_reversible_bonus
        reasons.append(f"conditionally_reversible(+{w.conditionally_reversible_bonus})")

    if not proposal.externally_visible:
        score += w.internal_only_bonus
        reasons.append(f"internal_only(+{w.internal_only_bonus})")

    if proposal.rollback_ref:
        score += w.rollback_ref_bonus
        reasons.append(f"rollback_ref(+{w.rollback_ref_bonus})")

    heuristic = int(round(proposal.heuristic_score * w.heuristic_weight))
    if heuristic:
        score += heuristic
        reasons.append(f"skill_heuristic(+{heuristic})")

    risk_pen = w.risk_penalty.get(proposal.risk_tier.value, 25)
    score -= risk_pen
    reasons.append(f"risk_{proposal.risk_tier.value}(-{risk_pen})")

    perm_pen = w.permission_penalty.get(proposal.permission.value, 20)
    score -= perm_pen
    reasons.append(f"permission_{proposal.permission.value}(-{perm_pen})")

    return max(0, min(100, score)), reasons


def evaluate(
    proposal: ActionProposal,
    policy: PolicyConfig,
    identities: IdentityConfig,
    autonomy_mode: AutonomyMode | None = None,
) -> PolicyDecision:
    mode = autonomy_mode or policy.autonomy_mode
    confidence, reasons = score_confidence(proposal, policy)
    rules: list[str] = ["R000-score"]

    def decide(disposition: Disposition, rule: str, why: str) -> PolicyDecision:
        rules.append(rule)
        reasons.append(why)
        return PolicyDecision(
            proposal_id=proposal.proposal_id,
            autonomy_mode=mode,
            confidence=confidence,
            disposition=disposition,
            policy_rule_ids=rules,
            reasons=reasons,
            required_approvers=[] if disposition is Disposition.allow else list(policy.approvers),
            expires_at=(
                None
                if disposition is Disposition.allow
                else utc_now() + timedelta(minutes=policy.approval_ttl_minutes)
            ),
        )

    # R010 - hard deny list.
    if proposal.capability in policy.deny_capabilities:
        return decide(Disposition.deny, "R010-deny-capability", "capability on deny list")

    # R020 - identity binding. Prevents operating over a non-allowlisted account.
    if identities.strict_identity_binding and not identities.is_allowed(proposal.identity):
        return decide(Disposition.deny, "R020-identity-not-allowlisted", "identity not allowlisted")
    if identities.strict_identity_binding and not identities.is_allowed(
        proposal.identity, proposal.permission
    ):
        return decide(
            Disposition.deny,
            "R021-permission-not-granted-for-identity",
            f"permission {proposal.permission.value} not granted for identity",
        )

    # R030 - review_everything never auto-executes.
    if mode is AutonomyMode.review_everything:
        return decide(
            Disposition.require_approval,
            "R030-review-everything",
            "autonomy mode review_everything",
        )

    # R040 - permissions that always need a human.
    if proposal.permission in policy.always_require_approval_permissions:
        return decide(
            Disposition.require_approval,
            "R040-permission-gate",
            f"permission {proposal.permission.value} always gated",
        )

    # R041 - capability-level gate.
    if proposal.capability in policy.always_require_approval_capabilities:
        return decide(Disposition.require_approval, "R041-capability-gate", "capability always gated")

    # R050 - externally visible actions.
    if proposal.externally_visible and policy.externally_visible_requires_approval:
        return decide(
            Disposition.require_approval,
            "R050-externally-visible",
            "action is externally visible",
        )

    # R060 - irreversible actions.
    if (
        proposal.reversibility is Reversibility.irreversible
        and policy.irreversible_requires_approval
    ):
        return decide(Disposition.require_approval, "R060-irreversible", "action is irreversible")

    # R061 - high/critical risk always gated.
    if proposal.risk_tier in (RiskTier.high, RiskTier.critical):
        return decide(
            Disposition.require_approval,
            "R061-high-risk",
            f"risk tier {proposal.risk_tier.value}",
        )

    # R070 - reversible-first: no rollback reference, no automation.
    if proposal.permission in (Permission.write, Permission.delete, Permission.unsubscribe) and not (
        proposal.rollback_ref or proposal.rollback_procedure
    ):
        return decide(
            Disposition.require_approval,
            "R070-no-rollback-reference",
            "mutating action without rollback reference",
        )

    # R080 - safe_automation: explicit capability allowlist only.
    if mode is AutonomyMode.safe_automation:
        if proposal.capability not in policy.safe_automation_allowed_capabilities:
            return decide(
                Disposition.propose,
                "R080-not-in-safe-allowlist",
                "capability not in safe_automation allowlist",
            )
        if confidence >= policy.thresholds.allow_min_confidence:
            return decide(Disposition.allow, "R081-safe-allowlisted", "allowlisted and high confidence")
        return decide(Disposition.propose, "R082-below-threshold", "confidence below allow threshold")

    # R090 - policy_automation: threshold driven, still bounded by rules above.
    if confidence >= policy.thresholds.allow_min_confidence:
        return decide(Disposition.allow, "R090-threshold-allow", "confidence at/above allow threshold")
    if confidence >= policy.thresholds.propose_min_confidence:
        return decide(Disposition.propose, "R091-threshold-propose", "confidence in propose band")
    return decide(Disposition.require_approval, "R092-low-confidence", "confidence below propose band")
