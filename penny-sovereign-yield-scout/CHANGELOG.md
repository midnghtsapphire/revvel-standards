# Changelog — penny-sovereign-yield-scout

All notable changes to this project will be documented in this file.
Auto-updated on every push via GitHub Actions (see `.github/workflows/`).

Format: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added

- `requirements-dev.txt` — separated dev/test dependency manifest
  (`pytest>=8.0.0`, `pytest-mock>=3.12.0`). `pytest-mock` is required by the
  existing test suite which uses the `mocker` fixture.

### Changed

- `requirements.txt` — removed `pytest` (moved to `requirements-dev.txt`) so
  runtime installs no longer pull in test-only dependencies.

---

## [1.0.0] — 2026-04-11

### Added

- `README.md` — Project launch bible with full architecture overview
- `persona.yaml` — OpenClaw AI persona configuration for YieldScout agent
- `playbook.md` — 28-page strategy playbook with 15 chapters
- `setup.sh` — One-click install + smoke test script
- `config/50_apis_protocols.json` — Golden 50 live DeFi protocol endpoints (2026)
- `tools/listener.py` — Social scanner (Twitter/X, Reddit) → penny yield signal detector
- `tools/blue_ocean_generator.py` — Auto-scaffolds CLIs, FastAPI servers, and PDF reports
- `tools/yield_scraper_cli.py` — Live 50-protocol sweeper CLI with opportunity scoring
- `tools/auto_compounder_api.py` — FastAPI auto-compounder server with gas guard + audit logging
- `tools/il_shield.py` — Impermanent loss calculator and position guard
- `tools/verifiable_logger.py` — Tamper-evident JSONL audit chain logger
- `samples/sample_pendle_locker_cli.py` — Pendle Finance PT/YT locking strategy example
- `samples/sample_aave_optimizer.py` — Aave v3 rate optimizer + loop simulator example
- `samples/demo_scan_output.json` — Sample sweep result with 20 ranked opportunities
- `branding/README.md` — Visual identity specification (logo + carousel template)
- `.env.example` — All required environment variables documented
- `requirements.txt` — Python dependency manifest

### Architecture

- Opportunity scoring formula: `(apy_net/100) × log10(tvl_usd) × (1 - il_risk) × (1 - rug_risk)`
- Tamper-evident audit chain with SHA-256 prev_hash linkage
- Gas guard: blocks compounding when gas > 2% of accumulated yield
- IL shield: blocks LP entry when estimated IL > `max_il_pct` threshold
- Blue ocean target: penny tokens (<$0.10), TVL $500k–$50M, real revenue yield

---

*All Rights Reserved. Copyright 2026 Freedom Angel Corp / Audrey Evans.*
