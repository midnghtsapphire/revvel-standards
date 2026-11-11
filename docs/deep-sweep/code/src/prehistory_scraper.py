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
Scrapes the publicly available Danube Script sign inventories
from prehistory.it and structures them as JSON for pattern analysis.
"""
import requests
from bs4 import BeautifulSoup
import json
import re
from pathlib import Path

BASE_URL = "https://www.prehistory.it/ftp/inventory/danube_script/"

# The Winn inventory is paginated: danube_script_01.htm through _06.htm
INVENTORY_PAGES = [f"danube_script_{i:02d}.htm" for i in range(1, 7)]


def parse_inventory_page(html: str) -> list[dict]:
    """
    Parse one page of the Winn Danube Script inventory.
    Extracts sign categories, DS numbers, and descriptions.
    """
    soup = BeautifulSoup(html, "html.parser")
    signs = []

    # Each page has category headers like "I. Signs based on V"
    # followed by sign entries
    current_category = None

    for elem in soup.find_all(["h2", "h3", "p", "tr"]):
        text = elem.get_text(strip=True)

        # Detect category headers (Roman numerals)
        cat_match = re.match(r"^([IVX]+)\.\s+(.+)$", text)
        if cat_match:
            current_category = {
                "numeral": cat_match.group(1),
                "name": cat_match.group(2),
                "signs": [],
            }
            signs.append(current_category)
            continue

        # Detect sign ranges like "DS 1-23"
        ds_match = re.search(r"DS\s*(\d+)(?:\s*-\s*(\d+))?", text)
        if ds_match and current_category is not None:
            start = int(ds_match.group(1))
            end = int(ds_match.group(2)) if ds_match.group(2) else start
            current_category["signs"].append({
                "ds_range": [start, end],
                "description": text,
            })

    return signs


def scrape_full_inventory(output_path="data/corpora/danube_winn.json"):
    """Scrape all inventory pages and save structured JSON."""
    all_signs = []

    for page in INVENTORY_PAGES:
        url = BASE_URL + page
        print(f"[~] Fetching {url}...")
        try:
            resp = requests.get(url, timeout=15)
            resp.encoding = "utf-8"
            if resp.status_code == 200:
                page_signs = parse_inventory_page(resp.text)
                all_signs.extend(page_signs)
                print(f"    → Parsed {len(page_signs)} categories")
        except Exception as e:
            print(f"  [!] Failed: {e}")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump({"source": BASE_URL, "catalog": "Shan M.M. Winn DS Inventory", "categories": all_signs}, f, indent=2)

    print(f"\nSaved {len(all_signs)} categories to {output_path}")
    return all_signs


if __name__ == "__main__":
    scrape_full_inventory()
