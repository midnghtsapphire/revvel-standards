# WR DISPATCHER — label-routed Work Request execution

**Status:** active standard
**Lives in:** `revvel-standards`
**Files:** `.github/workflows/wr-dispatcher.yml` + `scripts/wr_dispatch.mjs`
**Added:** 2026-11-13 (owner request: "put OpenRouter key in, WRs start coding themselves")

---

## What this is (read this first when you've forgotten everything)

You have a fleet of GitHub repos. Work arrives as **issues called WRs** (Work Requests).
The dispatcher is the conveyor belt between a WR and an agent that codes it:

```
you add a label to an issue
        │
        ▼
┌───────────────────┐     manus label     ┌──────────────────────────┐
│  wr-dispatcher    │ ──────────────────► │ Manus cloud agent        │
│  (GitHub Action)  │                     │ codes it in the cloud,   │
│                   │                     │ opens a PR               │
│                   │ ──────────────────► │ Roo-Code prompt pack     │
└───────────────────┘      roo label      │ committed to the repo;   │
                                          │ you paste it into Roo    │
                                          │ locally, Roo codes it    │
                                          └──────────────────────────┘
```

- **`manus` label** → fully automatic. The workflow calls the Manus API with your
  `MANUS_API_KEY`. Manus works in the cloud and opens a PR. You only review and merge.
- **`roo` label** → semi-automatic. The workflow writes a ready-to-paste **prompt pack**
  (WR body + fleet rules + an OpenRouter-drafted implementation plan) to
  `wr/roo-queue/WR-<repo>-<N>.md` and comments on the issue with the path.
  You open that file, paste it into Roo-Code in VS Code, and Roo codes it on your machine
  using your own OpenRouter key.

Either way: **an agent never merges its own PR.** You (or TriageChief) always merge.

---

## The two OpenRouter keys — which is which

This is the part you'll mix up later, so:

| Key | Where it lives | What it's for | Spend cap |
|---|---|---|---|
| **Roo key** | Roo-Code settings in VS Code on your machine (never in git) | Every Roo task you run locally | Your choice |
| **Fleet key** | GitHub secret `OPENROUTER_API_KEY` on revvel-standards | The dispatcher uses it ONLY to draft the implementation plan inside a Roo prompt pack. Nothing else. | Set a low cap ($5–10) in OpenRouter dashboard |

They should be **two different keys** created in the OpenRouter dashboard. If one leaks
or a workflow runs away, you revoke that one key and the other keeps working.

Related secrets (all already set on revvel-standards, values never in git):

| Secret | Purpose |
|---|---|
| `MANUS_API_KEY` | Manus cloud agent API. Used by the dispatcher's `manus` route. |
| `OPENROUTER_API_KEY` | Fleet key above. |
| `GITHUB_TOKEN` | Built into Actions; comments + commits the prompt packs. |

---

## Daily usage — the entire operator manual

### Dispatch a WR to Manus (cloud, hands-off)

1. Open the issue.
2. Add the label **`manus`**.
3. Within ~a minute the workflow comments with the Manus task URL.
4. Manus opens a PR from branch `manus/wr-<N>-<slug>` when done. Review, merge.

### Dispatch a WR to Roo (local, your OpenRouter key)

1. Open the issue.
2. Add the label **`roo`**.
3. The workflow commits `wr/roo-queue/WR-<repo>-<N>.md` and comments the path.
4. Open that file, copy the whole thing, paste into Roo-Code's chat.
5. Roo follows the embedded conventions (branch name, one PR, append-only rules).
6. Review the PR it opens. Merge it yourself.

### Manual dispatch (label was already on, or you want to force a route)

Actions tab → **wr-dispatcher** → Run workflow → enter the issue number,
optionally force route `manus` or `roo`.

### Idempotency

If an issue already has a "WR dispatcher: dispatched" bot comment, the workflow exits
without double-dispatching. To re-dispatch, delete that comment first.

---

## Conventions enforced on every dispatched agent

These are baked into both the Manus prompt and every Roo pack:

- Branch: `<agent>/wr-<N>-<slug>` — one PR per WR, body contains `Closes #<N>`.
- Comment `Claiming — <agent>` and self-assign before coding.
- **Append-only files:** LEDGER.md, CHANGELOG.md, wr/memory/decisions.jsonl — append, never rewrite.
- New behavior ships with a test where the repo has a test suite.
- **No secrets in git. Ever.** Endpoints and URLs fine; tokens never.
- Ambiguous acceptance criteria → comment on the issue and stop. Do not guess.
- Forensic repos: golden/spec changes need a Verity delta-check comment before merge.
- The agent never merges its own PR.

---

## Scope and limits

- The workflow exists on **revvel-standards**, so labels dispatch WRs in **this repo**.
  To dispatch in another repo, copy `.github/workflows/wr-dispatcher.yml` and
  `scripts/wr_dispatch.mjs` there (and set `MANUS_API_KEY` / `OPENROUTER_API_KEY`
  on that repo if you want those routes). One-line summary: **labels are per-repo.**
- Roo prompt packs in `wr/roo-queue/` accumulate — safe to delete old ones anytime;
  they're generated artifacts, not source of truth.
- Manus API notes: the dispatcher posts to `https://api.manus.ai/v1/tasks` with the
  `API_KEY` header. If Manus changes their API shape, `scripts/wr_dispatch.mjs` is the
  only file to update; the workflow will fail loudly on the issue as a comment-free
  red run in the Actions tab.
- OpenRouter drafting uses `deepseek/deepseek-chat-v3-0324` (cheap). Change the model
  string in `wr_dispatch.mjs` if you want a better/worse drafter. If the key is missing
  or the call fails, the pack is still written — just without the plan section.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Label added, nothing happens | Workflow didn't trigger | Check Actions tab for `wr-dispatcher`; the `if` only fires on labels `manus`/`roo` |
| Run fails with "MANUS_API_KEY secret is not set" | Key only exists on revvel-standards | Add the secret to the repo you're dispatching in |
| Roo pack has "(OpenRouter key not set…)" | `OPENROUTER_API_KEY` missing on that repo | Same — add the secret, or hand-write the plan |
| "Already dispatched — exiting" in logs | Idempotency guard | Working as intended; delete the bot comment to re-run |
| Manus task created but no PR appears | Manus couldn't push | Check the Manus task URL — usually a repo-access problem on Manus's side |

## Related docs

- `standards/ROO_WR_WORKFLOW.md` — the manual Roo workflow this dispatcher automates.
- `scripts/export_wr_queue.py` — bulk-exports ALL open WRs as prompt packs (batch mode;
  the dispatcher is the per-issue label mode).
- `config/connections.yml` — SSOT registry; `manus` and `openrouter` entries there
  describe the same keys.
