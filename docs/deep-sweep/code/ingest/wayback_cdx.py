# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

"""Wayback Machine CDX index query helper, from the 2026-11-10 chat paste."""
import requests


def cdx(url_glob, match="prefix", frm="2010", to="2026", filt=None, limit=500):
    """Query the Wayback Machine CDX index. Returns list of capture rows."""
    params = {"url": url_glob, "matchType": match, "from": frm, "to": to,
              "output": "json", "collapse": "urlkey", "limit": limit}
    if filt:
        params["filter"] = filt          # e.g. "statuscode:200" or "original:.*linear.*"
    r = requests.get("https://web.archive.org/cdx/search/cdx", params=params, timeout=90)
    r.raise_for_status()
    rows = r.json()
    return rows[1:] if rows else []       # row 0 is the column header

# examples:
# cdx("*.datdas.*", match="domain", filt="statuscode:200")
# cdx("sigla* OR phis.me/sigla/*", filt="original:.*(linear|sign).*", limit=1000)
