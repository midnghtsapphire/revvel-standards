from __future__ import annotations

from revvel_ops.config import IdentityConfig, IdentityEntry
from revvel_ops.models import (
    ActionProposal,
    AutonomyMode,
    Disposition,
    Evidence,
    Permission,
    Reversibility,
    RiskTier,
)
from revvel_ops.policy import evaluate, score_confidence

IDENT = "angelreporters@gmail.com"


def make(**overrides) -> ActionProposal:
    base = dict(
        skill="email_cleanup",
        connector="gmail",
        capability="gmail.labels.apply",
        permission=Permission.write,
        identity=IDENT,
        summary="label",
        target_ref="t-1",
        risk_tier=RiskTier.low,
        reversibility=Reversibility.reversible,
        externally_visible=False,
        rollback_ref="label_snapshot:t-1",
        heuristic_score=90,
        evidence=[
            Evidence(connector="gmail", source_ref="t-1", signal="bulk_sender").finalize(),
            Evidence(connector="gmail", source_ref="t-1", signal="list_id_present").finalize(),
            Evidence(connector="gmail", source_ref="t-1", signal="inactive_thread").finalize(),
        ],
    )
    base.update(overrides)
    return ActionProposal(**base)


def test_score_is_bounded_0_100(policy):
    low = score_confidence(
        make(risk_tier=RiskTier.critical, permission=Permission.delete, reversibility=Reversibility.irreversible,
             externally_visible=True, rollback_ref=None, heuristic_score=0, evidence=[]),
        policy,
    )[0]
    high = score_confidence(make(), policy)[0]
    assert 0 <= low <= 100 and 0 <= high <= 100
    assert high > low


def test_review_everything_never_allows(policy, permissive_identities):
    d = evaluate(make(), policy, permissive_identities, AutonomyMode.review_everything)
    assert d.disposition is Disposition.require_approval
    assert "R030-review-everything" in d.policy_rule_ids


def test_delete_always_requires_approval(policy, permissive_identities):
    d = evaluate(
        make(capability="gmail.threads.trash", permission=Permission.delete,
             reversibility=Reversibility.conditionally_reversible, risk_tier=RiskTier.high),
        policy, permissive_identities, AutonomyMode.policy_automation,
    )
    assert d.disposition is Disposition.require_approval


def test_unsubscribe_always_requires_approval(policy, permissive_identities):
    d = evaluate(
        make(capability="gmail.subscriptions.unsubscribe", permission=Permission.unsubscribe,
             externally_visible=True, reversibility=Reversibility.irreversible, risk_tier=RiskTier.high),
        policy, permissive_identities, AutonomyMode.policy_automation,
    )
    assert d.disposition is Disposition.require_approval


def test_externally_visible_blocked_even_at_high_confidence(policy, permissive_identities):
    d = evaluate(make(externally_visible=True), policy, permissive_identities, AutonomyMode.policy_automation)
    assert d.disposition is Disposition.require_approval
    assert "R050-externally-visible" in d.policy_rule_ids


def test_high_risk_blocked(policy, permissive_identities):
    d = evaluate(make(risk_tier=RiskTier.high), policy, permissive_identities, AutonomyMode.policy_automation)
    assert d.disposition is Disposition.require_approval


def test_missing_rollback_reference_blocks_automation(policy, permissive_identities):
    d = evaluate(make(rollback_ref=None, rollback_procedure=None), policy, permissive_identities,
                 AutonomyMode.policy_automation)
    assert d.disposition is Disposition.require_approval
    assert "R070-no-rollback-reference" in d.policy_rule_ids


def test_deny_list_is_hard(policy, permissive_identities):
    d = evaluate(make(connector="github", capability="github.repos.delete", permission=Permission.delete),
                 policy, permissive_identities, AutonomyMode.policy_automation)
    assert d.disposition is Disposition.deny


def test_non_allowlisted_identity_is_denied(policy):
    ids = IdentityConfig(
        strict_identity_binding=True,
        identities=[IdentityEntry(identity="someone-else@example.test", provider="google",
                                  allowlisted=True, permissions=[Permission.write])],
    )
    d = evaluate(make(), policy, ids, AutonomyMode.policy_automation)
    assert d.disposition is Disposition.deny
    assert "R020-identity-not-allowlisted" in d.policy_rule_ids


def test_permission_not_granted_for_identity_is_denied(policy):
    ids = IdentityConfig(
        strict_identity_binding=True,
        identities=[IdentityEntry(identity=IDENT, provider="google", allowlisted=True,
                                  permissions=[Permission.read])],
    )
    d = evaluate(make(), policy, ids, AutonomyMode.policy_automation)
    assert d.disposition is Disposition.deny
    assert "R021-permission-not-granted-for-identity" in d.policy_rule_ids


def test_safe_automation_requires_allowlist_and_threshold(policy, permissive_identities):
    allowed = evaluate(make(), policy, permissive_identities, AutonomyMode.safe_automation)
    assert allowed.disposition in (Disposition.allow, Disposition.propose)
    not_listed = evaluate(make(capability="drive.files.move", connector="google_drive"),
                          policy, permissive_identities, AutonomyMode.safe_automation)
    assert not_listed.disposition is Disposition.propose


def test_allow_requires_threshold(policy, permissive_identities):
    weak = evaluate(make(heuristic_score=0, evidence=[]), policy, permissive_identities,
                    AutonomyMode.policy_automation)
    assert weak.disposition is not Disposition.allow


def test_approval_decisions_carry_approvers_and_expiry(policy, permissive_identities):
    d = evaluate(make(risk_tier=RiskTier.high), policy, permissive_identities, AutonomyMode.policy_automation)
    assert d.required_approvers and d.expires_at is not None
