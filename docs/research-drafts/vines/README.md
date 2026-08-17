# VINES — the system

**One-line summary:** A real-time self-correcting system: it detects and fixes
errors *as they happen* and should be continuously improving. Evolved from VSPR
(its precursor) by adding a research "brain" and "the infinity gap".

**Intended project / outcome:** Rebuild the app here (Claude Code) while Lovable
keeps hosting + database for instant launch. First, analyze what Lovable's code
actually does vs. what VINES is supposed to do. May need Supabase.

**Status:** `gathering`

**Owner:** Audrey (originator — authoritative source for what VINES is)

## The core distinction (do not lose this)

VINES is **not** a learner. Two different things:

| | Behavior |
| --- | --- |
| **Perplexity-style "brain" (a learner)** | Accumulates knowledge; uses what it learned to solve recurring problems *faster*. Reactive. Gets better at answering — does not fix itself mid-run. |
| **VINES (real-time self-corrector)** | **Corrects errors in real time. Constantly improving by design** — a live healing loop, not a smarter lookup. |

Combining VINES with a Perplexity brain was hard precisely because "Perplexity
isn't really a self-healer in real time" — so the brain is at best a component,
not the engine. The self-healing engine is the VINES part.

## Open verification targets (for Lovable's code)

- [ ] Does Lovable's code **actually implement sheaf biomimetics**, or just
      claim to? (Originator's concern: it "frequently doesn't tell the truth"
      about really using it.)
- [ ] Does it do **real-time error correction**, or only the learner pattern
      (log → reuse later)?
- [ ] What's the data layer — Supabase? Something else?
- [ ] What is "the infinity gap" in the implementation, if anything?

## Blockers right now (honest)

- The `vines` GitHub repo (`midnghtsapphire/vines`) exists but is **empty** —
  Lovable's source has not been pushed, so there is nothing to analyze yet.
- The intended **data dump** of specs/material into the draft file **did not
  land** — see `NOTEBOOK.md`. We still need the real content.

## Next step

Get Lovable's actual source into a repo (or paste/upload it) so we can audit it
against the distinction above. Separately, capture the VINES design in the
originator's own words so we have a spec to compare against.
