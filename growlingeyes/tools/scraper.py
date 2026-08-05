#!/usr/bin/env python3
"""
scraper.py — GrowlingEyes Intelligence Scraper
growlingeyes | Freedom Angel Corp — "We believe you."

Scrapes structured intelligence from web sources that do not expose APIs or
RSS feeds.  Uses httpx + BeautifulSoup for HTML parsing, and returns normalised
ScrapedItem records ready for insertion into GrowlingEyes data tables.

Built-in scrapers:
  • FAA TFR Notices          (temporary flight restrictions)
  • NIFC Active Fire Perimeters (ArcGIS JSON)
  • OFAC SDN List (XML)
  • UN Consolidated Sanctions List (XML)

Usage:
    python tools/scraper.py
    python tools/scraper.py --targets faa_tfr ofac_sdn
    python tools/scraper.py --output scraped.json
"""

from __future__ import annotations

import argparse
import json
import logging
import defusedxml.ElementTree as ET
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("scraper")

# ─── Target URLs ──────────────────────────────────────────────────────────────

FAA_TFR_URL = "https://tfr.faa.gov/tfr2/list.html"
NIFC_FIRE_URL = (
    "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/"
    "Current_WildlandFire_Perimeters/FeatureServer/0/query"
    "?where=1%3D1&outFields=*&f=json&resultRecordCount=50"
)
OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml"
UN_SANCTIONS_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class ScrapedItem:
    source: str
    item_id: str
    title: str
    description: str
    category: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    url: str = ""
    raw: dict = field(default_factory=dict)
    scraped_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        return asdict(self)


# ─── FAA TFR scraper ─────────────────────────────────────────────────────────

def _el_text(el: Optional["ET.Element"]) -> str:
    """Return element text or empty string if element is None."""
    return el.text if el is not None else ""



    """Scrape FAA Temporary Flight Restriction notices."""
    items: list[ScrapedItem] = []
    try:
        resp = httpx.get(FAA_TFR_URL, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        rows = soup.select("table tr")
        for row in rows[1:limit + 1]:
            cells = row.find_all("td")
            if len(cells) < 4:
                continue
            notam_id = cells[0].get_text(strip=True)
            location = cells[1].get_text(strip=True)
            effective = cells[2].get_text(strip=True)
            reason = cells[3].get_text(strip=True)
            link = cells[0].find("a")
            url = f"https://tfr.faa.gov{link['href']}" if link and link.get("href") else FAA_TFR_URL
            items.append(
                ScrapedItem(
                    source="FAA-TFR",
                    item_id=notam_id,
                    title=f"TFR {notam_id} — {location}",
                    description=f"Effective: {effective} | Reason: {reason}",
                    category="airspace_restriction",
                    url=url,
                    raw={"notam_id": notam_id, "location": location, "effective": effective},
                )
            )
    except Exception as exc:
        log.error("FAA TFR scrape failed: %s", exc)
    log.info("FAA-TFR scraped %d items", len(items))
    return items


# ─── NIFC Active Fire scraper ─────────────────────────────────────────────────

def scrape_nifc_fires(limit: int = 25) -> list[ScrapedItem]:
    """Fetch active wildfire perimeters from NIFC ArcGIS endpoint."""
    items: list[ScrapedItem] = []
    try:
        resp = httpx.get(NIFC_FIRE_URL, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for feature in data.get("features", [])[:limit]:
            attrs = feature.get("attributes", {})
            fire_id = str(attrs.get("OBJECTID", ""))
            name = attrs.get("IncidentName", "Unknown Fire")
            acres = attrs.get("GISAcres", 0)
            state = attrs.get("POOState", "")
            items.append(
                ScrapedItem(
                    source="NIFC",
                    item_id=fire_id,
                    title=f"{name} — {state}",
                    description=f"{acres:,.0f} acres burned",
                    category="wildfire",
                    raw=attrs,
                )
            )
    except Exception as exc:
        log.error("NIFC fire scrape failed: %s", exc)
    log.info("NIFC scraped %d fire perimeters", len(items))
    return items


# ─── OFAC SDN List scraper ────────────────────────────────────────────────────

def scrape_ofac_sdn(limit: int = 50) -> list[ScrapedItem]:
    """
    Parse OFAC Specially Designated Nationals XML list.

    The SDN list is large (30+ MB); we parse lazily and stop after `limit`
    records to keep runtime manageable.
    """
    items: list[ScrapedItem] = []
    try:
        with httpx.stream("GET", OFAC_SDN_URL, timeout=30, follow_redirects=True) as resp:
            resp.raise_for_status()
            content = b""
            for chunk in resp.iter_bytes(chunk_size=65536):
                content += chunk
                if len(content) > 5 * 1024 * 1024:
                    break

        root = ET.fromstring(content)
        ns = {"sdn": "https://tempuri.org/sdnList.xsd"}

        for entry in root.findall(".//sdnEntry", ns)[:limit]:
            uid = entry.findtext("uid", namespaces=ns) or ""
            first = entry.findtext("firstName", namespaces=ns) or ""
            last = entry.findtext("lastName", namespaces=ns) or ""
            sdn_type = entry.findtext("sdnType", namespaces=ns) or ""
            programs = [
                p.text or ""
                for p in entry.findall(".//program", ns)
            ]
            items.append(
                ScrapedItem(
                    source="OFAC-SDN",
                    item_id=uid,
                    title=f"{first} {last}".strip() or f"Entity {uid}",
                    description=f"Type: {sdn_type} | Programs: {', '.join(programs)}",
                    category="sanctions",
                    url="https://www.treasury.gov/ofac/downloads/sdn.xml",
                    raw={"uid": uid, "sdn_type": sdn_type, "programs": programs},
                )
            )
    except Exception as exc:
        log.error("OFAC SDN scrape failed: %s", exc)
    log.info("OFAC-SDN scraped %d entries", len(items))
    return items


# ─── UN Sanctions List scraper ────────────────────────────────────────────────

def scrape_un_sanctions(limit: int = 50) -> list[ScrapedItem]:
    """Parse the UN Consolidated Sanctions List XML."""
    items: list[ScrapedItem] = []
    try:
        resp = httpx.get(UN_SANCTIONS_URL, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        for individual in list(root.iter("INDIVIDUAL"))[:limit]:
            name_el = individual.find("FIRST_NAME")
            last_el = individual.find("SECOND_NAME")
            third_el = individual.find("THIRD_NAME")
            dataid = individual.findtext("DATAID") or ""
            full_name = " ".join(
                filter(
                    None,
                    [
                        _el_text(name_el),
                        _el_text(last_el),
                        _el_text(third_el),
                    ],
                )
            )
            items.append(
                ScrapedItem(
                    source="UN-SANCTIONS",
                    item_id=dataid,
                    title=full_name or f"Individual {dataid}",
                    description=f"UN DATAID: {dataid}",
                    category="sanctions",
                    url=UN_SANCTIONS_URL,
                    raw={"dataid": dataid},
                )
            )
    except Exception as exc:
        log.error("UN Sanctions scrape failed: %s", exc)
    log.info("UN-Sanctions scraped %d entries", len(items))
    return items


# ─── Aggregator ───────────────────────────────────────────────────────────────

SCRAPER_MAP = {
    "faa_tfr":     scrape_faa_tfr,
    "nifc_fires":  scrape_nifc_fires,
    "ofac_sdn":    scrape_ofac_sdn,
    "un_sanctions": scrape_un_sanctions,
}


def scrape_all(
    targets: Optional[list[str]] = None,
    limit: int = 25,
) -> list[ScrapedItem]:
    """
    Run all (or specified) scrapers and return combined results.

    Args:
        targets: Subset of SCRAPER_MAP keys; None = all.
        limit:   Max items per scraper.

    Returns:
        Combined list of ScrapedItem records.
    """
    active = targets or list(SCRAPER_MAP.keys())
    results: list[ScrapedItem] = []
    for name in active:
        fn = SCRAPER_MAP.get(name)
        if fn:
            results.extend(fn(limit=limit))
        else:
            log.warning("Unknown scraper target: %s", name)
    return results


# ─── Display ──────────────────────────────────────────────────────────────────

def display_items(items: list[ScrapedItem], top: int = 30) -> None:
    table = Table(
        title="🕷️  GrowlingEyes — Intelligence Scraper",
        show_lines=True,
    )
    table.add_column("Source", style="cyan", width=14)
    table.add_column("Category", style="yellow", width=18)
    table.add_column("Title", style="white", max_width=60)
    table.add_column("Description", style="dim", max_width=50)

    for item in items[:top]:
        table.add_row(item.source, item.category, item.title[:60], item.description[:50])

    console.print(table)
    console.print(f"\n  Total items scraped: [bold cyan]{len(items)}[/]")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="GrowlingEyes — Intelligence Scraper")
    parser.add_argument(
        "--targets",
        nargs="+",
        choices=list(SCRAPER_MAP.keys()),
        default=None,
        help="Scrapers to run (default: all)",
    )
    parser.add_argument("--limit", type=int, default=25, help="Items per scraper")
    parser.add_argument("--output", type=str, help="Save results to JSON file")
    args = parser.parse_args()

    console.rule("[bold cyan]🕷️  GrowlingEyes — Scraper[/]")
    items = scrape_all(targets=args.targets, limit=args.limit)
    if not items:
        console.print("[yellow]No items scraped.[/]")
        return

    display_items(items)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump([i.to_dict() for i in items], fh, indent=2, default=str)
        console.print(f"\n  💾 Saved to [cyan]{args.output}[/]")


if __name__ == "__main__":
    main()
