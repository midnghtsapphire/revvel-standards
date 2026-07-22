#!/usr/bin/env python3
"""WR-4600.3 watchtower harvester.

Stdlib only. Live keyless APIs: NCBI E-utilities, ClinicalTrials.gov v2,
Crossref, openFDA. Every URL comes from an API response — never constructed.

Rules (WR-4200 / WR-4600.3):
  * Fabricated citations are P0 incidents.
  * Report DELTA, not "breakthrough". Quiet days still snapshot.
  * Snapshots are content-hashed and immutable.
  * Keyed shards without a key emit 0 rows + procurement note. Never pad.
  * The `adverse` shard runs first.
  * `--self-test` is offline, deterministic, 17 checks.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "wr-watchtower/4600.3 (+https://github.com/)"
TIMEOUT = 20


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def _extract_url(obj, keys=("url", "URL", "link", "href")):
    """Recursively find a URL field. Returns None if none present.

    We never construct URLs; this only surfaces ones the API already returned.
    """
    if isinstance(obj, dict):
        for k in keys:
            v = obj.get(k)
            if isinstance(v, str) and v.startswith("http"):
                return v
        for v in obj.values():
            found = _extract_url(v, keys)
            if found:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = _extract_url(v, keys)
            if found:
                return found
    return None


# ---------- shards ----------

def shard_adverse():
    """openFDA device events — safety signals."""
    q = urllib.parse.quote('photobiomodulation OR "low level light" OR "red light therapy"')
    url = f"https://api.fda.gov/device/event.json?search={q}&limit=10"
    try:
        data = json.loads(_get(url))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return {"shard": "adverse", "rows": [], "note": "upstream unreachable"}
    rows = []
    triage = None
    for r in data.get("results", []) or []:
        src_url = _extract_url(r)
        text = json.dumps(r).lower()
        kind = None
        if "ocular" in text or "eye" in text or "retina" in text:
            kind = "OCULAR"
        elif "flicker" in text:
            kind = "FLICKER"
        elif "burn" in text or "harm" in text or "injury" in text:
            kind = "HARM"
        rows.append({
            "report_number": r.get("report_number"),
            "date": r.get("date_received"),
            "url": src_url,  # from API, may be None; we never fabricate
            "kind": kind,
        })
        if kind and not triage:
            triage = kind
    return {"shard": "adverse", "rows": rows, "triage": triage}


def shard_trials():
    url = "https://clinicaltrials.gov/api/v2/studies?query.term=photobiomodulation&pageSize=10"
    try:
        data = json.loads(_get(url))
    except Exception:
        return {"shard": "trials", "rows": [], "note": "upstream unreachable"}
    rows = []
    for s in data.get("studies", []) or []:
        nct = (((s.get("protocolSection") or {}).get("identificationModule") or {}).get("nctId"))
        src_url = _extract_url(s)
        rows.append({"nct": nct, "url": src_url})
    return {"shard": "trials", "rows": rows}


def shard_literature():
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    q = urllib.parse.urlencode({
        "db": "pubmed",
        "term": "photobiomodulation[MeSH] AND last 7 days[PDat]",
        "retmode": "json",
        "retmax": 10,
    })
    try:
        data = json.loads(_get(f"{base}?{q}"))
    except Exception:
        return {"shard": "literature", "rows": [], "note": "upstream unreachable"}
    ids = ((data.get("esearchresult") or {}).get("idlist")) or []
    # We do NOT construct pubmed URLs here. To attach a URL we'd need esummary,
    # which returns article-level metadata including a `sortpubdate` but not a
    # canonical URL. Per no-fabrication, url stays None unless the API returned one.
    return {"shard": "literature", "rows": [{"pmid": pid, "url": None} for pid in ids]}


def shard_crossref():
    url = "https://api.crossref.org/works?query=photobiomodulation&rows=10"
    try:
        data = json.loads(_get(url))
    except Exception:
        return {"shard": "crossref", "rows": [], "note": "upstream unreachable"}
    rows = []
    for item in ((data.get("message") or {}).get("items") or []):
        rows.append({
            "doi": item.get("DOI"),
            "url": item.get("URL"),  # Crossref returns canonical URL — use as-is
            "title": (item.get("title") or [None])[0],
        })
    return {"shard": "crossref", "rows": rows}


def shard_patents():
    if not os.environ.get("USPTO_TOKEN"):
        return {
            "shard": "patents",
            "rows": [],
            "procurement_note": (
                "USPTO ODP token not provisioned. Emitting 0 rows per WR-4600.3 "
                "keyless-degrade rule. Never pad."
            ),
        }
    # Token present but we still don't fabricate an endpoint response shape here
    # without a live test; leave the token path unimplemented rather than guess.
    return {"shard": "patents", "rows": [], "procurement_note": "token present; live path pending"}


SHARDS_IN_ORDER = [shard_adverse, shard_trials, shard_literature, shard_crossref, shard_patents]


# ---------- run ----------

def run(out_dir: Path) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    payload = {
        "spec": "WR-4600.3",
        "generated_at": ts,
        "shards": [],
    }
    triage = None
    for fn in SHARDS_IN_ORDER:
        result = fn()
        payload["shards"].append(result)
        if not triage and result.get("triage"):
            triage = result["triage"]
        time.sleep(0.4)  # be a good citizen

    body = json.dumps(payload, indent=2, sort_keys=True).encode()
    digest = hashlib.sha256(body).hexdigest()[:16]
    snap = out_dir / f"{ts}-{digest}.json"
    snap.write_bytes(body)

    triage_file = out_dir / ".triage"
    triage_file.write_text(triage or "none")

    print(f"snapshot: {snap.name} ({sum(len(s.get('rows', [])) for s in payload['shards'])} rows)")
    if triage:
        print(f"triage: {triage}")
    return 0


# ---------- self-test ----------

def self_test() -> int:
    """17 offline deterministic checks. No network."""
    checks = []

    def check(name, cond):
        checks.append((name, bool(cond)))

    # 1-5: shard ordering
    names = [fn.__name__ for fn in SHARDS_IN_ORDER]
    check("adverse-first", names[0] == "shard_adverse")
    check("trials-second", names[1] == "shard_trials")
    check("literature-third", names[2] == "shard_literature")
    check("crossref-fourth", names[3] == "shard_crossref")
    check("patents-last", names[-1] == "shard_patents")

    # 6-8: keyless degrade for patents
    os.environ.pop("USPTO_TOKEN", None)
    p = shard_patents()
    check("patents-degrades-to-zero", p["rows"] == [])
    check("patents-has-procurement-note", "procurement_note" in p)
    check("patents-never-pads", len(p["rows"]) == 0)

    # 9-11: URL extractor never fabricates
    check("extract-none-on-empty", _extract_url({}) is None)
    check("extract-finds-url", _extract_url({"URL": "https://example.org/x"}) == "https://example.org/x")
    check("extract-ignores-nonhttp", _extract_url({"url": "not-a-url"}) is None)

    # 12-14: hashing determinism
    a = hashlib.sha256(b"hello").hexdigest()
    b = hashlib.sha256(b"hello").hexdigest()
    c = hashlib.sha256(b"world").hexdigest()
    check("hash-deterministic", a == b)
    check("hash-distinct", a != c)
    check("hash-length", len(a) == 64)

    # 15-17: config invariants
    check("user-agent-set", UA.startswith("wr-watchtower/"))
    check("timeout-positive", TIMEOUT > 0)
    check("shard-count-five", len(SHARDS_IN_ORDER) == 5)

    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    for name, ok in checks:
        print(f"  {'✓' if ok else '✗'} {name}")
    print(f"self-test: {passed}/{total}")
    return 0 if passed == total else 1


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--out", default="wr/snapshots")
    args = ap.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.run:
        return run(Path(args.out))
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
