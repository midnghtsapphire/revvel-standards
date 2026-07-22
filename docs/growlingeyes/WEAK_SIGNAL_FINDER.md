# Weak Signal Finder — GrowlingEyes Integration

**Repository:** `midnghtsapphire/revvel-standards`  
**Product:** GrowlingEyes — Freedom Angel Corp  
**Inspired by:** [LittleViewer/WeakSignalFinder](https://github.com/LittleViewer/WeakSignalFinder)

---

## Overview

The **Weak Signal Finder** is an NLP-based intelligence tool that detects emerging themes and patterns from RSS news feeds. It's been integrated into GrowlingEyes to provide early warning of emerging threats, trends, and intelligence gaps across multiple OSINT domains.

### What Are Weak Signals

**Weak signals** are early indicators of emerging trends, threats, or changes that are not yet mainstream but may become significant. In intelligence contexts, these include:

- **Emerging cyber threats** before they become widespread attacks
- **Geopolitical tensions** before they escalate into conflicts
- **Supply chain disruptions** before they impact critical infrastructure
- **Migration patterns** before they become humanitarian crises
- **Climate events** before they cause widespread damage

The Weak Signal Finder surfaces these patterns by analyzing word frequency, contextual relationships, and semantic neighborhoods across thousands of news articles.

---

## Architecture

```text
RSS Feeds (by domain) → Feed Aggregation → Text Processing → Frequency Analysis
                                                                     ↓
                                               Output (JSON) ← Signal Scoring ← Contextual Analysis
```

### Pipeline Steps

1. **Feed Aggregation** — Fetches RSS feeds from domain-specific sources
   - Parallel fetching using ThreadPoolExecutor
   - Configurable feed lists per intelligence domain
   - Automatic error handling and fallback

2. **Text Processing** — Cleans and tokenizes article text
   - URL removal, special character filtering
   - Lowercase normalization
   - Stopword removal (structural words, temporal terms, media terms)
   - Minimum word length filtering (>3 chars)

3. **Frequency Analysis** — Computes word intensity scores
   - Counts word occurrences across all articles
   - Filters by configurable threshold (default: 2)
   - Returns top 30 most frequent terms

4. **Contextual Analysis** — Identifies semantic relationships
   - Sliding window approach (3-word windows)
   - Detects word pairs that co-occur frequently
   - Builds contextual neighborhoods

5. **Signal Scoring** — Scores signals based on multiple factors
   - **Intensity score** (50%): Maximum word frequency
   - **Diversity score** (30%): Number of distinct themes
   - **Context score** (20%): Strength of word relationships
   - Final score: 0-100 scale

6. **Output** — Produces JSON reports with:
   - Top emerging themes
   - Word intensity scores
   - Contextual word pairs
   - Signal strength score
   - Article count and timestamp

---

## Intelligence Domains

The tool monitors 7 intelligence domains, each with curated RSS feed sources:

### 1. Cyber Threats

- CISA Alerts
- US-CERT Alerts
- Krebs on Security
- The Hacker News
- Bleeping Computer

**Use case:** Detect emerging vulnerabilities, exploits, and attack patterns before they become widespread.

### 2. Maritime

- gCaptain
- Splash247
- Maritime Executive
- FreightWaves

**Use case:** Identify supply chain disruptions, port congestion, and maritime incidents.

### 3. Conflict & Crisis

- Crisis Group
- ReliefWeb
- ACLED

**Use case:** Early warning of escalating conflicts, humanitarian crises, and instability.

### 4. Geopolitical

- Foreign Policy
- Defense One
- War on the Rocks

**Use case:** Detect shifting alliances, policy changes, and geopolitical tensions.

### 5. Migration

- IOM News
- UNHCR
- Mixed Migration

**Use case:** Track migration patterns, refugee flows, and border incidents.

### 6. Climate & Environment

- NOAA News
- Climate Central
- Carbon Brief

**Use case:** Identify emerging climate events, extreme weather patterns, and environmental threats.

### 7. Supply Chain

- Supply Chain Dive
- Logistics Management

**Use case:** Detect logistics disruptions, port delays, and supply chain bottlenecks.

---

## Usage

### Basic Usage

```bash
# Scan all domains
python growlingeyes/tools/weak_signal_finder.py

# Scan specific domains
python growlingeyes/tools/weak_signal_finder.py --domains cyber maritime conflict

# Adjust sensitivity threshold (higher = fewer, stronger signals)
python growlingeyes/tools/weak_signal_finder.py --threshold 5

# Save results to file
python growlingeyes/tools/weak_signal_finder.py --output my_signals.json
```

### Daemon Mode (Continuous Monitoring)

```bash
# Run continuously, scan every hour (3600 seconds)
python growlingeyes/tools/weak_signal_finder.py --daemon --interval 3600

# Scan every 6 hours
python growlingeyes/tools/weak_signal_finder.py --daemon --interval 21600
```

### CLI Options

| Option | Type | Default | Description |
|---|---|---|---|
| `--domains` | list | all | Intelligence domains to scan |
| `--threshold` | int | 2 | Minimum word frequency to include |
| `--output` | str | auto | Output JSON file path |
| `--daemon` | flag | false | Run continuously in daemon mode |
| `--interval` | int | 3600 | Seconds between scans in daemon mode |

---

## Output Format

### JSON Structure

```json
{
  "domain": "cyber",
  "signal_timestamp": "2026-04-30T16:30:00Z",
  "signal_score": 82.5,
  "article_count": 47,
  "job_id": "20260430163000",
  "top_emerging_themes": [
    "ransomware",
    "vulnerability",
    "patch",
    "exploit",
    "zero-day"
  ],
  "intensity_words": {
    "ransomware": 23,
    "vulnerability": 18,
    "patch": 15,
    "exploit": 12,
    "zero-day": 8
  },
  "contextual_pairs": [
    ["ransomware", "vulnerability"],
    ["zero-day", "exploit"],
    ["patch", "security"],
    ["vulnerability", "exploit"],
    ["ransomware", "attack"]
  ]
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `domain` | string | Intelligence domain (cyber, maritime, etc.) |
| `signal_timestamp` | string | ISO 8601 timestamp of signal detection |
| `signal_score` | float | Signal strength score (0-100) |
| `article_count` | int | Number of articles analyzed |
| `job_id` | string | Unique job identifier (YYYYMMDDHHMMSS) |
| `top_emerging_themes` | array | Top 10 most frequent terms |
| `intensity_words` | object | Word frequency scores (top 30) |
| `contextual_pairs` | array | Word pairs that co-occur frequently |

---

## Integration with GrowlingEyes

The Weak Signal Finder is designed to integrate with the GrowlingEyes intelligence platform:

### 1. Data Pipeline Integration

- Outputs JSON format compatible with GrowlingEyes data ingestion
- Can be scheduled via PM2 or cron for automated scanning
- Logs stored in `logs/` directory with date-stamped filenames

### 2. Dashboard Integration

Signals can be visualized in the GrowlingEyes dashboard:

- Signal strength gauges (0-100 scale)
- Word clouds of emerging themes
- Contextual relationship graphs
- Time-series trend analysis

### 3. Alert Integration

High-strength signals can trigger alerts:

- Email notifications for signals above threshold
- Slack/Discord webhooks for real-time alerts
- Integration with existing GrowlingEyes alert system

### 4. Database Integration

Signals can be persisted to the GrowlingEyes database:

```sql
CREATE TABLE weak_signals (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(50),
  signal_timestamp TIMESTAMP,
  signal_score FLOAT,
  article_count INT,
  job_id VARCHAR(20),
  top_themes JSON,
  intensity_words JSON,
  contextual_pairs JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Advanced Configuration

### Custom Feed Lists

Edit the feed lists in `weak_signal_finder.py`:

```python
OSINT_FEED_MAP = {
    "cyber": [
        ("CISA Alerts", "https://www.cisa.gov/cybersecurity-advisories/all.xml"),
        ("Custom Feed", "https://your-custom-feed.com/rss"),
    ],
    "custom_domain": [
        ("Feed 1", "https://example.com/feed1.xml"),
        ("Feed 2", "https://example.com/feed2.xml"),
    ],
}
```

### Custom Stopwords

Add domain-specific stopwords to filter out noise:

```python
STOPWORDS = {
    # Default stopwords
    "a", "an", "the", "and", "or", ...
    
    # Add your custom stopwords
    "custom_word_1",
    "custom_word_2",
}
```

### Scoring Algorithm Tuning

Adjust the signal scoring weights via the module-level constants:

```python
INTENSITY_THRESHOLD = 10.0
DIVERSITY_THRESHOLD = 20.0
CONTEXT_THRESHOLD = 10.0

INTENSITY_WEIGHT = 0.5
DIVERSITY_WEIGHT = 0.3
CONTEXT_WEIGHT = 0.2

def score_signal_strength(intensity: dict[str, int], pairs: list[tuple[str, str]]) -> float:
    max_freq = max(intensity.values())
    intensity_score = min(max_freq / INTENSITY_THRESHOLD, 1.0)
    diversity_score = min(len(intensity) / DIVERSITY_THRESHOLD, 1.0)
    context_score = min(len(pairs) / CONTEXT_THRESHOLD, 1.0)

    return (intensity_score * INTENSITY_WEIGHT +
            diversity_score * DIVERSITY_WEIGHT +
            context_score * CONTEXT_WEIGHT) * 100.0
```

---

## Performance & Scaling

### Performance Characteristics

- **Feed fetching:** Parallel (5 concurrent workers)
- **Average scan time:** 30-60 seconds per domain
- **Memory usage:** ~100-200 MB per domain
- **Output size:** ~5-20 KB JSON per domain

### Scaling Recommendations

1. **Large feed lists:** Increase ThreadPoolExecutor workers
2. **High-frequency scanning:** Use daemon mode with appropriate intervals
3. **Resource constraints:** Reduce the per-feed article cap (`feed.entries[:20]`) in `fetch_feed`
4. **Network issues:** Implement retry logic with exponential backoff

---

## Troubleshooting

### No Signals Detected

**Symptoms:** Output shows "No weak signals detected"

**Solutions:**
- Lower the `--threshold` parameter (try `--threshold 1`)
- Check that RSS feeds are accessible (network connectivity)
- Verify feed URLs are returning valid RSS/XML
- Check logs in `logs/` directory for errors

### Low Signal Scores

**Symptoms:** All signals have scores below 20

**Solutions:**
- Increase the number of feeds per domain
- Adjust the scoring algorithm weights
- Lower the threshold to include more terms
- Check if feeds are returning recent articles

### Memory Issues

**Symptoms:** High memory usage or crashes

**Solutions:**
- Process domains sequentially instead of in parallel
- Reduce the number of articles fetched per feed
- Clear logs periodically
- Use a larger droplet/server

### Feed Fetch Errors

**Symptoms:** Errors in logs about unreachable feeds

**Solutions:**
- Check network connectivity
- Verify feed URLs are still valid (sites may have changed URLs)
- Add retry logic with exponential backoff
- Remove or replace broken feeds

---

## Comparison to Original WeakSignalFinder

The GrowlingEyes implementation differs from the original in several ways:

| Feature | Original | GrowlingEyes |
|---|---|---|
| **Language support** | Multi-language (spaCy models) | English-focused (simplified) |
| **Database** | SQLite with full history | JSON output (optionally to PostgreSQL) |
| **NLP library** | spaCy with lemmatization | Basic text processing (no external NLP) |
| **Feed sources** | User-configured JSON | Pre-configured OSINT domains |
| **Output format** | Newline-delimited JSON | Single JSON array |
| **Scheduling** | Manual runs | Built-in daemon mode |
| **Focus** | Generic weak signal detection | Intelligence-specific domains |

**Why the differences?**

- **Simplicity:** Removed spaCy dependency to reduce complexity and memory usage
- **Speed:** Basic tokenization is faster for real-time OSINT monitoring
- **Focus:** Pre-configured feeds for intelligence domains (cyber, maritime, etc.)
- **Integration:** Designed specifically for GrowlingEyes data pipeline

---

## References

- **Original WeakSignalFinder:** <https://github.com/LittleViewer/WeakSignalFinder>
- **GrowlingEyes Master Spec:** `docs/GROWLINGEYES_MASTER_SPEC.md`
- **GrowlingEyes Tools README:** `growlingeyes/README.md`
- **Axion Planetary MCP Spec:** `docs/AXION_PLANETARY_MCP.md`

---

## License

This integration follows the GrowlingEyes project licensing. See the main repository for details.

**Freedom Angel Corp** — "We believe you."
