# Prompt Routing Skill

**Version:** 1.0.0  
**Status:** Planned  
**Category:** Automation / Orchestration

---

## Purpose

Automatically detect agent prompts in code comments, issues, PRs, and handoff documents, then route them to the appropriate specialist agent for execution.

---

## When to Use

- A developer leaves a `TODO @agent` comment in code
- An issue is created with agent assignment block
- A PR comment requests agent action
- A `HANDOFF.md` file is present in a branch
- Any situation where an agent prompt needs detection and routing

---

## Core Capabilities

### 1. Prompt Detection

Scans multiple sources for agent prompts:
- **Code comments** — `// TODO @agent:`, `# FIXME @bito:`, `/* NOTE @goap: */`
- **Issue bodies** — Agent assignment blocks in issue templates
- **PR comments** — Direct agent mentions in discussions
- **HANDOFF.md** — Explicit agent handoff instructions

### 2. Context Extraction

For each detected prompt, extracts:
- **Prompt text** — The actual task description
- **Surrounding context** — Adjacent code, file path, line numbers
- **Repository context** — Branch, commit SHA, related files
- **Priority** — From `[P0]`, `[P1]`, `[P2]`, `[P3]` markers
- **Agent tag** — `@agent`, `@bito`, `@goap`, `@roo`, `@jules`, etc.

### 3. Agent Classification

Uses OpenRouter triage to classify prompts:
- **Code quality** → Route to Bito AI
- **Revenue/business** → Route to GOAP
- **Research** → Route to Jules
- **General coding** → Route to OpenRouter
- **Local development** → Document for Roo-Cline (manual)

### 4. Execution Orchestration

Triggers appropriate workflow:
- **Bito AI** → `.github/workflows/bito-ai.yml`
- **GOAP** → `.github/workflows/goap-executor.yml` (to be created)
- **Jules** → `.github/workflows/jules-invoke.yml` (workflow_dispatch)
- **OpenRouter** → `.github/workflows/openrouter-coder.yml`
- **GitHub Copilot** → Manual only (not automated, human assigns via GitHub UI)

### 5. Completion Tracking

Marks prompts as completed:
- Appends `[DONE by @agent YYYY-MM-DD]` to code comments
- Closes issues with completion comment
- Deletes or archives `HANDOFF.md`
- Applies `agent:completed` label

---

## References

- [AGENT_PROMPT_CONVENTION.md](../../docs/AGENT_PROMPT_CONVENTION.md) — Complete usage guide
- [AGENT_PROMPT_EXECUTION_EVALUATION.md](../../docs/AGENT_PROMPT_EXECUTION_EVALUATION.md) — Agent selection criteria
- [AGENTS.md](../../docs/AGENTS.md) — Universal agent rules

---

## Changelog

- **1.0.0** (2026-05-03) — Initial skill definition
