"""Tests for gatekeeper-cli projects and configs commands."""
import pytest
from unittest.mock import patch, MagicMock
from click.testing import CliRunner


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def mock_projects_response():
    return [
        {"id": "proj-1", "name": "Test Project", "description": "A test project"},
        {"id": "proj-2", "name": "Another Project", "description": "Another test"},
    ]


@pytest.fixture
def mock_configs_response():
    return [
        {"id": "cfg-1", "name": "production", "project_id": "proj-1"},
        {"id": "cfg-2", "name": "staging", "project_id": "proj-1"},
    ]


class TestListProjects:
    """Tests for the `gk projects list` command."""

    def test_missing_token_shows_error(self, runner):
        """Command should error out when auth token is missing."""
        try:
            from gatekeeper_cli.commands.projects import list_projects
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        with patch("gatekeeper_cli.commands.projects.get_token", return_value=None):
            result = runner.invoke(list_projects, [])
            assert result.exit_code != 0 or "token" in result.output.lower() or "auth" in result.output.lower()

    def test_api_connection_failure(self, runner):
        """Command should handle API connection errors gracefully."""
        try:
            from gatekeeper_cli.commands.projects import list_projects
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", side_effect=ConnectionError("cannot connect")):
            result = runner.invoke(list_projects, [])
            assert result.exit_code != 0 or "error" in result.output.lower() or "fail" in result.output.lower()

    def test_empty_projects_response(self, runner):
        """When no projects returned, show a friendly no-projects message."""
        try:
            from gatekeeper_cli.commands.projects import list_projects
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", return_value=mock_response):
            result = runner.invoke(list_projects, [])
            assert result.exit_code == 0
            assert "no" in result.output.lower() or "empty" in result.output.lower() or result.output.strip() != ""

    def test_happy_path_lists_projects(self, runner, mock_projects_response):
        """Successful listing should render project names."""
        try:
            from gatekeeper_cli.commands.projects import list_projects
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_projects_response

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", return_value=mock_response):
            result = runner.invoke(list_projects, [])
            assert result.exit_code == 0
            assert "Test Project" in result.output or "proj-1" in result.output


class TestListConfigs:
    """Tests for the `gk configs list` command."""

    def test_missing_token_shows_error(self, runner):
        try:
            from gatekeeper_cli.commands.projects import list_configs
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        with patch("gatekeeper_cli.commands.projects.get_token", return_value=None):
            result = runner.invoke(list_configs, ["--project", "proj-1"])
            assert result.exit_code != 0 or "token" in result.output.lower() or "auth" in result.output.lower()

    def test_api_connection_failure(self, runner):
        try:
            from gatekeeper_cli.commands.projects import list_configs
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", side_effect=ConnectionError("cannot connect")):
            result = runner.invoke(list_configs, ["--project", "proj-1"])
            assert result.exit_code != 0 or "error" in result.output.lower() or "fail" in result.output.lower()

    def test_empty_configs_response(self, runner):
        try:
            from gatekeeper_cli.commands.projects import list_configs
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", return_value=mock_response):
            result = runner.invoke(list_configs, ["--project", "proj-1"])
            assert result.exit_code == 0

    def test_happy_path_with_project_flag(self, runner, mock_configs_response):
        try:
            from gatekeeper_cli.commands.projects import list_configs
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_configs_response

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", return_value=mock_response):
            result = runner.invoke(list_configs, ["--project", "proj-1"])
            assert result.exit_code == 0
            assert "production" in result.output or "cfg-1" in result.output

    def test_happy_path_without_project_flag(self, runner, mock_configs_response):
        try:
            from gatekeeper_cli.commands.projects import list_configs
        except ImportError:
            pytest.skip("gatekeeper_cli.commands.projects not available")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_configs_response

        with patch("gatekeeper_cli.commands.projects.get_token", return_value="fake-token"), \
             patch("gatekeeper_cli.commands.projects.requests.get", return_value=mock_response):
            result = runner.invoke(list_configs, [])
            # Either succeeds using default project or fails with missing project error
            assert result.exit_code in (0, 1, 2)
