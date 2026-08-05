from __future__ import annotations

from typer.testing import CliRunner

from revvel_ops import inventory as inventory_service
from revvel_ops.cli import app

runner = CliRunner()


def test_demo_inventory_is_labeled_sample_and_needs_revalidation(settings):
    inv = inventory_service.build_demo_inventory(settings)
    assert inv.sample_data is True
    assert len(inv.connectors) == 10
    assert all(row.revalidation_required for row in inv.connectors)
    assert any("revalidated at runtime" in n for n in inv.notes)


def test_sample_states_match_documented_snapshot(settings):
    by_name = {r.connector: r for r in inventory_service.build_demo_inventory(settings).connectors}
    assert by_name["gmail"].status == "connected"
    assert by_name["github"].status == "connected"
    assert by_name["dropbox"].status == "connected"
    assert by_name["google_drive"].status == "connected"
    assert by_name["box"].status == "disabled_by_user"


def test_box_is_disabled_and_never_reprompted(settings):
    by_name = {r.connector: r for r in inventory_service.build_demo_inventory(settings).connectors}
    box = by_name["box"]
    assert box.permissions_granted == []
    assert "do not retrigger" in box.notes.lower()
    from revvel_ops.connectors import registry

    limits = " ".join(registry.get("box").manifest.limitations).lower()
    assert "never prompts" in limits or "operator-initiated" in limits


def test_drive_authorization_is_not_treated_as_proven_access(settings):
    by_name = {r.connector: r for r in inventory_service.build_demo_inventory(settings).connectors}
    drive = by_name["google_drive"]
    assert drive.revalidation_required is True
    assert "revalidate" in drive.notes.lower()


def test_capability_matrix_has_no_secrets():
    blob = str(inventory_service.capability_matrix()).lower()
    for banned in ("password", "bearer ", "ghp_", "sk-", "refresh_token"):
        assert banned not in blob


def test_cli_doctor_runs():
    result = runner.invoke(app, ["doctor"])
    assert result.exit_code == 0
    assert "autonomy_mode" in result.stdout


def test_cli_dry_run_runs_offline(tmp_path, monkeypatch):
    monkeypatch.setenv("REVVEL_AUTONOMY_MODE", "policy_automation")
    result = runner.invoke(app, ["dry-run"])
    assert result.exit_code == 0
    assert "dry-run" in result.stdout


def test_cli_apply_is_blocked(tmp_path):
    plan_file = tmp_path / "plan.json"
    plan_file.write_text('{"run_id":"r","skill":"email_cleanup","autonomy_mode":"review_everything","items":[]}')
    result = runner.invoke(app, ["apply", "--plan", str(plan_file)])
    assert result.exit_code != 0
    assert "apply blocked" in result.stdout
