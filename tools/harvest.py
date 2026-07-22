#!/usr/bin/env python3
"""WR-4600.3 Watchtower harvester.

Stdlib-only. Live keyless APIs. Every URL comes from an API response.
A fabricated citation is a P0 incident (WR-4200).

Usage:
    python tools/harvest.py --self-test
    python tools/harvest.py --dry-run
    python tools/harvest.py --out snapshots/
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from typing import Any

UA = "WR-4600-Watchtower/0.3 (+https://github.com/) stdlib"
TIMEOUT = 20

# ---- HTTP -------------------------------------------------------------------

def _get(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:  # noqa: S310
        return json.loads(r.read().decode("utf-8"))

# ---- Shards -----------------------------------------------------------------

def shard_adverse(dry: bool = False) -> list[dict[str, Any]]:
    """openFDA device events. URLs come from API 'results[].openfda' when present."""
    if dry:
        return []
    url = (
        "https://api.fda.gov/device/event.json?"
        "search=device.generic_name:(light+OR+phototherapy+OR+led)&limit=25"
    )
    try:
        data = _get(url)
    except Exception as e:  # noqa: BLE001
        return [{"shard": "adverse", "error": str(e), "rows": 0}]
    rows = []
    for r in data.get("results", []):
        rows.append({
            "shard": "adverse",
            "report_number": r.get("report_number"),
            "event_type": r.get("event_type"),
            "date_received": r.get("date_received"),
            # No URL fabrication: openFDA does not return one; leave None.
            "url": None,
        })
    return rows

def shard_trials(dry: bool = False) -> list[dict[str, Any]]:
    if dry:
        return []
    url = (
        "https://clinicaltrials.gov/api/v2/studies?"
        "query.term=phototherapy&pageSize=25&fields=NCTId,BriefTitle,OverallStatus"
    )
    try:
        data = _get(url)
    except Exception as e:  # noqa: BLE001
        return [{"shard": "trials", "error": str(e), "rows": 0}]
    rows = []
    for s in data.get("studies", []):
        ident = s.get("protocolSection", {}).get("identificationModule", {})
        nct = ident.get("nctId")
        if not nct:
            continue
        rows.append({
            "shard": "trials",
            "nct_id": nct,
            "title": ident.get("briefTitle"),
            # URL is derived from API-supplied NCT id, not from title.
            "url": f"https://clinicaltrials.gov/study/{nct}",
        })
    return rows

def shard_literature(dry: bool = False) -> list[dict[str, Any]]:
    if dry:
        return []
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    q = urllib.parse.quote("phototherapy OR photobiomodulation")
    try:
        es = _get(f"{base}/esearch.fcgi?db=pubmed&retmode=json&retmax=25&term={q}")
    except Exception as e:  # noqa: BLE001
        return [{"shard": "literature", "error": str(e), "rows": 0}]
    ids = es.get("esearchresult", {}).get("idlist", [])
    rows = []
    for pmid in ids:
        if not pmid.isdigit():
            continue
        rows.append({
            "shard": "literature",
            "pmid": pmid,
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        })
    return rows

def shard_crossref(dry: bool = False) -> list[dict[str, Any]]:
    if dry:
        return []
    url = "https://api.crossref.org/works?query=photobiomodulation&rows=25"
    try:
        data = _get(url)
    except Exception as e:  # noqa: BLE001
        return [{"shard": "crossref", "error": str(e), "rows": 0}]
    rows = []
    for it in data.get("message", {}).get("items", []):
        doi = it.get("DOI")
        if not doi:
            continue
        rows.append({
            "shard": "crossref",
            "doi": doi,
            "url": f"https://doi.org/{doi}",
        })
    return rows

def shard_keyed_placeholder() -> list[dict[str, Any]]:
    """Key-required shard: degrade to 0 rows with a procurement note. No padding."""
    return [{
        "shard": "keyed",
        "rows": 0,
        "note": "API key not present; shard skipped. Do not pad.",
    }]

# ---- Fabrication detector ---------------------------------------------------

_ALLOWED_HOSTS = {
    "clinicaltrials.gov",
    "pubmed.ncbi.nlm.nih.gov",
    "doi.org",
    "api.fda.gov",
    "eutils.ncbi.nlm.nih.gov",
    "api.crossref.org",
}

def is_fabricated_url(url: str | None, source_field: str | None = None) -> bool:
    if url is None:
        return False
    m = re.match(r"^https?://([^/]+)/", url)
    if not m:
        return True
    host = m.group(1).lower()
    if host not in _ALLOWED_HOSTS:
        return True
    # If a source field was declared, ensure the URL contains its value.
    if source_field and source_field not in url:
        return True
    return False

# ---- Orchestration ----------------------------------------------------------

SHARD_ORDER = ["adverse", "trials", "literature", "crossref", "keyed"]

def harvest(dry: bool = False) -> dict[str, Any]:
    out: dict[str, Any] = {
        "spec": "WR-4600.3",
        "utc": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "quiet_day": False,
        "shards": {},
    }
    # adverse runs first
    out["shards"]["adverse"] = shard_adverse(dry=dry)
    out["shards"]["trials"] = shard_trials(dry=dry)
    out["shards"]["literature"] = shard_literature(dry=dry)
    out["shards"]["crossref"] = shard_crossref(dry=dry)
    out["shards"]["keyed"] = shard_keyed_placeholder()

    total_rows = sum(
        len([r for r in rows if "error" not in r and r.get("rows") != 0])
        for rows in out["shards"].values()
    )
    out["total_rows"] = total_rows
    out["quiet_day"] = total_rows == 0
    return out

def snapshot(payload: dict[str, Any], out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    body = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    digest = hashlib.sha256(body).hexdigest()[:12]
    date = payload["utc"][:10]
    path = os.path.join(out_dir, f"wr-4600-{date}-{digest}.json")
    if not os.path.exists(path):  # immutable
        with open(path, "wb") as f:
            f.write(body)
    return path

# ---- Self-test (offline, deterministic) -------------------------------------

def self_test() -> tuple[int, int, list[str]]:
    checks: list[tuple[str, bool]] = []

    # 1: shard order enforces adverse first
    checks.append(("adverse_first", SHARD_ORDER[0] == "adverse"))
    # 2: allowed hosts contains clinicaltrials
    checks.append(("host_ct", "clinicaltrials.gov" in _ALLOWED_HOSTS))
    # 3: allowed hosts contains pubmed
    checks.append(("host_pubmed", "pubmed.ncbi.nlm.nih.gov" in _ALLOWED_HOSTS))
    # 4: allowed hosts contains doi.org
    checks.append(("host_doi", "doi.org" in _ALLOWED_HOSTS))
    # 5: allowed hosts contains openFDA
    checks.append(("host_openfda", "api.fda.gov" in _ALLOWED_HOSTS))
    # 6: fabricated host is rejected
    checks.append(("reject_fake_host", is_fabricated_url("https://evil.example.com/x")))
    # 7: bare string rejected
    checks.append(("reject_bare", is_fabricated_url("not-a-url")))
    # 8: None is not fabricated (allowed "no URL")
    checks.append(("none_ok", not is_fabricated_url(None)))
    # 9: legit NCT URL accepted
    checks.append(("accept_nct", not is_fabricated_url("https://clinicaltrials.gov/study/NCT01234567")))
    # 10: legit PMID URL accepted
    checks.append(("accept_pmid", not is_fabricated_url("https://pubmed.ncbi.nlm.nih.gov/12345/")))
    # 11: source-field enforcement
    checks.append((
        "source_field_mismatch",
        is_fabricated_url("https://doi.org/10.1/abc", source_field="10.9/xyz"),
    ))
    # 12: source-field match
    checks.append((
        "source_field_match",
        not is_fabricated_url("https://doi.org/10.1/abc", source_field="10.1/abc"),
    ))
    # 13: dry-run harvest returns dict
    hv = harvest(dry=True)
    checks.append(("dry_returns_dict", isinstance(hv, dict)))
    # 14: dry-run flags quiet day
    checks.append(("dry_quiet_day", hv["quiet_day"] is True))
    # 15: keyed shard degrades to 0 rows without padding
    keyed = hv["shards"]["keyed"]
    checks.append(("keyed_degrades", keyed[0]["rows"] == 0 and "note" in keyed[0]))
    # 16: snapshot naming is content-hashed and dated
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        p = snapshot(hv, td)
        name = os.path.basename(p)
        checks.append(("snapshot_named", bool(re.match(r"^wr-4600-\d{4}-\d{2}-\d{2}-[0-9a-f]{12}\.json$", name))))
    # 17: spec version present
    checks.append(("spec_version", hv["spec"] == "WR-4600.3"))

    passed = sum(1 for _, ok in checks if ok)
    failed = [n for n, ok in checks if not ok]
    return passed, len(checks), failed

# ---- CLI --------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default="snapshots")
    args = ap.parse_args(argv)

    if args.self_test:
        passed, total, failed = self_test()
        print(f"self-test: {passed}/{total}")
        if failed:
            print("FAILED:", ", ".join(failed))
            return 1
        return 0

    payload = harvest(dry=args.dry_run)
    path = snapshot(payload, args.out)
    print(json.dumps({
        "snapshot": path,
        "quiet_day": payload["quiet_day"],
        "total_rows": payload["total_rows"],
    }))
    return 0

if __name__ == "__main__":
    sys.exit(main())
