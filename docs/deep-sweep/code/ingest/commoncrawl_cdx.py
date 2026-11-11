# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

"""Common Crawl CDX index query helper, from the 2026-11-10 chat paste."""
import requests


def latest_cc_index():
    info = requests.get("https://index.commoncrawl.org/collinfo.json", timeout=30).json()
    return info[0]["cdx-api"]            # newest index, e.g. CC-MAIN-2026-xx


def cc_query(cdx_api, url_glob, filt="status:200", limit=500):
    """Query a Common Crawl CDX index (its own 'workhorse' layer)."""
    r = requests.get(cdx_api, params={"url": url_glob, "output": "json",
                                      "filter": filt, "limit": limit}, timeout=90)
    r.raise_for_status()
    return r.json()
