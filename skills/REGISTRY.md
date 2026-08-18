# Revvel Skills Registry

**Version:** 1.0.0
**Date:** April 12, 2026
**Status:** Active
**Scope:** All Revvel/MIDNGHTSAPPHIRE agents — OpenClaw, GitHub Copilot, Claude Code, Cursor, Windsurf, Cline, and all temporary agents

---

## What This Is

This registry is the **master index of all skills** available in the Revvel Skills Vault. Every agent operating in any Revvel repository must read this file and load the relevant skill(s) before executing a task.

A skill is a text file that gives an AI agent specialized, focused instructions for a specific domain. Loading a skill at the start of a task is equivalent to handing an expert their playbook — the agent instantly knows the rules, workflow, and requirements for that domain without needing to rediscover them.

**How to load a skill:**

1. Identify which skill(s) apply to the current task (use the trigger keywords below).
2. Read the skill's `SKILL.md` or `.skill.yml` file at the path shown.
3. Apply all rules and workflows defined in the skill to your task.
4. If multiple skills apply, load all of them.

---

## Quick-Reference Trigger Table

| If the task involves...                                                                                                 | Load this skill                                               |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| RecurseML, autonomous PR review, bug detection, code standards                                                          | [`recurse-ml`](#recurse-ml)                                   |
| Knowledge sheaf, sheaf consistency, H¹, Laplacian energy, persistent homology, barcodes, imprint-at-spawn, MOTU, BNAT   | [`bnatsheaf`](#bnatsheaf)                                     |
| BITO AI, persistent-memory code review, desktop API procurement, bito cli, bito secret, repo memory, agentic review     | [`bito-ai`](#bito-ai)                                         |
| Stacker bot, stacked PRs, PR stack TOC, merge-order guard, stacker CLI, installation 150619571                          | [`stacker-bot`](#stacker-bot)                                 |
| TruthSlayer audit, composite code score, rate a repo, marketplace audit, trust/authenticity badge                       | [`truthslayer-audit`](#truthslayer-audit)                     |
| AI model selection, cost optimization, Sonnet vs Opus                                                                   | [`model-router`](#model-router)                               |
| OpenRouter, multi-agent systems, swarms, agent naming, GitHub model tokens                                              | [`openrouter-swarms`](#openrouter-swarms)                     |
| 49Agents, agentic IDE, visual monitoring, parallel research, agent HQ, desktop agents                                   | [`49agents`](#49agents)                                       |
| Agent fallback, OpenHands backup, Cursor, rate limits, high availability                                                | [`agent-fallback`](#agent-fallback)                           |
| Session token limits, context handoffs, memory management                                                               | [`context-management`](#context-management)                   |
| Memory pruning, session logs, half-life retention                                                                       | [`memory-pruning`](#memory-pruning)                           |
| OpenClaw agent self-audit, soul/memory/agent/skill check, readiness/pre-flight                                          | [`openclaw-self-eval`](#openclaw-self-eval)                   |
| Persistent agent memory, brain repo, knowledge base, gbrain                                                             | [`gbrain`](#gbrain)                                           |
| Activating a persona, greeting, guided session, character                                                               | [`persona-engine`](#persona-engine)                           |
| Building, creating, or scaffolding a new skill                                                                          | [`skill-forge`](#skill-forge)                                 |
| Breaking down features into atomic TODOs                                                                                | [`todo-breakdown`](#todo-breakdown)                           |
| Multiple agents working simultaneously                                                                                  | [`parallel-development`](#parallel-development)               |
| Git worktrees, parallel branches                                                                                        | [`using-git-worktrees`](#using-git-worktrees)                 |
| Wrapping up a session, publishing artifacts                                                                             | [`wrap-up`](#wrap-up)                                         |
| Brainstorming, ideation, creative problem solving                                                                       | [`brainstorming`](#brainstorming)                             |
| Code review, PR review, quality gates                                                                                   | [`code-review`](#code-review)                                 |
| Security, OWASP, secrets, API keys, auth                                                                                | [`security`](#security)                                       |
| API key / token / credential provisioning, vault, MCP connection                                                        | [`vault-agent`](#vault-agent)                                 |
| Accessibility, WCAG, screen readers, TTY/TDD                                                                            | [`accessibility`](#accessibility)                             |
| Probabilistic orchestration, AI validation layers, self-correction, structural validation                               | [`probabilistic-orchestration`](#probabilistic-orchestration) |
| ADA compliance audits, free certifications, autonomous monitoring, accessibility agent                                  | [`ada-compliance-agent`](#ada-compliance-agent)               |
| Deploying to DigitalOcean, PM2, Nginx, CI/CD                                                                            | [`deployment`](#deployment)                                   |
| CircleCI, circleci CLI, .circleci/config.yml, orbs, pipeline tuning, test splitting, config policies, ORBIT             | [`circleci-expert`](#circleci-expert)                         |
| Octopus Review, usage limit banner, octp CLI, repo index, review-bot model routing, OCTO                                | [`octopus-expert`](#octopus-expert)                           |
| Mabl expertise, un-pause/reactivate Mabl, credit-free test runs, mabl MCP, Mailbox email testing, MENDER                | [`mabl-expert`](#mabl-expert)                                 |
| OpenClaw E-E-A-T, brand distribution, Wikidata, ORCID, ResearchGate, OSINT profiles, Knowledge Graph                    | [`openclaw-eeat`](#openclaw-eeat)                             |
| SEO, metadata, Open Graph, JSON-LD, Lighthouse                                                                          | [`seo-metadata`](#seo-metadata)                               |
| Schema.org validation, JSON-LD checker, Google Rich Results, structured data, rich snippets                             | [`schema-rich-results`](#schema-rich-results)                 |
| E-E-A-T, Google trust signals, Knowledge Panel, schema.org authority, brand identity, ORCID                             | [`eeat-trust-authority`](#eeat-trust-authority)               |
| Writing tests, Vitest, Playwright, coverage                                                                             | [`testing`](#testing)                                         |
| Testing iOS / Android / Expo / React Native apps, Maestro, jest-expo                                                    | [`mobile-testing`](#mobile-testing)                           |
| Mabl, AI test automation, self-healing tests, cross-browser, deployment events                                          | [`mabl`](#mabl)                                               |
| Mixpanel, product analytics, user-behavior events, funnels, retention, cohorts, telemetry                               | [`mixpanel`](#mixpanel)                                       |
| PostHog, product analytics, session replay, feature flags, A/B testing, error tracking, source maps, annotations        | [`posthog`](#posthog)                                         |
| Amplitude → Notion sync, governance metrics in Notion, scheduled analytics-into-Notion agent                            | [`amplitude-notion-agent`](#amplitude-notion-agent)           |
| NoimosAI, autonomous marketing team, SEO, content, social media, affiliate links, email marketing, marketing automation | [`noimosai`](#noimosai)                                       |
| Generating and running skill/unit/E2E tests (ephemeral agent)                                                           | [`testing-agent`](#testing-agent)                             |
| Error monitoring, server jobs, GitHub issue alerts                                                                      | [`error-reporting`](#error-reporting)                         |
| CI failure auto-fix, self-healing loop, @copilot retry, won't merge                                                     | [`ralph-loop`](#ralph-loop)                                   |
| Starting a coding session, defining scope                                                                               | [`mvi-contract`](#mvi-contract)                               |
| Checking production state, session handoff                                                                              | [`system-state`](#system-state)                               |
| Tracking decisions, risks, issues (DARE/RAID)                                                                           | [`dare-log`](#dare-log)                                       |
| Generating docs, changelogs, API references                                                                             | [`auto-documentation`](#auto-documentation)                   |
| Concurrent branches, merging, conflict resolution                                                                       | [`concurrent-development`](#concurrent-development)           |
| Agent behavior testing, evaluator agents, WoZ                                                                           | [`shift-testing`](#shift-testing)                             |
| Tax returns, IRS, legal research, court filing                                                                          | [`tax-legal-agent`](#tax-legal-agent)                         |
| USDA loans, rural development, loan packagers, property eligibility, income limits                                      | [`usda-loan-agent`](#usda-loan-agent)                         |
| Creating a new bot, bot spec, visual bot styles (glassmorphic/bt21/pacman/etc.)                                         | [`bot-creator`](#bot-creator)                                 |
| Daily product pipeline, social listening, ROI gate, Stripe wiring, marketplace deploy, agent-generated products         | [`product-pipeline`](#product-pipeline)                       |
| Agent prompt detection, TODO @agent routing, @bito @goap @roo tags, HANDOFF.md execution                                | [`prompt-routing`](#prompt-routing)                           |
| Roo-Cline, local development, VS Code agent, multi-file refactoring, @roo tag                                           | [`roo-cline`](#roo-cline)                                     |
| TDD red-green-refactor, structured debugging, Socratic brainstorming, /execute-plan, subagent code review, Superpowers  | [`superpowers`](#superpowers)                                 |

---

## Full Skill Catalog

### Code Quality & Autonomous Review

#### octopus-expert

- **Path:** `skills/octopus-expert/`
- **Files:** `SKILL.md`
- **Platform:** [Octopus Review](https://octopus-review.ai) (source-available, Modified MIT — `github.com/octopusreview/octopus`)
- **Description:** OCTO — the fleet's expert on Octopus Review, the RAG-based codebase-aware AI PR reviewer wired into this org. Manages the monthly AI-usage-limit banner (three lanes: hosted BYOK Anthropic/OpenAI keys, self-host (Modified MIT) via Docker Compose for model sovereignty, OSI-public repos free unlimited), keeps the Qdrant vector index fresh (`octopus repo index` before disputing findings), operates `@octp/cli` (`pr review`, `repo index`, `whoami`, `usage`) through `.github/workflows/octopus-cli.yml`, keeps Octopus-filed issues routing into the WR pipeline (`octopus-route.yml`, rate-limited backfill only), and owns model routing — including **OpenRouter on self-host** via the OpenAI-compatible gateway slots (`ACP_BASE_URL=https://openrouter.ai/api/v1`, models namespaced `acp:<slug>`) and Ollama local lanes.
- **Tags:** octopus-review, octo, ai-code-review, rag, qdrant, usage-limits, byok, self-host, openrouter, ollama, octp-cli, issue-routing
- **Trigger:** "/octo", "/octopus", "octopus review", "usage limit", "octopus index", "octp", "octopus self-host", "octopus openrouter"
- **Tags:** octopus-review, octo, ai-code-review, rag, qdrant, embeddings, usage-limits, byok, self-host, openrouter, ollama, octp-cli, issue-routing
- **Trigger:** "/octo", "/octopus", "octopus review", "usage limit", "octopus index", "octp", "review bot limits", "octopus self-host", "octopus openrouter"
- **Lifecycle:** On-demand (comment-triggered) + advisory on any Octopus Review task
- **Persona:** 🐙 OCTO (Reviewmaster)

#### bito-ai

- **Path:** `skills/bito-ai/`
- **Files:** `SKILL.md` · `bito-ai.skill.yml`
- **Platform:** [BITO AI](https://bito.ai)
- **Description:** Wire BITO AI into any Revvel repo for **persistent-memory** code review, agentic PR workflows, desktop API/secret procurement via the BITO CLI, and automated label updates (`bito-ai:review`, `awaiting-approval`, `bito-ai:changes-needed`, `changes-requested`) based on review outcomes. BITO indexes the entire codebase once and maintains an up-to-date knowledge base, so every PR review draws on full repo context — not just the diff. The desktop CLI (`bito review`, `bito secret get`, `bito ask`) assists developers in retrieving and wiring secrets from the local Vault client or OS keychain without manual copy-paste.
- **Tags:** bito-ai, persistent-memory-review, agentic-code-review, desktop-api-procurement, bito-cli, bito-secret, repo-memory, pr-review, label-automation
- **Trigger:** "bito", "bito ai", "bito review", "persistent memory review", "bito cli", "bito secret", "bito index", "agentic code review", "desktop api procurement", "code review with memory".
- **Standard:** `standards/BITO_AI_INTEGRATION_STANDARD.md`
- **Workflow:** `.github/workflows/bito-ai.yml`
- **Integration doc:** `docs/BITO_AI_INTEGRATION.md`

#### stacker-bot

- **Path:** `skills/stacker-bot/`
- **Files:** `SKILL.md` · `stacker-bot.skill.yml`
- **Platform:** [stacker-bot](https://github.com/apps/stacker-bot) (installation `150619571`)
- **Description:** Free stacked-PR GitHub App. Splits large agent/human diffs into dependent PR stacks, keeps a TOC on the main stack PR, and fails status checks on non-top items so merges stay top-down. No API key. Complementary to Graphite.
- **Tags:** stacker-bot, stacked-prs, pr-stack, merge-order, stack-toc, free-github-app
- **Trigger:** "stacker", "stacker-bot", "stacked pr", "pr stack", "stack toc", "merge order", "stacker cli", "150619571".
- **Integration doc:** `docs/STACKER_BOT_INTEGRATION.md`
- **Verification doc:** `docs/STACKER_BOT_INSTALLATION.md`

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
- **Description:** Audit and evaluate code on GitHub or a marketplace using TruthSlayer's **eight-factor composite rubric** (Security 20%, Authenticity 15%, Help-Intent 10%, Maintainability 10%, Tests & CI 15%, Documentation 10%, Community 10%, Accessibility 10%). Emits a single 0–100 **TruthSlayer Score**, letter grade (A+–F), canonical badge label (`TruthSlayer Verified — Gold`, `TruthSlayer Verified — Silver`, `TruthSlayer Verified — Bronze`, `Conditional — Fix Required`, `Not Recommended — Significant Concerns`, or `Avoid — Material Issues`), and an evidence-cited markdown report + JSON sidecar. P0 findings (live secrets, malware, license fraud, data exfiltration, RCE-on-install) auto-cap the grade to F. Ships a drop-in Gemini-ready system prompt so any model can act as TruthSlayer Auditor. Designed to power a public trust/authenticity signal on creator pages, portfolios, and marketplace listings.
- **Tags:** truthslayer, code-audit, code-rating, trust-score, authenticity, composite-score, creator-trust, marketplace-audit
- **Trigger:** "truthslayer audit", "truthslayer score", "rate this repo", "audit this repo", "trust score", "authenticity score", "marketplace audit", "creator trust badge".

#### 49agents

- **Path:** `skills/49agents/`
- **Files:** `SKILL.md`
- **Description:** Integration with 49Agents, an open-source "agentic IDE" providing a unified 2D canvas interface for managing multiple AI agents, terminals, projects, and machines. Enables visual agent monitoring, parallel multi-agent research coordination, and desktop agent workflows. Complements existing OpenRouter/GitHub Actions automation with real-time visual dashboards and parallel research capabilities.
- **Tags:** 49agents, agentic-ide, multi-agent, visual-dashboard, parallel-research, agent-hq, desktop-agent
- **Trigger:** "49agents", "agentic IDE", "agent dashboard", "visual monitoring", "parallel research", "agent HQ", "desktop agent".
- **Persona:** 🔭 Scout

---

### Agent Operations

#### agent-fallback

- **Path:** `.github/workflows/agent-fallback.yml` · `docs/AGENT_FALLBACK_PROCESS.md`
- **Description:** Automatic agent fallback system that switches between OpenHands AI, Cursor, and OpenRouter when rate limits are reached or agents are unavailable. Implements the fallback chain: OpenHands → Cursor → OpenRouter → Manual escalation. Monitors agent health, logs fallback events, and creates visibility issues for tracking. Ensures zero-downtime automation.
- **Tags:** agent-fallback, OpenHands, cursor, openrouter, rate-limit, backup, high-availability, automation
- **Trigger:** Any automated task that requires AI agent execution; automatically used by workflows when OpenHands hits limits.
- **Lifecycle:** System-level — always active as part of automation infrastructure.

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

#### circleci-expert

- **Path:** `skills/circleci-expert/`
- **Files:** `SKILL.md`
- **Description:** ORBIT — the fleet's CircleCI pipeline commander. Wires repos into CircleCI with minimal pinned configs, validates locally before any push (`circleci config validate` / `process`), reproduces failing jobs in Docker (`circleci local execute`), tunes pipelines (caching, workspaces, DLC, parallelism, timing-based test splitting, resource-class rightsizing via Insights), authors/publishes orbs, enforces Rego config policies, and operates the v1.x preview CLI (`run` trigger/watch with scriptable exit codes, `envvar`, `dlc purge`, and the built-in `circleci mcp` MCP server for Claude). Covers both CLI generations and a lesser-known-features bench.
- **Tags:** circleci, orbit, ci-cd, pipelines, orbs, config-validation, local-execute, test-splitting, docker-layer-caching, config-policies, opa-rego, mcp, insights
- **Trigger:** "/orbit", "/circleci", "/circle-ci", "circleci config", ".circleci/config.yml", "wire in circleci", "orb authoring", "pipeline tuning", "test splitting", "config policy"
- **Lifecycle:** On-demand (comment-triggered) + advisory on any CircleCI task
- **Persona:** 🪐 ORBIT (Pipeline Commander)

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

#### security-fleet

- **Path:** `skills/security-fleet/`
- **Files:** `SKILL.md` · `security-fleet.skill.yml` · `SECURITY_FLEET.yml`
- **Description:** Five single-job AI-exploit red-team experts on the agentic-workflow-fleet model: `@sentinel` (prompt-injection tripwire on agent-consumed text), `@exprwatch` (untrusted `${{ github.event.* }}` in `run:` shells), `@exfil` (leaked tokens in diffs/logs, extends secrets-sentinel), `@permit` (per-workflow `permissions:` vs actual usage), `@redteam` (patch-agent dependency lane + adversarial tests against our own detectors). Personas are derived from `SECURITY_FLEET.yml`; detectors live in `scripts/security-fleet.js`; lanes in `.github/workflows/security-fleet.yml` file `security-fleet`-labeled findings.
- **Tags:** security-fleet, red-team, prompt-injection, expression-injection, secret-exfil, least-privilege, adversarial-testing, patch-agent
- **Trigger:** `security fleet`, `red team`, `prompt injection`, `instruction smuggling`, `expression injection`, `secret exfil`, `leaked token`, `permission audit`, `least privilege`, `adversarial tests`.

#### grc-compliance

- **Path:** `skills/grc-compliance/`
- **Files:** `SKILL.md` · `grc-compliance.skill.yml`
- **Fork:** [`midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance) (upstream: `Sushegaad/Claude-Skills-Governance-Risk-and-Compliance` v0.3.0)
- **Description:** Expert-level Governance, Risk, and Compliance (GRC) guidance for nine regulatory frameworks — ISO 27001, SOC 2, FedRAMP, GDPR, HIPAA, NIST CSF 2.0, PCI DSS v4.0.1, TSA Cybersecurity, and ISO 42001 AI Management System — delivered via the Claude Code plugin marketplace. Benchmarked at 94% accuracy across 18 test cases. Covers gap analyses, policy drafting, audit evidence, control mapping, risk registers, and compliance document generation for each framework.
- **Tags:** grc, compliance, governance, risk, iso27001, soc2, fedramp, gdpr, hipaa, nist-csf, pci-dss, tsa-cybersecurity, iso42001, claude-code-plugin, audit, regulatory, security-policy, isms, ato, privacy
- **Trigger:** `ISO 27001`, `SOC 2`, `FedRAMP`, `GDPR`, `HIPAA`, `NIST CSF`, `PCI DSS`, `TSA cybersecurity`, `ISO 42001`, `compliance framework`, `gap analysis`, `audit readiness`, `GRC`, `regulatory compliance`, `risk register`, `security policy`, `control mapping`.

---

### Accessibility & Compliance

#### accessibility

- **Path:** `skills/accessibility/`
- **Files:** `SKILL.md` · `accessibility.skill.yml`
- **Description:** Implement WCAG 2.2 AA/AAA, TTY/TDD support, 7 UI modes, and ADA compliance for insurance.
- **Tags:** accessibility, wcag, ada, screen-reader, tty, aria
- **Trigger:** Building any UI component; insurance/financial app features; public-facing pages.

#### ada-compliance-agent

- **Path:** `skills/ada-compliance-agent/`
- **Files:** `SKILL.md` · `ada-compliance-agent.skill.yml` · `README.md` · `EXAMPLES.md` · `IMPLEMENTATION_SUMMARY.md` · `.github/workflows/ada-compliance-check.yml`
- **Description:** Autonomous agent for researching, learning, and enforcing ADA compliance. Monitors for new certifications, audits code for WCAG 2.2 AA/AAA compliance, and ensures all accessibility standards are met. Can run on-demand, scheduled, or 24/7 via OpenRouter. Tracks free and paid ADA certification courses, auto-fixes safe violations, and continuously learns from new courses and standards updates.
- **Tags:** ada, wcag, accessibility, a11y, section-508, compliance-agent, autonomous, certifications, continuous-learning, screen-reader, aria, tty, openrouter-24-7
- **Trigger:** `ada`, `ada certification`, `free ada cert`, `accessibility audit`, `compliance check`, `wcag`, `section 508`, or any accessibility compliance task. Also when researching ADA training courses or monitoring for new accessibility standards.
- **Lifecycle:** Ephemeral (on-demand audits) or Continuous (24/7 monitoring mode via OpenRouter)

---

### Content & Marketing

#### openclaw-eeat

- **Path:** `skills/openclaw-eeat/`
- **Files:** `SKILL.md` · `openclaw-eeat.skill.yml` · `README.md` · `templates/` · `tests/promptfoo.yml`
- **Description:** Automated brand content distribution across 12 high-value platforms (ORCID, Wikidata, ResearchGate, Internet Archive, MISP, Bellingcat, etc.) to establish E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals for Google Knowledge Graph eligibility and OSINT community presence. Generates platform-specific schemas (JSON-LD, ORCID XML, Wikidata RDF), auto-submits where APIs permit, and drafts manual submissions with step-by-step instructions.
- **Tags:** eeat, openclaw, brand-distribution, knowledge-graph, wikidata, orcid, researchgate, osint, json-ld, schema-org, misp, bellingcat
- **Trigger:** OpenClaw E-E-A-T, distribute brand content, knowledge graph, Wikidata entity, ORCID update, ResearchGate profile, deep web presence, OSINT profile, intelligence community, Google Knowledge Panel.
- **Persona:** 🌐 Echo
- **Lifecycle:** Ephemeral

#### seo-metadata

- **Path:** `skills/seo-metadata/`
- **Files:** `SKILL.md` · `seo-metadata.skill.yml`
- **Description:** Apply mandatory SEO metadata, Open Graph, Twitter Cards, JSON-LD schemas, targeting Lighthouse 90+.
- **Tags:** seo, metadata, open-graph, twitter-cards, json-ld, lighthouse
- **Trigger:** Creating or updating any public-facing page; adding new routes; content publishing.

#### schema-rich-results

- **Path:** `skills/schema-rich-results/`
- **Files:** `SKILL.md` · `schema-rich-results.skill.yml`
- **Script:** `scripts/schema-rich-results-checker.js`
- **Tests:** `tests/schema-rich-results-checker.test.js`
- **Description:** Validate JSON-LD structured data markup against schema.org rules and Google Rich Results eligibility. Exports pure functions (`parseJsonLd`, `validateSchema`, `checkRichResults`, `runChecks`, `generateReport`) that can be called from CI or GitHub Actions. Covers 20+ `@type` definitions (Organization, Article, Product, FAQPage, BreadcrumbList, WebApplication, Event, JobPosting, Recipe, VideoObject, etc.) with required and recommended property checks, deep property-shape validation (headline length, ListItem positions, FAQPage Question nodes, Offer pricing), and a five-tool reference catalog (Google Rich Results Test, Schema Markup Validator, Bing, Merkle, SEO Site Checkup).
- **Tags:** schema-org, json-ld, rich-results, structured-data, seo, google-rich-results, schema-validation, faqpage, product-schema, article-schema, breadcrumb
- **Trigger:** "schema validation", "json-ld", "structured data", "rich results", "rich snippets", "schema.org", "google structured data", "schema markup", "faqpage schema", "product schema", "article schema", "breadcrumb schema", "organization schema".

#### content-automation

- **Path:** `skills/content-automation/`
- **Files:** `SKILL.md` · `content-automation.skill.yml`
- **Script:** `scripts/content-automation.js`
- **Description:** End-to-end AI-powered content creation pipeline: topic ideation, script generation, refinement, and multi-format publishing using OpenRouter. Automates the complete content workflow from research through publication in 10-15 minutes. Supports blog posts, video scripts, social media threads, and email newsletters. Implements quality gates for SEO, readability, and technical standards.
- **Tags:** content-automation, ai-content, content-generation, blog-automation, script-writing, seo-content, openrouter, topic-ideation, content-pipeline, multi-format
- **Trigger:** "content automation", "content creation", "content generation", "blog automation", "script writing", "topic ideation", "ai content", "write blog post", "generate content", "video script", and labels: `content-automation`, `content`, `writing`, `blog`, `seo-content`.
- **Standard:** `standards/CONTENT_AUTOMATION_STANDARD.md`
- **Workflow:** `.github/workflows/content-automation.yml`

#### noimosai

- **Path:** `skills/noimosai/`
- **Files:** `SKILL.md`
- **Platform:** [NoimosAI](https://noimosai.com) — Autonomous AI Marketing Team
- **Description:** Wire NoimosAI's autonomous marketing agent fleet into any Revvel project. NoimosAI handles SEO audits, content creation, social media scheduling, affiliate link management, and email marketing automatically. Triggered by GitHub issue labels (`noimosai`, `marketing`, `seo`, `content`, `affiliate`) and a daily 08:00 UTC cron. Ships `.github/workflows/noimosai.yml`, `standards/NOIMOSAI_INTEGRATION_STANDARD.md`, and `.env.example` entries for `NOIMOSAI_API_KEY` / `NOIMOSAI_WORKSPACE_ID`.
- **Tags:** noimosai, marketing-automation, autonomous-marketing, seo, content, social-media, affiliate, email-marketing, marketing-agent
- **Trigger:** "noimosai", "marketing automation", "autonomous marketing", "seo agent", "content agent", "social media automation", "affiliate optimization", "email campaign", any issue labelled `marketing`, `seo`, `content`, `affiliate`, or `noimosai`.

#### eeat-trust-authority

- **Path:** `skills/eeat-trust-authority/`
- **Files:** `SKILL.md` · `eeat-trust-authority.skill.yml`
- **Agent Name:** TrustForge
- **Description:** Automated Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) management across all MIDNGHTSAPPHIRE properties. Generates schema.org Organization and Person markup, maintains brand statement consistency, builds Google Knowledge Panel presence, manages ORCID integration, monitors trust signals, and enforces entity hierarchy from Freedom Angel Corp (founded 2010) to all child properties. Runs daily via cron with Quiet Mode control.
- **Tags:** eeat, google, schema-org, knowledge-panel, seo, trust, authority, brand-identity, orcid, freedom-angel-corp
- **Trigger:** Setting up a new website or app; updating brand identity or professional profiles; auditing E-E-A-T signals; implementing schema.org markup; building or updating Google Knowledge Panel presence; linking to ORCID or professional affiliations.

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

#### mabl-expert

- **Path:** `skills/mabl-expert/`
- **Files:** `SKILL.md`
- **Platform:** [Mabl](https://www.mabl.com) — **PAUSED in this fleet 2026-05-27** (replaced by Keploy; evaluation preserved in `.github/workflows/mabl.yml`)
- **Description:** MENDER — the fleet's Mabl expert and guardian of its pause. Knows the 2026 agentic platform (Planner/Generator/Healer test agents, GenAI assertions, multi-model auto-healing, API + MongoDB/Oracle testing, Test Impact Analysis, Mailbox email-flow assertions), the **credit-free lanes** (`mabl tests run` locally/CI consumes no cloud credits; mabl cloud MCP drives it from Claude agents), and owns the reactivation gate: a browser-E2E need Keploy+Playwright can't cover, a Doppler-managed key, and labeled plans — all three or Mabl stays paused. Companion setup skill: [`mabl`](#mabl).
- **Tags:** mabl, mender, e2e-testing, agentic-testing, auto-healing, genai-assertions, credit-free, mabl-mcp, mailbox, paused-tool, reactivation-gate, keploy
- **Trigger:** "/mender", "/mabl", "mabl question", "un-pause mabl", "reactivate mabl", "email flow testing", "mabl mailbox", "mabl mcp", "credit-free mabl"
- **Lifecycle:** On-demand (comment-triggered) + advisory on any Mabl task
- **Persona:** 🧪 MENDER (Test Healer)

#### mabl

- **Path:** `skills/mabl/`
- **Files:** `SKILL.md` · `mabl.skill.yml`
- **Description:** Integrate the Mabl CLI (`mablhq/setup-mabl-cli@v1.5`) into any Revvel project for AI-powered, self-healing end-to-end, API, and cross-browser test automation via GitHub Actions deployment events.
- **Tags:** mabl, e2e-testing, ai-testing, self-healing-tests, cross-browser, deployment-events, api-testing, github-actions
- **Trigger:** Setting up Mabl; running AI-maintained E2E tests; cross-browser test automation; registering deployment events; integrating `mablhq/setup-mabl-cli`.

---

#### mobile-testing

- **Path:** `skills/mobile-testing/`
- **Files:** `SKILL.md` · `mobile-testing.skill.yml`
- **Description:** Apply Revvel mobile testing standards: `jest-expo` + `@testing-library/react-native` for unit/component and **Maestro** for E2E on both iOS and Android. Runs entirely in the cloud via EAS Build + GitHub Actions runners (`macos-14` for iOS sim, `ubuntu-latest` + `reactivecircus/android-emulator-runner` for Android emulator) — no local Xcode or Android Studio required, matching the AGENTS.md mandate. Detox is allowed as an alternate tier; Appium is explicitly excluded.
- **Tags:** mobile, ios, android, expo, react-native, maestro, jest-expo, rntl, eas, e2e, coverage
- **Trigger:** Any mobile-test work in an Expo / React Native repo: "test ios", "test android", "maestro flow", "jest-expo", "rntl", "react native testing library", "expo testing", "test mobile coverage", "eas preview build for tests".
- **Related:** [`standards/MOBILE_TESTING.md`](../standards/MOBILE_TESTING.md), [`docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md`](../docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md), [`templates/mobile/testing/`](../templates/mobile/testing/).

---

#### testing-agent

- **Path:** `skills/testing-agent/`
- **Files:** `SKILL.md` · `testing-agent.skill.yml` · `tests/promptfoo.yml`
- **Description:** Ephemeral agent that generates and evaluates tests for Revvel skills and projects. Understands PromptFoo (skill tests), Vitest (unit tests), and Playwright (E2E). Spawns on demand, terminates after delivery.
- **Tags:** testing-agent, ephemeral-agent, promptfoo, vitest, playwright, test-generation, skill-testing, coverage-gap
- **Trigger:** Any request to generate tests, write tests, fix failing tests, audit test coverage, or run skill tests.
- **Lifecycle:** Ephemeral — terminates after test files are delivered.

---

### Product Analytics

#### mixpanel

- **Path:** `skills/mixpanel/`
- **Files:** `SKILL.md` · `mixpanel.skill.yml`
- **Description:** Integrate Mixpanel into any Revvel project (web, Node, mobile) for action-level user-behavior analytics — events, funnels, retention, cohorts. Ships a drop-in `mixpanel-init.ts` wrapper with Do-Not-Track honoring, persistent opt-out, PII property-key strip, EU-residency host swap, and a no-op fallback when `MIXPANEL_TOKEN` is unset. Includes a Revvel-standard event catalog (`App Loaded`, `User Signed Up`, `Purchase Completed`, etc.) with `Title Case With Spaces` event names and `snake_case` properties, plus a hard PII ban list enforced at both wrapper and PR-review layers.
- **Tags:** mixpanel, product-analytics, user-behavior, events, funnels, retention, cohort-analysis, telemetry, mixpanel-browser, mixpanel-node
- **Trigger:** "mixpanel", "integrate mixpanel", "product analytics", "user behavior analytics", "track event", "funnel analysis", "retention analysis", "cohort analysis", "mixpanel-browser", "telemetry".

---

#### posthog

- **Path:** `skills/posthog/`
- **Files:** `SKILL.md` · `posthog.skill.yml`
- **Description:** Integrate PostHog into any Revvel project (web, Node, mobile) for all-in-one product analytics, session replay, feature flags, A/B testing, and error tracking with source maps. Ships a drop-in `posthog-init.ts` wrapper with Do-Not-Track honoring, persistent opt-out, PII property-key strip, EU-residency host swap, session replay masking, and a no-op fallback when `POSTHOG_API_KEY` is unset. Includes a Revvel-standard event catalog (`app_loaded`, `user_signed_up`, `purchase_completed`, etc.) with `snake_case` event names and properties, plus a hard PII ban list enforced at both wrapper and PR-review layers. Also ships three GitHub Actions templates for annotations (mark deployments on analytics charts), source map uploads (readable error stack traces), and custom CI/CD events.
- **Tags:** posthog, product-analytics, session-replay, feature-flags, ab-testing, error-tracking, source-maps, user-behavior, events, telemetry, posthog-js, posthog-node, annotations, github-actions
- **Trigger:** "posthog", "integrate posthog", "product analytics", "session replay", "feature flags", "ab testing", "a/b testing", "error tracking", "source maps", "user behavior analytics", "track event", "posthog-js", "telemetry", "annotations", "deployment annotations".

---

#### amplitude-notion-agent

- **Path:** `skills/amplitude-notion-agent/`
- **Files:** `SKILL.md` · `amplitude-notion-agent.skill.yml`
- **Description:** Scheduled GitHub Actions agent that pulls a daily snapshot from the **Amplitude Dashboard REST API** (saved chart) and appends a row to a **Notion database**, closing the loop GitHub → Amplitude → Notion. Read-side complement to `amplitude-events.yml` (the GitHub → Amplitude side). Pure Node (no npm deps, uses built-in `https`). Append-only — never reads or mutates Notion. Forwards only aggregate counts (no event-level data, no PII). Missing secrets log `::warning::` and exit 0 instead of failing the run. Ships `scripts/amplitude-to-notion.js`, `.github/workflows/amplitude-to-notion.yml` (daily cron + `workflow_dispatch` with `dry_run`), and `standards/AMPLITUDE_NOTION_AGENT_STANDARD.md`.
- **Tags:** amplitude, notion, analytics, governance, scheduled-agent, dashboard-rest, notion-database, cross-tool-sync
- **Trigger:** "amplitude to notion", "amplitude into notion", "amplitude notion", "notion analytics dashboard", "amplitude chart export to notion", "governance metrics in notion", "amplitude dashboard sync", "create agent using amplitude data in notion".

---

### Real Estate & Finance

#### usda-loan-agent

- **Path:** `skills/usda-loan-agent/`
- **Files:** `SKILL.md` · `usda_loan_agent.skill.yml`
- **Description:** Comprehensive USDA rural development loan specialist covering Section 502 Guaranteed and Direct loan programs, loan packaging services, property eligibility (including inground pool restrictions, square footage misconceptions, acreage limits), state-by-state income limits, DTI/credit requirements, and legal compliance (RESPA, TILA). Includes step-by-step guidance for becoming a loan packager, state licensing variations (MLO requirements in CA/NY/TX vs. no license in CO/MO), and automated eligibility tool specifications. Features deep research on legal loopholes (NEMT → utility → special district formation) with current status and similar active loopholes (tribal sovereignty, HOA police powers, MUD formation).
- **Tags:** usda, rural-development, loan-packager, mortgage, housing, real-estate, section-502, income-limits, property-eligibility, respa, compliance, state-licensing
- **Trigger:** "usda loan", "rural development", "section 502", "guaranteed loan", "direct loan", "loan packager", "loan packaging", "income limits", "property eligibility", "inground pool", "rural area", "state usda", "packager license", "usda rules".

---

### Bot Creation

#### bot-creator

- **Path:** `skills/bot-creator/`
- **Files:** `SKILL.md` · `bot-creator.skill.yml`
- **Description:** Turns a plain-language idea into a complete, scaffolded bot spec. Runs a 5-question interview, locks one functional category (adulting, creative, study, coding, productivity, social, finance, wellness, gaming, shopping, weaponized, guardian), and composes 1–2 visual styles from a 14-style library (dimensional: `1d`, `2d`, `3d`, `glassmorphic`, `pacman`; persona/culture: `weaponized`, `adulting`, `bt21`, `pretty-pony`, `memelord`, `genz`, `genx`, `millennial`, `boomer`). Enforces combo rules (max 2 styles, no `boomer × memelord`, etc.), defaults backgrounds to `minimal` (dioramas off by default), and emits a `bots/<bot-slug>/` scaffold with `BOT.md`, `bot.yml`, `persona.yml`, `theme.json`. Weaponized category ships with firm safety rails.
- **Tags:** bot-creator, bot-factory, bot-scaffold, visual-style, glassmorphic, bt21, pretty-pony, memelord, genz, genx, millennial, boomer, pacman, adulting, weaponized
- **Trigger:** "create a bot", "build a bot", "new bot", "bot builder", "scaffold bot", "bot spec", or any style-named bot request (e.g., "glassmorphic bot", "bt21 bot").
- **Lifecycle:** Ephemeral — terminates after the bot spec is shipped and the scaffold is written.
- **Persona:** 🔨 Forge

---

### Product Operations

#### dragnet-scaffold

- **Path:** `skills/dragnet-scaffold/`
- **Files:** `SKILL.md`
- **Description:** DRAGNET SCAFFOLD MODE — the product-creation branch of the DRAGNET persona. Extracts product requirements from raw social signals (Reddit threads, screenshots, user-complaint clusters), classifies the cheapest viable solution shape, scores the candidate through the PLATO→JUDGE matrix, gates on ROI/legal/operational thresholds, and emits a complete WR with BOM, MVP definition, acceptance gates, and traceable source citations. Triggered by `/scaffold`, `/builder`, `/product-build`, or `/dragnet` when the task is a new product/feature request rather than a bug. Bridges the gap between unstructured social feedback and the structured `product-pipeline` build step.
- **Tags:** dragnet, scaffold, product-build, builder, social-signals, reddit, screenshots, bom, plato-judge, wr-output, requirements-extraction
- **Trigger:** "/scaffold", "/builder", "/product-build", "/dragnet <product request>", "extract requirements from screenshots", "build from Reddit", "scaffold from social signals"
- **Lifecycle:** On-demand (comment-triggered)
- **Persona:** 🕵️ DRAGNET (SCAFFOLD MODE)

#### product-pipeline

- **Path:** `skills/product-pipeline/`
- **Files:** `SKILL.md` · `skill.yml`
- **Description:** Operates the daily Revvel product creation pipeline defined in [`standards/AUTOMATED_PRODUCT_PIPELINE.md`](../standards/AUTOMATED_PRODUCT_PIPELINE.md). Listens across X / Reddit / TikTok / YouTube / app-store / Amazon reviews for high-volume complaints, clusters and ranks them by `volume × payability × blue_ocean / age`, scans competitors and reviews for SEO/SEM gaps, runs an ROI gate that auto-approves only cheap reversible shapes (PDF, MCP, CLI, skill) and otherwise pings Audrey, routes the candidate to the cheapest viable solution shape (PDF / one-button app / extension / Alexa skill / API / CLI / MCP / booklet / full app), hands the per-product `BOM.md` to the BOM gatekeeper, builds with the shape-specific scaffold, runs every cert (code, security, a11y, store, tax/legal), wires Stripe idempotently keyed on `product_slug`, deploys to the highest-volume marketplaces for that shape (Gumroad/Etsy/App Store/Play/Chrome Web Store/RapidAPI/npm+brew+scoop/mcp.so/own domain), runs UTM-tagged SEM + paid social capped at `min($20, est_daily_revenue / 5)`, and rolls Stripe + analytics back into the next day's listening payability weights. Per-product folders live at `projects/agent-generated/<slug>/`, scaffolded by `scripts/init-product.sh` from `templates/agent-generated-product/`.
- **Tags:** product-pipeline, social-listening, complaint-cluster, roi-gate, solution-shape, bom-gatekeeper, stripe-product, marketplace-deploy, paid-social-budget, agent-generated-product
- **Trigger:** "product pipeline", "automated product", "ship a product", "daily listening", "social listening", "complaint cluster", "ROI gate", "solution shape", "BOM gatekeeper", "stripe product", "agent-generated product", "product-slug".
- **Lifecycle:** Long-running (cron-driven); each step session is ephemeral.
- **Persona:** 🛠️ Forge-Pipeline

#### grant-mgmt-agent

- **Path:** `skills/grant-mgmt-agent/`
- **Files:** `SKILL.md` · `grant-mgmt-agent.skill.yml`
- **Description:** End-to-end grant management automation: discovery (Instrumentl, Grants.gov, SAM.gov), AI-powered proposal writing (OpenRouter), document automation (DocSpring/Anvil), workflow orchestration (n8n/Zapier/Make), tracking (Supabase/Airtable), and compliance reporting. Complete stack for automating the grant lifecycle from discovery through award and compliance, reducing manual work by 80%+ while maintaining high-quality applications.
- **Tags:** grant-management, grant-automation, grants-gov, sam-gov, instrumentl, openrouter, proposal-writing, rfp-automation, n8n, zapier, make, supabase, airtable, document-automation, compliance-tracking
- **Trigger:** "grant management", "grant automation", "grant discovery", "grant proposal", "instrumentl", "grants.gov", "sam.gov", "grant tracking", "proposal writing", "rfp automation".
- **Persona:** 🔍 Scout

---

## Mandatory Skills for Every Session

These skills **must** be loaded at the start of every agent session:

1. **`system-state`** — Read `SYSTEM_STATE.md` before writing any code.
2. **`mvi-contract`** — Fill the MVI Contract before starting work.
3. **`model-router`** — Route tasks to the correct model (Sonnet/Opus).
4. **`context-management`** — Monitor token usage throughout the session.

At the end of every session: 5. **`wrap-up`** — Ship, Remember, Review, Publish. 6. **`memory-pruning`** — Prune session logs to stay under limits.

---

## Adding a New Skill

1. Create a directory: `skills/{skill-name}/`
2. Write `SKILL.md` — concise, agent-readable instructions
3. Write `{skill-name}.skill.yml` — following `docs/spec.md` format
4. Add the skill to this registry (`skills/REGISTRY.md`)
5. Add the skill to `skills/SKILLS_INDEX.yml`
6. Update `docs/AGENTS.md` if the skill should be auto-loaded

---

_This registry is maintained by Audrey Evans (MIDNGHTSAPPHIRE). Last updated: May 3, 2026. Added: ada-compliance-agent, usda-loan-agent, gbrain, openrouter-swarms, ralph-loop, testing-agent, mabl, bot-creator, mixpanel, amplitude-notion-agent, bito-ai, prompt-routing, roo-cline skills._

---

### Agent Orchestration & Prompts (New Section)

#### prompt-routing

- **Path:** `skills/prompt-routing/`
- **Files:** `SKILL.md`
- **Description:** Automatically detect agent prompts in code comments (`TODO @agent:`), issues, PRs, and `HANDOFF.md` files. Extract context, classify prompt type, route to appropriate specialist agent (Bito, GOAP, Jules, Roo-Cline, OpenRouter), and track completion. Enables tag-based agent assignment: `@agent` (auto-routed), `@bito` (code quality), `@goap` (revenue), `@jules` (research), `@roo` (local development), `@copilot` (manual).
- **Tags:** prompt-detection, agent-routing, todo-@agent, handoff-execution, multi-agent-orchestration, @bito, @goap, @roo, @jules, @copilot
- **Trigger:** "agent prompt", "TODO @agent", "@bito tag", "@goap tag", "@roo tag", "HANDOFF.md", "agent routing", "prompt detection", "multi-agent orchestration"
- **Documentation:** `docs/AGENT_PROMPT_CONVENTION.md` · `docs/AGENT_PROMPT_EXECUTION_EVALUATION.md`
- **Status:** Planned (documentation complete, workflow pending)

#### roo-cline

- **Path:** `skills/roo-cline/`
- **Files:** `SKILL.md`
- **Platform:** [Roo-Cline](https://github.com/marco-altran/Roo-Cline) (VS Code extension)
- **Description:** Use Roo-Cline autonomous coding agent for local development tasks requiring multi-file refactoring, complex feature implementation, or terminal command execution with human oversight. Roo-Cline operates in VS Code with multiple modes (Code, Architect, Ask, Debug), supports all major LLM providers (OpenAI, Claude, Gemini, Ollama), and provides human-in-the-loop approval for each action. Ideal for local development work tagged with `@roo`.
- **Tags:** roo-cline, vs-code-agent, local-development, autonomous-coding, multi-file-refactoring, @roo-tag, IDE-agent, human-in-loop
- **Trigger:** "@roo", "roo-cline", "local refactoring", "VS Code agent", "autonomous coding", "Cline", "IDE agent"
- **Documentation:** `docs/ROO_CLINE_SETUP.md` · `docs/AGENT_PROMPT_CONVENTION.md`
- **Status:** Active (manual invocation, desktop tool)

#### superpowers

- **Path:** `skills/superpowers/`
- **Files:** `SKILL.md` · `superpowers.skill.yml`
- **Platform:** [Claude Plugins — Superpowers](https://claude.com/plugins/superpowers)
- **Description:** Composable skills framework that enforces structured software development discipline in Claude. Five independently loadable modules: `/brainstorming` (Socratic requirements refinement that blocks implementation until sign-off), `/tdd` (red-green-refactor with mandatory failing-test enforcement — the RED phase is non-negotiable), `/debug` (four-phase root-cause methodology: reproduce → classify → hypothesis test → fix; architectural review escalation auto-triggers after three failed attempts), `/execute-plan` (batched implementation plans with a `code-reviewer` subagent checkpoint between each batch), and `/writing-skills` (TDD principles applied to skill and documentation authoring, requiring ≥ 3 assertions per skill). The `code-reviewer` subagent evaluates implementations against the approved plan, coding standards, and architectural principles. Modules compose: new feature → brainstorm + TDD + execute-plan; bug fix → debug + TDD; new skill → brainstorm + writing-skills.
- **Tags:** superpowers, tdd, red-green-refactor, brainstorming, systematic-debugging, four-phase-debug, execute-plan, code-reviewer, writing-skills, composable-skills, structured-development, architectural-escalation
- **Trigger:** "superpowers", "/brainstorming", "/tdd", "/execute-plan", "/debug superpowers", "/writing-skills", "red-green-refactor", "structured tdd", "four-phase debug", "subagent code review", "tests must fail first", "architectural review escalation", "claude superpowers plugin".
- **Lifecycle:** Composable — load individual modules or the full suite on demand.

#### client-stacks

- **Path:** `skills/client-stacks/`
- **Files:** `SKILL.md` · `client-stacks.skill.yml` · `detect-stack.js` · `run-engagement.js` · `stacks/*.json`
- **Description:** Paid-contract engagement kit — hook the fleet into ANY client stack and do the work. `detect-stack.js` profiles a client checkout (language, framework, test runner, CI, package manager); per-stack lane packs (`stacks/dotnet.json`, `java`, `python`, `typescript`, `php`, `go`, `ruby`) carry an idiomatic prompt pack plus the CLIENT'S verify commands so the coding lane runs their tests, not ours; `run-engagement.js` plans a client-style PR in dry-run and appends a per-client JSONL audit action log. Integration tiers (API-only → repo-level → fleet-in-their-infra), remedial-work menu with Polar pricing hooks, isolation rules, and the engagement checklist live in `docs/CLIENT_ENGAGEMENT_KIT.md`.
- **Tags:** client-contract, stack-detection, polyglot, dotnet, java, python, typescript, php, engagement, audit-log, pricing
- **Trigger:** "client stack", "client contract", "contract engagement", "detect client stack", "we do C#", "polyglot lane", "engagement kit"
- **Documentation:** `docs/CLIENT_ENGAGEMENT_KIT.md`
- **Status:** Active (tests: `tests/client-stacks.test.js`)

#### bnatsheaf

- **Path:** `skills/bnatsheaf/`
- **Files:** `SKILL.md`
- **Description:** BNAT Knowledge Sheaf — mathematical sheaf consistency (H¹ ≈ 0 hard rule) on top of the BIOME sheaf metaphor. Cellular sheaf with restriction maps and Laplacian energy E(x) (`scripts/bnatsheaf/sheaf.js`), persistent H⁰/H¹ homology barcodes over BIOME filtrations (`scripts/bnatsheaf/persistence.js`), and a test harness (`scripts/bnatsheaf/cli.js`) with `consistency_check`, `imprint_agent`, and `ph_monitor`. Every agent instantiation restricts from the knowledge sheaf and verifies H¹ ≈ 0 at spawn; long-lived H¹ bars are killed or escalated, never silently glued. Strictly additive to `scripts/biome/sheaf.js`.
- **Tags:** knowledge-sheaf, cellular-sheaf, sheaf-laplacian, h1-obstruction, persistent-homology, barcodes, imprint-at-spawn, motu, biome, consistency
- **Trigger:** "knowledge sheaf", "sheaf consistency", "H1", "Laplacian energy", "persistent homology", "barcode", "imprint-at-spawn", "MOTU", "BNAT", "obstruction"
- **Documentation:** `docs/bnatsheaf/README.md` · `standards/BNAT_SHEAF_STANDARD.md`
- **Status:** Active (tests: `tests/bnatsheaf.test.js`)

### `probabilistic-orchestration`

- **Path:** `skills/probabilistic-orchestration/SKILL.md`
- **Persona:** DRAGNET (PROBABILISTIC MODE)
- **Description:** Defensive guardrails, validation layers, and self-correction loops for handling unpredictable AI outputs. Use this skill when parsing LLM outputs or building AI-driven pipelines.
