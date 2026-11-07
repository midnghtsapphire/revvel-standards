# Metal rewrite sources — 2026-11-05

Agent: Grok Bot (Audrey-directed via TriageChief). Materials on the box at `/workspace/standards-metal-rewrite/` (not committed as binaries here; summarized).

## Primary sources used

### 1. PNG — Next-Gen AI-Architected GitHub Infrastructure (3 tiers)
- Box path: `/workspace/standards-metal-rewrite/01M6P5RQ48T7M0MMF74GQQFFPZ.png`
- **Took:**
  - **CRUX** — Rust core / thin presentation shells
  - **PyO3 + Maturin** — hot-path Rust acceleration inside Python
  - **Compiler feedback loop** — feed `cargo check` errors back to the LLM
  - **Guarded Archivist** — memory/rules updates via diffs only
  - **Gates** — clippy + `cargo fmt` (+ `cargo check`)
- **Rejected / noted as diagram artifact:**
  - **Dependabot** and **ImgBot** appear in Tier 3 — **do not require / do not adopt**. Audrey wants personal CI / local scripts (no vendor lock-in). Recorded in `AGENTS.md` metal spine.

### 2. Aegis-Rust blueprint PDF + extract
- Box paths:
  - `/workspace/standards-metal-rewrite/01M6P5RQ11JHZG5W66G7YQXAHA.pdf`
  - `/workspace/standards-metal-rewrite/aegis-rust.txt` (+ `extracts/aegis-rust.txt`)
- **Took:** PyO3/Maturin hot-path pattern; Axum / SeaORM / Tokio as target stack context; AI gaps (auth regression, stub/`todo!` proliferation, interface vs behavior); self-healing via compiler feedback; multi-tier harness idea (unit / property / miri / criterion / shadow) as aspirational gates — enforce what we can today (`cargo check` / clippy / fmt).
- **Not adopted wholesale:** full Python→Rust migration program, specific ROI targets, Claude-Sonnet-branded loop naming.

### 3. ROI xlsx (context only)
- Box path: `/workspace/standards-metal-rewrite/01M6P5RQ14X579S17562S69EY7.xlsx`
- Used as migration ROI context only — no spreadsheet numbers copied into standards.

### 4. Slide PDFs (image-only)
- `/workspace/standards-metal-rewrite/01M6P5RQ4ESYDZPFMKGVN60MD4.pdf`
- `/workspace/standards-metal-rewrite/01M6P5RQHVK5JM06Q5SQJF49S6.pdf`
- `pdftotext` empty — cite PNG + Aegis PDF as primary Library sources.

## Audrey directions folded in

- 2026-11-05 (t59u): kill allow-destroy; rewrite standards more metal / less wordy.
- 2026-11-05 (t60u): **archive then rewrite** (not comment-out-inside-same-file for AGENTS/MASTER/VISITING); never-delete impossible to miss for search / long processes / visiting LLMs; Claude / parallel agent files are why the directory must be cleaned up — one AGENTS + VISITING only.
- Standing: draft PRs into `daily/YYYY-MM-DD`; agents never merge; confidence scorer + report-to-Proofy; no new GitHub-hosted Actions; no Dependabot/ImgBot lock-in.

## Compatible open drafts (kept open)

- #18258 governance playbook
- #18259 never-delete / vendor lock-in audit
- #18260 agent security boundaries
- #18261 allow-destroy runtime-ignore (superseded in approach by allow-destroy comment-out PR; left open)
- Metal spine is short; those drafts remain compatible detail layers.

## Wave-1 archive set

Under `Archive/2026-11-05/`:

| Archived | Replaced by |
| --- | --- |
| `AGENTS.md` | root `AGENTS.md` (metal) |
| `MASTER.md` | root `MASTER.md` (metal) |
| `VISITING_AGENTS.md` | root `VISITING_AGENTS.md` (metal) |
| `CLAUDE.md` | 5-line stub → AGENTS + VISITING |
| `cursorrules.md` (was `.cursorrules`) | pointer stub |
| `copilot-instructions.md` | pointer stub |
| `docs-AGENTS.md` (was `docs/AGENTS.md`) | pointer stub |

Left for a later wave (noted, not archived here): `agent-pack/AGENTS.md`, product-local `CLAUDE.md` copies, `.claude/hooks/` (tooling not a rule essay), `mcp-servers/**/CLAUDE.md`.
