# PR backlog triage + GitHub write status (2026-08-05)

## Write status: RESTORED (post-reconnect)

User reconnected Grok GitHub App with full write permissions (Contents, PRs, Issues, Actions, Workflows, etc.).

| Probe | Result |
|---|---|
| Identity | OK (`midnghtsapphire`) |
| create_branch | OK → `feat/labels-privilege-formal-disaster-pack` |
| push_files | OK (governance pack commits) |
| create_pull_request | Expected OK |
| issue comment | OK (probe on #16933) |

Local `gh` CLI token may still be stale — prefer MCP connector for agent writes.

## Open PRs — recommended human order (no auto-merge)

### Tier A
1. #16929 MCP FastMCP shim (draft P1, CI green) — undraft → merge
2. #16853 conflict policy (checks failing) — fix CI → merge
3. #16873 conflict operator guide (green, stuck) — merge
4. #16928 saved-reply (draft, lint fail) — fix CI → undraft → merge

### Tier B — pick one sheaf
- #16897 JS (lint fail)
- #16905 Python+Observatory (conflicts)
- #16895 consistency (draft)

### Tier C
- #16933 research draft
- #16855 NEON workflow
- #16852 Dependabot (conflicts — @dependabot rebase)

## Pack
Branch: `feat/labels-privilege-formal-disaster-pack` — draft PR for human review. **No auto-merge.**
