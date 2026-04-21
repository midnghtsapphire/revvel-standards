"""
Revvel Custom MCP Server Template — built with FastMCP
------------------------------------------------------
Repository: templates/mcp/custom-server/mcp_server/server.py

This is the standard starting point for all custom Revvel MCP servers.
Replace [APP_NAME] with your project name throughout this file.

FastMCP docs: https://gofastmcp.com
MCP Standard:  revvel-standards/MCP_STANDARD.md
"""

from fastmcp import FastMCP
import os
import uuid

# ─────────────────────────────────────────────────────────────────────────────
# Server Initialization
# ─────────────────────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="[APP_NAME] MCP Server",
    instructions=(
        "You are connected to the [APP_NAME] MCP server. "
        "Use the tools below to interact with [APP_NAME] data and services. "
        "Always prefer these tools over guessing or hallucinating values."
    ),
)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "")
API_KEY = os.environ.get("API_KEY", "")

# In-memory storage for demonstration purposes
RECORDS = {
    "1": {"id": "1", "name": "Example Record", "data": {"type": "sample"}}
}

# ─────────────────────────────────────────────────────────────────────────────
# Tools — actions the AI agent can take (have side effects or require params)
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool
def get_status() -> dict:
    """Return the current operational status of [APP_NAME].
    
    Use this to check if the service is running before performing other operations.
    """
    return {
        "status": "operational",
        "service": "[APP_NAME]",
        "version": "1.0.0",
    }


@mcp.tool
def example_query(query: str, limit: int = 10) -> list[dict]:
    """Search [APP_NAME] data by a text query.

    Args:
        query: The search string to match against records.
        limit: Maximum number of results to return (default 10, max 100).

    Returns:
        A list of matching records as dictionaries.
    """
    # INSTRUCTION: implement actual database query using DATABASE_URL
    # Example with psycopg2:
    # import psycopg2
    # conn = psycopg2.connect(DATABASE_URL)
    # cur = conn.cursor()
    # cur.execute("SELECT * FROM table WHERE name ILIKE %s LIMIT %s", (f"%{query}%", limit))
    # rows = cur.fetchall()
    # return [dict(row) for row in rows]

    # Mock search across in-memory records
    results = [
        r for r in RECORDS.values()
        if query.lower() in r["name"].lower()
    ]
    return results[:limit]


@mcp.tool
def create_record(name: str, data: dict) -> dict:
    """Create a new record in [APP_NAME].

    Args:
        name: Human-readable name for the record.
        data: Dictionary of field values for the new record.

    Returns:
        The created record including its generated ID.
    """
    # INSTRUCTION: implement actual record creation using DATABASE_URL
    # Example with psycopg2:
    # import psycopg2
    # import json
    # conn = psycopg2.connect(DATABASE_URL)
    # cur = conn.cursor()
    # cur.execute(
    #     "INSERT INTO table (name, data) VALUES (%s, %s) RETURNING id, created_at",
    #     (name, json.dumps(data))
    # )
    # record_id, created_at = cur.fetchone()
    # conn.commit()
    # return {"id": record_id, "name": name, "data": data, "created_at": created_at}

    record_id = str(uuid.uuid4())
    record = {"id": record_id, "name": name, "data": data}
    RECORDS[record_id] = record
    return record


# ─────────────────────────────────────────────────────────────────────────────
# Resources — read-only data endpoints (no side effects)
# ─────────────────────────────────────────────────────────────────────────────

@mcp.resource("data://your-app-name/config")
def get_config() -> dict:
    """Return the public configuration of this [APP_NAME] instance.
    
    Provides environment, feature flags, and non-sensitive settings.
    """
    return {
        "environment": os.environ.get("NODE_ENV", "development"),
        "features": {
            "example_feature": True,
        },
    }


@mcp.resource("data://your-app-name/schema")
def get_schema() -> dict:
    """Return the data schema for [APP_NAME].
    
    Lists all available data types, their fields, and validation rules.
    Useful for agents that need to understand the data model before querying.
    """
    return {
        "tables": [
            {
                "name": "example_table",
                "fields": [
                    {"name": "id", "type": "uuid", "required": True},
                    {"name": "name", "type": "string", "required": True},
                    {"name": "created_at", "type": "timestamp", "required": True},
                ],
            }
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Prompts — reusable prompt templates for common AI workflows
# ─────────────────────────────────────────────────────────────────────────────

@mcp.prompt
def analyze_data(context: str) -> str:
    """Generate a prompt for analyzing [APP_NAME] data.
    
    Args:
        context: Specific area or question to focus the analysis on.
    """
    return (
        f"Analyze the [APP_NAME] data with focus on: {context}\n\n"
        "Use the available tools to fetch real data before drawing conclusions. "
        "Present findings with specific numbers and cite the data source."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
