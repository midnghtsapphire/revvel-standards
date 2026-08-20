"""Local notebook engine for Claude Notebook MCP.

Provides persistent notebook + cell storage, Python/JS code execution with
per-notebook kernels, markdown metadata, file attachments, and simple
interactive widgets. Storage is JSON under CLAUDE_NOTEBOOK_DIR (default
~/.claude-notebook-mcp/notebooks).
"""

from __future__ import annotations

import ast
import base64
import hashlib
import html
import json
import os
import re
import subprocess
import tempfile
import time
import uuid
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

__all__ = [
    "CELL_TYPES",
    "NotebookEngine",
    "NotebookError",
    "VALID_WIDGET_TYPES",
]

CELL_TYPES = frozenset({"code", "markdown", "raw"})
VALID_WIDGET_TYPES = frozenset(
    {"slider", "text", "dropdown", "checkbox", "button", "progress"}
)
NBFORMAT_VERSION = 4
DEFAULT_LANGUAGE = "python"


class NotebookError(ValueError):
    """Raised for validation or not-found errors that tools should surface."""


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _slug(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", text.strip().lower()).strip("-")
    return cleaned[:64] or "notebook"


def _new_id(prefix: str = "nb") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _safe_filename(name: str) -> str:
    base = Path(name).name
    if not base or base in {".", ".."} or "/" in base or "\\" in base:
        raise NotebookError(f"invalid attachment name: {name!r}")
    if ".." in base:
        raise NotebookError(f"invalid attachment name: {name!r}")
    return base


@dataclass
class CellOutput:
    output_type: str  # stream | execute_result | error | display_data | widget
    text: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    ename: str = ""
    evalue: str = ""
    traceback: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Cell:
    id: str
    cell_type: str
    source: str = ""
    language: str = DEFAULT_LANGUAGE
    outputs: list[CellOutput] = field(default_factory=list)
    execution_count: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    attachments: list[str] = field(default_factory=list)
    widgets: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "cell_type": self.cell_type,
            "source": self.source,
            "language": self.language,
            "outputs": [o.to_dict() for o in self.outputs],
            "execution_count": self.execution_count,
            "metadata": self.metadata,
            "attachments": list(self.attachments),
            "widgets": list(self.widgets),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Cell:
        cell_type = str(data.get("cell_type", "code"))
        if cell_type not in CELL_TYPES:
            raise NotebookError(
                f"unsupported cell_type {cell_type!r}; expected one of {sorted(CELL_TYPES)}"
            )
        outputs = []
        for raw in data.get("outputs") or []:
            if not isinstance(raw, dict):
                continue
            outputs.append(
                CellOutput(
                    output_type=str(raw.get("output_type", "stream")),
                    text=str(raw.get("text", "")),
                    data=dict(raw.get("data") or {}),
                    ename=str(raw.get("ename", "")),
                    evalue=str(raw.get("evalue", "")),
                    traceback=list(raw.get("traceback") or []),
                )
            )
        return cls(
            id=str(data.get("id") or _new_id("cell")),
            cell_type=cell_type,
            source=str(data.get("source", "")),
            language=str(data.get("language") or DEFAULT_LANGUAGE),
            outputs=outputs,
            execution_count=data.get("execution_count"),
            metadata=dict(data.get("metadata") or {}),
            attachments=list(data.get("attachments") or []),
            widgets=list(data.get("widgets") or []),
        )


@dataclass
class Widget:
    id: str
    widget_type: str
    label: str
    value: Any = None
    options: list[Any] = field(default_factory=list)
    min: float | None = None
    max: float | None = None
    step: float | None = None
    cell_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Widget:
        wtype = str(data.get("widget_type", "text"))
        if wtype not in VALID_WIDGET_TYPES:
            raise NotebookError(
                f"unsupported widget_type {wtype!r}; expected one of {sorted(VALID_WIDGET_TYPES)}"
            )
        return cls(
            id=str(data.get("id") or _new_id("w")),
            widget_type=wtype,
            label=str(data.get("label", "")),
            value=data.get("value"),
            options=list(data.get("options") or []),
            min=data.get("min"),
            max=data.get("max"),
            step=data.get("step"),
            cell_id=data.get("cell_id"),
            metadata=dict(data.get("metadata") or {}),
        )


@dataclass
class Attachment:
    id: str
    name: str
    mime_type: str
    size: int
    sha256: str
    path: str
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Attachment:
        return cls(
            id=str(data.get("id") or _new_id("att")),
            name=str(data.get("name", "file")),
            mime_type=str(data.get("mime_type", "application/octet-stream")),
            size=int(data.get("size") or 0),
            sha256=str(data.get("sha256", "")),
            path=str(data.get("path", "")),
            created_at=str(data.get("created_at") or _now_iso()),
        )


@dataclass
class Notebook:
    id: str
    title: str
    created_at: str
    updated_at: str
    cells: list[Cell] = field(default_factory=list)
    attachments: dict[str, Attachment] = field(default_factory=dict)
    widgets: dict[str, Widget] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    kernel_language: str = DEFAULT_LANGUAGE
    execution_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "cells": [c.to_dict() for c in self.cells],
            "attachments": {k: v.to_dict() for k, v in self.attachments.items()},
            "widgets": {k: v.to_dict() for k, v in self.widgets.items()},
            "metadata": self.metadata,
            "kernel_language": self.kernel_language,
            "execution_count": self.execution_count,
            "nbformat": NBFORMAT_VERSION,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Notebook:
        if not isinstance(data, dict):
            raise NotebookError("notebook payload must be an object")
        cells = [Cell.from_dict(c) for c in (data.get("cells") or [])]
        attachments = {
            k: Attachment.from_dict(v)
            for k, v in (data.get("attachments") or {}).items()
        }
        widgets = {
            k: Widget.from_dict(v) for k, v in (data.get("widgets") or {}).items()
        }
        return cls(
            id=str(data.get("id") or _new_id("nb")),
            title=str(data.get("title") or "Untitled"),
            created_at=str(data.get("created_at") or _now_iso()),
            updated_at=str(data.get("updated_at") or _now_iso()),
            cells=cells,
            attachments=attachments,
            widgets=widgets,
            metadata=dict(data.get("metadata") or {}),
            kernel_language=str(data.get("kernel_language") or DEFAULT_LANGUAGE),
            execution_count=int(data.get("execution_count") or 0),
        )


class PythonKernel:
    """Persistent Python exec namespace for one notebook."""

    def __init__(self) -> None:
        self.globals: dict[str, Any] = {"__name__": "__notebook__"}

    def execute(self, source: str) -> list[CellOutput]:
        outputs: list[CellOutput] = []
        stdout_chunks: list[str] = []

        def _capture_print(*args: Any, **kwargs: Any) -> None:
            sep = kwargs.get("sep", " ")
            end = kwargs.get("end", "\n")
            stdout_chunks.append(sep.join(str(a) for a in args) + end)

        local_globals = self.globals
        local_globals["print"] = _capture_print

        try:
            tree = ast.parse(source, mode="exec")
            body = list(tree.body)
            if body and isinstance(body[-1], ast.Expr):
                # exec all but last, eval last for display
                prefix = body[:-1]
                last = body[-1]
                if prefix:
                    mod = ast.Module(body=prefix, type_ignores=[])
                    ast.fix_missing_locations(mod)
                    exec(compile(mod, "<cell>", "exec"), local_globals, local_globals)
                expr = ast.Expression(body=last.value)
                ast.fix_missing_locations(expr)
                value = eval(
                    compile(expr, "<cell>", "eval"), local_globals, local_globals
                )
                if value is not None:
                    outputs.append(
                        CellOutput(
                            output_type="execute_result",
                            text=repr(value),
                            data={"text/plain": repr(value)},
                        )
                    )
            else:
                exec(compile(source, "<cell>", "exec"), local_globals, local_globals)
        except SyntaxError as exc:
            outputs.append(
                CellOutput(
                    output_type="error",
                    ename="SyntaxError",
                    evalue=str(exc.msg),
                    traceback=[
                        f"  File \"<cell>\", line {exc.lineno}\n",
                        f"SyntaxError: {exc.msg}",
                    ],
                    text=f"SyntaxError: {exc.msg}",
                )
            )
        except Exception as exc:  # noqa: BLE001 — surface cell errors as outputs
            outputs.append(
                CellOutput(
                    output_type="error",
                    ename=type(exc).__name__,
                    evalue=str(exc),
                    traceback=[f"{type(exc).__name__}: {exc}"],
                    text=f"{type(exc).__name__}: {exc}",
                )
            )
        finally:
            # restore print so subsequent cells still capture
            local_globals["print"] = _capture_print

        if stdout_chunks:
            outputs.insert(
                0,
                CellOutput(
                    output_type="stream",
                    text="".join(stdout_chunks),
                    data={"name": "stdout"},
                ),
            )
        return outputs

    def variables(self) -> dict[str, str]:
        skip = {"__name__", "print"}
        out: dict[str, str] = {}
        for key, val in self.globals.items():
            if key.startswith("_") or key in skip:
                continue
            try:
                out[key] = type(val).__name__
            except Exception:  # noqa: BLE001
                out[key] = "unknown"
        return out


class JsKernel:
    """Ephemeral Node.js evaluation (no cross-cell state unless notebook re-runs)."""

    def execute(self, source: str, timeout_s: float = 10.0) -> list[CellOutput]:
        script = (
            "const util = require('util');\n"
            "let __result;\n"
            "try {\n"
            f"{source}\n"
            "} catch (e) {\n"
            "  console.error(String(e && e.stack || e));\n"
            "  process.exit(1);\n"
            "}\n"
        )
        try:
            proc = subprocess.run(
                ["node", "-e", script],
                capture_output=True,
                text=True,
                timeout=timeout_s,
                check=False,
            )
        except FileNotFoundError:
            return [
                CellOutput(
                    output_type="error",
                    ename="RuntimeError",
                    evalue="node executable not found",
                    text="RuntimeError: node executable not found",
                )
            ]
        except subprocess.TimeoutExpired:
            return [
                CellOutput(
                    output_type="error",
                    ename="TimeoutError",
                    evalue=f"JS cell exceeded {timeout_s}s",
                    text=f"TimeoutError: JS cell exceeded {timeout_s}s",
                )
            ]
        outputs: list[CellOutput] = []
        if proc.stdout:
            outputs.append(
                CellOutput(
                    output_type="stream",
                    text=proc.stdout,
                    data={"name": "stdout"},
                )
            )
        if proc.returncode != 0:
            outputs.append(
                CellOutput(
                    output_type="error",
                    ename="JavaScriptError",
                    evalue=(proc.stderr or "non-zero exit").strip(),
                    text=(proc.stderr or proc.stdout or "JavaScript error").strip(),
                    traceback=[proc.stderr.strip()] if proc.stderr else [],
                )
            )
        elif proc.stderr:
            outputs.append(
                CellOutput(
                    output_type="stream",
                    text=proc.stderr,
                    data={"name": "stderr"},
                )
            )
        return outputs


def render_markdown(source: str) -> dict[str, Any]:
    """Lightweight markdown → HTML (headings, bold, italic, code, lists, links)."""

    lines = source.splitlines()
    html_parts: list[str] = []
    in_code = False
    code_buf: list[str] = []
    in_ul = False

    def close_ul() -> None:
        nonlocal in_ul
        if in_ul:
            html_parts.append("</ul>")
            in_ul = False

    for line in lines:
        if line.strip().startswith("```"):
            if in_code:
                html_parts.append(
                    "<pre><code>"
                    + html.escape("\n".join(code_buf))
                    + "</code></pre>"
                )
                code_buf = []
                in_code = False
            else:
                close_ul()
                in_code = True
            continue
        if in_code:
            code_buf.append(line)
            continue

        if re.match(r"^#{1,6}\s+", line):
            close_ul()
            level = len(line) - len(line.lstrip("#"))
            level = min(max(level, 1), 6)
            text = line.lstrip("#").strip()
            html_parts.append(f"<h{level}>{_inline_md(text)}</h{level}>")
            continue

        if re.match(r"^[-*]\s+", line):
            if not in_ul:
                html_parts.append("<ul>")
                in_ul = True
            html_parts.append(f"<li>{_inline_md(line[2:].strip())}</li>")
            continue

        close_ul()
        if not line.strip():
            html_parts.append("")
            continue
        html_parts.append(f"<p>{_inline_md(line)}</p>")

    if in_code:
        html_parts.append(
            "<pre><code>" + html.escape("\n".join(code_buf)) + "</code></pre>"
        )
    close_ul()
    rendered = "\n".join(html_parts)
    return {
        "format": "html",
        "html": rendered,
        "plain": source,
        "char_count": len(source),
        "line_count": len(lines),
    }


def _inline_md(text: str) -> str:
    """Escape HTML then apply a small set of inline markdown transforms."""
    escaped = html.escape(text)

    def _link(match: re.Match[str]) -> str:
        label = match.group(1)
        href = match.group(2)
        return f'<a href="{href}">{label}</a>'

    escaped = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", _link, escaped)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", escaped)
    return escaped


class NotebookEngine:
    """Filesystem-backed notebook store with in-process kernels."""

    def __init__(self, root: str | Path | None = None) -> None:
        env_root = os.environ.get("CLAUDE_NOTEBOOK_DIR", "").strip()
        if root is not None:
            self.root = Path(root).expanduser().resolve()
        elif env_root:
            self.root = Path(env_root).expanduser().resolve()
        else:
            self.root = (Path.home() / ".claude-notebook-mcp" / "notebooks").resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self._kernels: dict[str, PythonKernel] = {}
        self._js = JsKernel()

    # ── persistence ──────────────────────────────────────────────────────

    def _path_for(self, notebook_id: str) -> Path:
        safe = re.sub(r"[^a-zA-Z0-9._-]", "_", notebook_id)
        return self.root / f"{safe}.json"

    def _attachments_dir(self, notebook_id: str) -> Path:
        d = self.root / f"{re.sub(r'[^a-zA-Z0-9._-]', '_', notebook_id)}_files"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _load(self, notebook_id: str) -> Notebook:
        path = self._path_for(notebook_id)
        if not path.is_file():
            raise NotebookError(f"notebook not found: {notebook_id}")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise NotebookError(f"corrupt notebook file: {exc}") from exc
        return Notebook.from_dict(data)

    def _save(self, nb: Notebook) -> Notebook:
        nb.updated_at = _now_iso()
        path = self._path_for(nb.id)
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(
            json.dumps(nb.to_dict(), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        tmp.replace(path)
        return nb

    def _kernel(self, notebook_id: str) -> PythonKernel:
        if notebook_id not in self._kernels:
            self._kernels[notebook_id] = PythonKernel()
        return self._kernels[notebook_id]

    def reset_kernel(self, notebook_id: str) -> dict[str, Any]:
        self._kernels[notebook_id] = PythonKernel()
        return {"notebook_id": notebook_id, "kernel_reset": True, "language": "python"}

    # ── notebook CRUD ────────────────────────────────────────────────────

    def list_notebooks(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for path in sorted(self.root.glob("*.json")):
            # Skip session snapshots and write temps (nb_xxx.session.json, *.tmp).
            name = path.name
            if name.endswith(".session.json") or name.endswith(".json.tmp"):
                continue
            if ".session." in name:
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if not isinstance(data, dict) or "cells" not in data:
                continue
            items.append(
                {
                    "id": data.get("id", path.stem),
                    "title": data.get("title", path.stem),
                    "updated_at": data.get("updated_at"),
                    "cell_count": len(data.get("cells") or []),
                    "kernel_language": data.get("kernel_language", DEFAULT_LANGUAGE),
                }
            )
        return items

    def create_notebook(
        self,
        title: str = "Untitled",
        kernel_language: str = DEFAULT_LANGUAGE,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        nb_id = _new_id("nb")
        now = _now_iso()
        nb = Notebook(
            id=nb_id,
            title=title or "Untitled",
            created_at=now,
            updated_at=now,
            kernel_language=kernel_language or DEFAULT_LANGUAGE,
            metadata=dict(metadata or {}),
        )
        # seed with a welcome markdown cell
        nb.cells.append(
            Cell(
                id=_new_id("cell"),
                cell_type="markdown",
                language="markdown",
                source=f"# {nb.title}\n\nCreated for Claude Notebook MCP.",
            )
        )
        self._save(nb)
        return nb.to_dict()

    def get_notebook(self, notebook_id: str) -> dict[str, Any]:
        return self._load(notebook_id).to_dict()

    def delete_notebook(self, notebook_id: str) -> dict[str, Any]:
        path = self._path_for(notebook_id)
        if not path.is_file():
            raise NotebookError(f"notebook not found: {notebook_id}")
        path.unlink()
        att_dir = self._attachments_dir(notebook_id)
        if att_dir.is_dir():
            for child in att_dir.iterdir():
                if child.is_file():
                    child.unlink()
            try:
                att_dir.rmdir()
            except OSError:
                pass
        self._kernels.pop(notebook_id, None)
        return {"deleted": True, "id": notebook_id}

    def rename_notebook(self, notebook_id: str, title: str) -> dict[str, Any]:
        if not title or not str(title).strip():
            raise NotebookError("title must be non-empty")
        nb = self._load(notebook_id)
        nb.title = str(title).strip()
        self._save(nb)
        return {"id": nb.id, "title": nb.title, "updated_at": nb.updated_at}

    # ── cells ────────────────────────────────────────────────────────────

    def _find_cell(self, nb: Notebook, cell_id: str) -> tuple[int, Cell]:
        for idx, cell in enumerate(nb.cells):
            if cell.id == cell_id:
                return idx, cell
        raise NotebookError(f"cell not found: {cell_id}")

    def list_cells(self, notebook_id: str) -> list[dict[str, Any]]:
        nb = self._load(notebook_id)
        return [
            {
                "id": c.id,
                "index": i,
                "cell_type": c.cell_type,
                "language": c.language,
                "source_preview": (c.source[:120] + ("…" if len(c.source) > 120 else "")),
                "execution_count": c.execution_count,
                "output_count": len(c.outputs),
            }
            for i, c in enumerate(nb.cells)
        ]

    def add_cell(
        self,
        notebook_id: str,
        cell_type: str = "code",
        source: str = "",
        language: str | None = None,
        index: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if cell_type not in CELL_TYPES:
            raise NotebookError(
                f"unsupported cell_type {cell_type!r}; expected one of {sorted(CELL_TYPES)}"
            )
        nb = self._load(notebook_id)
        cell = Cell(
            id=_new_id("cell"),
            cell_type=cell_type,
            source=source or "",
            language=language or (nb.kernel_language if cell_type == "code" else "markdown"),
            metadata=dict(metadata or {}),
        )
        if index is None or index >= len(nb.cells):
            nb.cells.append(cell)
            idx = len(nb.cells) - 1
        else:
            idx = max(0, int(index))
            nb.cells.insert(idx, cell)
        self._save(nb)
        return {"index": idx, "cell": cell.to_dict()}

    def update_cell(
        self,
        notebook_id: str,
        cell_id: str,
        source: str | None = None,
        cell_type: str | None = None,
        language: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        _, cell = self._find_cell(nb, cell_id)
        if cell_type is not None:
            if cell_type not in CELL_TYPES:
                raise NotebookError(
                    f"unsupported cell_type {cell_type!r}; expected one of {sorted(CELL_TYPES)}"
                )
            cell.cell_type = cell_type
        if source is not None:
            cell.source = source
        if language is not None:
            cell.language = language
        if metadata is not None:
            cell.metadata.update(metadata)
        self._save(nb)
        return cell.to_dict()

    def delete_cell(self, notebook_id: str, cell_id: str) -> dict[str, Any]:
        nb = self._load(notebook_id)
        idx, _ = self._find_cell(nb, cell_id)
        removed = nb.cells.pop(idx)
        self._save(nb)
        return {"deleted": True, "id": removed.id, "index": idx}

    def get_cell(self, notebook_id: str, cell_id: str) -> dict[str, Any]:
        nb = self._load(notebook_id)
        idx, cell = self._find_cell(nb, cell_id)
        payload = cell.to_dict()
        payload["index"] = idx
        return payload

    # ── execution ────────────────────────────────────────────────────────

    def execute_cell(
        self,
        notebook_id: str,
        cell_id: str,
        timeout_s: float = 10.0,
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        _, cell = self._find_cell(nb, cell_id)
        if cell.cell_type == "markdown":
            rendered = render_markdown(cell.source)
            cell.outputs = [
                CellOutput(
                    output_type="display_data",
                    text=rendered["plain"],
                    data={"text/html": rendered["html"], "text/plain": rendered["plain"]},
                )
            ]
            self._save(nb)
            return {
                "cell_id": cell.id,
                "cell_type": cell.cell_type,
                "outputs": [o.to_dict() for o in cell.outputs],
                "rendered": rendered,
            }
        if cell.cell_type == "raw":
            cell.outputs = [
                CellOutput(output_type="stream", text=cell.source, data={"name": "raw"})
            ]
            self._save(nb)
            return {
                "cell_id": cell.id,
                "cell_type": cell.cell_type,
                "outputs": [o.to_dict() for o in cell.outputs],
            }

        lang = (cell.language or nb.kernel_language or DEFAULT_LANGUAGE).lower()
        nb.execution_count += 1
        cell.execution_count = nb.execution_count
        if lang in {"javascript", "js", "node"}:
            outputs = self._js.execute(cell.source, timeout_s=timeout_s)
        else:
            outputs = self._kernel(notebook_id).execute(cell.source)
        cell.outputs = outputs
        self._save(nb)
        return {
            "cell_id": cell.id,
            "cell_type": cell.cell_type,
            "language": lang,
            "execution_count": cell.execution_count,
            "outputs": [o.to_dict() for o in outputs],
            "variables": self._kernel(notebook_id).variables()
            if lang not in {"javascript", "js", "node"}
            else {},
        }

    def execute_all(
        self,
        notebook_id: str,
        stop_on_error: bool = True,
        timeout_s: float = 10.0,
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        results: list[dict[str, Any]] = []
        for cell in list(nb.cells):
            if cell.cell_type not in {"code", "markdown", "raw"}:
                continue
            result = self.execute_cell(notebook_id, cell.id, timeout_s=timeout_s)
            results.append(result)
            if stop_on_error and any(
                o.get("output_type") == "error" for o in result.get("outputs") or []
            ):
                break
        return {
            "notebook_id": notebook_id,
            "executed": len(results),
            "results": results,
        }

    def kernel_variables(self, notebook_id: str) -> dict[str, Any]:
        # ensure notebook exists
        self._load(notebook_id)
        return {
            "notebook_id": notebook_id,
            "variables": self._kernel(notebook_id).variables(),
        }

    # ── markdown ─────────────────────────────────────────────────────────

    def render_cell_markdown(self, notebook_id: str, cell_id: str) -> dict[str, Any]:
        nb = self._load(notebook_id)
        _, cell = self._find_cell(nb, cell_id)
        if cell.cell_type != "markdown":
            raise NotebookError(
                f"cell {cell_id} is {cell.cell_type!r}, expected 'markdown'"
            )
        rendered = render_markdown(cell.source)
        return {"cell_id": cell.id, **rendered}

    def render_markdown_source(self, source: str) -> dict[str, Any]:
        return render_markdown(source or "")

    # ── attachments ──────────────────────────────────────────────────────

    def add_attachment(
        self,
        notebook_id: str,
        name: str,
        content_base64: str | None = None,
        text_content: str | None = None,
        mime_type: str = "application/octet-stream",
        cell_id: str | None = None,
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        safe_name = _safe_filename(name)
        if content_base64:
            try:
                raw = base64.b64decode(content_base64, validate=True)
            except Exception as exc:  # noqa: BLE001
                raise NotebookError(f"invalid base64 content: {exc}") from exc
        elif text_content is not None:
            raw = text_content.encode("utf-8")
            if mime_type == "application/octet-stream":
                mime_type = "text/plain"
        else:
            raise NotebookError("provide content_base64 or text_content")

        att_id = _new_id("att")
        dest = self._attachments_dir(notebook_id) / f"{att_id}_{safe_name}"
        dest.write_bytes(raw)
        digest = hashlib.sha256(raw).hexdigest()
        att = Attachment(
            id=att_id,
            name=safe_name,
            mime_type=mime_type,
            size=len(raw),
            sha256=digest,
            path=str(dest),
            created_at=_now_iso(),
        )
        nb.attachments[att_id] = att
        if cell_id:
            _, cell = self._find_cell(nb, cell_id)
            if att_id not in cell.attachments:
                cell.attachments.append(att_id)
        self._save(nb)
        return att.to_dict()

    def list_attachments(self, notebook_id: str) -> list[dict[str, Any]]:
        nb = self._load(notebook_id)
        return [a.to_dict() for a in nb.attachments.values()]

    def remove_attachment(self, notebook_id: str, attachment_id: str) -> dict[str, Any]:
        nb = self._load(notebook_id)
        att = nb.attachments.pop(attachment_id, None)
        if att is None:
            raise NotebookError(f"attachment not found: {attachment_id}")
        for cell in nb.cells:
            if attachment_id in cell.attachments:
                cell.attachments = [a for a in cell.attachments if a != attachment_id]
        path = Path(att.path)
        if path.is_file():
            path.unlink()
        self._save(nb)
        return {"deleted": True, "id": attachment_id}

    # ── widgets ──────────────────────────────────────────────────────────

    def create_widget(
        self,
        notebook_id: str,
        widget_type: str,
        label: str,
        value: Any = None,
        options: list[Any] | None = None,
        min_value: float | None = None,
        max_value: float | None = None,
        step: float | None = None,
        cell_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if widget_type not in VALID_WIDGET_TYPES:
            raise NotebookError(
                f"unsupported widget_type {widget_type!r}; "
                f"expected one of {sorted(VALID_WIDGET_TYPES)}"
            )
        nb = self._load(notebook_id)
        if cell_id:
            self._find_cell(nb, cell_id)
        wid = _new_id("w")
        widget = Widget(
            id=wid,
            widget_type=widget_type,
            label=label or widget_type,
            value=value,
            options=list(options or []),
            min=min_value,
            max=max_value,
            step=step,
            cell_id=cell_id,
            metadata=dict(metadata or {}),
        )
        nb.widgets[wid] = widget
        if cell_id:
            _, cell = self._find_cell(nb, cell_id)
            if wid not in cell.widgets:
                cell.widgets.append(wid)
            cell.outputs.append(
                CellOutput(
                    output_type="widget",
                    text=f"{widget_type}:{label}={value!r}",
                    data=widget.to_dict(),
                )
            )
        self._save(nb)
        return widget.to_dict()

    def update_widget(
        self,
        notebook_id: str,
        widget_id: str,
        value: Any = None,
        label: str | None = None,
        options: list[Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        widget = nb.widgets.get(widget_id)
        if widget is None:
            raise NotebookError(f"widget not found: {widget_id}")
        if value is not None:
            widget.value = value
        if label is not None:
            widget.label = label
        if options is not None:
            widget.options = list(options)
        if metadata is not None:
            widget.metadata.update(metadata)
        self._save(nb)
        return widget.to_dict()

    def list_widgets(self, notebook_id: str) -> list[dict[str, Any]]:
        nb = self._load(notebook_id)
        return [w.to_dict() for w in nb.widgets.values()]

    def delete_widget(self, notebook_id: str, widget_id: str) -> dict[str, Any]:
        nb = self._load(notebook_id)
        if widget_id not in nb.widgets:
            raise NotebookError(f"widget not found: {widget_id}")
        del nb.widgets[widget_id]
        for cell in nb.cells:
            if widget_id in cell.widgets:
                cell.widgets = [w for w in cell.widgets if w != widget_id]
        self._save(nb)
        return {"deleted": True, "id": widget_id}

    # ── export / import ──────────────────────────────────────────────────

    def export_notebook(
        self,
        notebook_id: str,
        format: str = "ipynb",
    ) -> dict[str, Any]:
        nb = self._load(notebook_id)
        fmt = (format or "ipynb").lower()
        if fmt == "json":
            return {"format": "json", "notebook_id": nb.id, "content": nb.to_dict()}
        if fmt == "markdown":
            parts: list[str] = [f"# {nb.title}", ""]
            for cell in nb.cells:
                if cell.cell_type == "markdown":
                    parts.append(cell.source)
                    parts.append("")
                elif cell.cell_type == "code":
                    lang = cell.language or "python"
                    parts.append(f"```{lang}")
                    parts.append(cell.source)
                    parts.append("```")
                    for out in cell.outputs:
                        if out.text:
                            parts.append("")
                            parts.append("```")
                            parts.append(out.text.rstrip())
                            parts.append("```")
                    parts.append("")
                else:
                    parts.append(cell.source)
                    parts.append("")
            return {
                "format": "markdown",
                "notebook_id": nb.id,
                "content": "\n".join(parts).strip() + "\n",
            }
        if fmt != "ipynb":
            raise NotebookError("format must be one of: ipynb, json, markdown")

        ipynb_cells = []
        for cell in nb.cells:
            entry: dict[str, Any] = {
                "cell_type": cell.cell_type,
                "metadata": deepcopy(cell.metadata),
                "source": cell.source.splitlines(keepends=True) or [""],
            }
            if cell.cell_type == "code":
                entry["execution_count"] = cell.execution_count
                entry["outputs"] = []
                for out in cell.outputs:
                    if out.output_type == "stream":
                        entry["outputs"].append(
                            {
                                "output_type": "stream",
                                "name": out.data.get("name", "stdout"),
                                "text": out.text.splitlines(keepends=True),
                            }
                        )
                    elif out.output_type == "error":
                        entry["outputs"].append(
                            {
                                "output_type": "error",
                                "ename": out.ename,
                                "evalue": out.evalue,
                                "traceback": out.traceback,
                            }
                        )
                    else:
                        entry["outputs"].append(
                            {
                                "output_type": out.output_type,
                                "data": out.data or {"text/plain": out.text},
                                "metadata": {},
                            }
                        )
            ipynb_cells.append(entry)

        ipynb = {
            "nbformat": 4,
            "nbformat_minor": 5,
            "metadata": {
                "kernelspec": {
                    "display_name": nb.kernel_language,
                    "language": nb.kernel_language,
                    "name": nb.kernel_language,
                },
                "language_info": {"name": nb.kernel_language},
                "claude_notebook_mcp": {
                    "id": nb.id,
                    "title": nb.title,
                    "widgets": {k: v.to_dict() for k, v in nb.widgets.items()},
                    "attachments": {
                        k: {**v.to_dict(), "path": Path(v.path).name}
                        for k, v in nb.attachments.items()
                    },
                },
            },
            "cells": ipynb_cells,
        }
        return {"format": "ipynb", "notebook_id": nb.id, "content": ipynb}

    def import_notebook(
        self,
        content: dict[str, Any] | str,
        title: str | None = None,
        format: str = "auto",
    ) -> dict[str, Any]:
        fmt = (format or "auto").lower()
        payload: dict[str, Any]
        if isinstance(content, str):
            try:
                payload = json.loads(content)
            except json.JSONDecodeError as exc:
                raise NotebookError(f"content is not valid JSON: {exc}") from exc
        elif isinstance(content, dict):
            payload = content
        else:
            raise NotebookError("content must be a JSON object or JSON string")

        # native engine format
        if fmt in {"auto", "json"} and "cells" in payload and "nbformat" in payload and "title" in payload:
            nb = Notebook.from_dict(payload)
            nb.id = _new_id("nb")
            if title:
                nb.title = title
            now = _now_iso()
            nb.created_at = now
            nb.updated_at = now
            self._save(nb)
            return nb.to_dict()

        # ipynb
        if fmt in {"auto", "ipynb"} and "cells" in payload and "nbformat" in payload:
            meta = payload.get("metadata") or {}
            cn = meta.get("claude_notebook_mcp") or {}
            nb_title = title or cn.get("title") or "Imported Notebook"
            nb = Notebook(
                id=_new_id("nb"),
                title=nb_title,
                created_at=_now_iso(),
                updated_at=_now_iso(),
                kernel_language=(
                    (meta.get("language_info") or {}).get("name")
                    or (meta.get("kernelspec") or {}).get("language")
                    or DEFAULT_LANGUAGE
                ),
                metadata={"imported_from": "ipynb"},
            )
            for raw in payload.get("cells") or []:
                src = raw.get("source", "")
                if isinstance(src, list):
                    src = "".join(src)
                cell_type = str(raw.get("cell_type", "code"))
                if cell_type not in CELL_TYPES:
                    cell_type = "raw"
                cell = Cell(
                    id=_new_id("cell"),
                    cell_type=cell_type,
                    source=str(src),
                    language=nb.kernel_language if cell_type == "code" else cell_type,
                    metadata=dict(raw.get("metadata") or {}),
                    execution_count=raw.get("execution_count"),
                )
                for out in raw.get("outputs") or []:
                    if not isinstance(out, dict):
                        continue
                    text = out.get("text", "")
                    if isinstance(text, list):
                        text = "".join(text)
                    data = out.get("data") or {}
                    if not text and "text/plain" in data:
                        tp = data["text/plain"]
                        text = "".join(tp) if isinstance(tp, list) else str(tp)
                    cell.outputs.append(
                        CellOutput(
                            output_type=str(out.get("output_type", "stream")),
                            text=str(text or ""),
                            data=dict(data) if isinstance(data, dict) else {},
                            ename=str(out.get("ename", "")),
                            evalue=str(out.get("evalue", "")),
                            traceback=list(out.get("traceback") or []),
                        )
                    )
                nb.cells.append(cell)
            self._save(nb)
            return nb.to_dict()

        # native without nbformat key
        if "cells" in payload and ("id" in payload or "title" in payload):
            nb = Notebook.from_dict(payload)
            nb.id = _new_id("nb")
            if title:
                nb.title = title
            self._save(nb)
            return nb.to_dict()

        raise NotebookError("unrecognized notebook format")

    def save_session(self, notebook_id: str, path: str | None = None) -> dict[str, Any]:
        nb = self._load(notebook_id)
        if path:
            dest = Path(path).expanduser().resolve()
        else:
            # Keep sessions in a sibling folder so *.json notebook listing stays clean.
            sess_dir = self.root / "sessions"
            sess_dir.mkdir(parents=True, exist_ok=True)
            dest = sess_dir / f"{nb.id}.session.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        session = {
            "notebook": nb.to_dict(),
            "variables": self._kernel(notebook_id).variables(),
            "saved_at": _now_iso(),
        }
        dest.write_text(json.dumps(session, indent=2) + "\n", encoding="utf-8")
        return {"saved": True, "path": str(dest), "notebook_id": nb.id}

    def load_session(self, path: str) -> dict[str, Any]:
        p = Path(path).expanduser().resolve()
        if not p.is_file():
            raise NotebookError(f"session file not found: {path}")
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise NotebookError(f"invalid session JSON: {exc}") from exc
        notebook_data = data.get("notebook") or data
        nb = Notebook.from_dict(notebook_data)
        # new id to avoid clobber unless same id file exists intentionally
        if self._path_for(nb.id).is_file():
            nb.id = _new_id("nb")
        self._save(nb)
        return {
            "loaded": True,
            "notebook_id": nb.id,
            "title": nb.title,
            "variables_snapshot": data.get("variables") or {},
        }

    def health(self) -> dict[str, Any]:
        return {
            "status": "healthy",
            "service": "claude-notebook-mcp",
            "version": "1.0.0",
            "notebook_dir": str(self.root),
            "notebook_count": len(list(self.root.glob("*.json"))),
            "cell_types": sorted(CELL_TYPES),
            "widget_types": sorted(VALID_WIDGET_TYPES),
            "languages": ["python", "javascript"],
            "inspired_by": "https://github.com/jacob-bd/gemini-notebook-mcp-cli",
        }


def demo_workspace(root: str | Path | None = None) -> dict[str, Any]:
    """Create a sample notebook and exercise core paths (used by example_call)."""
    eng = NotebookEngine(root=root or tempfile.mkdtemp(prefix="claude-nb-demo-"))
    nb = eng.create_notebook(title="Demo Notebook")
    nb_id = nb["id"]
    code = eng.add_cell(
        nb_id,
        cell_type="code",
        source="x = 40\ny = 2\nprint('sum', x + y)\nx + y",
    )
    result = eng.execute_cell(nb_id, code["cell"]["id"])
    md = eng.add_cell(
        nb_id,
        cell_type="markdown",
        source="## Result\n\nThe sum is **42**.",
    )
    eng.execute_cell(nb_id, md["cell"]["id"])
    eng.add_attachment(
        nb_id,
        name="notes.txt",
        text_content="demo attachment",
        mime_type="text/plain",
    )
    eng.create_widget(
        nb_id,
        widget_type="slider",
        label="scale",
        value=1,
        min_value=0,
        max_value=10,
        step=1,
        cell_id=code["cell"]["id"],
    )
    exported = eng.export_notebook(nb_id, format="ipynb")
    return {
        "notebook_id": nb_id,
        "execute": result,
        "export_format": exported["format"],
        "health": eng.health(),
        "root": str(eng.root),
    }
