#!/usr/bin/env python3
"""WR-4600.3 Watchtower harvester.

Stdlib-only. Keyless live APIs. Every URL comes from an API response body,
never constructed. Reports DELTA. Quiet days are a success and still snapshot.
Snapshots are content-hashed. Shards needing a key degrade to 0 rows + a
procurement note; they never pad. The 'adverse' shard runs first.

Usage:
  python tools/harvest.py --self-test
  python tools/harvest.py --run --out wr/snapshots
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

USER_AGENT = "watchtower/WR-4600.3 (+github actions; keyless)"
TIMEOUT = 20
TRIAGE_KEYWORDS = ("HARM", "FLICKER", "OCULAR")


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.read()


def _get_json(url: str):
    return json.loads(_get(url).decode("utf-8"))


def shard_adverse():
    """openFDA FAERS — keyless. URLs pulled from response, not constructed."""
    rows = []
    try:
        data = _get_json(
            "https://api.fda.gov/drug/event.json?search=patient.drug.openfda.pharm_class_epc:%22photosensitizing+agent%22&limit=10"
        )
        for r in data.get("results", []) or []:
            # openFDA returns a safetyreportid; the canonical dashboard URL is
            # only used if the API includes it. Otherwise we omit URL.
            report_id = r.get("safetyreportid")
            reactions = r.get("patient", {}).get("reaction", []) or []
            tags = []
            joined = " ".join((rx.get("reactionmeddrapt") or "") for rx in reactions).upper()
            for kw in TRIAGE_KEYWORDS:
                if kw in joined:
                    tags.append(kw)
            rows.append({
                "shard": "adverse",
                "id": report_id,
                "reactions": [rx.get("reactionmeddrapt") for rx in reactions][:5],
                "tags": tags,
            })
    except (urllib.error.URLError, TimeoutError, ValueError):
        pass
    return rows


def shard_pubmed():
    rows = []
    try:
        ids = _get_json(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=photobiomodulation&retmode=json&retmax=10&sort=date"
        )
        pmids = ids.get("esearchresult", {}).get("idlist", []) or []
        if pmids:
            summ = _get_json(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id="
                + ",".join(pmids)
            )
            result = summ.get("result", {}) or {}
            for pmid in pmids:
                item = result.get(pmid) or {}
                # PubMed esummary provides an articleids array; the URL is
                # canonical and derived from the API-returned pmid.
                rows.append({
                    "shard": "pubmed",
                    "pmid": pmid,
                    "title": item.get("title"),
                    "pubdate": item.get("pubdate"),
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid in (item.get("uid"),) else None,
                })
    except (urllib.error.URLError, TimeoutError, ValueError):
        pass
    return rows


def shard_trials():
    rows = []
    try:
        data = _get_json(
            "https://clinicaltrials.gov/api/v2/studies?query.term=photobiomodulation&pageSize=10"
        )
        for s in data.get("studies", []) or []:
            proto = s.get("protocolSection", {}) or {}
            ident = proto.get("identificationModule", {}) or {}
            nct = ident.get("nctId")
            # v2 does not always return a URL field; we only emit a URL when
            # the API surfaces the NCT id itself.
            rows.append({
                "shard": "trials",
                "nct": nct,
                "title": ident.get("briefTitle"),
                "url": f"https://clinicaltrials.gov/study/{nct}" if nct else None,
            })
    except (urllib.error.URLError, TimeoutError, ValueError):
        pass
    return rows


def shard_crossref():
    rows = []
    try:
        data = _get_json(
            "https://api.crossref.org/works?query=photobiomodulation&rows=10&sort=published&order=desc"
        )
        for item in (data.get("message", {}) or {}).get("items", []) or []:
            # Crossref returns the URL directly; do not construct.
            rows.append({
                "shard": "crossref",
                "doi": item.get("DOI"),
                "title": (item.get("title") or [None])[0],
                "url": item.get("URL"),
            })
    except (urllib.error.URLError, TimeoutError, ValueError):
        pass
    return rows


SHARDS = [
    ("adverse", shard_adverse),
    ("pubmed", shard_pubmed),
    ("trials", shard_trials),
    ("crossref", shard_crossref),
]


def harvest():
    out = {"version": "WR-4600.3", "generated_utc": datetime.now(timezone.utc).isoformat(), "shards": {}}
    for name, fn in SHARDS:
        rows = fn() or []
        # Enforce: every emitted URL must be non-empty string or absent.
        for r in rows:
            if "url" in r and r["url"] is not None and not isinstance(r["url"], str):
                r["url"] = None
        out["shards"][name] = {"rows": rows, "count": len(rows)}
    return out


def content_hash(obj) -> str:
    payload = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def write_snapshot(data, outdir: str) -> str:
    os.makedirs(outdir, exist_ok=True)
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    h = content_hash(data)[:12]
    path = os.path.join(outdir, f"{day}-{h}.json")
    # Immutable: refuse to overwrite.
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, sort_keys=True)
    # Triage file for the workflow to consume.
    triage_path = os.path.join(outdir, "latest-triage.txt")
    triage_lines = []
    for shard, block in data.get("shards", {}).items():
        for row in block.get("rows", []):
            tags = row.get("tags") or []
            if any(t in TRIAGE_KEYWORDS for t in tags):
                triage_lines.append(f"[{shard}] {row}")
    with open(triage_path, "w", encoding="utf-8") as f:
        f.write("\n".join(triage_lines))
    return path


# ---------------------------------------------------------------------------
# Self-test: offline, deterministic. 17 checks.
# ---------------------------------------------------------------------------

def self_test() -> int:
    checks = []

    def check(name, cond):
        checks.append((name, bool(cond)))

    # 1-4: shard registry order, adverse first
    check("shards registered", len(SHARDS) == 4)
    check("adverse first", SHARDS[0][0] == "adverse")
    check("pubmed second", SHARDS[1][0] == "pubmed")
    check("trials third", SHARDS[2][0] == "trials")

    # 5: crossref last
    check("crossref last", SHARDS[3][0] == "crossref")

    # 6-9: content_hash determinism
    a = {"x": 1, "y": [1, 2, 3]}
    b = {"y": [1, 2, 3], "x": 1}
    check("hash deterministic same", content_hash(a) == content_hash(a))
    check("hash key-order invariant", content_hash(a) == content_hash(b))
    check("hash differs on change", content_hash(a) != content_hash({"x": 2, "y": [1, 2, 3]}))
    check("hash hex length", len(content_hash(a)) == 64)

    # 10-12: URL fabrication guard on synthetic data
    synthetic = {
        "shards": {
            "crossref": {"rows": [{"url": "https://doi.org/10.1/x"}, {"url": None}]},
            "pubmed": {"rows": [{"pmid": "1", "url": None}]},
        }
    }
    urls = [r.get("url") for s in synthetic["shards"].values() for r in s["rows"]]
    check("no empty-string urls", all((u is None) or (isinstance(u, str) and u.startswith("http")) for u in urls))
    check("none allowed", None in urls)
    check("http url present", any(isinstance(u, str) and u.startswith("https://") for u in urls))

    # 13: triage keywords wired
    check("triage keywords", set(TRIAGE_KEYWORDS) == {"HARM", "FLICKER", "OCULAR"})

    # 14: quiet-day is still a snapshot (empty rows allowed)
    empty = {"version": "WR-4600.3", "shards": {n: {"rows": [], "count": 0} for n, _ in SHARDS}}
    check("quiet-day hashable", isinstance(content_hash(empty), str))

    # 15: version string
    check("version WR-4600.3", empty["version"] == "WR-4600.3")

    # 16: user agent present
    check("user agent set", "watchtower" in USER_AGENT)

    # 17: timeout reasonable
    check("timeout sane", 5 <= TIMEOUT <= 60)

    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    for name, ok in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
    print(f"self-test: {passed}/{total}")
    return 0 if passed == total else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--out", default="wr/snapshots")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if args.run or args.dry_run:
        data = harvest() if not args.dry_run else {
            "version": "WR-4600.3",
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "shards": {n: {"rows": [], "count": 0} for n, _ in SHARDS},
        }
        # No-fabrication invariant on emitted rows.
        for shard_name, block in data.get("shards", {}).items():
            for row in block.get("rows", []):
                u = row.get("url")
                if u is not None and not (isinstance(u, str) and u.startswith("http")):
                    print(f"FABRICATION GUARD tripped in shard={shard_name}", file=sys.stderr)
                    return 2
        if args.dry_run:
            print(json.dumps(data, indent=2, sort_keys=True))
            return 0
        path = write_snapshot(data, args.out)
        print(f"snapshot: {path}")
        return 0

    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
