#!/usr/bin/env python3
"""
yield_scraper_cli.py — Live 50-Protocol Sweeper CLI
penny-sovereign-yield-scout | Freedom Angel Corp / Audrey Evans

Sweeps all 50 protocols defined in config/50_apis_protocols.json against the
DeFiLlama yields API, scores each pool by opportunity_score, and returns a
ranked list filtered by the user's criteria.

Usage:
    python tools/yield_scraper_cli.py --top 10
    python tools/yield_scraper_cli.py --min-apy 15 --top 20
    python tools/yield_scraper_cli.py --chain arbitrum --top 5
    python tools/yield_scraper_cli.py --top 20 --output results.json
    python tools/yield_scraper_cli.py --watch --alert-tvl-drop 20
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()
logging.basicConfig(level=logging.WARNING, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("yield_scraper")

DEFILLAMA_BASE = os.getenv("DEFILLAMA_BASE_URL", "https://yields.llama.fi")
CONFIG_PATH = Path(__file__).parent.parent / "config" / "50_apis_protocols.json"


# ─── Load protocol config ─────────────────────────────────────────────────────

def load_protocols() -> list[dict]:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data["protocols"]


# ─── Opportunity scoring ──────────────────────────────────────────────────────

IL_RISK_MAP = {
    "none": 0.0,
    "low": 0.20,
    "medium": 0.45,
    "high": 0.80,
    "varies": 0.40,
}

RUG_RISK_MAP = {
    1: 0.02,  # Tier 1 — battle-tested
    2: 0.10,  # Tier 2 — emerging
    3: 0.25,  # Tier 3 — experimental
}


def compute_opportunity_score(
    apy: float,
    tvl_usd: float,
    il_risk: str,
    tier: int,
) -> float:
    """
    opportunity_score = (apy_net / 100) × log10(tvl_usd) × (1 - il_risk) × (1 - rug_risk)

    Returns a float; higher is better.
    """
    if apy <= 0 or tvl_usd <= 0:
        return 0.0
    apy_factor = apy / 100.0
    tvl_factor = math.log10(max(tvl_usd, 1))
    il_factor = 1.0 - IL_RISK_MAP.get(il_risk, 0.5)
    rug_factor = 1.0 - RUG_RISK_MAP.get(tier, 0.3)
    return round(apy_factor * tvl_factor * il_factor * rug_factor, 4)


# ─── DeFiLlama fetch ──────────────────────────────────────────────────────────

def fetch_all_pools(timeout: int = 60) -> list[dict]:
    """Fetch all yield pools from DeFiLlama."""
    console.print(f"  🌐 Fetching pools from [cyan]{DEFILLAMA_BASE}/pools[/] ...", end="")
    resp = httpx.get(f"{DEFILLAMA_BASE}/pools", timeout=timeout)
    resp.raise_for_status()
    pools = resp.json().get("data", [])
    console.print(f" [green]{len(pools):,} pools loaded[/]")
    return pools


def match_pools_to_protocols(
    all_pools: list[dict],
    protocols: list[dict],
    chain_filter: Optional[str] = None,
) -> list[dict]:
    """
    Cross-reference DeFiLlama pools with our 50 protocol list.
    Returns enriched pool records with tier, il_risk, and opportunity_score.
    """
    protocol_lookup = {p["defillama_slug"].lower(): p for p in protocols}
    enriched = []

    for pool in all_pools:
        project = pool.get("project", "").lower()
        if project not in protocol_lookup:
            continue

        proto = protocol_lookup[project]

        # Chain filter
        if chain_filter:
            pool_chain = pool.get("chain", "").lower()
            if chain_filter.lower() not in pool_chain:
                continue

        apy = pool.get("apy") or 0.0
        tvl_usd = pool.get("tvlUsd") or 0.0

        score = compute_opportunity_score(
            apy=apy,
            tvl_usd=tvl_usd,
            il_risk=proto["il_risk"],
            tier=proto["tier"],
        )

        enriched.append({
            "rank": 0,
            "protocol": proto["name"],
            "tier": proto["tier"],
            "chain": pool.get("chain", "—"),
            "symbol": pool.get("symbol", "—"),
            "apy": round(apy, 2),
            "tvl_usd": round(tvl_usd, 2),
            "il_risk": proto["il_risk"],
            "opportunity_score": score,
            "pool_id": pool.get("pool", ""),
            "project_slug": project,
            "stablecoin": pool.get("stablecoin", False),
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return enriched


def filter_and_rank(
    pools: list[dict],
    min_apy: float = 0.0,
    min_tvl: float = 500_000.0,
    top: int = 20,
) -> list[dict]:
    """Filter by APY/TVL minimums, rank by opportunity_score."""
    filtered = [
        p for p in pools
        if p["apy"] >= min_apy and p["tvl_usd"] >= min_tvl
    ]
    filtered.sort(key=lambda p: p["opportunity_score"], reverse=True)
    for i, pool in enumerate(filtered[:top], 1):
        pool["rank"] = i
    return filtered[:top]


# ─── Display ──────────────────────────────────────────────────────────────────

def display_results(pools: list[dict], title: str = "Yield Sweep Results") -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    table = Table(
        title=f"🪙 Penny Sovereign Yield Scout — {title}\n[dim]{timestamp}[/]",
        show_lines=True,
    )
    table.add_column("Rank", style="dim", width=4)
    table.add_column("Protocol", style="bold cyan")
    table.add_column("Chain", style="white")
    table.add_column("Pool", style="white")
    table.add_column("APY", style="bold yellow")
    table.add_column("TVL (USD)", style="white")
    table.add_column("IL Risk", style="white")
    table.add_column("Score", style="bold green")

    for pool in pools:
        il_colour = {"none": "green", "low": "yellow", "medium": "orange3", "high": "red"}.get(
            pool["il_risk"], "white"
        )
        table.add_row(
            str(pool["rank"]),
            pool["protocol"],
            pool["chain"],
            pool["symbol"][:22],
            f"{pool['apy']:.2f}%",
            f"${pool['tvl_usd']:>12,.0f}",
            f"[{il_colour}]{pool['il_risk']}[/]",
            f"{pool['opportunity_score']:.4f}",
        )
    console.print(table)


# ─── Watch mode ───────────────────────────────────────────────────────────────

def watch_mode(args: argparse.Namespace, protocols: list[dict]) -> None:
    """Continuously sweep and alert on TVL drops."""
    prev_tvl: dict[str, float] = {}
    console.print(f"[bold green]Watch mode active — refreshing every 60s[/]")
    while True:
        try:
            all_pools = fetch_all_pools()
            matched = match_pools_to_protocols(all_pools, protocols, chain_filter=args.chain)
            ranked = filter_and_rank(matched, min_apy=args.min_apy, min_tvl=args.min_tvl, top=args.top)

            for pool in ranked:
                key = pool["pool_id"]
                if key in prev_tvl:
                    drop_pct = (prev_tvl[key] - pool["tvl_usd"]) / max(prev_tvl[key], 1) * 100
                    if drop_pct >= args.alert_tvl_drop:
                        console.print(
                            f"[bold red]⚠️  TVL ALERT: {pool['protocol']} {pool['symbol']} "
                            f"dropped {drop_pct:.1f}% in last cycle! EXIT CANDIDATE.[/]"
                        )
                prev_tvl[key] = pool["tvl_usd"]

            display_results(ranked)
            time.sleep(60)

        except httpx.HTTPError as exc:
            console.print(f"[yellow]HTTP error: {exc} — retrying in 30s[/]")
            time.sleep(30)
        except KeyboardInterrupt:
            console.print("\n[dim]Watch mode stopped.[/]")
            break


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Penny Sovereign Yield Scout — Live 50-Protocol Sweeper"
    )
    parser.add_argument("--top", type=int, default=10, help="Number of top results")
    parser.add_argument("--min-apy", type=float, default=0.0, help="Minimum APY filter (%)")
    parser.add_argument("--min-tvl", type=float, default=500_000.0, help="Minimum TVL filter (USD)")
    parser.add_argument("--chain", type=str, help="Filter by chain (e.g. arbitrum)")
    parser.add_argument("--output", type=str, help="Save results to JSON file")
    parser.add_argument("--watch", action="store_true", help="Continuous watch mode")
    parser.add_argument("--alert-tvl-drop", type=float, default=20.0, help="TVL drop % alert threshold")

    args = parser.parse_args()

    console.rule("[bold cyan]🪙 Penny Sovereign Yield Scout — Live Sweep[/]")

    protocols = load_protocols()
    console.print(f"  Loaded [bold]{len(protocols)}[/] protocols from config/50_apis_protocols.json")

    if args.watch:
        watch_mode(args, protocols)
        return

    try:
        all_pools = fetch_all_pools()
    except httpx.HTTPError as exc:
        console.print(f"[red]Failed to fetch pools: {exc}[/]")
        console.print("[yellow]Running in offline/demo mode — generating mock data[/]")
        all_pools = _generate_mock_pools(protocols)

    matched = match_pools_to_protocols(all_pools, protocols, chain_filter=args.chain)
    console.print(f"  Matched [bold]{len(matched)}[/] pools across your 50 protocols")

    ranked = filter_and_rank(
        matched,
        min_apy=args.min_apy,
        min_tvl=args.min_tvl,
        top=args.top,
    )

    if not ranked:
        console.print("[yellow]No results matched your filters. Try lowering --min-apy or --min-tvl.[/]")
        return

    display_results(ranked)

    log_dir = Path(os.getenv("VERIFIABLE_LOG_DIR", "./logs"))
    log_dir.mkdir(parents=True, exist_ok=True)
    output_path = args.output or str(
        log_dir / f"sweep_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(ranked, f, indent=2, default=str)
    console.print(f"\n  💾 Results saved to [cyan]{output_path}[/]")


def _generate_mock_pools(protocols: list[dict]) -> list[dict]:
    """Generate mock pool data for offline/demo mode."""
    import random
    mock = []
    for proto in protocols:
        min_apy, max_apy = proto.get("typical_apy_range", [5, 30])
        chains = proto.get("chain", ["ethereum"])
        for chain in chains[:2]:
            mock.append({
                "project": proto["defillama_slug"],
                "symbol": f"{proto['name'].split()[0].upper()}-USDC",
                "chain": chain,
                "apy": round(random.uniform(min_apy, max_apy), 2),
                "tvlUsd": random.uniform(proto.get("min_tvl_usd", 500000), proto.get("min_tvl_usd", 500000) * 10),
                "pool": f"mock-{proto['id']}-{chain}",
                "stablecoin": False,
            })
    return mock


if __name__ == "__main__":
    main()
