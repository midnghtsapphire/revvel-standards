"""Tests for DoppleMCP server."""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("DOPPLER_TOKEN", "test_token")
    monkeypatch.setenv("DOPPLER_PROJECT", "test-project")
    monkeypatch.setenv("DOPPLER_CONFIG", "prd")


class TestDopplerMCPInit:
    def test_reads_env_vars(self):
        from doppemcp.server import DopplerMCP

        server = DopplerMCP()
        assert server.token == "test_token"
        assert server.project == "test-project"
        assert server.config == "prd"
        assert server.base_url == "https://api.doppler.com/v3"

    def test_default_project_and_config(self, monkeypatch):
        monkeypatch.delenv("DOPPLER_PROJECT", raising=False)
        monkeypatch.delenv("DOPPLER_CONFIG", raising=False)
        from importlib import reload

        import doppemcp.server as srv

        reload(srv)
        server = srv.DopplerMCP()
        assert server.project == "revvel-standards"
        assert server.config == "prd"


class TestToolHandlerRouting:
    @pytest.fixture()
    def server(self):
        from doppemcp.server import DopplerMCP

        return DopplerMCP()

    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error(self, server):
        result = await server._handle_tool("doppler_unknown_tool", {})
        assert "error" in result

    @pytest.mark.asyncio
    async def test_list_secrets(self, server):
        mock_response = {"secrets": [{"name": "API_KEY"}, {"name": "DB_URL"}]}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool("doppler_secrets_list", {})
        assert result["count"] == 2
        assert result["project"] == "test-project"
        assert result["config"] == "prd"
        assert any(s["name"] == "API_KEY" for s in result["secrets"])

    @pytest.mark.asyncio
    async def test_get_secret_redacts_value(self, server):
        mock_response = {"secret": {"raw": "super-secret-value"}}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool(
                "doppler_secrets_get", {"secret_name": "API_KEY"}
            )
        assert result["name"] == "API_KEY"
        assert result["value"] == "***REDACTED***"

    @pytest.mark.asyncio
    async def test_set_secret(self, server):
        with patch.object(server, "_request", new=AsyncMock(return_value={})):
            result = await server._handle_tool(
                "doppler_secrets_set",
                {"secret_name": "NEW_KEY", "secret_value": "new-value"},
            )
        assert result["status"] == "success"
        assert result["name"] == "NEW_KEY"
        assert result["action"] == "set"

    @pytest.mark.asyncio
    async def test_delete_secret(self, server):
        with patch.object(server, "_request", new=AsyncMock(return_value={})):
            result = await server._handle_tool(
                "doppler_secrets_delete", {"secret_name": "OLD_KEY"}
            )
        assert result["status"] == "success"
        assert result["action"] == "deleted"

    @pytest.mark.asyncio
    async def test_list_projects(self, server):
        mock_response = {"projects": [{"name": "proj-a"}, {"name": "proj-b"}]}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool("doppler_projects_list", {})
        assert len(result["projects"]) == 2

    @pytest.mark.asyncio
    async def test_list_configs(self, server):
        mock_response = {"configs": [{"name": "prd"}, {"name": "stg"}]}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool(
                "doppler_configs_list", {"project": "test-project"}
            )
        assert result["project"] == "test-project"
        assert len(result["configs"]) == 2

    @pytest.mark.asyncio
    async def test_create_token(self, server):
        mock_response = {"token": {"key": "dp.st.abcdefghij1234567890"}}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool(
                "doppler_tokens_create", {"name": "ci-runner"}
            )
        assert result["status"] == "success"
        assert result["name"] == "ci-runner"
        assert "..." in result["token"]

    @pytest.mark.asyncio
    async def test_list_tokens(self, server):
        mock_response = {
            "service_tokens": [
                {"name": "ci-runner", "created_at": "2026-01-01T00:00:00Z"}
            ]
        }
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool("doppler_tokens_list", {})
        assert len(result["tokens"]) == 1
        assert result["tokens"][0]["name"] == "ci-runner"

    @pytest.mark.asyncio
    async def test_revoke_token(self, server):
        with patch.object(server, "_request", new=AsyncMock(return_value={})):
            result = await server._handle_tool(
                "doppler_tokens_revoke", {"token": "dp.st.abcdefghij"}
            )
        assert result["status"] == "success"
        assert result["action"] == "revoked"
        assert "..." in result["token"]

    @pytest.mark.asyncio
    async def test_health_check_healthy(self, server):
        with patch.object(server, "_request", new=AsyncMock(return_value={})):
            result = await server._handle_tool("doppler_health", {})
        assert result["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_check_unhealthy(self, server):
        with patch.object(
            server, "_request", new=AsyncMock(side_effect=Exception("timeout"))
        ):
            result = await server._handle_tool("doppler_health", {})
        assert result["status"] == "unhealthy"
        assert "timeout" in result["error"]

    @pytest.mark.asyncio
    async def test_get_me(self, server):
        mock_response = {"workplace": {"name": "MIDNGHTSAPPHIRE"}}
        with patch.object(server, "_request", new=AsyncMock(return_value=mock_response)):
            result = await server._handle_tool("doppler_me", {})
        assert "workplace" in result


class TestRetryLogic:
    @pytest.fixture()
    def server(self):
        from doppemcp.server import DopplerMCP

        return DopplerMCP()

    @pytest.mark.asyncio
    async def test_retries_on_transient_error(self, server):
        call_count = 0

        async def flaky_request(method, endpoint, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("transient error")
            return {"secrets": []}

        with patch.object(server, "_request", new=flaky_request):
            with patch("asyncio.sleep", new=AsyncMock()):
                result = await server._handle_tool("doppler_secrets_list", {})
        assert call_count == 3
        assert result["count"] == 0

    @pytest.mark.asyncio
    async def test_raises_after_max_retries(self, server):
        with patch.object(
            server,
            "_request",
            new=AsyncMock(side_effect=Exception("persistent error")),
        ):
            with patch("asyncio.sleep", new=AsyncMock()):
                with pytest.raises(Exception, match="persistent error"):
                    await server._handle_tool("doppler_secrets_list", {})


class TestErrorResponse:
    def test_error_response_shape(self):
        from doppemcp.server import DopplerMCP

        server = DopplerMCP()
        err = server._error_response("doppler_secrets_list", {}, ValueError("boom"))
        assert err["error"] is True
        assert err["code"] == "DOPPLER_API_ERROR"
        assert "doppler_secrets_list" in err["message"]
        assert "boom" in err["details"]["exception"]
        assert "DOPPLER_TOKEN" in err["recovery"]
