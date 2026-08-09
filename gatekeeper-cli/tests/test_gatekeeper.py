import pytest
from unittest.mock import MagicMock, patch
from click.testing import CliRunner

from gatekeeper_cli.commands.gatekeeper import audit, health, status, sync
from gatekeeper_cli.config import config

@pytest.fixture
def runner():
    return CliRunner()

@pytest.fixture
def mock_config(monkeypatch):
    monkeypatch.setattr(config, "get_doppler_token", lambda: "test-doppler-token")
    monkeypatch.setattr(config, "get_github_token", lambda: "test-github-token")
    monkeypatch.setattr(config, "get_doppler_project", lambda: "test-project")
    monkeypatch.setattr(config, "get_doppler_config", lambda: "test-config")
    monkeypatch.setattr(config, "get_github_owner", lambda: "test-owner")
    monkeypatch.setattr(config, "get_github_repo", lambda: "test-repo")

@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_status_success(mock_github_api, mock_doppler_api, runner, mock_config):
    mock_doppler_inst = MagicMock()
    mock_doppler_inst.health_check.return_value = {"status": "ok", "user": {"user": {"name": "Test User"}}}
    mock_doppler_api.return_value = mock_doppler_inst

    mock_github_inst = MagicMock()
    mock_github_inst.health_check.return_value = {"status": "ok", "user": "test-user"}
    mock_github_api.return_value = mock_github_inst

    result = runner.invoke(status)

    assert result.exit_code == 0
    assert "Checking Gatekeeper status..." in result.output
    assert "Doppler: Connected" in result.output
    assert "Test User" in result.output
    assert "GitHub: Connected" in result.output
    assert "test-user" in result.output

@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_status_missing_config(mock_github_api, mock_doppler_api, runner, monkeypatch):
    monkeypatch.setattr(config, "get_doppler_token", lambda: None)
    monkeypatch.setattr(config, "get_github_token", lambda: None)

    result = runner.invoke(status)

    assert result.exit_code == 0
    assert "Doppler: Not configured" in result.output
    assert "GitHub: Not configured" in result.output

@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_status_api_error(mock_github_api, mock_doppler_api, runner, mock_config):
    mock_doppler_inst = MagicMock()
    mock_doppler_inst.health_check.return_value = {"status": "error", "error": "Invalid token"}
    mock_doppler_api.return_value = mock_doppler_inst

    mock_github_inst = MagicMock()
    mock_github_inst.health_check.return_value = {"status": "error", "error": "Bad credentials"}
    mock_github_api.return_value = mock_github_inst

    result = runner.invoke(status)

    assert result.exit_code == 0
    assert "Doppler: Invalid token" in result.output
    assert "GitHub: Bad credentials" in result.output


@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_health_success(mock_github_api, mock_doppler_api, runner, mock_config):
    mock_doppler_inst = MagicMock()
    mock_doppler_inst.health_check.return_value = {"status": "ok"}
    mock_doppler_api.return_value = mock_doppler_inst

    mock_github_inst = MagicMock()
    mock_github_inst.health_check.return_value = {"status": "ok"}
    mock_github_api.return_value = mock_github_inst

    result = runner.invoke(health)

    assert result.exit_code == 0
    assert "All systems operational" in result.output
    assert "Healthy" in result.output

@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_health_failure(mock_github_api, mock_doppler_api, runner, mock_config):
    mock_doppler_inst = MagicMock()
    mock_doppler_inst.health_check.return_value = {"status": "error", "error": "Invalid token"}
    mock_doppler_api.return_value = mock_doppler_inst

    mock_github_inst = MagicMock()
    mock_github_inst.health_check.return_value = {"status": "ok"}
    mock_github_api.return_value = mock_github_inst

    result = runner.invoke(health)

    assert result.exit_code == 0
    assert "Some systems need attention" in result.output
    assert "Unhealthy" in result.output

@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
def test_audit_success(mock_doppler_api, runner, mock_config):
    mock_doppler_inst = MagicMock()
    mock_doppler_inst.get_secret.return_value = {
        "name": "TEST_SECRET",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "computed": {"source": "test-source"}
    }
    mock_doppler_api.return_value = mock_doppler_inst

    result = runner.invoke(audit, ["--secret", "TEST_SECRET"])

    assert result.exit_code == 0
    assert "Auditing secret: TEST_SECRET" in result.output
    assert "2023-01-01" in result.output
    assert "test-source" in result.output

def test_audit_missing_token(runner, monkeypatch):
    monkeypatch.setattr(config, "get_doppler_token", lambda: None)

    result = runner.invoke(audit, ["--secret", "TEST_SECRET"])

    assert result.exit_code != 0
    assert "Error: DOPPLER_TOKEN not configured" in result.output


@patch("gatekeeper_cli.commands.gatekeeper.subprocess.run")
@patch("pathlib.Path.exists")
def test_sync_success_script(mock_exists, mock_run, runner, mock_config):
    mock_exists.return_value = True

    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Sync output"
    mock_run.return_value = mock_result

    result = runner.invoke(sync)

    assert result.exit_code == 0
    assert "Sync completed successfully" in result.output
    assert "Sync output" in result.output

@patch("pathlib.Path.exists")
@patch("gatekeeper_cli.commands.gatekeeper.DopplerAPI")
@patch("gatekeeper_cli.commands.gatekeeper.GitHubAPI")
def test_sync_fallback_api(mock_github_api, mock_doppler_api, mock_exists, runner, mock_config):
    # Make the script not exist to trigger fallback
    mock_exists.return_value = False

    mock_doppler_inst = MagicMock()
    mock_doppler_inst.list_secrets.return_value = [
        {"name": "SECRET1"}, {"name": "SECRET2"}
    ]
    mock_doppler_inst.get_secret.side_effect = [
        {"value": {"computed": "val1"}},
        {"value": {"computed": "val2"}}
    ]
    mock_doppler_api.return_value = mock_doppler_inst

    mock_github_inst = MagicMock()
    mock_github_api.return_value = mock_github_inst

    result = runner.invoke(sync, ["--secrets", "SECRET1,SECRET2"])

    assert result.exit_code == 0
    assert "gatekeeper-sync.sh not found. Using API directly" in result.output
    assert "Synced: SECRET1" in result.output
    assert "Synced: SECRET2" in result.output
    assert "2 synced, 0 failed" in result.output

    # Check that GitHub API was called
    assert mock_github_inst.set_repo_secret.call_count == 2

def test_sync_missing_tokens(runner, monkeypatch):
    monkeypatch.setattr(config, "get_doppler_token", lambda: None)
    monkeypatch.setattr(config, "get_github_token", lambda: "test-token")

    result = runner.invoke(sync)

    assert result.exit_code != 0
    assert "Error: DOPPLER_TOKEN not configured" in result.output

    monkeypatch.setattr(config, "get_doppler_token", lambda: "test-token")
    monkeypatch.setattr(config, "get_github_token", lambda: None)

    result = runner.invoke(sync)

    assert result.exit_code != 0
    assert "Error: GITHUB_TOKEN not configured" in result.output
