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
Common Crawl Deep Sweep — queries the CC index for ancient script resources.
Uses cdx_toolkit for index queries and WARC extraction.
"""
import cdx_toolkit
import json
from pathlib import Path
from datetime import datetime

# PREFIX QUERIES (Common Crawl uses SURT-format URL keys)
# Format: domain reversed, e.g., org,archaeomythology)/
PREFIXES = [
    "it,prehistory)/",
    "org,archaeomythology)/",
    "com,academia)/",
    "org,zenodo)/",
    "com,figshare)/",
    "org,europeana)/",
    "fr,gallica)/",
]

# Text filters (applied client-side after fetching)
TEXT_FILTERS = [
    "Danube script", "DatDas", "Danube inscription",
    "Linear A", "Cretan Hieroglyphic",
    "Tărtăria", "Vinča", "Old European writing",
]


def sweep_commoncrawl(prefix, limit=500, from_ts=None, to_ts=None):
    """
    Query the Common Crawl CDX index for a domain prefix.
    Returns list of capture metadata dicts.
    """
    cdx = cdx_toolkit.CDXFetcher(source="cc")

    url_pattern = f"{prefix}*"

    kwargs = {"limit": limit}
    if from_ts:
        kwargs["from_ts"] = from_ts
    if to_ts:
        kwargs["to_ts"] = to_ts

    results = []
    try:
        for obj in cdx.iter(url_pattern, **kwargs):
            results.append({
                "url": obj.get("url", ""),
                "timestamp": obj.get("timestamp", ""),
                "status": obj.get("status", ""),
                "mime": obj.get("mime", ""),
                "digest": obj.get("digest", ""),
                "length": obj.get("length", ""),
            })
    except Exception as e:
        print(f"  [!] Error on prefix {prefix}: {e}")

    return results


def extract_warc_subset(prefix, output_dir="data/cc_extracts", limit=50):
    """
    Extract actual WARC content for matching captures.
    Writes a mini WARC file with just your matches.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    cdx = cdx_toolkit.CDXFetcher(source="cc")
    url_pattern = f"{prefix}*"

    warcinfo = {
        "software": "deep-sweep cdx_toolkit",
        "isPartOf": "DEEP-SWEEP-DANUBE",
        "description": f"Extracted captures for {prefix}",
        "format": "WARC file version 1.0",
    }

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    prefix_safe = prefix.replace("/", "_").replace(",", "-")
    warc_path = output_dir / f"{prefix_safe}_{timestamp}.warc.gz"

    writer = cdx_toolkit.warc.get_writer(
        str(warc_path.with_suffix("")), timestamp, warcinfo
    )

    count = 0
    for obj in cdx.iter(url_pattern, limit=limit):
        if obj.get("status") != "200":
            continue
        try:
            record = obj.fetch_warc_record()
            writer.write_record(record)
            count += 1
        except RuntimeError:
            continue

    writer.close()
    print(f"  → Extracted {count} records to {warc_path}")
    return warc_path


if __name__ == "__main__":
    all_hits = []
    for prefix in PREFIXES:
        print(f"[~] Querying CC for prefix: {prefix}")
        hits = sweep_commoncrawl(prefix, limit=200)
        print(f"    → {len(hits)} captures")
        all_hits.extend(hits)

    outfile = Path("data/cc_hits.json")
    with open(outfile, "w") as f:
        json.dump(all_hits, f, indent=2)

    print(f"\nTotal CC captures: {len(all_hits)}")
