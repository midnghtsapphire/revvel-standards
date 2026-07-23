# Revvel OSINT Integration Standard

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Open Source Intelligence (OSINT) is the systematic collection, processing, and analysis of publicly available information to support security decisions, threat modeling, and infrastructure protection. Every Revvel application must integrate OSINT pipelines into its CI/CD and monitoring stack so that intelligence gathering operates continuously and automatically — not reactively.

This standard defines how to wire OSINT data sources, workflows, and correlation engines into the Revvel ecosystem. It covers threat intelligence feeds, dark web monitoring, social media analysis, network reconnaissance, and vulnerability correlation — all automated and agent-driven.

---

## 2. Core Principles

- **Continuous over reactive** — intelligence pipelines run 24/7, not on demand.
- **Correlation over silos** — data from every source must be fused and cross-referenced.
- **Attribution over noise** — every alert must carry a confidence score, source tag, and MITRE ATT&CK mapping.
- **FOSS priority** — prefer open-source tools (OpenCTI, MISP, TheHive, Maltego CE, Shodan FOSS APIs) before commercial alternatives.
- **Audit everything** — every data collection action must produce an immutable log entry.

---

## 3. OSINT Data Sources

### 3.1. Threat Intelligence Feeds

Every production Revvel application must subscribe to at least one structured threat feed. Feeds must be ingested automatically via CI/CD or a background daemon.

| Tier | Feed | Format | Update Cadence |
|------|------|---------|----------------|
| P0 (free) | AlienVault OTX | STIX/TAXII | Real-time |
| P0 (free) | Abuse.ch URLhaus | CSV/JSON | Hourly |
| P0 (free) | CISA KEV (Known Exploited Vulnerabilities) | JSON | Daily |
| P1 (free) | MISP Project community feeds | MISP/JSON | Daily |
| P1 (free) | Feodo Tracker (botnet C2) | CSV | Hourly |
| P1 (free) | PhishTank | JSON | Hourly |
| P2 (paid) | Recorded Future | STIX | Real-time |
| P2 (paid) | Mandiant Threat Intelligence | STIX | Real-time |

```yaml
# templates/cicd/osint-feeds.yml — feed ingestion job
name: OSINT Feed Ingestion

on:
  schedule:
    - cron: "0 * * * *"   # hourly
  workflow_dispatch:

jobs:
  ingest-feeds:
    name: Ingest Threat Intelligence Feeds
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download CISA KEV
        run: |
          curl -sSf https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json \
            -o feeds/cisa-kev.json

      - name: Download Abuse.ch URLhaus
        run: |
          curl -sSf https://urlhaus.abuse.ch/downloads/json_recent/ \
            -o feeds/urlhaus-recent.json

      - name: Download AlienVault OTX pulse (FOSS)
        env:
          OTX_API_KEY: ${{ secrets.OTX_API_KEY }}
        run: |
          curl -sSf \
            -H "X-OTX-API-KEY: $OTX_API_KEY" \
            "https://otx.alienvault.com/api/v1/pulses/subscribed?modified_since=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
            -o feeds/otx-pulses.json

      - name: Commit updated feeds
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore(osint): update threat intelligence feeds"
          file_pattern: feeds/*.json
```

### 3.2. Vulnerability Intelligence

The CISA KEV feed above is mandatory for all apps. Additionally:

- **NVD API** (`https://services.nvd.nist.gov/rest/json/cves/2.0`) — query for CVEs affecting your direct dependencies.
- **OSV.dev** (`https://api.osv.dev/v1/query`) — open-source vulnerability database; integrates directly with `pnpm audit`.
- **GitHub Security Advisories API** — query GHSA records for packages in `package.json`.

```bash
# Query OSV for a specific package version
curl -s -X POST https://api.osv.dev/v1/query \
  -H "Content-Type: application/json" \
  -d '{"package":{"name":"express","ecosystem":"npm"},"version":"4.18.2"}' | jq .
```

### 3.3. Network and Infrastructure OSINT

| Tool | Purpose | License |
|------|---------|---------|
| Shodan (free tier) | Exposed ports, banners, TLS fingerprints | Freemium |
| Censys (free tier) | TLS certificate transparency, open services | Freemium |
| FOFA | Chinese/Asian IP recon | Freemium |
| BGP.he.net | ASN and BGP prefix mapping | Free |
| SecurityTrails (free tier) | DNS history, subdomain enumeration | Freemium |
| crt.sh | Certificate Transparency log mining | Free |
| GreyNoise | Internet-wide scan noise classification | Freemium |

```python
# scripts/osint/network_recon.py — example Shodan recon wrapper
import os
import shodan

api = shodan.Shodan(os.environ["SHODAN_API_KEY"])

def scan_domain(domain: str) -> dict:
    """Return open services for a domain via Shodan."""
    try:
        return api.search(f"hostname:{domain}")
    except shodan.APIError as e:
        return {"error": str(e)}
```

### 3.4. Social Media Intelligence (SOCMINT)

Social media monitoring is a source of early-warning signals for brand abuse, credential leaks, and threat actor communications.

**Mandatory monitoring targets:**
- Brand name mentions (`revvel`, `midnghtsapphire`, registered app names)
- GitHub username and organization mentions
- Leaked credentials referencing your domains (e.g., `@revvel.io` in paste sites)

**FOSS tools:**
| Tool | Platform | Notes |
|------|----------|-------|
| Twint (archived) | Twitter/X | Python; no API key required |
| snscrape | Twitter/X, Reddit, Instagram | FOSS scraper |
| RedditExtractorToolkit | Reddit | PRAW-based FOSS wrapper |
| Mastodon.py | Mastodon/Fediverse | Official FOSS client |
| instaloader | Instagram | Public profile scraper |

```yaml
# Example: keyword monitoring workflow
- name: SOCMINT keyword scan
  run: |
    python scripts/osint/socmint_scan.py \
      --keywords "revvel,midnghtsapphire,growlingeyes" \
      --output reports/socmint-$(date +%Y%m%d).json
```

### 3.5. Dark Web Monitoring

Dark web monitoring tracks onion sites, paste sites, and underground forums for references to Revvel infrastructure, credentials, or source code.

**Paste site monitoring (free):**
- `https://pastebin.com/api` — keyword alerting (requires API key)
- `https://ghostbin.com` — anonymous paste monitoring
- `https://hastebin.com` — developer paste monitoring
- IntelliHarvest / PasteHunter (FOSS) — automated paste scraping

**Onion/dark web (requires Tor):**
- Ahmia.fi — dark web search engine (clearnet accessible)
- OnionScan — FOSS dark web scanner
- IVRE — network recon framework with Tor support

```bash
# scripts/osint/paste_monitor.sh
#!/usr/bin/env bash
# Monitors paste sites for credential or code leaks
KEYWORDS=("revvel" "midnghtsapphire" "@revvel.io")
for kw in "${KEYWORDS[@]}"; do
  echo "[*] Scanning paste sites for: $kw"
  python3 -m pastehunter --keyword "$kw" --output "reports/paste-$(date +%Y%m%d).json"
done
```

---

## 4. OSINT Pipeline Automation in CI/CD

### 4.1. Pipeline Stages

```text
Collect → Normalize → Correlate → Score → Alert → Archive
```

| Stage | Tooling | Output |
|-------|---------|--------|
| Collect | GitHub Actions cron, Python scripts | Raw JSON/CSV feeds |
| Normalize | Pandas, jq, STIX2 Python library | Normalized STIX bundles |
| Correlate | OpenCTI, MISP, custom Python | Correlation report |
| Score | CVSS v3, custom confidence model | Scored indicator list |
| Alert | Slack webhook, PagerDuty, GitHub Issue | Alert with MITRE mapping |
| Archive | Git + DVC, S3 / R2 | Timestamped artifact store |

### 4.2. OSINT GitHub Actions Workflow

```yaml
# templates/cicd/osint-pipeline.yml
name: OSINT Intelligence Pipeline

on:
  schedule:
    - cron: "0 */6 * * *"   # every 6 hours
  workflow_dispatch:

jobs:
  collect:
    name: Collect Intelligence
    runs-on: ubuntu-latest
    outputs:
      feed-hash: ${{ steps.hash.outputs.hash }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install OSINT tooling
        run: pip install stix2 misp-stix requests shodan

      - name: Run collection scripts
        env:
          SHODAN_API_KEY: ${{ secrets.SHODAN_API_KEY }}
          OTX_API_KEY: ${{ secrets.OTX_API_KEY }}
        run: python scripts/osint/collect.py --output feeds/

      - id: hash
        run: echo "hash=$(sha256sum feeds/*.json | sha256sum | cut -d' ' -f1)" >> $GITHUB_OUTPUT

      - uses: actions/upload-artifact@v4
        with:
          name: raw-feeds
          path: feeds/

  correlate:
    name: Correlate and Score
    needs: collect
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: raw-feeds
          path: feeds/

      - name: Run correlation engine
        run: python scripts/osint/correlate.py --feeds feeds/ --output reports/

      - name: Generate scored report
        run: python scripts/osint/score.py --input reports/correlated.json

      - uses: actions/upload-artifact@v4
        with:
          name: osint-report
          path: reports/

  alert:
    name: Alert on High-Confidence Indicators
    needs: correlate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: osint-report
          path: reports/

      - name: Post alerts to Slack
        env:
          SLACK_WEBHOOK: ${{ secrets.OSINT_SLACK_WEBHOOK }}
        run: python scripts/osint/alert.py --report reports/scored.json --threshold 0.7
```

### 4.3. Correlation Engine Pattern

```python
# scripts/osint/correlate.py — multi-source correlation
import json
import pathlib
from dataclasses import dataclass, field
from typing import List

@dataclass
class Indicator:
    value: str
    type: str        # ip, domain, hash, url, email
    sources: List[str] = field(default_factory=list)
    confidence: float = 0.0
    mitre_techniques: List[str] = field(default_factory=list)

def correlate_feeds(feed_dir: str) -> List[Indicator]:
    """Merge indicators from multiple feeds, boosting confidence per source count."""
    index: dict[str, Indicator] = {}
    feed_path = pathlib.Path(feed_dir)

    for feed_file in feed_path.glob("*.json"):
        with open(feed_file) as f:
            data = json.load(f)
        for raw in data.get("indicators", []):
            key = f"{raw['type']}:{raw['value']}"
            if key not in index:
                index[key] = Indicator(value=raw["value"], type=raw["type"])
            ind = index[key]
            ind.sources.append(feed_file.stem)
            ind.mitre_techniques.extend(raw.get("mitre", []))

    # Simple confidence model: confidence = min(1.0, sources / 3)
    for ind in index.values():
        ind.confidence = min(1.0, len(set(ind.sources)) / 3.0)
        ind.mitre_techniques = list(set(ind.mitre_techniques))

    return list(index.values())
```

---

## 5. Threat Actor Tracking and Attribution

### 5.1. Attribution Framework

Every threat indicator must carry optional attribution metadata aligned to the [MITRE ATT&CK Enterprise framework](https://attack.mitre.org/).

```json
{
  "indicator": "185.220.101.0/24",
  "type": "ip-range",
  "attribution": {
    "actor_name": "Tor Exit Node Pool",
    "group_id": "G0000",
    "mitre_techniques": ["T1090.003"],
    "confidence": 0.85,
    "first_seen": "2025-01-15",
    "last_seen": "2026-04-14",
    "source_feeds": ["feodo-tracker", "otx"]
  }
}
```

### 5.2. MITRE ATT&CK Mapping Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `technique_id` | ATT&CK technique ID | `T1566.001` |
| `tactic` | ATT&CK tactic | `initial-access` |
| `confidence` | 0.0–1.0 | `0.9` |
| `actor` | Named group or `unknown` | `APT28` |
| `source` | Intelligence source | `otx, misp` |

---

## 6. Geolocation and Network Analysis

### 6.1. IP Geolocation

```python
# scripts/osint/geoip.py
import requests

def geolocate_ip(ip: str) -> dict:
    """
    Geolocate an IP using ip-api.com (free, 45 req/min).
    Returns country, region, city, ISP, ASN.
    """
    resp = requests.get(
        f"http://ip-api.com/json/{ip}",
        params={"fields": "status,country,regionName,city,isp,as,proxy,hosting"}
    )
    return resp.json()
```

### 6.2. BGP / ASN Intelligence

```bash
# Query BGP information for an IP
whois -h whois.cymru.com " -v 185.220.101.1"
# Use Team Cymru bulk API for batch lookups
```

### 6.3. Passive DNS

```bash
# SecurityTrails passive DNS (free tier: 50 req/month)
curl -sSf "https://api.securitytrails.com/v1/history/example.com/dns/a" \
  -H "APIKEY: $SECURITYTRAILS_API_KEY" | jq '.records[].ip'
```

---

## 7. Vulnerability Intelligence Integration

### 7.1. Dependency Enrichment Workflow

Run after every `pnpm install` or dependency update:

```yaml
# In .github/workflows/security.yml — add after pnpm audit
- name: Enrich vulnerabilities with OSINT
  run: |
    pnpm audit --json > /tmp/audit.json || true
    python scripts/osint/enrich_vulns.py \
      --audit /tmp/audit.json \
      --kev feeds/cisa-kev.json \
      --output reports/enriched-vulns.json

- name: Fail on KEV-listed vulnerabilities
  run: |
    python scripts/osint/check_kev.py \
      --enriched reports/enriched-vulns.json
    # Exits non-zero if any dependency CVE is on CISA KEV list
```

### 7.2. KEV Check Script

```python
# scripts/osint/check_kev.py
import json
import sys

def check_kev(enriched_path: str, kev_path: str) -> int:
    with open(enriched_path) as f:
        enriched = json.load(f)
    with open(kev_path) as f:
        kev = {v["cveID"] for v in json.load(f)["vulnerabilities"]}

    critical = [v for v in enriched if v.get("cve") in kev]
    if critical:
        print(f"[FAIL] {len(critical)} dependencies have CISA KEV-listed CVEs:")
        for v in critical:
            print(f"  - {v['package']} {v['version']}: {v['cve']}")
        return 1
    return 0

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--enriched", required=True)
    p.add_argument("--kev", default="feeds/cisa-kev.json")
    args = p.parse_args()
    sys.exit(check_kev(args.enriched, args.kev))
```

---

## 8. Field-Specific OSINT Tool Catalog

The open-source intelligence (OSINT) landscape contains hundreds of tools that range from simple search operators to advanced AI-driven frameworks. Because manual data gathering is often fragile, rate-limited, and difficult to scale, utilizing structured OSINT tools is highly "worth it" for security teams, journalists, and researchers looking to cut through noise and avoid double-counting evidence.

Below is a comprehensive mapping of OSINT data streams to their respective operational fields, detailing what the tools do, their links, and an assessment of their value.

---

### 8.1. Field 1: Social Media & Messaging Intelligence (SOCMINT)

**Stream:** Tracking threat actors, scam rings, disinformation, and digital footprints across platforms.

#### Telegram Ecosystem

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **Telegago** | Community CSE (no direct URL) | Custom Google search engine for finding publicly accessible and indexed Telegram channels. Created using Google CSE with Telegram-specific site filters (e.g., site:t.me). | Excellent for initial discovery of public channels, but cannot penetrate restricted or truly private groups. Access: Search for "Telegago CSE" or create your own at <https://cse.google.com/cse> |
| **TGStat** | <https://tgstat.com> | Catalogs channels, subscriber counts, and audience overlap | Highly valuable for tracking influence networks, propaganda flow, and the "business side" of channels |
| **Telemetr.io** | <https://telemetr.io> | Alternative channel analytics platform with different data visualization and export formats | Highly valuable as a cross-validation source for TGStat data |
| **Telepathy** | <https://telepathydb.com> | Open-source toolkit for archiving chats, scraping member lists, and mapping message interactions | Very powerful for deep analysis but requires technical knowledge and is subject to strict Telegram API rate limits |
| **UserSearch** | <https://usersearch.com> | Structured platform for searching billions of messages, enumerating members, and retrieving historic profile pictures | Yes, it abstracts the complexity of API limits and burner accounts, making it vastly superior to manual scraping for professional investigations |
| **Telegram Breach Search Bots (category)** | Various implementations (not listed) | ⚠️ **LEGAL WARNING**: Category of Telegram bots that claim to provide phone-to-name resolution or search breach databases. These tools operate in legal gray areas, frequently get banned, and may violate data protection laws (GDPR, CCPA), breach investigation ethics, and organizational policies. **Use only with explicit legal authorization and within lawful investigative frameworks.** Not recommended for general use. | Significant legal and operational risks; consult legal counsel before considering |

#### Mainstream Social Media (X/Twitter, Facebook, LinkedIn, Reddit)

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **ExportData.io** | <https://exportdata.io> | Analyzes X/Twitter followers, historical tweets, and engagement trends | Yes, valuable for social network analysis |
| **Foller.me** | <https://foller.me> | X/Twitter account analysis and engagement metrics | Yes, useful for follower analysis |
| **DumpItBlue+** | Chrome extension | Dumps Facebook friends, group members, and messenger contacts into text files | Yes, for Facebook OSINT workflows |
| **Instaloader** | <https://github.com/instaloader/instaloader> | Downloads Instagram pictures, metadata, and maps relationships | Yes, for Instagram investigations |
| **Osintgram** | <https://github.com/Datalux/Osintgram> | Instagram OSINT tool for gathering information | Yes, complements Instaloader |
| **CrossLinked** | <https://github.com/m8sec/CrossLinked> | LinkedIn enumeration tool that uses search engine scraping to collect valid employee names without alerting the target | Yes, essential for corporate OSINT |
| **Pullpush** | <https://pullpush.io> | Service for indexing and retrieving Reddit content, including deleted posts | Yes, for Reddit investigation and deleted content recovery |
| **F5BOT** | <https://f5bot.com> | Keyword notifications for Reddit, Hacker News, and Lobsters | Yes, for real-time monitoring |

---

### 8.2. Field 2: Geolocation, Maritime, and Aviation Intelligence

**Stream:** Monitoring military movements, global conflict, supply chains, and environmental data.

#### Flight & Aviation Tracking

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **ADS-B Exchange** | <https://globe.adsbexchange.com> | The world's largest source of unfiltered flight data | Essential. Unlike commercial trackers, it does not filter out military or blocked aircraft, making it critical for tracking tankers, AWACS, and troop movements |
| **FlightRadar24** | <https://flightradar24.com> | Popular commercial flight tracker | Yes, but has filtering limitations |
| **RadarBox** | <https://radarbox.com> | Commercial flight tracker with air traffic control audio | Yes, audio recordings add intelligence value |

#### Maritime Tracking

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **MarineTraffic** | <https://marinetraffic.com> | Tracks ships globally via AIS data | Yes, but with the caveat that military and illicit vessels often "go dark" by disabling AIS or spoofing their locations |
| **VesselFinder** | <https://vesselfinder.com> | Alternative global ship tracking via AIS | Yes, provides cross-validation with MarineTraffic |

#### Satellite & Environmental Observation

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **Sentinel Hub EO Browser** | <https://apps.sentinel-hub.com/eo-browser> | Free multispectral satellite monitoring | Highly recommended for detecting burn scars, thermal anomalies, and baseline conflict monitoring |
| **NASA FIRMS** | <https://firms.modaps.eosdis.nasa.gov> | Near real-time fire and thermal anomaly detection | Yes, essential for environmental and conflict monitoring |
| **SunCalc** | <https://suncalc.org> | Shadow analysis tool used to verify the exact time and date a photo or video was taken (chronolocation) | Yes, critical for verification work |

#### Conflict Aggregators

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **World Monitor** | <https://worldmonitor.app> | Aggregates military bases, live aircraft, dark ships, and news onto a 3D globe | Yes, excellent for integrated situational awareness |
| **LiveUAMap** | <https://liveuamap.com> | Interactive conflict map plotting real-time events geographically | Yes, essential for conflict tracking |

---

### 8.3. Field 3: Network, Infrastructure, and Cybersecurity Reconnaissance

**Stream:** Identifying digital vulnerabilities, exposed servers, and malicious infrastructure.

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **Shodan** | <https://shodan.io> | Search engine for the Internet of Things (IoT) that discovers devices, open ports, webcams, and unpatched software | Absolutely critical for defenders to find exposed internal assets before attackers do |
| **Censys** | <https://censys.io> | IoT search engine for devices, certificates, and services | Yes, complements Shodan with different indexing |
| **SpiderFoot** | <https://github.com/smicallef/spiderfoot> | An automated OSINT platform with 200+ modules for threat intelligence and asset discovery | Highly valuable for correlating disparate data like IP addresses, subdomains, and Bitcoin wallets |
| **Maltego** | <https://maltego.com> | A graph-based link analysis platform (part of Kali Linux) with dozens of data transforms | Excellent for visualizing relationships, though analysts must be careful of confirmation bias leading to false connections |
| **Intelligence X** | <https://intelx.io> | An archival search engine that accesses the dark web, public data leaks, and historical web pages removed for legal/censorship reasons | Yes, for deep web and dark web investigations |
| **ThreatFox** | <https://threatfox.abuse.ch> | Free, live feed for Indicators of Compromise (IoCs) | Yes, essential for threat intelligence |
| **URLhaus** | <https://urlhaus.abuse.ch> | Free, live feed for malicious URLs | Yes, essential for URL threat intelligence |

---

### 8.4. Field 4: People, Identity, and Credential Investigations

**Stream:** Lawful identity attribution, background verification, and credential investigations. **Note:** All tools in this field must be used only with proper legal authorization, legitimate investigative purposes, and in compliance with applicable privacy laws and regulations.

#### Username Enumeration

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **WhatsMyName** | <https://whatsmyname.app> | Checks if a specific username exists across hundreds or thousands of different websites. Most effective with unique usernames; common usernames may generate high false-positive rates due to name collisions across platforms. | Very useful for cross-platform identity resolution |
| **Sherlock** | <https://github.com/sherlock-project/sherlock> | Username enumeration tool across social networks | Yes, widely used and actively maintained |
| **Maigret** | <https://github.com/soxoj/maigret> | Advanced username search across thousands of sites with reporting features | Yes, more advanced than Sherlock |
| **Blackbird** | <https://github.com/p1ngul1n0/blackbird> | Fast username search across multiple platforms | Yes, good for quick checks |

#### Data Breaches & Emails

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **HaveIBeenPwned** | <https://haveibeenpwned.com> | Checks if an email was exposed in known data breaches | Yes, essential for breach verification |
| **DeHashed** | <https://dehashed.com> | A deep breach search engine matching employee/consumer logins against aggregated leaks | Yes, comprehensive breach database |
| **Epieos** | <https://epieos.com> | Reverse email and phone lookup tool to find connected social accounts | Yes, powerful for email investigations |

#### Facial Recognition & Image Analysis

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **PimEyes** | <https://pimeyes.com> | An advanced public facial recognition engine capable of matching faces even in low-resolution images | Yes, very powerful but raises privacy concerns |
| **Lenso.ai** | <https://lenso.ai> | AI-powered facial recognition that handles altered, edited, or angled photos | Yes, complements PimEyes |
| **GeoSpy** | <https://geospy.ai> | AI-powered image geolocation that uncovers where photos were taken without relying on EXIF data | Yes, revolutionary for geolocation work |

---

### 8.5. Field 5: Search Engines, Web Archiving & "Dorking

**Stream:** Bypassing standard search limits to find hidden files and deleted history.

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **Google Dorking** | Native Google search | Using advanced operators (site:, filetype:, intext:) to find exposed documents, passwords, or vulnerable web panels | Yes, fundamental OSINT skill |
| **LLM-Dorking** | AI technique (no specific tool) | General technique using AI models (ChatGPT, Claude, etc.) to automatically craft complex search queries based on plain-English requests | Yes, accelerates dork creation |
| **AI Dork Generation (category)** | See description | Category of AI-powered tools that generate Google/Bing dorks. Implementations: use ChatGPT/Claude with prompts like "Generate Google dorks for [topic]" or search GitHub for "AI dork generator" | Yes, useful for automated query crafting |
| **Wayback Machine** | <https://archive.org> | The primary tool for exploring the history of websites and retrieving deleted posts | Yes, essential for historical research |
| **SearXNG** | <https://searxng.org> | Privacy-respecting meta-search engine that prevents tracking and personalization bias during investigations | Yes, for privacy-conscious searching |
| **DuckDuckGo** | <https://duckduckgo.com> | Privacy-focused search engine | Yes, no tracking or personalization |
| **Mojeek** | <https://mojeek.com> | Independent search engine with no tracking | Yes, alternative perspective |

---

### 8.6. Field 6: AI-Augmented OSINT Frameworks

**Stream:** Using Large Language Models (LLMs) and autonomous agents to synthesize raw intelligence.

| Tool | URL | Purpose | Worth It? |
|------|-----|---------|-----------|
| **Anthropic Cybersecurity Skills** | Via Claude API | Agentic AI setups using Anthropic's Claude models that can be directed to autonomously query APIs, scrape data, and write intelligence reports | Yes, enables automated intelligence synthesis |
| **OSINT Agent Frameworks (category)** | <https://langchain.com>, <https://github.com/Significant-Gravitas/AutoGPT> | Category of frameworks for building autonomous OSINT agents. Examples: LangChain, AutoGPT, AgentGPT. Search GitHub for "OSINT agent framework" for additional implementations. | Yes, for advanced automation |
| **OSINT Skill v3.0** | Proprietary/research project | An orchestrated toolkit for AI agents that integrates 55+ Apify scrapers, Jina AI, and Perplexity to generate psychoprofiles, map careers, and assign confidence scores. Mentioned in research literature; not publicly available as packaged tool. | Yes (if accessible), shifts burden of data normalization to AI, though human orchestration necessary to prevent hallucinations |
| **NAIJA OSINT INTEL** | Search GitHub for "NAIJA OSINT" | A localized Python suite specifically designed for Nigerian cyber threat intelligence, featuring tools for 419 scam detection and legal evidence packaging. Implementation details vary. | Yes, specialized for Nigerian threat landscape |

---

## 9. OSINT Platform Integrations (FOSS)

**Note:** Many tools from the field-specific catalog above (Section 8) are also included in integration workflows. The platforms below provide centralized management and orchestration. For example, Spiderfoot and Maltego from Section 8 appear here because they serve dual roles as both standalone OSINT tools and integration platforms. OpenCTI and MISP provide frameworks for correlating data from tools like Shodan and threat feeds mentioned in earlier sections. Additional tools like theHarvester (below) complement the Section 8 catalog.

| Platform | Role | URL |
|----------|------|-----|
| **OpenCTI** | Threat intelligence management platform | <https://opencti.io> |
| **MISP** | Threat sharing and correlation | <https://misp-project.org> |
| **TheHive** | Incident response and case management | <https://thehive-project.org> |
| **Cortex** | Analyzers and responders engine | <https://github.com/TheHive-Project/Cortex> |
| **Maltego CE** | Link analysis and OSINT graphing | <https://maltego.com/ce> |
| **Spiderfoot** | Automated OSINT collection | <https://spiderfoot.net> |
| **Recon-ng** | Web reconnaissance framework | <https://github.com/lanmaster53/recon-ng> |
| **theHarvester** | Email, domain, IP OSINT | <https://github.com/laramies/theHarvester> |
| **OSRFramework** | Username/alias cross-platform search | <https://github.com/i3visio/osrframework> |
| **Photon** | Fast web crawler for OSINT | <https://github.com/s0md3v/Photon> |

---

## 10. OSINT Directory Structure

```text
osint/
├── feeds/                  # Raw feed downloads (gitignored if large)
│   ├── cisa-kev.json
│   ├── otx-pulses.json
│   └── urlhaus-recent.json
├── reports/                # Processed/correlated reports
│   ├── correlated.json
│   ├── scored.json
│   └── enriched-vulns.json
└── scripts/
    └── osint/
        ├── collect.py      # Feed ingestion orchestrator
        ├── correlate.py    # Multi-source correlation engine
        ├── score.py        # Confidence scoring
        ├── alert.py        # Alert dispatcher
        ├── enrich_vulns.py # Dependency vuln enrichment
        ├── check_kev.py    # CISA KEV gate check
        ├── geoip.py        # IP geolocation helper
        ├── socmint_scan.py # Social media keyword monitor
        └── paste_monitor.sh # Paste site leak monitor
```

---

## 11. Required GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `OTX_API_KEY` | AlienVault OTX feed access |
| `SHODAN_API_KEY` | Shodan network recon |
| `SECURITYTRAILS_API_KEY` | Passive DNS lookups |
| `OSINT_SLACK_WEBHOOK` | Alert notifications |
| `VIRUSTOTAL_API_KEY` | Hash / URL reputation |

Store all secrets in GitHub Secrets and in HashiCorp Vault under `revvel/apps/YOUR_APP/osint/`.

---

## 12. References

- `SECURITY_STANDARD.md` — base security requirements
- `AUTOMATED_AUDIT_AGENT_STANDARD.md` — continuous auditing that consumes OSINT output
- `API_GATEKEEPER_STANDARD.md` — gatekeeper that enforces OSINT-derived blocklists
- `templates/cicd/osint-pipeline.yml` — pipeline template
- MITRE ATT&CK: <https://attack.mitre.org>
- CISA KEV: <https://www.cisa.gov/known-exploited-vulnerabilities-catalog>
- OpenCTI Docs: <https://docs.opencti.io>
- MISP Project: <https://misp-project.org>
