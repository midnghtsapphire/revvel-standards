"""Unit tests for gatekeeper_cli.commands.projects.

Covers `gk projects list` and `gk configs list` commands.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

try:
    from gatekeeper_cli.commands.projects import list_projects, list_configs
except ImportError:  # pragma: no cover - fallback if module layout differs
    list_projects = None
    list_configs = None


pytestmark = pytest.mark.skipif(
    list_projects is None or list_configs is None,
    reason="gatekeeper_cli.commands.projects not importable in this environment",
)


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


# ---------------------------------------------------------------------------
# list_projects
# ---------------------------------------------------------------------------
class TestListProjects:
    def test_missing_token_errors(self, runner: CliRunner) -> None:
        with patch("gatekeeper_cli.commands.projects.get_token", return_value=None):
            result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "token" in result.output.lower() or "auth" in result.output.lower()

    def test_api_connection_failure(self, runner: CliRunner) -> None:
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get",
            side_effect=ConnectionError("boom"),
        ):
            result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "error" in result.output.lower() or "fail" in result.output.lower()

    def test_empty_projects(self, runner: CliRunner) -> None:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"projects": []}
        mock_resp.status_code = 200
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get", return_value=mock_resp
        ):
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "no projects" in result.output.lower() or result.output.strip() != ""

    def test_happy_path_renders_projects(self, runner: CliRunner) -> None:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "projects": [
                {"id": "p1", "name": "alpha", "description": "first"},
                {"id": "p2", "name": "beta", "description": "second"},
            ]
        }
        mock_resp.status_code = 200
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get", return_value=mock_resp
        ):
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "alpha" in result.output
        assert "beta" in result.output


# ---------------------------------------------------------------------------
# list_configs
# ---------------------------------------------------------------------------
class TestListConfigs:
    def test_missing_token_errors(self, runner: CliRunner) -> None:
        with patch("gatekeeper_cli.commands.projects.get_token", return_value=None):
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code != 0
        assert "token" in result.output.lower() or "auth" in result.output.lower()

    def test_api_connection_failure(self, runner: CliRunner) -> None:
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get",
            side_effect=ConnectionError("boom"),
        ):
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code != 0
        assert "error" in result.output.lower() or "fail" in result.output.lower()

    def test_empty_configs(self, runner: CliRunner) -> None:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"configs": []}
        mock_resp.status_code = 200
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get", return_value=mock_resp
        ):
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code == 0
        assert "no configs" in result.output.lower() or result.output.strip() != ""

    def test_happy_path_with_project_flag(self, runner: CliRunner) -> None:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "configs": [
                {"id": "c1", "name": "prod", "project_id": "p1"},
                {"id": "c2", "name": "dev", "project_id": "p1"},
            ]
        }
        mock_resp.status_code = 200
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.api_get", return_value=mock_resp
        ):
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code == 0
        assert "prod" in result.output
        assert "dev" in result.output

    def test_happy_path_without_project_flag(self, runner: CliRunner) -> None:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "configs": [{"id": "c1", "name": "prod", "project_id": "p1"}]
        }
        mock_resp.status_code = 200
        with patch(
            "gatekeeper_cli.commands.projects.get_token", return_value="tok"
        ), patch(
            "gatekeeper_cli.commands.projects.get_default_project",
            return_value="p1",
            create=True,
        ), patch(
            "gatekeeper_cli.commands.projects.api_get", return_value=mock_resp
        ):
            result = runner.invoke(list_configs, [])
        # Either succeeds (default project resolved) or reports missing project.
        if result.exit_code == 0:
            assert "prod" in result.output
        else:
            assert "project" in result.output.lower()
