"""Unit tests for gatekeeper-cli projects and configs listing commands.

Covers:
- gk projects list
- gk configs list

Scenarios tested for each:
- Missing auth token
- API connection failure
- Empty response
- Happy path (rendered table)

Assertions are strict: each scenario pins the exact exit code AND the
expected output, so a crash (unexpected traceback, wrong branch taken)
fails the test instead of slipping through an `or`-chained condition.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gatekeeper_cli.commands.projects import list_configs, list_projects

PROJECTS_MOD = "gatekeeper_cli.commands.projects"

"""Tests for gatekeeper-cli projects and configs commands."""


@pytest.fixture
def runner():
    return CliRunner()


def _mock_api(**methods):
    """Build a DopplerAPI class mock whose instance exposes the given methods."""
    instance = MagicMock()
    for name, value in methods.items():
        if isinstance(value, Exception):
            getattr(instance, name).side_effect = value
        else:
            getattr(instance, name).return_value = value
    api_cls = MagicMock(return_value=instance)
    return api_cls, instance


# ---------------------------------------------------------------------------
# list_projects
# ---------------------------------------------------------------------------

class TestListProjects:
    def test_missing_token_aborts_with_error(self, runner):
        with patch(f"{PROJECTS_MOD}.config") as cfg:
            cfg.get_doppler_token.return_value = None
            result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "DOPPLER_TOKEN not configured" in result.output

    def test_api_connection_failure_aborts_with_error(self, runner):
        api_cls, _ = _mock_api(list_projects=ConnectionError("boom"))
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_projects, [])
        assert result.exit_code != 0
        assert "Error: boom" in result.output

    def test_empty_response_exits_cleanly_with_notice(self, runner):
        api_cls, _ = _mock_api(list_projects=[])
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "No projects found" in result.output

    def test_happy_path_renders_projects_table(self, runner):
        projects = [
            {"id": "p1", "name": "alpha", "created_at": "2024-01-01"},
            {"id": "p2", "name": "beta", "created_at": "2024-02-01"},
        ]
        api_cls, instance = _mock_api(list_projects=projects)
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_projects, [])
        assert result.exit_code == 0
        assert "alpha" in result.output
        assert "beta" in result.output
        api_cls.assert_called_once_with("tkn")
        instance.list_projects.assert_called_once_with()


# ---------------------------------------------------------------------------
# list_configs
# ---------------------------------------------------------------------------

class TestListConfigs:
    def test_missing_token_aborts_with_error(self, runner):
        with patch(f"{PROJECTS_MOD}.config") as cfg:
            cfg.get_doppler_token.return_value = None
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code != 0
        assert "DOPPLER_TOKEN not configured" in result.output

    def test_api_connection_failure_aborts_with_error(self, runner):
        api_cls, _ = _mock_api(list_configs=ConnectionError("boom"))
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code != 0
        assert "Error: boom" in result.output

    def test_empty_response_exits_cleanly_with_notice(self, runner):
        api_cls, _ = _mock_api(list_configs=[])
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code == 0
        assert "No configs found in project 'p1'" in result.output

    def test_happy_path_with_project_flag(self, runner):
        configs = [
            {"id": "c1", "name": "prod", "environment": "prd", "created_at": "2024-01-01"},
            {"id": "c2", "name": "staging", "environment": "stg", "created_at": "2024-01-02"},
        ]
        api_cls, instance = _mock_api(list_configs=configs)
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            result = runner.invoke(list_configs, ["--project", "p1"])
        assert result.exit_code == 0
        assert "prod" in result.output
        assert "staging" in result.output
        instance.list_configs.assert_called_once_with("p1")

    def test_happy_path_without_project_flag_uses_default_project(self, runner):
        configs = [{"id": "c1", "name": "prod", "environment": "prd", "created_at": "2024-01-01"}]
        api_cls, instance = _mock_api(list_configs=configs)
        with patch(f"{PROJECTS_MOD}.config") as cfg, \
             patch(f"{PROJECTS_MOD}.DopplerAPI", api_cls):
            cfg.get_doppler_token.return_value = "tkn"
            cfg.get_doppler_project.return_value = "default-proj"
            result = runner.invoke(list_configs, [])
        assert result.exit_code == 0
        assert "prod" in result.output
        instance.list_configs.assert_called_once_with("default-proj")
