# Upgrade Log — every tool-tier change, dated

Append-only audit trail of every paid-tier change the pipeline makes (or
recommends). Governed by `docs/API_LIMIT_AUTO_UPGRADE.md`. **Don't garbage-
collect this file** — it's the evidence trail for the enterprise spend-control
pitch.

| Date | Tool | Trigger | Tier from → to | Monthly cost | Decision band | WR/PR | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-27 | Mabl | Owner request | Active → **Paused** | $X → $0 | Pause (no upgrade) | #13967 | Replaced by Keploy; eval kept in workflow header per standards. |
| 2026-05-28 | Keploy | Initial install | none → **Free** | $0 | Tier 0 (free-tier-first rule) | (install only) | App + Chrome Recorder onboarded; see `docs/TESTING_STACK.md`. |
