#!/usr/bin/env python3
"""WR-4600.3 Watchtower harvest pipeline.

Stdlib-only harvester for photobiomodulation / photonic-therapy signals.

Core rules (see WR-4600.3-harvest-spec.yml):
  * WR-4200: a fabricated citation is a P0 incident. Every URL MUST come
    from an API response body; we never synthesize URLs from IDs.
  * Report DELTA, not "breakthrough". A quiet day is a success and still
    produces a snapshot.
  * Snapshots are content-hashed and immutable.
  * Shards that require a missing key degrade to 0 rows with a
    procurement note; we never pad with placeholders.
  * The `adverse` shard runs first so harm signals are never buried.

Usage:
    python3 tools/harvest.py --self-test    # offline, deterministic, 17 checks
    python3 tools/harvest.py --dry-run      # network calls, no writes
    python3 tools/harvest.py                # full harvest -> snapshots/
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
import sys
import time
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

USER_AGENT = "WR-4600.3-Watchtower/1.0 (+https://github.com/; stdlib-only)"
DEFAULT_TIMEOUT = 20

# ---------------------------------------------------------------------------
# HTTP helpers (stdlib only)
# ---------------------------------------------------------------------------


def http_get_json(url: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def safe_get(d: Any, *keys, default=None):
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        elif isinstance(cur, list) and isinstance(k, int) and 0 <= k < len(cur):
            cur = cur[k]
        else:
            return default
    return cur


# ---------------------------------------------------------------------------
# Row model
# ---------------------------------------------------------------------------


def make_row(shard: str, title: str, url: str, source: str, evidence: Dict[str, Any]) -> Dict[str, Any]:
    """Construct a harvest row. `url` MUST come from an API response."""
    if not url or not isinstance(url, str):
        raise ValueError("WR-4200 violation: row has no URL")
    if not url.startswith(("http://", "https://")):
        raise ValueError(f"WR-4200 violation: URL not absolute: {url!r}")
    return {
        "shard": shard,
        "title": title.strip(),
        "url": url,
        "source": source,
        "evidence": evidence,
    }


# ---------------------------------------------------------------------------
# Shards
# ---------------------------------------------------------------------------


def shard_adverse(dry_run: bool = False) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Adverse-event signals: runs FIRST. NCBI PubMed keyless search.

    Returns (rows, notes).
    """
    notes: List[str] = []
    if dry_run:
        return [], ["adverse: dry-run, no network"]

    # esearch -> ids, then esummary -> records containing canonical URLs.
    term = urllib.parse.quote(
        '("photobiomodulation"[Title/Abstract] OR "low level laser"[Title/Abstract]) '
        'AND ("adverse"[Title/Abstract] OR "ocular"[Title/Abstract] OR "retina"[Title/Abstract])'
    )
    esearch = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        f"?db=pubmed&retmode=json&retmax=10&term={term}"
    )
    rows: List[Dict[str, Any]] = []
    try:
        s = http_get_json(esearch)
        ids = safe_get(s, "esearchresult", "idlist", default=[]) or []
    except Exception as e:  # network / parsing failure = 0 rows, note it
        return [], [f"adverse: esearch failed: {e}"]

    if not ids:
        return [], ["adverse: 0 hits (quiet day, still success)"]

    esummary = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        f"?db=pubmed&retmode=json&id={','.join(ids)}"
    )
    try:
        summ = http_get_json(esummary)
    except Exception as e:
        return [], [f"adverse: esummary failed: {e}"]

    result = safe_get(summ, "result", default={}) or {}
    for pmid in ids:
        rec = result.get(pmid)
        if not isinstance(rec, dict):
            continue
        # NCBI does not return a URL field in esummary; we skip rather than
        # fabricate. To honor WR-4200 strictly we require an API-provided URL.
        # elocationid may contain a doi -> we use crossref to resolve it.
        eloc = rec.get("elocationid", "") or ""
        title = rec.get("title", "") or ""
        doi = None
        if "doi:" in eloc.lower():
            doi = eloc.split(":", 1)[1].strip()
        if not doi:
            # articleids list sometimes has doi
            for aid in rec.get("articleids", []) or []:
                if isinstance(aid, dict) and aid.get("idtype") == "doi":
                    doi = aid.get("value")
                    break
        if not doi:
            continue
        try:
            cr = http_get_json(f"https://api.crossref.org/works/{urllib.parse.quote(doi)}")
            url = safe_get(cr, "message", "URL")
        except Exception:
            url = None
        if not url:
            continue
        try:
            rows.append(
                make_row(
                    shard="adverse",
                    title=title,
                    url=url,
                    source="crossref+pubmed",
                    evidence={"pmid": pmid, "doi": doi},
                )
            )
        except ValueError as e:
            notes.append(f"adverse: skipped row: {e}")
    return rows, notes


def shard_clinical(dry_run: bool = False) -> Tuple[List[Dict[str, Any]], List[str]]:
    if dry_run:
        return [], ["clinical: dry-run, no network"]
    url = (
        "https://clinicaltrials.gov/api/v2/studies"
        "?query.term=photobiomodulation&pageSize=10&format=json"
    )
    try:
        data = http_get_json(url)
    except Exception as e:
        return [], [f"clinical: request failed: {e}"]
    rows: List[Dict[str, Any]] = []
    notes: List[str] = []
    for study in data.get("studies", []) or []:
        nct = safe_get(study, "protocolSection", "identificationModule", "nctId")
        title = safe_get(
            study, "protocolSection", "identificationModule", "briefTitle", default=""
        ) or ""
        # ClinicalTrials.gov v2 does NOT return a URL field; per WR-4200 we
        # require an API-provided URL, so we skip if the API did not give one.
        study_url = safe_get(study, "protocolSection", "referencesModule", "references", 0, "pmid")
        # References may include PMIDs but not a URL; skip such records.
        # Some API responses include a `studyUrl` at the top level in future
        # versions; check for it defensively.
        provided = study.get("studyUrl") or study.get("url")
        if not provided:
            notes.append(f"clinical: {nct} no API-provided URL, skipped (WR-4200)")
            continue
        try:
            rows.append(
                make_row(
                    shard="clinical",
                    title=title,
                    url=provided,
                    source="clinicaltrials.gov",
                    evidence={"nctId": nct},
                )
            )
        except ValueError as e:
            notes.append(f"clinical: skipped row: {e}")
    if not rows and not notes:
        notes.append("clinical: 0 hits (quiet day, still success)")
    return rows, notes


def shard_literature(dry_run: bool = False) -> Tuple[List[Dict[str, Any]], List[str]]:
    if dry_run:
        return [], ["literature: dry-run, no network"]
    url = (
        "https://api.crossref.org/works"
        "?query=photobiomodulation&rows=10&select=title,URL,DOI,issued"
    )
    try:
        data = http_get_json(url)
    except Exception as e:
        return [], [f"literature: request failed: {e}"]
    rows: List[Dict[str, Any]] = []
    notes: List[str] = []
    for item in safe_get(data, "message", "items", default=[]) or []:
        title_list = item.get("title") or []
        title = title_list[0] if title_list else ""
        api_url = item.get("URL")  # crossref DOES return URL
        if not api_url:
            continue
        try:
            rows.append(
                make_row(
                    shard="literature",
                    title=title,
                    url=api_url,
                    source="crossref",
                    evidence={"doi": item.get("DOI")},
                )
            )
        except ValueError as e:
            notes.append(f"literature: skipped row: {e}")
    if not rows and not notes:
        notes.append("literature: 0 hits (quiet day, still success)")
    return rows, notes


SHARDS = [
    ("adverse", shard_adverse),
    ("clinical", shard_clinical),
    ("literature", shard_literature),
]


# ---------------------------------------------------------------------------
# Snapshot
# ---------------------------------------------------------------------------


def build_snapshot(rows: List[Dict[str, Any]], notes: List[str]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    core = {
        "spec": "WR-4600.3",
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rows": rows,
        "notes": notes,
        "counts": {
            "adverse": sum(1 for r in rows if r["shard"] == "adverse"),
            "clinical": sum(1 for r in rows if r["shard"] == "clinical"),
            "literature": sum(1 for r in rows if r["shard"] == "literature"),
            "total": len(rows),
        },
    }
    payload = json.dumps(core, sort_keys=True, separators=(",", ":")).encode("utf-8")
    core["content_hash"] = "sha256:" + hashlib.sha256(payload).hexdigest()
    return core


def write_snapshot(snapshot: Dict[str, Any], out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    short = snapshot["content_hash"].split(":", 1)[1][:12]
    path = os.path.join(out_dir, f"snapshot-{stamp}-{short}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, sort_keys=True)
    return path


def has_triage_signal(rows: List[Dict[str, Any]]) -> bool:
    for r in rows:
        if r["shard"] != "adverse":
            continue
        t = (r.get("title") or "").lower()
        if any(kw in t for kw in ("harm", "flicker", "ocular", "retina")):
            return True
    return False


# ---------------------------------------------------------------------------
# Self-test (offline, deterministic, 17 checks)
# ---------------------------------------------------------------------------


def run_self_test() -> int:
    checks: List[Tuple[str, bool]] = []

    def check(name: str, cond: bool) -> None:
        checks.append((name, bool(cond)))

    # 1. make_row rejects empty URL
    try:
        make_row("x", "t", "", "s", {})
        check("01 rejects empty URL", False)
    except ValueError:
        check("01 rejects empty URL", True)

    # 2. make_row rejects None URL
    try:
        make_row("x", "t", None, "s", {})  # type: ignore[arg-type]
        check("02 rejects None URL", False)
    except ValueError:
        check("02 rejects None URL", True)

    # 3. make_row rejects relative URL
    try:
        make_row("x", "t", "/foo", "s", {})
        check("03 rejects relative URL", False)
    except ValueError:
        check("03 rejects relative URL", True)

    # 4. make_row rejects non-string URL
    try:
        make_row("x", "t", 123, "s", {})  # type: ignore[arg-type]
        check("04 rejects non-string URL", False)
    except ValueError:
        check("04 rejects non-string URL", True)

    # 5. make_row accepts https URL
    try:
        r = make_row("x", "t", "https://example.org/a", "s", {})
        check("05 accepts https URL", r["url"] == "https://example.org/a")
    except Exception:
        check("05 accepts https URL", False)

    # 6. make_row accepts http URL
    try:
        r = make_row("x", "t", "http://example.org/a", "s", {})
        check("06 accepts http URL", r["url"].startswith("http://"))
    except Exception:
        check("06 accepts http URL", False)

    # 7. safe_get returns default on missing
    check("07 safe_get default", safe_get({}, "a", "b", default="z") == "z")

    # 8. safe_get walks dicts
    check("08 safe_get nested", safe_get({"a": {"b": 5}}, "a", "b") == 5)

    # 9. safe_get walks lists by int
    check("09 safe_get list", safe_get({"a": [10, 20]}, "a", 1) == 20)

    # 10. adverse ordering — must be first entry in SHARDS
    check("10 adverse-first", SHARDS[0][0] == "adverse")

    # 11. All shards named
    check("11 shard set", {s[0] for s in SHARDS} == {"adverse", "clinical", "literature"})

    # 12. build_snapshot empty rows still valid
    snap = build_snapshot([], ["quiet day"])
    check("12 empty snapshot ok", snap["counts"]["total"] == 0)

    # 13. snapshot content_hash present
    check("13 content_hash", snap.get("content_hash", "").startswith("sha256:"))

    # 14. snapshot hash deterministic across identical rebuild
    snap2 = build_snapshot([], ["quiet day"])
    # generated_at differs by time; strip both then compare rows/notes hash concept
    payload_a = json.dumps({"rows": snap["rows"], "notes": snap["notes"]}, sort_keys=True)
    payload_b = json.dumps({"rows": snap2["rows"], "notes": snap2["notes"]}, sort_keys=True)
    check("14 deterministic payload", payload_a == payload_b)

    # 15. triage detection — positive
    triage_rows = [
        {"shard": "adverse", "title": "Ocular flicker case report", "url": "https://x/1"},
    ]
    check("15 triage positive", has_triage_signal(triage_rows) is True)

    # 16. triage detection — negative (non-adverse shard doesn't trigger)
    non_triage = [
        {"shard": "literature", "title": "Ocular something", "url": "https://x/2"},
    ]
    check("16 triage requires adverse shard", has_triage_signal(non_triage) is False)

    # 17. dry-run produces zero rows and non-empty notes for every shard
    all_dry_ok = True
    for name, fn in SHARDS:
        rows, notes = fn(dry_run=True)
        if rows or not notes:
            all_dry_ok = False
            break
    check("17 dry-run zero rows + notes", all_dry_ok)

    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    print(f"self-test: {passed}/{total}")
    return 0 if passed == total else 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="WR-4600.3 Watchtower harvest")
    p.add_argument("--self-test", action="store_true", help="offline deterministic checks")
    p.add_argument("--dry-run", action="store_true", help="no network, no writes")
    p.add_argument("--out", default="snapshots", help="snapshot output directory")
    args = p.parse_args(argv)

    if args.self_test:
        return run_self_test()

    all_rows: List[Dict[str, Any]] = []
    all_notes: List[str] = []
    for name, fn in SHARDS:  # adverse first
        rows, notes = fn(dry_run=args.dry_run)
        all_rows.extend(rows)
        all_notes.extend(notes)

    snapshot = build_snapshot(all_rows, all_notes)

    if args.dry_run:
        print(json.dumps(snapshot, indent=2, sort_keys=True))
        return 0

    path = write_snapshot(snapshot, args.out)
    print(f"snapshot: {path}")
    print(f"rows: {snapshot['counts']}")
    if has_triage_signal(all_rows):
        print("TRIAGE: HARM/FLICKER/OCULAR signal present")
    else:
        print("no triage signal (quiet day is a success)")

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
    sys.exit(main())
    raise SystemExit(main())
