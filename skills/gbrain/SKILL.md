# GBrain Skill

## What Is GBrain

GBrain is your AI agent's **personal memory**. Without it, your AI starts every conversation with amnesia — it doesn't know the people you've talked to, the deals you're working on, the ideas you've captured, or anything from past sessions.

GBrain fixes that. It stores everything your agent learns in a searchable knowledge base made of plain markdown files. Before every response, your agent checks the brain. After every conversation, your agent writes what it learned back to the brain. The more you use it, the smarter it gets.

**Origin:** Derived from [https://github.com/garrytan/gbrain](https://github.com/garrytan/gbrain) — a production-grade personal knowledge base CLI and MCP server built on PGLite (embedded Postgres + pgvector).

---

## Why This Skill Is Needed

### The Problem It Solves

| Without GBrain | With GBrain |
|---|---|
| Agent forgets everything between sessions | Agent remembers everything forever |
| "Who is Jordan?" — agent has no idea | Agent pulls full dossier: last meeting, open threads, deals |
| You repeat context every conversation | Agent already has the context |
| Knowledge dies when the session ends | Knowledge compounds with every conversation |
| Agent answers from stale training data | Agent answers from YOUR personal knowledge |

### What It Is Derived From

GBrain was built to solve a real problem: AI agents are smart but stateless. Every conversation starts from zero. The creator (Garry Tan) built a markdown brain repo — one page per person, one page per company — and trained an agent to read it before every response and write to it after. Within a week: 10,000+ markdown files, 3,000+ people with full dossiers, 13 years of calendar data, 280+ meeting transcripts.

GBrain is the retrieval engine that makes that brain searchable. The brain repo is markdown files you can read and edit. GBrain is the indexed database on top of it. Your agent uses both.

---

## Core Architecture

```text
┌──────────────────┐    ┌───────────────┐    ┌──────────────────┐
│   Brain Repo     │    │    GBrain     │    │    AI Agent      │
│   (git repo of   │    │  (retrieval   │    │  (reads brain    │
│   markdown files)│───>│   engine)     │<──>│   before reply,  │
│                  │    │               │    │   writes after)  │
│   human-editable │    │  PGLite +     │    │                  │
│   source of truth│<───│  pgvector +   │    │   skills define  │
│                  │    │  hybrid search│    │   HOW to use it  │
└──────────────────┘    └───────────────┘    └──────────────────┘
```

**Three layers:**
1. **Brain Repo** — plain markdown files in a git repo (people/, companies/, concepts/, etc.)
2. **GBrain CLI** — indexes markdown into Postgres, exposes 30 MCP tools and a CLI
3. **AI Agent** — reads and writes through both layers on every conversation

---

## Dependencies

| Dependency | Required? | Purpose | Install |
|---|---|---|---|
| **Bun** (runtime) | ✅ Required | Runs gbrain CLI | `curl -fsSL https://bun.sh/install \| bash` |
| **GBrain CLI** | ✅ Required | Core tool | `bun add -g github:garrytan/gbrain` |
| **OpenAI API Key** | ⚡ Recommended | Vector embeddings (better search) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic API Key** | ⭕ Optional | Multi-query expansion (smarter search) | [console.anthropic.com](https://console.anthropic.com) |
| **Supabase** | ⭕ Optional | Scale to 1000+ files / multi-device | [supabase.com](https://supabase.com) — Pro $25/mo |
| **ngrok** | ⭕ Optional | Remote MCP access / voice | [ngrok.com](https://ngrok.com) — Hobby $8/mo |

**Default setup (PGLite):** No server, no account, no API keys required. Local embedded Postgres. Keyword search works immediately.

---

## Setup Workflow

### Phase 1: Install GBrain
```bash
# Install Bun (fast JavaScript runtime)
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# Install GBrain globally
bun add -g github:garrytan/gbrain

# Verify
gbrain --version
```

### Phase 2: Initialize the Brain Database
```bash
gbrain init           # Creates local PGLite database — done in 2 seconds
gbrain doctor --json  # Health check — all items should pass
```

### Phase 3: Create or Connect Your Brain Repo
```bash
# Option A: New brain repo
mkdir -p ~/brain && cd ~/brain && git init

# Option B: Existing notes (Obsidian, Notion, Logseq, etc.)
# Export to markdown and point gbrain at the folder
```

### Phase 4: Set Up Directory Structure (MECE Schema)
```text
~/brain/
├── people/          # One file per person (name, role, company, history)
├── companies/       # One file per organization
├── concepts/        # Ideas, frameworks, mental models
├── projects/        # Ongoing and completed work
├── meetings/        # Meeting notes and transcripts
├── media/           # Books, articles, podcasts you've captured
└── daily/           # Daily notes and journal entries
```

### Phase 5: Import and Index
```bash
cd ~/gbrain
gbrain import ~/brain/ --no-embed    # Fast import (keyword search only)
gbrain embed --stale                 # Generate vector embeddings (needs OpenAI key)
gbrain query "key themes in my notes?"
```

### Phase 6: Add API Keys (Optional, for better search)
```bash
export OPENAI_API_KEY=sk-...         # Add to ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY=sk-ant-...  # Add to ~/.zshrc or ~/.bashrc
```

### Phase 7: Connect to Your AI Agent (MCP)
Add to your MCP client configuration (`~/.claude/server.json` for Claude Code):
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
For Cursor: Settings > MCP Servers > add the same JSON block.

---

## The Brain-Agent Loop (Core Pattern)

Every conversation should follow this loop:

```text
Message received
  → BEFORE responding: gbrain search "<key entities from message>"
  → Detect entities: people, companies, ideas mentioned
  → Read existing brain pages for those entities
  → Respond WITH full context from brain
  → AFTER responding: write new information back to brain pages
  → gbrain sync && gbrain embed --stale (picks up changes)
```

This is what makes the knowledge compound. Each cycle adds context. The agent never starts from zero.

---

## Key Commands

| Command | What It Does |
|---|---|
| `gbrain init` | Initialize local brain database |
| `gbrain import ~/brain/` | Index all markdown files |
| `gbrain embed --stale` | Generate vector embeddings for new/changed files |
| `gbrain search "Jordan"` | Hybrid keyword + vector search |
| `gbrain query "prep for meeting with Sarah"` | LLM-powered synthesis query |
| `gbrain get people/jordan.md` | Get a specific brain page |
| `gbrain sync --repo ~/brain` | Sync latest changes to database |
| `gbrain doctor --json` | Health check all systems |
| `gbrain serve` | Start MCP server (for AI agents) |
| `gbrain check-update --json` | Check for updates (never auto-install) |

---

## Integrations (Recipes)

Each integration is a self-contained installer. Your agent reads the recipe, asks for API keys, validates, and runs a smoke test.

| Integration | What It Does | Requires |
|---|---|---|
| `recipes/email-to-brain.md` | Gmail → entity brain pages | Gmail credentials |
| `recipes/calendar-to-brain.md` | Google Calendar → daily pages | Gmail credentials |
| `recipes/meeting-sync.md` | Meeting transcripts → brain pages | Circleback |
| `recipes/x-to-brain.md` | Twitter/X → brain pages | Twitter API |
| `recipes/twilio-voice-brain.md` | Phone calls → brain pages | Twilio + ngrok |
| `recipes/ngrok-tunnel.md` | Public URL for remote MCP access | ngrok account |

Run `gbrain integrations list` to see status of all configured integrations.

---

## Dream Cycle (Nightly Automation)

Set up recurring cron jobs to keep the brain alive and growing:

```bash
# Every 15 minutes — live sync
*/15 * * * * gbrain sync --repo ~/brain && gbrain embed --stale

# Daily at 6am — health check
0 6 * * * gbrain doctor --json

# Nightly at 2am — dream cycle (entity sweep, memory consolidation)
# See: ~/gbrain/docs/guides/cron-schedule.md for full protocol
```

The dream cycle is what makes the brain compound while you sleep:
- Entity sweep across all conversations
- Fix broken citations and dead links
- Consolidate duplicate entries
- Enrich missing entity pages

---

## MCP Tools (30 Available)

When running as MCP server (`gbrain serve`), your agent gets these tools:

| Tool | Action |
|---|---|
| `get_page` | Read a brain page by path |
| `put_page` | Write/update a brain page |
| `search` | Hybrid keyword + vector search |
| `query` | LLM-synthesized answer from brain |
| `add_link` | Create backlink between pages |
| `traverse_graph` | Walk the knowledge graph |
| `sync_brain` | Sync latest changes |
| `file_upload` | Add document to brain |
| + 22 more | See `gbrain --help` for full list |

---

## Scaling: When to Migrate to Supabase

Stay on PGLite (local, free) until you hit one of these:
- 1,000+ brain files
- Need multi-device access
- Need remote MCP from multiple AI clients
- Brain exceeds available RAM

Then run: `gbrain migrate --to supabase`

---

## Integration with Revvel Standards

| Revvel Standard | GBrain Integration |
|---|---|
| `MCP_STANDARD.md` | Add `gbrain` to your project's `.mcp.json` |
| `AGENT_FACTORY_STANDARD.md` | Use gbrain as agent memory layer |
| `AUDREY_AUTONOMOUS_AGENT_STANDARD.md` | Brain-agent loop is the core pattern |
| `skills/context-management/SKILL.md` | GBrain preserves context between sessions |
| `skills/memory-pruning/SKILL.md` | Use gbrain to archive pruned memories |

To add gbrain to your Revvel project's MCP config, add this entry to your `.mcp.json`:
```json
"gbrain": {
  "command": "gbrain",
  "args": ["serve"]
}
```

---

## Success Criteria

- Agent reads brain before every response
- Agent writes new knowledge after every conversation
- Brain grows with every interaction (compounding effect)
- Zero repeated context — agent already knows what it's been told
- Nightly dream cycle runs autonomously
- All integrations pass `gbrain integrations doctor`

---

## Rule

**Read first. Write after. The brain-agent loop is not optional.** An agent that doesn't read the brain before responding and write after is just using GBrain as a search engine. The whole point is the compounding loop. Set it up. Trust it. Let it run.
