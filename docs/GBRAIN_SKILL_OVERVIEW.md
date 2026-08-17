# GBrain Skill — Full Overview

**Status:** Production-Ready Skill  
**Derived From:** [https://github.com/garrytan/gbrain](https://github.com/garrytan/gbrain)  
**Packaged By:** Audrey Evans (MIDNGHTSAPPHIRE) for Revvel Standards  
**Install:** See `install/README.md` for Mac and Windows one-click installers

---

## Table of Contents
1. [What Is GBrain?](#1-what-is-gbrain)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [What It Is Derived From](#3-what-it-is-derived-from)
4. [Why This Skill Is Needed for Revvel Projects](#4-why-this-skill-is-needed-for-revvel-projects)
5. [Architecture Deep Dive](#5-architecture-deep-dive)
6. [Complete Dependency Map](#6-complete-dependency-map)
7. [Scripts and Automation](#7-scripts-and-automation)
8. [MCP Integration](#8-mcp-integration)
9. [Installation Summary](#9-installation-summary)
10. [Project Structure (gbrain repo)](#10-project-structure-gbrain-repo)
11. [Revvel Standards Integration](#11-revvel-standards-integration)

---

## 1. What Is GBrain

GBrain is a **personal knowledge base CLI and MCP server** that gives an AI agent a permanent, searchable, compounding memory. It is the foundational memory layer for production AI agents.

Without GBrain, every AI conversation starts from zero. The AI has no persistent knowledge about the user's world — their contacts, projects, decisions, history. Every session must re-establish context from scratch.

With GBrain, the AI has a brain: a structured knowledge base of markdown files indexed in an embedded Postgres database with hybrid keyword + vector search. The AI reads from it before every response and writes back to it after every conversation. The knowledge compounds.

### In Plain Language

Think of GBrain as a notebook that:
- Your AI reads **before** every answer (so it always has context)
- Your AI **writes into** after every conversation (so it keeps getting smarter)
- **You can also read and edit** (it's just plain text files)
- Grows automatically over time (meetings, emails, calls, notes all flow in)
- Runs entirely on your computer (no data sent to the cloud unless you choose)

---

## 2. The Problem It Solves

### The Stateless Agent Problem

Every modern AI agent — Claude, GPT, Cursor, Copilot — has a fundamental flaw: **statelessness**. Each conversation begins with amnesia. The agent knows nothing about:

- Who you are or what you do
- Your clients, contacts, and relationships
- Your projects, deals, and ongoing work
- Your previous decisions and why you made them
- Your ideas, frameworks, and mental models
- What happened in your meetings and calls

This means users must constantly re-explain context. It means AI responses lack personal relevance. It means knowledge captured in one session evaporates before the next.

### The Compounding Intelligence Gap

Without persistent memory, AI tools are powerful but not **personal**. They can answer general questions but not questions like:

- *"Who should I loop in on this deal based on my past conversations?"*
- *"What did I learn about this person last time we met?"*
- *"What have I said about the relationship between X and Y over the past year?"*
- *"Prep me for my meeting with Sarah — pull everything you know about her."*

These questions require the agent to know YOUR world. GBrain is how the agent learns your world and keeps learning it.

### What GBrain Delivers

| Problem | GBrain Solution |
|---|---|
| Agent forgets between sessions | Permanent local knowledge base |
| Agent doesn't know your contacts | People pages with full dossiers |
| Agent can't search your past | Hybrid keyword + vector search |
| Knowledge is locked in chat logs | Structured markdown, human-readable |
| AI is generic, not personal | Brain grows with your actual life |
| Multi-source data is siloed | Integrations: email, calendar, voice, Twitter |
| Agent needs to be re-briefed | Brain-agent loop: read before, write after |

---

## 3. What It Is Derived From

### Origin Story

GBrain was created by Garry Tan ([garrytan/gbrain](https://github.com/garrytan/gbrain)) from a real problem in production AI agent deployment.

Garry was running an [OpenClaw](https://openclaw.ai) agent and started building a markdown brain repo — one page per person, one page per company, compiled truth on top, append-only timeline on the bottom. The agent got smarter the more it knew. Within a week:

- 10,000+ markdown files
- 3,000+ people with compiled dossiers
- 13 years of calendar data
- 280+ meeting transcripts
- 300+ captured original ideas

The agent ran the dream cycle while Garry slept: scanned every conversation, enriched missing entities, fixed broken citations, consolidated memory. Each morning the brain was smarter than the night before.

GBrain is the retrieval engine that makes this brain searchable and actionable. The patterns that work are documented in `GBRAIN_SKILLPACK.md` — the agent playbook.

### Technical Foundation

GBrain builds on:
- **PGLite** — embedded Postgres (WebAssembly) with pgvector. No server, no subscription, no setup. Runs in the process.
- **pgvector** — vector similarity search for semantic/embedding-based retrieval
- **Hybrid search (RRF)** — combines keyword (BM25) and vector search using Reciprocal Rank Fusion for best results
- **Bun** — fast JavaScript/TypeScript runtime with native npm compatibility
- **MCP (Model Context Protocol)** — Anthropic's open standard for connecting AI agents to tools

### Relationship to OpenClaw / Hermes Agent

GBrain is the **knowledge layer**. OpenClaw/Hermes are the **agent execution layer**. They are complementary:

| Layer | What It Stores | How to Query |
|---|---|---|
| GBrain | People, companies, meetings, ideas, media | `gbrain search`, `gbrain query`, `gbrain get` |
| Agent memory | Preferences, decisions, operational config | `memory_search` |
| Session context | Current conversation | Automatic |

---

## 4. Why This Skill Is Needed for Revvel Projects

### Context in Revvel Standards

Revvel and MIDNGHTSAPPHIRE projects use the **EXRUP methodology** (Extreme Rapid Programming) — maximum speed, one-iteration delivery, multi-agent AI orchestration. The entire stack is AI-first.

For multi-agent AI systems to function effectively across long-running projects (weeks, months), the agents must have persistent memory. Without it:

- Agents re-discover the same context repeatedly
- Project continuity breaks between sessions
- Onboarding new agents to ongoing projects is expensive
- Decisions made in one session are lost in the next

GBrain is the memory layer that makes the EXRUP methodology sustainable over time.

### Connection to Existing Revvel Skills

| Revvel Skill | How GBrain Extends It |
|---|---|
| `context-management` | GBrain is the cross-session memory store. Context handoffs become brain write operations. |
| `memory-pruning` | GBrain's dream cycle handles archival and consolidation. Pruned items can be archived to brain instead of deleted. |
| `model-router` | GBrain queries (`gbrain query`) use LLM-powered synthesis — the model router can optimize which model handles these. |
| `wrap-up` | The "Remember It" phase maps directly to a brain write operation (`gbrain sync`). |
| `todo-breakdown` | Project context and past decisions live in the brain, informing better TODO analysis. |

### Connection to Revvel Standards Documents

| Standard | GBrain Role |
|---|---|
| `AGENT_FACTORY_STANDARD.md` | GBrain is the memory backend for agent factories |
| `AUDREY_AUTONOMOUS_AGENT_STANDARD.md` | Brain-agent loop is the persistence mechanism for autonomous agents |
| `MCP_STANDARD.md` | GBrain registers as an MCP server in `.mcp.json` |
| `CONCURRENT_DEVELOPMENT_STANDARD.md` | Shared brain enables context sharing across parallel agent instances |

---

## 5. Architecture Deep Dive

```text
┌─────────────────────────────────────────────────────────────┐
│                    GBrain System                             │
│                                                             │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────┐  │
│  │  Brain Repo  │   │   GBrain CLI    │   │  AI Agent   │  │
│  │  (git repo)  │   │  + MCP Server   │   │  (any LLM)  │  │
│  │             │   │                 │   │             │  │
│  │  markdown   │──>│  PGLite         │<->│ 30 MCP      │  │
│  │  files:     │   │  (embedded      │   │ tools:      │  │
│  │             │<──│  Postgres +     │   │ get_page    │  │
│  │  people/    │   │  pgvector)      │   │ put_page    │  │
│  │  companies/ │   │                 │   │ search      │  │
│  │  concepts/  │   │  Hybrid Search  │   │ query       │  │
│  │  projects/  │   │  (BM25 +        │   │ add_link    │  │
│  │  meetings/  │   │   vector + RRF) │   │ sync_brain  │  │
│  │  media/     │   │                 │   │ + 24 more   │  │
│  │  daily/     │   │  Dream Cycle    │   │             │  │
│  │             │   │  (cron jobs)    │   │             │  │
│  └──────────────┘   └─────────────────┘   └─────────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Integrations (Recipes)                                │ │
│  │  email  calendar  voice  twitter  meetings  docs       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
External Signal (meeting, email, call, tweet)
  → Integration recipe collects it
  → Agent writes to brain (put_page, file_upload)
  → gbrain sync indexes the new markdown
  → gbrain embed --stale generates new embeddings
  → Knowledge is searchable immediately

Next conversation:
  → Agent receives message
  → Detects entities (people, companies, concepts)
  → gbrain search "<entities>"
  → Pulls relevant brain pages
  → Responds with full context
  → Writes new knowledge back
  → Loop repeats → brain compounds
```

### Storage Options

| Option | When to Use | Setup |
|---|---|---|
| **PGLite (default)** | <1000 files, single device | `gbrain init` — zero config |
| **Supabase** | 1000+ files, multi-device, remote MCP | `gbrain migrate --to supabase` |

---

## 6. Complete Dependency Map

### Required
```text
Bun >= 1.0
  └── GBrain CLI (github:garrytan/gbrain)
       ├── PGLite (embedded Postgres)
       └── pgvector (vector similarity)
```

### Optional (unlock features)
```text
OpenAI API Key
  └── text-embedding-3-large (vector embeddings — better search)

Anthropic API Key
  └── Claude Haiku (multi-query expansion, LLM chunking)

Supabase account
  └── Managed Postgres + pgvector (for scale)
      └── Connection URL from Supabase dashboard

ngrok account
  └── Public tunnel for remote MCP access
      └── For voice recipes, Claude Desktop, Perplexity

Twilio (voice integration)
  └── Phone number, Account SID, Auth Token
  └── Requires ngrok tunnel

Gmail OAuth (email + calendar integrations)
  └── Via ClawVisor or Google OAuth
  └── Credential Gateway recipe

Twitter/X API (x-to-brain integration)
  └── Twitter API v2 credentials

Circleback (meeting sync)
  └── Circleback account + API key
```

### Installation Environment
```text
Mac: macOS 10.15+ (Catalina or newer)
     curl (built into macOS)
     bash (built into macOS)
     Terminal.app or iTerm2

Windows: Windows 10 version 1803+ (or Windows 11)
         curl (built into Windows 10 1803+)
         PowerShell 5+ (built into Windows)
         Command Prompt or Windows Terminal
```

---

## 7. Scripts and Automation

### Core CLI Commands
```bash
gbrain init                    # Initialize local database
gbrain import <path>           # Index markdown files
gbrain import <path> --no-embed  # Index without AI embeddings (fast)
gbrain embed --stale           # Generate embeddings for new/changed files
gbrain sync --repo <path>      # Sync changes from brain repo
gbrain search "<query>"        # Hybrid keyword + vector search
gbrain query "<question>"      # LLM-synthesized answer
gbrain get <path>              # Get a specific brain page
gbrain doctor --json           # Health check (JSON output)
gbrain serve                   # Start MCP server (stdio)
gbrain migrate --to supabase   # Migrate to managed Postgres
gbrain check-update --json     # Check for updates
gbrain integrations list       # List integration status
gbrain integrations doctor     # Health check all integrations
```

### Cron Schedule (Dream Cycle)
```bash
# Live sync every 15 minutes
*/15 * * * * gbrain sync --repo ~/brain && gbrain embed --stale

# Daily health check at 6am
0 6 * * * gbrain doctor --json >> ~/brain/logs/health.log

# Weekly re-index
0 3 * * 0 gbrain embed --stale

# Nightly dream cycle at 2am (entity sweep, consolidation)
# Full protocol: ~/gbrain/docs/guides/cron-schedule.md
0 2 * * * <see cron-schedule.md for full protocol>
```

### Upgrade
```bash
cd ~/gbrain && git pull origin main && bun install
```

---

## 8. MCP Integration

### What Is MCP

MCP (Model Context Protocol) is Anthropic's open standard for connecting AI agents to external tools. GBrain implements MCP, making it compatible with Claude Code, Cursor, Windsurf, and any other MCP-compatible AI tool.

### The 30 MCP Tools GBrain Exposes

| Category | Tools |
|---|---|
| **Reading** | `get_page`, `search`, `query`, `traverse_graph` |
| **Writing** | `put_page`, `add_link`, `file_upload` |
| **Sync** | `sync_brain`, `import_directory` |
| **Health** | `doctor`, `check_update` |
| **Integrations** | `list_integrations`, `integrations_doctor` |
| **Schema** | `list_pages`, `get_schema`, `describe_graph` |
| + 18 more | Run `gbrain --help` for full list |

### Adding to `.mcp.json` (Revvel Standard)

For any Revvel project, add GBrain to the project's `.mcp.json`:
```json
{
  "mcpServers": {
    "gbrain": {
      "command": "gbrain",
      "args": ["serve"]
    }
  }
}
```

### Remote MCP (Multi-Device)
For access across devices or from Claude Desktop:
```bash
# Run gbrain serve behind an HTTP tunnel
gbrain serve --http   # or: ngrok http 8787

# Add bearer token for security
gbrain auth create "my-client-name"
```

---

## 9. Installation Summary

### Mac (Double-Click Installer)
1. Download `install/mac/install-gbrain.command`
2. Right-click → Open → Open (bypass Gatekeeper)
3. Follow the prompts in Terminal
4. Takes ~5-10 minutes

### Windows (Double-Click Installer)
1. Download `install/windows/install-gbrain.bat`
2. Double-click → "More info" → "Run anyway" (bypass SmartScreen)
3. Follow the prompts in Command Prompt
4. Takes ~5-10 minutes

### Manual Install (Any Platform)
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash    # Mac/Linux
# Windows PowerShell: irm bun.sh/install.ps1 | iex

# Add to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Install GBrain
bun add -g github:garrytan/gbrain

# Initialize
gbrain init
gbrain doctor

# Create brain repo
mkdir -p ~/brain/{people,companies,concepts,projects,meetings,media,daily}
cd ~/brain && git init
```

---

## 10. Project Structure (gbrain repo)

After installation, `~/gbrain/` contains:

```text
~/gbrain/
├── docs/
│   ├── GBRAIN_SKILLPACK.md     # The agent playbook — READ THIS
│   ├── GBRAIN_RECOMMENDED_SCHEMA.md  # MECE directory structure
│   ├── GBRAIN_VERIFY.md        # 6 verification checks
│   ├── guides/
│   │   └── cron-schedule.md    # Dream cycle setup
│   ├── integrations/           # Integration guides
│   └── mcp/                    # MCP setup per client
├── recipes/
│   ├── email-to-brain.md       # Gmail → brain pages
│   ├── calendar-to-brain.md    # Google Calendar → brain pages
│   ├── meeting-sync.md         # Transcripts → brain pages
│   ├── x-to-brain.md           # Twitter → brain pages
│   ├── twilio-voice-brain.md   # Phone calls → brain pages
│   ├── ngrok-tunnel.md         # Public tunnel setup
│   └── credential-gateway.md   # Gmail/Calendar OAuth
├── skills/
│   ├── ingest/SKILL.md         # How to import meetings, docs, articles
│   ├── query/SKILL.md          # 3-layer search with synthesis + citations
│   ├── maintain/SKILL.md       # Periodic health: stale pages, orphans
│   ├── enrich/SKILL.md         # Enrich pages from external APIs
│   ├── briefing/SKILL.md       # Daily briefing with meeting prep
│   └── migrate/SKILL.md        # Migrate from Obsidian, Notion, Logseq
├── src/                        # GBrain source code (TypeScript)
└── package.json                # Dependencies (managed by Bun)
```

---

## 11. Revvel Standards Integration

### How GBrain Fits Into the Revvel Ecosystem

```text
Revvel Standards Ecosystem
│
├── EXRUP Methodology (speed, one-iteration delivery)
│   └── Requires: agent memory for long-running projects
│       └── Solution: GBrain
│
├── Agent Factory Standard
│   └── Agents need memory — GBrain is the memory backend
│
├── Autonomous Agent Standard (Audrey)
│   └── Autonomous agents need persistent context
│       └── GBrain brain-agent loop IS the persistence mechanism
│
├── MCP Standard
│   └── GBrain is a first-class MCP server
│       └── Add to .mcp.json for any project
│
└── Skills
    ├── context-management → GBrain stores cross-session context
    ├── memory-pruning → GBrain dream cycle handles archival
    ├── wrap-up → "Remember It" = brain write operation
    └── gbrain (THIS SKILL) → the brain itself
```

### Activation in a Revvel Project

1. Install GBrain (see `install/README.md`)
2. Add to project `.mcp.json`:
   ```json
   "gbrain": { "command": "gbrain", "args": ["serve"] }
   ```
3. Run `bash ../revvel-standards/scripts/setup-mcp.sh full` to include all project MCP tools
4. Read `~/gbrain/docs/GBRAIN_SKILLPACK.md` and add the brain-agent loop to agent instructions
5. Run first import: `gbrain import ~/brain/ && gbrain embed --stale`
6. Set up cron schedule for dream cycle

---

*GBrain is derived from [garrytan/gbrain](https://github.com/garrytan/gbrain). Packaged as part of [Revvel Standards](https://github.com/midnghtsapphire/revvel-standards) by Audrey Evans (MIDNGHTSAPPHIRE).*
