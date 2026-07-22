# WR-4600 Prompt Drift Report

**Canonical source:** WR-4200 (Drive)
**Shipped surface:** `products/wr-4600-photon-bench/original.html`
**Urgency:** LOW — `.md` files remain source of truth.

## Summary

Three sections and one principle from the canonical WR-4200 prompt were dropped in the condensed dashboard embed. All safety gates were faithfully preserved. No fabrication or safety-critical drift detected.

## Dropped sections

### 1. `IDENTITY`
Canonical prompt establishes operator identity, tone, and refusal posture. Condensed embed omits this block entirely.
- **Impact:** Cosmetic — dashboard is a read-only artifact, not an interactive agent surface.
- **Recommendation:** Restore if the dashboard grows a chat/agent affordance.

### 2. `MODEL ROUTING`
Canonical prompt specifies routing hints (which classes of task go to which model tier). Absent from embed.
- **Impact:** None at rest; matters only if the dashboard begins dispatching model calls.
- **Recommendation:** Keep in `.md` source of truth; re-inject at build time if runtime routing is added.

### 3. `INVENTORY`
Canonical prompt enumerates tools/APIs available (harvest shards, dose engine, etc.). Embed refers to capabilities implicitly.
- **Impact:** Low — the embed does not expose tool-calling.
- **Recommendation:** Include when dashboard is wired to `tools/harvest.py`.

### 4. n8n / Gumloop principle
Canonical prompt includes the automation-composition principle ("prefer declarative pipelines; a step that can't be replayed offline is not a step"). Absent from embed.
- **Impact:** Philosophical, not gate-level.
- **Recommendation:** Add to `wr/research/` as a standing note; already reflected in `tools/harvest.py` design (stdlib-only, deterministic self-test).

## Faithfully preserved (audited)

- [x] WR-4200 fabrication gate: "a fabricated citation is a P0 incident"
- [x] WR-4600.3 delta-not-breakthrough framing
- [x] Quiet-day success semantics (snapshot even when no delta)
- [x] Content-hashed immutable snapshots
- [x] Keyless-API degradation posture (0 rows + procurement note, never pad)
- [x] `adverse` shard runs first
- [x] HARM/FLICKER/OCULAR triage escalation

## Verdict

**Low urgency.** The dashboard is an artifact, not an agent. Drift is limited to sections that only matter at runtime for interactive/agentic surfaces. All P0 safety gates are intact.

Source of truth precedence (unchanged):
1. `WR-4600.3-harvest-spec.yml`
2. `wr/research/*.md`
3. `products/wr-4600-photon-bench/original.html` (rendered view)
