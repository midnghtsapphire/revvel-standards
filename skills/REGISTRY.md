# Revvel Skills Registry

**Version:** 1.0.0  
**Date:** April 12, 2026  
**Status:** Active  
**Scope:** All Revvel/MIDNGHTSAPPHIRE agents — OpenClaw, GitHub Copilot, Claude Code, Cursor, Windsurf, Cline, and all temporary agents

---

## What Is This?

This registry is the **master index of all skills** available in the Revvel Skills Vault. Every agent operating in any Revvel repository must read this file and load the relevant skill(s) before executing a task.

A skill is a text file that gives an AI agent specialized, focused instructions for a specific domain. Loading a skill at the start of a task is equivalent to handing an expert their playbook — the agent instantly knows the rules, workflow, and requirements for that domain without needing to rediscover them.

**How to load a skill:**
1. Identify which skill(s) apply to the current task (use the trigger keywords below).
2. Read the skill's `SKILL.md` or `.skill.yml` file at the path shown.
3. Apply all rules and workflows defined in the skill to your task.
4. If multiple skills apply, load all of them.

---

## Quick-Reference Trigger Table

| If the task involves... | Load this skill |
|---|---|
| RecurseML, autonomous PR review, bug detection, code standards | [`recurse-ml`](#recurse-ml) |
| TruthSlayer audit, composite code score, rate a repo, marketplace audit, trust/authenticity badge | [`truthslayer-audit`](#truthslayer-audit) |
| AI model selection, cost optimization, Sonnet vs Opus | [`model-router`](#model-router) |
| OpenRouter, multi-agent systems, swarms, agent naming, GitHub model tokens | [`openrouter-swarms`](#openrouter-swarms) |
| Session token limits, context handoffs, memory management | [`context-management`](#context-management) |
| Memory pruning, session logs, half-life retention | [`memory-pruning`](#memory-pruning) |
| OpenClaw agent self-audit, soul/memory/agent/skill check, readiness/pre-flight | [`openclaw-self-eval`](#openclaw-self-eval) |
| Persistent agent memory, brain repo, knowledge base, gbrain | [`gbrain`](#gbrain) |
| Activating a persona, greeting, guided session, character | [`persona-engine`](#persona-engine) |
| Building, creating, or scaffolding a new skill | [`skill-forge`](#skill-forge) |
| Breaking down features into atomic TODOs | [`todo-breakdown`](#todo-breakdown) |
| Multiple agents working simultaneously | [`parallel-development`](#parallel-development) |
| Git worktrees, parallel branches | [`using-git-worktrees`](#using-git-worktrees) |
| Wrapping up a session, publishing artifacts | [`wrap-up`](#wrap-up) |
| Brainstorming, ideation, creative problem solving | [`brainstorming`](#brainstorming) |
| Code review, PR review, quality gates | [`code-review`](#code-review) |
| Security, OWASP, secrets, API keys, auth | [`security`](#security) |
| API key / token / credential provisioning, vault, MCP connection | [`vault-agent`](#vault-agent) |
| Accessibility, WCAG, screen readers, TTY/TDD | [`accessibility`](#accessibility) |
| Deploying to DigitalOcean, PM2, Nginx, CI/CD | [`deployment`](#deployment) |
| SEO, metadata, Open Graph, JSON-LD, Lighthouse | [`seo-metadata`](#seo-metadata) |
| Writing tests, Vitest, Playwright, coverage | [`testing`](#testing) |
| Mabl, AI test automation, self-healing tests, cross-browser, deployment events | [`mabl`](#mabl) |
| Generating and running skill/unit/E2E tests (ephemeral agent) | [`testing-agent`](#testing-agent) |
| Error monitoring, server jobs, GitHub issue alerts | [`error-reporting`](#error-reporting) |
| CI failure auto-fix, self-healing loop, @copilot retry, won't merge | [`ralph-loop`](#ralph-loop) |
| Starting a coding session, defining scope | [`mvi-contract`](#mvi-contract) |
| Checking production state, session handoff | [`system-state`](#system-state) |
| Tracking decisions, risks, issues (DARE/RAID) | [`dare-log`](#dare-log) |
| Generating docs, changelogs, API references | [`auto-documentation`](#auto-documentation) |
| Concurrent branches, merging, conflict resolution | [`concurrent-development`](#concurrent-development) |
| Agent behavior testing, evaluator agents, WoZ | [`shift-testing`](#shift-testing) |
| Tax returns, IRS, legal research, court filing | [`tax-legal-agent`](#tax-legal-agent) |

---

## Full Skill Catalog

### Code Quality & Autonomous Review

#### recurse-ml

- **Path:** `skills/recurse-ml/`
- **Files:** `SKILL.md` · `recurse-ml.skill.yml`
- **Description:** Wire RecurseML into any Revvel repo for autonomous bug detection, custom code-standards enforcement (`recurse-rules.md`), and self-healing PR review via GitHub Actions.
- **Tags:** recurse-ml, autonomous-review, bug-detection, code-standards, pr-review, self-healing, github-actions
- **Trigger:** Setting up code-review automation; integrating RecurseML; enforcing recurse-rules; self-healing PR loop.

#### truthslayer-audit

- **Path:** `skills/truthslayer-audit/`
- **Files:** `SKILL.md` · `truthslayer-audit.skill.yml`
- **Brand:** [TruthSlayer](https://truthslayer.com) — Audrey's fact-checking & investigation property under MIDNGHTSAPPHIRE.
- **Description:** Audit and evaluate code on GitHub or a marketplace using TruthSlayer's **eight-factor composite rubric** (Security 20%, Authenticity 15%, Help-Intent 10%, Maintainability 10%, Tests & CI 15%, Documentation 10%, Community 10%, Accessibility 10%). Emits a single 0–100 **TruthSlayer Score**, letter grade (A+–F), badge label (Gold/Silver/Bronze/Conditional/Not Recommended/Avoid), and an evidence-cited markdown report + JSON sidecar. P0 findings (live secrets, malware, license fraud, data exfiltration, RCE-on-install) auto-cap the grade to F. Ships a drop-in Gemini-ready system prompt so any model can act as TruthSlayer Auditor. Designed to power a public trust/authenticity signal on creator pages, portfolios, and marketplace listings.
- **Tags:** truthslayer, code-audit, code-rating, trust-score, authenticity, composite-score, creator-trust, marketplace-audit
- **Trigger:** "truthslayer audit", "truthslayer score", "rate this repo", "audit this repo", "trust score", "authenticity score", "marketplace audit", "creator trust badge".

---

### Agent Operations

#### persona-engine
- **Path:** `skills/persona-engine/`
- **Files:** `SKILL.md` · `persona-engine.skill.yml` · `tests/promptfoo.yml`
- **Description:** Ephemeral persona engine that attaches a named character to any skill session. Activates on demand, delivers greeting + guided first prompt, maintains persona voice throughout, and signs off cleanly. Eliminates the cold-start UX problem. Ships with 6 built-in personas: Aria (code review), Forge (skill building), Vault (security), Scout (research), Sage (documentation), Nexus (deployment).
- **Tags:** persona, ephemeral-persona, ux, greeting, character, skill-guide, cold-start
- **Trigger:** Any task where a persona should be activated; automatically invoked by other skills via `.skill.yml` persona config.
- **Lifecycle:** Ephemeral — session-scoped, terminates at session end.

#### gbrain
- **Path:** `skills/gbrain/`
- **Files:** `SKILL.md` · `gbrain.skill.yml`
- **Description:** Connects an AI agent to a persistent, searchable knowledge base built from markdown files. The brain-agent loop: read from brain before every response, write back after. Knowledge compounds with every session. Derived from garrytan/gbrain (PGLite + pgvector, 30 MCP tools).
- **Tags:** gbrain, agent-memory, persistent-memory, brain-repo, knowledge-base, pglite, pgvector, mcp
- **Trigger:** Persistent agent memory, brain repo, knowledge compounding, remember between sessions, gbrain.

#### openrouter-swarms
- **Path:** `skills/openrouter-swarms/`
- **Files:** `SKILL.md` · `openrouter-swarms.skill.yml`
- **Description:** Decision framework for routing tasks to the right model via OpenRouter, choosing the correct agent topology (single / MAS / swarm), and assigning human names to every spawned agent. Includes the Revvel Agent Name Registry, GitHub model tokens (o1 Cell Sequencing, GPT-5 Nano Physics Coding), cost governance, and deep research protocols.
- **Tags:** openrouter, mas, multi-agent, swarm, agent-topology, agent-naming, github-models, research-protocol, cost-governance
- **Trigger:** OpenRouter, multi-agent systems, swarms, agent naming, o1 cell sequencing, GPT-5 nano, which model to use, research agents.
- **Persona:** 🔭 Scout

#### model-router
- **Path:** `skills/model-router/`
- **Files:** `SKILL.md` · `model-router.skill.yml`
- **Description:** Intelligent model selection (Sonnet vs Opus) based on task complexity for cost-effective AI operations.
- **Tags:** model-routing, cost-optimization, sonnet, opus, ai-operations
- **Trigger:** Any task where model selection matters; default to Sonnet, escalate to Opus for complex analysis.

#### context-management
- **Path:** `skills/context-management/`
- **Files:** `SKILL.md` · `context-management.skill.yml`
- **Description:** Optimize token usage and prevent cost explosion through intelligent session management.
- **Tags:** context, tokens, session-management, handoff, cost-optimization
- **Trigger:** Sessions approaching 100k tokens; multi-session projects; context handoffs.

#### memory-pruning
- **Path:** `skills/memory-pruning/`
- **Files:** `SKILL.md` · `memory-pruning.skill.yml`
- **Description:** Aggressive memory management with half-life strategies to prevent information bloat.
- **Tags:** memory, pruning, retention, half-life, session-logs
- **Trigger:** Memory files growing large; end of long sessions; wrap-up procedures.

#### openclaw-self-eval
- **Path:** `skills/openclaw-self-eval/`
- **Files:** `SKILL.md` · `openclaw-self-eval.skill.yml` · `tests/promptfoo.yml`
- **Description:** Ephemeral pre-flight auditor for any OpenClaw-style agent. Runs 8 read-only audits (soul, memory, agent manifest, skill files, installers, persona, vault/secrets, drift) and emits a markdown report + JSON sidecar with a prioritized P0/P1/P2 fix list. Never reads secret values; never writes to memory.
- **Tags:** self-eval, agent-audit, pre-flight, soul, memory, skill-audit, readiness, openclaw
- **Trigger:** "self eval", "audit yourself", "pre-flight", "agent audit", "soul check", "memory check", "skill audit", "am I set up correctly", onboarding/readiness checks.
- **Lifecycle:** Ephemeral — terminates after the audit report is produced.
- **Persona:** 🪞 Mirror

---

### Developer Workflow

#### skill-forge
- **Path:** `skills/skill-forge/`
- **Files:** `SKILL.md` · `skill-forge.skill.yml` · `tests/promptfoo.yml`
- **Description:** The meta-skill that builds new skills. Interviews the user with 10 discovery questions, then generates all required skill files in one shot: SKILL.md, .skill.yml, persona.yml, PromptFoo tests, Windows .bat installer, Mac .command installer, README, and a marketplace listing draft. Adds the skill to SKILLS_INDEX.yml and REGISTRY.md automatically. Uses the Forge persona.
- **Tags:** skill-forge, meta-skill, skill-builder, scaffolding, skill-creator, forge
- **Trigger:** Any request to build, create, or scaffold a new skill.
- **Lifecycle:** Ephemeral — terminates after skill is built and registered.
- **Persona:** 🔨 Forge

#### brainstorming
- **Path:** `skills/brainstorming/`
- **Files:** `SKILL.md` · `brainstorming.skill.yml`
- **Description:** Structured brainstorming methodology for software development ideation.
- **Tags:** brainstorming, ideation, creativity, planning
- **Trigger:** Feature ideation, architecture exploration, creative problem-solving sessions.

#### todo-breakdown
- **Path:** `skills/todo-breakdown/`
- **Files:** `SKILL.md` · `todo-breakdown.skill.yml`
- **Description:** Break complex requirements into structured, independently implementable TODOs with acceptance criteria.
- **Tags:** todo, breakdown, planning, requirements, complexity-scoring
- **Trigger:** Any time complex requirements need to be broken into implementable tasks.

#### parallel-development
- **Path:** `skills/parallel-development/`
- **Files:** `SKILL.md` · `parallel-development.skill.yml`
- **Description:** Coordinate multiple agents working on the same project simultaneously without conflicts.
- **Tags:** parallel, multi-agent, coordination, locking, branching
- **Trigger:** Multiple agents assigned to the same project; large feature sets needing parallel execution.

#### using-git-worktrees
- **Path:** `skills/using-git-worktrees/`
- **Files:** `SKILL.md` · `using-git-worktrees.skill.yml`
- **Description:** Manage multiple working directories under a single repository for parallel development.
- **Tags:** git, worktrees, branches, parallel-development
- **Trigger:** Working on multiple branches simultaneously; parallel development setup.

#### wrap-up
- **Path:** `skills/wrap-up/`
- **Files:** `SKILL.md` · `wrap-up.skill.yml`
- **Description:** Four-phase session wrap-up workflow: Ship It, Remember It, Review & Apply, Publish It.
- **Tags:** wrap-up, session-management, artifacts, publishing
- **Trigger:** Closing any coding session; before context limit is reached; end of MVI.

#### code-review
- **Path:** `skills/code-review/`
- **Files:** `SKILL.md` · `code-review.skill.yml`
- **Description:** Enforce Revvel code review standards including security, accessibility, test coverage, and style gates.
- **Tags:** code-review, quality, security, pr-review, standards
- **Trigger:** Reviewing any PR or code change before merging.

#### testing
- **Path:** `skills/testing/`
- **Files:** `SKILL.md` · `testing.skill.yml`
- **Description:** Apply Revvel testing standards with Vitest, Playwright E2E, and mandatory coverage thresholds.
- **Tags:** testing, vitest, playwright, e2e, coverage, unit-tests
- **Trigger:** Writing any tests; setting up test infrastructure; validating coverage thresholds.

#### mvi-contract
- **Path:** `skills/mvi-contract/`
- **Files:** `SKILL.md` · `mvi-contract.skill.yml`
- **Description:** Fill out the 7-section MVI Contract before every coding session to define scope and acceptance gates.
- **Tags:** mvi, session, exrup, contract, scope, acceptance-gates
- **Trigger:** **MANDATORY** — start of every coding session. Fill the contract before writing any code.

#### system-state
- **Path:** `skills/system-state/`
- **Files:** `SKILL.md` · `system-state.skill.yml`
- **Description:** Maintain SYSTEM_STATE.md as the single source of truth for production status.
- **Tags:** system-state, production, handoff, session-start, session-end
- **Trigger:** **MANDATORY** — read at session start, update at session end.

#### dare-log
- **Path:** `skills/dare-log/`
- **Files:** `SKILL.md` · `dare-log.skill.yml`
- **Description:** Track decisions and risks using the DARE framework (Define, Assess, Respond, Evaluate).
- **Tags:** dare, risk-management, decisions, issues, kanban
- **Trigger:** Major architectural decisions; tracking unresolved issues; agent failure analysis.

#### auto-documentation
- **Path:** `skills/auto-documentation/`
- **Files:** `SKILL.md` · `auto-documentation.skill.yml`
- **Description:** Automatically generate and maintain project documentation, changelogs, and API docs.
- **Tags:** documentation, changelog, api-docs, auto-doc, artifacts
- **Trigger:** After shipping any feature; generating changelogs; creating API reference docs.

#### concurrent-development
- **Path:** `skills/concurrent-development/`
- **Files:** `SKILL.md` · `concurrent-development.skill.yml`
- **Description:** Coordinate concurrent development across multiple branches with safe merging strategies.
- **Tags:** concurrent, branches, merge, coordination, conflict-resolution
- **Trigger:** Multiple developers or agents working on the same codebase simultaneously.

#### shift-testing
- **Path:** `skills/shift-testing/`
- **Files:** `SKILL.md` · `shift-testing.skill.yml`
- **Description:** Evaluate AI agent behavior across five quality dimensions using the S.H.I.F.T. methodology.
- **Tags:** shift, behavioral-testing, evaluator, woz, agent-quality
- **Trigger:** Validating AI agent output quality; setting up evaluator agents; WoZ testing.

---

### DevOps & Deployment

#### deployment
- **Path:** `skills/deployment/`
- **Files:** `SKILL.md` · `deployment.skill.yml`
- **Description:** Deploy Revvel applications to DigitalOcean using PM2, Nginx, and GitHub Actions CI/CD.
- **Tags:** deployment, digitalocean, pm2, nginx, ci-cd, github-actions
- **Trigger:** Deploying any application to production or staging.

#### error-reporting
- **Path:** `skills/error-reporting/`
- **Files:** `SKILL.md` · `error-reporting.skill.yml`
- **Description:** Implement three-tier error reporting (console → email → GitHub Issue) for all server jobs.
- **Tags:** error-reporting, monitoring, three-tier, monitored-wrapper, alerts
- **Trigger:** Writing any scheduled job, background worker, webhook handler, or payment function.

#### ralph-loop
- **Path:** `skills/ralph-loop/`
- **Files:** `SKILL.md` · `ralph-loop.skill.yml`
- **Description:** Self-healing CI loop — when a check fails, Ralph triggers @copilot via a PR comment, blocks the merge with a `won't-merge` label, and retries on every subsequent commit push until all checks pass (auto-merge) or the retry limit is reached (escalate to human). RALPH: Retry → Analyze → Log → Patch → reCheck.
- **Tags:** ralph-loop, self-healing, auto-fix, ci-failure, copilot-trigger, won't-merge, auto-merge, retry-loop
- **Trigger:** CI failure, self-healing, auto-fix, won't merge, merge blocked, copilot fix loop.

---

### Security & Compliance

#### vault-agent
- **Path:** `skills/vault-agent/`
- **Files:** `SKILL.md` · `vault_agent.skill.yml`
- **Description:** Ephemeral gatekeeper agent that provisions, stores, and rotates all secrets (API keys, OAuth tokens, DB credentials, MCP connections) via HashiCorp Vault. Spawns on demand, provisions with minimum privilege, and terminates. Triggers the Ralph Loop on failure.
- **Tags:** vault, secrets, api-keys, oauth, mcp-credentials, provisioning, gatekeeper, ralph-loop, ephemeral-agent
- **Trigger:** `api key`, `oauth token`, `vault`, `credential`, `secret`, `database url`, `mcp credential`, `provision`, `register api`, `github secret`, `expired token`, `rotate credential`, new project bootstrap.

#### security
- **Path:** `skills/security/`
- **Files:** `SKILL.md` · `security.skill.yml`
- **Description:** Apply OWASP top 10 protections, secret management, input sanitization, and authentication standards.
- **Tags:** security, owasp, helmet, csp, rate-limiting, secrets, auth
- **Trigger:** Any work touching authentication, API keys, user inputs, or data storage.

---

### Accessibility & Compliance

#### accessibility
- **Path:** `skills/accessibility/`
- **Files:** `SKILL.md` · `accessibility.skill.yml`
- **Description:** Implement WCAG 2.2 AA/AAA, TTY/TDD support, 7 UI modes, and ADA compliance for insurance.
- **Tags:** accessibility, wcag, ada, screen-reader, tty, aria
- **Trigger:** Building any UI component; insurance/financial app features; public-facing pages.

---

### Content & Marketing

#### seo-metadata
- **Path:** `skills/seo-metadata/`
- **Files:** `SKILL.md` · `seo-metadata.skill.yml`
- **Description:** Apply mandatory SEO metadata, Open Graph, Twitter Cards, JSON-LD schemas, targeting Lighthouse 90+.
- **Tags:** seo, metadata, open-graph, twitter-cards, json-ld, lighthouse
- **Trigger:** Creating or updating any public-facing page; adding new routes; content publishing.

---

### Tax & Legal

#### tax-legal-agent
- **Path:** `skills/tax-legal-agent/`
- **Files:** `SKILL.md` · `tax-legal-agent.skill.yml`
- **Description:** Activate for any tax or legal query — returns, IRS correspondence, case law, court filings, contracts.
- **Tags:** tax, legal, irs, enrolled-agent, cpa, court, compliance, obbba
- **Trigger:** ANY tax or legal question. When in doubt — USE IT.

---

### Testing & Quality

#### mabl

- **Path:** `skills/mabl/`
- **Files:** `SKILL.md` · `mabl.skill.yml`
- **Description:** Integrate the Mabl CLI (`mablhq/setup-mabl-cli@v1.5`) into any Revvel project for AI-powered, self-healing end-to-end, API, and cross-browser test automation via GitHub Actions deployment events.
- **Tags:** mabl, e2e-testing, ai-testing, self-healing-tests, cross-browser, deployment-events, api-testing, github-actions
- **Trigger:** Setting up Mabl; running AI-maintained E2E tests; cross-browser test automation; registering deployment events; integrating `mablhq/setup-mabl-cli`.

---

#### testing-agent
- **Path:** `skills/testing-agent/`
- **Files:** `SKILL.md` · `testing-agent.skill.yml` · `tests/promptfoo.yml`
- **Description:** Ephemeral agent that generates and evaluates tests for Revvel skills and projects. Understands PromptFoo (skill tests), Vitest (unit tests), and Playwright (E2E). Spawns on demand, terminates after delivery.
- **Tags:** testing-agent, ephemeral-agent, promptfoo, vitest, playwright, test-generation, skill-testing, coverage-gap
- **Trigger:** Any request to generate tests, write tests, fix failing tests, audit test coverage, or run skill tests.
- **Lifecycle:** Ephemeral — terminates after test files are delivered.

---

## Mandatory Skills for Every Session

These skills **must** be loaded at the start of every agent session:

1. **`system-state`** — Read `SYSTEM_STATE.md` before writing any code.
2. **`mvi-contract`** — Fill the MVI Contract before starting work.
3. **`model-router`** — Route tasks to the correct model (Sonnet/Opus).
4. **`context-management`** — Monitor token usage throughout the session.

At the end of every session:
5. **`wrap-up`** — Ship, Remember, Review, Publish.
6. **`memory-pruning`** — Prune session logs to stay under limits.

---

## Adding a New Skill

1. Create a directory: `skills/{skill-name}/`
2. Write `SKILL.md` — concise, agent-readable instructions
3. Write `{skill-name}.skill.yml` — following `docs/spec.md` format
4. Add the skill to this registry (`skills/REGISTRY.md`)
5. Add the skill to `skills/SKILLS_INDEX.yml`
6. Update `docs/AGENTS.md` if the skill should be auto-loaded

---

*This registry is maintained by Audrey Evans (MIDNGHTSAPPHIRE). Last updated: April 15, 2026. Added: gbrain, openrouter-swarms, ralph-loop, testing-agent, mabl skills.*
