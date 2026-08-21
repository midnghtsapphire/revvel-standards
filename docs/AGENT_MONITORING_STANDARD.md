# Agent Monitoring Standard — verify what the agents actually did

When we delegate work to agents (the openrouter-coder lane, Jules, OpenHands,
Cursor, Augment, Copilot Coding Agent, etc.), we **must verify they did what
they were told** before merging — and we must capture any standards gaps
discovered while watching.

This standard codifies the loop so the same review happens consistently
whether the human or another agent is the supervisor.

> Cross-refs: `docs/DEFINITION_OF_DONE.md` (the bar) ·
> `docs/PROVENANCE_STANDARD.md` (name the agent + action that ran the work) ·
> `docs/API_LIMIT_AUTO_UPGRADE.md` (cost gates if an agent hits a paid wall) ·
> `docs/UPGRADE_LOG.md` (paid-tier decisions log).

---

## 1. Delegating a Work Request to an agent

1. File a GitHub issue with a `[WR]` title and the labels that route to the
   right lane:
   - `work-request` + `openrouter` + `wr:code` → openrouter-coder fires.
   - `work-request` + `openrouter` + `wr:research` → research-engine first;
     the owner adds `spec-approved` to advance to coder.
   - `bito-ai` / `weekly-research` / `deep-research` → research-engine variants.
   - `octopus-review` (auto-applied by Octopus on every issue it files) →
     translated by `.github/workflows/octopus-route.yml` into the standard
     vocabulary above (`work-request` + `wr:code` + `[WR]` title prefix).
     **D016 (2026-08-21) cut this lane's `issues:` trigger** — the hosted
     Octopus account is out of credits, so the translation ran on nothing.
     `workflow_dispatch` survives for manual re-translation, and the trigger
     is commented in place rather than deleted, so restoring it is a one-line
     change once credits exist. Note the `octopus-review` label itself is
     applied by the **GitHub App**, which D016 does not touch (#17872) — so
     the label may still arrive with nothing translating it. The dispatcher
     (`.github/workflows/agent-dispatcher.yml`) still routes
     `octopus-review`-labeled issues to openrouter, which remains the live
     belt-and-suspenders path for exactly that case.
   **Routing runs; the LLM branch may not.** `priority-router.yml`,
   `pdf-work-request-router.yml` and `wr-auto-classify.yml` each do two things:
   free work (routing, labelling, posting the router comment) and a paid
   OpenRouter call that refines the result. Since #17850 the paid half is
   gated on the repository variable `REVVEL_LLM_ALLOW_CLOUD` being exactly
   `"1"`; unset — the default — it is skipped and the free half still runs.
   So a WR **is** still routed and labelled with the gate shut. What it does
   not get is the model-assisted refinement, and the run logs say so
   explicitly rather than failing. Set the variable under Settings → Secrets
   and variables → Actions → Variables to re-enable it. Full map of which
   workflows are gated, and which reach `openrouter.ai` but cannot spend, is
   in `docs/LOCAL_LLM_SETUP.md`.

2. The body must have an **Acceptance criteria** section that's testable
   (per `docs/DEFINITION_OF_DONE.md`).
3. Provenance: name the source of the request (e.g., "Octopus Review audit
   2026-05-28") and link the tracking WR if one exists.

## 2. Monitoring the run

When an agent opens a PR for the issue:

1. **Subscribe to the PR** so its CI failures, review comments, and merges
   come through as events (matches the existing watchdog pattern).
2. **Match the diff against the Acceptance criteria** — did the agent do
   *what was asked* or scope-creep?
3. **Run the standards gates against the diff** (no need to wait for CI):
   - No-Destroy Guard — any existing app file deleted/rewritten without
     `allow-destroy`?
   - Completeness Gate — TODOs / `coming soon` / empty handlers / default
     boilerplate left behind?
   - SEO + A11y Guard — `<img>` missing alt, junk filenames, page missing
     meta description?
   - Reuse-first — did the agent pull what already exists in the App
     Registry (`docs/APP_REGISTRY.md`) or rebuild?
   - Provenance — does the PR description name the agent + action that
     produced it?
4. **Cost** — if the agent's run touched any paid SaaS, check
   `docs/UPGRADE_LOG.md` got an entry per `docs/API_LIMIT_AUTO_UPGRADE.md`.

## 3. What to do per outcome

| Outcome | Action |
| --- | --- |
| Agent did the work correctly and within scope | Merge (admin override if checks blocked by billing/secrets). Close source WR with reference. |
| Agent partially did the work | Comment on the PR with the unmet acceptance criteria, leave it open, do **not** silently fix it ourselves (we'd be hiding the agent's gap). |
| Agent overshot scope (scope-creep) | Comment requesting the unwanted changes be reverted; if they're useful, the agent files them as a **new** WR. |
| Agent broke a standard (destroy / scaffolding / missing alt / etc.) | Add the failing case to the relevant guard's test suite so it can't recur; comment on the PR; do **not** merge until fixed. |
| Agent surfaced a standards gap | Open a follow-up PR adding the rule to the relevant standard (so the gap is now enforced, not just noted). |

## 4. Adding to standards — the "agent surfaced a gap" loop

If an agent's PR exposes a missing rule (e.g., it shipped scaffolding because
no gate caught it, or it overwrote a file because No-Destroy didn't fire on
that path):

1. **Open a focused follow-up PR** that:
   - Adds the rule to the relevant standard doc (e.g., extends the protected
     paths in `scripts/no-destroy-guard.js`).
   - Adds a test that would have caught the failure.
   - Cites the originating agent PR + the audit/Octopus run that exposed it.
2. **Record the addition** in `docs/UPGRADE_LOG.md` if it's tooling-related,
   or in `docs/SECURITY_LOG.md` (or comparable) if it's a security gap.

This keeps the standards growing **from the inside** — driven by what
actually went wrong, not by what we feared might.

## 5. Provenance on every step

Per `docs/PROVENANCE_STANDARD.md`, every step in this loop names its actor +
action:

- The WR issue body: `Tracked by Octopus Review (octopus-review-bot) via the GitHub App, 2026-05-28`.
- The agent PR body: `Generated by OpenRouter coder (us) via .github/workflows/openrouter-coder.yml -> scripts/openrouter_coder.py [model: anthropic/claude-opus-4.7]`.
- The standards-gap follow-up PR: `Exposed by PR #N (originating WR #M) during the Octopus audit 2026-05-28 monitoring run`.

## 6. What this serves (the enterprise pitch angle)

A buyer asks: *"How do you supervise the AI agents?"*
- You point them at this standard.
- Plus `docs/PROVENANCE_STANDARD.md` (who/what ran the work).
- Plus the running `docs/UPGRADE_LOG.md` (cost decisions).
- Plus the agent PR history (every run is reviewed against the same
  checklist by the same person/agent).

That's a more credible "AI under control" story than most teams have.

---

## Current monitoring queue (rolling)

| Issue / PR | Source | Acceptance | Subscribed? | Notes |
| --- | --- | --- | --- | --- |
| #13987 | Octopus audit item #5 — OpenRouter doc caveat | banner above the example block in `docs/AGENT_AUTONOMY_PROTOCOLS.md` | will subscribe to the resulting PR when it opens | First test of the openrouter-coder loop end-to-end after the secrets cleanup |

Append rows as we delegate more items from #13978 (and other audits).
