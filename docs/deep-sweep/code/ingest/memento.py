# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

"""Memento Time Travel and Arquivo.pt helpers, from the 2026-11-10 chat paste."""
import requests


def mementos(url, ts="2026"):
    """All archived copies of a URL across archives (Memento aggregator)."""
    r = requests.get(f"https://timetravel.mementoweb.org/api/json/{ts}/{url}", timeout=30)
    r.raise_for_status()
    return r.json().get("mementos", {}).get("all", [])


def arquivo_cdx(url_glob, limit=500):
    r = requests.get("https://arquivo.pt/wayback/cdx",
                     params={"url": url_glob, "output": "json", "limit": limit}, timeout=60)
    r.raise_for_status()
    return r.json()


def wayback_available(url, timestamp="20200101"):
    return requests.get("https://archive.org/wayback/available",
                        params={"url": url, "timestamp": timestamp}, timeout=30).json()
