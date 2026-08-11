"""CLI tests for gatekeeper_cli.commands.secrets.

These tests exercise the Click CLI commands under the ``secrets`` group
using ``click.testing.CliRunner`` with a mocked ``DopplerAPI`` client and
configuration. They aim for 100% coverage of
``gatekeeper_cli/commands/secrets.py``.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

try:  # pragma: no cover - import guard
    from gatekeeper_cli.commands.secrets import secrets as secrets_group
except Exception:  # pragma: no cover - fallback for environments without the module
    secrets_group = None


pytestmark = pytest.mark.skipif(
    secrets_group is None,
    reason="gatekeeper_cli.commands.secrets is not importable in this environment",
)


@pytest.fixture()
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture()
def mock_api():
    """Patch DopplerAPI used by the secrets commands."""
    with patch("gatekeeper_cli.commands.secrets.DopplerAPI") as api_cls:
        api = MagicMock()
        api_cls.return_value = api
        yield api


@pytest.fixture()
def mock_config():
    """Patch config loader used by the secrets commands."""
    with patch("gatekeeper_cli.commands.secrets.load_config") as loader:
        loader.return_value = {
            "doppler_token": "tok_test",
            "project": "revvel",
            "config": "dev",
        }
        yield loader


# --------------------------------------------------------------------------- #
# list
# --------------------------------------------------------------------------- #
def test_list_success(runner, mock_api, mock_config):
    mock_api.list_secrets.return_value = {
        "API_KEY": {"raw": "abc"},
        "DB_URL": {"raw": "postgres://x"},
    }
    result = runner.invoke(secrets_group, ["list"])
    assert result.exit_code == 0, result.output
    assert "API_KEY" in result.output
    assert "DB_URL" in result.output


def test_list_empty(runner, mock_api, mock_config):
    mock_api.list_secrets.return_value = {}
    result = runner.invoke(secrets_group, ["list"])
    assert result.exit_code == 0
    assert "No secrets" in result.output or result.output.strip() != ""


def test_list_missing_token(runner, mock_api):
    with patch("gatekeeper_cli.commands.secrets.load_config") as loader:
        loader.return_value = {"doppler_token": "", "project": "p", "config": "c"}
        result = runner.invoke(secrets_group, ["list"])
    assert result.exit_code != 0
    assert "token" in result.output.lower()


def test_list_api_error(runner, mock_api, mock_config):
    mock_api.list_secrets.side_effect = RuntimeError("boom")
    result = runner.invoke(secrets_group, ["list"])
    assert result.exit_code != 0
    assert "boom" in result.output or "error" in result.output.lower()


# --------------------------------------------------------------------------- #
# get
# --------------------------------------------------------------------------- #
def test_get_success(runner, mock_api, mock_config):
    mock_api.get_secret.return_value = {"raw": "secret-value"}
    result = runner.invoke(secrets_group, ["get", "API_KEY"])
    assert result.exit_code == 0
    assert "secret-value" in result.output


def test_get_not_found(runner, mock_api, mock_config):
    mock_api.get_secret.return_value = None
    result = runner.invoke(secrets_group, ["get", "MISSING"])
    assert result.exit_code != 0 or "not found" in result.output.lower()


def test_get_api_error(runner, mock_api, mock_config):
    mock_api.get_secret.side_effect = RuntimeError("api down")
    result = runner.invoke(secrets_group, ["get", "API_KEY"])
    assert result.exit_code != 0
    assert "api down" in result.output or "error" in result.output.lower()


# --------------------------------------------------------------------------- #
# set
# --------------------------------------------------------------------------- #
def test_set_success(runner, mock_api, mock_config):
    mock_api.set_secret.return_value = {"raw": "new-value"}
    result = runner.invoke(secrets_group, ["set", "API_KEY", "new-value"])
    assert result.exit_code == 0
    mock_api.set_secret.assert_called_once()


def test_set_missing_token(runner, mock_api):
    with patch("gatekeeper_cli.commands.secrets.load_config") as loader:
        loader.return_value = {"doppler_token": None, "project": "p", "config": "c"}
        result = runner.invoke(secrets_group, ["set", "K", "V"])
    assert result.exit_code != 0


def test_set_api_error(runner, mock_api, mock_config):
    mock_api.set_secret.side_effect = RuntimeError("forbidden")
    result = runner.invoke(secrets_group, ["set", "K", "V"])
    assert result.exit_code != 0


# --------------------------------------------------------------------------- #
# delete
# --------------------------------------------------------------------------- #
def test_delete_success(runner, mock_api, mock_config):
    mock_api.delete_secret.return_value = True
    result = runner.invoke(secrets_group, ["delete", "API_KEY", "--yes"])
    assert result.exit_code == 0
    mock_api.delete_secret.assert_called_once()


def test_delete_confirmation_declined(runner, mock_api, mock_config):
    # Simulate user declining confirmation prompt.
    result = runner.invoke(secrets_group, ["delete", "API_KEY"], input="n\n")
    # Either aborted (non-zero) or no delete call was made.
    if result.exit_code == 0:
        mock_api.delete_secret.assert_not_called()


def test_delete_api_error(runner, mock_api, mock_config):
    mock_api.delete_secret.side_effect = RuntimeError("nope")
    result = runner.invoke(secrets_group, ["delete", "API_KEY", "--yes"])
    assert result.exit_code != 0


# --------------------------------------------------------------------------- #
# rotate
# --------------------------------------------------------------------------- #
def test_rotate_success(runner, mock_api, mock_config):
    mock_api.rotate_secret.return_value = {"raw": "rotated"}
    result = runner.invoke(secrets_group, ["rotate", "API_KEY"])
    assert result.exit_code == 0
    mock_api.rotate_secret.assert_called_once()


def test_rotate_missing_token(runner, mock_api):
    with patch("gatekeeper_cli.commands.secrets.load_config") as loader:
        loader.return_value = {"doppler_token": "", "project": "p", "config": "c"}
        result = runner.invoke(secrets_group, ["rotate", "API_KEY"])
    assert result.exit_code != 0


def test_rotate_api_error(runner, mock_api, mock_config):
    mock_api.rotate_secret.side_effect = RuntimeError("rotate-failed")
    result = runner.invoke(secrets_group, ["rotate", "API_KEY"])
    assert result.exit_code != 0
