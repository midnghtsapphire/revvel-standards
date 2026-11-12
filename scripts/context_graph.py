"""Select bounded governance context using local Markdown references (#18336).

No provider calls or embedding service are involved. The in-process cache is
keyed by content hashes, so edits invalidate selection even on coarse file systems.

WR #18336 (2026-11-11, PromptOrchestrator) adds typed edges and a routed
subgraph on top of this selector. Edges are derived only from local links and
path mentions. governs / referenced_by / populates are path-role labels, not
model judgments. Token counts use the local revvel-local-4byte tokenizer in
this file. Nothing here calls a paid API. LLMLingua-2 can compress the
non-mandatory `reference_text` later (scripts/prompt_compression.py, WR #18335);
this module does not import that file.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

_CACHE: dict[str, tuple[dict[str, str], dict[str, set[str]]]] = {}
_TYPED: dict[str, list[dict[str, str]]] = {}
_META: dict[str, dict[str, str]] = {}
_ROUTE_CACHE: dict[str, dict] = {}
# Initial two-document set retained for history (2026-11-10 review):
# MANDATORY = ("AGENTS.md", "START_HERE_CALL_CHAIN.md")
# MASTER establishes precedence and VISITING_AGENTS supplies the guest contract;
# neither may fall out merely because lexical query overlap is low.
MANDATORY = ("AGENTS.md", "START_HERE_CALL_CHAIN.md", "MASTER.md", "VISITING_AGENTS.md")
# Root documents the issue names, plus the four mandatory files. A link from
# one of these is a governs edge. standards/** is the same role by path.
GOVERNANCE_ROOTS = frozenset(MANDATORY + ("CLAUDE.md", "UPREV_METHOD.md"))
WORK_REQUEST = ".github/ISSUE_TEMPLATE/work_request.yml"
# 2026-11-10 select_context default was 60000. The four mandatory documents
# render to about 56k characters, so that budget could not hold the standard
# a query is about. 180000 is the routing budget. Callers may still pass
# 60000; the openrouter coder does, via REVVEL_CONTEXT_MAX_CHARS.
ROUTE_MAX_CHARS = 180000
RELEVANCE_FLOOR = 0.35
TOP_HITS = 3
ONE_HOP_CAP = 12
TOKENIZER_NAME = "revvel-local-4byte"
_DATA_SUFFIXES = (".yml", ".yaml", ".json")
_POPULATE_HINTS = ("template", "schema", "example", "fixture")
_MD_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
_PATH_TOKEN = re.compile(r"(?<![\w./-])((?:[\w.-]+/)*[\w.-]+\.(?:md|yml|yaml|json))(?![\w./-])")
_TOKEN_PIECE = re.compile(r"\w+|[^\w\s]", re.UNICODE)
EDGE_RULES = {
    "referenced_by": "from is the target document; to is the document that mentions it",
    "governs": "from is a standard or root governance document; to is the document it governs",
    "populates": "from is a data file a document points at; to is that document",
}


def terms(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{3,}", text.lower()))


def count_tokens(text: str) -> int:
    """Count tokens with the local revvel-local-4byte tokenizer.

    Each word or punctuation mark is one piece. A piece longer than 4 UTF-8
    bytes splits into 4-byte chunks, so length still scales the way a byte-pair
    encoding does. Whitespace is not a token. The same function is applied to
    the full corpus and the routed subgraph, so the reduction ratio is
    comparable. This does not download a vocabulary and does not call a provider.
    If this number disagrees with a billed tokenizer, compare ratios, not raw
    counts, and say which tokenizer each side used.
    """
    total = 0
    for piece in _TOKEN_PIECE.findall(text):
        total += max(1, (len(piece.encode("utf-8")) + 3) // 4)
    return total


def _in_scope(path: str) -> bool:
    """Standards, named governance roots, and the work-request template."""
    if path.startswith("standards/") or path in GOVERNANCE_ROOTS:
        return True
    return path == WORK_REQUEST


def _corpus_files(root: Path) -> list[Path]:
    # 2026-11-10 corpus, retired as the only corpus on 2026-11-11 (WR #18336):
    # candidates = sorted(set(root.glob("*.md")) | set((root / "standards").rglob("*.md")))
    # Root markdown and standards markdown stay. Standards YAML is added, and
    # the work-request template is added because the issue names it as a node.
    found = set(root.glob("*.md"))
    standards = root / "standards"
    if standards.is_dir():
        for pattern in ("*.md", "*.yml", "*.yaml"):
            found.update(path for path in standards.rglob(pattern) if path.is_file())
    work_request = root / WORK_REQUEST
    if work_request.is_file():
        found.add(work_request)
    return sorted(found)


def _read_corpus(root: Path) -> dict[str, str]:
    documents = {}
    for file in _corpus_files(root):
        if file.is_symlink() or not file.resolve().is_relative_to(root):
            continue
        documents[file.relative_to(root).as_posix()] = file.read_text(encoding="utf-8")
    return documents


def _resolve_ref(root: Path, source: str, raw: str, documents: dict[str, str]) -> str | None:
    """Resolve a markdown link or path token onto a corpus document.

    External URLs and paths that leave the repository are ignored. A relative
    link is tried from the source file first, then from the repository root,
    because standards docs use both styles.
    """
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    relative = unquote(parsed.path)
    candidates = ((root / source).parent / relative, root / relative)
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if not resolved.is_relative_to(root):
            continue
        other = resolved.relative_to(root).as_posix()
        if other in documents and other != source:
            return other
    return None


def _targets(root: Path, source: str, content: str, documents: dict[str, str]) -> list[str]:
    seen: list[str] = []
    known: set[str] = set()
    raw_refs = _MD_LINK.findall(content)
    raw_refs.extend(_PATH_TOKEN.findall(content))
    for raw in raw_refs:
        other = _resolve_ref(root, source, raw, documents)
        if other and other not in known:
            known.add(other)
            seen.append(other)
    return seen


def _is_data(path: str) -> bool:
    return path.endswith(_DATA_SUFFIXES)


def _populate_target(path: str) -> bool:
    lower = path.lower()
    return any(hint in lower for hint in _POPULATE_HINTS)


def _governs_role(path: str) -> bool:
    return path.startswith("standards/") or path in GOVERNANCE_ROOTS


def _classify(source: str, target: str) -> list[tuple[str, str, str]]:
    """Label one resolved reference. referenced_by is always recorded.

    A document that points at a data file yields populates (the data file
    feeds that document). A data file that points at a governance document
    yields governs in the other direction. Two prose documents yield governs
    from the governance side. The returned tuples are (from, to, type).
    """
    edges = [(target, source, "referenced_by")]
    if _is_data(target) and not _is_data(source):
        edges.append((target, source, "populates"))
        return edges
    if _is_data(source) and not _is_data(target):
        if _populate_target(target):
            edges.append((source, target, "populates"))
        elif _governs_role(target):
            edges.append((target, source, "governs"))
        return edges
    if _governs_role(source):
        edges.append((source, target, "governs"))
    elif _governs_role(target):
        edges.append((target, source, "governs"))
    return edges


def _link_graph(root: Path, documents: dict[str, str]) -> tuple[dict[str, set[str]], list[dict[str, str]]]:
    """Undirected neighbor sets plus sorted typed edges.

    The undirected sets are what select_context's one-hop boost reads. They
    stay a projection of every resolved reference so the 2026-11-10 scorer
    still sees markdown-link neighbors.
    """
    undirected = {name: set() for name in documents}
    typed_set: set[tuple[str, str, str]] = set()
    for name, content in documents.items():
        for other in _targets(root, name, content, documents):
            undirected[name].add(other)
            undirected[other].add(name)
            typed_set.update(_classify(name, other))
    typed = [
        {"from": src, "to": dst, "type": kind}
        for src, dst, kind in sorted(typed_set, key=lambda item: (item[2], item[0], item[1]))
    ]
    return undirected, typed


def build_graph(root: Path) -> tuple[dict[str, str], dict[str, set[str]]]:
    """Index standards plus root governance, excluding external/symlink targets."""
    root = root.resolve()
    documents = _read_corpus(root)
    fingerprint = hashlib.sha256(repr(sorted(documents.items())).encode()).hexdigest()
    key = f"{root}:{fingerprint}"
    _META[str(root)] = {"fingerprint": fingerprint, "typed_key": key}
    if key in _CACHE:
        return _CACHE[key]
    # 2026-11-10 link loop, retired 2026-11-11 by PromptOrchestrator (WR #18336).
    # It built undirected edges from markdown links only. _link_graph keeps
    # that undirected result and also records governs / referenced_by /
    # populates. The old loop was:
    # edges = {name: set() for name in documents}
    # for name, content in documents.items():
    #     for target in re.findall(r"\\[[^\\]]*\\]\\(([^)\\s]+)\\)", content):
    #         parsed = urlsplit(target)
    #         if parsed.scheme or parsed.netloc or not parsed.path:
    #             continue
    #         resolved = (root / name).parent.joinpath(unquote(parsed.path)).resolve()
    #         if resolved.is_relative_to(root):
    #             other = resolved.relative_to(root).as_posix()
    #             if other in documents and other != name:
    #                 edges[name].add(other)
    #                 edges[other].add(name)
    undirected, typed = _link_graph(root, documents)
    # Bound process memory; only the newest snapshot of this repository is useful.
    for previous in list(_CACHE):
        if previous.startswith(f"{root}:"):
            del _CACHE[previous]
            _TYPED.pop(previous, None)
    _CACHE[key] = documents, undirected
    _TYPED[key] = typed
    return documents, undirected


def _clears_floor(name: str, scores: dict[str, float], best: float) -> bool:
    return best > 0 and scores.get(name, 0) >= RELEVANCE_FLOOR * best


def _best_score(scores: dict[str, float]) -> float:
    """Highest lexical score inside the standards scope.

    A long root note such as learnings.md matches ordinary words and must not
    set the floor. If nothing in scope matches, fall back to the rest of the
    corpus so a query about a root document still returns something.
    """
    scoped = [scores[name] for name in scores if name not in MANDATORY and _in_scope(name)]
    if scoped:
        return max(scoped)
    other = [scores[name] for name in scores if name not in MANDATORY]
    return max(other, default=0)


def _seed_names(scores: dict[str, float], best: float) -> list[str]:
    """In-scope documents only: the top hits, plus any that clear the floor.

    Out-of-scope root notes are not seeds. They share ordinary words with
    almost every query and previously filled the character budget before the
    standard the query named.
    """
    ranked = sorted(
        (name for name in scores if name not in MANDATORY and scores[name] > 0 and _in_scope(name)),
        key=lambda name: (-scores[name], name),
    )
    if not ranked:
        ranked = sorted(
            (name for name in scores if name not in MANDATORY and scores[name] > 0),
            key=lambda name: (-scores[name], name),
        )
    seeds = []
    for index, name in enumerate(ranked):
        if index < TOP_HITS or _clears_floor(name, scores, best):
            seeds.append(name)
    return seeds


def _neighbor_allow(seeds: list[str], edges: dict[str, set[str]], scores: dict[str, float]) -> set[str]:
    """One hop from each seed, capped, and only into the standards scope.

    The 2026-11-10 scorer added a 0.15 boost and then packed every positive
    score until the budget. A direct neighbor such as a policy linked from a
    billing note has no lexical overlap and would fall under the floor, so it
    is included here explicitly. Root notes outside the scope are not pulled
    in just because a standard mentions them.
    """
    allow: set[str] = set()
    seed_set = set(seeds)
    for seed in seeds:
        neighbors = [
            name for name in edges[seed]
            if name not in MANDATORY and name not in seed_set and _in_scope(name)
        ]
        neighbors.sort(key=lambda name: (-scores.get(name, 0), name))
        allow.update(neighbors[:ONE_HOP_CAP])
    return allow


def _render(documents: dict[str, str], names: list[str]) -> str:
    return "\n\n".join(f"## Repository context: {name}\n{documents[name]}" for name in names)


def select_context(root: Path, query: str, max_chars: int = ROUTE_MAX_CHARS) -> dict:
    """Return whole documents, always retaining owner instructions unabridged.

    If mandatory governance alone exceeds the budget, fail clearly instead of
    truncating owner rules. The caller can raise the budget or disable selection.
    Character counts are exact. Token counts for a query live on route_query;
    this function does not claim a quality gain.

    2026-11-10 signature, retired as the default on 2026-11-11 (WR #18336):
    def select_context(root: Path, query: str, max_chars: int = 60000) -> dict:
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
    best = _best_score(scores)
    seeds = _seed_names(scores, best)
    neighbors = _neighbor_allow(seeds, edges, scores)
    selected = list(MANDATORY)

    def render(names):
        return _render(documents, names)
    if len(render(selected)) > max_chars:
        raise ValueError("Context budget cannot fit mandatory governance")
    # Seeds are packed before neighbors so the documents that actually matched
    # the query are not pushed out by a high one-hop boost on a larger file.
    # 2026-11-10 packed every positive expanded score until the budget:
    # for name in sorted(documents, key=lambda name: (-expanded[name], name)):
    #     if name in selected or expanded[name] <= 0:
    #         continue
    ordered = list(seeds)
    for name in sorted(neighbors, key=lambda name: (-expanded[name], name)):
        if name not in seeds:
            ordered.append(name)
    for name in ordered:
        if name in selected:
            continue
        if len(render(selected + [name])) <= max_chars:
            selected.append(name)
    content = render(selected)
    return {"content": content, "paths": selected, "selected_chars": len(content),
            "full_chars": len(render(list(documents))), "documents": len(documents),
            "edges": sum(map(len, edges.values())) // 2}


def _node_role(path: str) -> str:
    if _is_data(path):
        return "data"
    if _governs_role(path):
        return "governance"
    return "document"


def graph_document(root: Path) -> dict:
    """Serializable context graph. Document text stays on disk, not in the artifact."""
    root = root.resolve()
    documents, _undirected = build_graph(root)
    meta = _META[str(root)]
    typed = _TYPED[meta["typed_key"]]
    nodes = [
        {"bytes": len(documents[name].encode("utf-8")), "id": name, "role": _node_role(name)}
        for name in sorted(documents)
    ]
    return {
        "edge_count": len(typed),
        "edge_rules": EDGE_RULES,
        "edge_types": ["governs", "populates", "referenced_by"],
        "edges": typed,
        "fingerprint": meta["fingerprint"],
        "generator": "scripts/context_graph.py",
        "node_count": len(nodes),
        "nodes": nodes,
        "wr": 18336,
    }


def _canonical(payload: dict) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _percent(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round(100.0 * (whole - part) / whole, 2)


def route_query(root: Path, query: str, max_chars: int = ROUTE_MAX_CHARS) -> dict:
    """Return the relevant subgraph for one query, using the content-hash cache.

    The cached value is the selected paths, typed edges whose ends are both
    selected, and the rendered text. A second call with the same query and
    budget reports cache_hit. Editing any indexed document changes the
    fingerprint, drops the old route entries, and selects again.
    reference_text is the non-mandatory selection. WR #18335 can pass that
    string to compress_context without this module importing the compressor.
    """
    root = root.resolve()
    documents, _undirected = build_graph(root)
    meta = _META[str(root)]
    fingerprint = meta["fingerprint"]
    cache_key = f"{root}|{fingerprint}|{max_chars}|{query}"
    for old in list(_ROUTE_CACHE):
        if not old.startswith(f"{root}|{fingerprint}|"):
            del _ROUTE_CACHE[old]
    if cache_key in _ROUTE_CACHE:
        hit = dict(_ROUTE_CACHE[cache_key])
        hit["cache_hit"] = True
        return hit
    selected = select_context(root, query, max_chars=max_chars)
    paths = list(selected["paths"])
    path_set = set(paths)
    typed = _TYPED[meta["typed_key"]]
    subgraph = [edge for edge in typed if edge["from"] in path_set and edge["to"] in path_set]
    full_text = _render(documents, list(documents))
    reference = _render(documents, [name for name in paths if name not in MANDATORY])
    selected_tokens = count_tokens(selected["content"])
    full_tokens = count_tokens(full_text)
    result = {
        "cache_hit": False,
        "content": selected["content"],
        "documents": selected["documents"],
        "edges": selected["edges"],
        "fingerprint": fingerprint,
        "full_chars": selected["full_chars"],
        "full_tokens": full_tokens,
        "paths": paths,
        "reduction_percent": _percent(selected_tokens, full_tokens),
        "reference_text": reference,
        "selected_chars": selected["selected_chars"],
        "selected_tokens": selected_tokens,
        "subgraph_edges": subgraph,
        "tokenizer": TOKENIZER_NAME,
        "undirected_edge_count": selected["edges"],
    }
    _ROUTE_CACHE[cache_key] = dict(result)
    return result


def load_queries(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    queries = payload["queries"] if isinstance(payload, dict) else payload
    if not queries:
        raise ValueError(f"No queries in {path}")
    return queries


def measure_queries(root: Path, queries: list[dict], max_chars: int = ROUTE_MAX_CHARS) -> dict:
    """Token reduction of the routed subgraph against loading every graph node."""
    rows = []
    for item in queries:
        routed = route_query(root, item["query"], max_chars=max_chars)
        rows.append({
            "expect": item.get("expect", ""),
            "expect_included": item.get("expect", "") in routed["paths"],
            "full_documents": routed["documents"],
            "full_tokens": routed["full_tokens"],
            "id": item["id"],
            "paths": routed["paths"],
            "query": item["query"],
            "reduction_percent": routed["reduction_percent"],
            "selected_documents": len(routed["paths"]),
            "selected_tokens": routed["selected_tokens"],
            "subgraph_edges": len(routed["subgraph_edges"]),
        })
    reductions = [row["reduction_percent"] for row in rows]
    mean = round(sum(reductions) / len(reductions), 2)
    return {
        "baseline": "every node in the context graph, rendered with the same header as the subgraph",
        "max_chars": max_chars,
        "mean_reduction_percent": mean,
        "meets_60_percent_mean": mean >= 60.0,
        "min_reduction_percent": min(reductions),
        "queries": rows,
        "tokenizer": {
            "name": TOKENIZER_NAME,
            "note": "Local deterministic count. Not a provider bill and not cl100k_base.",
        },
        "wr": 18336,
    }


def accuracy_status(queries: list[dict]) -> dict:
    """The 25% accuracy claim needs model answers. This record does not invent one."""
    return {
        "claim": "25% accuracy improvement versus full-context loading",
        "how_to_run": (
            "REVVEL_GRAPH_ACCURACY_APPROVED=1 "
            "node scripts/run-python.js scripts/context_graph.py accuracy-harness --execute"
        ),
        "measured": False,
        "prepared_query_ids": [item["id"] for item in queries],
        "refuses_unless": "REVVEL_GRAPH_ACCURACY_APPROVED=1",
        "spend": "pending-owner-approved-spend",
        "status": "pending-owner-approved-spend",
        "why": (
            "Scoring answer accuracy needs a model completion on the full context "
            "and on the routed subgraph. No model call was made. The execute path "
            "uses local_llm.complete(..., allow_cloud=False), so it cannot open "
            "the paid lane. This run did not execute it."
        ),
        "wr": 18336,
    }


def _score_terms(answer: str, expected: list[str]) -> float:
    if not expected:
        return 0.0
    found = sum(1 for term in expected if term in answer)
    return found / len(expected)


def _accuracy_prompt(query: str, context: str) -> str:
    return (
        "Answer the question using only the repository context below. "
        "Quote the governing rule in a sentence.\n\n"
        f"Question: {query}\n\n{context}"
    )


def execute_accuracy(root: Path, queries: list[dict]) -> int:
    """Run the accuracy comparison on local models only.

    Refuses unless REVVEL_GRAPH_ACCURACY_APPROVED=1. allow_cloud=False is
    passed on every completion so this function cannot widen the spend gate.
    If no local model is running, local_llm raises and no provider is billed.
    """
    if os.environ.get("REVVEL_GRAPH_ACCURACY_APPROVED") != "1":
        print("Refused. Set REVVEL_GRAPH_ACCURACY_APPROVED=1 to run the local accuracy harness.")
        print("Paid calls stay off: complete is called with allow_cloud=False.")
        return 2
    import local_llm
    full_scores = []
    sub_scores = []
    for item in queries:
        routed = route_query(root, item["query"])
        documents, _edges = build_graph(root)
        full_text = _render(documents, list(documents))
        expected = list(item.get("expected_terms") or [])
        full = local_llm.complete(_accuracy_prompt(item["query"], full_text), allow_cloud=False)
        sub = local_llm.complete(_accuracy_prompt(item["query"], routed["content"]), allow_cloud=False)
        full_scores.append(_score_terms(full.text, expected))
        sub_scores.append(_score_terms(sub.text, expected))
        print(f"{item['id']}: full={full_scores[-1]:.2f} subgraph={sub_scores[-1]:.2f} lane={sub.lane}")
    if full_scores:
        full_mean = sum(full_scores) / len(full_scores)
        sub_mean = sum(sub_scores) / len(sub_scores)
        delta = 0.0 if full_mean == 0 else (sub_mean - full_mean) / full_mean
        print(f"mean full={full_mean:.2f} subgraph={sub_mean:.2f} relative_delta={delta:.2%}")
        print("This is a term-coverage score, not a claim that the 25% bar was met.")
    return 0


def _write_or_check(path: Path, text: str, check: bool) -> int:
    if check:
        current = path.read_text(encoding="utf-8") if path.is_file() else ""
        if current != text:
            print(f"Drift: {path} does not match a fresh run. Regenerate and review the diff.")
            return 1
        print(f"OK {path}")
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"Wrote {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    """Manual entry point. Run from the repository root.

    build writes or checks the graph artifact.
    measure writes or checks token numbers. It does not call a model.
    route prints one subgraph summary.
    accuracy-harness prints the pending-spend record. --execute is the only
    path that calls a model, and it refuses without the approval flag.
    """
    parser = argparse.ArgumentParser(description="Graph prompting context selection (WR 18336)")
    sub = parser.add_subparsers(dest="command", required=True)

    build = sub.add_parser("build", help="write or check the context graph artifact")
    build.add_argument("--root", default=".")
    build.add_argument("--out", default="docs/graph-prompting/standards-context-graph.json")
    build.add_argument("--check", action="store_true")

    measure = sub.add_parser("measure", help="measure local token reduction")
    measure.add_argument("--root", default=".")
    measure.add_argument("--queries", default="docs/graph-prompting/sample-queries.json")
    measure.add_argument("--out", default="docs/graph-prompting/token-measurements.json")
    measure.add_argument("--check", action="store_true")

    route = sub.add_parser("route", help="print the subgraph for one query")
    route.add_argument("--root", default=".")
    route.add_argument("--query", required=True)
    route.add_argument("--max-chars", type=int, default=ROUTE_MAX_CHARS)

    accuracy = sub.add_parser("accuracy-harness", help="record or run the accuracy comparison")
    accuracy.add_argument("--root", default=".")
    accuracy.add_argument("--queries", default="docs/graph-prompting/sample-queries.json")
    accuracy.add_argument("--out", default="docs/graph-prompting/accuracy-benchmark.json")
    accuracy.add_argument("--check", action="store_true")
    accuracy.add_argument("--execute", action="store_true")

    args = parser.parse_args(argv)
    root = Path(args.root)
    if args.command == "build":
        return _write_or_check(Path(args.out), _canonical(graph_document(root)), args.check)
    if args.command == "measure":
        report = measure_queries(root, load_queries(Path(args.queries)))
        print(
            f"mean reduction {report['mean_reduction_percent']}% "
            f"min {report['min_reduction_percent']}% "
            f"tokenizer {TOKENIZER_NAME}"
        )
        for row in report["queries"]:
            mark = "included" if row["expect_included"] else "MISSING"
            print(
                f"  {row['id']}: {row['reduction_percent']}% "
                f"({row['selected_tokens']}/{row['full_tokens']} tokens) expect {mark}"
            )
        return _write_or_check(Path(args.out), _canonical(report), args.check)
    if args.command == "route":
        routed = route_query(root, args.query, max_chars=args.max_chars)
        summary = {
            "cache_hit": routed["cache_hit"],
            "paths": routed["paths"],
            "reduction_percent": routed["reduction_percent"],
            "selected_tokens": routed["selected_tokens"],
            "full_tokens": routed["full_tokens"],
            "subgraph_edges": len(routed["subgraph_edges"]),
        }
        print(_canonical(summary))
        return 0
    queries = load_queries(Path(args.queries))
    if args.execute:
        return execute_accuracy(root, queries)
    status = accuracy_status(queries)
    print(f"status {status['status']} measured={status['measured']}")
    return _write_or_check(Path(args.out), _canonical(status), args.check)


if __name__ == "__main__":
    sys.exit(main())
