# Standard: Runner Targets & Procurement BOM Rule

> Status: **MANDATORY**
> Owners: Execution OS / Runner Orchestrator

## Purpose

Define the closed set of execution surfaces ("runner targets") that Revvel engines may dispatch to, and the **Procurement BOM rule** that prevents vague failures.

## Approved Runner Targets

| Target     | Purpose                                | Typical Artifact            |
|------------|----------------------------------------|-----------------------------|
| `github`   | Repos, PRs, Issues, Actions, Releases  | commit SHA, PR URL          |
| `vercel`   | Web deploys, edge functions            | deployment URL              |
| `supabase` | Postgres, auth, storage, edge fns      | project ref, table name     |
| `zapier`   | Cross-SaaS automation                  | Zap URL, run ID             |
| `make`     | Visual workflow automation             | scenario URL                |
| `n8n`      | Self-hosted workflow automation        | workflow ID                 |
| `gumloop`  | AI workflow automation                 | flow URL                    |
| `polar`    | GitHub funding / monetization          | product URL, checkout URL   |
| `cli`      | Local shell execution                  | exit code, stdout           |
| `browser`  | Headless/manual browser ops            | screenshot, URL             |

Any dispatch to a target outside this list MUST be rejected by the orchestrator.

## Procurement BOM Rule (MANDATORY)

When a runner cannot execute because it lacks credentials, API access, an account, infrastructure, data, or a human-in-the-loop action, it **MUST**:

1. Set step status to `needs_procurement`.
2. Emit a `BOM.md` at `docs/projects/<project>/BOM.md` using `BOM_TEMPLATE.md`.
3. Populate the `bom` field in `state.json` (see `schemas/state.schema.json`).
4. Halt the orchestrator until procurement is resolved.

### What a BOM Must Contain

Each line item:
- **Name** — exact thing needed (e.g., "Twilio API key", "LLC EIN", "$50 Meta Ads credit").
- **Category** — `credential | api | account | infra | data | service | human`.
- **Cost (USD)** — one-time or monthly; `0` if free.
- **Source** — vendor URL or supplier.
- **Acquisition** — exact steps to acquire (links, form names, who signs).
- **Blocking** — `true` if execution cannot continue without it.

## Forbidden

- "Configure your environment variables." → **Reject.** Emit a BOM line per missing var.
- "Set up the database." → **Reject.** Emit BOM with provider, plan, cost, and SQL bootstrap path.
- "You'll need an API key." → **Reject.** Name the vendor, plan, URL, cost.

## Enforcement

- CI MUST validate that any step with status `needs_procurement` has a non-null `bom_ref` pointing to a file matching `BOM_TEMPLATE.md` structure.
- PRs that introduce engines or runners without honoring this rule MUST be blocked.

## Revenue Anchor

Every BOM MUST cite the `revenue_target_monthly_usd` it unblocks. Procurement that does not move us toward **$10k → $30k → $100k → $10M** is deferred.
