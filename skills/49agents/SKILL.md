# 49Agents Integration Skill

**Version:** 1.0.0  
**Status:** Active  
**Persona:** 🔭 Scout  
**Tags:** 49agents, agentic-ide, multi-agent, visual-dashboard, parallel-research

---

## What Is This

This skill enables AI agents to integrate with **49Agents**, an open-source "agentic IDE" that provides a unified 2D canvas interface for managing multiple AI agents, terminals, projects, and machines. Load this skill when working with 49Agents integration, visual agent monitoring, or parallel multi-agent research coordination.

---

## When to Load This Skill

Load this skill when:
- Setting up 49Agents integration
- Configuring visual agent dashboards
- Implementing parallel research workflows
- Managing multi-agent coordination
- Working with agent-hq desktop systems
- Creating 49Agents canvas configurations

**Trigger keywords:** `49agents`, `agentic IDE`, `agent dashboard`, `visual monitoring`, `parallel research`, `agent HQ`, `desktop agent`

---

## Core Concepts

### What is 49Agents

49Agents (<https://github.com/49Agents/49Agents>) is an agentic IDE that provides:

1. **Unified 2D Canvas** — All agents, terminals, and projects on one zoomable workspace
2. **Multi-Agent Coordination** — Multiple AI agents working in parallel with visual status
3. **Terminal Automation** — Each agent has sandboxed shell access
4. **Cross-Machine Management** — SSH-free remote machine access
5. **Integrated Tools** — Monaco editor, git graph, issue tables, markdown notes

### Integration with Revvel Standards

49Agents complements (not replaces) existing OpenRouter/GitHub Actions automation.

---

## Setup Instructions

### Local Installation

```bash
git clone https://github.com/49Agents/49Agents.git
cd 49Agents
./49ctl setup
./49ctl start
open http://localhost:1071
```

See `docs/49AGENTS_SETUP.md` for detailed instructions.

---

## See Also

- **49Agents Evaluation:** `docs/49AGENTS_EVALUATION.md`
- **49Agents Setup:** `docs/49AGENTS_SETUP.md`
- **OpenRouter Swarms Skill:** `skills/openrouter-swarms/SKILL.md`
- **Weekly Research Process:** `docs/WEEKLY_RESEARCH_PROCESS.md`

---

**Skill Status:** ✅ Active  
**Maintainer:** @midnghtsapphire  
**Last Updated:** April 30, 2026
