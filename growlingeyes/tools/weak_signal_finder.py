#!/usr/bin/env python3
"""
weak_signal_finder.py — Weak Signal Detection for OSINT Intelligence
GrowlingEyes | Freedom Angel Corp / Audrey Evans

Detects emerging themes and weak signals from RSS news feeds using lightweight text processing.
Aggregates articles by topic/domain, performs basic text cleaning and tokenization,
computes word frequency scores, analyzes contextual co-occurrence windows, and surfaces
signals that may indicate emerging threats, trends, or changes in the intelligence landscape.

Inspired by: https://github.com/LittleViewer/WeakSignalFinder

Usage:
    python growlingeyes/tools/weak_signal_finder.py
    python growlingeyes/tools/weak_signal_finder.py --domains cyber maritime conflict
    python growlingeyes/tools/weak_signal_finder.py --threshold 5 --output signals.json
    python growlingeyes/tools/weak_signal_finder.py --daemon --interval 3600
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from collections import Counter
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

import feedparser
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()

# ─── Logging setup ────────────────────────────────────────────────────────────

log_dir = Path("logs")
log_dir.mkdir(parents=True, exist_ok=True)
log = logging.getLogger(__name__)
log.setLevel(logging.INFO)

# Only add file handler if not already present (avoid duplicate handlers on re-import)
log_path = log_dir / f"weak_signals_{datetime.now(timezone.utc).strftime('%Y%m%d')}.log"
existing_file_handler = next(
    (
        handler
        for handler in log.handlers
        if isinstance(handler, logging.FileHandler)
        and Path(handler.baseFilename) == log_path.resolve()
    ),
    None,
)
if existing_file_handler is None:
    fh = logging.FileHandler(log_path)
    fh.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s"))
    log.addHandler(fh)

# ─── Feed configuration ───────────────────────────────────────────────────────

OSINT_FEED_MAP = {
    "cyber": [
        ("CISA Alerts", "https://www.cisa.gov/cybersecurity-advisories/all.xml"),
        ("US-CERT Alerts", "https://www.cisa.gov/news.xml"),
        ("Krebs on Security", "https://krebsonsecurity.com/feed/"),
        ("The Hacker News", "https://feeds.feedburner.com/TheHackersNews"),
        ("Bleeping Computer", "https://www.bleepingcomputer.com/feed/"),
    ],
    "maritime": [
        ("gCaptain", "https://gcaptain.com/feed"),
        ("Splash247", "https://splash247.com/feed"),
        ("Maritime Executive", "https://maritime-executive.com/rss"),
        ("FreightWaves", "https://www.freightwaves.com/news/feed"),
    ],
    "conflict": [
        ("Crisis Group", "https://www.crisisgroup.org/rss.xml"),
        ("ReliefWeb", "https://reliefweb.int/updates/rss.xml"),
        ("ACLED", "https://acleddata.com/feed/"),
    ],
    "geopolitical": [
        ("Foreign Policy", "https://foreignpolicy.com/feed/"),
        ("Defense One", "https://www.defenseone.com/rss/"),
        ("War on the Rocks", "https://warontherocks.com/feed/"),
    ],
    "migration": [
        ("IOM News", "https://www.iom.int/news-rss"),
        ("UNHCR", "https://www.unhcr.org/rss.xml"),
        ("Mixed Migration", "https://mixedmigration.org/feed/"),
    ],
    "climate": [
        ("NOAA News", "https://www.noaa.gov/feed"),
        ("Climate Central", "https://www.climatecentral.org/feed"),
        ("Carbon Brief", "https://www.carbonbrief.org/feed/"),
    ],
    "supply_chain": [
        ("Supply Chain Dive", "https://www.supplychaindive.com/feeds/news/"),
        ("Logistics Management", "https://www.logisticsmgmt.com/rss/topic/1-all-topics"),
    ],
}

# Stopwords for intelligence filtering (domain-agnostic structural words)
STOPWORDS = {
    # Articles, conjunctions, prepositions
    "a", "an", "the", "and", "or", "but", "if", "while", "of", "at", "by", "for",
    "with", "from", "to", "in", "on", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "must", "can", "this", "that", "these", "those",
    # Common temporal/locational words
    "today", "yesterday", "tomorrow", "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday", "january", "february", "march", "april", "may",
    "june", "july", "august", "september", "october", "november", "december",
    # Generic media/institutional words
    "said", "says", "report", "reports", "reported", "article", "news", "new",
    "according", "official", "officials", "statement", "announced", "year", "years",
    "more", "other", "also", "told",
}


# ─── Data models ──────────────────────────────────────────────────────────────

@dataclass
class WeakSignal:
    domain: str
    signal_timestamp: str
    intensity_words: dict[str, int]
    contextual_pairs: list[tuple[str, str]]
    top_emerging_themes: list[str]
    signal_score: float = 0.0
    article_count: int = 0
    job_id: str = field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    )

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Scoring configuration ────────────────────────────────────────────────────

# Signal scoring algorithm configuration
# These values control how signals are scored and can be tuned based on domain characteristics
INTENSITY_THRESHOLD = 10.0  # Normalization divisor for max word frequency
DIVERSITY_THRESHOLD = 20.0  # Normalization divisor for distinct theme count
CONTEXT_THRESHOLD = 10.0    # Normalization divisor for contextual pair count

# Scoring weights (must sum to 1.0)
INTENSITY_WEIGHT = 0.5  # Weight for word frequency component
DIVERSITY_WEIGHT = 0.3  # Weight for theme diversity component
CONTEXT_WEIGHT = 0.2    # Weight for contextual relationship component


# ─── Text processing ──────────────────────────────────────────────────────────

def clean_text(text: str) -> list[str]:
    """Basic text cleaning and tokenization."""
    import re

    # Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    # Remove special characters, keep only alphanumeric and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    # Convert to lowercase and split
    words = text.lower().split()
    # Filter stopwords and short words
    words = [w for w in words if w not in STOPWORDS and len(w) > 3]
    return words


def compute_word_frequency(articles: list[dict]) -> Counter:
    """Compute word frequency across all articles."""
    all_words = []
    for article in articles:
        text = article.get("title", "") + " " + article.get("summary", "")
        words = clean_text(text)
        all_words.extend(words)

    return Counter(all_words)


def compute_contextual_pairs(articles: list[dict], top_words: set[str]) -> list[tuple[str, str]]:
    """Find word pairs that appear near each other (within 3 words)."""
    from itertools import combinations

    pairs = Counter()

    for article in articles:
        text = article.get("title", "") + " " + article.get("summary", "")
        words = clean_text(text)

        # Create sliding window of size 3
        for i in range(len(words) - 2):
            window = words[i:i+3]
            # Find all important words in the window
            important_in_window = [w for w in window if w in top_words]
            # Count all unique pairs of important words in this window
            if len(important_in_window) >= 2:
                for pair in combinations(sorted(set(important_in_window)), 2):
                    pairs[pair] += 1

    # Return pairs with at least 2 occurrences
    return [pair for pair, count in pairs.most_common(20) if count >= 2]


def score_signal_strength(intensity: dict[str, int], pairs: list[tuple[str, str]]) -> float:
    """
    Score the signal strength based on:
    - Number of high-frequency terms (intensity)
    - Diversity of emerging themes (variety)
    - Strength of contextual relationships (connections)

    Returns a score from 0-100.
    """
    if not intensity:
        return 0.0

    # Component 1: Intensity score (max word frequency)
    # Normalize to 0-1 range using configurable threshold
    max_freq = max(intensity.values())
    intensity_score = min(max_freq / INTENSITY_THRESHOLD, 1.0)

    # Component 2: Diversity score (number of distinct themes)
    # More distinct themes = stronger signal
    diversity_score = min(len(intensity) / DIVERSITY_THRESHOLD, 1.0)

    # Component 3: Contextual strength (number of word pairs)
    # More contextual relationships = stronger signal
    context_score = min(len(pairs) / CONTEXT_THRESHOLD, 1.0)

    # Weighted combination using configurable weights
    final_score = (
        intensity_score * INTENSITY_WEIGHT +
        diversity_score * DIVERSITY_WEIGHT +
        context_score * CONTEXT_WEIGHT
    ) * 100.0

    return final_score


# ─── Feed fetching ────────────────────────────────────────────────────────────

def fetch_feed(feed_name: str, feed_url: str) -> list[dict]:
    """Fetch and parse a single RSS feed."""
    try:
        log.info(f"Fetching {feed_name}: {feed_url}")
        feed = feedparser.parse(feed_url)

        if not feed.entries:
            log.warning(f"No entries found in {feed_name}")
            return []

        articles = []
        for entry in feed.entries[:20]:  # Limit to recent 20
            articles.append({
                "source": feed_name,
                "title": entry.get("title", ""),
                "summary": entry.get("summary", entry.get("description", "")),
                "link": entry.get("link", ""),
                "published": entry.get("published", entry.get("updated", "")),
            })

        log.info(f"Fetched {len(articles)} articles from {feed_name}")
        return articles

    except Exception as e:
        log.error(f"Error fetching {feed_name}: {e}")
        return []


def fetch_domain_feeds(domain: str, feed_list: list[tuple[str, str]]) -> list[dict]:
    """Fetch all feeds for a domain in parallel."""
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(lambda f: fetch_feed(f[0], f[1]), feed_list))

    # Flatten results
    all_articles = []
    for articles in results:
        all_articles.extend(articles)

    return all_articles


# ─── Signal detection ─────────────────────────────────────────────────────────

def detect_weak_signals(domain: str, threshold: int = 2) -> Optional[WeakSignal]:
    """
    Detect weak signals for a given intelligence domain.

    Args:
        domain: Intelligence domain (cyber, maritime, conflict, etc.)
        threshold: Minimum word frequency to include in signals

    Returns:
        WeakSignal object with detected themes and patterns
    """
    feed_list = OSINT_FEED_MAP.get(domain, [])
    if not feed_list:
        log.error(f"Unknown domain: {domain}")
        return None

    # Fetch all articles for the domain
    articles = fetch_domain_feeds(domain, feed_list)

    if not articles:
        log.warning(f"No articles fetched for {domain}")
        return None

    # Compute word frequency
    word_freq = compute_word_frequency(articles)

    # Filter by threshold and get top words
    intensity_words = {
        word: count for word, count in word_freq.most_common(30)
        if count >= threshold
    }

    if not intensity_words:
        log.warning(f"No significant words found for {domain} with threshold {threshold}")
        return None

    # Get top words for contextual analysis
    top_words = set(intensity_words.keys())

    # Compute contextual pairs
    contextual_pairs = compute_contextual_pairs(articles, top_words)

    # Extract top themes
    top_themes = list(intensity_words.keys())[:10]

    # Score the signal
    signal_score = score_signal_strength(intensity_words, contextual_pairs)

    signal = WeakSignal(
        domain=domain,
        signal_timestamp=datetime.now(timezone.utc).isoformat(),
        intensity_words=intensity_words,
        contextual_pairs=contextual_pairs,
        top_emerging_themes=top_themes,
        signal_score=signal_score,
        article_count=len(articles),
    )

    log.info(
        f"Detected signal for {domain}: score={signal_score:.2f}, "
        f"themes={len(top_themes)}, articles={len(articles)}"
    )

    return signal


def detect_all_signals(domains: Optional[list[str]] = None, threshold: int = 2) -> list[WeakSignal]:
    """Detect signals across all domains."""
    target_domains = domains or list(OSINT_FEED_MAP.keys())
    signals = []

    for domain in target_domains:
        signal = detect_weak_signals(domain, threshold)
        if signal:
            signals.append(signal)

    # Sort by signal score descending
    signals.sort(key=lambda s: s.signal_score, reverse=True)
    return signals


# ─── Display ──────────────────────────────────────────────────────────────────

def display_signals(signals: list[WeakSignal]) -> None:
    """Display weak signals in a rich table."""
    if not signals:
        console.print("[yellow]No signals detected.[/]")
        return

    table = Table(title="🔍 Weak Signals Detected", show_header=True, header_style="bold cyan")
    table.add_column("Domain", style="cyan", width=12)
    table.add_column("Score", justify="right", style="yellow", width=8)
    table.add_column("Articles", justify="right", style="dim", width=8)
    table.add_column("Top Emerging Themes", style="green")

    for sig in signals:
        themes_str = ", ".join(sig.top_emerging_themes[:5])
        table.add_row(
            sig.domain,
            f"{sig.signal_score:.1f}",
            str(sig.article_count),
            themes_str,
        )

    console.print(table)
    console.print()

    # Display top signal details
    if signals:
        top_signal = signals[0]
        console.print(f"[bold]🎯 Strongest Signal: [cyan]{top_signal.domain.upper()}[/][/]")
        console.print()

        # Display word intensity
        console.print("[bold]Word Intensity:[/]")
        for word, count in list(top_signal.intensity_words.items())[:10]:
            bar = "█" * min(count, 50)
            console.print(f"  {word:<20} {bar} {count}")
        console.print()

        # Display contextual pairs
        if top_signal.contextual_pairs:
            console.print("[bold]Contextual Relationships:[/]")
            for w1, w2 in top_signal.contextual_pairs[:5]:
                console.print(f"  • [cyan]{w1}[/] ↔ [cyan]{w2}[/]")
            console.print()


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect weak signals from OSINT RSS feeds",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--domains",
        nargs="+",
        choices=list(OSINT_FEED_MAP.keys()) + ["all"],
        default=["all"],
        help="Intelligence domains to scan (default: all)",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=2,
        help="Minimum word frequency to include (default: 2)",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save results to JSON file",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run continuously in daemon mode",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=3600,
        help="Interval between scans in daemon mode (seconds, default: 3600)",
    )

    args = parser.parse_args()

    if args.interval <= 0:
        parser.error("--interval must be a positive integer")

    if "all" in args.domains:
        domains = list(OSINT_FEED_MAP.keys())
    else:
        domains = args.domains

    def run_once() -> None:
        console.rule("[bold red]🔍 GrowlingEyes — Weak Signal Finder[/]")
        console.print(
            f"  Scanning [bold]{len(domains)}[/] domains | "
            f"threshold=[yellow]{args.threshold}[/]"
        )
        console.print()

        signals = detect_all_signals(domains, threshold=args.threshold)

        if not signals:
            console.print("[yellow]No weak signals detected. Try lowering the threshold.[/]")
            return

        display_signals(signals)

        if args.output:
            output_path = args.output
        else:
            output_path = (
                log_dir / f"weak_signals_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
            )

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump([s.to_dict() for s in signals], f, indent=2, default=str)

        console.print(f"  💾 Results saved to [cyan]{output_path}[/]")

    if args.daemon:
        console.print(f"[bold yellow]⚠️  Daemon mode enabled — scanning every {args.interval}s[/]")
        console.print("[dim]Press Ctrl+C to stop[/]")
        console.print()

        while True:
            try:
                run_once()
                console.print()
                console.print(f"[dim]Sleeping for {args.interval} seconds...[/]")
                console.print()
                time.sleep(args.interval)
            except KeyboardInterrupt:
                console.print("\n[yellow]Daemon stopped by user.[/]")
                break
            except Exception as e:
                log.error(f"Daemon iteration failed: {e}")
                console.print(f"[red]Error during scan: {e}[/]")
                console.print(f"[dim]Retrying in {args.interval} seconds...[/]")
                try:
                    time.sleep(args.interval)
                except KeyboardInterrupt:
                    console.print("\n[yellow]Daemon stopped by user.[/]")
                    break
    else:
        run_once()


if __name__ == "__main__":
    main()
