# Research Notebook — VSPR / VEINSTON

Append-only. Tag findings `[verified]`, `[plausible]`, `[unverified]`. Sources
go in `sources.md`.

---

## 2026-06-30 — restart + repo inventory

**Looking into:** what VSPR/VEINSTON material actually exists in
`midnghtsapphire/revvel-standards`.

**Findings:**

- `[verified]` `docs/veins/` holds committed VEINS material — playbook PDFs and
  images on self-healing autonomous fleets. source: S1
- `[verified]` `docs/VEINS_MONITOR.md` + `.github/workflows/veins-monitor.yml`
  exist and are real. source: S1
- `[verified]` VSPR/VEINSTON is referenced (text only) in `skills/malama/`. source: S1
- `[verified]` No `docs/grok/vspr/` folder and none of the VSPR artifacts
  described in prior LLM sessions (Bible, simulation, landing page, CLI,
  extension, deck) are present in the repo. source: S1
- `[unverified]` Those artifacts were generated into an external sandbox
  (`/home/workdir/artifacts/...`) and, per that session's own admission, never
  committed. Not recoverable from this environment. source: S2

**Data added:** none yet.

**Open threads:** locate any recoverable VSPR files; decide on one first
artifact to build; verify whether the sheaf/Ricci-flow framing maps to concrete
fleet behavior or is presentation metaphor.

---

## 2026-06-30 — concept lineage (from the originator)

**Looking into:** how VSPR relates to VEINS.

**Findings:**

- `[verified]` VSPR was created first as the original concept. Audrey then
  added a Perplexity-like research "brain" and "the infinity gap", at which
  point it evolved into **VINES** — the originator's system. So the lineage is
  **VSPR → VINES**. source: S3
- `[verified]` **VINES ≠ VEINS.** The committed `docs/veins/` material in this
  repo is a *separate, unrelated* thing and a coincidental name clash — it is
  NOT the VSPR/VINES line. Do not use it as source material here. source: S3
- `[plausible]` The "brain" component is a grounded research engine in the
  NotebookLM mold: acquire up to ~300 sources, then generate outputs (blog,
  PDF, app) using *only* those sources. This folder is the GitHub-side home for
  those source bundles + outputs. source: S3

**Open threads:** capture VINES in the originator's own words (the brain + the
infinity gap); define what "the infinity gap" denotes; map the VSPR → VINES
delta so nothing is lost; decide if VINES needs its own topic folder.

---
