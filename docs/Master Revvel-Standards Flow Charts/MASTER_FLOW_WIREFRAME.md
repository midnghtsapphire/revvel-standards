# Master Revvel-Standards Flow — Wireframe Diagram

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Auto-Maintained
**Maintained by:** `scripts/sync-flow-charts.js`

---

> This document shows the Revvel workflow as an ASCII wireframe — boxes, arrows, and labels so you can see every step and every tool at once.

---

## Full Wireframe

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                    REVVEL MASTER STANDARDS WORKFLOW                          ║
║              From Idea → Research → Docs → Code → Ship                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0 — BOOTSTRAP (only for brand-new projects)                          │
│                                                                             │
│  ┌─────────────────────────┐    runs    ┌──────────────────────────────┐   │
│  │  bootstrap-new-project  │──────────► │  templates/ folder           │   │
│  │  .sh                    │           │  • README.md template         │   │
│  └─────────────────────────┘           │  • CHANGELOG.md template      │   │
│           │                            │  • BLUEPRINT.md template      │   │
│           ▼                            │  • ci.yml / deploy.yml etc.   │   │
│  ┌─────────────────────────┐           │  • .mcp.json (MCP config)     │   │
│  │  setup-mcp.sh           │           └──────────────────────────────┘   │
│  │  (loads 8–32 MCP servers│                                               │
│  │   into .mcp.json)       │                                               │
│  └─────────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 1 — READ THE STANDARDS                                               ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────────────────────────────────────────────┐
  │  REVVEL_MASTER_STANDARDS.md  ←  Single Source of Truth (SSOT)        │
  │                                                                      │
  │  Sections read:                                                      │
  │  • §0  Standards Index (which docs apply)                            │
  │  • §1  EXRUP / XRP Methodology (how to build fast)                   │
  │  • §2  Branding & Naming Conventions                                 │
  │  • §5  Deployment & Process Standards                                │
  │  • §7  Auto-Documentation & Change Tracking                          │
  └──────────────────────────────────────────────────────────────────────┘
                                       │
                                       │  topic / question identified
                                       ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 2 — DEEP RESEARCH                                                    ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────┐
  │  GitHub Actions              │
  │  research-module.yml         │  ← manually triggered via workflow_dispatch
  │  (runs on ubuntu-latest)     │
  └──────────────────────────────┘
               │
               │  calls
               ▼
  ┌──────────────────────────────┐     ┌─────────────────────────────────────┐
  │  scripts/research-module.js  │────►│  OpenRouter API  (openrouter.ai)     │
  │  (Node.js, no dependencies)  │     │                                     │
  └──────────────────────────────┘     │  5 Sub-Agents run in PARALLEL:      │
                                       │                                     │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ Agent 1: SPEC                 │  │
                                       │  │ Model: Claude Sonnet 4        │  │
                                       │  │ Task: Official docs & specs   │  │
                                       │  └───────────────────────────────┘  │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ Agent 2: COMPETITIVE          │  │
                                       │  │ Model: GPT-4.1                │  │
                                       │  │ Task: Compare alternatives    │  │
                                       │  └───────────────────────────────┘  │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ Agent 3: SECURITY             │  │
                                       │  │ Model: Claude Opus 4          │  │
                                       │  │ Task: Risks & compliance      │  │
                                       │  └───────────────────────────────┘  │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ Agent 4: COST                 │  │
                                       │  │ Model: GPT-4o-mini            │  │
                                       │  │ Task: Budget & ops analysis   │  │
                                       │  └───────────────────────────────┘  │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ Agent 5: COMMUNITY            │  │
                                       │  │ Model: Gemini 2.5 Pro         │  │
                                       │  │ Task: Real-world experience   │  │
                                       │  └───────────────────────────────┘  │
                                       │                                     │
                                       │  Synthesizer: Claude Opus 4         │
                                       │  Combines all 5 reports → 1 doc     │
                                       └─────────────────────────────────────┘
               │
               │  output: research .md file committed to repo
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 3 — CREATE DOCUMENTATION                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Research doc committed  → AI agent (Copilot / Claude Code)        │
  │  reads it and creates:                                              │
  │                                                                     │
  │  Mandatory artifacts (per AUTO_DOCUMENTATION_STANDARD.md):         │
  │  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
  │  │  README.md      │  │  BLUEPRINT.md │  │  ROADMAP.md           │ │
  │  └─────────────────┘  └───────────────┘  └───────────────────────┘ │
  │  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
  │  │  KANBAN_CARDS.md│  │  CHANGELOG.md │  │  INFRASTRUCTURE_MAP.md│ │
  │  └─────────────────┘  └───────────────┘  └───────────────────────┘ │
  │                                                                     │
  │  Storage: docs/  folder in target repo                              │
  └─────────────────────────────────────────────────────────────────────┘
               │
               │  push to branch
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 4 — CREATE GITHUB ISSUE                                              ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────┐
  │  GitHub CLI  (gh)            │   OR   research-module.yml auto-creates
  │  gh issue create             │        the issue after research finishes
  │    --repo  midnghtsapphire/revvel-standards │
  │    --title "..."             │
  │    --label "New Project"     │
  │    --body  "..."             │
  └──────────────────────────────┘
               │
               │  issue number assigned
               ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  issue-branch.yml  (GitHub App workflow)                             │
  │  → automatically creates a branch from the issue title              │
  │  → branch name: issue-{number}-{slug}                               │
  └──────────────────────────────────────────────────────────────────────┘
               │
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 5 — BUILD, COMMIT & PULL REQUEST                                     ║
╚═════════════════════════════════════════════════════════════════════════════╝

  Developer / AI Agent works on the issue branch:

  ┌──────────────────────────────────────────────────────────────────────┐
  │  git checkout -b feature/my-branch                                   │
  │  ... make changes ...                                                │
  │  git add . && git commit -m "feat: ..."                              │
  │  git push origin feature/my-branch                                  │
  └──────────────────────────────────────────────────────────────────────┘
               │
               │  push triggers
               ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  GitHub Actions CI  (.github/workflows/)                            │
  │                                                                     │
  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
  │  │  ci.yml      │  │  security.yml │  │  syntax-check.yml        │ │
  │  │  • lint      │  │  • secret scan│  │  • YAML / JSON / TS      │ │
  │  │  • test      │  │  • SAST scan  │  │    syntax validation     │ │
  │  │  • type-check│  │  • CodeQL     │  └──────────────────────────┘ │
  │  └──────────────┘  └───────────────┘                               │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │  check-compliance.js  (scripts/)                             │   │
  │  │  Checks: CHANGELOG present? Required docs present?           │   │
  │  └──────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────┘
               │
               ├── ALL PASS ────────────────────────────────────┐
               │                                                │
               └── ANY FAIL ──┐                                 │
                              ▼                                 ▼
╔═════════════════════════════════════════════════════════════╗
║  PHASE 6 — RALPH LOOP (Self-Healing CI)                     ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  Attempt 1–5:                                               ║
║  ┌──────────────────────────────────────────────────────┐  ║
║  │  ralph-loop.yml fires on workflow_run failure        │  ║
║  │  → finds the open PR for this commit SHA             │  ║
║  │  → posts comment: "@copilot fix this failure..."     │  ║
║  │  → adds labels: won't-merge, auto-fix, copilot       │  ║
║  │  → assigns @Copilot to the PR                        │  ║
║  │  → Copilot pushes a fix commit                       │  ║
║  │  → CI reruns                                         │  ║
║  └──────────────────────────────────────────────────────┘  ║
║                                                             ║
║  After 5 failed attempts:                                   ║
║  ┌──────────────────────────────────────────────────────┐  ║
║  │  → removes auto-fix / won't-merge labels             │  ║
║  │  → adds: needs-human, blocked                        │  ║
║  │  → escalates to @midnghtsapphire                     │  ║
║  └──────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════════╝
               │
               │  CI passes
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 7 — CODE REVIEW                                                      ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────┐
  │  ready-for-review.yml  → auto-labels PR as "ready for review"       │
  │                                                                     │
  │  Reviewers:                                                         │
  │  • GitHub Copilot (auto-assigned)                                   │
  │  • Claude Code (if configured in .claude/settings.json)             │
  │  • Human reviewer (@midnghtsapphire) — required for high-risk PRs  │
  │  • Venice AI (optional secondary reviewer)                          │
  └─────────────────────────────────────────────────────────────────────┘
               │
               │  PR approved
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 8 — MERGE & DEPLOY                                                   ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Merge PR into main                                                 │
  │          │                                                          │
  │          ├──► CHANGELOG.md auto-updates (panda-ops.yml)            │
  │          │                                                          │
  │          ├──► deploy.yml fires:                                     │
  │          │       • SSH into DigitalOcean droplet                   │
  │          │       • git pull + pm2 restart                          │
  │          │                                                          │
  │          ├──► deploy-ios.yml (if iOS app):                         │
  │          │       • Fastlane → TestFlight → App Store               │
  │          │                                                          │
  │          ├──► deploy-android.yml (if Android app):                 │
  │          │       • Fastlane → Google Play                          │
  │          │                                                          │
  │          └──► GitHub Pages (if docs/portfolio site):               │
  │                  • Static site auto-deployed                       │
  └─────────────────────────────────────────────────────────────────────┘
               │
               │  deployed ✓
               ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  PHASE 9 — AUTO-SYNC FLOW CHARTS (this document)                            ║
╚═════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────┐
  │  flow-chart-sync.yml fires on every push                           │
  │          │                                                          │
  │          ├──► scripts/sync-flow-charts.js runs                     │
  │          │       • scans all docs/ for .md files                   │
  │          │       • updates metadata blocks in this folder          │
  │          │       • patches broken file references if docs moved    │
  │          │       • commits & pushes changes back to repo           │
  │          │                                                          │
  │          └──► Flow charts stay up-to-date automatically ✓          │
  └─────────────────────────────────────────────────────────────────────┘
               │
               │  🔄 LOOP BACK TO PHASE 1 for the next feature
               └────────────────────────────────────────────────►
```

---

## API & Credential Flow (Security Detail)

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │  GitHub Secrets  (repository-level, never committed to code)        │
  │                                                                     │
  │  APP_ID               → GitHub App authentication                  │
  │  APP_PRIVATE_KEY      → GitHub App private key (RSA)               │
  │  OPENROUTER_API_KEY   → Unlocks OpenRouter (all AI models)         │
  │  SSH_PRIVATE_KEY      → DigitalOcean droplet deploy access         │
  │  DATABASE_URL         → PostgreSQL connection string               │
  │  JWT_SECRET           → Auth token signing (min 32 chars)          │
  │                                                                     │
  │  Retrieved at runtime by:                                           │
  │  actions/create-github-app-token@v1  →  short-lived token (1hr)   │
  │                                                                     │
  │  All secrets flow through API_GATEKEEPER_STANDARD.md rules:        │
  │  • Rate limiting                                                    │
  │  • Token rotation                                                   │
  │  • Audit logging                                                    │
  │  • Zero secrets in logs                                             │
  └──────────────────────────────────────────────────────────────────────┘
```

---

## MCP Server Integration Point

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │  .mcp.json  (in each project root)                                  │
  │                                                                     │
  │  AI coding agents (Claude Code, Copilot, Cursor, Windsurf, Cline)  │
  │  read this file to connect to:                                      │
  │                                                                     │
  │  Database Servers:     postgres, sqlite, mongodb, redis, supabase  │
  │  Search:               brave-search, exa, tavily                   │
  │  Memory:               mem0, basic-memory                          │
  │  Filesystem:           filesystem (sandboxed read/write)            │
  │  Communication:        sendgrid, twilio, slack                      │
  │  Productivity:         github, linear, notion, google-calendar      │
  │  Finance:              stripe                                       │
  │  Code Execution:       code-sandbox                                 │
  │  Custom:               code-review-mcp-server (Revvel-specific)    │
  │                                                                     │
  │  Config loaded by:  scripts/setup-mcp.sh                           │
  └──────────────────────────────────────────────────────────────────────┘
```

---

*Auto-maintained. Last sync: 2026-04-15. Script: `scripts/sync-flow-charts.js`*
