#!/usr/bin/env python3
"""graph_context_selector.py — graph-based context selection. WR #18336.
Builds a file graph from the repo, PageRanks from seed terms, emits a
token-budgeted context pack."""
import os, re, sys, json, argparse
from collections import defaultdict

SKIP = {".git", "node_modules", "artifacts", ".venv", "dist", "__pycache__"}
TEXT_EXT = {".py", ".js", ".mjs", ".ts", ".md", ".json", ".yml", ".yaml", ".sh"}

def build_graph(root="."):
    files, edges = [], defaultdict(set)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP]
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            if os.path.splitext(fn)[1] in TEXT_EXT:
                files.append(p)
    fset = set(files)
    for p in files:
        try: src = open(p, errors="replace").read()
        except Exception: continue
        for m in re.findall(r'(?:import|from|require)\(?["\']([\w./-]+)', src):
            for q in fset:
                if m.split("/")[-1] in q:
                    edges[p].add(q); edges[q].add(p)
        # path proximity edge
        for q in fset:
            if q != p and os.path.dirname(q) == os.path.dirname(p):
                edges[p].add(q)
    return files, edges

def pagerank(files, edges, seeds, iters=20, d=0.85):
    pr = {f: (1.0 if any(s.lower() in f.lower() for s in seeds) else 0.0) for f in files}
    norm = sum(pr.values()) or 1.0
    pr = {f: v / norm for f, v in pr.items()}
    for _ in range(iters):
        new = {f: 0.15 / len(files) for f in files}
        for f in files:
            outs = edges.get(f) or set()
            share = pr[f] / len(outs) if outs else 0
            for o in outs: new[o] += d * share
        pr = new
    return pr

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", nargs="+", required=True, help="terms from the WR title/body")
    ap.add_argument("--budget", type=int, default=6000)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    files, edges = build_graph()
    pr = pagerank(files, edges, a.seed)
    ranked = sorted(pr.items(), key=lambda kv: -kv[1])
    pack, tokens = [], 0
    for path, score in ranked:
        if tokens >= a.budget: break
        head = open(path, errors="replace").read()[:2000]
        est = len(head) // 4
        pack.append({"path": path, "score": round(score, 6), "head": head})
        tokens += est
    out = a.out or f"artifacts/context/{'-'.join(a.seed)[:40]}.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"seeds": a.seed, "est_tokens": tokens, "pack": pack}, open(out, "w"), indent=2)
    print(f"✔ {len(pack)} files, ~{tokens} tokens → {out}")

if __name__ == "__main__": main()
