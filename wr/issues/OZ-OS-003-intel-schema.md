# WR: `intel.md` Schema + 5 Backfilled Entries

**WR ID:** OZ-OS-003
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
1. `oz-os/intel/SCHEMA.md` — YAML frontmatter schema for all intel entries
2. Five backfilled entries from `revvel-standards/learnings.md`

## Schema

```yaml
---
intel_id: INTEL-2026-001
title: <short noun phrase>
date: 2026-06-01
source_wr: <WR ID that produced this>
source_pr: <PR # if any>
domain: [github-actions, sar, mcp, ...]
confidence: 0.0–1.0
evidence:
  - type: postmortem | doc | code | conversation | external
    ref: <URL or path>
contradicts: [INTEL-2025-042]   # optional
supersedes: [INTEL-2025-099]    # optional
half_life_days: 90              # when to re-verify
---

# <title>

## What we learned
## Why it matters
## How to apply it
## When it stops being true
```

## Five Entries to Backfill
1. WR_TEMPLATE_FULL causes placeholder leakage (ref PR #14118)
2. `pull_request_target` + checkout PR head = RCE risk
3. Auto-merge SQUASH on agent PRs enables supply-chain risk
4. `localStorage` PAT storage in `freedom-angel-repo-manager` is XSS-exfil
5. `gh issue list --limit 1000` silently truncates

## Acceptance
- SCHEMA.md passes wr-lint
- 5 entries present, each cites a real PR or file path
- No raw tokens anywhere
