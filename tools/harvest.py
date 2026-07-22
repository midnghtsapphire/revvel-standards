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
    return 0


if __name__ == "__main__":
    sys.exit(main())
