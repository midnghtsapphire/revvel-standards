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

The target repository `midnghtsapphire/infrastructure` returned HTTP 404 at research time — it does not exist as a public GitHub repository. This WR documents the skills, personas, and standards from revvel-standards that are most applicable to standing up and maintaining an infrastructure repository in the MIDNGHTSAPPHIRE fleet. The recommended path is to bootstrap an `infrastructure/` product inside the revvel-standards monorepo (matching the established pattern for `hvac-calc-service`, `cli-engine`, etc.) with IaC definitions, fleet-wide secret provisioning scripts, and the full revvel-standards review jury wired in from day one.

---

## Repository Metadata

| Property | Value |
| --- | --- |
| Target repo | `midnghtsapphire/infrastructure` |
| HTTP status at research time | **404 — does not exist** |
| Recommended path | Bootstrap as `infrastructure/` in revvel-standards monorepo |
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

The following **Persona Engine** personas (`skills/persona-engine/`) are the right fit for each phase of this work:

| Phase | Persona | Voice | Why |
| --- | --- | --- | --- |
| **Research & discovery** | 🔭 **Scout** | Curious, energetic | Mapping what infra tooling exists and what the repo needs |
| **Security & secrets setup** | 🔐 **Vault** | Serious, cautious, thorough | Credentials, secrets, and IAM — zero tolerance for shortcuts |
| **PR review & CI gates** | 🎯 **Aria** | Direct, precise, kind | Code review of HCL/YAML changes against Revvel standards |
| **Documentation & reports** | 📖 **Sage** | Patient, methodical | Writing CHANGELOG, DEPLOY_REPORT, and architecture diagrams |
| **Deployment & rollout** | 🌐 **Nexus** | Strategic, decisive | Deploy Agent checklist and live verification |
| **Skill/template building** | 🔨 **Forge** | Creative, hands-on | If new skills or templates need to be scaffolded from this work |

**To activate a persona:** load `skills/persona-engine/SKILL.md` and reference the persona name in the session prompt. All personas are ephemeral — session-scoped, terminate at end.

---

## Step 1 — Repository Discovery

### Status

`midnghtsapphire/infrastructure` returned **HTTP 404** at research time (2026-06-25). The repository does not exist as a public GitHub repo. Two valid interpretations exist:

1. **Private repo** — the infrastructure repo exists but is private. In this case, the fleet-maintenance tasks are still valid (add review workflows, refresh docs, add security scanning).
2. **Does not exist yet** — bootstrap it as a monorepo product (`infrastructure/`) following the `hvac-calc-service` / `cli-engine` pattern.

Per the WR Instruction Resilience principle, the agent must not halt on a 404 — it should proceed with option 2 (bootstrap) unless a private repo access token is available.

### Recommended Bootstrap Structure

```text
infrastructure/
├── README.md
├── CHANGELOG.md
├── AGENTS.md               # Inherits from root; add infra-specific rules
├── .github/
│   └── workflows/
│       ├── ai-pr-review-openrouter.yml   # Copy from root .github/workflows/
│       ├── codeql.yml
│       ├── semgrep.yml
│       └── dependabot-auto-merge.yml
├── terraform/              # IaC definitions (if Terraform)
├── scripts/
│   ├── provision-secrets.sh  # Calls Vault Agent pattern
│   └── bootstrap.sh
└── docs/
    ├── ARCHITECTURE.md
    └── RUNBOOK.md
```

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
| OpenRouter AI PR Review | `ai-pr-review-openrouter.yml` | ❌ Missing (repo does not exist) |
| Jules deep research | `jules-invoke.yml` | ❌ Missing |
| Semgrep SAST | `semgrep.yml` | ❌ Missing |
| CodeQL | `codeql.yml` | ❌ Missing |
| Bito AI code review | `bito-ai.yml` | ❌ Missing |
| Ralph Loop self-healing | `ralph-loop.yml` | ❌ Missing |

All six must be wired on day one before any other PR is opened against the repo.

---

## Step 3 — Recommendations

### P0 — Immediate (before any infra code is written)

1. **Bootstrap the repo** — create `midnghtsapphire/infrastructure` or scaffold as `infrastructure/` in revvel-standards monorepo.
2. **Wire the full review jury** — copy the six workflows above from `.github/workflows/`. PR must not merge without all six passing.
3. **Load `skills/vault-agent/`** — provision infra credentials through Vault; never commit `.tfvars` with secrets.
4. **Run `skills/openclaw-self-eval/`** — pre-flight audit before any agent executes changes.

### P1 — High Priority (first sprint)

1. **Scaffold Terraform/OpenTofu structure** — remote state backend, variable files pattern, module structure.
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
| IaC definitions (HCL/YAML) | OpenTofu / Terraform | Gap | Bootstrap `infrastructure/terraform/` |
| Secret provisioning | `skills/vault-agent/` + `scripts/provision-repo-secrets.sh` | Exists in revvel-standards | Copy pattern to `infrastructure/scripts/` |
| CI/CD workflows | `.github/workflows/` (revvel-standards fleet) | Exists | Copy 6 review workflows to target repo |
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
