import pytest
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

from gatekeeper_cli.commands.projects import projects, configs, list_projects, list_configs

@pytest.fixture
def runner():
    return CliRunner()

@pytest.fixture
def mock_config():
    with patch('gatekeeper_cli.commands.projects.config') as mock:
        mock.get_doppler_token.return_value = 'test-token'
        mock.get_doppler_project.return_value = 'test-project'
        yield mock

@pytest.fixture
def mock_api():
    with patch('gatekeeper_cli.commands.projects.DopplerAPI') as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance
        yield mock_instance

def test_list_projects_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(projects, ['list'])
    assert result.exit_code != 0
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_list_projects_success(runner, mock_config, mock_api):
    mock_api.list_projects.return_value = [
        {"name": "proj1", "id": "proj1-id", "created_at": "2023-01-01"},
        {"name": "proj2", "id": "proj2-id", "created_at": "2023-01-02"}
    ]
    result = runner.invoke(projects, ['list'])
    assert result.exit_code == 0
    assert "Doppler Projects" in result.output
    assert "proj1" in result.output
    assert "proj1-id" in result.output
    assert "proj2" in result.output

def test_list_projects_empty(runner, mock_config, mock_api):
    mock_api.list_projects.return_value = []
    result = runner.invoke(projects, ['list'])
    assert result.exit_code == 0
    assert "No projects found" in result.output

def test_list_projects_api_error(runner, mock_config, mock_api):
    mock_api.list_projects.side_effect = Exception("API failure")
    result = runner.invoke(projects, ['list'])
    assert result.exit_code != 0
    assert "Error: API failure" in result.output

def test_list_configs_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(configs, ['list'])
    assert result.exit_code != 0
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_list_configs_success(runner, mock_config, mock_api):
    mock_api.list_configs.return_value = [
        {"name": "dev", "environment": "development", "created_at": "2023-01-01"},
        {"name": "prd", "environment": "production", "created_at": "2023-01-02"}
    ]
    result = runner.invoke(configs, ['list'])
    assert result.exit_code == 0
    assert "Configs in test-project" in result.output
    assert "dev" in result.output
    assert "prd" in result.output
    mock_api.list_configs.assert_called_once_with("test-project")

def test_list_configs_success_with_project_flag(runner, mock_config, mock_api):
    mock_api.list_configs.return_value = [
        {"name": "dev", "environment": "development", "created_at": "2023-01-01"}
    ]
    result = runner.invoke(configs, ['list', '--project', 'other-project'])
    assert result.exit_code == 0
    assert "Configs in other-project" in result.output
    mock_api.list_configs.assert_called_once_with("other-project")

def test_list_configs_empty(runner, mock_config, mock_api):
    mock_api.list_configs.return_value = []
    result = runner.invoke(configs, ['list'])
    assert result.exit_code == 0
    assert "No configs found in project 'test-project'" in result.output

def test_list_configs_api_error(runner, mock_config, mock_api):
    mock_api.list_configs.side_effect = Exception("API failure")
    result = runner.invoke(configs, ['list'])
    assert result.exit_code != 0
    assert "Error: API failure" in result.output
