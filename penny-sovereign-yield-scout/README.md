# 🪙 penny-sovereign-yield-scout

**Author:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp  
**Version:** 1.0.0  
**Status:** Active — Blue Ocean DeFi Scout  
**License:** All Rights Reserved — Copyright 2010-2026 Freedom Angel Corp / Audrey Evans

---

## What Is This

**penny-sovereign-yield-scout** is an AI-assisted DeFi yield intelligence tool that:

1. **Scans social media & on-chain signals** for penny-priced assets with anomalous yield potential
2. **Sweeps 50 live DeFi protocols** in real time for the highest verifiable APYs
3. **Auto-compounds** detected yield positions via a FastAPI server
4. **Protects** against impermanent loss with the `il_shield` module
5. **Logs every action** to an on-chain-verifiable audit trail

This is the **launch bible** — start here.

---

## Project Layout

```text
penny-sovereign-yield-scout/
├── README.md                  ← You are here (launch bible)
├── persona.yaml               ← Copy-paste into OpenClaw
├── playbook.md                ← 28-page strategy playbook (glassmorphic style)
├── setup.sh                   ← One-click install + test
├── config/
│   └── 50_apis_protocols.json ← The golden 50 live 2026 endpoints
├── tools/
│   ├── listener.py            ← Social scanner → pennies signal detector
│   ├── blue_ocean_generator.py← Auto-builds CLIs / PDFs / APIs
│   ├── yield_scraper_cli.py   ← Live 50-protocol sweeper CLI
│   ├── auto_compounder_api.py ← FastAPI auto-compounder server
│   ├── il_shield.py           ← Impermanent loss protector
│   └── verifiable_logger.py   ← Audit-chain wrapper
├── samples/
│   ├── sample_pendle_locker_cli.py   ← Pendle PT/YT locker example
│   ├── sample_aave_optimizer.py      ← Aave v3 rate optimizer example
│   └── demo_scan_output.json         ← Sample sweep result payload
└── branding/
    ├── logo.png               ← Glassmorphic Freedom Angel Corps (see branding/)
    └── carousel_template.psd  ← LinkedIn / X carousel template (see branding/)
```

---

## Quick Start

```bash
# 1. Clone or enter the project folder
cd penny-sovereign-yield-scout

# 2. Run the one-click setup
bash setup.sh

# 3. Copy .env.example → .env and fill in your keys
cp .env.example .env
nano .env

# 4. Run a live yield sweep
python tools/yield_scraper_cli.py --top 10

# 5. Start the auto-compounder API
uvicorn tools.auto_compounder_api:app --reload --port 8765
```

---

## Environment Variables

Copy `.env.example` to `.env` and populate:

| Variable | Description |
|---|---|
| `ALCHEMY_API_KEY` | Alchemy node RPC key (Ethereum / Polygon) |
| `MORALIS_API_KEY` | Moralis Web3 data API |
| `DEFILLAMA_BASE_URL` | DeFiLlama yield API base URL |
| `TWITTER_BEARER_TOKEN` | Twitter/X v2 bearer token for social scan |
| `REDDIT_CLIENT_ID` | Reddit API client ID |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret |
| `OPENROUTER_API_KEY` | OpenRouter for AI signal scoring |
| `VERIFIABLE_LOG_DIR` | Local directory for JSONL audit logs |
| `COMPOUND_WALLET_ADDRESS` | EVM wallet for auto-compound transactions |
| `COMPOUND_PRIVATE_KEY` | Private key — **NEVER commit this** |

---

## Architecture Overview

```text
Social Feeds (Twitter / Reddit / Telegram)
        │
        ▼
  listener.py  ──── AI signal scorer (OpenRouter) ────┐
                                                       │
  yield_scraper_cli.py  ←── 50_apis_protocols.json    │
        │                                              │
        ▼                                              ▼
  Ranked Opportunity List ──────────────── auto_compounder_api.py
        │                                              │
        ├── il_shield.py (risk filter)                 │
        │                                              │
        └── verifiable_logger.py  ◄────────────────────┘
                 │
                 ▼
           audit_log.jsonl  (tamper-evident chain)
```

---

## Key Tools

| Tool | Purpose |
|---|---|
| `listener.py` | Monitors Twitter/Reddit/Telegram for penny + yield signals |
| `yield_scraper_cli.py` | Sweeps all 50 protocols; ranks by APY, TVL, risk score |
| `auto_compounder_api.py` | FastAPI server; call `/compound` to trigger re-invest |
| `il_shield.py` | Calculates IL exposure; blocks positions above threshold |
| `verifiable_logger.py` | JSONL logger with SHA-256 chain hash (tamper-evident) |
| `blue_ocean_generator.py` | Scaffolds new CLIs, PDF reports, and FastAPI servers |

---

## Playbook Summary (28 Pages)

See `playbook.md` for the full strategy. Key sections:

1. **Signal Sourcing** — Where pennies hide (social, on-chain, governance forums)
2. **Protocol Sweep** — 50-protocol methodology and scoring matrix
3. **Position Sizing** — Kelly Criterion adapted for DeFi yield farms
4. **IL Mitigation** — Shield strategies: concentrated ranges, hedging, stable pairs
5. **Auto-Compounding** — Frequency optimisation, gas cost break-even formula
6. **Audit Trail** — Why every trade needs a verifiable log
7. **Exit Triggers** — When to pull liquidity (APY decay, TVL drain, exploit signals)

---

## Standards Compliance

This project follows [Revvel Master Standards](../README.md):

- ✅ Glassmorphic dark UI theme (branding assets in `branding/`)
- ✅ Verifiable audit logging
- ✅ Blue Ocean feature: combined social + on-chain penny scout
- ✅ All Rights Reserved — Freedom Angel Corp / Audrey Evans 2026
- ✅ `.env.example` with all required keys documented
- ✅ `CHANGELOG.md` maintained on every push

---

## License

All Rights Reserved. Copyright 2010-2026 Freedom Angel Corp / Audrey Evans.  
No reproduction, distribution, or derivative works without explicit written permission.
