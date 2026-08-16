"""CLI tests for gatekeeper_cli.commands.secrets.

Covers list, get, set, delete, and rotate commands with mocked DopplerAPI.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gatekeeper_cli.commands import secrets as secrets_module


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def mock_api():
    with patch.object(secrets_module, "DopplerAPI", create=True) as api_cls:
        instance = MagicMock()
        api_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_config():
    with patch.object(secrets_module, "config") as cfg:
        cfg.get_doppler_token.return_value = "dop_test_token"
        cfg.get_doppler_project.return_value = "proj"
        cfg.get_doppler_config.return_value = "dev"
        yield cfg


class TestListCommand:
    def test_list_success(self, runner, mock_api, mock_config):
        mock_api.list_secrets.return_value = [
            {"name": "DB_URL", "computed": {"source": "manual"}},
            {"name": "API_KEY", "computed": {"source": "manual"}},
        ]
        result = runner.invoke(secrets_module.secrets, ["list"])
        assert result.exit_code == 0
        assert "DB_URL" in result.output or "API_KEY" in result.output

    def test_list_empty(self, runner, mock_api, mock_config):
        mock_api.list_secrets.return_value = {}
        result = runner.invoke(secrets_module.secrets, ["list"])
        assert result.exit_code == 0

    def test_list_missing_token(self, runner, mock_api, mock_config):
        mock_config.return_value = {"token": None}
        result = runner.invoke(secrets_module.secrets, ["list"])
        assert result.exit_code != 0 or "token" in result.output.lower()

    def test_list_api_error(self, runner, mock_api, mock_config):
        mock_api.list_secrets.side_effect = Exception("API down")
        result = runner.invoke(secrets_module.secrets, ["list"])
        assert result.exit_code != 0


class TestGetCommand:
    def test_get_success(self, runner, mock_api, mock_config):
        mock_api.get_secret.return_value = "secret-value"
        result = runner.invoke(secrets_module.secrets, ["get", "API_KEY"])
        assert result.exit_code == 0
        assert "secret-value" in result.output

    def test_get_missing(self, runner, mock_api, mock_config):
        mock_api.get_secret.return_value = None
        result = runner.invoke(secrets_module.secrets, ["get", "MISSING"])
        assert result.exit_code in (0, 1)

    def test_get_api_error(self, runner, mock_api, mock_config):
        mock_api.get_secret.side_effect = Exception("boom")
        result = runner.invoke(secrets_module.secrets, ["get", "API_KEY"])
        assert result.exit_code != 0


class TestSetCommand:
    def test_set_success(self, runner, mock_api, mock_config):
        mock_api.set_secret.return_value = True
        result = runner.invoke(secrets_module.secrets, ["set", "API_KEY", "--value", "newval"])
        assert result.exit_code == 0
        mock_api.set_secret.assert_called_once()

    def test_set_api_error(self, runner, mock_api, mock_config):
        mock_api.set_secret.side_effect = Exception("denied")
        result = runner.invoke(secrets_module.secrets, ["set", "API_KEY", "newval"])
        assert result.exit_code != 0


class TestDeleteCommand:
    def test_delete_success(self, runner, mock_api, mock_config):
        mock_api.delete_secret.return_value = True
        result = runner.invoke(secrets_module.secrets, ["delete", "API_KEY"], input="y\n")
        assert result.exit_code == 0

    def test_delete_api_error(self, runner, mock_api, mock_config):
        mock_api.delete_secret.side_effect = Exception("nope")
        result = runner.invoke(secrets_module.secrets, ["delete", "API_KEY"], input="y\n")
        assert result.exit_code != 0


class TestRotateCommand:
    def test_rotate_success(self, runner, mock_api, mock_config):
        mock_api.rotate_secret.return_value = "new-rotated-value"
        result = runner.invoke(secrets_module.secrets, ["rotate", "API_KEY"])
        assert result.exit_code == 0

    def test_rotate_api_error(self, runner, mock_api, mock_config):
        mock_api.rotate_secret.side_effect = Exception("rotate fail")
        result = runner.invoke(secrets_module.secrets, ["rotate", "API_KEY"])
        assert result.exit_code != 0
