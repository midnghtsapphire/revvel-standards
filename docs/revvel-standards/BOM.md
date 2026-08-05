# Bill of Materials — Revvel Standards (This Repository)

**Last Updated:** April 2026
**Status:** Live — Active
**Project:** `midnghtsapphire/revvel-standards`
**Description:** The single source of truth for all MIDNGHTSAPPHIRE documentation, standards, agent skills, templates, and infrastructure maps. Used by every project and every AI agent in the ecosystem.

---

## Already Covered

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Version Control + Hosting | GitHub | $0 | Public repo |
| CI/CD | GitHub Actions | $0 | Free for public repos |
| Documentation | GitHub Pages (optional) | $0 | Can be enabled |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| RecurseML | Autonomous PR code review — enforce standards on all contributions | RecurseML | $250/yr | P0 | ❌ 14-day trial active — decision by 2026-04-28 |
| GitHub Copilot (Individual or Business) | AI coding agent for all repos | GitHub | $10–19/mo per seat | P0 | ❌ Verify active subscription |
| mabl | AI-powered automated testing (E2E, API, visual) triggered by CI/CD | mabl | Varies by plan | P1 | ❌ CLI + GitHub App setup needed — see setup below |
| Graphite (CLI + GitHub App, Free tier) | PR stacking + merge queue that adds granularity to the test harness and forwards stack metadata into the PR→OpenRouter first-line-of-sight comment. CLI is MIT-licensed FOSS; App is SaaS on the Free tier for public repos. | Graphite ([graphite.dev](https://graphite.dev)) | $0 (Free tier; re-confirm before provisioning) | P1 | 🟡 Planned — see [`docs/GRAPHITE_INTEGRATION.md`](../GRAPHITE_INTEGRATION.md) (rollout PR-10..PR-13) |
| GitKraken (Client + `gk` CLI + GitLens) | Contributor-side multi-repo GUI: Workspaces group every MIDNGHTSAPPHIRE repo, Launchpad unifies PRs/issues/CI across the org, visual conflict editor, and GitLens inline blame. Opt-in, read-side only — passively surfaces `openrouter` / `graphite` / `graphite:stacked` labels. `gk` CLI is MIT-licensed FOSS; Client is Free for public repos. | GitKraken ([gitkraken.com](https://www.gitkraken.com)) | $0 (Free tier for public repos; re-confirm before provisioning) | P2 | 🟡 Planned — see [`docs/GITKRAKEN_INTEGRATION.md`](../GITKRAKEN_INTEGRATION.md) (rollout PR-1..PR-4) |
| Antigravity (Individual, public preview) | Opt-in contributor-local agentic IDE (Google). Adds the missing **browser-agent** + **Agent Manager** + **Artifacts** surfaces next to the existing Copilot / OpenRouter / Graphite / GitKraken lanes. Commits flow into Graphite stacks and the OpenRouter hand-off unchanged. MCP client reads `skills/REGISTRY.md`; no CI role, no repo-level credential. | Google ([antigravity.google](https://antigravity.google)) | $0 (Individual, public preview; Pro ~$20/mo, Enterprise ~$250/mo+ — re-confirm before upgrading) | P2 | 🟡 Planned — see [`docs/ANTIGRAVITY_INTEGRATION.md`](../ANTIGRAVITY_INTEGRATION.md) (rollout PR-1..PR-4) |
| Automation Extensions (`automation-app-bot` + Make.com + n8n) | Operational / event-driven automation lane, downstream of the OpenRouter hand-off. `automation-app-bot` = MIT Probot GitHub App for lightweight repo-side handlers; Make.com = SaaS visual scenarios (default scheduler per the Marketing Automation Standard §5.4); n8n = FOSS self-hosted workflow automation. All credentials provisioned through `skills/vault-agent`; upstream bot fork gated by `skills/fork-audit-bot`. | `ammar-knowledge/automation-app-bot` (MIT) · [Make.com](https://www.make.com) · [n8n](https://n8n.io) | $0 (Make.com Free tier + self-hosted n8n on existing infra; re-confirm before upgrading) | P2 | 🟡 Planned — see [`docs/AUTOMATION_EXTENSIONS_INTEGRATION.md`](../AUTOMATION_EXTENSIONS_INTEGRATION.md) (rollout PR-1..PR-4) |

---

## No Infrastructure Cost

This repository has no runtime infrastructure — it is a documentation and standards repo.
All costs are tooling (RecurseML, Copilot) and developer tools.

---

## Total Estimated Annual Cost

| Category | Cost |
|---|---|
| RecurseML (after trial) | $250/yr |
| GitHub Copilot (1 seat) | ~$120–228/yr |
| **Total estimated annual** | **~$370–478/yr** |

---

## Notes

- RecurseML is the highest-priority purchase decision — 14-day trial expires 2026-04-28.
- Decision gate documented in `docs/DARE_LOG.md` (if it exists) or the `docs/_MASTER_BOM.md`.
- This repo is the source of all skill files, templates, and standards — high value, low cost.

---

## mabl Setup (Required Secrets and Variables)

The `.github/workflows/mabl.yml` workflow is already configured. It uses:
- **`npm install -g @mablhq/mabl-cli`** — installs the mabl CLI
- **GitHub App authentication** — same `APP_ID` + `APP_PRIVATE_KEY` used by all Revvel workflows

To activate it, add the following to **GitHub → Settings → Secrets and variables → Actions**:

### Repository Secrets

| Secret Name | How to Get It | Notes |
|---|---|---|
| `APP_ID` | Shared Revvel GitHub App | Already present if other automation workflows are active |
| `APP_PRIVATE_KEY` | Shared Revvel GitHub App | Already present if other automation workflows are active |
| `MABL_API_KEY` | [mabl API Settings](https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis) → Create "CI/CD Integration" key | Required — workflow skips if missing |

### Repository Variables

| Variable Name | How to Get It | Notes |
|---|---|---|
| `MABL_APPLICATION_ID` | [mabl API curl builder](https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis#api-docs-selector-dropdown-button) | Either application or environment ID is required |
| `MABL_ENVIRONMENT_ID` | [mabl API curl builder](https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/settings/apis#api-docs-selector-dropdown-button) | Either application or environment ID is required |

**Workspace:** `BsQPWJHcAYbKHlKpH1TWtA-w`  
**Dashboard:** <https://app.mabl.com/workspaces/BsQPWJHcAYbKHlKpH1TWtA-w/agents/tasks>
