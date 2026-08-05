# WR: Fleet Maintenance — midnghtsapphire/infrastructure

**Issue:** #14703
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-06-25
**Researcher:** GitHub Copilot Coding Agent
**WR Status:** ✅ Research Complete

---

<!-- fleet-maintenance:midnghtsapphire/infrastructure -->

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [x] **Deep market research** — infrastructure tooling, IaC landscape, DevOps standards
- [x] **BOM (Bill of Materials)** — ranked tool/standard list: which approach is best, what it costs, why one beats another
- [x] **Community chatter** — GitHub discussions, Reddit DevOps: what teams struggle with in infra repos
- [x] **Competitor analysis** — existing infra patterns (Terraform, Pulumi, CDK, Ansible) and gaps
- [x] **Skills Vault audit** — which skills from `skills/` apply; load them before executing
- [x] **Persona selection** — choose the right persona(s) for this WR
- [x] **Artifact engine map** — map every selected shape to the repo engine/standard or document the gap
- [x] **Agent self-healing journal** — institutionalize durable findings back into revvel-standards
- [ ] **Domain name strategy** — N/A: this is an internal infrastructure repo, not a public product
- [ ] **Revenue / monetization model** — N/A: infrastructure is cost-center, not revenue-generating directly
- [ ] **A/B test hypothesis** — N/A: no UI/UX component
- [ ] **Affiliate / reseller program** — N/A: not a distribution product

---

## Executive Summary

The target repository `midnghtsapphire/infrastructure` returned HTTP 404 at research time — it does not exist as a public GitHub repository. This WR documents the skills, personas, and standards from revvel-standards that are most applicable to standing up and maintaining an infrastructure repository in the MIDNGHTSAPPHIRE fleet. The recommended operating model is **incubate first in `products/infrastructure/` inside the revvel-standards monorepo, then extract to `github.com/midnghtsapphire/infrastructure` later if it becomes a sellable or reusable standalone asset**. That preserves the existing review jury, skills context, and monitoring on day one while keeping the folder structure split-ready for a future standalone repo.

---

## Repository Metadata

| Property | Value |
| --- | --- |
| Target repo | `midnghtsapphire/infrastructure` |
| HTTP status at research time | **404 — does not exist** |
| Recommended path | Bootstrap as `products/infrastructure/` in revvel-standards monorepo |
| Future extraction target | `github.com/midnghtsapphire/infrastructure` once the shape stabilizes |
| Primary language | HCL / YAML / Shell |
| Proposed dev port | 3009 (next available after CLI Engine on 3008) |

---

## 🧠 Skills Vault — Applicable Skills

The following skills from `skills/` in revvel-standards are directly applicable to this fleet-maintenance WR. Any agent picking up this work **must load these skills** before executing.

### Mandatory Session Start (per `SKILLS_INDEX.yml`)

| Skill | Path | Why it applies |
| --- | --- | --- |
| `system-state` | `skills/system-state/` | Check production state and session handoff before starting |
| `mvi-contract` | `skills/mvi-contract/` | Define scope of the infra work before coding anything |
| `model-router` | `skills/model-router/` | Select the right model (Sonnet vs Opus) for cost efficiency |
| `context-management` | `skills/context-management/` | Session token limits — infra files can be large |

### Mandatory Session End

| Skill | Path | Why it applies |
| --- | --- | --- |
| `wrap-up` | `skills/wrap-up/` | Publish artifacts, tag releases, update CHANGELOG |
| `memory-pruning` | `skills/memory-pruning/` | Keep session logs clean after potentially large IaC runs |

### Fleet Maintenance Core Skills

| Skill | Path | Trigger | Why it applies here |
| --- | --- | --- | --- |
| **`self-healer`** | `skills/self-healer/` | `self-healer, stuck queue, parked WR` | Recover from stranded triage/deploy jobs that are common in infra work |
| **`ralph-loop`** | `skills/ralph-loop/` | `CI failed, self-healing, auto-fix` | Auto-fix CI failures on infra PRs via @copilot loop |
| **`security`** | `skills/security/` | Any work touching secrets, API keys, auth | IaC always touches secrets; OWASP P0 rules apply |
| **`vault-agent`** | `skills/vault-agent/` | `vault, credential, api key, provision` | Provision all infra secrets via HashiCorp Vault — never hardcode |
| **`patch-agent`** | `skills/patch-agent/` | `CVE, advisory, dependency patch` | Apply minimal safe version bumps for infra tooling deps |
| **`deployment`** | `skills/deployment/` | `deploy, DigitalOcean, PM2, CI/CD` | Deploy Agent 10-step checklist applies to every infra change |
| **`grc-compliance`** | `skills/grc-compliance/` | `ISO 27001, SOC 2, NIST CSF` | Infrastructure is in scope for every compliance framework |
| **`auto-documentation`** | `skills/auto-documentation/` | `docs, changelog, API reference` | Every infra change must produce a CHANGELOG entry and DEPLOY_REPORT |
| **`code-review`** | `skills/code-review/` | `PR review, quality gates` | Full review jury: Bito AI → OpenRouter Claude Sonnet 4 → Coderabbit |
| **`malama`** | `skills/malama/` | `autonomous loop, self-evolving agent` | Self-healing constitution for running the full infra pipeline unattended |
| **`dare-log`** | `skills/dare-log/` | `decision tracking, RAID` | Track decisions, risks, and issues (DARE/RAID) for infra changes |
| **`parallel-development`** | `skills/parallel-development/` | `multiple agents simultaneously` | Run IaC plan + security scan + docs generation in parallel |
| **`using-git-worktrees`** | `skills/using-git-worktrees/` | `git worktrees, parallel branches` | Run parallel infra branches (staging vs prod) without conflicts |
| **`openrouter-swarms`** | `skills/openrouter-swarms/` | `multi-agent, swarms` | Coordinate multiple infra agents via OpenRouter |
| **`project-router`** | `skills/project-router/` | `project type detection` | Auto-detect this is an infra/IaC project and load the right standard |
| **`concurrent-development`** | `skills/concurrent-development/` | `merging, conflict resolution` | Merge staging→main infra changes without conflicts |

### Recommended for This Specific WR

| Skill | Path | Specific need |
| --- | --- | --- |
| **`gbrain`** | `skills/gbrain/` | Store infra topology and config patterns in persistent memory across sessions |
| **`todo-breakdown`** | `skills/todo-breakdown/` | Break "set up infrastructure repo" into atomic TODOs before starting |
| **`truthslayer-audit`** | `skills/truthslayer-audit/` | Score the new infra repo against Revvel standards before first merge |
| **`openclaw-self-eval`** | `skills/openclaw-self-eval/` | Pre-flight readiness audit before any agent executes infra changes |
| **`bito-ai`** | `skills/bito-ai/` | Persistent-memory code review with full repo context on every infra PR |

---

## 🎭 Personas

The following **Persona Engine** personas (`skills/persona-engine/`) are the right fit for each phase of this work. All six are **fully integrated** in `skills/persona-engine/persona-engine.skill.yml` with greeting, farewell, voice, category mapping, and termination triggers. The Persona Engine itself is triggered by: `persona`, `character`, `guide`, `"who are you"`, `"activate persona"`, `"start persona"`, `ephemeral identity`, `persona engine`, `skill guide`.

| Phase | Persona | Emoji | Voice | Activation trigger | Why |
| --- | --- | --- | --- | --- | --- |
| **Research & discovery** | **Scout** | 🔭 | Curious, energetic | `scout`, `research`, `brainstorm` | Mapping what infra tooling exists and what the repo needs |
| **Security & secrets setup** | **Vault** | 🔐 | Serious, cautious, thorough | `vault`, `credential`, `security`, `secrets` | Credentials, secrets, and IAM — zero tolerance for shortcuts |
| **PR review & CI gates** | **Aria** | 🎯 | Direct, precise, kind | `aria`, `code review`, `PR review` | Code review of HCL/YAML changes against Revvel standards |
| **Documentation & reports** | **Sage** | 📚 | Patient, organized, clear | `sage`, `documentation`, `changelog` | Writing CHANGELOG, DEPLOY_REPORT, and architecture diagrams |
| **Deployment & rollout** | **Nexus** | 🚀 | Calm under pressure, systematic | `nexus`, `deploy`, `CI/CD`, `ship` | Deploy Agent checklist and live verification |
| **Skill/template building** | **Forge** | 🔨 | Creative, hands-on, encouraging | `forge`, `build skill`, `scaffold` | If new skills or templates need to be scaffolded from this work |

**To activate a persona:** load `skills/persona-engine/SKILL.md` (or `skills/persona-engine/persona-engine.skill.yml`) and reference the persona name in the session prompt. All personas are ephemeral — session-scoped, terminate on `"task complete"`, `"wrap up"`, or `"all done"`.

---

## 🎛 Persona Trigger & Capability Reference

### Engine-wide triggers and termination behavior

| Layer | Trigger / rule | Effect |
| --- | --- | --- |
| Persona Engine activation | `persona`, `character`, `guide`, `who are you`, `greeting`, `activate persona`, `start persona`, `ephemeral identity`, `persona engine`, `skill guide` | Loads the Persona Engine and picks the best persona for the session |
| Persona fallback | No explicit persona requested | Defaults to **Scout** per `persona-engine.skill.yml` |
| Persona termination | `review complete`, `done reviewing`, `wrap up`, `close session`, `task complete`, `all done`, `finished` | Persona signs off, summarizes, and dissolves |
| Persona safety rule | User confusion or capability mismatch | Break character, help directly, then resume if appropriate |

### Built-in persona profiles

| Persona | Role / categories | Persona-specific activation keywords | What it does in practice | Infrastructure use | Revvel Hail use |
| --- | --- | --- | --- | --- | --- |
| **Scout** 🔭 | Research / brainstorming | `scout`, `research`, `brainstorm` | Surveys options, maps the landscape, frames first questions, and finds precedent before implementation | Compare OpenTofu vs Pulumi, find remote-state patterns, review competitor infra setups | Research hail-data providers, insurance/compliance APIs, and market gaps |
| **Vault** 🔐 | Security & credential management | `vault`, `credential`, `security`, `secrets` | Drives secrets handling, IAM review, safe provisioning, and no-hardcode enforcement | Provision cloud creds, state backend tokens, CI secrets, Vault paths | Protect weather API keys, webhook secrets, Stripe/auth tokens |
| **Aria** 🎯 | Code quality / security / testing | `aria`, `code review`, `PR review` | Reviews diffs, flags logic/security gaps, and tightens test expectations | Review HCL/YAML/workflow changes and CI guardrails | Review billing, lead-routing, severe-weather alert logic |
| **Sage** 📚 | Documentation / content | `sage`, `documentation`, `changelog` | Turns rough notes into clean docs, runbooks, changelogs, and handoff material | Write infra runbooks, architecture docs, deploy notes, incident postmortems | Produce operator docs, onboarding docs, claims/alert runbooks |
| **Nexus** 🚀 | DevOps & deployment | `nexus`, `deploy`, `CI/CD`, `ship` | Runs the deploy checklist, verifies rollout, and keeps changes systematic under pressure | Handle plan/apply workflows, rollout order, smoke checks, rollback notes | Ship app deploys, alerting pipelines, cron jobs, and uptime verification |
| **Forge** 🔨 | Skill building / scaffolding | `forge`, `build skill`, `scaffold` | Packages reusable templates, codifies patterns, and turns repeatable work into skills | Create reusable infra templates, bootstrap scripts, and team standards | Create hail-specific automations, templates, and reusable issue/PR flows |

**Revvel Hail note:** no public revvel-hail repository appeared in this workspace or GitHub search during this pass, so the mapping above is a transfer pattern rather than a repo-specific audit. The same personas still fit cleanly if Revvel Hail is a weather/alerts, insurance, or field-ops app.

---

## Step 1 — Repository Discovery

### Status

`midnghtsapphire/infrastructure` returned **HTTP 404** at research time (2026-06-25). The repository does not exist as a public GitHub repo. Two valid interpretations exist:

1. **Private repo** — the infrastructure repo exists but is private. In this case, the fleet-maintenance tasks are still valid (add review workflows, refresh docs, add security scanning).
2. **Does not exist yet** — bootstrap it as a monorepo product (`products/infrastructure/`) following the `hvac-calc-service` / `cli-engine` pattern.

Per the WR Instruction Resilience principle, the agent must not halt on a 404 — it should proceed with option 2 (bootstrap) unless a private repo access token is available.

### Bootstrap Location Decision

| | Option A — Standalone repo | Option B — Monorepo product |
| --- | --- | --- |
| **Location** | `github.com/midnghtsapphire/infrastructure` | `revvel-standards/products/infrastructure/` |
| **Review workflows** | Must be duplicated into the new repo | Inherited from root `.github/workflows/` |
| **Secret provisioning** | Separate GitHub Actions secrets | Shared `scripts/provision-repo-secrets.sh` |
| **Skill context** | Must copy / reference `skills/` manually | `skills/` is already in path |
| **CI gate** | Independent CircleCI / Actions config | Inherits root CircleCI `lint-and-test` job |
| **Infrastructure changes block other products** | No | Yes (monorepo trade-off) |
| **Precedent** | No existing example | `hvac-calc-service`, `cli-engine`, `creator-payout-tracker` |
| **Sell-alone / reuse later** | Native fit | Good if kept extraction-ready from the start |

**Recommended: Option B now, Option A later if needed** — incubate in `products/infrastructure/` first, but keep the directory self-contained so it can be extracted into `midnghtsapphire/infrastructure` later without redesign. That satisfies both goals: immediate use inside revvel-standards and a clean future path to a sellable or reusable standalone repo.

### Recommended Bootstrap Structure

```text
products/
└── infrastructure/
    ├── README.md
    ├── CHANGELOG.md
    ├── AGENTS.md               # Inherits from root; add infra-specific rules
    ├── opentofu/               # IaC definitions (preferred over Terraform OSS)
    ├── ansible/                # Optional config-management layer
    ├── scripts/
    │   ├── provision-secrets.sh  # Calls Vault Agent pattern
    │   └── bootstrap.sh
    └── docs/
        ├── ARCHITECTURE.md
        └── RUNBOOK.md

.github/
└── workflows/
    ├── ai-pr-review-openrouter.yml   # root workflow, add paths filter for products/infrastructure/**
    ├── bito-ai.yml
    ├── codeql.yml
    ├── docs-freshness-check.yml
    ├── ralph-loop.yml
    └── semgrep.yml
```

**Important correction:** GitHub Actions only reads workflows from the repository-root `.github/workflows/`. A nested `products/infrastructure/.github/workflows/` folder would be documentation-only and would not execute. For the monorepo shape, keep the runnable workflows at the root and scope them to `products/infrastructure/**`.

---

## Step 2 — Deep Research Findings

### IaC Tooling Landscape (BOM)

| Tool | Cost | Best for | Verdict for MIDNGHTSAPPHIRE fleet |
| --- | --- | --- | --- |
| **Terraform (OpenTofu)** | Free (OpenTofu OSS) | Multi-cloud, mature ecosystem, HCL | ✅ **Recommended** — widest provider support, Copilot can generate HCL |
| **Pulumi** | Free (OSS) / $50/mo (Cloud) | TypeScript/Python IaC (code-first) | ✅ Good if team prefers TS; higher setup cost |
| **AWS CDK** | Free | AWS-only | ❌ Vendor lock-in; not multi-cloud |
| **Ansible** | Free | Config management, not provisioning | ✅ Complement to Terraform for OS-level config |
| **GitHub Actions native** | Included in repo | CI/CD workflows already in fleet | ✅ Already in use — extend rather than replace |

**Recommendation:** OpenTofu (Terraform fork) + Ansible + existing GitHub Actions. No new paid tools needed.

### Security Standards Applicable to Infrastructure

From `skills/security/SKILL.md` and `skills/grc-compliance/SKILL.md`:

- **Secret management** — All infra secrets (cloud credentials, API keys, DB URLs) must go through HashiCorp Vault via `skills/vault-agent/`. No `.tfvars` with secrets committed.
- **NIST CSF 2.0** — Infrastructure changes are in scope. Apply Identify → Protect → Detect → Respond → Recover framework.
- **SOC 2 Type II** — If any revvel product handles PII, the infra layer must implement audit logging, access control, and change management evidence.
- **Dependency scanning** — `scripts/patch-agent.js` (driven by `data/security-advisories.json`) must run against any `package.json` in infra tooling.

### Community Chatter Findings

- **Reddit r/devops, r/terraform:** Top pain point is state file management (remote state in S3/GCS with locking via DynamoDB). Always use remote state — local `.tfstate` in git is a known footgun.
- **GitHub discussions:** Teams struggle most with "drift" — infra state diverging from committed code. The `malama` skill's self-healing loop directly addresses this for the CI layer.
- **TrustPilot/forums on IaC tools:** Terraform's licensing change (BSL) in 2023 caused wide concern — OpenTofu (CNCF fork, MPL 2.0) is the community-endorsed free alternative.

### Review Workflows Missing from Fleet

The full jury required by revvel-standards (`docs/AGENTS.md`) for any target repo:

| Workflow | File | Status for `infrastructure` |
| --- | --- | --- |
| OpenRouter AI PR Review | `ai-pr-review-openrouter.yml` | ❌ Missing as a standalone repo; ✅ already present at revvel-standards root |
| Jules deep research | `jules-invoke.yml` | ❌ Missing as a standalone repo |
| Semgrep SAST | `semgrep.yml` | ❌ Missing as a standalone repo; ✅ already present at revvel-standards root |
| CodeQL | `codeql.yml` | ❌ Missing as a standalone repo; ✅ already present at revvel-standards root |
| Bito AI code review | `bito-ai.yml` | ❌ Missing as a standalone repo; ✅ already present at revvel-standards root |
| Ralph Loop self-healing | `ralph-loop.yml` | ❌ Missing as a standalone repo; ✅ already present at revvel-standards root |

All six must be wired on day one before any other PR is opened against the repo.

---

## Step 3 — Recommendations

### P0 — Immediate (before any infra code is written)

1. **Bootstrap the repo** — start in `products/infrastructure/` and keep it extraction-ready for `midnghtsapphire/infrastructure` later.
2. **Wire the full review jury** — for the monorepo path, scope the existing six root workflows to `products/infrastructure/**`; if later extracted, copy those workflows into the standalone repo before opening more PRs.
3. **Load `skills/vault-agent/`** — provision infra credentials through Vault; never commit `.tfvars` with secrets.
4. **Run `skills/openclaw-self-eval/`** — pre-flight audit before any agent executes changes.
5. **Add path-scoped monitoring now** — wire `docs-freshness-check.yml`, `ship-quality.yml`, `ralph-loop.yml`, `codeql.yml`, `semgrep.yml`, and `bito-ai.yml` to watch `products/infrastructure/**` plus any root workflow files that touch infra. In practice that means adding `paths:` filters such as `products/infrastructure/**` under each workflow trigger so the existing root workflows automatically re-review infra changes instead of waiting for a manual revisit.

### P1 — High Priority (first sprint)

1. **Scaffold OpenTofu structure** — remote state backend, variable files pattern, module structure.
2. **Add `scripts/provision-secrets.sh`** — uses the Vault Agent pattern from `skills/vault-agent/SKILL.md`.
3. **Enable `skills/patch-agent/`** — wire `scripts/patch-agent.js` to run on every PR that touches `package.json`.
4. **Document architecture** — `docs/ARCHITECTURE.md` covering services, networks, IAM boundaries.

### P2 — Standard (ongoing)

1. **Enable `skills/malama/`** — self-evolving agent running unattended maintenance passes.
2. **Enable `skills/dare-log/`** — DARE/RAID log for every infra decision (why Terraform over Pulumi, why DigitalOcean over AWS, etc.).
3. **Enable `skills/auto-documentation/`** — auto-generate CHANGELOG and DEPLOY_REPORT on every merge to main.
4. **Enable `skills/gbrain/`** — store infra topology and config patterns in persistent memory so future agents have full context.

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| IaC definitions (HCL/YAML) | OpenTofu / Terraform | Gap | Bootstrap `products/infrastructure/opentofu/` |
| Secret provisioning | `skills/vault-agent/` + `scripts/provision-repo-secrets.sh` | Exists in revvel-standards | Copy pattern to `products/infrastructure/scripts/` |
| CI/CD workflows | `.github/workflows/` (revvel-standards fleet) | Exists | Scope the 6 root review workflows to `products/infrastructure/**` now; copy them only if the repo is later extracted |
| Documentation (README, CHANGELOG) | `skills/auto-documentation/` | Exists | Enable on infra repo |
| Security scanning | `skills/security/` + Semgrep + CodeQL | Exists | Wire workflows on target repo |
| Deploy report | `DEPLOY_REPORT.md` pattern (`skills/deployment/`) | Exists | Generate on every infra deploy |
| Compliance evidence | `skills/grc-compliance/` | Exists | Run gap analysis against SOC 2 / NIST CSF |
| Agent automation | `skills/malama/` + `skills/self-healer/` | Exists | Load at session start for unattended runs |
| Skills/persona activation | `skills/persona-engine/` + personas above | Exists | Load Scout for research, Vault for secrets, Aria for review |

---

## Agent Self-Healing Journal

| Issue detected | Research / correction | Revvel-standards change | Outcome to preserve |
| --- | --- | --- | --- |
| WR document was generated with all-placeholder content; no skills or personas were loaded by the automated pipeline | Agent (Copilot) manually filled all sections by reading `skills/REGISTRY.md`, `SKILLS_INDEX.yml`, `docs/WEEKLY_RESEARCH_PROCESS.md`, and reference WRs | This WR now demonstrates the full expected format, including skills table and personas table, for fleet-maintenance WRs | Fleet-maintenance WR template should pre-populate the Skills Vault and Persona tables — add them to `WR_TEMPLATE_BASIC.md` |
| Target repo `midnghtsapphire/infrastructure` returned HTTP 404 | Agent proceeded per Instruction Resilience principle — bootstrapped recommended structure rather than halting | Consistent with `wr/issues/issue-14622-fleet-maintenance-hvac-calc-service.md` 404 pattern | When a fleet-maintenance target 404s, always bootstrap the recommended structure; document in Agent Self-Healing Journal |
| WR pipeline did not auto-load skills or reference personas | Skills Vault (`skills/REGISTRY.md`, `SKILLS_INDEX.yml`) exists but is not referenced by `wr-pr-creation.yml` | Open follow-up issue to add Skills Vault auto-injection to `wr-pr-creation.yml` workflow | Every auto-generated WR should include a skills table populated from `SKILLS_INDEX.yml` based on task type |
| Early bootstrap recommendation mixed a top-level `infrastructure/` folder with nested `.github/workflows/` under the product tree | Corrected the WR to use `products/infrastructure/` and documented that runnable GitHub Actions workflows must stay at repo root | This WR now matches the actual monorepo layout in `AGENTS.md` and avoids a non-functional nested workflow path | Keep monorepo product examples aligned with the real repo layout; never document nested GitHub Actions workflows as executable |

---

## References

- [`skills/REGISTRY.md`](../../skills/REGISTRY.md) — master index of all Skills Vault entries
- [`skills/SKILLS_INDEX.yml`](../../skills/SKILLS_INDEX.yml) — machine-readable skills index
- [`skills/persona-engine/SKILL.md`](../../skills/persona-engine/SKILL.md) — persona activation guide
- [`skills/self-healer/SKILL.md`](../../skills/self-healer/SKILL.md) — queue recovery agent
- [`skills/malama/SKILL.md`](../../skills/malama/SKILL.md) — self-evolving agent constitution
- [`skills/vault-agent/SKILL.md`](../../skills/vault-agent/SKILL.md) — secret provisioning standard
- [`skills/security/SKILL.md`](../../skills/security/SKILL.md) — OWASP P0 requirements
- [`skills/grc-compliance/SKILL.md`](../../skills/grc-compliance/SKILL.md) — SOC 2 / NIST CSF guidance
- [`skills/deployment/SKILL.md`](../../skills/deployment/SKILL.md) — Deploy Agent 10-step checklist
- [`skills/ralph-loop/SKILL.md`](../../skills/ralph-loop/SKILL.md) — CI self-healing loop
- [`skills/patch-agent/SKILL.md`](../../skills/patch-agent/SKILL.md) — dependency vulnerability patcher
- [`docs/WEEKLY_RESEARCH_PROCESS.md`](../../docs/WEEKLY_RESEARCH_PROCESS.md) — WR standards
- [`wr/issues/issue-14622-fleet-maintenance-hvac-calc-service.md`](issue-14622-fleet-maintenance-hvac-calc-service.md) — reference fleet-maintenance WR (404 pattern)

---

**Research Status:** ✅ Complete
**Implementation Priority:** P0 (wire review jury) → P1 (bootstrap repo structure) → P2 (ongoing maintenance)
**Approval Required:** @midnghtsapphire
