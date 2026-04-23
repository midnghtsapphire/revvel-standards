#!/usr/bin/env python3
"""
il_shield.py — Impermanent Loss Protector
penny-sovereign-yield-scout | Freedom Angel Corp / Audrey Evans

Calculates estimated impermanent loss for LP positions and blocks
entry when IL exposure exceeds the configured threshold.

Usage:
    python tools/il_shield.py --token0 ETH --token1 USDC --price-ratio 1.5
    python tools/il_shield.py --price-ratio 2.0 --max-il 5.0
    python tools/il_shield.py --check-all-positions
    python tools/il_shield.py --simulate-range 0.5 10.0
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

from rich.console import Console
from rich.table import Table

console = Console()


# ─── Core IL calculations ─────────────────────────────────────────────────────

def impermanent_loss_50_50(price_ratio: float) -> float:
    """
    Calculate IL for a standard 50/50 AMM pool (Uniswap v2-style).

    IL = 2 × sqrt(price_ratio) / (1 + price_ratio) - 1

    Args:
        price_ratio: Current price / Entry price for the volatile token
                     (1.0 = no change, 2.0 = price doubled, 0.5 = price halved)

    Returns:
        IL as a negative float (e.g. -0.057 = -5.7%)
    """
    if price_ratio <= 0:
        raise ValueError("price_ratio must be > 0")
    return 2 * math.sqrt(price_ratio) / (1 + price_ratio) - 1


def impermanent_loss_weighted(price_ratio: float, weight_a: float = 0.5) -> float:
    """
    Calculate IL for a weighted pool (Balancer-style).
    weight_a = weight of token A (e.g. 0.8 for 80/20 pool)

    Returns IL as a negative float.
    """
    if not (0 < weight_a < 1):
        raise ValueError("weight_a must be between 0 and 1 exclusive")
    weight_b = 1.0 - weight_a
    il = (price_ratio ** weight_b) / (weight_a + weight_b * price_ratio) - 1
    return il


def concentrated_liquidity_il(
    price_ratio: float,
    price_lower: float,
    price_upper: float,
) -> float:
    """
    Estimate IL for a Uniswap v3 concentrated liquidity position.

    Args:
        price_ratio: Current price / Entry price
        price_lower: Lower bound of range as ratio to entry price
        price_upper: Upper bound of range as ratio to entry price

    Returns:
        IL as a negative float (0.0 if price is within range)

    Raises:
        ValueError: If price_lower >= price_upper (degenerate range has no
            liquidity and is undefined for IL calculations).
    """
    if price_lower >= price_upper:
        raise ValueError(
            "price_lower must be < price_upper "
            f"(got price_lower={price_lower}, price_upper={price_upper})"
        )
    if price_lower <= price_ratio <= price_upper:
        # Price within range — calculate adjusted IL
        r = price_ratio
        rl = price_lower
        ru = price_upper
        # Simplified: actual IL scales with how close to edge
        edge_proximity = min(
            abs(r - rl) / (ru - rl),
            abs(r - ru) / (ru - rl),
        )
        base_il = impermanent_loss_50_50(price_ratio)
        return base_il * (1 - edge_proximity)
    else:
        # Price outside range — position is fully one-sided (max IL scenario)
        return impermanent_loss_50_50(price_ratio)


# ─── Shield decision ──────────────────────────────────────────────────────────

@dataclass
class ShieldResult:
    token0: str
    token1: str
    price_ratio: float
    pool_type: str
    estimated_il_pct: float
    max_il_pct: float
    shield_approved: bool
    reason: str
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return asdict(self)


def shield_check(
    token0: str,
    token1: str,
    price_ratio: float,
    max_il_pct: float = 5.0,
    pool_type: str = "50_50",
    weight_a: float = 0.5,
    price_lower: Optional[float] = None,
    price_upper: Optional[float] = None,
) -> ShieldResult:
    """
    Run the IL shield check for a potential LP position.

    Args:
        token0: Name/ticker of token 0
        token1: Name/ticker of token 1
        price_ratio: Expected or current price_ratio (current_price / entry_price)
        max_il_pct: Maximum acceptable IL in percent (default: 5.0%)
        pool_type: "50_50", "weighted", or "concentrated"
        weight_a: Weight of token0 for weighted pools
        price_lower: Lower bound ratio for concentrated liquidity
        price_upper: Upper bound ratio for concentrated liquidity

    Returns:
        ShieldResult with shield_approved bool and estimated IL
    """
    if pool_type == "50_50":
        il_decimal = impermanent_loss_50_50(price_ratio)
    elif pool_type == "weighted":
        il_decimal = impermanent_loss_weighted(price_ratio, weight_a)
    elif pool_type == "concentrated":
        if price_lower is None or price_upper is None:
            raise ValueError("price_lower and price_upper required for concentrated pools")
        il_decimal = concentrated_liquidity_il(price_ratio, price_lower, price_upper)
    else:
        raise ValueError(f"Unknown pool_type: {pool_type}")

    il_pct = abs(il_decimal) * 100.0  # Convert to positive percentage
    approved = il_pct <= max_il_pct
    reason = (
        f"✅ IL {il_pct:.2f}% ≤ max {max_il_pct:.2f}% — position approved"
        if approved
        else f"❌ IL {il_pct:.2f}% > max {max_il_pct:.2f}% — position BLOCKED by shield"
    )

    return ShieldResult(
        token0=token0,
        token1=token1,
        price_ratio=price_ratio,
        pool_type=pool_type,
        estimated_il_pct=round(il_pct, 4),
        max_il_pct=max_il_pct,
        shield_approved=approved,
        reason=reason,
    )


# ─── IL simulation table ──────────────────────────────────────────────────────

def simulate_il_range(
    price_min: float = 0.5,
    price_max: float = 10.0,
    steps: int = 15,
    pool_type: str = "50_50",
) -> None:
    """Print an IL reference table for a range of price ratios."""
    ratios = [price_min * ((price_max / price_min) ** (i / (steps - 1))) for i in range(steps)]

    table = Table(title=f"IL Reference Table — {pool_type} pool", show_lines=True)
    table.add_column("Price Ratio", style="bold cyan")
    table.add_column("Price Change", style="white")
    table.add_column("IL (%)", style="bold yellow")
    table.add_column("Hold vs LP", style="white")

    for r in ratios:
        il = abs(impermanent_loss_50_50(r)) * 100
        change = (r - 1) * 100
        change_str = f"+{change:.0f}%" if change >= 0 else f"{change:.0f}%"
        hold_vs_lp = f"[green]Hold wins by {il:.2f}%[/]" if il > 1 else f"[dim]{il:.2f}%[/]"
        table.add_row(
            f"{r:.2f}×",
            change_str,
            f"{il:.2f}%",
            hold_vs_lp,
        )

    console.print(table)


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="IL Shield — Impermanent Loss Protector"
    )
    parser.add_argument("--token0", type=str, default="TOKEN_A")
    parser.add_argument("--token1", type=str, default="TOKEN_B")
    parser.add_argument("--price-ratio", type=float, default=1.0,
                        help="Expected price ratio at exit (current/entry)")
    parser.add_argument("--max-il", type=float, default=5.0,
                        help="Max acceptable IL in percent (default: 5.0)")
    parser.add_argument("--pool-type", choices=["50_50", "weighted", "concentrated"],
                        default="50_50")
    parser.add_argument("--weight-a", type=float, default=0.5,
                        help="Token0 weight for weighted pools (0-1)")
    parser.add_argument("--price-lower", type=float, help="Lower bound ratio (concentrated)")
    parser.add_argument("--price-upper", type=float, help="Upper bound ratio (concentrated)")
    parser.add_argument("--simulate-range", nargs=2, type=float, metavar=("MIN", "MAX"),
                        help="Simulate IL across a price ratio range")
    parser.add_argument("--check-all-positions", action="store_true",
                        help="Check all tracked positions (stub)")

    args = parser.parse_args()
    console.rule("[bold cyan]🛡️  IL Shield — Impermanent Loss Protector[/]")

    if args.simulate_range:
        simulate_il_range(args.simulate_range[0], args.simulate_range[1])
        return

    if args.check_all_positions:
        console.print("[yellow]No positions tracked yet. Enter positions via auto_compounder_api.py[/]")
        return

    result = shield_check(
        token0=args.token0,
        token1=args.token1,
        price_ratio=args.price_ratio,
        max_il_pct=args.max_il,
        pool_type=args.pool_type,
        weight_a=args.weight_a,
        price_lower=args.price_lower,
        price_upper=args.price_upper,
    )

    table = Table(title="🛡️  IL Shield Result", show_lines=True)
    table.add_column("Parameter", style="bold cyan")
    table.add_column("Value", style="white")

    table.add_row("Token Pair", f"{result.token0} / {result.token1}")
    table.add_row("Pool Type", result.pool_type)
    table.add_row("Price Ratio", f"{result.price_ratio:.4f}×")
    table.add_row("Estimated IL", f"{result.estimated_il_pct:.4f}%")
    table.add_row("Max Allowed IL", f"{result.max_il_pct:.2f}%")
    table.add_row(
        "Shield Decision",
        f"[bold green]APPROVED ✅[/]" if result.shield_approved else f"[bold red]BLOCKED ❌[/]",
    )
    table.add_row("Reason", result.reason)

    console.print(table)

    if not result.shield_approved:
        console.print("\n[bold red]⚠️  Position blocked by IL shield. Consider:[/]")
        console.print("  • Using a stable pair (USDC/USDT — near-zero IL)")
        console.print("  • Increasing max-il threshold if you accept higher risk: --max-il 10")
        console.print("  • Using a single-sided strategy (Pendle PT, Aave lending)")
        console.print("  • Hedging with a short position on the volatile token")


if __name__ == "__main__":
    main()
