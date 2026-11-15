# OPENCODE AGENT — a coding bot that lives entirely inside GitHub

**Status:** active standard
**Lives in:** `revvel-standards`
**Files:** `.github/workflows/opencode.yml`
**Added:** 2026-11-13 (owner request: "i want to use it in github")

---

## What this is (read this first when you've forgotten everything)

Roo-Code only exists as a VS Code extension — it **cannot** run on GitHub's servers.
OpenCode is the same style of coding agent but built for terminals and CI, so it
**can** run inside a GitHub Actions runner. This workflow is the piece that makes
"agent codes my WRs without my laptop" real:

```
you do one of three things                 what happens
─────────────────────────────────  ─────────────────────────────────────
comment "/opencode fix this"       OpenCode wakes up on a GitHub runner,
on an issue or PR                  reads the issue/PR, codes the change,
                                   pushes branch opencode/wr-<N>-…,
                                   opens a PR as github-actions[bot]
        ── or ──
add the label `opencode`           same thing, with the fleet conventions
to a WR issue                      baked into its instructions
        ── or ──
Actions tab -> opencode ->         runs your free-text prompt against
Run workflow with a prompt         the repo (no issue context)
```

You review the PR and merge it yourself. The bot never merges.

Everything runs on the **fleet OpenRouter key** (`OPENROUTER_API_KEY`, already a
secret on this repo) with the model `openrouter/deepseek/deepseek-chat-v3-0324` —
deliberately cheap. Change the `model:` line in the workflow to anything else on
OpenRouter (e.g. `openrouter/anthropic/claude-sonnet-4-5` for hard tasks).

---

## The three agents on the fleet now — which one do I use?

| Label / trigger | Agent | Where it runs | Your involvement | Cost |
|---|---|---|---|---|
| **`opencode`** label or `/opencode` comment | OpenCode | GitHub runner | Review + merge the PR | Fleet OpenRouter key (DeepSeek default — cents) |
| **`manus`** label | Manus cloud | Manus's servers | Review + merge the PR | Manus credits |
| **`roo`** label | Roo-Code | YOUR VS Code | Paste the pack into Roo, run it, review PR | Your local OpenRouter key |

Rule of thumb: `opencode` for everyday WRs (cheapest, zero local effort),
`manus` for long/hairy tasks that need a persistent cloud environment,
`roo` when you want to watch and steer interactively.

---

## Daily usage — the entire operator manual

### Implement a WR without touching your laptop

1. Open the issue.
2. Add the label **`opencode`**.
3. Watch the Actions tab: job `opencode-label` runs (a few minutes).
4. A PR appears from `github-actions[bot]`, branch `opencode/wr-<N>-<slug>`,
   body contains `Closes #<N>`. Review, merge.

### Ask it something / steer it on an existing PR or issue

Comment on the issue or PR:

```
/opencode explain this issue
/opencode fix this
/oc add error handling in scripts/wr_dispatch.mjs
```

(`/oc` is the short alias. Natural language after the command is fine —
be specific.) On a PR's "Files" tab you can comment on specific lines with
`/oc <instruction>` and it receives the exact file/line context.

### One-off task with no issue

Actions tab → **opencode** → Run workflow → type the task
(e.g. "Add a test for scripts/wr_dispatch.mjs route detection").

---

## Security — the parts that matter

- **Who can trigger it:** this repo is PUBLIC, so without a guard anyone on the
  internet could comment `/opencode` and spend your OpenRouter key. The comment
  job only runs when the commenter's association is **OWNER, MEMBER, or
  COLLABORATOR**. Strangers' `/opencode` comments are ignored. The label trigger
  is inherently safe (only collaborators can label).
- **Which key it spends:** the fleet `OPENROUTER_API_KEY` secret — the one you
  capped at $5–10 (you did this, right? OpenRouter dashboard → Keys → credit
  limit). It is NOT your personal Roo key.
- **GitHub auth:** the workflow uses the built-in `GITHUB_TOKEN`
  (`use_github_token: true`), so installing the opencode-agent GitHub App is
  optional. Without the app, PRs and comments come from `github-actions[bot]`.
  If you later install the app (github.com/apps/opencode-agent) and remove the
  `use_github_token` line, they come from the app instead. Either works.
- **Session sharing is off** (`share: false`) — session transcripts are not
  published to opencode.ai.
- **No secrets in output:** the fleet conventions in its prompt forbid
  committing secrets; still, skim PR diffs like you would any contributor's.

## Conventions baked into every label-triggered run

- Branch `opencode/wr-<N>-<slug>`, one PR, body links `Closes #<N>`.
- Append-only files (LEDGER.md, CHANGELOG.md, decisions.jsonl): append, never rewrite.
- Tests for new behavior where a suite exists.
- No secrets in git.
- Ambiguous criteria → comment on the issue and stop.
- Never merges its own PR.

Comment-triggered runs (`/opencode …`) follow whatever you write in the comment —
the conventions above are only auto-injected for the label trigger.

## Scope and limits

- The workflow lives on **revvel-standards**; labels/comments dispatch there.
  To enable another repo: copy `.github/workflows/opencode.yml` to it and add
  the `OPENROUTER_API_KEY` secret there. One line summary: **workflows are per-repo.**
- Runner time comes out of GitHub Actions minutes (free tier: 2,000 min/month
  on private repos; unlimited on public repos like this one).
- The agent gets one shot per trigger. If its PR needs changes, comment
  `/oc <what to change>` **on that PR** — it will commit more to the same branch.
- It cannot merge, approve, or bypass branch protection — same rights as any
  bot contributor.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Commented `/opencode`, nothing happened | Commenter isn't owner/member/collaborator, or typo in command | Check the run filter in the Actions tab; re-comment yourself |
| Run fails immediately with auth error | `OPENROUTER_API_KEY` missing/invalid on this repo | Repo Settings → Secrets → Actions |
| Run fails with "insufficient credits" | Fleet key hit its OpenRouter cap | Raise the cap or wait for reset |
| PR opened but checks fail | Agent's code, not the plumbing | Comment `/oc fix the failing tests` on the PR |
| Want a smarter model for one task | Default is DeepSeek (cheap) | Edit `model:` in the workflow, or comment `/opencode` and re-run after editing |
| Runs appearing from issues you didn't label | Someone else with collaborator access labeled | Labels are permission-gated; review repo collaborators |

## Related docs

- `standards/WR_DISPATCHER.md` — the label router (`manus`/`roo`); sibling system.
- `standards/ROO_WR_WORKFLOW.md` — the local Roo-Code workflow.
- `config/connections.yml` — SSOT registry entry `opencode`.
