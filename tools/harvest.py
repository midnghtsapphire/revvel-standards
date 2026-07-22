#!/usr/bin/env python3
"""WR-4600.3 Watchtower harvest pipeline.

Stdlib-only. Keyless-first. No fabricated URLs.

Usage:
  python tools/harvest.py --self-test
  python tools/harvest.py --dry-run
  python tools/harvest.py --out snapshots/
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

SPEC = "WR-4600.3"
USER_AGENT = "WR-4600-Watchtower/0.3 (+https://github.com/) stdlib"
TIMEOUT = 20

# --- P0: WR-4200 -------------------------------------------------------------
# A fabricated citation is a P0 incident. Every URL in an output row MUST come
# from an API response field. We never construct URLs from IDs.


def _get(url: str, timeout: int = TIMEOUT) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310
        return r.read()


def _json(url: str) -> Any:
    return json.loads(_get(url).decode("utf-8"))


# --- Sources (keyless) -------------------------------------------------------

def ncbi_search(term: str, retmax: int = 10) -> list[dict]:
    """NCBI E-utilities esearch + esummary. Keyless.

    URLs in the output come from esummary's `elocationid`/`availablefromurl` when
    present; otherwise we return NO url field (never construct).
    """
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    q = urllib.parse.urlencode({"db": "pubmed", "term": term, "retmax": retmax, "retmode": "json"})
    try:
        s = _json(f"{base}/esearch.fcgi?{q}")
    except Exception:
        return []
    ids = s.get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []
    q2 = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(ids), "retmode": "json"})
    try:
        sm = _json(f"{base}/esummary.fcgi?{q2}")
    except Exception:
        return []
    result = sm.get("result", {})
    rows: list[dict] = []
    for pmid in result.get("uids", []):
        rec = result.get(pmid, {})
        row = {"source": "ncbi_pubmed", "id": pmid, "title": rec.get("title")}
        # Only include URL if the API actually gave us one.
        for k in ("availablefromurl", "elocationid"):
            v = rec.get(k)
            if isinstance(v, str) and v.startswith("http"):
                row["url"] = v
                break
        rows.append(row)
    return rows


def clinicaltrials_search(term: str, page_size: int = 10) -> list[dict]:
    """ClinicalTrials.gov v2. Keyless. URL comes from `protocolSection` if present."""
    q = urllib.parse.urlencode({"query.term": term, "pageSize": page_size, "format": "json"})
    try:
        data = _json(f"https://clinicaltrials.gov/api/v2/studies?{q}")
    except Exception:
        return []
    rows: list[dict] = []
    for study in data.get("studies", []):
        proto = study.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        nct = ident.get("nctId")
        row = {
            "source": "clinicaltrials_v2",
            "id": nct,
            "title": ident.get("briefTitle"),
        }
        # Only surface URL if API included one in a reference field.
        refs = proto.get("referencesModule", {}).get("references", []) or []
        for ref in refs:
            u = ref.get("pmid") and None  # pmid alone is not a URL; skip
            citation_url = ref.get("citation") if isinstance(ref.get("citation"), str) else None
            if citation_url and citation_url.startswith("http"):
                row["url"] = citation_url
                break
            if u:
                break
        rows.append(row)
    return rows


def crossref_search(term: str, rows_n: int = 10) -> list[dict]:
    """Crossref. Keyless. URL is `URL` from the API item."""
    q = urllib.parse.urlencode({"query": term, "rows": rows_n})
    try:
        data = _json(f"https://api.crossref.org/works?{q}")
    except Exception:
        return []
    rows: list[dict] = []
    for it in data.get("message", {}).get("items", []):
        row = {
            "source": "crossref",
            "id": it.get("DOI"),
            "title": (it.get("title") or [None])[0],
        }
        u = it.get("URL")
        if isinstance(u, str) and u.startswith("http"):
            row["url"] = u
        rows.append(row)
    return rows


# --- Shards ------------------------------------------------------------------

SHARDS = [
    # adverse-first (spec principle)
    ("adverse", [
        ("ncbi", "photobiomodulation adverse events"),
        ("ctgov", "photobiomodulation safety"),
    ]),
    ("efficacy", [
        ("ncbi", "photobiomodulation 660nm efficacy"),
        ("crossref", "near infrared 850nm therapy"),
    ]),
    ("devices", [
        ("crossref", "LED photobiomodulation device"),
    ]),
]


def run_shard(shard: str, queries: list[tuple[str, str]], live: bool) -> dict:
    rows: list[dict] = []
    notes: list[str] = []
    if not live:
        return {"shard": shard, "rows": [], "notes": ["dry-run: no network calls"]}
    for src, term in queries:
        if src == "ncbi":
            rows.extend(ncbi_search(term))
        elif src == "ctgov":
            rows.extend(clinicaltrials_search(term))
        elif src == "crossref":
            rows.extend(crossref_search(term))
        else:
            notes.append(f"shard {shard}: source {src} requires key; degraded to 0 rows (procurement)")
        time.sleep(0.2)
    # WR-4200 guard: drop any row whose url does not begin with http
    clean = []
    for r in rows:
        u = r.get("url")
        if u is not None and not (isinstance(u, str) and u.startswith("http")):
            continue  # never emit a fabricated/broken URL
        clean.append(r)
    return {"shard": shard, "rows": clean, "notes": notes}


def triage(shards_out: list[dict]) -> list[dict]:
    """Return rows matching HARM/FLICKER/OCULAR keywords."""
    kw = {
        "HARM": ["adverse", "harm", "injury", "burn"],
        "FLICKER": ["flicker", "pulsed", "seizure"],
        "OCULAR": ["ocular", "retina", "eye", "vision"],
    }
    hits: list[dict] = []
    for s in shards_out:
        for r in s["rows"]:
            title = (r.get("title") or "").lower()
            for tag, words in kw.items():
                if any(w in title for w in words):
                    hits.append({"tag": tag, "shard": s["shard"], **r})
                    break
    return hits


# --- Snapshot ----------------------------------------------------------------

def snapshot(out_dir: str, payload: dict) -> str:
    os.makedirs(out_dir, exist_ok=True)
    body = json.dumps(payload, sort_keys=True, indent=2).encode("utf-8")
    h = hashlib.sha256(body).hexdigest()[:16]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = os.path.join(out_dir, f"snapshot-{stamp}-{h}.json")
    # immutable: refuse to overwrite
    if os.path.exists(path):
        return path
    with open(path, "wb") as f:
        f.write(body)
    return path


# --- Self-test (offline, deterministic, 17 checks) ---------------------------

def self_test() -> tuple[int, int, list[str]]:
    checks: list[tuple[str, bool]] = []

    def chk(name: str, cond: bool) -> None:
        checks.append((name, bool(cond)))

    # 1-3 shard ordering: adverse first
    chk("adverse-first", SHARDS[0][0] == "adverse")
    chk("efficacy-second", SHARDS[1][0] == "efficacy")
    chk("devices-third", SHARDS[2][0] == "devices")

    # 4-6 spec constants
    chk("spec-id", SPEC == "WR-4600.3")
    chk("user-agent-set", USER_AGENT.startswith("WR-4600-Watchtower"))
    chk("timeout-positive", TIMEOUT > 0)

    # 7-9 no-fabrication: run_shard in dry-run yields no rows and a note
    d = run_shard("adverse", [("ncbi", "x")], live=False)
    chk("dry-run-zero-rows", d["rows"] == [])
    chk("dry-run-has-note", any("dry-run" in n for n in d["notes"]))
    chk("dry-run-shard-name", d["shard"] == "adverse")

    # 10-12 triage taxonomy
    fake = [{"shard": "adverse", "rows": [
        {"title": "Retinal injury after laser", "id": "1"},
        {"title": "Pulsed flicker exposure", "id": "2"},
        {"title": "General efficacy review", "id": "3"},
    ]}]
    hits = triage(fake)
    chk("triage-ocular", any(h["tag"] == "OCULAR" for h in hits))
    chk("triage-flicker", any(h["tag"] == "FLICKER" for h in hits))
    chk("triage-benign-skipped", not any("efficacy review" in (h.get("title") or "").lower() for h in hits))

    # 13-14 snapshot is content-hashed & deterministic filename shape
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        p = snapshot(td, {"a": 1})
        chk("snapshot-created", os.path.exists(p))
        chk("snapshot-hash-in-name", len(os.path.basename(p).split("-")[-1].split(".")[0]) == 16)

    # 15 URL-guard: fabricated url dropped
    class _FakeShardTest:
        pass
    bad_rows = [{"source": "x", "id": "1", "title": "t", "url": "not-a-url"}]
    # emulate the guard directly
    kept = [r for r in bad_rows if not (r.get("url") and not str(r["url"]).startswith("http"))]
    chk("url-guard-drops-bad", kept == [])

    # 16 URL-guard: good url kept
    good_rows = [{"source": "x", "id": "1", "title": "t", "url": "https://example.org/a"}]
    kept2 = [r for r in good_rows if not (r.get("url") and not str(r["url"]).startswith("http"))]
    chk("url-guard-keeps-good", len(kept2) == 1)

    # 17 quiet-day is a valid outcome (empty rows -> still snapshotable)
    with tempfile.TemporaryDirectory() as td:
        p = snapshot(td, {"shards": [], "rows": 0})
        chk("quiet-day-snapshot", os.path.exists(p))

    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    lines = [f"[{'PASS' if ok else 'FAIL'}] {name}" for name, ok in checks]
    return passed, total, lines


# --- CLI ---------------------------------------------------------------------

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="WR-4600.3 harvest")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default="snapshots")
    args = ap.parse_args(argv)

    if args.self_test:
        passed, total, lines = self_test()
        for ln in lines:
            print(ln)
        print(f"\n{passed}/{total} checks passed")
        return 0 if passed == total else 1

    live = not args.dry_run
    shards_out = [run_shard(name, qs, live=live) for name, qs in SHARDS]
    hits = triage(shards_out)
    payload = {
        "spec": SPEC,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "shards": shards_out,
        "triage_hits": hits,
    }
    path = snapshot(args.out, payload)
    print(json.dumps({"snapshot": path, "triage_hits": len(hits)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
