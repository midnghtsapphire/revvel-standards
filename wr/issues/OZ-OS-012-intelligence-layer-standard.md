# WR: Add Intelligence Layer Standard to `revvel-standards`

**WR ID:** OZ-OS-012
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Single file: `revvel-standards/docs/INTELLIGENCE_LAYER_STANDARD.md`

## Content Requirements
A formal standard that codifies the intelligence layer methodology for all repos
in the MIDNGHTSAPPHIRE ecosystem. This is the rulebook entry for Oz OS.

### Sections Required

1. **Purpose** — why the intelligence layer exists
2. **Scope** — which repos are affected (all repos that produce research)
3. **Definitions** — intel entry, research pack, method pack, null result
4. **Method Divergence Requirement** — minimum 10 methodologies before proposing a solution
5. **Agent Roles** — Method Hunter, Contrarian, Adjacent Domain, Synthesizer, Verifier, Archivist
6. **Evidence-Gated Autonomy** — no research → no architecture → no code → no merge
7. **Intel Entry Lifecycle** — creation, validation, decay, re-verification
8. **NULL_RESULT Policy** — when and how to declare null
9. **Provenance Requirements** — every claim must be traceable to a source
10. **Integration with MASTER.md** — reference to steps 5.5–5.8

### Relationship to Existing Standards
- Extends `PROVENANCE_STANDARD.md` (PR #13975) with research-specific provenance
- Extends `CODE_REVIEW_STANDARD.md` with agent review requirements
- Does NOT replace any existing standard — it adds a new layer

## Acceptance
- File follows the structure of existing standards in `docs/`
- All 10 sections present
- No raw tokens or bracket-placeholders
- Cross-references MASTER.md, OZ-OS-001, and existing standards
