# Research Notebook — VINES

Append-only. Tag findings `[verified]`, `[plausible]`, `[unverified]`. Sources
go in `sources.md`.

---

## 2026-06-30 — VINES architecture, in the originator's words

**Looking into:** what VINES actually is, vs. the Perplexity-brain framing, and
what we need to verify in Lovable's build.

**Findings (originator-sourced — authoritative):**

- `[verified]` VINES corrects errors **in real time** and should be **constantly
  improving** by design. source: S1
- `[verified]` This is **different from** a Perplexity-style "brain", which is a
  **learner**: it uses what it has learned to solve recurring problems *faster*,
  but is not a real-time self-healer. "Mine and what it does are two different
  things." source: S1
- `[verified]` Combining VINES with the Perplexity brain was hard *because*
  Perplexity "isn't really a self-healer real time" — so the brain is a
  component at most, not the healing engine. source: S1
- `[plausible→to-verify]` Lovable "frequently doesn't tell the truth about
  really using the sheaf biomimetics." Must confirm against actual code whether
  the sheaf-biomimetic / real-time self-healing behavior is implemented or only
  claimed. source: S1

**Plan:** Lovable hosts (DB + instant launch); rebuild/refine the app here.
Get Lovable's source → audit it against the real-time-corrector vs. learner
distinction → decide what to keep, fix, or rebuild. Supabase likely for the
data layer.

**Blockers:**

- `[verified]` `midnghtsapphire/vines` repo is **empty** (0 files, 0 commits) —
  Lovable source not pushed yet. Nothing to analyze. source: S2
- `[verified]` The "shortcut to specs" upload was **supposed to dump data into a
  file** (specs + more) but **nothing landed** — checked working tree, all
  branches, `docs/specs/`, symlinks; no new content found. The dump did not
  work. source: S1, S2

**Open threads:** how to get Lovable's code in (GitHub sync / zip / paste);
what the data-dump shortcut was meant to be so we can retry it a working way;
precise meaning of "the infinity gap".

---
