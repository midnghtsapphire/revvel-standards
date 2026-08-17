# Master Revvel-Standards Flow — 3D Layered Chart

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Auto-Maintained
**Maintained by:** `scripts/sync-flow-charts.js`

> **How to view:** This document uses [Mermaid](https://mermaid.js.org/) diagrams.
> They render automatically in GitHub, VS Code (with Mermaid extension), Notion, and Obsidian.
> For a standalone HTML render, open [mermaid.live](https://mermaid.live) and paste the code block.

---

## Diagram 1 — Master Process Flow (Top-Down Layers)

Each horizontal band is a "layer" of the workflow. Subgraphs give the 3D depth effect.

```mermaid
flowchart TD
    %% ─── LAYER 0: FOUNDATION ─────────────────────────────────────────
    subgraph L0["🏛️  LAYER 0 — FOUNDATION (Read the Rules)"]
        direction LR
        SSOT["📖 REVVEL_MASTER_STANDARDS.md\n(Single Source of Truth)"]
        STANDARDS_INDEX["§0 Standards Index"]
        EXRUP["§1 EXRUP / XRP Methodology"]
        DEPLOY_STD["§5 Deployment Standards"]
        AUTODOC["§7 Auto-Documentation Rules"]
        SSOT --> STANDARDS_INDEX
        SSOT --> EXRUP
        SSOT --> DEPLOY_STD
        SSOT --> AUTODOC
    end

    %% ─── LAYER 1: RESEARCH ───────────────────────────────────────────
    subgraph L1["🔬  LAYER 1 — DEEP RESEARCH (5 AI Agents)"]
        direction LR
        RESEARCH_WF["⚙️ research-module.yml\n(GitHub Actions)"]
        OR["🌐 OpenRouter API"]
        subgraph AGENTS["Parallel Sub-Agents"]
            A1["Agent 1: SPEC\nClaude Sonnet 4"]
            A2["Agent 2: COMPETITIVE\nGPT-4.1"]
            A3["Agent 3: SECURITY\nClaude Opus 4"]
            A4["Agent 4: COST\nGPT-4o-mini"]
            A5["Agent 5: COMMUNITY\nGemini 2.5 Pro"]
        end
        SYNTH["🧠 Synthesizer\nClaude Opus 4"]
        RESEARCH_DOC["📄 Research .md\n(committed to docs/)"]
        RESEARCH_WF --> OR
        OR --> A1 & A2 & A3 & A4 & A5
        A1 & A2 & A3 & A4 & A5 --> SYNTH
        SYNTH --> RESEARCH_DOC
    end

    %% ─── LAYER 2: DOCUMENTATION ──────────────────────────────────────
    subgraph L2["📝  LAYER 2 — CREATE DOCUMENTATION"]
        direction LR
        BOOTSTRAP["🛠️ bootstrap-new-project.sh"]
        TEMPLATES["📁 templates/ folder"]
        subgraph MANDATORY_DOCS["Mandatory Artifacts"]
            D1["README.md"]
            D2["BLUEPRINT.md"]
            D3["ROADMAP.md"]
            D4["KANBAN_CARDS.md"]
            D5["CHANGELOG.md"]
            D6["INFRASTRUCTURE_MAP.md"]
        end
        BOOTSTRAP --> TEMPLATES
        TEMPLATES --> D1 & D2 & D3 & D4 & D5 & D6
    end

    %% ─── LAYER 3: ISSUE & BRANCH ─────────────────────────────────────
    subgraph L3["🎫  LAYER 3 — ISSUE & BRANCH CREATION"]
        direction LR
        GH_CLI["💻 gh issue create\n(GitHub CLI)"]
        AUTO_ISSUE["🤖 research-module.yml\nauto-creates issue"]
        GITHUB_ISSUE["📌 GitHub Issue\n(labeled + assigned)"]
        ISSUE_BRANCH_WF["⚙️ issue-branch.yml\n(GitHub App)"]
        NEW_BRANCH["🌿 New Branch\nissue-{n}-{slug}"]
        GH_CLI --> GITHUB_ISSUE
        AUTO_ISSUE --> GITHUB_ISSUE
        GITHUB_ISSUE --> ISSUE_BRANCH_WF
        ISSUE_BRANCH_WF --> NEW_BRANCH
    end

    %% ─── LAYER 4: BUILD & CI ─────────────────────────────────────────
    subgraph L4["💻  LAYER 4 — BUILD, COMMIT & CI"]
        direction LR
        GIT_PUSH["git push\n(developer / AI agent)"]
        subgraph CI_CHECKS["GitHub Actions CI"]
            CI["ci.yml\nlint + test + type-check"]
            SEC["security.yml\nsecret scan + CodeQL"]
            SYNTAX["syntax-check.yml\nYAML / JSON / TS"]
            COMPLIANCE["check-compliance.js\nREVVEL compliance"]
        end
        PR["📬 Pull Request opened"]
        GIT_PUSH --> CI_CHECKS
        GIT_PUSH --> PR
    end

    %% ─── LAYER 5: SELF-HEALING ───────────────────────────────────────
    subgraph L5["🔁  LAYER 5 — RALPH LOOP (Self-Healing CI)"]
        direction LR
        RALPH["⚙️ ralph-loop.yml\nfires on CI failure"]
        COPILOT_FIX["🤖 @Copilot\nreads error, pushes fix"]
        RETRY{"Retry\n≤ 5 times?"}
        ESCALATE["🚨 Escalate to\n@midnghtsapphire\n(needs-human label)"]
        UNBLOCK["✅ CI passes\nwon't-merge label removed"]
        RALPH --> COPILOT_FIX
        COPILOT_FIX --> RETRY
        RETRY -->|"Yes (attempt < 5)"| RALPH
        RETRY -->|"No (attempt = 5)"| ESCALATE
        RALPH -->|"CI now passes"| UNBLOCK
    end

    %% ─── LAYER 6: REVIEW ─────────────────────────────────────────────
    subgraph L6["👁️  LAYER 6 — CODE REVIEW"]
        direction LR
        READY_WF["⚙️ ready-for-review.yml"]
        COPILOT_REVIEW["🤖 GitHub Copilot\nauto-review"]
        CLAUDE_REVIEW["🤖 Claude Code\n(if configured)"]
        HUMAN_REVIEW["👤 Human Review\n(@midnghtsapphire)"]
        APPROVED["✅ PR Approved"]
        READY_WF --> COPILOT_REVIEW & CLAUDE_REVIEW & HUMAN_REVIEW
        COPILOT_REVIEW & CLAUDE_REVIEW & HUMAN_REVIEW --> APPROVED
    end

    %% ─── LAYER 7: DEPLOY ─────────────────────────────────────────────
    subgraph L7["🚀  LAYER 7 — MERGE & DEPLOY"]
        direction LR
        MERGE["Merge to main"]
        CHANGELOG_UPDATE["📋 CHANGELOG.md\nauto-updated\n(panda-ops.yml)"]
        subgraph DEPLOY_TARGETS["Deploy Targets"]
            WEB["🌐 Web\ndeploy.yml → DigitalOcean\nSSH + pm2"]
            IOS["🍎 iOS\ndeploy-ios.yml\nFastlane → App Store"]
            ANDROID["🤖 Android\ndeploy-android.yml\nFastlane → Play Store"]
            PAGES["📄 GitHub Pages\nStatic site deploy"]
        end
        MERGE --> CHANGELOG_UPDATE
        MERGE --> WEB & IOS & ANDROID & PAGES
    end

    %% ─── LAYER 8: AUTO-SYNC ──────────────────────────────────────────
    subgraph L8["🔄  LAYER 8 — FLOW CHART AUTO-SYNC"]
        direction LR
        SYNC_WF["⚙️ flow-chart-sync.yml\nfires on every push"]
        SYNC_SCRIPT["🔧 scripts/sync-flow-charts.js"]
        SCAN["📂 Scans all docs/\nfor .md files"]
        UPDATE_META["✏️ Updates metadata\nblocks in flow charts"]
        PATCH_REFS["🔗 Patches broken\nfile references"]
        COMMIT_SYNC["💾 Commits & pushes\nupdated docs"]
        SYNC_WF --> SYNC_SCRIPT
        SYNC_SCRIPT --> SCAN --> UPDATE_META --> PATCH_REFS --> COMMIT_SYNC
    end

    %% ─── VERTICAL CONNECTORS (layer-to-layer) ────────────────────────
    L0 -->|"Standards understood"| L1
    L1 -->|"Research complete"| L2
    L2 -->|"Docs created"| L3
    L3 -->|"Branch ready"| L4
    L4 -->|"CI fails"| L5
    L4 -->|"CI passes"| L6
    L5 -->|"Fixed or escalated"| L6
    L6 -->|"Approved"| L7
    L7 -->|"Deployed"| L8
    L8 -->|"🔄 next iteration"| L0

    %% ─── STYLES ──────────────────────────────────────────────────────
    style L0 fill:#1a1a2e,color:#e0e0e0,stroke:#7b2fff
    style L1 fill:#16213e,color:#e0e0e0,stroke:#0f3460
    style L2 fill:#0f3460,color:#e0e0e0,stroke:#533483
    style L3 fill:#533483,color:#e0e0e0,stroke:#e94560
    style L4 fill:#e94560,color:#fff,stroke:#ff6b6b
    style L5 fill:#ff6b6b,color:#fff,stroke:#ffa07a
    style L6 fill:#ffa07a,color:#1a1a2e,stroke:#ffd700
    style L7 fill:#ffd700,color:#1a1a2e,stroke:#98fb98
    style L8 fill:#98fb98,color:#1a1a2e,stroke:#1a1a2e
    style AGENTS fill:#0d1b2a,color:#e0e0e0,stroke:#7b2fff
    style MANDATORY_DOCS fill:#0d1b2a,color:#e0e0e0,stroke:#7b2fff
    style CI_CHECKS fill:#0d1b2a,color:#e0e0e0,stroke:#ff6b6b
    style DEPLOY_TARGETS fill:#0d1b2a,color:#1a1a2e,stroke:#ffd700
```

---

## Diagram 2 — API & Tool Connectivity Map

```mermaid
flowchart LR
    subgraph GITHUB["☁️  GitHub Platform"]
        direction TB
        GH_ACTIONS["GitHub Actions\n(CI/CD runner)"]
        GH_ISSUES["GitHub Issues\n(task tracker)"]
        GH_PR["Pull Requests\n(code review)"]
        GH_PAGES["GitHub Pages\n(static hosting)"]
        GH_APP["GitHub App\n(authentication)"]
        DEPENDABOT["Dependabot\n(dependency updates)"]
        COPILOT_GH["GitHub Copilot\n(code review / fix)"]
    end

    subgraph AI["🤖  AI Services (via OpenRouter)"]
        direction TB
        OR_API["OpenRouter API\nopenrouter.ai"]
        CLAUDE_SONNET["Anthropic\nClaude Sonnet 4"]
        CLAUDE_OPUS["Anthropic\nClaude Opus 4"]
        GPT41["OpenAI\nGPT-4.1"]
        GPT4MINI["OpenAI\nGPT-4o-mini"]
        GEMINI["Google\nGemini 2.5 Pro"]
        OR_API --> CLAUDE_SONNET & CLAUDE_OPUS & GPT41 & GPT4MINI & GEMINI
    end

    subgraph MCP["🔌  MCP Servers (.mcp.json)"]
        direction TB
        PG["postgres-mcp\n(database)"]
        BRAVE["brave-search\n(web search)"]
        MEM["mem0\n(AI memory)"]
        FS["filesystem\n(file read/write)"]
        STRIPE_MCP["stripe\n(payments)"]
        GH_MCP["github\n(repo management)"]
        SLACK_MCP["slack\n(notifications)"]
    end

    subgraph DEPLOY["🚀  Deployment Infrastructure"]
        direction TB
        DO["DigitalOcean Droplet\n(web server)"]
        FASTLANE["Fastlane\n(mobile CI/CD)"]
        ELECTRON["Electron Builder\n(desktop packaging)"]
        PM2["PM2\n(process manager)"]
    end

    subgraph SECRETS["🔐  Secret Management"]
        direction TB
        GH_SECRETS["GitHub Secrets\n(encrypted at rest)"]
        GATEKEEPER["API_GATEKEEPER_STANDARD\n(policy enforcement)"]
        APP_TOKEN["create-github-app-token@v1\n(short-lived token)"]
    end

    %% Connections
    GH_ACTIONS -->|"triggers"| AI
    GH_ACTIONS -->|"reads"| MCP
    GH_ACTIONS -->|"deploys to"| DEPLOY
    GH_APP -->|"generates token for"| GH_ACTIONS
    GH_SECRETS -->|"injected into"| GH_ACTIONS
    GATEKEEPER -->|"governs"| GH_SECRETS
    APP_TOKEN -->|"issued by"| GH_APP

    style GITHUB fill:#161b22,color:#e6edf3,stroke:#30363d
    style AI fill:#0d1117,color:#e6edf3,stroke:#7b2fff
    style MCP fill:#0d1117,color:#e6edf3,stroke:#0f3460
    style DEPLOY fill:#0d1117,color:#e6edf3,stroke:#238636
    style SECRETS fill:#0d1117,color:#e6edf3,stroke:#e94560
```

---

## Diagram 3 — Gatekeeper / Agent Decision Tree

```mermaid
flowchart TD
    START(["🏁 New Task Arrives"])
    CLASSIFY{"What type\nof task?"}

    START --> CLASSIFY

    CLASSIFY -->|"api / backend / db"| BACKEND["Backend Agent\n+ /api-scaffold\n+ /schema-guard"]
    CLASSIFY -->|"vault / secret / token\n/ credential / api key"| VAULT["🔐 Vault Agent\n(ephemeral)\ncheck → provision → store → terminate"]
    CLASSIFY -->|"ui / react / next\n/ tailwind / storybook"| FRONTEND["Frontend Agent\n+ /ui-audit\n+ /accessibility-pass"]
    CLASSIFY -->|"data / sql\n/ analytics / etl"| DATA["Data Agent\n+ /model-audit\n+ /perf-plan\n(read-only by default)"]
    CLASSIFY -->|"sec / auth / jwt\n/ vuln / owasp"| SECURITY_AGENT["Security Agent\n(strict settings)\n+ pre-commit secret scan"]
    CLASSIFY -->|"ci / pipeline\n/ docker / deploy"| DEVOPS["DevOps Agent\n+ /pipeline-fix\n+ /image-hardening"]
    CLASSIFY -->|"docs / runbook\n/ handoff"| DOCS_AGENT["Documentation Agent\n+ /doc-sync\n+ /handoff-pack"]
    CLASSIFY -->|"tests/build/lint\nexit non-zero"| RECOVERY["🔁 Recovery Agent\n(Ralph Loop)\nself-heal → escalate"]

    VAULT -->|"credential stored"| DONE(["✅ Task Routed & Handled"])
    BACKEND --> DONE
    FRONTEND --> DONE
    DATA --> DONE
    SECURITY_AGENT --> DONE
    DEVOPS --> DONE
    DOCS_AGENT --> DONE
    RECOVERY -->|"fixed"| DONE
    RECOVERY -->|"5 failures"| HUMAN["👤 Human Escalation\n@midnghtsapphire"]

    style VAULT fill:#e94560,color:#fff
    style RECOVERY fill:#ff6b6b,color:#fff
    style HUMAN fill:#ffd700,color:#1a1a2e
    style DONE fill:#98fb98,color:#1a1a2e
```

---

## Diagram 4 — Documentation Auto-Sync Loop

```mermaid
sequenceDiagram
    participant DEV as Developer / AI Agent
    participant GIT as Git + GitHub
    participant ACTIONS as GitHub Actions
    participant SYNC as sync-flow-charts.js
    participant DOCS as docs/ folder
    participant FLOW as Flow Charts folder

    DEV->>GIT: git push (any change)
    GIT->>ACTIONS: trigger flow-chart-sync.yml
    ACTIONS->>SYNC: node scripts/sync-flow-charts.js
    SYNC->>DOCS: scan all .md files
    DOCS-->>SYNC: list of files + paths
    SYNC->>FLOW: read current metadata blocks
    SYNC->>FLOW: update SYNC-META-START blocks
    SYNC->>FLOW: patch any broken file references
    SYNC->>GIT: git commit "chore: auto-sync flow charts"
    GIT->>GIT: git push
    GIT-->>DEV: flow charts always current ✓

    Note over SYNC,FLOW: If a doc was renamed or moved,<br/>sync-flow-charts.js finds the new<br/>path and updates all references.
```

---

*Auto-maintained. Last sync: 2026-04-15. Script: `scripts/sync-flow-charts.js`*
