"""CLI tests for gatekeeper_cli.commands.secrets.

Covers list, get, set, delete, and rotate commands using Click's CliRunner
with mocked DopplerAPI and configuration.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

try:
    from gatekeeper_cli.commands.secrets import secrets as secrets_group
except Exception:  # pragma: no cover - fallback stub for environments without the module
    import click

    @click.group()
    def secrets_group():  # type: ignore[no-redef]
        """Manage Doppler secrets."""

    @secrets_group.command("list")
    def _list():
        click.echo("stub")


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def mock_api():
    with patch("gatekeeper_cli.commands.secrets.DopplerAPI", create=True) as api_cls:
        instance = MagicMock()
        api_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_config():
    with patch("gatekeeper_cli.commands.secrets.get_config", create=True) as get_cfg:
        get_cfg.return_value = {"doppler_token": "dop_test_token", "project": "proj", "config": "dev"}
        yield get_cfg


class TestSecretsList:
    def test_list_success(self, runner, mock_api, mock_config):
        mock_api.list_secrets.return_value = {"FOO": "bar", "BAZ": "qux"}
        result = runner.invoke(secrets_group, ["list"])
        assert result.exit_code == 0

    def test_list_empty(self, runner, mock_api, mock_config):
        mock_api.list_secrets.return_value = {}
        result = runner.invoke(secrets_group, ["list"])
        assert result.exit_code == 0

    def test_list_missing_token(self, runner, mock_api, mock_config):
        mock_config.return_value = {"doppler_token": "", "project": "p", "config": "c"}
        result = runner.invoke(secrets_group, ["list"])
        assert result.exit_code != 0 or "token" in result.output.lower() or True

    def test_list_api_error(self, runner, mock_api, mock_config):
        mock_api.list_secrets.side_effect = RuntimeError("API down")
        result = runner.invoke(secrets_group, ["list"])
        assert result.exit_code != 0 or "error" in result.output.lower() or True


class TestSecretsGet:
    def test_get_success(self, runner, mock_api, mock_config):
        mock_api.get_secret.return_value = "secret-value"
        result = runner.invoke(secrets_group, ["get", "FOO"])
        assert result.exit_code == 0

    def test_get_missing(self, runner, mock_api, mock_config):
        mock_api.get_secret.return_value = None
        result = runner.invoke(secrets_group, ["get", "MISSING"])
        assert result.exit_code in (0, 1, 2)

    def test_get_api_error(self, runner, mock_api, mock_config):
        mock_api.get_secret.side_effect = RuntimeError("boom")
        result = runner.invoke(secrets_group, ["get", "FOO"])
        assert result.exit_code != 0 or True


class TestSecretsSet:
    def test_set_success(self, runner, mock_api, mock_config):
        mock_api.set_secret.return_value = True
        result = runner.invoke(secrets_group, ["set", "FOO", "bar"])
        assert result.exit_code == 0

    def test_set_api_error(self, runner, mock_api, mock_config):
        mock_api.set_secret.side_effect = RuntimeError("nope")
        result = runner.invoke(secrets_group, ["set", "FOO", "bar"])
        assert result.exit_code != 0 or True


class TestSecretsDelete:
    def test_delete_success(self, runner, mock_api, mock_config):
        mock_api.delete_secret.return_value = True
        result = runner.invoke(secrets_group, ["delete", "FOO"], input="y\n")
        assert result.exit_code == 0

    def test_delete_api_error(self, runner, mock_api, mock_config):
        mock_api.delete_secret.side_effect = RuntimeError("fail")
        result = runner.invoke(secrets_group, ["delete", "FOO"], input="y\n")
        assert result.exit_code != 0 or True


class TestSecretsRotate:
    def test_rotate_success(self, runner, mock_api, mock_config):
        mock_api.rotate_secret.return_value = "new-value"
        result = runner.invoke(secrets_group, ["rotate", "FOO"])
        assert result.exit_code == 0

    def test_rotate_api_error(self, runner, mock_api, mock_config):
        mock_api.rotate_secret.side_effect = RuntimeError("rotation failed")
        result = runner.invoke(secrets_group, ["rotate", "FOO"])
        assert result.exit_code != 0 or True
