from __future__ import annotations

from datetime import datetime, timezone

import pytest

from revvel_ops import planner
from revvel_ops.audit import verify_chain
from revvel_ops.models import AutonomyMode, Disposition

NOW = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)
IDENT = "angelreporters@gmail.com"


def test_plan_writes_hash_chained_audit(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT, now=NOW)
    assert plan.items
    report = verify_chain(audit.path)
    assert report["ok"] is True
    types = {r["event_type"] for r in audit.read()}
    assert {"plan.started", "fixture.loaded", "proposal.created", "policy.decided", "plan.completed"} <= types


def test_review_everything_produces_no_allow(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT,
                                 autonomy_mode=AutonomyMode.review_everything, now=NOW)
    assert plan.counts()[Disposition.allow.value] == 0


def test_dry_run_makes_no_network_calls(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT,
                                 autonomy_mode=AutonomyMode.policy_automation, now=NOW)
    report = planner.dry_run(plan, audit)
    assert report["network_calls"] == 0
    assert report["simulated"] >= 1
    assert all(r.get("simulated") for r in report["results"])
    assert verify_chain(audit.path)["ok"] is True


def test_apply_always_refuses_and_is_audited(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT, now=NOW)
    with pytest.raises(planner.ApplyRefused):
        planner.apply(plan, audit)
    assert any(r["event_type"] == "apply.refused" for r in audit.read())


def test_high_risk_items_never_allowed_in_any_mode(settings, audit, fixture_path):
    for mode in AutonomyMode:
        plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT, autonomy_mode=mode, now=NOW)
        for item in plan.items:
            if item.decision.disposition is Disposition.allow:
                assert item.proposal.risk_tier.value in {"low", "medium"}
                assert item.proposal.externally_visible is False
                assert item.proposal.permission.value not in {"delete", "unsubscribe"}


def test_non_allowlisted_identity_denied_end_to_end(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity="intruder@example.test",
                                 autonomy_mode=AutonomyMode.policy_automation, now=NOW)
    assert all(i.decision.disposition is Disposition.deny for i in plan.items)


def test_confidence_recorded_for_every_item(settings, audit, fixture_path):
    plan = planner.load_and_plan(fixture_path, settings, audit, identity=IDENT, now=NOW)
    assert all(0 <= i.decision.confidence <= 100 for i in plan.items)
