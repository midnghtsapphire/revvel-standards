from __future__ import annotations

from revvel_ops.models import (
    ActionProposal,
    AuditEvent,
    Evidence,
    Permission,
    Phase,
    Reversibility,
    RiskTier,
)


def test_proposal_defaults_are_conservative():
    p = ActionProposal(
        skill="s", connector="gmail", capability="gmail.labels.apply",
        permission=Permission.write, identity="a@example.test",
        summary="x", target_ref="t-1",
    )
    assert p.risk_tier is RiskTier.high
    assert p.reversibility is Reversibility.irreversible
    assert p.externally_visible is True
    assert p.rollback_ref is None


def test_content_hash_is_stable_and_sensitive():
    kwargs = dict(
        skill="s", connector="gmail", capability="gmail.labels.apply",
        permission=Permission.write, identity="a@example.test",
        summary="x", target_ref="t-1",
    )
    a = ActionProposal(**kwargs)
    b = ActionProposal(**kwargs)
    assert a.content_hash() == b.content_hash()
    c = ActionProposal(**{**kwargs, "target_ref": "t-2"})
    assert c.content_hash() != a.content_hash()


def test_evidence_digest_is_deterministic():
    e1 = Evidence(connector="gmail", source_ref="t-1", signal="bulk_sender").finalize()
    e2 = Evidence(connector="gmail", source_ref="t-1", signal="bulk_sender").finalize()
    assert e1.digest == e2.digest and len(e1.digest) == 64
    assert e1.evidence_id != e2.evidence_id


def test_audit_event_seal_produces_hashes():
    ev = AuditEvent(sequence=0, run_id="r", phase=Phase.plan, event_type="t", prev_hash="0" * 64).seal()
    assert len(ev.payload_hash) == 64 and len(ev.event_hash) == 64
    assert ev.signature is None
