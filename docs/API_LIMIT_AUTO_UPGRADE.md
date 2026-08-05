# API Limit → Auto-Upgrade Decision Standard

When any SaaS/API tool we use (Keploy, OpenRouter, Jules, Mabl, Vercel,
DigitalOcean, etc.) hits a quota / rate limit / "upgrade required" wall, this
standard decides **what the pipeline does next** — without making someone hunt
the dashboard.

The same decision tree pitches well to enterprise/SaaS buyers ("here's how we
govern tool spend across the fleet"), so every decision the system makes against
this standard is logged into `docs/UPGRADE_LOG.md` so we can show the reasoning
on demand.

> Per the standards convention: **nothing is dropped — only commented**. When a
> tool is downgraded or paused, the old config stays in-file with a header
> explaining what we tried and what changed, so future-us can re-enable in one
> edit and future-buyers can audit the decision.

---

## The decision tree

Triggered when a workflow fails with a recognisable limit error
(`rate limit`, `quota exceeded`, `upgrade required`, `429`, `payment required`).

### Step 1 — find the upgrade cost
Look up the next-tier cost from `docs/TOOL_COST_INDEX.md` (see template below).
If the tool isn't in the index, file a **research WR** to populate it before
deciding.

### Step 2 — apply the cost gate

| Next-tier cost | Path | Owner approval? |
| --- | --- | --- |
| **≤ $40 / month** | **Auto-implement** the upgrade (file an upgrade WR labeled `auto-upgrade-approved`; the openrouter-coder pipeline executes via the provider's API where possible, or files an actionable instruction issue if the upgrade requires a UI click). | **Not required** — the standard pre-approves spend below this threshold. Still logged. |
| **$41 – $50 / month** | **Auto-implement** the upgrade, but file the WR labeled `owner-approval-recommended` so it shows up in the daily digest. Pipeline proceeds unless owner adds `block-upgrade` within 24h. | Soft (default-yes). |
| **$51 – $99 / month** | **Research first.** Pipeline files a `[WR] Upgrade evaluation: <tool> <next-tier>` via the research-engine. The Professor produces a sourced cost/benefit packet (utilization, alternatives, ROI, contract terms). Owner approves with `spec-approved`; only then upgrade proceeds. | **Required.** |
| **≥ $100 / month** | **Deep research + written justification.** Same as above plus: at least one named alternative considered, 30-day ROI projection, exit-cost analysis ("what does cancelling look like in 6 months?"). | **Required + signed off.** |

### Step 3 — record the decision
Every run writes one row to `docs/UPGRADE_LOG.md`:
`date | tool | trigger | next-tier cost | decision | link to WR/PR`.

---

## Hard rules (don't ever break these)

1. **Comment, don't delete.** When we downgrade or pause a tool, its config
   stays in the relevant workflow with a header explaining the change. See
   `mabl.yml` for the reference pattern.
2. **Never silently upgrade above $40/mo.** Anything in tier 3/4 must surface
   to the owner via an issue or daily digest *before* the spend lands.
3. **Free tier first.** If the free tier covers ≥ 80% of need, stay on free
   and budget the gap (e.g. queue jobs vs paying for headroom).
4. **Single source of truth for cost.** All numbers come from
   `docs/TOOL_COST_INDEX.md`. If a workflow needs to know a price, it reads
   from there, not from inline literals.
5. **Auditable for enterprise pitches.** `docs/UPGRADE_LOG.md` is the
   evidence trail. Don't garbage-collect it.

---

## What this serves (the enterprise pitch angle)

- A potential enterprise client asks: *"How do you govern your tool spend?"*
- You point them at this file + `docs/UPGRADE_LOG.md`.
- They see: tiered approval, free-tier-first, full audit trail, written
  justifications for every paid upgrade above $50/mo, alternatives considered.
- That's a more credible spend-control story than most early-stage companies
  have.

---

## Tools in scope (initial — extend as we add)

| Tool | Free tier sufficient? | Current cost | Next-tier cost | Decision band |
| --- | --- | --- | --- | --- |
| **Keploy** | yes (low volume) | $0 | est. $20–$40/seat | Tier 1 (auto-implement when hit) |
| **OpenRouter** | usage-priced | varies | n/a (no fixed tier) | Tracks `vars.WR_MODEL`; per-call budget cap separate |
| **Jules** | per Google's terms | per Google | n/a | Reviewed when limit hits |
| **Vercel** | yes (hobby) | $0 | $20/mo (Pro) | Tier 1 |
| **DigitalOcean** | usage-priced | varies | n/a | Budget cap separately |
| **Mabl** | n/a (PAUSED) | $0 | — | See mabl.yml header |
| **ImgBot** | yes (open-source) | $0 | n/a | Free indefinitely |
| **CodeRabbit** | per their tier | varies | per tier | Review when hit |
| **Bito** | per their tier | varies | per tier | Review when hit |

Extend with `docs/TOOL_COST_INDEX.md` when adding a new SaaS to the pipeline.

---

## Implementation (planned next)

A small workflow (`api-limit-auto-upgrade.yml`) listens for workflow failures
with limit-error signatures, looks up the cost from `TOOL_COST_INDEX.md`, and
files the right kind of issue per Step 2. This standard governs the behaviour;
the workflow enforces it. Build is a follow-on — defining the standard first so
we don't build the wrong shape.
