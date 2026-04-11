#!/usr/bin/env python3
"""
sample_pendle_locker_cli.py — Pendle PT/YT Locker Example
penny-sovereign-yield-scout | Samples | Freedom Angel Corp / Audrey Evans

Demonstrates how to query Pendle Finance markets via their v2 API and
identify the best Principal Token (PT) locking opportunities.

PT tokens have ZERO impermanent loss and offer fixed APY until maturity.
This is the core "penny sovereign yield" strategy for risk-averse capital.

Run:
    python samples/sample_pendle_locker_cli.py
    python samples/sample_pendle_locker_cli.py --min-apy 50 --chain arbitrum
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from typing import Optional

import httpx
from rich.console import Console
from rich.table import Table

console = Console()

PENDLE_API_BASE = "https://api-v2.pendle.finance/core/v1"
CHAINS = {
    "ethereum": 1,
    "arbitrum": 42161,
    "bsc": 56,
    "optimism": 10,
}


def fetch_pendle_markets(chain: str = "arbitrum") -> list[dict]:
    """Fetch active Pendle Finance markets for a given chain."""
    chain_id = CHAINS.get(chain.lower(), 42161)
    url = f"{PENDLE_API_BASE}/{chain_id}/markets?order_by=implied_apy%3Adesc&skip=0&limit=50&is_expired=false"
    try:
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", [])
    except httpx.HTTPError as exc:
        console.print(f"[yellow]Pendle API unavailable ({exc}) — using mock data[/]")
        return _mock_pendle_markets()


def _mock_pendle_markets() -> list[dict]:
    """Mock Pendle market data for demo/offline use."""
    return [
        {
            "address": "0xf7d5adb9b37df04abe584768ade2e0c8f3a3f22c",
            "name": "PT-eETH-26JUN2026",
            "underlyingAsset": {"symbol": "eETH", "price": {"usd": 3521.45}},
            "pt": {"address": "0x1111", "price": {"usd": 3214.80}},
            "impliedApy": 115.2,
            "lpApy": 8.4,
            "maturity": "2026-06-26T00:00:00Z",
            "liquidity": {"usd": 42_100_000},
            "volumeUsd24h": 1_200_000,
        },
        {
            "address": "0xa20f93e3f80e07df3d5e98f28d2c16f7bc37d85d",
            "name": "PT-wstETH-26DEC2026",
            "underlyingAsset": {"symbol": "wstETH", "price": {"usd": 4012.10}},
            "pt": {"address": "0x2222", "price": {"usd": 3780.50}},
            "impliedApy": 8.5,
            "lpApy": 6.2,
            "maturity": "2026-12-26T00:00:00Z",
            "liquidity": {"usd": 89_500_000},
            "volumeUsd24h": 3_400_000,
        },
        {
            "address": "0xb30e7e2f7f9b83e7d8e6a1c0b2d4f5e8a9c1d3e5",
            "name": "PT-USDC-26SEP2026",
            "underlyingAsset": {"symbol": "USDC", "price": {"usd": 1.00}},
            "pt": {"address": "0x3333", "price": {"usd": 0.9712}},
            "impliedApy": 12.4,
            "lpApy": 4.1,
            "maturity": "2026-09-26T00:00:00Z",
            "liquidity": {"usd": 24_800_000},
            "volumeUsd24h": 890_000,
        },
        {
            "address": "0xc40f8f3g18f94f8e9b94b1d1c3e5f7g9b1d3f5g7",
            "name": "PT-rsETH-26JUN2026",
            "underlyingAsset": {"symbol": "rsETH", "price": {"usd": 3580.20}},
            "pt": {"address": "0x4444", "price": {"usd": 3215.90}},
            "impliedApy": 78.3,
            "lpApy": 12.1,
            "maturity": "2026-06-26T00:00:00Z",
            "liquidity": {"usd": 11_300_000},
            "volumeUsd24h": 450_000,
        },
    ]


def days_to_maturity(maturity_iso: str) -> int:
    """Calculate days remaining until a PT matures."""
    try:
        maturity = datetime.fromisoformat(maturity_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return max(0, (maturity - now).days)
    except (ValueError, AttributeError):
        return 0


def display_markets(markets: list[dict], min_apy: float = 0.0, top: int = 10) -> None:
    filtered = [m for m in markets if m.get("impliedApy", 0) >= min_apy]
    filtered.sort(key=lambda m: m.get("impliedApy", 0), reverse=True)

    table = Table(
        title="🔒 Pendle Finance — PT Locking Opportunities\n[dim]Zero IL | Fixed APY | Buy PT below face value[/]",
        show_lines=True,
    )
    table.add_column("Rank", style="dim", width=4)
    table.add_column("Market", style="bold cyan")
    table.add_column("PT APY", style="bold yellow")
    table.add_column("LP APY", style="white")
    table.add_column("Maturity", style="white")
    table.add_column("Days Left", style="white")
    table.add_column("Liquidity", style="white")
    table.add_column("IL Risk", style="green")

    for i, m in enumerate(filtered[:top], 1):
        days = days_to_maturity(m.get("maturity", ""))
        days_colour = "green" if days > 90 else "yellow" if days > 30 else "red"
        table.add_row(
            str(i),
            m.get("name", "—"),
            f"{m.get('impliedApy', 0):.2f}%",
            f"{m.get('lpApy', 0):.2f}%",
            m.get("maturity", "—")[:10],
            f"[{days_colour}]{days}d[/]",
            f"${m.get('liquidity', {}).get('usd', 0):>12,.0f}",
            "[bold green]NONE ✅[/]",
        )

    console.print(table)
    console.print()
    console.print("[bold]💡 Strategy:[/] Buy PT tokens before expiry to lock in the fixed APY.")
    console.print("  PT price < face value = discount = your yield. Zero IL, no active management.")
    console.print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Pendle PT Locker — sample CLI")
    parser.add_argument("--chain", default="arbitrum", choices=list(CHAINS.keys()))
    parser.add_argument("--min-apy", type=float, default=0.0)
    parser.add_argument("--top", type=int, default=10)
    parser.add_argument("--output", type=str)
    args = parser.parse_args()

    console.rule("[bold cyan]🔒 Pendle PT Locker — Penny Sovereign Yield[/]")
    console.print(f"  Chain: [bold]{args.chain}[/] | Min APY: [yellow]{args.min_apy}%[/]")
    console.print()

    markets = fetch_pendle_markets(chain=args.chain)
    display_markets(markets, min_apy=args.min_apy, top=args.top)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(markets[:args.top], f, indent=2, default=str)
        console.print(f"💾 Saved to [cyan]{args.output}[/]")


if __name__ == "__main__":
    main()
