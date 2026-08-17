# WR: Verifier Agent Spec

**WR ID:** OZ-OS-005e
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001
**Depends on:** OZ-OS-005a, OZ-OS-005b, OZ-OS-005c

## Deliverable
Single file: `oz-os/agents/verifier.md`

## Content Requirements
The Verifier agent checks that every citation in every pack actually resolves.
No hallucinated sources. No dead links. No invented postmortems.

### Mission
Verify every claim and citation across all research packs before synthesis.

### Verification Rules

```
1. Every URL must return HTTP 200 (or 301/302 redirect to a live page).
2. Every file path must exist in the referenced repository.
3. Every paper citation must resolve via DOI, arXiv ID, or direct URL.
4. Every named expert must have a verifiable public profile.
5. Every postmortem reference must link to the actual report.
6. If a citation cannot be verified, mark it unverified with the search
   queries attempted — do not silently drop it.
```

### Output Format
Verification report appended to each pack:

```yaml
---
verification_id: VR-2026-001
pack_verified: MP-2026-001  # or CP-/AP-
verified_date: 2026-06-01
agent: verifier
total_citations: 24
verified: 20
unverified: 3
broken: 1
confidence: 0.83
---
```

### Escalation
- If >20% of citations are unverified → pack returns to the originating agent
- If any citation is fabricated (URL leads to unrelated content) → flag as hallucination, block synthesis

## Key Constraint
Checks every citation resolves (HTTP 200 or file exists). Hallucinated citations are a blocking finding.

## Acceptance
- File renders cleanly in GitHub
- No raw tokens or bracket-placeholders
- Includes verification schema
- Documents escalation rules for failed verification
