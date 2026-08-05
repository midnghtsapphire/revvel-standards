from __future__ import annotations

import pytest

from revvel_ops.connectors import registry
from revvel_ops.models import ActionProposal, Permission, RiskTier

EXPECTED = {
    "gmail", "google_calendar", "google_drive", "dropbox", "box", "github",
    "local_companion_windows", "mobile_companion", "n8n", "openrouter",
}


def test_all_required_connectors_registered():
    assert EXPECTED == set(registry.REGISTRY)


def test_every_capability_declares_scopes_gate_and_rollback():
    for manifest in registry.manifests():
        assert manifest.configurable is True
        for cap in manifest.capabilities:
            assert cap.description
            assert cap.approval_gate in {"allow", "propose", "require_approval", "deny"}
            assert cap.rollback
            assert cap.availability in {"available", "partial", "planned", "unavailable"}
            if cap.permission in {Permission.write, Permission.delete}:
                assert cap.scopes or cap.approval_gate == "deny"


def test_permissions_are_separated_not_bundled():
    gmail = registry.get("gmail").manifest
    perms = {c.permission for c in gmail.capabilities}
    assert {Permission.read, Permission.suggest, Permission.write, Permission.delete, Permission.unsubscribe} <= perms
    assert gmail.default_permissions == [Permission.read, Permission.suggest]


def test_gmail_limitations_state_connector_uncertainty():
    text = " ".join(registry.get("gmail").manifest.limitations).lower()
    assert "not all gmail api operations" in text


def test_externally_visible_capabilities_are_gated():
    for manifest in registry.manifests():
        for cap in manifest.capabilities:
            if cap.externally_visible:
                assert cap.approval_gate in {"require_approval", "deny"}


def test_mobile_companion_grants_nothing_by_default():
    mobile = registry.get("mobile_companion").manifest
    assert mobile.default_permissions == []
    arbitrary = mobile.capability("mobile.device.read_arbitrary")
    assert arbitrary.approval_gate == "deny" and arbitrary.availability == "unavailable"


def test_local_companion_has_no_delete_and_documents_allowlist():
    local = registry.get("local_companion_windows").manifest
    assert local.capability("local.fs.delete").approval_gate == "deny"
    assert any("allowlist" in lim.lower() for lim in local.limitations)


def test_apply_is_not_implemented_anywhere():
    proposal = ActionProposal(
        skill="t", connector="gmail", capability="gmail.labels.apply",
        permission=Permission.write, identity="a@example.test", summary="s",
        target_ref="t", risk_tier=RiskTier.low,
    )
    for connector in registry.REGISTRY.values():
        with pytest.raises(NotImplementedError):
            connector.apply(proposal, "token")


def test_dry_run_never_touches_network():
    proposal = ActionProposal(
        skill="t", connector="gmail", capability="gmail.labels.apply",
        permission=Permission.write, identity="a@example.test", summary="s",
        target_ref="t-1", risk_tier=RiskTier.low,
    )
    out = registry.get("gmail").dry_run(proposal)
    assert out["simulated"] is True and out["would_call_network"] is False
