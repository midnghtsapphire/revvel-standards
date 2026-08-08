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

> **2026-08-08 refresh:** several rows below are historical. See
> `PR_BACKLOG_TRIAGE_2026-08-08.md` and
> `wr/pending/weekly-audit-2026-08-05/README.md` for live remaining queue.

### Tier A
1. #16929 MCP FastMCP shim (draft P1, CI green) — undraft → merge — **still open 2026-08-08**
2. #16853 conflict policy (checks failing) — fix CI → merge — **still open**
3. #16873 conflict operator guide (green, stuck) — merge — **still open**
4. #16928 saved-reply (draft, lint fail) — fix CI → undraft → merge — **MERGED 2026-08-05**

### Tier B — pick one sheaf
- #16897 JS (lint fail) — **MERGED (canonical) 2026-08-05**
- #16905 Python+Observatory (conflicts) — **close as duplicate**
- #16895 consistency (draft) — **close as duplicate**

### Tier C
- #16933 research draft — **merged**
- #16855 NEON workflow — **merged**
- #16852 Dependabot (conflicts — @dependabot rebase) — **still open**

## Pack
Branch: `feat/labels-privilege-formal-disaster-pack` — **merged as #16944**. **No auto-merge.**
