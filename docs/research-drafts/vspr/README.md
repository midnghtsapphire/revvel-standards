# VSPR — Vascular-Sheaf Policy Repair

**One-line summary:** A framing that treats agentic systems / codebases as
living vascular networks that detect damage and self-heal, with VEINSTON as the
visualization + simulation layer.

**Intended project / outcome:** Unknown yet — candidate outcomes include a
standards write-up, a visual simulator, and/or sellable explainer material.
Decide after the research is compiled and verified.

**Status:** `gathering`

**Owner:** Audrey

## Why this matters

VSPR/VEINSTON has been discussed and partially generated across LLM sessions,
but the artifacts (a "Standards Bible", a VEINSTON simulation, a landing page,
a CLI, a Chrome extension, a deck) were written to an external sandbox and were
**never committed to this repo** — so they are not recoverable from here. This
folder is the clean restart: compile what's real, cite it, and build from
verified material instead of vanished drafts.

## Name clash — VINES vs VEINS (do not conflate)

Per the originator:

- **VINES** = the originator's system. VSPR evolved into VINES by adding a
  Perplexity-like research "brain" and "the infinity gap". This is the thing
  being moved into the repo. Its files are **not here yet**.
- **VEINS** = the `docs/veins/` material already committed in this repo
  (playbook PDFs, `VEINS_MONITOR.md`, `veins-monitor.yml`). A **separate,
  unrelated** thing. Not VINES, not a starting point for this lineage.

So the line is **VSPR → VINES**. The committed `docs/veins/` is a coincidental
name clash, not a precursor or descendant.

## What IS in this repo (related text only — verify before reusing)

- `skills/malama/SKILL.md`, `skills/malama/SYSTEM_PROMPT.md` — mention VSPR /
  VEINSTON framing in passing. Confirm whether these refer to this lineage
  before treating them as source material.

## What is NOT here (do not assume it exists)

- No `VSPR_Standards_Bible.md`, VEINSTON simulation, `vspr-landing.html`,
  `vspr-cli.py`, Chrome extension, or deck. If you have these from a Grok/other
  session, drop the files in `data/` and log them in `sources.md` (marked
  `unverified`) before relying on them.

## Open questions

- [ ] What of the prior VSPR/VEINSTON work actually exists in a recoverable form?
- [ ] Which single artifact is worth building first (sim vs. standards vs. PDF)?
- [ ] Does the math framing (sheaf / Ricci flow) map to anything concrete the
      fleet does, or is it presentation-layer metaphor? Verify before claiming.

## Next step

Export any existing VSPR files you still have into `data/`, log their origin in
`sources.md`, then we triage what's real and pick one concrete outcome.
