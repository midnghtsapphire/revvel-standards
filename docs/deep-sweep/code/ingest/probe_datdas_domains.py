# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

# probe candidate DatDas domains across Wayback + Memento + Common Crawl
from ingest.wayback_cdx import cdx
from ingest.memento import mementos

for dom in ["datdas.com", "datdas.eu", "datdas.it", "merlini.it", "datdas.org"]:
    try:
        rows = cdx(dom, match="domain", filt="statuscode:200", limit=500)
        print(dom, len(rows), "captures")
    except Exception as e:
        print(dom, "ERR", e)
    try:
        print("  mementos:", [m["uri"] for m in mementos(f"https://{dom}/", "2026")][:10])
    except Exception:
        pass
