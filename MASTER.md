# MASTER.md — REVVEL system of record (metal, 2026-11-05)

> Archived wordy original: [`Archive/2026-11-05/MASTER.md`](./Archive/2026-11-05/MASTER.md).
> Doc order lives here. Runtime call chain: [`START_HERE_CALL_CHAIN.md`](./START_HERE_CALL_CHAIN.md).
> Agent contract: [`AGENTS.md`](./AGENTS.md). Guests: [`VISITING_AGENTS.md`](./VISITING_AGENTS.md).

## The one rule

A human may supply only a `[WR] <title>`. The system generates the rest — research first, max useful scope, clean output. Agents open **draft** PRs into `daily/YYYY-MM-DD` and **never merge**.

## Never delete

Comment-out or `Archive/YYYY-MM-DD/` rename only. No label permits deletion. See `AGENTS.md`.

## Pipeline (governing order)

```text
[WR title]
  → TITLE_TO_WR_EXPANSION + WR_RESEARCH_MANDATE (research first)
  → ARTIFACT_GENERATOR (product WRs)
  → work_request.yml fields
  → clean output (no scaffolding / raw placeholders)
  → optional method/contrarian/adjacent packs → synthesis
  → Jules normalize (PR mirrors WR)
  → execute (one iteration; multiple draft PRs OK)
  → wr-lint / archival / no-destroy gates
```

## File registry (short)

| Doc | Governs |
| --- | --- |
| `AGENTS.md` | Agent contract (metal spine) |
| `VISITING_AGENTS.md` | Guest contract |
| `UPREV_METHOD.md` | Method |
| `WR_RESEARCH_MANDATE.md` | Research-first |
| `standards/COMMENT-DONT-DELETE.md` | Comment-out format |
| `standards/LEDGER_STANDARD.md` | Ledger |
| `standards/PRODUCT_INCUBATION_STANDARD.md` | `products/<name>/` |
| `standards/DECISION_SCORING_ENGINE_STANDARD.md` | Confidence scorer |
| `docs/governance/GUARDED_ARCHIVIST.md` | Diffs-only memory/rules |
| `Library/` | Sources for this repo |

`REPO_LIBRARY_STANDARD` / `WRITE_AS_YOU_GO_STANDARD`: Library + CHANGELOG (+ LEDGER if present) in the **same commit** as the work.

## Metal preferences (from 2026-11-05 rewrite)

- Enforce with scripts/gates, not essays.
- CRUX / PyO3-Maturin / `cargo check`→LLM loop / Guarded Archivist.
- Gates: clippy, `cargo fmt`, `cargo check`, CircleCI archival (fail closed).
- No new GitHub-hosted Actions; no Dependabot/ImgBot adoption (prefer personal CI).

## Conflict rule

If two docs conflict, this file's ordering wins for *which doc governs*; `AGENTS.md` OWNER / never-delete rules win for *agent behavior*. Owner-authored later direction beats older agent-authored notes (keep history via Archive/).
