# CI/CD Troubleshooting Governance Dashboard

An interactive decision-tree flowchart for triaging CI/CD pipeline failures, with full CRUD so any team can build and extend their own governance trees instead of relying on a hardcoded flow.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/cicd-dashboard run dev` — run the dashboard frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild
- Frontend: React + Vite, TanStack Query

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract (Flow/Node schemas + endpoints)
- `lib/db/src/schema/flows.ts`, `lib/db/src/schema/nodes.ts` — DB schema (flows have many nodes; nodes reference `parentId` + `branchLabel` to form the tree, no self-referential FK)
- `artifacts/api-server/src/routes/flows.ts` — flows + nodes CRUD routes
- `artifacts/cicd-dashboard/` — React dashboard (tree view, node detail drawer, CRUD dialogs), previewPath `/`

## Architecture decisions

- Nodes form a tree via `parentId` (nullable int, no FK constraint) + `branchLabel` (e.g. "Pass"/"Fail") rather than a fixed schema — this is what makes trees "scaleable"/extensible via CRUD instead of hardcoded.
- Node types (`start`, `check`, `success`, `failure`, `warning`) drive both tree-node coloring and the flow summary stat buckets; `start` counts toward `totalNodes` but has no dedicated stat bucket.
- `GET /flows/:id` returns nodes flattened (not nested) — the frontend reconstructs the tree client-side via `parentId`.
- Deleting a node only deletes that row (no cascading delete of descendants implemented) — deleting a mid-tree node currently orphans its children in the API layer.

## Product

- Dashboard lists governance flows in a sidebar; selecting one renders its decision tree with mission-control styling (deep jungle green background, glassmorphism cards, gold connector lines, emerald/crimson/gold node coloring by type).
- Each node has a "Tiny Tidbit" explanation, viewable via a detail drawer.
- Full CRUD: create/edit/delete flows, create/edit/delete nodes (including adding branches from any existing node).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing API server route files, you must restart the `artifacts/api-server: API Server` workflow (not just the frontend workflow) — its `dev` script runs a build-then-start, so stale routes persist until it's restarted.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
