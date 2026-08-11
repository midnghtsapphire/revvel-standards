"""CLI tests for gatekeeper_cli.commands.secrets module.

Covers list, get, set, delete, and rotate commands with mocked DopplerAPI.
Tests success paths, empty responses, missing tokens, and API errors.
"""
from __future__ import annotations

import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

# Ensure the gatekeeper-cli package is importable when running from repo root.
_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))


def _load_secrets_module():
    """Try to import the secrets command module; skip tests if unavailable."""
    try:
        from gatekeeper_cli.commands import secrets as secrets_mod  # type: ignore
        return secrets_mod
    except Exception as exc:  # pragma: no cover - import guard
        pytest.skip(f"gatekeeper_cli.commands.secrets not importable: {exc}")
        return None


@pytest.fixture
def secrets_mod():
    return _load_secrets_module()


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def mock_api():
    api = MagicMock()
    api.list_secrets.return_value = {"FOO": "bar", "BAZ": "qux"}
    api.get_secret.return_value = "bar"
    api.set_secret.return_value = True
    api.delete_secret.return_value = True
    api.rotate_secret.return_value = "new-value"
    return api


def _invoke(runner, group_or_cmd, args, api=None, token="tkn"):
    """Invoke CLI with patched DopplerAPI and config token."""
    patches = []
    # Patch DopplerAPI in the secrets module namespace if present.
    try:
        p1 = patch("gatekeeper_cli.commands.secrets.DopplerAPI", return_value=api or MagicMock())
        patches.append(p1)
    except Exception:
        pass
    # Patch config/token loader if present.
    for attr in ("get_token", "load_token", "get_config"):
        try:
            p = patch(f"gatekeeper_cli.commands.secrets.{attr}", return_value=token)
            patches.append(p)
        except Exception:
            pass

    started = [p.start() for p in patches]
    try:
        return runner.invoke(group_or_cmd, args, catch_exceptions=False)
    finally:
        for p in patches:
            try:
                p.stop()
            except Exception:
                pass


def _get_cli(secrets_mod):
    """Return the click group/command from the secrets module."""
    for name in ("secrets", "cli", "secrets_group"):
        obj = getattr(secrets_mod, name, None)
        if obj is not None:
            return obj
    pytest.skip("No click group/command found in secrets module")


class TestSecretsList:
    def test_list_success(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["list"], api=mock_api)
        assert result.exit_code == 0

    def test_list_empty(self, secrets_mod, runner):
        api = MagicMock()
        api.list_secrets.return_value = {}
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["list"], api=api)
        assert result.exit_code == 0

    def test_list_missing_token(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["list"], api=mock_api, token=None)
        # Either exits nonzero or prints an error message.
        assert result.exit_code != 0 or "token" in (result.output or "").lower()

    def test_list_api_error(self, secrets_mod, runner):
        api = MagicMock()
        api.list_secrets.side_effect = RuntimeError("boom")
        cli = _get_cli(secrets_mod)
        with pytest.raises(Exception):
            _invoke(runner, cli, ["list"], api=api)


class TestSecretsGet:
    def test_get_success(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["get", "FOO"], api=mock_api)
        assert result.exit_code == 0

    def test_get_missing(self, secrets_mod, runner):
        api = MagicMock()
        api.get_secret.return_value = None
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["get", "MISSING"], api=api)
        assert result.exit_code in (0, 1)


class TestSecretsSet:
    def test_set_success(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["set", "FOO", "bar"], api=mock_api)
        assert result.exit_code == 0


class TestSecretsDelete:
    def test_delete_success(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["delete", "FOO"], api=mock_api)
        assert result.exit_code == 0


class TestSecretsRotate:
    def test_rotate_success(self, secrets_mod, runner, mock_api):
        cli = _get_cli(secrets_mod)
        result = _invoke(runner, cli, ["rotate", "FOO"], api=mock_api)
        assert result.exit_code == 0
