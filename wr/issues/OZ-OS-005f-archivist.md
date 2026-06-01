# WR: Archivist Agent Spec

**WR ID:** OZ-OS-005f
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001
**Depends on:** OZ-OS-003 (intel schema), OZ-OS-005d (synthesizer)

## Deliverable
Single file: `oz-os/agents/archivist.md`

## Content Requirements
The Archivist writes the final intel.md entry so research compounds. Without the
Archivist, research is done and forgotten. This agent ensures every completed
research cycle produces a permanent intelligence record.

### Mission
After synthesis is complete, write the `intel.md` entry. Block PR close if the
entry is missing.

### Core Rules

```
1. Every completed research cycle MUST produce at least one intel entry.
2. The entry MUST follow the schema in intel/SCHEMA.md (OZ-OS-003).
3. The entry MUST cite the source WR, source PR, and all pack IDs consumed.
4. The entry MUST include "When it stops being true" — no evergreen claims.
5. If the research produced a NULL_RESULT, the Archivist still writes an entry
   documenting what was searched and why nothing was found.
6. The Archivist blocks PR close if no intel entry is attached.
```

### Output Format
New file: `oz-os/intel/INTEL-YYYY-NNN.md` following the SCHEMA.md frontmatter.

### Integration with PR Workflow
- Archivist runs as a required check before PR merge on `oz-os` repo
- If no `intel/INTEL-*.md` file is added or modified in the PR, the check fails
- Escape hatch: PR label `no-intel-required` with a written justification in the PR body

## Key Constraint
Writes `intel.md` entry and blocks PR close if missing. NULL_RESULT research still gets an entry.

## Acceptance
- File renders cleanly in GitHub
- No raw tokens or bracket-placeholders
- Documents the PR-blocking behavior
- Cross-references intel/SCHEMA.md and synthesizer.md
