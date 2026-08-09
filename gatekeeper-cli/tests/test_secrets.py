import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock

from gatekeeper_cli.commands.secrets import secrets

@pytest.fixture
def runner():
    return CliRunner()

@pytest.fixture
def mock_config():
    with patch("gatekeeper_cli.commands.secrets.config") as mock:
        mock.get_doppler_token.return_value = "test-token"
        mock.get_doppler_project.return_value = "test-project"
        mock.get_doppler_config.return_value = "test-config"
        yield mock

@pytest.fixture
def mock_api():
    with patch("gatekeeper_cli.commands.secrets.DopplerAPI") as mock:
        yield mock.return_value

def test_list_secrets_success(runner, mock_config, mock_api):
    mock_api.list_secrets.return_value = [
        {"name": "SECRET1", "computed": {"source": "test-source1"}},
        {"name": "SECRET2", "computed": {"source": "test-source2"}},
    ]
    result = runner.invoke(secrets, ["list"])
    assert result.exit_code == 0
    # The output from rich table wraps, so we check parts of it
    assert "Secrets in" in result.output
    assert "test-project/test-config" in result.output
    assert "SECRET1" in result.output
    assert "SECRET2" in result.output

def test_list_secrets_empty(runner, mock_config, mock_api):
    mock_api.list_secrets.return_value = []
    result = runner.invoke(secrets, ["list"])
    assert result.exit_code == 0
    assert "No secrets found in test-project/test-config" in result.output

def test_list_secrets_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(secrets, ["list"])
    assert result.exit_code == 1
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_list_secrets_api_error(runner, mock_config, mock_api):
    mock_api.list_secrets.side_effect = Exception("API Error")
    result = runner.invoke(secrets, ["list"])
    assert result.exit_code == 1
    assert "Error: API Error" in result.output

def test_get_secret_success(runner, mock_config, mock_api):
    mock_api.get_secret.return_value = {"name": "TEST_SECRET", "value": "test-value"}
    result = runner.invoke(secrets, ["get", "TEST_SECRET"])
    assert result.exit_code == 0
    assert "Secret: TEST_SECRET" in result.output
    assert "Value: ***REDACTED***" in result.output

def test_get_secret_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(secrets, ["get", "TEST_SECRET"])
    assert result.exit_code == 1
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_get_secret_api_error(runner, mock_config, mock_api):
    mock_api.get_secret.side_effect = Exception("API Error")
    result = runner.invoke(secrets, ["get", "TEST_SECRET"])
    assert result.exit_code == 1
    assert "Error: API Error" in result.output

def test_set_secret_success(runner, mock_config, mock_api):
    mock_api.set_secret.return_value = None
    result = runner.invoke(secrets, ["set", "TEST_SECRET", "--value", "new-value"])
    assert result.exit_code == 0
    assert "Secret 'TEST_SECRET' set successfully" in result.output

def test_set_secret_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(secrets, ["set", "TEST_SECRET", "--value", "new-value"])
    assert result.exit_code == 1
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_set_secret_api_error(runner, mock_config, mock_api):
    mock_api.set_secret.side_effect = Exception("API Error")
    result = runner.invoke(secrets, ["set", "TEST_SECRET", "--value", "new-value"])
    assert result.exit_code == 1
    assert "Error: API Error" in result.output

def test_delete_secret_success(runner, mock_config, mock_api):
    mock_api.delete_secret.return_value = None
    result = runner.invoke(secrets, ["delete", "TEST_SECRET", "--yes"])
    assert result.exit_code == 0
    assert "Secret 'TEST_SECRET' deleted successfully" in result.output

def test_delete_secret_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(secrets, ["delete", "TEST_SECRET", "--yes"])
    assert result.exit_code == 1
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_delete_secret_api_error(runner, mock_config, mock_api):
    mock_api.delete_secret.side_effect = Exception("API Error")
    result = runner.invoke(secrets, ["delete", "TEST_SECRET", "--yes"])
    assert result.exit_code == 1
    assert "Error: API Error" in result.output

def test_rotate_secret_success(runner, mock_config, mock_api):
    mock_api.set_secret.return_value = None
    result = runner.invoke(secrets, ["rotate", "TEST_SECRET"])
    assert result.exit_code == 0
    assert "Secret 'TEST_SECRET' rotated successfully" in result.output

def test_rotate_secret_no_token(runner, mock_config):
    mock_config.get_doppler_token.return_value = None
    result = runner.invoke(secrets, ["rotate", "TEST_SECRET"])
    assert result.exit_code == 1
    assert "Error: DOPPLER_TOKEN not configured" in result.output

def test_rotate_secret_api_error(runner, mock_config, mock_api):
    mock_api.set_secret.side_effect = Exception("API Error")
    result = runner.invoke(secrets, ["rotate", "TEST_SECRET"])
    assert result.exit_code == 1
    assert "Error: API Error" in result.output
