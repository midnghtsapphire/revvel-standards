#!/usr/bin/env python3
"""
apt_signals.py — GrowlingEyes APT (Advanced Persistent Threat) Signal Scanner
growlingeyes | Freedom Angel Corp — "We believe you."

Aggregates APT and threat-intelligence signals from:
  • CISA Known Exploited Vulnerabilities (KEV) catalog
  • AlienVault OTX subscribed pulses
  • NVD CVE API (recent high/critical CVEs)
  • CISA Cybersecurity Advisories RSS
  • Feedly/custom STIX/TAXII feeds (configurable)

Scores each signal and surfaces high-priority APT indicators for the
GrowlingEyes "Cyber Threats" tab and precog feed.

Usage:
    python tools/apt_signals.py
    python tools/apt_signals.py --sources cisa nvd --limit 25
    python tools/apt_signals.py --daemon --interval 1800
    python tools/apt_signals.py --output apt_signals.json
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

import feedparser
import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("apt_signals")

# ─── Constants ────────────────────────────────────────────────────────────────

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
CISA_RSS_URL = "https://www.cisa.gov/cybersecurity-advisories/all.xml"
NVD_CVE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
OTX_PULSES_URL = "https://otx.alienvault.com/api/v1/pulses/subscribed"

# APT actor keywords for elevated scoring
APT_ACTOR_KEYWORDS = [
    "APT", "Lazarus Group", "Fancy Bear", "Cozy Bear", "Volt Typhoon",
    "Salt Typhoon", "Sandworm", "Turla", "Equation Group", "Kimsuky",
    "Charming Kitten", "UNC", "TA505", "FIN7", "Scattered Spider",
    "REvil", "LockBit", "Clop", "BlackCat",
]

SEVERITY_WEIGHTS = {
    "CRITICAL": 1.0,
    "HIGH": 0.75,
    "MEDIUM": 0.45,
    "LOW": 0.2,
    "UNKNOWN": 0.1,
}


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class APTSignal:
    source: str
    signal_id: str
    title: str
    description: str
    severity: str
    cve_ids: list[str]
    apt_actors: list[str]
    published: str
    url: str
    precog_score: float = 0.0
    fetched_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Scoring ──────────────────────────────────────────────────────────────────

def score_apt_signal(signal: APTSignal) -> float:
    """
    Compute a precog score [0.0, 1.0] for an APT signal.

    Factors:
      - Severity weight:          up to 0.40
      - APT actor named:          +0.20 per actor (max 0.30)
      - Multiple CVEs referenced: +0.10 (any CVEs), +0.05 bonus (3+)
      - Recency (within 7 days):  +0.20
    """
    base = SEVERITY_WEIGHTS.get(signal.severity.upper(), 0.1) * 0.40

    actor_boost = min(len(signal.apt_actors) * 0.20, 0.30)

    cve_boost = 0.0
    if signal.cve_ids:
        cve_boost = 0.10
        if len(signal.cve_ids) >= 3:
            cve_boost += 0.05

    recency_boost = 0.0
    try:
        pub = datetime.fromisoformat(signal.published.replace("Z", "+00:00"))
        delta = (datetime.now(timezone.utc) - pub).days
        if delta <= 7:
            recency_boost = 0.20
        elif delta <= 30:
            recency_boost = 0.10
    except Exception:
        pass

    raw = base + actor_boost + cve_boost + recency_boost
    return round(min(raw, 1.0), 4)


def _extract_apt_actors(text: str) -> list[str]:
    text_lower = text.lower()
    return [actor for actor in APT_ACTOR_KEYWORDS if actor.lower() in text_lower]


def _extract_cves(text: str) -> list[str]:
    import re
    return list(set(re.findall(r"CVE-\d{4}-\d{4,7}", text, re.IGNORECASE)))


# ─── Source fetchers ──────────────────────────────────────────────────────────

def fetch_cisa_kev(limit: int = 20) -> list[APTSignal]:
    """Fetch CISA Known Exploited Vulnerabilities catalog."""
    signals: list[APTSignal] = []
    try:
        resp = httpx.get(CISA_KEV_URL, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        vulns = data.get("vulnerabilities", [])[:limit]
        for v in vulns:
            text = f"{v.get('vulnerabilityName', '')} {v.get('shortDescription', '')}"
            signals.append(
                APTSignal(
                    source="CISA-KEV",
                    signal_id=v.get("cveID", ""),
                    title=v.get("vulnerabilityName", ""),
                    description=v.get("shortDescription", ""),
                    severity="HIGH",
                    cve_ids=[v.get("cveID", "")] if v.get("cveID") else [],
                    apt_actors=_extract_apt_actors(text),
                    published=v.get("dateAdded", ""),
                    url=v.get("vendorProject", "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"),
                )
            )
    except Exception as exc:
        log.error("CISA KEV fetch failed: %s", exc)
    log.info("CISA-KEV fetched %d signals", len(signals))
    return signals


def fetch_cisa_rss(limit: int = 15) -> list[APTSignal]:
    """Fetch CISA Cybersecurity Advisories RSS feed."""
    signals: list[APTSignal] = []
    try:
        feed = feedparser.parse(CISA_RSS_URL)
        for entry in feed.entries[:limit]:
            text = f"{entry.get('title', '')} {entry.get('summary', '')}"
            signals.append(
                APTSignal(
                    source="CISA-RSS",
                    signal_id=entry.get("id", entry.get("link", "")),
                    title=entry.get("title", ""),
                    description=entry.get("summary", "")[:500],
                    severity="HIGH",
                    cve_ids=_extract_cves(text),
                    apt_actors=_extract_apt_actors(text),
                    published=entry.get("published", ""),
                    url=entry.get("link", ""),
                )
            )
    except Exception as exc:
        log.error("CISA RSS fetch failed: %s", exc)
    log.info("CISA-RSS fetched %d signals", len(signals))
    return signals


def fetch_nvd_recent(limit: int = 15) -> list[APTSignal]:
    """Fetch recent high/critical CVEs from NVD API v2."""
    signals: list[APTSignal] = []
    params = {
        "resultsPerPage": limit,
        "cvssV3Severity": "CRITICAL",
        "startIndex": 0,
    }
    nvd_api_key = os.environ.get("NVD_API_KEY")
    headers = {"apiKey": nvd_api_key} if nvd_api_key else {}
    try:
        resp = httpx.get(NVD_CVE_URL, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for vuln in data.get("vulnerabilities", []):
            cve = vuln.get("cve", {})
            cve_id = cve.get("id", "")
            desc = next(
                (
                    d["value"]
                    for d in cve.get("descriptions", [])
                    if d.get("lang") == "en"
                ),
                "",
            )
            metrics = cve.get("metrics", {})
            cvss3 = (
                metrics.get("cvssMetricV31", [{}])[0]
                .get("cvssData", {})
                .get("baseSeverity", "UNKNOWN")
            ) if metrics.get("cvssMetricV31") else "UNKNOWN"

            text = f"{cve_id} {desc}"
            signals.append(
                APTSignal(
                    source="NVD",
                    signal_id=cve_id,
                    title=f"{cve_id} — CVSS CRITICAL",
                    description=desc[:500],
                    severity=cvss3,
                    cve_ids=[cve_id],
                    apt_actors=_extract_apt_actors(text),
                    published=cve.get("published", ""),
                    url=f"https://nvd.nist.gov/vuln/detail/{cve_id}",
                )
            )
    except Exception as exc:
        log.error("NVD fetch failed: %s", exc)
    log.info("NVD fetched %d signals", len(signals))
    return signals


def fetch_otx_pulses(limit: int = 15) -> list[APTSignal]:
    """Fetch AlienVault OTX subscribed threat pulses (requires OTX_API_KEY)."""
    signals: list[APTSignal] = []
    api_key = os.environ.get("OTX_API_KEY")
    if not api_key:
        log.warning("OTX_API_KEY not set — skipping OTX pulse fetch")
        return []

    headers = {"X-OTX-API-KEY": api_key}
    params = {"limit": limit}
    try:
        resp = httpx.get(OTX_PULSES_URL, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for pulse in data.get("results", []):
            text = f"{pulse.get('name', '')} {pulse.get('description', '')}"
            tags = pulse.get("tags", [])
            severity = "HIGH" if "apt" in [t.lower() for t in tags] else "MEDIUM"
            cve_ids = [
                ind["indicator"]
                for ind in pulse.get("indicators", [])
                if ind.get("type") == "CVE"
            ]
            signals.append(
                APTSignal(
                    source="OTX",
                    signal_id=pulse.get("id", ""),
                    title=pulse.get("name", ""),
                    description=pulse.get("description", "")[:500],
                    severity=severity,
                    cve_ids=cve_ids,
                    apt_actors=_extract_apt_actors(text),
                    published=pulse.get("created", ""),
                    url=f"https://otx.alienvault.com/pulse/{pulse.get('id', '')}",
                )
            )
    except Exception as exc:
        log.error("OTX fetch failed: %s", exc)
    log.info("OTX fetched %d signals", len(signals))
    return signals


# ─── Aggregator ───────────────────────────────────────────────────────────────

SOURCE_MAP = {
    "cisa": fetch_cisa_kev,
    "cisa_rss": fetch_cisa_rss,
    "nvd": fetch_nvd_recent,
    "otx": fetch_otx_pulses,
}


def fetch_all_apt_signals(
    sources: Optional[list[str]] = None,
    limit: int = 15,
) -> list[APTSignal]:
    """
    Fetch and score APT signals from all (or specified) sources.

    Args:
        sources: Subset of SOURCE_MAP keys; None = all.
        limit:   Max signals per source.

    Returns:
        De-duplicated signals sorted by precog_score descending.
    """
    target_sources = sources or list(SOURCE_MAP.keys())
    all_signals: list[APTSignal] = []
    seen_ids: set[str] = set()

    for src in target_sources:
        fetcher = SOURCE_MAP.get(src)
        if not fetcher:
            log.warning("Unknown source: %s", src)
            continue
        for sig in fetcher(limit=limit):
            if sig.signal_id not in seen_ids:
                seen_ids.add(sig.signal_id)
                sig.precog_score = score_apt_signal(sig)
                all_signals.append(sig)

    return sorted(all_signals, key=lambda s: s.precog_score, reverse=True)


# ─── Display ──────────────────────────────────────────────────────────────────

def display_signals(signals: list[APTSignal], top: int = 20) -> None:
    table = Table(
        title="🔴 GrowlingEyes — APT Signal Feed",
        show_lines=True,
        highlight=True,
    )
    table.add_column("Score", style="bold red", width=6)
    table.add_column("Source", style="yellow", width=10)
    table.add_column("Severity", style="bold", width=8)
    table.add_column("ID", style="dim cyan", width=18)
    table.add_column("Title", style="white", max_width=60)
    table.add_column("APT Actors", style="magenta", max_width=30)

    for sig in signals[:top]:
        severity_style = {
            "CRITICAL": "[bold red]CRITICAL[/]",
            "HIGH": "[red]HIGH[/]",
            "MEDIUM": "[yellow]MEDIUM[/]",
            "LOW": "[green]LOW[/]",
        }.get(sig.severity.upper(), sig.severity)

        table.add_row(
            f"{sig.precog_score:.2f}",
            sig.source,
            severity_style,
            sig.signal_id[:18],
            sig.title[:60],
            ", ".join(sig.apt_actors[:2]) or "—",
        )

    console.print(table)
    console.print(f"\n  Total APT signals: [bold red]{len(signals)}[/]")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="GrowlingEyes — APT Signal Scanner"
    )
    parser.add_argument(
        "--sources",
        nargs="+",
        choices=list(SOURCE_MAP.keys()),
        default=None,
        help="Threat intel sources to poll (default: all)",
    )
    parser.add_argument("--limit", type=int, default=15, help="Signals per source")
    parser.add_argument("--output", type=str, help="Save results to JSON file")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument(
        "--interval", type=int, default=1800, help="Polling interval in seconds"
    )
    args = parser.parse_args()

    def run_once() -> None:
        console.rule("[bold red]🔴 GrowlingEyes — APT Signals[/]")
        signals = fetch_all_apt_signals(sources=args.sources, limit=args.limit)
        if not signals:
            console.print("[yellow]No APT signals found.[/]")
            return
        display_signals(signals)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as fh:
                json.dump([s.to_dict() for s in signals], fh, indent=2, default=str)
            console.print(f"\n  💾 Saved to [cyan]{args.output}[/]")

    if args.daemon:
        console.print(f"[bold green]Daemon: polling every {args.interval}s[/]")
        while True:
            run_once()
            console.print(f"\n  ⏳ Sleeping {args.interval}s ...\n")
            time.sleep(args.interval)
    else:
        run_once()


if __name__ == "__main__":
    main()
