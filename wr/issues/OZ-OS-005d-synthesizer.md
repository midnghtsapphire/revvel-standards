# WR: Synthesizer Agent Spec

**WR ID:** OZ-OS-005d
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001
**Depends on:** OZ-OS-005a (method-hunter), OZ-OS-005b (contrarian), OZ-OS-005c (adjacent-domain)

## Deliverable
Single file: `oz-os/agents/synthesizer.md`

## Content Requirements
The Synthesizer merges three input packs into a ranked decision:
1. Method Pack (from method-hunter)
2. Contrarian Pack (from contrarian)
3. Adjacent Pack (from adjacent-domain)

### Mission
Merge all research packs into a single ranked architecture recommendation.
Resolve conflicts between Method Hunter's expansions and Contrarian's attacks.

### Core Rules

```
1. Reject any method where contrarian_confidence > 0.7 UNLESS a written justification
   overrides the attack with new evidence not in the contrarian pack.
2. Promote any method found in 3+ unrelated industries (from adjacent-domain pack).
3. Flag as experimental any method not used by reference systems in
   tool-intelligence/reference-systems.md.
4. If Verifier cannot confirm any citation in a method → entire method returns
   to research phase.
5. Output a ranked list, not a single recommendation. The human picks.
```

### Output Format
`research-packs/<topic>/synthesis.md`

### Output Schema

```yaml
---
synthesis_id: SY-2026-001
input_packs:
  method: MP-2026-001
  contrarian: CP-2026-001
  adjacent: AP-2026-001
topic: <research topic>
generated: 2026-06-01
agent: synthesizer
methods_evaluated: 14
methods_rejected: 3
methods_promoted: 2
---
```

### Conflict Resolution Order
1. Contrarian confidence > 0.8 → method is rejected, must be justified to include
2. Adjacent Domain finds same solution in 3+ unrelated industries → method is promoted
3. No reference system in `reference-systems.md` uses it → flag as experimental
4. Verifier cannot confirm any citation → entire pack returns to research phase

## Key Constraint
Rejects methods with `contrarian_confidence > 0.7` unless justified with new evidence.

## Acceptance
- File renders cleanly in GitHub
- No raw tokens or bracket-placeholders
- Includes conflict resolution rules
- Cross-references all three input agent specs
