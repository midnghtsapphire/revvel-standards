#!/usr/bin/env python3
"""WR-4600 Watchtower harvester.

Daily-cron literature/parts harvester for the Photon Bench. Implements
WR-4600.3-harvest-spec.yml under the WR-4200 contract:

  - NEVER fabricate a URL from a title or a guess. Every URL is either
    returned verbatim by a live call, or deterministically formed from an
    identifier that live call returned (PMID/NCT/DOI -> the provider's
    documented canonical URL). No URL is ever invented. No exceptions.
  - Report DELTA, not "breakthrough". Most days: zero.
  - quiet_day: true is a SUCCESS, recorded and committed.
  - Snapshots are content-hashed and immutable.
  - Untagged row = defect. Every row carries {tag, claim, retrieved_at, sha256}.
  - Run `adverse` FIRST: harm is mandatory-reportable; nulls are not
    publishable; therefore harm is better indexed. Search damage before benefit.

Stdlib only (urllib) — no pip install. Degrades honestly: if a shard's API is
unreachable or needs a key we don't have, the shard records 0 rows with a note.
It never fabricates a row to hit a target.

Usage:
  python tools/harvest.py                 # run due shards, write latest + snapshot
  python tools/harvest.py --shard adverse # force one shard, ignore cadence
  python tools/harvest.py --all           # run every shard, ignore cadence
  python tools/harvest.py --dry-run       # compute, write nothing
  python tools/harvest.py --self-test     # offline unit checks; exit != 0 on fail
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
SNAP_DIR = os.path.join(DATA_DIR, "snapshots")
LATEST = os.path.join(DATA_DIR, "latest.json")

VALID_TAGS = ("PROVEN", "EMERGING", "SPECULATIVE")

# Rows whose text matches a veto class summon a human. These are the ONLY
# triggers for an issue — never a schedule, never "new papers".
FLAG_PATTERNS = {
    "HARM": re.compile(r"\b(adverse|burn|injur|complication|harm|lesion|toxic)", re.I),
    "FLICKER": re.compile(r"\b(seizure|flicker|photosensit|epilep|stroboscop)", re.I),
    "OCULAR": re.compile(r"\b(ocular|retina|eye|corneal|macular)", re.I),
}

# Cadence in days per shard (WR-4600.3). `adverse` and `flicker_harm` daily.
CADENCE = {
    "adverse": 1, "flicker_harm": 1, "dosimetry": 1, "human_trials": 1,
    "textile_light": 3, "gamma_40hz": 3, "mechanism": 3,
    "biomarkers": 7, "regulatory": 7, "bnat_oled": 7,
    "preclinical": 7, "emitters": 7, "drivers": 7, "patents": 7,
    "safety": 7, "standards": 90,
}

# Shards backed by a live, keyless API we can actually call from CI.
# Others (web, patents_bq, digikey, mouser) need credentials — per WR-4200 we
# emit a procurement note and record 0 rows rather than fabricate.
LIVE_SHARDS = {
    "adverse": ("eutils", "(photobiomodulation OR low level laser) AND "
                "(adverse OR burn OR injury OR complication)"),
    "mechanism": ("eutils", "photobiomodulation AND (cytochrome c oxidase OR mitochondria)"),
    "dosimetry": ("eutils", "photobiomodulation AND (fluence OR irradiance OR dosimetry)"),
    "biomarkers": ("eutils", "photobiomodulation AND (cytokine OR biomarker OR gene expression)"),
    "preclinical": ("eutils", "photobiomodulation AND (in vitro OR rodent)"),
    "flicker_harm": ("eutils", "(light OR LED) AND (photosensitive seizure OR flicker vertigo)"),
    "human_trials": ("ctgov", "photobiomodulation OR low level light therapy"),
    "bnat_oled": ("crossref", "wearable OLED photobiomodulation textile patch"),
}

NEEDS_KEY = {"safety", "standards", "patents", "emitters", "drivers",
             "textile_light", "gamma_40hz", "regulatory"}


# --------------------------------------------------------------------------
# Pure helpers (offline-testable — the scripted surface, WR-4200 budget rule)
# --------------------------------------------------------------------------
def canonical_url(url):
    """Normalize a URL for dedup: drop scheme, trailing slash, query, fragment."""
    u = (url or "").strip()
    u = re.sub(r"^https?://", "", u, flags=re.I)
    u = u.split("#", 1)[0].split("?", 1)[0]
    return u.rstrip("/").lower()


def row_id(row):
    """Dedup key: doi || mpn || sha256(canonical_url)."""
    if row.get("doi"):
        return "doi:" + row["doi"].strip().lower()
    if row.get("mpn"):
        return "mpn:" + row["mpn"].strip().lower()
    return "url:" + hashlib.sha256(canonical_url(row.get("url", "")).encode()).hexdigest()


def flags_for(text):
    """Return the sorted veto classes a row's text triggers (HARM/FLICKER/OCULAR)."""
    return sorted(k for k, rx in FLAG_PATTERNS.items() if rx.search(text or ""))


def validate_row(row):
    """A row is a defect unless it has a valid tag, a claim, and a real url."""
    if row.get("tag") not in VALID_TAGS:
        return False, "untagged-or-invalid-tag"
    if not (row.get("claim") or "").strip():
        return False, "empty-claim"
    if not (row.get("url") or "").strip():
        return False, "no-url"
    return True, "ok"


def dedup(rows):
    """Deduplicate by row_id, keeping first occurrence."""
    seen, out = set(), []
    for r in rows:
        rid = row_id(r)
        if rid in seen:
            continue
        seen.add(rid)
        out.append(r)
    return out


def compute_delta(prev_ids, rows):
    """DELTA = rows whose id was not in the previous snapshot. Not 'breakthrough'."""
    prev = set(prev_ids or [])
    return [r for r in rows if row_id(r) not in prev]


def snapshot_hash(rows):
    """Content hash over the row-id set — stable regardless of row order."""
    ids = sorted(row_id(r) for r in rows)
    return hashlib.sha256(json.dumps(ids, separators=(",", ":")).encode()).hexdigest()


# --------------------------------------------------------------------------
# Live fetchers (the only source of URLs — never construct one otherwise)
# --------------------------------------------------------------------------
def _get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "wr4600-watchtower/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "replace")


def fetch_eutils(term, n, api_key=None):
    """NCBI E-utilities esearch. Each returned PMID becomes its documented
    canonical PubMed URL (pubmed.ncbi.nlm.nih.gov/<pmid>/); no esummary call is
    made, so titles/abstracts stay at the source rather than being copied here."""
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    q = {"db": "pubmed", "term": term, "retmax": str(n), "retmode": "json", "sort": "date"}
    if api_key:
        q["api_key"] = api_key
    ids = json.loads(_get(base + "/esearch.fcgi?" + urllib.parse.urlencode(q)))
    idlist = ids.get("esearchresult", {}).get("idlist", [])
    rows = []
    for pmid in idlist:
        # PubMed guarantees this canonical URL for a returned PMID (live id).
        rows.append({
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "claim": f"PubMed record {pmid} (see title/abstract at source)",
            "tag": "EMERGING",  # default; a human/LUMEN upgrades to PROVEN on review
        })
    return rows


def fetch_ctgov(term, n):
    """ClinicalTrials.gov API v2. NCT ids -> canonical study URLs."""
    url = ("https://clinicaltrials.gov/api/v2/studies?"
           + urllib.parse.urlencode({"query.term": term, "pageSize": str(n)}))
    data = json.loads(_get(url))
    rows = []
    for st in data.get("studies", []):
        nct = st.get("protocolSection", {}).get("identificationModule", {}).get("nctId")
        title = st.get("protocolSection", {}).get("identificationModule", {}).get("briefTitle", "")
        if nct:
            rows.append({
                "url": f"https://clinicaltrials.gov/study/{nct}",
                "claim": (title or nct)[:280],
                "tag": "EMERGING",
            })
    return rows


def fetch_crossref(term, n):
    """Crossref works. DOIs come straight from the API response."""
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode(
        {"query": term, "rows": str(n)})
    data = json.loads(_get(url))
    rows = []
    for it in data.get("message", {}).get("items", []):
        doi = it.get("DOI")
        if not doi:
            continue
        title = (it.get("title") or [""])[0]
        rows.append({
            "url": f"https://doi.org/{doi}",
            "doi": doi,
            "claim": (title or doi)[:280],
            "tag": "EMERGING",
        })
    return rows


def run_shard(name, api_key=None):
    """Run one shard. Returns (rows, note). Never raises; degrades honestly."""
    if name in NEEDS_KEY or name not in LIVE_SHARDS:
        return [], f"skipped: {name} needs an API key/credential not present — " \
                   f"procurement item, not fabricated"
    api, term = LIVE_SHARDS[name]
    n = 35
    try:
        if api == "eutils":
            rows = fetch_eutils(term, n, api_key)
        elif api == "ctgov":
            rows = fetch_ctgov(term, n)
        elif api == "crossref":
            rows = fetch_crossref(term, n)
        else:
            return [], f"skipped: unknown api {api}"
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as e:
        return [], f"network-unreachable: {type(e).__name__} — recorded 0 rows, did not pad"
    except (ValueError, KeyError) as e:
        return [], f"parse-error: {type(e).__name__} — recorded 0 rows"
    return dedup(rows), "ok"


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------
def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return default


def harvest(shards, dry_run=False, now=None, api_key=None):
    now = now or datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%d")
    retrieved_at = now.isoformat()
    prev = load_json(LATEST, {"row_ids": []})
    prev_ids = prev.get("row_ids", [])

    all_rows, notes, flagged = [], {}, []
    for name in shards:
        rows, note = run_shard(name, api_key=api_key)
        notes[name] = note
        for r in rows:
            ok, why = validate_row(r)
            if not ok:
                notes[name] = f"row-defect:{why}"
                continue
            r["retrieved_at"] = retrieved_at
            r["sha256"] = hashlib.sha256(canonical_url(r["url"]).encode()).hexdigest()
            r["shard"] = name
            fl = flags_for(r["claim"] + " " + name)
            if fl:
                r["flags"] = fl
                flagged.append(r)
            all_rows.append(r)

    all_rows = dedup(all_rows)
    delta = compute_delta(prev_ids, all_rows)
    quiet_day = len(delta) == 0

    snapshot = {
        "date": stamp,
        "generated_at": retrieved_at,
        "shards_run": list(shards),
        "notes": notes,
        "total_rows": len(all_rows),
        "delta_count": len(delta),
        "flagged_count": len(flagged),
        "quiet_day": quiet_day,
        "content_hash": snapshot_hash(all_rows),
        "row_ids": [row_id(r) for r in all_rows],
        "rows": all_rows,
        "flagged": flagged,
    }

    if not dry_run:
        os.makedirs(SNAP_DIR, exist_ok=True)
        snap_path = os.path.join(SNAP_DIR, f"{stamp}.json")
        # Immutable: a snapshot for a date is written once, never rewritten.
        if not os.path.exists(snap_path):
            with open(snap_path, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2, sort_keys=True)
        with open(LATEST, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, sort_keys=True)

    return snapshot


def due_shards(now=None):
    """A shard is due if today's ordinal is a multiple of its cadence.
    Deterministic (no persisted last-run needed for a daily cron)."""
    now = now or datetime.now(timezone.utc)
    ordinal = now.toordinal()
    due = [s for s, days in CADENCE.items() if ordinal % days == 0]
    # adverse always runs first (harm before benefit).
    due.sort(key=lambda s: (s != "adverse", s))
    return due


# --------------------------------------------------------------------------
# Self-test — offline, deterministic; the grounding gate shells into this.
# --------------------------------------------------------------------------
def self_test():
    checks = []

    def ok(name, cond):
        checks.append((name, bool(cond)))

    ok("canonical strips scheme/slash/case",
       canonical_url("HTTPS://PubMed.gov/123/") == "pubmed.gov/123")
    ok("canonical drops query+fragment",
       canonical_url("http://x.org/a?b=1#f") == "x.org/a")
    ok("row_id prefers doi",
       row_id({"doi": "10.1/AB", "url": "u"}) == "doi:10.1/ab")
    ok("row_id falls back to url hash",
       row_id({"url": "http://x.org/1"}).startswith("url:"))
    ok("dup urls collapse",
       len(dedup([{"url": "http://x/1"}, {"url": "https://x/1/"}])) == 1)
    ok("HARM flag on burn", flags_for("laser burn case report") == ["HARM"])
    ok("FLICKER flag on seizure", "FLICKER" in flags_for("photosensitive seizure"))
    ok("OCULAR flag on retina", "OCULAR" in flags_for("retinal exposure"))
    ok("no flag on benign", flags_for("mitochondrial atp synthesis") == [])
    ok("untagged row is a defect", validate_row({"claim": "c", "url": "u"})[0] is False)
    ok("bad tag is a defect",
       validate_row({"tag": "TRUE", "claim": "c", "url": "u"})[0] is False)
    ok("valid row passes",
       validate_row({"tag": "PROVEN", "claim": "c", "url": "u"})[0] is True)
    ok("no-url row is a defect",
       validate_row({"tag": "PROVEN", "claim": "c"})[0] is False)
    ok("delta finds only new ids",
       len(compute_delta(["url:" + hashlib.sha256(b"x.org/1").hexdigest()],
                         [{"url": "http://x.org/1"}, {"url": "http://x.org/2"}])) == 1)
    ok("snapshot hash order-independent",
       snapshot_hash([{"url": "a"}, {"url": "b"}]) ==
       snapshot_hash([{"url": "b"}, {"url": "a"}]))
    ok("keyed shard degrades, no fabrication",
       run_shard("standards")[0] == [] and "needs an API key" in run_shard("standards")[1])
    ok("due_shards puts adverse first",
       due_shards(datetime(2026, 7, 22, tzinfo=timezone.utc))[0] == "adverse")

    passed = sum(1 for _, c in checks if c)
    for name, c in checks:
        print(f"  {'ok' if c else 'FAIL'} - {name}")
    print(f"harvest self-test: {passed}/{len(checks)} passed")
    return passed == len(checks)


def main(argv=None):
    ap = argparse.ArgumentParser(description="WR-4600 Watchtower harvester")
    ap.add_argument("--shard", help="run one shard, ignore cadence")
    ap.add_argument("--all", action="store_true", help="run every shard")
    ap.add_argument("--dry-run", action="store_true", help="compute, write nothing")
    ap.add_argument("--self-test", action="store_true", help="offline unit checks")
    args = ap.parse_args(argv)

    if args.self_test:
        return 0 if self_test() else 1

    if args.shard:
        shards = [args.shard]
    elif args.all:
        shards = list(CADENCE.keys())
    else:
        shards = due_shards()

    # NCBI grants a higher E-utilities rate limit when a key is presented; the
    # workflow exports it. Absent, we simply run unauthenticated (lower limit).
    api_key = os.environ.get("NCBI_API_KEY") or None
    snap = harvest(shards, dry_run=args.dry_run, api_key=api_key)
    # Machine-readable summary for the workflow to read via outputs.
    print(json.dumps({
        "new": snap["delta_count"],
        "flagged": snap["flagged_count"],
        "quiet": snap["quiet_day"],
        "total": snap["total_rows"],
        "hash": snap["content_hash"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
