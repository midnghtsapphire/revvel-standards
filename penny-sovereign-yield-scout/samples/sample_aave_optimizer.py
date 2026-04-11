#!/usr/bin/env python3
"""
sample_aave_optimizer.py — Aave v3 Rate Optimizer Example
penny-sovereign-yield-scout | Samples | Freedom Angel Corp / Audrey Evans

Demonstrates how to:
  1. Query current Aave v3 supply/borrow rates across chains via DeFiLlama
  2. Identify the best cross-chain rate opportunities
  3. Simulate a looping strategy (supply → borrow → supply)
  4. Calculate net APY after fees for a given position size

The key insight: Aave allows "looping" — supply collateral, borrow against it,
supply again — to multiply effective APY. This works best on stable assets.

Run:
    python samples/sample_aave_optimizer.py
    python samples/sample_aave_optimizer.py --asset USDC --loop-ltv 0.75
    python samples/sample_aave_optimizer.py --show-loop-sim --position-usd 10000
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()

DEFILLAMA_BASE = os.getenv("DEFILLAMA_BASE_URL", "https://yields.llama.fi")
AAVE_SLUG = "aave-v3"


# ─── Data models ──────────────────────────────────────────────────────────────

@dataclass
class AaveMarket:
    chain: str
    symbol: str
    supply_apy: float
    borrow_apy_stable: float
    borrow_apy_variable: float
    tvl_usd: float
    utilisation_rate: float
    pool_id: str


@dataclass
class LoopSimResult:
    asset: str
    chain: str
    position_usd: float
    ltv: float
    loops: int
    effective_supply_usd: float
    effective_borrow_usd: float
    gross_supply_apy: float
    borrow_cost_apy: float
    net_apy: float
    leverage_multiple: float


# ─── Fetch Aave markets ───────────────────────────────────────────────────────

def fetch_aave_markets(asset_filter: str = "") -> list[AaveMarket]:
    """Fetch Aave v3 markets from DeFiLlama pools API."""
    try:
        resp = httpx.get(f"{DEFILLAMA_BASE}/pools", timeout=30)
        resp.raise_for_status()
        all_pools = resp.json().get("data", [])
    except httpx.HTTPError:
        console.print("[yellow]DeFiLlama unavailable — using mock data[/]")
        return _mock_aave_markets(asset_filter)

    aave_pools = [
        p for p in all_pools
        if AAVE_SLUG in p.get("project", "").lower()
        and (not asset_filter or asset_filter.upper() in p.get("symbol", "").upper())
        and p.get("tvlUsd", 0) > 100_000
    ]

    markets = []
    for p in aave_pools:
        # DeFiLlama sometimes splits supply/borrow into separate rows
        markets.append(AaveMarket(
            chain=p.get("chain", "—"),
            symbol=p.get("symbol", "—"),
            supply_apy=p.get("apyBase", 0) or 0,
            borrow_apy_stable=p.get("apyBaseBorrow", 0) or 0,
            borrow_apy_variable=p.get("apyBaseBorrow", 0) or 0,
            tvl_usd=p.get("tvlUsd", 0) or 0,
            utilisation_rate=p.get("utilRate", 0) or 0,
            pool_id=p.get("pool", ""),
        ))

    return markets


def _mock_aave_markets(asset_filter: str = "") -> list[AaveMarket]:
    """Mock Aave market data for offline/demo use."""
    raw = [
        ("Ethereum", "USDC",  5.12, 7.80, 6.90,  450_000_000, 0.82),
        ("Arbitrum", "USDC",  6.45, 8.20, 7.50,  280_000_000, 0.86),
        ("Polygon",  "USDC",  4.98, 7.40, 6.60,  120_000_000, 0.79),
        ("Base",     "USDC",  7.30, 9.10, 8.40,   85_000_000, 0.88),
        ("Ethereum", "USDT",  4.85, 7.10, 6.30,  380_000_000, 0.80),
        ("Arbitrum", "USDT",  5.92, 7.90, 7.10,  190_000_000, 0.83),
        ("Ethereum", "WETH",  3.24, 5.80, 4.90, 1_200_000_000, 0.71),
        ("Arbitrum", "WETH",  4.10, 6.20, 5.50,  420_000_000, 0.74),
        ("Ethereum", "WBTC",  2.15, 4.50, 3.80,  680_000_000, 0.65),
        ("Arbitrum", "DAI",   5.50, 7.60, 6.80,   95_000_000, 0.84),
        ("Optimism", "USDC",  5.80, 7.70, 6.95,  110_000_000, 0.85),
        ("Avalanche","USDC",  4.20, 6.80, 6.10,   72_000_000, 0.77),
    ]
    markets = []
    for chain, symbol, sup, stb, var_, tvl, util in raw:
        if not asset_filter or asset_filter.upper() in symbol.upper():
            markets.append(AaveMarket(chain, symbol, sup, stb, var_, tvl, util, f"mock-{chain}-{symbol}"))
    return sorted(markets, key=lambda m: m.supply_apy, reverse=True)


# ─── Loop simulator ───────────────────────────────────────────────────────────

def simulate_loop(
    market: AaveMarket,
    position_usd: float,
    ltv: float = 0.75,
    loops: int = 3,
) -> LoopSimResult:
    """
    Simulate a looping strategy on Aave.

    Loop strategy:
      1. Supply X USDC → earn supply_apy on X
      2. Borrow X × ltv USDC → pay borrow_apy on (X × ltv)
      3. Supply borrowed amount → earn supply_apy on (X × ltv)
      4. Borrow (X × ltv²) → ...
      Repeat for `loops` iterations.

    Net APY = supply_apy × (1 + ltv + ltv² + ... + ltv^loops)
              - borrow_apy × (ltv + ltv² + ... + ltv^loops)
    """
    supply_multiplier = sum(ltv ** i for i in range(loops + 1))
    borrow_multiplier = sum(ltv ** i for i in range(1, loops + 1))

    effective_supply = position_usd * supply_multiplier
    effective_borrow = position_usd * borrow_multiplier

    gross_supply_apy = market.supply_apy * supply_multiplier
    borrow_cost_apy = market.borrow_apy_variable * borrow_multiplier

    net_apy = gross_supply_apy - borrow_cost_apy

    return LoopSimResult(
        asset=market.symbol,
        chain=market.chain,
        position_usd=position_usd,
        ltv=ltv,
        loops=loops,
        effective_supply_usd=effective_supply,
        effective_borrow_usd=effective_borrow,
        gross_supply_apy=gross_supply_apy,
        borrow_cost_apy=borrow_cost_apy,
        net_apy=net_apy,
        leverage_multiple=supply_multiplier,
    )


# ─── Display functions ────────────────────────────────────────────────────────

def display_markets(markets: list[AaveMarket], top: int = 12) -> None:
    table = Table(
        title="🏦 Aave v3 — Best Supply Rates Across Chains",
        show_lines=True,
    )
    table.add_column("Chain", style="bold cyan")
    table.add_column("Asset", style="white")
    table.add_column("Supply APY", style="bold yellow")
    table.add_column("Borrow APY (Var)", style="white")
    table.add_column("Spread", style="bold green")
    table.add_column("TVL (USD)", style="white")
    table.add_column("Util %", style="dim")

    for m in sorted(markets, key=lambda x: x.supply_apy, reverse=True)[:top]:
        spread = m.supply_apy - m.borrow_apy_variable
        spread_colour = "green" if spread > 0 else "red"
        table.add_row(
            m.chain,
            m.symbol,
            f"{m.supply_apy:.2f}%",
            f"{m.borrow_apy_variable:.2f}%",
            f"[{spread_colour}]{spread:+.2f}%[/]",
            f"${m.tvl_usd:>12,.0f}",
            f"{m.utilisation_rate * 100:.1f}%",
        )
    console.print(table)


def display_loop_simulation(result: LoopSimResult) -> None:
    table = Table(
        title=f"🔄 Loop Simulation — {result.asset} on {result.chain}",
        show_lines=True,
    )
    table.add_column("Parameter", style="bold cyan")
    table.add_column("Value", style="white")

    table.add_row("Initial Position", f"${result.position_usd:,.2f}")
    table.add_row("LTV per Loop", f"{result.ltv * 100:.0f}%")
    table.add_row("Number of Loops", str(result.loops))
    table.add_row("Leverage Multiple", f"{result.leverage_multiple:.3f}×")
    table.add_row("Effective Supply", f"${result.effective_supply_usd:,.2f}")
    table.add_row("Effective Borrow", f"${result.effective_borrow_usd:,.2f}")
    table.add_row("Gross Supply APY", f"{result.gross_supply_apy:.2f}%")
    table.add_row("Borrow Cost APY", f"{result.borrow_cost_apy:.2f}%")
    table.add_row(
        "[bold]Net APY[/]",
        f"[bold yellow]{result.net_apy:.2f}%[/]" if result.net_apy > 0 else f"[red]{result.net_apy:.2f}%[/]",
    )

    console.print(table)
    console.print()
    if result.net_apy > 0:
        annual_profit = result.position_usd * result.net_apy / 100
        console.print(f"  💰 Projected annual profit: [bold green]${annual_profit:,.2f}[/]")
        console.print(f"     on [bold]{result.position_usd:,.0f}[/] initial capital (before gas/fees)")
    else:
        console.print("  [red]⚠️  Negative net APY — borrow cost exceeds supply yield at this LTV.[/]")
        console.print("  Try reducing --loop-ltv or --loops")


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Aave v3 Rate Optimizer — sample CLI")
    parser.add_argument("--asset", type=str, default="USDC", help="Asset to optimize (e.g. USDC, USDT, WETH)")
    parser.add_argument("--chain", type=str, default="", help="Filter by chain")
    parser.add_argument("--top", type=int, default=12)
    parser.add_argument("--show-loop-sim", action="store_true", help="Show loop simulation")
    parser.add_argument("--position-usd", type=float, default=10_000.0)
    parser.add_argument("--loop-ltv", type=float, default=0.75)
    parser.add_argument("--loops", type=int, default=3)
    parser.add_argument("--output", type=str)

    args = parser.parse_args()

    console.rule("[bold cyan]🏦 Aave v3 Rate Optimizer[/]")
    console.print(f"  Asset: [bold]{args.asset}[/] | Chain: [bold]{args.chain or 'all'}[/]")
    console.print()

    markets = fetch_aave_markets(asset_filter=args.asset)
    if args.chain:
        markets = [m for m in markets if args.chain.lower() in m.chain.lower()]

    display_markets(markets, top=args.top)

    if args.show_loop_sim and markets:
        console.print()
        console.rule("[bold cyan]🔄 Loop Strategy Simulation[/]")
        best = sorted(markets, key=lambda m: m.supply_apy, reverse=True)[0]
        result = simulate_loop(best, args.position_usd, args.loop_ltv, args.loops)
        display_loop_simulation(result)

    if args.output:
        data = [
            {
                "chain": m.chain,
                "symbol": m.symbol,
                "supply_apy": m.supply_apy,
                "borrow_apy_variable": m.borrow_apy_variable,
                "tvl_usd": m.tvl_usd,
                "utilisation_rate": m.utilisation_rate,
            }
            for m in markets[:args.top]
        ]
        with open(args.output, "w") as f:
            json.dump(data, f, indent=2)
        console.print(f"💾 Saved to [cyan]{args.output}[/]")


if __name__ == "__main__":
    main()
