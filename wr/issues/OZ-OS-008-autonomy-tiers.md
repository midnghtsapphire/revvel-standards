# WR: Autonomy Tiers for Oz OS

**WR ID:** OZ-OS-008
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Single file: `oz-os/AUTONOMY_TIERS.md`

## Content Requirements
Define what agents can ship without human approval. This is the single biggest lever
against the "sitting on an egg" feeling — right now everything needs human review,
which means nothing moves.

### Tier Definitions

```
Tier 0 — Auto-merge (no human needed):
  - Typo fixes
  - Link rot repairs
  - Dependency bumps with passing tests
  - Formatting / whitespace normalization

Tier 1 — Auto-merge with notification:
  - Documentation additions
  - New intel.md entries (following SCHEMA.md)
  - Research pack updates (append-only)
  - Method pack additions

Tier 2 — Requires 1 agent review:
  - New agent specs
  - New research packs (creation, not update)
  - Tool intelligence entries
  - Reference system evaluations

Tier 3 — Requires human approval:
  - Schema changes (intel/SCHEMA.md, NULL_RESULT_SCHEMA.md)
  - New standards (docs/*)
  - Anything touching MASTER.md
  - Autonomy tier changes (this file)

Tier 4 — Requires human approval + 24h cooldown:
  - Deleting research (any file removal from research-packs/ or intel/)
  - Deprecating agents
  - Changing hard rules in OZ-OS-001
  - Repository-level configuration changes
```

### Implementation
- Tiers enforced via GitHub Actions + branch protection rules
- Each PR must declare its tier in the PR body: `Tier: 0` through `Tier: 4`
- Mismatch between declared tier and actual file changes triggers a gate failure

## Acceptance
- All 5 tiers documented with concrete examples
- Each tier specifies the approval mechanism
- No raw tokens or bracket-placeholders
- Implementation guidance included
