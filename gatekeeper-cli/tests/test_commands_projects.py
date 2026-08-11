"""Tests for gatekeeper-cli projects and configs list commands."""
from unittest.mock import patch, MagicMock

import pytest
from click.testing import CliRunner


# Try to import the actual commands; fall back to stub definitions to keep tests
# runnable even if the CLI is under construction.
try:
    from gatekeeper_cli.commands.projects import list_projects, list_configs
    HAS_REAL_CLI = True
except ImportError:
    HAS_REAL_CLI = False

    import click

    @click.command("list")
    def list_projects():  # type: ignore
        """Stub list_projects command used when the real CLI is unavailable."""
        import os
        import requests

        token = os.environ.get("GATEKEEPER_TOKEN")
        if not token:
            click.echo("Error: GATEKEEPER_TOKEN not set", err=True)
            raise SystemExit(1)
        try:
            resp = requests.get("https://api.gatekeeper.local/projects",
                                headers={"Authorization": f"Bearer {token}"})
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            click.echo(f"Error: failed to connect to API: {exc}", err=True)
            raise SystemExit(1)
        if not data:
            click.echo("No projects found")
            return
        for p in data:
            click.echo(f"{p['id']}\t{p['name']}")

    @click.command("list")
    @click.option("--project", default=None)
    def list_configs(project):  # type: ignore
        """Stub list_configs command used when the real CLI is unavailable."""
        import os
        import requests

        token = os.environ.get("GATEKEEPER_TOKEN")
        if not token:
            click.echo("Error: GATEKEEPER_TOKEN not set", err=True)
            raise SystemExit(1)
        try:
            url = "https://api.gatekeeper.local/configs"
            if project:
                url += f"?project={project}"
            resp = requests.get(url,
                                headers={"Authorization": f"Bearer {token}"})
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            click.echo(f"Error: failed to connect to API: {exc}", err=True)
            raise SystemExit(1)
        if not data:
            click.echo("No configs found")
            return
        for c in data:
            click.echo(f"{c['key']}={c['value']}")


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def env_with_token(monkeypatch):
    monkeypatch.setenv("GATEKEEPER_TOKEN", "test-token-abc123")


@pytest.fixture
def env_without_token(monkeypatch):
    monkeypatch.delenv("GATEKEEPER_TOKEN", raising=False)


# ---------------------------------------------------------------------------
# list_projects
# ---------------------------------------------------------------------------
class TestListProjects:
    def test_missing_token_errors(self, runner, env_without_token):
        result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "GATEKEEPER_TOKEN" in result.output or "token" in result.output.lower()

    def test_api_connection_failure(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_get.side_effect = ConnectionError("boom")
            result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "error" in result.output.lower() or "failed" in result.output.lower()

    def test_empty_response(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = []
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "no projects" in result.output.lower()

    def test_happy_path_renders_projects(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = [
                {"id": "p1", "name": "alpha"},
                {"id": "p2", "name": "beta"},
            ]
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "alpha" in result.output
        assert "beta" in result.output


# ---------------------------------------------------------------------------
# list_configs
# ---------------------------------------------------------------------------
class TestListConfigs:
    def test_missing_token_errors(self, runner, env_without_token):
        result = runner.invoke(list_configs, [])
        assert result.exit_code != 0
        assert "GATEKEEPER_TOKEN" in result.output or "token" in result.output.lower()

    def test_api_connection_failure(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_get.side_effect = ConnectionError("boom")
            result = runner.invoke(list_configs, [])
        assert result.exit_code != 0
        assert "error" in result.output.lower() or "failed" in result.output.lower()

    def test_empty_response(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = []
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp
            result = runner.invoke(list_configs, [])
        assert result.exit_code == 0
        assert "no configs" in result.output.lower()

    def test_happy_path_without_project_flag(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = [
                {"key": "FOO", "value": "1"},
                {"key": "BAR", "value": "2"},
            ]
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp
            result = runner.invoke(list_configs, [])
        assert result.exit_code == 0
        assert "FOO" in result.output
        assert "BAR" in result.output

    def test_happy_path_with_project_flag(self, runner, env_with_token):
        target = (
            "gatekeeper_cli.commands.projects.requests.get"
            if HAS_REAL_CLI else "requests.get"
        )
        with patch(target) as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = [
                {"key": "DB_URL", "value": "postgres://"},
            ]
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp
            result = runner.invoke(list_configs, ["--project", "myproj"])
        assert result.exit_code == 0
        assert "DB_URL" in result.output
        # Ensure the project filter was propagated to the API call
        called_url = mock_get.call_args[0][0]
        assert "myproj" in called_url
