# Penny Sovereign Yield Scout — Strategy Playbook

**Version:** 1.0.0  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp  
**Style:** Glassmorphic dark — print-ready 28-page PDF  
**Status:** Living document — update after every major strategy iteration

---

## Table of Contents

1. [Philosophy & Blue Ocean Thesis](#1-philosophy--blue-ocean-thesis)
2. [Signal Sourcing — Where Pennies Hide](#2-signal-sourcing--where-pennies-hide)
3. [The Golden 50 Protocols](#3-the-golden-50-protocols)
4. [Sweep Methodology & Scoring Matrix](#4-sweep-methodology--scoring-matrix)
5. [Position Sizing — DeFi Kelly Criterion](#5-position-sizing--defi-kelly-criterion)
6. [Impermanent Loss Mitigation](#6-impermanent-loss-mitigation)
7. [Auto-Compounding Optimisation](#7-auto-compounding-optimisation)
8. [Audit Trail & Verifiable Logging](#8-audit-trail--verifiable-logging)
9. [Exit Triggers & Liquidity Pull Checklist](#9-exit-triggers--liquidity-pull-checklist)
10. [Blue Ocean Generator — Scaffold on Demand](#10-blue-ocean-generator--scaffold-on-demand)
11. [Risk Management Framework](#11-risk-management-framework)
12. [Governance & Protocol Intelligence](#12-governance--protocol-intelligence)
13. [Tax & Compliance Wrapper](#13-tax--compliance-wrapper)
14. [Branding & Content Distribution](#14-branding--content-distribution)
15. [90-Day Roadmap](#15-90-day-roadmap)

---

## 1. Philosophy & Blue Ocean Thesis

### The Core Insight

Most yield hunters operate in the same crowded pools: top-10 TVL protocols, well-known stablecoin pairs, and trending governance tokens. This creates a **red ocean** — fierce competition, shrinking margins, and front-running bots.

The **penny-sovereign-yield-scout** targets the **blue ocean** at the intersection of:

- **Penny-priced assets** (< $0.10 USD) with fundamental utility
- **Sovereign yield** (real revenue, not inflationary emissions)
- **Under-watched protocols** (TVL $500k–$50M — too small for whales, too big to be rugs)

### Why Pennies

Penny-priced assets offer **asymmetric upside** when combined with yield:

```text
Position value = token_price × quantity × (1 + APY)^time
```

A 50% APY on a $0.01 token that 10x's to $0.10 delivers:
- Yield gain: 50% on initial
- Price gain: 10x on principal
- **Combined**: ~15x effective return on capital

This is the sovereign play — not momentum trading, but **yield-enhanced price optionality**.

### Blue Ocean Criteria

| Dimension | Red Ocean | Blue Ocean (Our Target) |
|---|---|---|
| Token price | > $1.00 | < $0.10 |
| Protocol TVL | > $500M | $500k – $50M |
| APY source | Inflationary emissions | Real revenue (fees, premiums) |
| Competitor attention | High (bots, whales) | Low (under the radar) |
| Social signal | Already viral | Emerging (< 500 mentions/day) |

---

## 2. Signal Sourcing — Where Pennies Hide

### 2.1 Social Listening Stack

The `listener.py` tool monitors three primary channels:

| Channel | What to Look For | Signal Weight |
|---|---|---|
| Twitter/X | Ticker mentions + yield keywords in same tweet | 0.35 |
| Reddit (r/defi, r/CryptoMoonShots) | Posts with APY data + low mcap | 0.30 |
| Telegram (DeFi alpha groups) | Protocol announcements, new pool launches | 0.25 |
| On-chain (Dune, The Graph) | New LP positions by known smart money wallets | 0.10 |

**Minimum sentiment score to trigger a full sweep: 0.65**

### 2.2 On-Chain Signal Patterns

Look for these on-chain patterns before a penny token breaks out:

1. **Smart money accumulation** — wallets with >3 profitable DeFi cycles buying
2. **LP liquidity spike** — pool TVL growing >20% in 24h without price change
3. **Governance activity** — unusual vote participation spike
4. **Protocol fee revenue** — weekly fees increasing while token price flat

### 2.3 Running the Listener

```bash
# Scan with default thresholds
python tools/listener.py

# Custom sentiment threshold and output limit
python tools/listener.py --threshold 0.70 --top 20

# Continuous monitoring mode (every 10 minutes)
python tools/listener.py --daemon --interval 600
```

**Output format:**

```json
{
  "ticker": "PENDLE",
  "sentiment_score": 0.82,
  "mention_count_24h": 1240,
  "yield_keywords_found": ["APY", "PT", "yield tokenization"],
  "signal_timestamp": "2026-04-11T09:00:00Z",
  "recommended_action": "SWEEP"
}
```

---

## 3. The Golden 50 Protocols

The full list lives in `config/50_apis_protocols.json`. Here is the strategic breakdown:

### Tier 1 — Core Yield (10 protocols)

Battle-tested protocols with real revenue and deep liquidity:

| Protocol | Chain | Yield Type | Typical APY Range |
|---|---|---|---|
| Aave v3 | ETH, Polygon, Arbitrum | Lending/borrowing | 3–15% |
| Compound v3 | ETH, Base | Lending | 4–12% |
| Curve Finance | ETH, Arbitrum | Stable LP | 5–25% |
| Convex Finance | ETH | Curve boosted | 8–35% |
| Pendle Finance | ETH, Arbitrum | Yield tokenization | 10–115% |
| GMX | Arbitrum, Avalanche | Perp fee sharing | 15–40% |
| Radiant Capital | Arbitrum, BSC | Cross-chain lending | 10–30% |
| Beefy Finance | Multi-chain | Auto-compound vaults | 10–80% |
| Yearn Finance | ETH, Fantom | Strategy vaults | 5–30% |
| Morpho Blue | ETH | Optimised lending | 5–20% |

### Tier 2 — Emerging Protocols (20 protocols)

High-potential protocols in the $5M–$50M TVL sweet spot (see `50_apis_protocols.json` for full list).

### Tier 3 — Experimental (20 protocols)

Sub-$5M TVL, higher risk/reward. Social signal required before sweep (see `50_apis_protocols.json`).

---

## 4. Sweep Methodology & Scoring Matrix

### 4.1 The Opportunity Score Formula

```text
opportunity_score = (apy_net / 100) × log10(tvl_usd) × (1 - il_risk_score) × (1 - rug_risk_score)
```

Where:
- `apy_net` = APY after protocol fees and gas costs
- `tvl_usd` = Total Value Locked in USD
- `il_risk_score` = 0.0 (no IL) to 1.0 (max IL exposure)
- `rug_risk_score` = 0.0 (battle-tested) to 1.0 (unknown, unaudited)

### 4.2 Running the Sweep

```bash
# Full 50-protocol sweep, top 10 results
python tools/yield_scraper_cli.py --top 10

# Filter by minimum APY
python tools/yield_scraper_cli.py --min-apy 15 --top 20

# Filter by chain
python tools/yield_scraper_cli.py --chain arbitrum --top 5

# Output to JSON file
python tools/yield_scraper_cli.py --top 20 --output results.json
```

### 4.3 Sample Sweep Output

```text
┌─────────────────────────────────────────────────────────────────────┐
│  PENNY SOVEREIGN YIELD SCOUT — Live Sweep Results                   │
│  Scanned: 50 protocols | Time: 2026-04-11 09:00 UTC                 │
└─────────────────────────────────────────────────────────────────────┘

Rank  Protocol         Chain      Pool              APY      TVL        Score
────  ───────────────  ─────────  ────────────────  ───────  ─────────  ─────
  1   Pendle Finance   Arbitrum   eETH PT-JUN26     115.2%   $42.1M     0.891
  2   Beefy Finance    BSC        CAKE-BNB          78.4%    $8.3M      0.743
  3   GMX              Arbitrum   GLP Vault         41.6%    $387.2M    0.721
  4   Convex Finance   Ethereum   cvxCRV            34.8%    $218.4M    0.698
  5   Radiant Capital  Arbitrum   USDC              28.3%    $23.7M     0.672
```

---

## 5. Position Sizing — DeFi Kelly Criterion

### 5.1 The Formula

The Kelly Criterion, adapted for DeFi yield positions:

```text
f* = (p × b - q) / b

Where:
  f*  = fraction of portfolio to allocate
  p   = probability of success (1 - rug_risk_score)
  b   = net APY (as a decimal, e.g., 0.50 for 50%)
  q   = probability of loss (rug_risk_score)
```

**Example:**
- Protocol: Beefy Finance CAKE-BNB, APY 78%, rug_risk_score 0.05
- `f* = (0.95 × 0.78 - 0.05) / 0.78 = (0.741 - 0.05) / 0.78 = 0.886`
- Full Kelly = 88.6% allocation — this is too aggressive
- **Use half-Kelly: 44.3%** for safer compounding

### 5.2 Position Sizing Rules

| Risk Tier | Max Allocation (Half-Kelly cap) |
|---|---|
| Tier 1 (battle-tested, audited) | 40% of yield portfolio |
| Tier 2 (emerging, audited) | 20% of yield portfolio |
| Tier 3 (experimental) | 5% of yield portfolio |
| Single position max | 15% |

### 5.3 Portfolio Construction Example

Starting capital: $10,000 DeFi yield portfolio

```text
$4,000  (40%)  Tier 1 — Aave v3 USDC loop (12% APY)
$2,000  (20%)  Tier 1 — Pendle eETH PT (85% APY)
$2,000  (20%)  Tier 2 — Beefy BSC vault (55% APY)
$1,500  (15%)  Tier 2 — GMX GLP (38% APY)
$  500  ( 5%)  Tier 3 — Experimental penny farm (120% APY)
```

Blended APY: ~41% | Expected IL-adjusted return: ~35%

---

## 6. Impermanent Loss Mitigation

### 6.1 What is IL in This Context

Impermanent Loss (IL) occurs when the price ratio of tokens in a liquidity pool changes from the ratio at entry. The further prices diverge, the greater the loss relative to simply holding.

**IL Formula (for 50/50 pools):**
```text
IL = 2 × sqrt(price_ratio) / (1 + price_ratio) - 1
```

| Price Change (one token) | IL |
|---|---|
| No change | 0% |
| 2× | -5.7% |
| 5× | -25.0% |
| 10× | -42.5% |

### 6.2 IL Shield Thresholds

The `il_shield.py` tool blocks any position entry where estimated IL exceeds the threshold:

```python
# Default threshold: 5% maximum IL exposure
python tools/il_shield.py --token0 ETH --token1 USDC --pool 0xABC... --max-il 5.0
```

### 6.3 IL Mitigation Strategies

1. **Stable pairs** — USDC/USDT, FRAX/USDC: near-zero IL
2. **Correlated pairs** — ETH/wstETH, BTC/WBTC: low IL
3. **Concentrated ranges (Uniswap v3)** — Narrow range = higher fees, more rebalancing needed
4. **Single-sided staking** — Pendle PT, Aave lending: zero IL
5. **Hedging** — Short the volatile token via perps on GMX

### 6.4 Best Penny Plays (Low IL)

Penny tokens in lending protocols have **zero IL** — you supply, earn interest, withdraw. This is the safest penny yield strategy:

```text
Target: Supply penny token on Aave/Radiant/Morpho
Earn: Lending APY (no IL risk)
Exit: Withdraw any time, no price ratio dependency
```

---

## 7. Auto-Compounding Optimisation

### 7.1 The Compounding Frequency Formula

Optimal compound frequency minimises gas cost as a percentage of compounded value:

```text
Optimal_interval = sqrt(2 × gas_cost_usd / (position_usd × apy_daily))
```

**Example:**
- Position: $5,000 USDC lending at 12% APY
- Daily yield: $5,000 × 0.12 / 365 = $1.64/day
- Gas cost per compound: $0.50 (Arbitrum)
- `Optimal_interval = sqrt(2 × 0.50 / (5000 × 0.000329)) = sqrt(0.304) = 0.55 days`
- **Compound every ~13 hours** for this position

### 7.2 Using the Auto-Compounder API

```bash
# Start the FastAPI server
uvicorn tools.auto_compounder_api:app --reload --port 8765

# Trigger a compound (curl)
curl -X POST http://localhost:8765/compound \
  -H "Content-Type: application/json" \
  -d '{"protocol": "aave", "pool_id": "usdc-main", "wallet": "0xYOUR_WALLET"}'

# Check compound history
curl http://localhost:8765/history?wallet=0xYOUR_WALLET

# View API docs
open http://localhost:8765/docs
```

### 7.3 Gas Guard

The API includes a gas guard that refuses to compound when:

```text
gas_cost_usd > 0.02 × accumulated_yield_usd
```

This ensures compounding is always profitable.

---

## 8. Audit Trail & Verifiable Logging

### 8.1 Why Tamper-Evident Logs Matter

In DeFi:
- Tax authorities require accurate yield records
- Protocol exploits require post-mortem analysis
- Auto-compound bots need debugging trails
- Governance decisions benefit from historical accountability

### 8.2 The JSONL Chain Format

Every log entry contains a hash of the previous entry, creating a tamper-evident chain:

```json
{"timestamp": "2026-04-11T09:00:00Z", "event": "SWEEP_START", "data": {...}, "prev_hash": "0000000000000000", "entry_hash": "a3f8e2c1..."}
{"timestamp": "2026-04-11T09:00:45Z", "event": "OPPORTUNITY_FOUND", "data": {"protocol": "pendle", "apy": 115.2}, "prev_hash": "a3f8e2c1...", "entry_hash": "b7d4f9e2..."}
```

### 8.3 Verifying the Chain

```bash
python tools/verifiable_logger.py --verify ${VERIFIABLE_LOG_DIR}/audit_log.jsonl
# Output: ✅ Chain integrity verified — 1,847 entries, no tampering detected
```

---

## 9. Exit Triggers & Liquidity Pull Checklist

Pull liquidity immediately when **any** of these conditions is met:

| Trigger | Threshold | Action |
|---|---|---|
| APY decay | > 30% drop from entry APY in 7 days | Review — consider exit |
| TVL drain | > 20% TVL reduction in 24h | **Exit immediately** |
| IL breach | Estimated IL > max_il_pct threshold | **Exit immediately** |
| Exploit signal | On-chain anomaly or social alarm | **Exit immediately** |
| Rug signal | Dev wallet draining | **Exit immediately** |
| Gas spike | Gas cost > 5% of position | Hold — wait for gas normalisation |
| Token listing | CEX listing confirmed | Take partial profit |
| Goal reached | 2× return on position | Take partial profit (50%) |

### Monitoring Commands

```bash
# Check all open positions against exit triggers
python tools/il_shield.py --check-all-positions

# Monitor TVL changes in real time
python tools/yield_scraper_cli.py --watch --alert-tvl-drop 20

# Tail the audit log for anomalies
tail -f $VERIFIABLE_LOG_DIR/audit_log.jsonl | python tools/verifiable_logger.py --stream-verify
```

---

## 10. Blue Ocean Generator — Scaffold on Demand

The `blue_ocean_generator.py` tool can instantly scaffold:

### 10.1 New CLI Tool

```bash
python tools/blue_ocean_generator.py --type cli --name my-yield-cli --protocol morpho
# Creates: generated/my-yield-cli/main.py, requirements.txt, README.md
```

### 10.2 New FastAPI Server

```bash
python tools/blue_ocean_generator.py --type api --name morpho-compounder --port 8766
# Creates: generated/morpho-compounder/main.py, Dockerfile, .env.example
```

### 10.3 PDF Report (Glassmorphic Style)

```bash
python tools/blue_ocean_generator.py --type pdf --title "Weekly Yield Report" --data results.json
# Creates: generated/reports/weekly-yield-report-2026-04-11.pdf
```

---

## 11. Risk Management Framework

### 11.1 Risk Categories

| Risk | Description | Mitigation |
|---|---|---|
| Smart contract risk | Protocol exploits, bugs | Audit score filter + TVL floor |
| IL risk | Price divergence in LP | il_shield.py threshold |
| Liquidity risk | Can't exit position | TVL minimum $500k |
| Regulatory risk | DeFi regulation changes | Tax wrapper, compliance log |
| Gas risk | High gas spikes | Gas guard in auto-compounder |
| Social engineering | Fake protocol clones | Checksum address verification |
| Key compromise | Private key theft | Hardware wallet, never in .env |

### 11.2 Maximum Drawdown Policy

- **Portfolio max drawdown:** 25%
- **Single position max drawdown:** 15%
- **Action if breached:** Pause all new entries, review all open positions

---

## 12. Governance & Protocol Intelligence

### 12.1 Monitoring Governance Forums

Active governance participation signals protocol health:

```bash
# Scan governance activity for all Tier 1 protocols
python tools/listener.py --mode governance --protocols tier1
```

Key governance signals to watch:
- **Fee parameter changes** — fee increases = more yield
- **New pool proposals** — early LP = best rewards
- **Emergency proposals** — could indicate exploit
- **Treasury diversification** — protocol selling tokens = bearish

### 12.2 On-Chain Wallet Intelligence

Track known smart money DeFi wallets:

```python
# In listener.py config — add wallets to track
SMART_MONEY_WALLETS = [
    "0x...",  # Known profitable LP whale
    "0x...",  # DeFi protocol founder wallet
]
```

---

## 13. Tax & Compliance Wrapper

### 13.1 Every yield event is a taxable event (in most jurisdictions)

The `verifiable_logger.py` captures all necessary data for tax calculation:

- Entry timestamp and token amounts
- Exit timestamp and token amounts
- Yield received (in token and USD at time of receipt)
- Gas costs (deductible in some jurisdictions)

### 13.2 Export for Tax Tools

```bash
# Export yield events for Koinly/CoinTracker import
python tools/verifiable_logger.py --export csv --output yield_events_2026.csv
```

### 13.3 Compliance Note

> **This tool does not provide tax advice.** Always consult a qualified tax professional for your jurisdiction. All logs are provided for record-keeping purposes only.

---

## 14. Branding & Content Distribution

### 14.1 Visual Identity

- **Style:** Glassmorphic dark — frosted glass panels on deep navy/black
- **Primary colour:** Iridescent gold (#C8A95A to #FFD700 gradient)
- **Accent:** Electric violet (#7B2FBE)
- **Background:** #0A0A1A (near-black navy)
- **Typography:** Inter (UI), JetBrains Mono (code)

### 14.2 LinkedIn Carousel Template

Located at `branding/carousel_template.psd`. 

10-slide format:
1. Hook slide — "50 protocols. 1 scanner. $0 to start."
2. The Blue Ocean thesis
3. Top 5 opportunities this week (generated from sweep output)
4. IL Shield explainer
5. Auto-compound frequency formula
6. Real audit log screenshot (anonymised)
7. Portfolio allocation example
8. Risk management rules
9. How to run your first sweep (QR code to repo)
10. CTA — "Follow for weekly yield alpha"

### 14.3 Content Schedule

| Platform | Frequency | Content Type |
|---|---|---|
| LinkedIn | 2×/week | Carousel from weekly sweep results |
| Twitter/X | Daily | Top opportunity from daily scan |
| Telegram | Weekly | Full sweep report PDF |
| GitHub | Continuous | Audit log and code updates |

---

## 15. 90-Day Roadmap

### Month 1 — Foundation

- [x] Set up all 50 protocol integrations
- [x] listener.py social scanner operational
- [x] yield_scraper_cli.py live sweep working
- [x] verifiable_logger.py audit chain active
- [ ] First 10 positions entered with full logging
- [ ] Weekly yield report published

### Month 2 — Automation

- [ ] auto_compounder_api.py deployed and running 24/7
- [ ] il_shield.py monitoring all open positions
- [ ] GitHub Actions workflows for sweep + compound
- [ ] Telegram bot for alerts
- [ ] First 100 audit log entries verified

### Month 3 — Scale

- [ ] blue_ocean_generator.py used for 3+ new protocol integrations
- [ ] Portfolio at $50k+ total yield generated (from initial capital)
- [ ] Playbook published as PDF (glassmorphic design)
- [ ] LinkedIn carousel series with 1k+ impressions
- [ ] Open-source community preview (with audit log)

---

*End of Playbook — penny-sovereign-yield-scout v1.0.0*  
*Copyright 2026 Freedom Angel Corp / Audrey Evans. All Rights Reserved.*
