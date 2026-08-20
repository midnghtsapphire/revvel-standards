#!/usr/bin/env python3
"""One working example call for Claude Notebook MCP (purchase validation).

Run from repo root:

    PYTHONPATH=mcp-servers/claude-notebook-mcp python3 \\
      mcp-servers/claude-notebook-mcp/examples/example_call.py
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from claude_notebook_mcp.engine import NotebookEngine, demo_workspace  # noqa: E402
from claude_notebook_mcp import server as srv  # noqa: E402
from claude_notebook_mcp.server import mcp  # noqa: E402


def main() -> int:
    tools = getattr(mcp, "_tools", getattr(mcp, "tools", {}))
    names = sorted(tools.keys() if isinstance(tools, dict) else list(tools))
    print("== list_server_tools ==")
    print(json.dumps({"tools": names, "count": len(names)}, indent=2))

    tmp = tempfile.mkdtemp(prefix="claude-nb-example-")
    os.environ["CLAUDE_NOTEBOOK_DIR"] = tmp
    srv._ENGINE = NotebookEngine(root=tmp)

    print("\n== demo_workspace (create + execute + attach + widget + export) ==")
    result = demo_workspace(root=tmp)
    print(json.dumps(result, indent=2, default=str)[:2000])

    print("\n== call each MCP tool once (dependency order) ==")
    t = tools
    results: dict[str, object] = {}
    failed: list[str] = []

    def run(name: str, fn) -> object:
        try:
            out = fn()
            ok = not (isinstance(out, dict) and out.get("error"))
            status = "OK" if ok else "ERR"
            if not ok:
                failed.append(name)
            print(f"  [{status}] {name}: {json.dumps(out, default=str)[:160]}")
            results[name] = out
            return out
        except Exception as exc:  # noqa: BLE001
            failed.append(name)
            print(f"  [EXC] {name}: {exc}")
            return None

    run("list_server_tools", lambda: t["list_server_tools"]())
    run("notebook_health", lambda: t["notebook_health"]())
    run(
        "render_claude_notebook_mcp_entry",
        lambda: t["render_claude_notebook_mcp_entry"](profile="repo"),
    )

    created = run(
        "notebook_create", lambda: t["notebook_create"](title="Purchase Validation")
    )
    assert isinstance(created, dict)
    nb_id = created["id"]

    run("notebook_list", lambda: t["notebook_list"]())
    run("notebook_get", lambda: t["notebook_get"](notebook_id=nb_id))
    run(
        "notebook_rename",
        lambda: t["notebook_rename"](notebook_id=nb_id, title="Renamed Validation"),
    )

    code = run(
        "cell_add",
        lambda: t["cell_add"](
            notebook_id=nb_id,
            cell_type="code",
            source="a = 21\nprint('double', a * 2)\na * 2",
        ),
    )
    assert isinstance(code, dict)
    cell_id = code["cell"]["id"]

    md = run(
        "cell_add",
        lambda: t["cell_add"](
            notebook_id=nb_id,
            cell_type="markdown",
            source="# Notes\n\n**bold** and `code`",
        ),
    )
    assert isinstance(md, dict)
    md_id = md["cell"]["id"]

    # Extra cell types (tool already exercised above as cell_add)
    t["cell_add"](notebook_id=nb_id, cell_type="raw", source="raw line")

    run("cell_list", lambda: t["cell_list"](notebook_id=nb_id))
    run("cell_get", lambda: t["cell_get"](notebook_id=nb_id, cell_id=cell_id))
    run(
        "cell_update",
        lambda: t["cell_update"](
            notebook_id=nb_id, cell_id=cell_id, source="a = 21\na * 2"
        ),
    )
    run("cell_execute", lambda: t["cell_execute"](notebook_id=nb_id, cell_id=cell_id))
    run("cell_execute_all", lambda: t["cell_execute_all"](notebook_id=nb_id))
    run("kernel_variables", lambda: t["kernel_variables"](notebook_id=nb_id))
    run("kernel_reset", lambda: t["kernel_reset"](notebook_id=nb_id))
    run(
        "markdown_render",
        lambda: t["markdown_render"](notebook_id=nb_id, cell_id=md_id),
    )

    att = run(
        "attachment_add",
        lambda: t["attachment_add"](
            notebook_id=nb_id, name="f.txt", text_content="x"
        ),
    )
    assert isinstance(att, dict)
    att_id = att["id"]
    run("attachment_list", lambda: t["attachment_list"](notebook_id=nb_id))

    widget = run(
        "widget_create",
        lambda: t["widget_create"](
            notebook_id=nb_id, widget_type="text", label="name", value="claude"
        ),
    )
    assert isinstance(widget, dict)
    wid = widget["id"]
    run("widget_list", lambda: t["widget_list"](notebook_id=nb_id))
    run(
        "widget_update",
        lambda: t["widget_update"](notebook_id=nb_id, widget_id=wid, value="updated"),
    )

    exported = run(
        "notebook_export",
        lambda: t["notebook_export"](notebook_id=nb_id, format="json"),
    )
    assert isinstance(exported, dict)
    content = json.dumps(exported.get("content") or {})
    run("notebook_import", lambda: t["notebook_import"](content=content))

    session = run(
        "notebook_save_session",
        lambda: t["notebook_save_session"](notebook_id=nb_id),
    )
    assert isinstance(session, dict)
    spath = session["path"]
    run("notebook_load_session", lambda: t["notebook_load_session"](path=spath))

    run(
        "attachment_remove",
        lambda: t["attachment_remove"](notebook_id=nb_id, attachment_id=att_id),
    )
    run(
        "widget_delete",
        lambda: t["widget_delete"](notebook_id=nb_id, widget_id=wid),
    )
    run("cell_delete", lambda: t["cell_delete"](notebook_id=nb_id, cell_id=md_id))
    run("notebook_delete", lambda: t["notebook_delete"](notebook_id=nb_id))

    exercised = set(results)
    missing = sorted(set(names) - exercised)
    if missing:
        print("\nTools not exercised:", missing)
        failed.extend(missing)

    if failed:
        print("\nFAILED:", failed)
        return 1
    print(f"\nAll {len(names)} tool calls succeeded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
