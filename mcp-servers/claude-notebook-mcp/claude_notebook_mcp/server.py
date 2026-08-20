#!/usr/bin/env python3
"""Claude Notebook MCP server (FastMCP).

Local notebook cell runtime for Claude Desktop / Claude Code, inspired by
https://github.com/jacob-bd/gemini-notebook-mcp-cli but fully offline-capable
so every tool can be purchase-validated without Google credentials.

WR: midnghtsapphire/revvel-standards#17733
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Callable

# Allow `python path/to/server.py` without an editable install.
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    from fastmcp import FastMCP
except ImportError:  # pragma: no cover - compatibility path for local smoke tests
    import dataclasses as _dc

    @_dc.dataclass
    class _ShimTool:
        name: str

    @_dc.dataclass
    class _ShimResource:
        uri: str

    class FastMCP:  # type: ignore[override]
        """Minimal compatibility shim so tests import without FastMCP installed."""

        def __init__(self, name: str, instructions: str = ""):
            self.name = name
            self.instructions = instructions
            self._tools: dict[str, Callable[..., object]] = {}
            self._resources: dict[str, Callable[..., object]] = {}

        def tool(self, fn: Callable[..., object] | None = None):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._tools[func.__name__] = func
                return func

            return decorator(fn) if fn else decorator

        def resource(self, uri: str):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._resources[uri] = func
                return func

            return decorator

        @property
        def tools(self) -> dict[str, Callable[..., object]]:
            return self._tools

        @property
        def resources(self) -> dict[str, Callable[..., object]]:
            return self._resources

        async def list_tools(self) -> list[_ShimTool]:
            return [_ShimTool(name=n) for n in self._tools]

        async def list_resources(self) -> list[_ShimResource]:
            return [_ShimResource(uri=u) for u in self._resources]

        def run(self) -> None:
            raise RuntimeError(
                "FastMCP is not installed. Install dependencies in "
                "mcp-servers/claude-notebook-mcp/ to run this MCP server over stdio."
            )


# Must stay below the sys.path bootstrap above.
from claude_notebook_mcp.engine import (  # noqa: E402
    CELL_TYPES,
    NotebookEngine,
    NotebookError,
    VALID_WIDGET_TYPES,
)

mcp = FastMCP(
    name="Claude Notebook MCP",
    instructions=(
        "You are connected to the Claude Notebook MCP server — a local notebook "
        "cell runtime for Claude. Create notebooks, add code/markdown/raw cells, "
        "execute Python (persistent kernel) or JavaScript, attach files, create "
        "interactive widgets, and export/import sessions. "
        "Inspired by jacob-bd/gemini-notebook-mcp-cli; this server runs fully "
        "offline without Google authentication."
    ),
)

_ENGINE: NotebookEngine | None = None


def get_engine() -> NotebookEngine:
    """Return the process-wide engine (respects CLAUDE_NOTEBOOK_DIR)."""
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = NotebookEngine()
    return _ENGINE


def _ok(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return {"ok": True, **payload}
    return {"ok": True, "result": payload}


def _err(exc: Exception) -> dict[str, Any]:
    return {
        "ok": False,
        "error": True,
        "error_type": type(exc).__name__,
        "message": str(exc),
    }


def _call(fn: Callable[..., Any], **kwargs: Any) -> dict[str, Any]:
    try:
        return _ok(fn(**kwargs))
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001 — tool boundary
        return _err(exc)


# ── Tools ────────────────────────────────────────────────────────────────────


@mcp.tool
def notebook_health() -> dict[str, Any]:
    """Health check for the Claude Notebook MCP server."""
    return _call(get_engine().health)


@mcp.tool
def notebook_list() -> dict[str, Any]:
    """List all notebooks in the local store."""
    try:
        items = get_engine().list_notebooks()
        return _ok({"notebooks": items, "count": len(items)})
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def notebook_create(
    title: str = "Untitled",
    kernel_language: str = "python",
) -> dict[str, Any]:
    """Create a new notebook with a welcome markdown cell.

    Args:
        title: Human-readable notebook title.
        kernel_language: Default code language (python or javascript).
    """
    return _call(
        get_engine().create_notebook,
        title=title,
        kernel_language=kernel_language,
    )


@mcp.tool
def notebook_get(notebook_id: str) -> dict[str, Any]:
    """Fetch a full notebook document by id.

    Args:
        notebook_id: Notebook id returned by notebook_create / notebook_list.
    """
    return _call(get_engine().get_notebook, notebook_id=notebook_id)


@mcp.tool
def notebook_delete(notebook_id: str) -> dict[str, Any]:
    """Delete a notebook and its attachments.

    Args:
        notebook_id: Notebook id to delete.
    """
    return _call(get_engine().delete_notebook, notebook_id=notebook_id)


@mcp.tool
def notebook_rename(notebook_id: str, title: str) -> dict[str, Any]:
    """Rename a notebook.

    Args:
        notebook_id: Notebook id.
        title: New non-empty title.
    """
    return _call(get_engine().rename_notebook, notebook_id=notebook_id, title=title)


@mcp.tool
def cell_list(notebook_id: str) -> dict[str, Any]:
    """List cells in a notebook (id, type, preview, execution_count).

    Args:
        notebook_id: Notebook id.
    """
    try:
        cells = get_engine().list_cells(notebook_id)
        return _ok({"notebook_id": notebook_id, "cells": cells, "count": len(cells)})
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def cell_add(
    notebook_id: str,
    cell_type: str = "code",
    source: str = "",
    language: str | None = None,
    index: int | None = None,
) -> dict[str, Any]:
    """Add a code, markdown, or raw cell to a notebook.

    Args:
        notebook_id: Target notebook.
        cell_type: One of code | markdown | raw.
        source: Cell source text.
        language: For code cells: python or javascript.
        index: Optional insert index (append when omitted).
    """
    return _call(
        get_engine().add_cell,
        notebook_id=notebook_id,
        cell_type=cell_type,
        source=source,
        language=language,
        index=index,
    )


@mcp.tool
def cell_get(notebook_id: str, cell_id: str) -> dict[str, Any]:
    """Get a single cell including outputs.

    Args:
        notebook_id: Notebook id.
        cell_id: Cell id.
    """
    return _call(get_engine().get_cell, notebook_id=notebook_id, cell_id=cell_id)


@mcp.tool
def cell_update(
    notebook_id: str,
    cell_id: str,
    source: str | None = None,
    cell_type: str | None = None,
    language: str | None = None,
) -> dict[str, Any]:
    """Update cell source and/or type.

    Args:
        notebook_id: Notebook id.
        cell_id: Cell id.
        source: Replacement source (optional).
        cell_type: Replacement type code|markdown|raw (optional).
        language: Replacement language for code cells (optional).
    """
    return _call(
        get_engine().update_cell,
        notebook_id=notebook_id,
        cell_id=cell_id,
        source=source,
        cell_type=cell_type,
        language=language,
    )


@mcp.tool
def cell_delete(notebook_id: str, cell_id: str) -> dict[str, Any]:
    """Delete a cell from a notebook.

    Args:
        notebook_id: Notebook id.
        cell_id: Cell id.
    """
    return _call(get_engine().delete_cell, notebook_id=notebook_id, cell_id=cell_id)


@mcp.tool
def cell_execute(
    notebook_id: str,
    cell_id: str,
    timeout_s: float = 10.0,
) -> dict[str, Any]:
    """Execute a cell. Python cells share a persistent kernel per notebook.

    Args:
        notebook_id: Notebook id.
        cell_id: Cell id.
        timeout_s: Timeout for JavaScript cells (seconds).
    """
    return _call(
        get_engine().execute_cell,
        notebook_id=notebook_id,
        cell_id=cell_id,
        timeout_s=timeout_s,
    )


@mcp.tool
def cell_execute_all(
    notebook_id: str,
    stop_on_error: bool = True,
    timeout_s: float = 10.0,
) -> dict[str, Any]:
    """Execute every cell in order.

    Args:
        notebook_id: Notebook id.
        stop_on_error: Stop when a code cell errors (default True).
        timeout_s: Per-cell JS timeout.
    """
    return _call(
        get_engine().execute_all,
        notebook_id=notebook_id,
        stop_on_error=stop_on_error,
        timeout_s=timeout_s,
    )


@mcp.tool
def kernel_variables(notebook_id: str) -> dict[str, Any]:
    """List live Python kernel variable names and types for a notebook.

    Args:
        notebook_id: Notebook id.
    """
    return _call(get_engine().kernel_variables, notebook_id=notebook_id)


@mcp.tool
def kernel_reset(notebook_id: str) -> dict[str, Any]:
    """Reset the persistent Python kernel for a notebook.

    Args:
        notebook_id: Notebook id.
    """
    try:
        # ensure notebook exists
        get_engine().get_notebook(notebook_id)
        return _ok(get_engine().reset_kernel(notebook_id))
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def markdown_render(
    source: str | None = None,
    notebook_id: str | None = None,
    cell_id: str | None = None,
) -> dict[str, Any]:
    """Render markdown to HTML. Pass source directly, or notebook_id+cell_id.

    Args:
        source: Raw markdown text.
        notebook_id: Optional notebook containing a markdown cell.
        cell_id: Optional markdown cell id (requires notebook_id).
    """
    try:
        eng = get_engine()
        if notebook_id and cell_id:
            return _ok(eng.render_cell_markdown(notebook_id, cell_id))
        if source is None:
            raise NotebookError("provide source or notebook_id+cell_id")
        return _ok(eng.render_markdown_source(source))
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def attachment_add(
    notebook_id: str,
    name: str,
    text_content: str | None = None,
    content_base64: str | None = None,
    mime_type: str = "application/octet-stream",
    cell_id: str | None = None,
) -> dict[str, Any]:
    """Attach a file to a notebook (text or base64).

    Args:
        notebook_id: Notebook id.
        name: Filename (basename only).
        text_content: UTF-8 text body (optional).
        content_base64: Base64-encoded binary body (optional).
        mime_type: MIME type.
        cell_id: Optional cell to link the attachment to.
    """
    return _call(
        get_engine().add_attachment,
        notebook_id=notebook_id,
        name=name,
        text_content=text_content,
        content_base64=content_base64,
        mime_type=mime_type,
        cell_id=cell_id,
    )


@mcp.tool
def attachment_list(notebook_id: str) -> dict[str, Any]:
    """List attachments on a notebook.

    Args:
        notebook_id: Notebook id.
    """
    try:
        items = get_engine().list_attachments(notebook_id)
        return _ok({"notebook_id": notebook_id, "attachments": items, "count": len(items)})
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def attachment_remove(notebook_id: str, attachment_id: str) -> dict[str, Any]:
    """Remove an attachment from a notebook.

    Args:
        notebook_id: Notebook id.
        attachment_id: Attachment id.
    """
    return _call(
        get_engine().remove_attachment,
        notebook_id=notebook_id,
        attachment_id=attachment_id,
    )


@mcp.tool
def widget_create(
    notebook_id: str,
    widget_type: str,
    label: str,
    value: Any = None,
    options: list[Any] | None = None,
    min_value: float | None = None,
    max_value: float | None = None,
    step: float | None = None,
    cell_id: str | None = None,
) -> dict[str, Any]:
    """Create an interactive widget (slider, text, dropdown, checkbox, button, progress).

    Args:
        notebook_id: Notebook id.
        widget_type: One of slider|text|dropdown|checkbox|button|progress.
        label: Display label.
        value: Initial value.
        options: Options for dropdown widgets.
        min_value: Slider minimum.
        max_value: Slider maximum.
        step: Slider step.
        cell_id: Optional cell to bind the widget to.
    """
    return _call(
        get_engine().create_widget,
        notebook_id=notebook_id,
        widget_type=widget_type,
        label=label,
        value=value,
        options=options,
        min_value=min_value,
        max_value=max_value,
        step=step,
        cell_id=cell_id,
    )


@mcp.tool
def widget_update(
    notebook_id: str,
    widget_id: str,
    value: Any = None,
    label: str | None = None,
    options: list[Any] | None = None,
) -> dict[str, Any]:
    """Update a widget value or metadata.

    Args:
        notebook_id: Notebook id.
        widget_id: Widget id.
        value: New value.
        label: New label.
        options: New dropdown options.
    """
    return _call(
        get_engine().update_widget,
        notebook_id=notebook_id,
        widget_id=widget_id,
        value=value,
        label=label,
        options=options,
    )


@mcp.tool
def widget_list(notebook_id: str) -> dict[str, Any]:
    """List widgets on a notebook.

    Args:
        notebook_id: Notebook id.
    """
    try:
        items = get_engine().list_widgets(notebook_id)
        return _ok({"notebook_id": notebook_id, "widgets": items, "count": len(items)})
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def widget_delete(notebook_id: str, widget_id: str) -> dict[str, Any]:
    """Delete a widget.

    Args:
        notebook_id: Notebook id.
        widget_id: Widget id.
    """
    return _call(
        get_engine().delete_widget,
        notebook_id=notebook_id,
        widget_id=widget_id,
    )


@mcp.tool
def notebook_export(notebook_id: str, format: str = "ipynb") -> dict[str, Any]:
    """Export a notebook as ipynb, native json, or markdown.

    Args:
        notebook_id: Notebook id.
        format: ipynb | json | markdown.
    """
    return _call(get_engine().export_notebook, notebook_id=notebook_id, format=format)


@mcp.tool
def notebook_import(
    content: str,
    title: str | None = None,
    format: str = "auto",
) -> dict[str, Any]:
    """Import a notebook from ipynb/native JSON string.

    Args:
        content: JSON string of ipynb or native notebook document.
        title: Optional override title.
        format: auto | ipynb | json.
    """
    try:
        parsed: Any
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = content
        return _ok(
            get_engine().import_notebook(content=parsed, title=title, format=format)
        )
    except NotebookError as exc:
        return _err(exc)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


@mcp.tool
def notebook_save_session(
    notebook_id: str,
    path: str | None = None,
) -> dict[str, Any]:
    """Save notebook + kernel variable snapshot to a session file.

    Args:
        notebook_id: Notebook id.
        path: Optional destination path.
    """
    return _call(get_engine().save_session, notebook_id=notebook_id, path=path)


@mcp.tool
def notebook_load_session(path: str) -> dict[str, Any]:
    """Load a previously saved session file into the notebook store.

    Args:
        path: Path to a .session.json file.
    """
    return _call(get_engine().load_session, path=path)


@mcp.tool
def render_claude_notebook_mcp_entry(profile: str = "repo") -> dict[str, Any]:
    """Return a ready-to-paste `.mcp.json` / Claude Desktop entry for this server.

    Args:
        profile: 'repo' (in-tree path) or 'claude-desktop' (absolute-friendly uv run).
    """
    if profile not in {"repo", "claude-desktop", "template"}:
        return _err(ValueError("profile must be 'repo', 'claude-desktop', or 'template'"))

    script = "./mcp-servers/claude-notebook-mcp/claude_notebook_mcp/server.py"
    if profile == "template":
        script = (
            "${REVVEL_STANDARDS_PATH}/mcp-servers/claude-notebook-mcp/"
            "claude_notebook_mcp/server.py"
        )
    elif profile == "claude-desktop":
        # Claude Desktop resolves cwd poorly; prefer module form after install.
        return _ok(
            {
                "mcpServers": {
                    "claude-notebook-mcp": {
                        "command": "python3",
                        "args": ["-m", "claude_notebook_mcp"],
                        "env": {
                            "CLAUDE_NOTEBOOK_DIR": "${CLAUDE_NOTEBOOK_DIR:-${HOME}/.claude-notebook-mcp/notebooks}"
                        },
                    }
                },
                "claude_desktop_config_paths": {
                    "macOS": "~/Library/Application Support/Claude/claude_desktop_config.json",
                    "Windows": "%APPDATA%/Claude/claude_desktop_config.json",
                    "Linux": "~/.config/Claude/claude_desktop_config.json",
                },
                "install": "cd mcp-servers/claude-notebook-mcp && pip install -e .",
                "inspired_by": "https://github.com/jacob-bd/gemini-notebook-mcp-cli",
            }
        )

    return _ok(
        {
            "mcpServers": {
                "claude-notebook-mcp": {
                    "command": "uv",
                    "args": ["run", "python", script],
                    "env": {
                        "CLAUDE_NOTEBOOK_DIR": "${CLAUDE_NOTEBOOK_DIR:-.claude-notebooks}"
                    },
                }
            }
        }
    )


@mcp.tool
def list_server_tools() -> dict[str, Any]:
    """List every tool exposed by this MCP server (for purchase validation)."""
    tools = getattr(mcp, "_tools", getattr(mcp, "tools", {}))
    names = sorted(tools.keys() if isinstance(tools, dict) else list(tools))
    return _ok(
        {
            "server": "claude-notebook-mcp",
            "tools": names,
            "count": len(names),
            "cell_types": sorted(CELL_TYPES),
            "widget_types": sorted(VALID_WIDGET_TYPES),
        }
    )


# ── Resources ────────────────────────────────────────────────────────────────


@mcp.resource("data://claude-notebook/env-schema")
def env_schema() -> dict[str, Any]:
    """Environment variables for Claude Notebook MCP."""
    return {
        "optional": {
            "CLAUDE_NOTEBOOK_DIR": (
                "Directory for notebook JSON files "
                "(default ~/.claude-notebook-mcp/notebooks)"
            )
        },
        "notes": [
            "No API keys required. Fully offline.",
            "Python cells share a persistent in-process kernel per notebook.",
            "JavaScript cells require a local `node` binary.",
            "Inspired by https://github.com/jacob-bd/gemini-notebook-mcp-cli",
        ],
    }


@mcp.resource("data://claude-notebook/architecture")
def architecture_summary() -> dict[str, Any]:
    """Architecture binding for WR #17733."""
    return {
        "wr": "#17733",
        "product": "claude-notebook-mcp",
        "inspired_by": "https://github.com/jacob-bd/gemini-notebook-mcp-cli",
        "capabilities": [
            "notebook CRUD",
            "cell management (code/markdown/raw)",
            "python persistent kernel",
            "javascript execution via node",
            "markdown rendering",
            "file attachments",
            "interactive widgets",
            "ipynb export/import",
            "session save/load",
            "Claude Desktop config snippet",
        ],
        "transport": "stdio",
        "auth": "none (local filesystem)",
    }


def main() -> None:
    """Entry point for console_script / python -m."""
    mcp.run()


if __name__ == "__main__":
    main()
