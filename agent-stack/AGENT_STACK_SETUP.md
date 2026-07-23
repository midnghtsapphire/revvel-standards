# OpenRouter Agent Stack — Setup Checklist

> One-page reference for the full agent-routing stack defined under
> `.github/workflows/openrouter-auto-route.yml`,
> `.github/workflows/openhands-resolver.yml`,
> `.github/workflows/swe-agent.yml`,
> and `.github/workflows/augment-check.yml`.
>
> All four workflows are **fail-soft**: if their required secrets are not
> configured, they exit clean with a one-time issue/PR notice rather than
> blocking a merge or stalling a WR. You can enable them piecemeal; the
> stack works partially-configured.

---

## 1. The Stack at a Glance

```text
[WR] issue opened/edited
        │
        ▼
┌───────────────────────────────────┐
│  openrouter-auto-route.yml        │   reads Output Type → adds agent labels
│  (always-on, no secrets needed)   │
└───────────────────────────────────┘
        │
        ├──── label: fix-me  ──────►  openhands-resolver.yml  → opens PR
        │
        ├──── label: swe-fix ──────►  swe-agent.yml           → opens PR
        │
        ├──── label: noimosai ─────►  noimosai.yml            → marketing assets
        │
        ├──── label: bito-ai ──────►  bito-ai.yml             → PR review (CI)
        │
        └──── (PR opens) ──────────►  augment-check.yml       → reminder if missing
```

The auto-router **never modifies the WR body** — it only adds labels. Each
agent workflow is independent and can be disabled by deleting (or commenting
out the trigger of) the corresponding YAML file.

---

## 2. Output Type → Agent Routing Table

`openrouter-auto-route.yml` parses the `### Output Type` field from the
canonical `00-work-request.yml` form and applies labels per this table:

| Output Type                  | Labels applied                  | Result                                 |
|------------------------------|---------------------------------|----------------------------------------|
| `cli-product`                | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `api-product`                | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `mcp-product`                | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `production-app`             | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `desktop-tool`               | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `invention-flow`             | `swe-fix` + `bito-ai`           | SWE-Agent opens PR; BITO reviews       |
| `sellable-pdf`               | `noimosai` + `fix-me` + `bito-ai` | NoimosAI for content; OpenHands for fixes |
| `technical-documentation`    | `noimosai` + `fix-me` + `bito-ai` | NoimosAI for content; OpenHands for fixes |
| `project-management-doc`     | `noimosai` + `fix-me` + `bito-ai` | NoimosAI for content; OpenHands for fixes |
| `client-code-task`           | `fix-me` + `bito-ai`            | OpenHands resolver opens PR; BITO reviews |
| `internal-script-automation` | `fix-me` + `bito-ai`            | OpenHands resolver opens PR; BITO reviews |

`bito-ai` is **always** applied so every WR's resulting PR is BITO-reviewed.

If the Output Type doesn't match any row, only `bito-ai` is applied. The WR
still ships normally — it just won't auto-trigger an external resolver.

---

## 3. Required Secrets

Add these in **Settings → Secrets and variables → Actions** (or via the
`gh` CLI). The stack works partially with only some configured.

| Secret                  | Used by                 | Why                                              | Where to get it                          |
|-------------------------|-------------------------|--------------------------------------------------|------------------------------------------|
| `OPENROUTER_API_KEY`    | OpenHands, SWE-Agent    | Cheapest path — one key for both agents          | <https://openrouter.ai/settings/keys>      |
| `OPENHANDS_API_KEY`     | OpenHands               | Direct OpenHands SaaS account (alternative)      | <https://app.all-hands.dev/settings>       |
| `SWE_AGENT_API_KEY`     | SWE-Agent               | Direct provider key (Anthropic / OpenAI / etc.)  | Provider's API console                   |
| `BITO_ACCESS_KEY`       | BITO-AI                 | Persistent-memory code review                    | <https://bito.ai> → Settings → Access Keys |
| `GIT_ACCESS_TOKEN`      | BITO-AI                 | Classic GitHub PAT, `repo` scope                 | <https://github.com/settings/tokens>       |
| `NOIMOSAI_API_KEY`      | NoimosAI                | Marketing-content generator                      | <https://noimosai.com> → Settings → API    |
| `JULES_API_KEY`         | Jules WR Research       | Deep-research and PR rewrites                    | <https://jules.google.com/settings>        |

The recommended minimum to get autonomous code resolution working is just
`OPENROUTER_API_KEY` — it powers both OpenHands and SWE-Agent.

---

## 4. Optional Repository Variables

Set in **Settings → Secrets and variables → Actions → Variables**.

| Variable                | Default                          | Purpose                                  |
|-------------------------|----------------------------------|------------------------------------------|
| `OPENHANDS_MODEL`       | `anthropic/claude-sonnet-4.5`    | Override the OpenHands resolver's model  |
| `SWE_AGENT_MODEL`       | `anthropic/claude-sonnet-4.5`    | Override SWE-Agent's model               |

---

## 5. Required Labels

The auto-router applies these labels. Create them once in **Settings →
Labels** if they don't already exist (or let the first auto-route run
log a warning and create them manually).

| Label                  | Color   | Description                                   |
|------------------------|---------|-----------------------------------------------|
| `fix-me`               | `#0e8a16` | Hand to OpenHands resolver                  |
| `swe-fix`              | `#1d76db` | Hand to SWE-Agent                           |
| `bito-ai`              | `#fbca04` | Run BITO-AI code review on the PR           |
| `noimosai`             | `#5319e7` | Hand to NoimosAI for marketing content      |
| `credentials-missing`  | `#d93f0b` | Set when an agent can't run due to no creds |

---

## 6. Augment Code App (optional)

`augment-check.yml` is a **reminder, not a requirement**. If the Augment
Code GitHub App is installed on this repo, the workflow detects it and
does nothing. If it isn't, the workflow posts ONE comment per PR with
the install link.

To install: <https://github.com/apps/augment-code> → Install → select
`${{ github.repository_owner }}` → enable for this repo.

To disable the reminder entirely: delete `.github/workflows/augment-check.yml`.

---

## 7. Verifying End-to-End

1. **Auto-router** — open a `[WR]` issue with `Output Type = cli-product`. Within ~10 seconds the issue should pick up `swe-fix` + `bito-ai` labels. The auto-router's run summary will show the parsed Output Type and applied labels.
2. **OpenHands resolver** — apply `fix-me` to any open issue. Within 30 seconds the workflow runs. If creds are missing, you'll get a setup-needed comment + `credentials-missing` label. If creds are present, you'll get a PR within ~10 minutes.
3. **SWE-Agent** — same as above but with `swe-fix`.
4. **Augment-check** — open any non-draft PR. Within ~2 minutes you'll see either Augment's auto-comment (if installed) or the install reminder (if not).

---

## 8. Failure Modes & Recovery

| Symptom                                              | Cause                                          | Fix                                                                          |
|------------------------------------------------------|-----------------------------------------------|-----------------------------------------------------------------------------|
| Auto-router doesn't apply labels                     | Output Type field missing or label mismatch    | Check the issue body has `### Output Type` heading; use canonical form       |
| Resolver workflow runs but no PR is created          | Model error or repo state issue                | Check the run logs; resolver runs `continue-on-error: true` so won't block   |
| `credentials-missing` label appears on every issue   | Required secrets not configured                | Add at least `OPENROUTER_API_KEY` per Section 3                              |
| Augment reminder fires even though Augment is installed | Detection pattern changed upstream          | Update Augment detection patterns in `augment-check.yml:Check for Augment marker` step |
| Two agents try to fix the same issue at once         | Both `fix-me` and `swe-fix` applied            | Pick one — the auto-router never applies both for the same Output Type      |

---

## 9. Disabling the Stack

To disable any single agent: comment out the `on:` triggers in the
corresponding YAML, OR delete the file.

To disable the entire stack: remove the four files listed at the top of
this doc and any associated labels.

The auto-router has zero side effects beyond label application — removing
it leaves your existing WR/PR pipeline (`wr-pr-creation.yml`,
`wr-auto-classify.yml`, etc.) entirely intact.
