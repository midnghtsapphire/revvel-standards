# GitHub auth matrix — Apps vs PAT vs Actions vs Grok connector

**Hard rule (unchanged):** agents draft WR + PR + code + docs; humans review and merge. No autonomous merge / launch / spend / filing.

## The confusion (short answer)

| What you see | What it actually is |
|---|---|
| MCP tools named `create_pull_request`, `pull_request_review_write`, `merge_pull_request` | **Tool schemas** exposed by the GitHub connector — capability *catalog*, not a grant |
| Grok connector token (`ghu_…`) | **GitHub App user-to-server** token with **installation permissions** granted at connect time |
| 403 `Resource not accessible by integration` | The **App installation** lacks that permission (or the OAuth grant was read-only) — tool presence does **not** equal write |
| `ship-quality.yml` posting PR reviews | **GitHub Actions** using `permissions: pull-requests: write` + `GITHUB_TOKEN` (or a repo secret PAT) — a **different actor** |

**Yes — create-PR / code-review tools are write APIs.** They still 403 until the connector is re-authorized with **Pull requests: Read and write** (and Contents write for branches/files). Actions can already write because `GITHUB_TOKEN` is scoped per-workflow inside the repo.

Probe evidence (2026-08-05):

- Pre-reconnect: create branch / review → **403**
- **Post-reconnect (same day):** create branch + `push_files` + comments → **OK** as `midnghtsapphire`
- `x-oauth-scopes:` header empty (normal for App tokens; scopes live on the installation, not classic OAuth)
- Live Actions: `ship-quality` posts reviews as `github-actions[bot]` using `gh pr review --comment`

## Three write paths (use deliberately)

```text
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  A. Grok connector  │     │  B. GitHub Actions   │     │  C. PAT / fine-     │
│  (MCP / ghu_)       │     │  (GITHUB_TOKEN +     │     │  grained token      │
│                     │     │   optional secrets)  │     │  (ADMIN_GITHUB_*)   │
└─────────┬───────────┘     └──────────┬───────────┘     └──────────┬──────────┘
          │                            │                            │
          ▼                            ▼                            ▼
   Interactive agent            Automated PR checks           Cross-repo / admin
   draft branch+PR+review       labels, reviews, artifacts    Projects v2, protection
   ─── WRITE restored ───       ─── ALREADY WRITES ───        ─── secret in repo ───
```

### A. Grok / GitHub App connector (interactive agent)

| | |
|---|---|
| Token form | `ghu_…` (user-to-server) |
| Who acts | You (`midnghtsapphire`) via Grok |
| Good for | Exploring repo, drafting PRs, reviewing when write is granted |
| Needs | Contents R/W, PRs R/W, Issues R/W, Metadata R; optional Projects + Workflows |
| Fix when 403 | User reconnects Connected apps → GitHub and grants those permissions |
| Never | Store this token in workflows or commit it |

### B. GitHub Actions (`GITHUB_TOKEN`)

| | |
|---|---|
| Token form | Ephemeral per job (`github.token`) |
| Who acts | `github-actions[bot]` (or the workflow identity) |
| Good for | **Automated PR checks**, sticky labels, comment reviews, artifacts, scorecards |
| Permissions | Declared in each workflow `permissions:` block — least privilege |
| Strength | Already works on `revvel-standards` (~189 workflow files on main) |
| Limits | Cannot open PRs from forks the same way; cannot change some protection settings; workflow files on default branch control what runs |

**This is the correct place for automated PR checks** — not the Grok connector.

### C. PAT / fine-grained token (repo secret)

| | |
|---|---|
| Token form | `ghp_` / `github_pat_…` stored as `ADMIN_GITHUB_TOKEN` (or similar) |
| Who acts | The user/bot that created the token |
| Used today | e.g. `pr-check-status.yml` prefers `secrets.ADMIN_GITHUB_TOKEN` then falls back to `GITHUB_TOKEN` |
| Good for | Projects v2 fields, cross-workflow triggers, elevating past default `GITHUB_TOKEN` limits |
| Risk | Long-lived; rotate; never log; never put in pack commits |

## What already runs as automated PR checks (live)

Do **not** re-invent blindly — compose with these:

| Workflow | Role | Write? |
|---|---|---|
| `ship-quality.yml` | Grounded `npm test` + optional AI opinion → PR **comment** review | PR write via `GITHUB_TOKEN` |
| `pr-check-status.yml` | On check_suite → `checks-passing` / `checks-failing` labels + sticky comment | Issues/PR write (PAT preferred) |
| `pr-auto-review.yml` / `ai-pr-review-openrouter.yml` | AI review lanes | PR write |
| `agent-scorecard.yml` | Score a PR by number; ledger commit; remediation issue | Contents + issues write |
| `wr-pr-creation.yml` | Openrouter/fleet WR → draft PR path | Contents + PR write |
| `auto-approve-clean-prs.yml` / `auto-merge.yml` | Policy automation — **keep human BNAT/Emergency gates** | Elevated — audit carefully |
| CircleCI (`lint-and-test`, `policy-check`, `validate-registries`) | External required-ish statuses | Statuses on commits |

## Pack additions (this pack)

| File | Purpose |
|---|---|
| `.github/workflows/label-allowlist.yml` | Fail (or warn) when labels outside allowlist are applied |
| `.github/workflows/formal-auto-wr.yml` | Daily formal → WR artifacts only; **no auto-merge** |
| `.github/workflows/pr-governance-checks.yml` | Single PR job: allowlist dry-run + formal schema presence + pack integrity |
| `.github/workflows/agent-scorecard-governance.yml` | **New name** so it does not clobber live `agent-scorecard.yml` |
| `standards/GITHUB_AUTH_TOKEN_MATRIX.md` | This document |

## Decision table — which path for which job

| Job | Prefer | Why |
|---|---|---|
| Automated PR checks (tests, labels, sticky status) | **Actions (B)** | Reliable, auditable, already fleet-scale |
| Draft a governance pack PR from chat | **Grok connector (A)** once write restored | Interactive, human-in-loop |
| Code review comment from chat | **Grok (A)** when PR write granted | Human-directed COMMENT/REQUEST_CHANGES only |
| Approve / merge | **Human only** (UI or your personal session) | Hard rule — agents never auto-merge |
| Project field updates | **Actions + PAT (C)** or Projects API with App install | Classic `GITHUB_TOKEN` often insufficient for Projects v2 |
| Disaster recovery of sandbox cognition | Files → Notion/Drive first; GH PR when write works | Resilience when connector is read-only |

## Reconnect checklist (Grok connector write)

1. Grok → Connected apps → GitHub → disconnect if stuck  
2. Reconnect and grant:
   - Contents: **Read and write**
   - Pull requests: **Read and write**
   - Issues: **Read and write**
   - Metadata: Read  
   Optional: Projects R/W, Workflows R/W, Checks R  
3. Reply `github reconnected` — agent re-probes create branch + COMMENT review  
4. If still 403: check org SSO authorization for the App; fine-grained install may be user-only vs org

## Anti-patterns

- Assuming MCP tool names mean the session can write  
- Putting `ghu_` / PATs into pack files or workflow YAML  
- Overwriting live `agent-scorecard.yml` with a weaker pack version  
- Enabling auto-merge for Emergency / outside-work / BNAT WR-4484 lanes  
- Using Actions to merge without human review (violates hard rule)

## Related

- [AUTOMATION_FIRST_STACK.md](./AUTOMATION_FIRST_STACK.md) — Actions > n8n/Make > agent lanes > Project fields > labels  
- [AGENT_REWARD_PRIVILEGE_SYSTEM.md](./AGENT_REWARD_PRIVILEGE_SYSTEM.md) — Intern–Emergency; Emergency human-only outside work  
- [FORMAL_VERIFY_AUTO_WR.md](./FORMAL_VERIFY_AUTO_WR.md) — fail opens WR, never merge  
