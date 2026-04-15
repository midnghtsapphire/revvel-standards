# Revvel Agentic Skills Framework & Development Methodology

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Active  
**Maintainer:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Inspired by:** [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice), FOSS tooling, 2040 precog research

---

## Table of Contents

1. [What Is This Framework?](#1-what-is-this-framework)
2. [Core Philosophy — 2040 Precog Methodology](#2-core-philosophy--2040-precog-methodology)
3. [The Three Primitives: Agents · Commands · Skills](#3-the-three-primitives-agents--commands--skills)
4. [Pop-Up Skill Architecture](#4-pop-up-skill-architecture)
5. [Ephemeral Persona Engine](#5-ephemeral-persona-engine)
6. [Skill Lifecycle & Quality Gates](#6-skill-lifecycle--quality-gates)
7. [Skill Testing: Every Skill Must Be Verifiable](#7-skill-testing-every-skill-must-be-verifiable)
8. [Deployment: Windows · Mac · CI](#8-deployment-windows--mac--ci)
9. [Monetization & Marketplace Guide](#9-monetization--marketplace-guide)
10. [FOSS Toolchain](#10-foss-toolchain)
11. [Skill Catalog Price Points](#11-skill-catalog-price-points)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. What Is This Framework?

The **Revvel Agentic Skills Framework** is a methodology for building, packaging, distributing, and monetizing **AI agent skills** — self-contained instruction files that give any AI agent expert-level capabilities in a specific domain, activated with zero configuration by the end user.

Think of it as an **App Store for AI behavior**:

| Traditional App | Revvel Skill |
|---|---|
| Code that runs on hardware | Instruction set that runs inside an LLM context |
| Installed with a package manager | Activated by double-clicking a `.bat` or `.command` file |
| Requires technical knowledge | Works for an 8-year-old |
| Locked to one platform | Works across Claude, Cursor, Copilot, Windsurf, Cline |
| Requires a server | Runs 100% locally, no internet required after install |

### Why This Is Different (2040 Precog Vision)

Most AI tooling in 2026 still treats agents as monolithic assistants. The Revvel framework treats agent capabilities as **composable, testable, distributable micro-skills** — modular behavioral instruction sets that can be stacked, forked, sold, and improved independently.

This mirrors how the software industry evolved from monoliths → microservices. The AI industry is making the same transition: monolithic assistants → composable skill graphs.

The **2040 Precog Methodology** anticipates this future by building for it today:

- Skills are the new packages
- Skill registries are the new npm
- Skill installers are the new `brew install`
- Skill testing is the new unit tests
- Skill personas are the new Docker containers (isolated behavioral environments)

---

## 2. Core Philosophy — 2040 Precog Methodology

### The Seven Principles

1. **Skills over prompts** — A skill is a tested, versioned, documented behavioral specification. A prompt is a guess. Build skills.

2. **Pop-up and disappear** — Skills activate on demand and terminate when done. No persistent processes, no subscriptions, no servers (unless the skill opts in).

3. **Zero user configuration** — Double-click. Done. The skill self-installs its dependencies, self-configures its tools, and self-validates its setup.

4. **FOSS-first** — Every skill must have a FOSS-only path. No paid API keys required for the core value proposition.

5. **Persona-first UX** — Every skill spawns an ephemeral persona that guides the user through the workflow. The persona disappears when the skill terminates.

6. **Test everything** — Every skill ships with a PromptFoo test config. If it can't be tested, it doesn't ship.

7. **Compounding value** — Skills are designed to be composed. The skill graph grows more powerful as each skill is added.

### The Revvel Development Loop

```
RESEARCH → SPEC (SKILL.md) → BUILD (skill.yml) → TEST (promptfoo.yml)
    ↑                                                      |
    └─────── ITERATE ←── MONITOR ←── SHIP ←── VERIFY ──────┘
```

---

## 3. The Three Primitives: Agents · Commands · Skills

Derived from the [claude-code-best-practice framework](https://github.com/shanraisshan/claude-code-best-practice):

### Agents (`.claude/agents/<name>.md`)
Autonomous actors in fresh isolated context. Each agent has:
- Custom tools and permissions
- Specific model assignment (Haiku for speed, Sonnet for quality, Opus for analysis)
- Persistent identity (optional persona)
- Memory via GBrain (optional)

**Revvel Agent Types:**
| Type | Lifecycle | Purpose |
|---|---|---|
| Permanent | Always active | Core system agents (System State, MVI Contract) |
| Ephemeral | Spawned on demand | Task specialists (Testing Agent, Vault Agent) |
| Persona | Session-scoped | User-facing guides with personality |

### Commands (`.claude/commands/<name>.md`)
Knowledge injected into the existing context. Used for:
- Workflow orchestration
- Template application
- Quick reference lookups

### Skills (`skills/<name>/SKILL.md`)
Self-contained expert instruction sets. Each skill defines:
- A specific domain of knowledge
- Trigger keywords that activate it
- A step-by-step workflow
- Input/output contracts
- Test specifications

---

## 4. Pop-Up Skill Architecture

A **Pop-Up Skill** is a skill that installs itself, runs, and cleans up — all from a single double-click. No terminal knowledge required.

### Architecture Overview

```
User double-clicks installer
         │
         ▼
┌─────────────────────────┐
│  Installer (bat/command) │  ← Detects OS, checks deps
│  • Checks prerequisites  │
│  • Installs missing deps │
│  • Clones skill config   │
│  • Injects into AI tool  │
│  • Launches test         │
│  • Shows success screen  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Skill Config (.yml)     │  ← AI tool reads on startup
│  • System prompt         │
│  • Persona definition    │
│  • Tool permissions      │
│  • Memory hooks          │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Tool (Claude, etc.)  │  ← User interacts normally
│  • Persona active        │
│  • Skill rules enforced  │
│  • Tests can be run      │
└─────────────────────────┘
```

### Pop-Up Skill File Structure

```
skills/<skill-name>/
├── SKILL.md                  # Human-readable spec & documentation
├── <skill-name>.skill.yml    # Machine-readable config for AI tools
├── persona.yml               # Optional: ephemeral persona definition
├── tests/
│   └── promptfoo.yml         # PromptFoo test suite
└── install/
    ├── windows/
    │   └── install-<skill>.bat
    └── mac/
        └── install-<skill>.command
```

### Minimum Viable Skill (MVS) Requirements

For a skill to be releasable, it must have:
- [ ] `SKILL.md` with description, triggers, workflow, and examples
- [ ] `<name>.skill.yml` with machine-readable config
- [ ] `tests/promptfoo.yml` with at least 3 test cases (happy path, edge case, error)
- [ ] A Windows `.bat` installer
- [ ] A Mac `.command` installer
- [ ] A README with installation instructions in plain language

---

## 5. Ephemeral Persona Engine

The **Persona Engine** gives every skill a human face — a temporary character that activates when the skill starts and dissolves when it ends.

### Why Personas Matter

Personas solve the "cold start" UX problem. Without a persona:
- User doesn't know what to type
- AI responds generically
- Skill capabilities are invisible

With a persona:
- Persona introduces itself and explains what it does
- Persona prompts the user with the right first question
- Persona maintains a consistent tone that signals "this is a special mode"
- Persona terminates cleanly when the task is done

### Persona YAML Schema

```yaml
# persona.yml
name: "Aria"
role: "Senior Code Reviewer"
voice: "direct, precise, kind"
greeting: |
  Hi! I'm Aria, your code review specialist. 
  Drop a file path, PR link, or paste some code — I'll review it 
  against Revvel standards and flag anything that needs attention.
capabilities:
  - "OWASP security scanning"
  - "Style guide enforcement"
  - "Test coverage analysis"
  - "Performance anti-pattern detection"
termination_trigger: "code review complete"
farewell: |
  Review complete. Issues logged, suggestions filed. 
  Aria signing off — until the next PR. 🎯
```

### Built-In Persona Library

| Persona | Skill | Voice |
|---|---|---|
| **Aria** | Code Review | Direct, precise, kind |
| **Forge** | Skill Builder | Creative, hands-on, encouraging |
| **Vault** | Security/Credentials | Serious, cautious, thorough |
| **Scout** | Research & Brainstorming | Curious, energetic, connective |
| **Sage** | Documentation | Patient, organized, clear |
| **Nexus** | Deployment | Calm under pressure, systematic |

---

## 6. Skill Lifecycle & Quality Gates

### Skill States

```
DRAFT → REVIEW → BETA → STABLE → DEPRECATED
```

| State | Criteria |
|---|---|
| **DRAFT** | SKILL.md written, no tests |
| **REVIEW** | Peer-reviewed by one other agent/human |
| **BETA** | Tests exist, deployed to at least 3 users |
| **STABLE** | 10+ uses, zero critical bugs, docs complete |
| **DEPRECATED** | Replaced by newer skill, users migrated |

### Quality Gates (must pass before STABLE)

- [ ] All PromptFoo tests pass (happy path + edge cases)
- [ ] Installer tested on Windows 10+ and macOS 12+
- [ ] README passes "8-year-old test" (can a child understand the intro?)
- [ ] Zero external API keys required for core functionality
- [ ] Persona flows through greeting → task → farewell successfully
- [ ] SKILL.md has been reviewed by at least one other person

---

## 7. Skill Testing: Every Skill Must Be Verifiable

### Testing Stack

| Layer | Tool | What It Tests |
|---|---|---|
| Skill behavior | PromptFoo | LLM outputs against assertions |
| Installer | Manual / CI | Installs without errors on clean machine |
| Persona | PromptFoo | Greeting, task handling, farewell |
| Integration | GitHub Actions | Full end-to-end on every PR |

### PromptFoo Skill Test Template

```yaml
# skills/<name>/tests/promptfoo.yml
# Generated by Revvel Testing Agent
description: Tests for <skill-name> skill
providers:
  - id: anthropic:claude-sonnet-4-5
    config:
      temperature: 0

prompts:
  - id: skill-system-prompt
    raw: |
      {{skill_system_prompt}}

tests:
  # Happy path
  - description: "Should handle typical use case"
    vars:
      input: "{{typical_input}}"
    assert:
      - type: contains
        value: "{{expected_output_contains}}"
      - type: not-contains
        value: "error"

  # Edge case: empty input
  - description: "Should handle empty input gracefully"
    vars:
      input: ""
    assert:
      - type: contains
        value: "{{graceful_response}}"

  # Error handling
  - description: "Should handle invalid input"
    vars:
      input: "{{invalid_input}}"
    assert:
      - type: not-contains
        value: "undefined"
      - type: not-contains
        value: "null"
```

### Running Tests

```bash
# Install PromptFoo once
npm install -g promptfoo

# Test a single skill
cd skills/<skill-name>/tests
promptfoo eval --config promptfoo.yml

# Test all skills
for skill in skills/*/tests/promptfoo.yml; do
  echo "Testing: $skill"
  promptfoo eval --config "$skill"
done

# View results in browser
promptfoo view
```

---

## 8. Deployment: Windows · Mac · CI

### Windows Deployment (.bat)

All Windows installers follow this pattern:

```batch
@echo off
:: Pop-Up Skill Installer
:: Double-click to install. No technical knowledge required.

title <Skill Name> Installer

echo Installing <Skill Name>...
:: 1. Check prerequisites
:: 2. Install missing deps
:: 3. Configure AI tool
:: 4. Run health check
:: 5. Show success

pause
```

### Mac Deployment (.command)

All Mac installers are `.command` files (double-click to run in Terminal):

```bash
#!/bin/bash
# Pop-Up Skill Installer for Mac
# Double-click this file in Finder to install

echo "Installing <Skill Name>..."
# 1. Check prerequisites
# 2. Install missing deps (via brew if available, curl otherwise)
# 3. Configure AI tool
# 4. Run health check
# 5. Show success

read -p "Press Enter to close..."
```

### CI Deployment (GitHub Actions)

```yaml
name: Test All Skills
on: [push, pull_request]

jobs:
  test-skills:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install PromptFoo
        run: npm install -g promptfoo
      - name: Run skill tests
        run: |
          for config in skills/*/tests/promptfoo.yml; do
            promptfoo eval --config "$config" --no-cache
          done
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 9. Monetization & Marketplace Guide

See **[docs/MARKETPLACE_GUIDE.md](../MARKETPLACE_GUIDE.md)** for the full guide, but here's the summary:

### Where to List

| Platform | Best For | Price Range |
|---|---|---|
| **ClawMarket** | Claude-native skills | $9–$99 |
| **Gumroad** | Simple one-time purchases | $5–$49 |
| **GitHub Marketplace** | Developer tools / Actions | Free–$29/mo |
| **Hugging Face** | ML-adjacent skills | Free–donations |
| **Itch.io** | Creative/experimental skills | $1–$20 |
| **Product Hunt** | Launch visibility | Free |

### Pricing Tiers

| Tier | Price | What's Included |
|---|---|---|
| **Free / Open Source** | $0 | Basic skill, no installer, manual setup |
| **Starter** | $9 | Skill + Windows installer |
| **Standard** | $19 | Skill + both installers + tests |
| **Pro** | $49 | Skill + installers + tests + persona + docs |
| **Bundle** | $99 | 5+ skills bundled |
| **Enterprise** | $199+ | Custom skills + training + support |

---

## 10. FOSS Toolchain

Every skill in the Revvel framework can be run with 100% free and open-source software:

| Component | FOSS Tool | License |
|---|---|---|
| LLM Runtime | [Ollama](https://ollama.ai) (local models) | MIT |
| Vector Search | [PGLite](https://github.com/electric-sql/pglite) | Apache 2.0 |
| Memory Layer | [GBrain](https://github.com/garrytan/gbrain) | MIT |
| Skill Testing | [PromptFoo](https://promptfoo.dev) | MIT |
| CI/CD | [GitHub Actions](https://github.com/features/actions) | Free tier |
| Package Runtime | [Bun](https://bun.sh) | MIT |
| Documentation | Markdown + [MkDocs](https://mkdocs.org) | BSD |
| API Gateway | [Caddy](https://caddyserver.com) | Apache 2.0 |

### Free Tier API Access (for powered features)

| Provider | Free Tier | Best For |
|---|---|---|
| Anthropic Claude | Free with account | Skill testing, persona |
| Google Gemini | 1M tokens/day free | High-volume testing |
| Groq | Fast inference, free tier | Real-time skill testing |
| OpenRouter | Pay-as-you-go, $5 credit | Model comparison |

---

## 11. Skill Catalog Price Points

Skills are valued by their **ROI multiplier** — how much developer time they save or how much throughput they add.

### ROI Calculation Formula

```
Skill Value = (Hours Saved Per Week × Developer Hourly Rate × 52) × 0.1
```

Example: Code Review skill saves 3 hours/week for a $75/hr developer:
```
Value = (3 × $75 × 52) × 0.1 = $1,170/year → Price at $49–$99
```

### Catalog Tiers

| Skill Type | Throughput Impact | Dev Time Saved | Recommended Price |
|---|---|---|---|
| Session startup skills | +20% | 15 min/day | $9 |
| Code review skills | +35% | 2 hrs/day | $49 |
| Testing automation skills | +50% | 3 hrs/day | $79 |
| Full methodology bundle | +80% | 4 hrs/day | $199 |
| Custom skill development | +??% | Client-specific | $500+ |

---

## 12. Implementation Checklist

When implementing this methodology for a new project:

### Phase 1: Foundation (Day 1)
- [ ] Clone revvel-standards
- [ ] Run `scripts/bootstrap-repo.sh` to set up the project
- [ ] Load the four mandatory skills: `system-state`, `mvi-contract`, `model-router`, `context-management`
- [ ] Set up GBrain for memory

### Phase 2: First Skill (Week 1)
- [ ] Identify the single highest-value skill for the project
- [ ] Create `skills/<name>/SKILL.md`
- [ ] Create `skills/<name>/<name>.skill.yml`
- [ ] Create `skills/<name>/persona.yml`
- [ ] Create `skills/<name>/tests/promptfoo.yml`
- [ ] Create Windows and Mac installers

### Phase 3: Testing & Ship (Week 2)
- [ ] Run PromptFoo tests locally
- [ ] Set up GitHub Actions CI for skill testing
- [ ] Have one other person test the installer
- [ ] Pass the 8-year-old test for documentation
- [ ] List on ClawMarket or Gumroad

### Phase 4: Compound (Ongoing)
- [ ] Add skills as new domains are needed
- [ ] Update SKILLS_INDEX.yml with each new skill
- [ ] Monitor skill usage and iterate on weak spots
- [ ] Compose skills into bundles for resale

---

*This document is part of the Revvel Standards system. For skill templates and installers, see `skills/skill-forge/` and `install/`.*
