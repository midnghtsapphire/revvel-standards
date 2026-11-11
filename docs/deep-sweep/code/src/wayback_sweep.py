# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

#!/usr/bin/env python3
"""
Wayback Machine CDX Deep Sweep — queries the Wayback CDX API
for all captures matching keywords across target domains.
"""
import requests
import time
import json
from datetime import datetime
from pathlib import Path

CDX_URL = "http://web.archive.org/cdx/search/cdx"

# Your target domains and keywords
TARGET_DOMAINS = [
    "prehistory.it",
    "archaeomythology.org",
    "academia.edu",
    "zenodo.org",
    "figshare.com",
]

KEYWORDS = [
    "Danube script", "DatDas", "Danube inscription",
    "Linear A", "Cretan Hieroglyphic", "RILA-S1",
    "Gorila corpus", "Tărtăria", "Vinča symbols",
    "Old European writing", "Haarmann Danube",
    "Merlini DatDas", "Shan Winn Danube",
]


def build_query(domain, keyword, start_year=1996, end_year=2026):
    """Build a CDX query for a domain+keyword combination."""
    params = {
        "url": f"{domain}/*",
        "matchType": "domain",
        "filter": "statuscode:200",
        "from": f"{start_year}",
        "to": f"{end_year}",
        "fl": "timestamp,original,statuscode,digest,length,mimetype",
        "output": "json",
        "limit": 1000,
        "collapse": "digest",  # Deduplicate by content hash
    }
    return params


def sweep_domain(domain, keyword, delay=1.0):
    """Sweep a single domain for a keyword, return captures."""
    params = build_query(domain, keyword)
    try:
        resp = requests.get(CDX_URL, params=params, timeout=30)
        time.sleep(delay)  # Be polite to the API
        if resp.status_code == 200 and resp.text.strip():
            data = resp.json()
            # First row is field names
            if len(data) > 1:
                return data[1:]  # Skip header row
    except Exception as e:
        print(f"  [!] Error on {domain} + '{keyword}': {e}")
    return []


def full_sweep(output_dir="data/wayback_hits"):
    """Run all domain × keyword combinations."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    all_hits = []

    for domain in TARGET_DOMAINS:
        for keyword in KEYWORDS:
            print(f"[~] Sweeping {domain} for '{keyword}'...")
            hits = sweep_domain(domain, keyword)
            print(f"    → {len(hits)} unique captures")
            all_hits.extend([
                {
                    "domain": domain,
                    "keyword": keyword,
                    "timestamp": h[0],
                    "url": h[1],
                    "status": h[2],
                    "digest": h[3],
                    "length": h[4],
                    "mimetype": h[5],
                }
                for h in hits
            ])

    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    outfile = output_dir / f"sweep_{timestamp}.json"
    with open(outfile, "w") as f:
        json.dump(all_hits, f, indent=2)

    print(f"\nTotal unique captures: {len(all_hits)}")
    print(f"   Saved to: {outfile}")
    return all_hits


if __name__ == "__main__":
    full_sweep()
