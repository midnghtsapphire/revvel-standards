# Connections Registry Standard

One source of truth for **every tool, API, MCP server, CLI, agent, and GitHub
app** in the fleet — and what each one can reach — so any agent (or human) can
see at a glance what's wired and use it creatively, without rediscovering it or
acting on stale docs.

## The problem it fixes

The connection map lived in scattered, hand-maintained prose that went stale.
Agents couldn't reliably answer "what can I actually use, and what does it
connect to?" — so capability got re-scaffolded or ignored.

## How it works

- **SSOT:** [`config/connections.yml`](../config/connections.yml) — the only file
  you edit. Each entry has `type` (agent/mcp/api/cli/library/github-action/app/model),
  `auth`, `env`, `status`, `access` (what it can do), `connects_to`, `used_by`,
  and a free-text `note`.
- **Generated views** (never hand-edited):
  - [`docs/CONNECTIONS_REGISTRY.md`](./CONNECTIONS_REGISTRY.md) — grouped tables.
  - The `<!-- BEGIN:connections -->` block in [`README.md`](../README.md) — a
    summary that updates in place.
  - `connections-dashboard.html` — an **on-demand, filterable** functional
    dashboard (search by name/access/connection, filter by type/status, sortable).
- **Drift detection:** `npm run connections:drift` scans the repo (currently
  `.env.example` API keys) and reports anything wired but missing from the
  registry, so the SSOT can't silently fall behind reality.

```bash
npm run connections        # regenerate the doc + README block
npm run connections:html   # regenerate the on-demand HTML dashboard
npm run connections:drift  # report repo integrations missing from the registry
```

The [`connections-registry.yml`](../.github/workflows/connections-registry.yml)
workflow regenerates the views on every change to the SSOT and on demand.

## The `status` discipline (anti-hallucination)

- `verified` — confirmed present in this repo (an `.env.example` key, a workflow,
  a configured MCP server, or maintainer confirmation).
- `unverified` — asserted but **not** confirmed. Treat as a lead, not a fact,
  until someone flips it to `verified`. This keeps the registry from encoding a
  hallucinated connection as truth — the same discipline the agent scorecard
  enforces on code.

When you confirm an `unverified` entry (e.g. wire up VADE, or pin down how Roo
creates WRs via Linear), set its real `auth`/`env`/`used_by`, flip `status` to
`verified`, and regenerate.

## Adding a connection

1. Add an entry to `config/connections.yml`.
2. `npm run connections && npm run connections:html`.
3. Commit the YAML + regenerated views.
