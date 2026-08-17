---
name: Multi-service workflow restarts
description: In a pnpm monorepo with multiple artifacts (e.g. api-server + a frontend), each artifact runs its own workflow/dev process independently.
---

Restarting a frontend artifact's workflow does NOT restart a backend artifact's workflow (or vice versa). If a backend's `dev` script does a build-then-start (e.g. `pnpm run build && pnpm run start`), edits to backend route/server files are invisible until that specific workflow is restarted — not just the frontend one.

**Why:** Led to a debugging cycle where new API routes returned 404 after being added, because only the frontend workflow was restarted; the API server was still serving its stale pre-edit build.

**How to apply:** After editing server-side code in any artifact, restart that artifact's own workflow specifically (check exact name via `listWorkflows()` — names are like `artifacts/<slug>: <service-name>`, not the artifact's display title). Don't assume restarting one workflow refreshes sibling artifacts.
