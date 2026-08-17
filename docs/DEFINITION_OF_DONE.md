# Definition of Done — the law

Curt rules. Don't negotiate them. If a deliverable breaks one, it is **not done.**

## 1. Done = TESTABLE-LIVE
- **Every deliverable ships a live Vercel deployment.** No live URL = not done.
- **Put the live URL in the README** under `## Live Deployment`. Every app, every repo.
- **Even an API, CLI, or MCP server gets a web interface to test it.** A minimal
  playground/console that exercises it live. If a human can't click it and watch
  it work, it isn't done. No headless deliverables.

## 2. Don't ship scaffolding
- No `TODO`, `FIXME`, "coming soon", placeholder, lorem ipsum, empty handlers, or
  default framework boilerplate in shipped product code.
- The build passes. Every screen and flow works end to end. Finish it in detail.

## 3. Reuse, don't rebuild
- Check `docs/APP_REGISTRY.md` first. Reuse existing apps/modules that fit.
- Saturated type (≥3 similar apps) → start from the closest template, swap only
  the domain logic. Don't rebuild what already exists.

## 4. Don't destroy
- Never overwrite or delete a working app. Make minimal diffs to existing code.
- Replacing/removing existing work needs the `allow-destroy` label (owner sign-off).

## 5. Get approval to reimagine
- Reinventing an existing app: **propose → owner approves → build.** Reuse alone
  does not need approval; a rewrite does.

## 6. Scope
- **One iteration per Block, done in full.** No "overhaul", no "30-day", no "long",
  no "big". Minimal scope, complete. Just build it.
- **Complex WRs may ship as multiple Blocks** — one PR per Block — **only when**
  the WR is labeled `checkpoint-gated`. Each Block PR still satisfies rules #1–#5
  on its own (live URL, no scaffolding, reuse, no destroy, approved reimagining).
  The Grid is not done until every Block has shipped and been checkpoint-approved.
  See `docs/AGENTS.md` § Checkpoint-Gated Grids.

---

_Enforced by: No-Destroy Guard (#4), Completeness Gate (#2), App Registry (#3),
Approve-to-Reimagine gate (#5). Ship-to-market deploys + records the live URL (#1).
Checkpoint-gated Grids are currently a documented coordination convention, not a
workflow-enforced gate: use the `checkpoint-gated` label, the PR title convention
`checkpoint: block-N of N`, and an explicit owner signal (`checkpoint-approved`
label or `next` comment) on the previous Block before later Blocks start._
