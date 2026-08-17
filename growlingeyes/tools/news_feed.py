#!/usr/bin/env python3
"""
news_feed.py — GrowlingEyes Google News OSINT Feed Listener
growlingeyes | Freedom Angel Corp — "We believe you."

Polls Google News via PyGoogleNews for topics that map to the 20 GrowlingEyes
intelligence domains.  Yields structured NewsItem records ready for insertion
into the GrowlingEyes MySQL `events` table or the domain-specific tables
(cyberThreats, kineticEvents, bioChemThreats, …).

Usage:
    python tools/news_feed.py
    python tools/news_feed.py --topics cyber military bio --limit 20
    python tools/news_feed.py --daemon --interval 3600
    python tools/news_feed.py --output results.json
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from pygooglenews import GoogleNews
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("news_feed")

# ─── GrowlingEyes OSINT topic map (domain → Google News search query) ─────────

TOPIC_QUERIES: dict[str, str] = {
    "cyber": (
        "cyber attack OR ransomware OR CISA advisory OR CVE OR data breach "
        "OR malware OR zero-day OR nation-state hacker"
    ),
    "supply_chain": (
        "supply chain disruption OR port closure OR shipping delay "
        "OR freight bottleneck OR logistics crisis"
    ),
    "kinetic": (
        "military conflict OR airstrike OR missile attack OR troop deployment "
        "OR ceasefire OR armed forces"
    ),
    "maritime": (
        "vessel seizure OR ship attack OR NAVTEX OR maritime security "
        "OR Strait of Hormuz OR Red Sea shipping"
    ),
    "nuclear": (
        "nuclear reactor OR IAEA OR nuclear incident OR radioactive "
        "OR nuclear threat OR plutonium"
    ),
    "bio": (
        "outbreak OR pandemic OR WHO alert OR disease surveillance "
        "OR biosafety OR pathogen OR epidemic"
    ),
    "military": (
        "troop movement OR military exercise OR NATO OR AFRICOM OR CENTCOM "
        "OR special operations OR defense deployment"
    ),
    "counter_intel": (
        "espionage OR spy arrested OR intelligence leak OR FBI warrant "
        "OR OFAC sanctions OR export control"
    ),
    "drone": (
        "drone strike OR UAV intercept OR UAS sighting OR drone warfare "
        "OR kamikaze drone OR FPV drone"
    ),
    "disaster": (
        "earthquake OR wildfire OR hurricane OR flood OR tsunami "
        "OR USGS OR FEMA disaster declaration"
    ),
    "energy": (
        "pipeline explosion OR power grid attack OR energy security "
        "OR oil spill OR gas leak OR PHMSA"
    ),
    "economic": (
        "economic sanctions OR financial crisis OR market crash "
        "OR inflation spike OR bank run OR FDIC"
    ),
    "humanitarian": (
        "refugee crisis OR famine OR UNHCR OR food insecurity "
        "OR displacement OR humanitarian corridor"
    ),
    "weapons": (
        "arms transfer OR weapons smuggling OR SIPRI OR embargo "
        "OR munitions OR illicit weapons"
    ),
    "space": (
        "satellite launch OR space debris OR GPS jamming "
        "OR ASAT test OR orbital weapon OR space force"
    ),
    "water": (
        "water scarcity OR dam failure OR drought OR aquifer depletion "
        "OR water infrastructure OR USGS streamflow"
    ),
    "rail": (
        "train derailment OR rail accident OR hazmat train "
        "OR freight disruption OR FRA safety"
    ),
    "darkweb": (
        "dark web marketplace OR Tor network OR leak site "
        "OR ransomware gang OR data extortion OR cybercrime forum"
    ),
    "apt": (
        "APT OR advanced persistent threat OR nation-state malware "
        "OR Lazarus Group OR Fancy Bear OR Volt Typhoon OR Salt Typhoon"
    ),
    "sar_optical": (
        "SAR imagery OR synthetic aperture radar OR satellite observation "
        "OR cloud-free imagery OR Sentinel-1 OR Copernicus SAR"
    ),
}


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class NewsItem:
    domain: str
    title: str
    url: str
    published: str
    source: str
    summary: str = ""
    fetched_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Feed fetcher ─────────────────────────────────────────────────────────────

def fetch_domain_news(
    domain: str,
    query: Optional[str] = None,
    limit: int = 10,
    language: str = "en",
    country: str = "US",
) -> list[NewsItem]:
    """
    Fetch Google News articles for a GrowlingEyes intelligence domain.

    Args:
        domain:   One of the TOPIC_QUERIES keys (e.g. "cyber", "apt").
        query:    Override the default topic query for this domain.
        limit:    Maximum number of articles to return.
        language: BCP-47 language code (default "en").
        country:  ISO-3166-1 alpha-2 country code (default "US").

    Returns:
        List of NewsItem records ready for persistence.
    """
    search_query = query or TOPIC_QUERIES.get(domain, domain)
    gn = GoogleNews(lang=language, country=country)

    try:
        result = gn.search(search_query)
    except Exception as exc:
        log.error("Google News fetch failed for domain=%s: %s", domain, exc)
        return []

    items: list[NewsItem] = []
    for entry in (result.get("entries") or [])[:limit]:
        items.append(
            NewsItem(
                domain=domain,
                title=entry.get("title", ""),
                url=entry.get("link", ""),
                published=entry.get("published", ""),
                source=entry.get("source", {}).get("title", "Google News"),
                summary=entry.get("summary", ""),
            )
        )

    log.info("domain=%-15s  fetched=%d articles", domain, len(items))
    return items


def fetch_top_headlines(limit: int = 10) -> list[NewsItem]:
    """
    Fetch Google News top headlines (no specific domain filter).

    Args:
        limit: Maximum number of headlines to return.

    Returns:
        List of NewsItem records tagged with domain="headlines".
    """
    gn = GoogleNews(lang="en", country="US")
    try:
        result = gn.top_news()
    except Exception as exc:
        log.error("Google News top headlines fetch failed: %s", exc)
        return []

    items: list[NewsItem] = []
    for entry in (result.get("entries") or [])[:limit]:
        items.append(
            NewsItem(
                domain="headlines",
                title=entry.get("title", ""),
                url=entry.get("link", ""),
                published=entry.get("published", ""),
                source=entry.get("source", {}).get("title", "Google News"),
                summary=entry.get("summary", ""),
            )
        )
    return items


def fetch_all_domains(
    domains: Optional[list[str]] = None,
    limit_per_domain: int = 5,
) -> list[NewsItem]:
    """
    Fetch news for all (or specified) GrowlingEyes intelligence domains.

    Args:
        domains:          Subset of TOPIC_QUERIES keys; None = all.
        limit_per_domain: Max articles per domain.

    Returns:
        Combined, de-duplicated list of NewsItem records sorted by domain.
    """
    target_domains = domains or list(TOPIC_QUERIES.keys())
    all_items: list[NewsItem] = []
    seen_urls: set[str] = set()

    for domain in target_domains:
        items = fetch_domain_news(domain, limit=limit_per_domain)
        for item in items:
            if item.url not in seen_urls:
                seen_urls.add(item.url)
                all_items.append(item)

    return sorted(all_items, key=lambda x: x.domain)


# ─── Display ──────────────────────────────────────────────────────────────────

def display_results(items: list[NewsItem], top: int = 20) -> None:
    table = Table(
        title="👁️  GrowlingEyes — Google News OSINT Feed",
        show_lines=True,
        highlight=True,
    )
    table.add_column("Domain", style="bold cyan", width=14)
    table.add_column("Source", style="yellow", width=16)
    table.add_column("Title", style="white", max_width=70)
    table.add_column("Published", style="dim", width=20)

    for item in items[:top]:
        table.add_row(
            item.domain,
            item.source[:16],
            item.title[:70],
            item.published[:20] if item.published else "—",
        )

    console.print(table)
    console.print(f"\n  Total items fetched: [bold cyan]{len(items)}[/]")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="GrowlingEyes — Google News OSINT Feed Listener"
    )
    parser.add_argument(
        "--topics",
        nargs="+",
        choices=list(TOPIC_QUERIES.keys()) + ["all"],
        default=["all"],
        help="Intelligence domains to fetch (default: all)",
    )
    parser.add_argument("--limit", type=int, default=5, help="Articles per domain")
    parser.add_argument("--output", type=str, help="Save results to JSON file")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument(
        "--interval", type=int, default=3600, help="Polling interval in seconds (daemon)"
    )
    args = parser.parse_args()

    domains: Optional[list[str]] = (
        None if "all" in args.topics else args.topics
    )

    def run_once() -> None:
        console.rule("[bold cyan]👁️  GrowlingEyes — News Feed[/]")
        items = fetch_all_domains(domains=domains, limit_per_domain=args.limit)
        if not items:
            console.print("[yellow]No articles fetched. Check network or topic queries.[/]")
            return

        display_results(items)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as fh:
                json.dump([i.to_dict() for i in items], fh, indent=2, default=str)
            console.print(f"\n  💾 Saved to [cyan]{args.output}[/]")

    if args.daemon:
        console.print(f"[bold green]Daemon mode: polling every {args.interval}s[/]")
        while True:
            run_once()
            console.print(f"\n  ⏳ Sleeping {args.interval}s ...\n")
            time.sleep(args.interval)
    else:
        run_once()


if __name__ == "__main__":
    main()
