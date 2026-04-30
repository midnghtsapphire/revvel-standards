"""
MeiliSearch MCP Server

Provides programmatic access to MeiliSearch via Model Context Protocol.
"""

import os
import asyncio
import logging
from typing import Any, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import meilisearch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MeiliSearchMCP:
    """MCP server for MeiliSearch."""
    
    def __init__(self):
        self.host = os.getenv("MEILI_HOST", "http://localhost:7700")
        self.key = os.getenv("MEILI_KEY", "")
        self.client = meilisearch.Client(self.host, self.key)
        self.server = Server("meilisearch-mcp")
        self._setup_tools()
    
    def _setup_tools(self):
        """Set up MCP tools."""
        
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            return [
                Tool(
                    name="meili_index_create",
                    description="Create a MeiliSearch index",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index unique identifier"},
                            "primary_key": {"type": "string", "description": "Primary key field"},
                        },
                        "required": ["index_uid"],
                    },
                ),
                Tool(
                    name="meili_index_list",
                    description="List all MeiliSearch indexes",
                    inputSchema={"type": "object", "properties": {}},
                ),
                Tool(
                    name="meili_index_delete",
                    description="Delete a MeiliSearch index",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index UID"},
                        },
                        "required": ["index_uid"],
                    },
                ),
                Tool(
                    name="meili_documents_add",
                    description="Add documents to an index",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index UID"},
                            "documents": {"type": "string", "description": "JSON array of documents"},
                        },
                        "required": ["index_uid", "documents"],
                    },
                ),
                Tool(
                    name="meili_documents_search",
                    description="Search documents",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index UID"},
                            "query": {"type": "string", "description": "Search query"},
                            "limit": {"type": "integer", "description": "Max results"},
                        },
                        "required": ["index_uid", "query"],
                    },
                ),
                Tool(
                    name="meili_documents_get",
                    description="Get a document by ID",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index UID"},
                            "document_id": {"type": "string", "description": "Document ID"},
                        },
                        "required": ["index_uid", "document_id"],
                    },
                ),
                Tool(
                    name="meili_settings_update",
                    description="Update index search settings",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "index_uid": {"type": "string", "description": "Index UID"},
                            "searchable_attributes": {"type": "string", "description": "JSON array"},
                            "filterable_attributes": {"type": "string", "description": "JSON array"},
                            "sortable_attributes": {"type": "string", "description": "JSON array"},
                        },
                        "required": ["index_uid"],
                    },
                ),
                Tool(
                    name="meili_health",
                    description="Check MeiliSearch health",
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
                return [TextContent(type="text", text=str({"error": True, "message": str(e)}))]
    
    async def _handle_tool(self, name: str, args: dict) -> Any:
        """Handle tool execution."""
        import json
        
        if name == "meili_index_create":
            primary_key = args.get("primary_key")
            task = self.client.create_index(args["index_uid"], {"primaryKey": primary_key})
            task.wait()
            return {"status": "created", "index": args["index_uid"]}
        
        elif name == "meili_index_list":
            indexes = self.client.get_indexes()
            return {"indexes": [{"uid": i.uid, "primaryKey": i.primary_key} for i in indexes.results]}
        
        elif name == "meili_index_delete":
            index = self.client.index(args["index_uid"])
            task = index.delete()
            task.wait()
            return {"status": "deleted", "index": args["index_uid"]}
        
        elif name == "meili_documents_add":
            index = self.client.index(args["index_uid"])
            docs = json.loads(args["documents"])
            task = index.add_documents(docs)
            task.wait()
            return {"status": "added", "count": len(docs)}
        
        elif name == "meili_documents_search":
            index = self.client.index(args["index_uid"])
            limit = args.get("limit", 20)
            results = index.search(args["query"], {"limit": limit})
            return {
                "query": args["query"],
                "hits": results.hits,
                "count": results.estimated_total_hits,
            }
        
        elif name == "meili_documents_get":
            index = self.client.index(args["index_uid"])
            doc = index.get_document(args["document_id"])
            return doc
        
        elif name == "meili_settings_update":
            index = self.client.index(args["index_uid"])
            settings = {}
            if args.get("searchable_attributes"):
                settings["searchableAttributes"] = json.loads(args["searchable_attributes"])
            if args.get("filterable_attributes"):
                settings["filterableAttributes"] = json.loads(args["filterable_attributes"])
            if args.get("sortable_attributes"):
                settings["sortableAttributes"] = json.loads(args["sortable_attributes"])
            task = index.update_settings(settings)
            task.wait()
            return {"status": "updated", "index": args["index_uid"]}
        
        elif name == "meili_health":
            try:
                health = self.client.health()
                return {"status": "healthy", "version": health.get("version")}
            except Exception as e:
                return {"status": "unhealthy", "error": str(e)}
        
        return {"error": f"Unknown tool: {name}"}
    
    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options(),
            )


def main():
    """Entry point."""
    server = MeiliSearchMCP()
    asyncio.run(server.run())


if __name__ == "__main__":
    main()