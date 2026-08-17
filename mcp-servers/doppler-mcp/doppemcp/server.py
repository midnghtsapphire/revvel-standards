"""
DoppleMCP - Doppler Secrets MCP Server

Provides programmatic access to Doppler secrets management via MCP.
"""

import os
import asyncio
import logging
from typing import Any, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DopplerMCP:
    """MCP server for Doppler secrets management."""

    def __init__(self):
        self.token = os.getenv("DOPPLER_TOKEN")
        self.project = os.getenv("DOPPLER_PROJECT", "revvel-standards")
        self.config = os.getenv("DOPPLER_CONFIG", "prd")
        self.base_url = "https://api.doppler.com/v3"
        self.server = Server("doppemcp")
        self._setup_tools()

    def _setup_tools(self):
        """Set up MCP tools."""

        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            return [
                Tool(
                    name="doppler_secrets_list",
                    description="List all secrets in a Doppler config",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "project": {"type": "string", "description": "Project name"},
                            "config": {"type": "string", "description": "Config name"},
                        },
                    },
                ),
                Tool(
                    name="doppler_secrets_get",
                    description="Get a specific secret value",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "secret_name": {"type": "string", "description": "Secret name"},
                            "project": {"type": "string", "description": "Project name"},
                            "config": {"type": "string", "description": "Config name"},
                        },
                        "required": ["secret_name"],
                    },
                ),
                Tool(
                    name="doppler_secrets_set",
                    description="Set or update a secret",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "secret_name": {"type": "string", "description": "Secret name"},
                            "secret_value": {"type": "string", "description": "Secret value"},
                            "project": {"type": "string", "description": "Project name"},
                            "config": {"type": "string", "description": "Config name"},
                        },
                        "required": ["secret_name", "secret_value"],
                    },
                ),
                Tool(
                    name="doppler_secrets_delete",
                    description="Delete a secret",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "secret_name": {"type": "string", "description": "Secret name"},
                            "project": {"type": "string", "description": "Project name"},
                            "config": {"type": "string", "description": "Config name"},
                        },
                        "required": ["secret_name"],
                    },
                ),
                Tool(
                    name="doppler_projects_list",
                    description="List all Doppler projects",
                    inputSchema={"type": "object", "properties": {}},
                ),
                Tool(
                    name="doppler_configs_list",
                    description="List configs in a project",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "project": {"type": "string", "description": "Project name"},
                        },
                    },
                ),
                Tool(
                    name="doppler_tokens_create",
                    description="Create a service token",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Token name"},
                            "project": {"type": "string", "description": "Project name"},
                            "config": {"type": "string", "description": "Config name"},
                            "expires_at": {"type": "string", "description": "Expiry ISO date"},
                        },
                        "required": ["name"],
                    },
                ),
                Tool(
                    name="doppler_tokens_list",
                    description="List service tokens",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "project": {"type": "string", "description": "Project name"},
                        },
                    },
                ),
                Tool(
                    name="doppler_tokens_revoke",
                    description="Revoke a service token",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "token": {"type": "string", "description": "Token key to revoke"},
                            "project": {"type": "string", "description": "Project name"},
                        },
                        "required": ["token"],
                    },
                ),
                Tool(
                    name="doppler_health",
                    description="Check Doppler API health",
                    inputSchema={"type": "object", "properties": {}},
                ),
                Tool(
                    name="doppler_me",
                    description="Get current Doppler user info",
                    inputSchema={"type": "object", "properties": {}},
                ),
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Any) -> list[TextContent]:
            try:
                result = await self._handle_tool(name, arguments)
                return [TextContent(type="text", text=str(result))]
            except Exception as e:
                logger.error(f"Tool error: {name} - {e}")
                return [TextContent(type="text", text=str(self._error_response(name, arguments, e)))]

    def _error_response(self, tool: str, args: Any, error: Exception) -> dict:
        """Create standardized error response."""
        return {
            "error": True,
            "code": "DOPPLER_API_ERROR",
            "message": f"Failed to execute {tool}",
            "details": {"tool": tool, "arguments": args, "exception": str(error)},
            "recovery": "Check DOPPLER_TOKEN is valid. Regenerate at dashboard.doppler.com if expired."
        }

    async def _handle_tool(self, name: str, args: dict) -> Any:
        """Handle tool execution with retry logic."""
        project = args.get("project") or self.project
        config = args.get("config") or self.config

        for attempt in range(3):
            try:
                if name == "doppler_secrets_list":
                    return await self._list_secrets(project, config)
                elif name == "doppler_secrets_get":
                    return await self._get_secret(args["secret_name"], project, config)
                elif name == "doppler_secrets_set":
                    return await self._set_secret(args["secret_name"], args["secret_value"], project, config)
                elif name == "doppler_secrets_delete":
                    return await self._delete_secret(args["secret_name"], project, config)
                elif name == "doppler_projects_list":
                    return await self._list_projects()
                elif name == "doppler_configs_list":
                    return await self._list_configs(project)
                elif name == "doppler_tokens_create":
                    return await self._create_token(args.get("name"), project, config, args.get("expires_at"))
                elif name == "doppler_tokens_list":
                    return await self._list_tokens(project)
                elif name == "doppler_tokens_revoke":
                    return await self._revoke_token(args["token"], project)
                elif name == "doppler_health":
                    return await self._health_check()
                elif name == "doppler_me":
                    return await self._get_me()
                else:
                    return {"error": f"Unknown tool: {name}"}
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    raise Exception("Authentication failed - check DOPPLER_TOKEN")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
            except Exception:
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
        return {"error": "Max retries exceeded"}

    async def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Make HTTP request to Doppler API."""
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, f"{self.base_url}{endpoint}", headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()

    async def _list_secrets(self, project: str, config: str) -> dict:
        data = await self._request("GET", f"/projects/{project}/configs/{config}/secrets")
        secrets = data.get("secrets", [])
        return {"project": project, "config": config, "secrets": [{"name": s["name"]} for s in secrets], "count": len(secrets)}

    async def _get_secret(self, name: str, project: str, config: str) -> dict:
        # Call retained for its side effects (existence check / auth failure);
        # the value is deliberately never returned to the caller.
        await self._request("GET", f"/projects/{project}/configs/{config}/secrets/{name}")
        return {"name": name, "project": project, "config": config, "value": "***REDACTED***"}

    async def _set_secret(self, name: str, value: str, project: str, config: str) -> dict:
        await self._request("POST", f"/projects/{project}/configs/{config}/secrets", json={"name": name, "value": value})
        return {"status": "success", "name": name, "action": "set"}

    async def _delete_secret(self, name: str, project: str, config: str) -> dict:
        await self._request("DELETE", f"/projects/{project}/configs/{config}/secrets/{name}")
        return {"status": "success", "name": name, "action": "deleted"}

    async def _list_projects(self) -> dict:
        data = await self._request("GET", "/projects")
        return {"projects": data.get("projects", [])}

    async def _list_configs(self, project: str) -> dict:
        data = await self._request("GET", f"/projects/{project}/configs")
        return {"project": project, "configs": data.get("configs", [])}

    async def _create_token(self, name: str, project: str, config: str, expires_at: Optional[str] = None) -> dict:
        payload = {"name": name, "config": config}
        if expires_at:
            payload["expires_at"] = expires_at
        data = await self._request("POST", f"/projects/{project}/service-tokens", json=payload)
        return {"status": "success", "token": data.get("token", {}).get("key", "***")[:20] + "...", "name": name}

    async def _list_tokens(self, project: str) -> dict:
        data = await self._request("GET", f"/projects/{project}/service-tokens")
        tokens = data.get("service_tokens", [])
        return {"project": project, "tokens": [{"name": t.get("name"), "created_at": t.get("created_at")} for t in tokens]}

    async def _revoke_token(self, token: str, project: str) -> dict:
        await self._request("DELETE", f"/projects/{project}/service-tokens/{token}")
        return {"status": "success", "action": "revoked", "token": token[:8] + "..."}

    async def _health_check(self) -> dict:
        try:
            await self._request("GET", "/health")
            return {"status": "healthy", "service": "doppler"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    async def _get_me(self) -> dict:
        return await self._request("GET", "/me")

    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(read_stream, write_stream, self.server.create_initialization_options())


def main():
    """Entry point."""
    server = DopplerMCP()
    asyncio.run(server.run())


if __name__ == "__main__":
    main()
