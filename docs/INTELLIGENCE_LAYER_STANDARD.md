# Intelligence Layer Standard

> Codifies the intelligence layer methodology for all repos in the MIDNGHTSAPPHIRE ecosystem.
> This is the rulebook entry for Oz OS. Parent WR: OZ-OS-012. Governed by MASTER.md.

---

## 1. Purpose

The intelligence layer exists to make research compound. Without it, every WR starts
from zero — agents re-search the same topics, re-discover the same failures, and
re-make the same mistakes. The intelligence layer ensures that what is learned once
is available forever.

The compounding assets are:
- `intel/` entries (permanent intelligence records)
- `research-packs/` (per-topic research bundles)
- `method-packs/` (reusable methodology templates)

## 2. Scope

This standard applies to:
- `midnghtsapphire/oz-os` (primary intelligence repository)
- Any repo that produces research as part of a WR
- Any agent that consumes intel entries to inform decisions

This standard does NOT apply to:
- Product repos that only consume intel (they read, not write)
- `revvel-standards` itself (this repo hosts the standard but does not produce research packs)

## 3. Definitions

| Term | Definition |
|------|-----------|
| **Intel entry** | A permanent record in `intel/INTEL-YYYY-NNN.md` following the YAML frontmatter schema. Contains: what was learned, why it matters, how to apply it, when it expires. |
| **Research pack** | A per-topic bundle in `research-packs/<topic>/` containing a README, method files, and optionally contrarian/adjacent packs. |
| **Method pack** | The output of a Method Hunter agent: 10+ methods scored by confidence, cost, risk, complexity, novelty, scalability. |
| **Contrarian pack** | The output of a Contrarian agent: attacks on every method in a method pack, each with citations. |
| **Adjacent pack** | The output of an Adjacent Domain agent: cross-industry methods that transfer to the target domain. |
| **Synthesis** | The output of a Synthesizer agent: a ranked, conflict-resolved list of methods. |
| **NULL_RESULT** | A valid research output declaring "searched thoroughly and found nothing," with required fields: queries tried, sources checked, time spent, confidence in absence. |

## 4. Method Divergence Requirement

Before proposing a solution, agents MUST produce a Method Pack with minimum 10
fundamentally different methodologies:

1. Obvious
2. Industry-standard
3. Academic
4. Open-source
5. Enterprise
6. Low-cost
7. Historical
8. Adjacent-domain
9. Contrarian
10. Experimental

Each method is scored on: confidence / cost / risk / complexity / novelty / scalability.

**When this requirement applies:** Any WR where the solution approach is not obvious
from the problem statement. Bug fixes with clear root causes are exempt.

**When this requirement does NOT apply:** Typo fixes, dependency bumps, formatting
changes, and other Tier 0/1 work (see `oz-os/AUTONOMY_TIERS.md`).

## 5. Agent Roles

Six specialized agents form the intelligence pipeline:

| Agent | Mission | Output |
|-------|---------|--------|
| **Method Hunter** | Find 10+ methods; never solve the problem | `method-pack.md` |
| **Contrarian** | Attack every method; build a prosecution case | `contrarian-pack.md` |
| **Adjacent Domain** | Steal proven methods from unrelated industries | `adjacent-pack.md` |
| **Synthesizer** | Merge packs; resolve conflicts; rank methods | `synthesis.md` |
| **Verifier** | Check every citation resolves (HTTP 200 or file exists) | verification report |
| **Archivist** | Write the intel entry; block PR close if missing | `intel/INTEL-*.md` |

Agent specs live in `oz-os/agents/`. No agent merges its own PR.

## 6. Evidence-Gated Autonomy

The core policy:

```text
No research    → no architecture
No evidence    → no merge
No tests       → no completion claim
No intel entry → no PR close
```

Every claim in a research pack must be traceable to a source. Every method must
have a citation. Every failure must produce an intel entry before the PR closes.

## 7. Intel Entry Lifecycle

### Creation
- Archivist agent creates `intel/INTEL-YYYY-NNN.md` after each research cycle
- Entry follows `intel/SCHEMA.md` frontmatter
- All four body sections required: What we learned / Why it matters / How to apply it / When it stops being true

### Validation
- Verifier agent checks all citations in the entry
- wr-lint.mjs validates formatting (no raw tokens, no bracket-placeholders)

### Decay
- Each entry has a `half_life_days` field (default: 90)
- After `half_life_days`, the entry is flagged for re-verification
- Re-verification updates the `date` and `confidence` fields or marks the entry superseded

### Re-verification
- Triggered automatically when `half_life_days` expires
- Agent re-checks citations and re-evaluates confidence
- If the finding is no longer valid, a new entry supersedes it (`supersedes` field)

## 8. NULL_RESULT Policy

`NULL_RESULT` is a valid and respected output. Fake completion is not.

Required fields for a NULL_RESULT:
1. **Queries tried** — minimum 10 search strings
2. **Sources checked** — databases, APIs, repos, forums
3. **Time spent** — wall-clock research time
4. **Confidence in absence** — 0.0 to 1.0
5. **Reason** — one of: `no_evidence_exists`, `evidence_contradicts_premise`, `access_denied`, `time_exhausted`, `scope_too_narrow`

A NULL_RESULT with fewer than 10 queries is quitting early, not a null result.
The Archivist still writes an intel entry for NULL_RESULT research.

See `oz-os/NULL_RESULT_SCHEMA.md` for the full schema.

## 9. Provenance Requirements

Every claim must be traceable:

- **URLs** must return HTTP 200 (checked by Verifier agent)
- **File paths** must exist in the referenced repository
- **Paper citations** must resolve via DOI, arXiv, or direct URL
- **Named experts** must have verifiable public profiles
- **Postmortem references** must link to the actual report

Hallucinated citations are a blocking finding. Unverified citations are flagged
but do not block (the source may have moved).

This extends the provenance principles in existing standards with research-specific
verification requirements.

## 10. Integration with MASTER.md

The intelligence layer plugs into the MASTER.md pipeline at steps 5.5–5.8:

```text
(5)   CLEAN OUTPUT
(5.5) METHOD HUNTER       → method-pack.md        (optional per WR)
(5.6) CONTRARIAN           → contrarian-pack.md    (optional per WR)
(5.7) ADJACENT DOMAIN      → adjacent-pack.md      (optional per WR)
(5.8) SYNTHESIS            → synthesis.md           (optional per WR)
(6)   Jules normalize
```

Steps 5.5–5.8 are optional — not every WR needs method divergence. When triggered,
all four steps must complete before step 6. Each step produces a file in
`research-packs/<topic>/`. If any step returns NULL_RESULT, it is documented but
does not block the pipeline.

See OZ-OS-001 (parent WR) for the full vision and children tracker.
