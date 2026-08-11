"""CLI tests for gatekeeper_cli.commands.secrets.

Covers list/get/set/delete/rotate commands with mocked DopplerAPI.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

try:
    from gatekeeper_cli.commands import secrets as secrets_cmd
except Exception:  # pragma: no cover - module may not exist in all envs
    secrets_cmd = None


pytestmark = pytest.mark.skipif(
    secrets_cmd is None, reason="gatekeeper_cli.commands.secrets not available"
)


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def mock_api():
    with patch("gatekeeper_cli.commands.secrets.DopplerAPI") as api_cls:
        instance = MagicMock()
        api_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_config():
    with patch("gatekeeper_cli.commands.secrets.load_config") as cfg:
        cfg.return_value = {"doppler_token": "tkn", "project": "p", "config": "dev"}
        yield cfg


def test_list_success(runner, mock_api, mock_config):
    mock_api.list_secrets.return_value = {"A": "1", "B": "2"}
    result = runner.invoke(secrets_cmd.secrets, ["list"])
    assert result.exit_code == 0
    assert "A" in result.output


def test_list_empty(runner, mock_api, mock_config):
    mock_api.list_secrets.return_value = {}
    result = runner.invoke(secrets_cmd.secrets, ["list"])
    assert result.exit_code == 0


def test_list_missing_token(runner, mock_api):
    with patch("gatekeeper_cli.commands.secrets.load_config") as cfg:
        cfg.return_value = {"doppler_token": None}
        result = runner.invoke(secrets_cmd.secrets, ["list"])
        assert result.exit_code != 0


def test_get_success(runner, mock_api, mock_config):
    mock_api.get_secret.return_value = "value"
    result = runner.invoke(secrets_cmd.secrets, ["get", "KEY"])
    assert result.exit_code == 0
    assert "value" in result.output


def test_get_api_error(runner, mock_api, mock_config):
    mock_api.get_secret.side_effect = Exception("boom")
    result = runner.invoke(secrets_cmd.secrets, ["get", "KEY"])
    assert result.exit_code != 0


def test_set_success(runner, mock_api, mock_config):
    mock_api.set_secret.return_value = True
    result = runner.invoke(secrets_cmd.secrets, ["set", "KEY", "VAL"])
    assert result.exit_code == 0


def test_delete_success(runner, mock_api, mock_config):
    mock_api.delete_secret.return_value = True
    result = runner.invoke(secrets_cmd.secrets, ["delete", "KEY"])
    assert result.exit_code == 0


def test_rotate_success(runner, mock_api, mock_config):
    mock_api.rotate_secret.return_value = "new-value"
    result = runner.invoke(secrets_cmd.secrets, ["rotate", "KEY"])
    assert result.exit_code == 0
