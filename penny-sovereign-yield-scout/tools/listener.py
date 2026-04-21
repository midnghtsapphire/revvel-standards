#!/usr/bin/env python3
"""
listener.py — Social Scanner → Penny Yield Signal Detector
penny-sovereign-yield-scout | Freedom Angel Corp / Audrey Evans

Monitors Twitter/X, Reddit, and Telegram for penny-priced assets with
high-yield DeFi signals. Scores each signal and surfaces candidates that
exceed the sentiment threshold for a full protocol sweep.

Usage:
    python tools/listener.py
    python tools/listener.py --threshold 0.70 --top 20
    python tools/listener.py --daemon --interval 600
    python tools/listener.py --mode governance --protocols tier1
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor


from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("listener")

# ─── Constants ────────────────────────────────────────────────────────────────

YIELD_KEYWORDS = [
    "APY", "yield", "APR", "farming", "liquidity pool", "LP",
    "staking", "compound", "borrow rate", "supply rate",
    "PT", "YT", "vault", "auto-compound", "rebase",
]

PENNY_KEYWORDS = [
    "penny", "sub-cent", "micro cap", "low cap", "hidden gem",
    "undervalued", "early", "100x", "1000x", "small cap",
]

RISK_KEYWORDS_NEGATIVE = [
    "rug", "exploit", "hack", "scam", "exit scam", "drain",
    "vulnerability", "audit failed", "honeypot",
]

SOCIAL_PLATFORMS = {
    "twitter": "Twitter/X",
    "reddit": "Reddit",
    "telegram": "Telegram",
}


# ─── Data models ──────────────────────────────────────────────────────────────

@dataclass
class SocialSignal:
    ticker: str
    platform: str
    mention_count_24h: int
    yield_keywords_found: list[str]
    penny_keywords_found: list[str]
    risk_flags: list[str]
    raw_text_sample: str
    sentiment_score: float = 0.0
    signal_timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    recommended_action: str = "HOLD"

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Sentiment scoring ────────────────────────────────────────────────────────

def score_signal(signal: SocialSignal) -> float:
    """
    Compute a composite sentiment score [0.0, 1.0] for a social signal.

    Factors:
      - Yield keyword density: +0.35 weight
      - Penny keyword density: +0.25 weight
      - Mention volume (log-normalised): +0.25 weight
      - Risk flags present: -0.15 per flag (capped at -0.50)
    """
    yield_score = min(len(signal.yield_keywords_found) / max(len(YIELD_KEYWORDS), 1), 1.0) * 0.35
    penny_score = min(len(signal.penny_keywords_found) / max(len(PENNY_KEYWORDS), 1), 1.0) * 0.25
    mention_score = min(signal.mention_count_24h / 5000.0, 1.0) * 0.25
    risk_penalty = min(len(signal.risk_flags) * 0.15, 0.50)

    raw = yield_score + penny_score + mention_score - risk_penalty
    return round(max(0.0, min(raw, 1.0)), 4)


def classify_action(score: float) -> str:
    if score >= 0.80:
        return "SWEEP_PRIORITY"
    if score >= 0.65:
        return "SWEEP"
    if score >= 0.45:
        return "WATCH"
    return "HOLD"


# ─── Mock data source (replace with real API calls in production) ─────────────

def _mock_twitter_scan(ticker: str) -> dict:
    """
    Placeholder for real Twitter/X API v2 call.
    Replace with tweepy.Client(bearer_token=os.getenv('TWITTER_BEARER_TOKEN')).
    """
    import random
    random.seed(hashlib.sha256(ticker.encode()).digest()[0])
    mentions = random.randint(50, 2500)
    found_yield = random.sample(YIELD_KEYWORDS, k=random.randint(0, 5))
    found_penny = random.sample(PENNY_KEYWORDS, k=random.randint(0, 3))
    risk = random.sample(RISK_KEYWORDS_NEGATIVE, k=random.randint(0, 1))
    return {
        "mention_count_24h": mentions,
        "yield_keywords_found": found_yield,
        "penny_keywords_found": found_penny,
        "risk_flags": risk,
        "raw_text_sample": f"Mock Twitter data for ${ticker}",
    }


def _mock_reddit_scan(ticker: str) -> dict:
    """
    Placeholder for real Reddit PRAW call.
    Replace with praw.Reddit(client_id=..., client_secret=...).
    """
    import random
    random.seed(hashlib.sha256((ticker + "reddit").encode()).digest()[0])
    mentions = random.randint(10, 500)
    found_yield = random.sample(YIELD_KEYWORDS, k=random.randint(0, 4))
    found_penny = random.sample(PENNY_KEYWORDS, k=random.randint(0, 2))
    risk = random.sample(RISK_KEYWORDS_NEGATIVE, k=random.randint(0, 1))
    return {
        "mention_count_24h": mentions,
        "yield_keywords_found": found_yield,
        "penny_keywords_found": found_penny,
        "risk_flags": risk,
        "raw_text_sample": f"Mock Reddit data for ${ticker}",
    }


# ─── Core scanner ─────────────────────────────────────────────────────────────

def scan_ticker(ticker: str) -> SocialSignal:
    """Aggregate signals from all social platforms for a given ticker."""
    tw = _mock_twitter_scan(ticker)
    rd = _mock_reddit_scan(ticker)

    combined_mentions = tw["mention_count_24h"] + rd["mention_count_24h"]
    yield_kw = list(set(tw["yield_keywords_found"] + rd["yield_keywords_found"]))
    penny_kw = list(set(tw["penny_keywords_found"] + rd["penny_keywords_found"]))
    risk_flags = list(set(tw["risk_flags"] + rd["risk_flags"]))

    sig = SocialSignal(
        ticker=ticker,
        platform="twitter+reddit",
        mention_count_24h=combined_mentions,
        yield_keywords_found=yield_kw,
        penny_keywords_found=penny_kw,
        risk_flags=risk_flags,
        raw_text_sample=tw["raw_text_sample"],
    )
    sig.sentiment_score = score_signal(sig)
    sig.recommended_action = classify_action(sig.sentiment_score)
    return sig


def scan_tickers(tickers: list[str], threshold: float = 0.65) -> list[SocialSignal]:
    """Scan a list of tickers and return those meeting the threshold."""
    def process_ticker(ticker: str) -> SocialSignal:
        sig = scan_ticker(ticker)
        log.info(
            "Scanned %-10s | score=%.4f | action=%s",
            ticker, sig.sentiment_score, sig.recommended_action
        )
        return sig

    with ThreadPoolExecutor(max_workers=min(32, len(tickers) if tickers else 1)) as executor:
        results = list(executor.map(process_ticker, tickers))

    results.sort(key=lambda s: s.sentiment_score, reverse=True)
    return [s for s in results if s.sentiment_score >= threshold]


# ─── Display ──────────────────────────────────────────────────────────────────

def display_results(signals: list[SocialSignal], top: int = 10) -> None:
    table = Table(title="🪙 Penny Yield Scout — Social Scan Results", show_lines=True)
    table.add_column("Rank", style="dim", width=4)
    table.add_column("Ticker", style="bold cyan")
    table.add_column("Score", style="bold yellow")
    table.add_column("Action", style="bold green")
    table.add_column("Mentions/24h", style="white")
    table.add_column("Yield Keywords", style="white")
    table.add_column("Risk Flags", style="red")

    for i, sig in enumerate(signals[:top], 1):
        action_style = {
            "SWEEP_PRIORITY": "[bold green]SWEEP_PRIORITY[/]",
            "SWEEP": "[green]SWEEP[/]",
            "WATCH": "[yellow]WATCH[/]",
            "HOLD": "[dim]HOLD[/]",
        }.get(sig.recommended_action, sig.recommended_action)

        table.add_row(
            str(i),
            sig.ticker,
            f"{sig.sentiment_score:.4f}",
            action_style,
            str(sig.mention_count_24h),
            ", ".join(sig.yield_keywords_found[:3]) or "—",
            ", ".join(sig.risk_flags) or "✅ None",
        )

    console.print(table)


# ─── CLI entry point ──────────────────────────────────────────────────────────

DEFAULT_TICKERS = [
    "PENDLE", "GMX", "RDNT", "CAKE", "ORCA",
    "RAY", "JOE", "AERO", "VELO", "BAL",
    "CVX", "CRV", "YFI", "BEEFY", "MORPHO",
    "EIGEN", "EETH", "RSETH", "SFRAX", "AAVE",
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Penny Sovereign Yield Scout — Social Listener"
    )
    parser.add_argument("--tickers", nargs="+", default=DEFAULT_TICKERS, help="Tickers to scan")
    parser.add_argument("--threshold", type=float, default=0.65, help="Min sentiment score (0-1)")
    parser.add_argument("--top", type=int, default=10, help="Number of top results to display")
    parser.add_argument("--output", type=str, help="Save results to JSON file")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=600, help="Scan interval in seconds (daemon mode)")
    parser.add_argument("--mode", choices=["social", "governance"], default="social")

    args = parser.parse_args()

    log_dir = Path(os.getenv("VERIFIABLE_LOG_DIR", "./logs"))
    log_dir.mkdir(parents=True, exist_ok=True)

    def run_once() -> None:
        console.rule("[bold cyan]🪙 Penny Sovereign Yield Scout — Listener[/]")
        console.print(f"  Scanning [bold]{len(args.tickers)}[/] tickers | threshold=[yellow]{args.threshold}[/]")
        console.print()

        signals = scan_tickers(args.tickers, threshold=args.threshold)

        if not signals:
            console.print("[yellow]No signals met the threshold. Adjust --threshold or add more tickers.[/]")
            return

        display_results(signals, top=args.top)

        output_path = args.output or str(log_dir / f"listener_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump([s.to_dict() for s in signals], f, indent=2, default=str)
        console.print(f"\n  💾 Results saved to [cyan]{output_path}[/]")

    if args.daemon:
        console.print(f"[bold green]Daemon mode: scanning every {args.interval}s[/]")
        while True:
            run_once()
            console.print(f"\n  ⏳ Sleeping {args.interval}s ...\n")
            time.sleep(args.interval)
    else:
        run_once()


if __name__ == "__main__":
    main()
