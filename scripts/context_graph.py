"""Select bounded governance context using local Markdown references (#18336).

No provider calls or embedding service are involved. The in-process cache is
keyed by content hashes, so edits invalidate selection even on coarse filesystems.
"""
from __future__ import annotations

import hashlib
import math
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

_CACHE: dict[str, tuple[dict[str, str], dict[str, set[str]]]] = {}
# Initial two-document set retained for history (2026-11-10 review):
# MANDATORY = ("AGENTS.md", "START_HERE_CALL_CHAIN.md")
# MASTER establishes precedence and VISITING_AGENTS supplies the guest contract;
# neither may fall out merely because lexical query overlap is low.
MANDATORY = ("AGENTS.md", "START_HERE_CALL_CHAIN.md", "MASTER.md", "VISITING_AGENTS.md")


def terms(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{3,}", text.lower()))


def build_graph(root: Path) -> tuple[dict[str, str], dict[str, set[str]]]:
    """Index standards plus root governance, excluding external/symlink targets."""
    root = root.resolve()
    candidates = sorted(set(root.glob("*.md")) | set((root / "standards").rglob("*.md")))
    documents = {}
    for file in candidates:
        if file.is_symlink() or not file.resolve().is_relative_to(root):
            continue
        documents[file.relative_to(root).as_posix()] = file.read_text(encoding="utf-8")
    fingerprint = hashlib.sha256(repr(sorted(documents.items())).encode()).hexdigest()
    key = f"{root}:{fingerprint}"
    if key in _CACHE:
        return _CACHE[key]
    edges = {name: set() for name in documents}
    for name, content in documents.items():
        for target in re.findall(r"\[[^\]]*\]\(([^)\s]+)\)", content):
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            resolved = (root / name).parent.joinpath(unquote(parsed.path)).resolve()
            if resolved.is_relative_to(root):
                other = resolved.relative_to(root).as_posix()
                if other in documents and other != name:
                    edges[name].add(other)
                    edges[other].add(name)
    # Bound process memory; only the newest snapshot of this repository is useful.
    for previous in list(_CACHE):
        if previous.startswith(f"{root}:"):
            del _CACHE[previous]
    _CACHE[key] = documents, edges
    return documents, edges


def select_context(root: Path, query: str, max_chars: int = 60000) -> dict:
    """Return whole documents, always retaining owner instructions unabridged.

    If mandatory governance alone exceeds the budget, fail clearly instead of
    truncating owner rules. The caller can raise the budget or disable selection.
    Character counts are exact; token estimates and quality gains are not claimed.
    """
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    documents, edges = build_graph(root)
    missing = [name for name in MANDATORY if name not in documents]
    if missing:
        raise ValueError(f"Missing mandatory governance: {', '.join(missing)}")
    query_terms = terms(query)
    indexed = {name: terms(name + " " + content) for name, content in documents.items()}
    frequencies = {term: sum(term in words for words in indexed.values()) for term in query_terms}
    scores = {name: sum(math.log(1 + len(documents) / frequencies[t]) for t in query_terms & words)
              for name, words in indexed.items()}
    # One-hop references give governing prerequisites a bounded relevance boost.
    expanded = {name: score + sum(scores[other] * 0.15 for other in edges[name])
                for name, score in scores.items()}
    selected = list(MANDATORY)

    def render(names):
        return "\n\n".join(f"## Repository context: {name}\n{documents[name]}" for name in names)
    if len(render(selected)) > max_chars:
        raise ValueError("Context budget cannot fit mandatory governance")
    for name in sorted(documents, key=lambda n: (-expanded[n], n)):
        if name in selected or expanded[name] <= 0:
            continue
        if len(render(selected + [name])) <= max_chars:
            selected.append(name)
    content = render(selected)
    return {"content": content, "paths": selected, "selected_chars": len(content),
            "full_chars": len(render(list(documents))), "documents": len(documents),
            "edges": sum(map(len, edges.values())) // 2}
