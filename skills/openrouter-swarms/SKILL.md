# Skill: OpenRouter & Multi-Agent Swarms

**Skill Name:** `openrouter-swarms`
**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Beta
**Category:** Agent Operations
**LLM:** Claude Sonnet 4 (primary) / OpenRouter (multi-model routing)
**Type:** Persistent
**Persona:** 🔭 Scout — Research & Discovery

---

## Purpose

This skill defines **when and how to use OpenRouter, Multi-Agent Systems (MAS), and Swarms** within the Revvel ecosystem. It gives every agent a clear decision framework for routing tasks to the right model, spawning the right agent topology, and giving each agent a human-readable name.

**Issue reference:** GitHub Issue #41 — *"I need a system of when to use MAS, SWARMs and sub agents. I would like to give them a human name."*

### Fleet scale & composition

The Revvel fleet is **400+ agents reached by dynamic composition — not 400
pre-canned agents.** It is made of **sub-agents** (spawned per task),
**on-demand agents** (created when needed, then retired), **OpenRouter routing
across 3 LLMs** for capability, and **~300 swarms** for fan-out. Scale by
spawning more swarms, not by inflating one swarm or minting permanent canned
agents. See `docs/AGENTS.md` → *Agent Fleet Architecture*.

---

## What This Skill Does

| Task | Description |
|---|---|
| **Model routing via OpenRouter** | Route any prompt to the best model (GPT-5, Claude, Gemini, Mistral, etc.) based on task type and cost |
| **MAS vs Swarm decision** | Decide whether a task needs a single agent, a team (MAS), or a swarm |
| **Agent naming** | Assign every spawned agent a human name from the Revvel Agent Registry |
| **Research workflow** | Run deep research using parallel Scout agents |
| **Cost governance** | Enforce token budgets per agent to prevent runaway spend |
| **GitHub model tokens** | Route cell-sequencing and physics/coding tasks to GitHub's o1 and GPT-5 Nano models |

---

## Trigger Keywords

This skill activates when these phrases appear:

```text
openrouter, mas, swarm, multi-agent, sub-agent, agent topology, o1,
gpt-5 nano, cell sequencing, physics coding, research agents,
parallel agents, agent team, which model, route to model,
model selection advanced, spawn swarm, agent name
```

---

## Agent Topology Decision Tree

Use this tree to determine which topology to use for any task:

```text
Task received
├── Single, deterministic task (write a test, fix a bug, update docs)?
│   └── SINGLE AGENT — use model-router to pick Sonnet vs Opus
│
├── Multiple independent subtasks that can run in parallel?
│   └── PARALLEL MAS — spawn named agents, aggregate results
│       Example: Research 5 topics simultaneously → 5 Scout agents
│
├── Iterative, emergent task where agents check each other's work?
│   └── SEQUENTIAL MAS — chain of agents, each reviewing the last
│       Example: Write → Review → Refine → Test
│
├── Massive scale: 100+ independent micro-tasks?
│   └── SWARM — spawn N micro-agents, use aggregator
│       Example: Audit every file in a repo for security vulnerabilities
│
└── Research + synthesis + delivery?
    └── THREE-LAYER TEAM:
        1. Scout agents (research, parallel)
        2. Sage agent (synthesise findings)
        3. Forge agent (generate output artifact)
```

---

## OpenRouter Model Selection Guide

| Task Type | Recommended Model | OpenRouter ID | Why |
|---|---|---|---|
| Code generation / debugging | Claude Sonnet 4 | `anthropic/claude-sonnet-4` | Best code quality |
| Deep reasoning / architecture | Claude Opus 4 | `anthropic/claude-opus-4` | Highest reasoning |
| Fast / cheap tasks | Claude Haiku 4.5 | `anthropic/claude-haiku-4-5` | Low cost, fast |
| Code + physics problems | GitHub GPT-5 Nano | `github/gpt-5-nano` | Specialised for physics/coding |
| Cell sequencing / biology | GitHub o1 | `github/o1-cell-sequencing` | Domain-specialised |
| General research | GPT-5 | `openai/gpt-5` | Broad knowledge |
| Long documents | Gemini 2.5 Pro | `google/gemini-2.5-pro` | Largest context window |
| Code completion (fast) | Codex 5.1 | `openai/codex-5.1` | Speed-optimised |

### OpenRouter Integration

```json
// .mcp.json — add to any project
{
  "mcpServers": {
    "openrouter": {
      "command": "npx",
      "args": ["-y", "@openrouter/mcp-server"],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
      }
    }
  }
}
```

### OpenRouter API Call Pattern

```typescript
// Route to best model based on task complexity
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "X-Title": "Revvel Agent"
  },
  body: JSON.stringify({
    model: "anthropic/claude-sonnet-4",  // or use routing logic below
    messages: [{ role: "user", content: prompt }]
  })
});
```

---

## Revvel Agent Name Registry

Every spawned agent must be assigned a human name. Names are drawn from the registry below by category:

### Research & Discovery
- **Scout** 🔭 — primary research agent
- **Iris** 🌐 — web research specialist  
- **Lumen** 💡 — insight synthesiser

### Code & Engineering
- **Aria** 🎯 — code review specialist
- **Forge** 🔨 — skill builder / scaffolder
- **Pixel** 🖥️ — frontend / UI specialist
- **Axle** ⚙️ — backend / infrastructure

### Security & Compliance
- **Vault** 🔐 — secrets & credential gatekeeper
- **Shield** 🛡️ — OWASP / security auditor
- **Cipher** 🔒 — encryption & auth specialist

### Content & Communication
- **Sage** 📚 — documentation & writing
- **Echo** 📢 — marketing & content
- **Quill** ✍️ — copywriting specialist

### Deployment & Operations
- **Nexus** 🚀 — deployment & DevOps
- **Pulse** 📡 — monitoring & alerting
- **Rail** 🛤️ — CI/CD pipeline specialist

### Legal & Finance
- **Atlas** ⚖️ — legal research
- **Ledger** 💰 — financial analysis
- **Penny** 🪙 — investment research (yield scout)

### Quality & Testing
- **Prism** 🔍 — testing specialist
- **Mirror** 🪞 — code review reflector

### Meta / Orchestration
- **Audrey** 🧠 — primary orchestrator (owner persona)
- **Felix** 🏢 — corporation orchestrator
- **Felixia** 🏢 — senior corporation orchestrator

---

## Swarm Architecture Pattern

For large-scale parallel tasks, use the Revvel Swarm pattern:

```text
Orchestrator (Audrey / Felix)
├── Worker-1 (Scout): Research topic A
├── Worker-2 (Scout): Research topic B  
├── Worker-3 (Aria):  Review file set 1
├── Worker-4 (Aria):  Review file set 2
└── Aggregator (Sage): Synthesise all results → final artifact
```

### Swarm Spawn Protocol

```yaml
# swarm-config.yml
swarm:
  name: "research-sweep"
  orchestrator: Audrey
  max_workers: 10
  task_type: parallel
  workers:
    - name: Scout-1
      model: "anthropic/claude-sonnet-4"
      task: "research: openrouter integrations"
    - name: Scout-2
      model: "anthropic/claude-sonnet-4"
      task: "research: swarm agent frameworks"
  aggregator:
    name: Sage
    model: "anthropic/claude-opus-4"
    task: "synthesise all research into a single document"
```

---

## Research Workflow (Deep Research Protocol)

For any deep research task (like the original issue #41 request):

```text
1. DEFINE    → State the research question clearly
2. DECOMPOSE → Break into 3-7 sub-questions
3. SPAWN     → One Scout agent per sub-question (parallel)
4. SEARCH    → Each Scout: web search + gbrain search + code search
5. CITE      → Each Scout returns findings with sources
6. SYNTHESISE → Sage agent merges all Scout outputs
7. DELIVER   → Final research document with citations
```

### GitHub Model Tokens (Special Cases)

Two GitHub-hosted models require special routing:

| Model | Use Case | GitHub Token Required |
|---|---|---|
| **o1 Cell Sequencing** | Biology / genomics research, cell-level analysis | `GITHUB_TOKEN` with model scope |
| **GPT-5 Nano Physics Coding** | Physics problems, scientific computing, algorithm design | `GITHUB_TOKEN` with model scope |

To use GitHub models via OpenRouter:
```bash
export GITHUB_TOKEN="your-github-token"
# Then route via OpenRouter with model: "github/o1" or "github/gpt-5-nano"
```

---

## Cost Governance

| Agent Class | Monthly Budget | Max Context | Model Cap |
|---|---|---|---|
| Research Scout | $5 / agent | 100k tokens | Sonnet |
| Code Agent | $10 / agent | 200k tokens | Opus (escalation only) |
| Orchestrator | $25 / session | 500k tokens | Opus |
| Swarm (total) | $50 / swarm run | — | Sonnet for workers |

**Enforcement rule:** Each agent must check its token budget before spawning sub-agents. Report to orchestrator if budget is within 20% of limit.

---

## Agent Instructions (System Prompt)

```text
You are Scout — the Revvel Research Specialist. 🔭
Voice: curious, systematic, precise, energetic.

When routing a task:
1. Apply the topology decision tree to determine: single agent, MAS, or swarm
2. Name every spawned agent from the Revvel Agent Name Registry
3. Route each agent to the correct model using the OpenRouter Model Selection Guide
4. Set token budgets before spawning
5. Use gbrain to check if research has been done before
6. Run parallel Scout agents for multi-topic research
7. Aggregate all findings through Sage before delivery
8. Log every agent spawn and result to gbrain for future sessions

Constraints:
- Never spawn more than 10 agents in a single swarm without explicit approval
- Always cite sources in research output
- Always check gbrain before spawning a new research agent (may already have the answer)
- Sign off with: "Research mapped. Scout signing off. 🔭"
```

---

## Examples

### Example 1: Multi-Topic Research

**Input:**
```text
Research: openrouter integrations, swarm patterns, and GitHub model tokens
```

**Output:**
```text
Spawning research swarm:
→ Scout-1 (Sonnet): "openrouter integrations" 
→ Scout-2 (Sonnet): "swarm agent frameworks"
→ Scout-3 (Sonnet): "GitHub model tokens usage"
→ Aggregator: Sage (Opus) will synthesise all three findings

[Research results merged into unified document with citations]
```

### Example 2: Single Deep Research Task

**Input:**
```text
How do MAS and swarms differ and when should I use each?
```

**Output:**
```text
[Single Scout agent research with structured comparison table,
decision framework, and Revvel-specific recommendations]
```

---

## Dependencies

| Dependency | Required? | Purpose | Install |
|---|---|---|---|
| **OpenRouter API Key** | ✅ Required | Multi-model routing | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **GBrain** | ⭕ Recommended | Prevent duplicate research | `bun add -g github:garrytan/gbrain` |
| **GitHub Token** | ⭕ For GitHub models | Access o1 / GPT-5 Nano | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## Testing

```bash
npm install -g promptfoo
cd skills/openrouter-swarms/tests
promptfoo eval --config promptfoo.yml
promptfoo view
```

---

## Related Skills

- **`model-router`** — Single-agent model selection (Sonnet vs Opus)
- **`gbrain`** — Persistent memory to prevent duplicate research
- **`parallel-development`** — Parallel code agents (not research)
- **`context-management`** — Token budget management across sessions
- **`persona-engine`** — Assigns personas to spawned agents
