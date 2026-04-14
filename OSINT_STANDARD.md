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

```
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

## 8. OSINT Platform Integrations (FOSS)

| Platform | Role | URL |
|----------|------|-----|
| **OpenCTI** | Threat intelligence management platform | https://opencti.io |
| **MISP** | Threat sharing and correlation | https://misp-project.org |
| **TheHive** | Incident response and case management | https://thehive-project.org |
| **Cortex** | Analyzers and responders engine | https://github.com/TheHive-Project/Cortex |
| **Maltego CE** | Link analysis and OSINT graphing | https://maltego.com/ce |
| **Spiderfoot** | Automated OSINT collection | https://spiderfoot.net |
| **Recon-ng** | Web reconnaissance framework | https://github.com/lanmaster53/recon-ng |
| **theHarvester** | Email, domain, IP OSINT | https://github.com/laramies/theHarvester |
| **OSRFramework** | Username/alias cross-platform search | https://github.com/i3visio/osrframework |
| **Photon** | Fast web crawler for OSINT | https://github.com/s0md3v/Photon |

---

## 9. OSINT Directory Structure

```
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

## 10. Required GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `OTX_API_KEY` | AlienVault OTX feed access |
| `SHODAN_API_KEY` | Shodan network recon |
| `SECURITYTRAILS_API_KEY` | Passive DNS lookups |
| `OSINT_SLACK_WEBHOOK` | Alert notifications |
| `VIRUSTOTAL_API_KEY` | Hash / URL reputation |

Store all secrets in GitHub Secrets and in HashiCorp Vault under `revvel/apps/YOUR_APP/osint/`.

---

## 11. References

- `SECURITY_STANDARD.md` — base security requirements
- `AUTOMATED_AUDIT_AGENT_STANDARD.md` — continuous auditing that consumes OSINT output
- `API_GATEKEEPER_STANDARD.md` — gatekeeper that enforces OSINT-derived blocklists
- `templates/cicd/osint-pipeline.yml` — pipeline template
- MITRE ATT&CK: https://attack.mitre.org
- CISA KEV: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OpenCTI Docs: https://docs.opencti.io
- MISP Project: https://misp-project.org
