# Docs Freshness Standard — when you add X, update Y in the same PR

Code and automation get added constantly. Docs lag. The result: a new agent,
tool, secret, or workflow lands without showing up in the catalog that's
supposed to tell readers (humans + agents) it exists.

This standard pins down **which doc(s) must be touched in the same PR**
whenever a specific kind of addition lands, plus a soft-enforcement linter
that warns when the pairing is broken.

> Cross-refs:
> `docs/PROVENANCE_STANDARD.md` (how to name what you added) ·
> `docs/AGENT_MONITORING_STANDARD.md` (the supervision loop) ·
> `docs/THIRD_PARTY_ACTION_AUDIT.md` (the abandonment guard) ·
> `.github/workflows/docs-freshness-check.yml` (the linter).

---

## 1. The pairing rule

Whenever a PR touches the **left column**, the **right column** must also be
touched in the same PR (or the PR description must explain why not).

| If you change… | …also update |
| --- | --- |
| Add a new workflow under `.github/workflows/*.yml` | `docs/SYSTEM_MAP.md` (or equivalent index) + workflow header comment per `docs/PROVENANCE_STANDARD.md` |
| Add a new **agent** / reviewer / persona | `.github/workflows/ready-for-review.yml` roster + `docs/AGENT_MONITORING_STANDARD.md` §1 routing lane |
| Add a new **persona** to `scripts/openrouter-personas.js` | `tests/openrouter-personas.test.js` (covers the new handle) + the ready-for-review roster |
| Add a new **paid tool** (subscription, paid tier, API with usage cost) | `docs/TOOL_COST_INDEX.md` (publisher + current cost + next-tier cost) + `docs/UPGRADE_LOG.md` (the decision entry per `docs/API_LIMIT_AUTO_UPGRADE.md`) |
| Add a new **free tool / SaaS** | `docs/PROVENANCE_STANDARD.md` quick reference table |
| Add a new **secret** to GitHub Actions / Doppler | `docs/PROVENANCE_STANDARD.md` (which workflow uses it) + the consuming workflow's header comment |
| Add a new **third-party action** (`uses: owner/repo@…`) | The owner is auto-classified by `scripts/audit-third-party-actions.sh`; if it's a new single-author author, consider pre-emptively pinning to a commit SHA |
| Add a new **standard** under `docs/*_STANDARD.md` | This file's index below + cross-ref it from at least one consumer doc |
| Remove / silence / pause a tool | The tool's previous entry stays in place (per "comment-don't-delete"); add a status note (`SILENCED 2026-…`, `PAUSED 2026-…`) and link the PR |
| Change a **routing label** (`wr:code`, `octopus-review`, etc.) | `docs/AGENT_MONITORING_STANDARD.md` + every dispatcher / router workflow that case-matches on it |
| Add a new **shape** (web / api / cli / mobile / pdf / sellable-pdf) | `docs/AUTOMATED_PRODUCT_PIPELINE.md` Step 5 + `standards/shapes/<shape>.md` |

The list is the floor, not the ceiling. If a change has obvious downstream
docs not listed here, update those too.

## 2. The "why not" escape hatch

Sometimes the pairing genuinely doesn't apply — a typo fix on a workflow
header doesn't need a doc update. The linter is **soft-warn only**; it
never blocks merge. To suppress its noise, add one of these to the PR body:

```text
docs-freshness: typo / formatting only — no behavioral change
docs-freshness: deferred to PR #N — explanation
docs-freshness: covered by docs/<file>.md (already up to date)
```

The linter looks for any `docs-freshness:` marker and treats it as
"reviewed and intentional." No marker + no doc change = warning posted.

## 3. The catalog (source of truth for what exists)

| Catalog doc | Lists | Authoritative when… |
| --- | --- | --- |
| `docs/PROVENANCE_STANDARD.md` (Quick reference table) | Every named tool + publisher + package | Discussing what we use |
| `docs/TOOL_COST_INDEX.md` | Every paid tool + current tier + next tier cost | Cost / budget questions |
| `docs/TESTING_STACK.md` | Every active testing tool | Test infra questions |
| `docs/AGENT_MONITORING_STANDARD.md` §1 | Every WR routing lane | Routing / dispatching |
| `.github/workflows/ready-for-review.yml` roster table | Every PR reviewer (bot + persona) | PR review questions |
| `scripts/openrouter-personas.js` PERSONA_REGISTRY | Every named persona + instructions | Persona behavior questions |
| `docs/THIRD_PARTY_ACTION_AUDIT.md` tier lists | Trusted vs multi-author vs single-author action owners | Action security / freshness |

When in doubt about which catalog to update, check the linter's per-rule
mapping in `.github/workflows/docs-freshness-check.yml`.

## 4. Soft-enforcement linter

`.github/workflows/docs-freshness-check.yml` runs on `pull_request:`
opened/synchronize. It:

1. Diffs the PR against the base branch.
2. For each rule in §1, checks: did the left-hand change happen without a
   matching right-hand update?
3. If yes, posts a single PR comment listing the unfulfilled pairings.
4. Never sets a failure status — it's a warning, not a gate.

The comment is updated in place on subsequent pushes (no spam).

## 5. Why this matters

When docs drift behind reality:
- New contributors (human or agent) build the wrong mental model.
- Audits ("what's the agent fleet?") miss tools that exist.
- Cost reviews under-count.
- The enterprise pitch — "we know what's under the hood and we can prove
  it" — gets harder to defend.

Pairing the doc update with the code change is the cheapest place to fix
this — the author already has the context loaded.

## 6. Originating cases

| PR | Code change | Doc that was lagging | Caught by |
| --- | --- | --- | --- |
| #14068 | Added `octopus-route.yml`, `octopus-cli.yml`, `OCTOPUS_TOKEN`, four personas to roster | `PROVENANCE_STANDARD.md`, `AGENT_MONITORING_STANDARD.md` §1, `ready-for-review.yml` roster | Manual review noticed mid-PR |
| #13967 | Paused Mabl, added Keploy/Cypress/Applitools/Postman | `TESTING_STACK.md`, `TOOL_COST_INDEX.md`, `UPGRADE_LOG.md` | Got into the PR but only after explicit prompting |
| #13975 | Created `PROVENANCE_STANDARD.md` | `TOOL_COST_INDEX.md` Publisher column | Deferred to follow-up; this rule would have caught it inline |

Each of these would have surfaced as a docs-freshness warning the moment
the PR opened, instead of needing a reviewer to notice.
