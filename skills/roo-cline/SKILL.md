# Roo-Cline Skill

**Version:** 1.0.0  
**Status:** Active (Manual Invocation)  
**Category:** Local Development / IDE Agent

---

## Purpose

Use Roo-Cline autonomous coding agent for local development tasks requiring multi-file refactoring, complex feature implementation, or terminal command execution with human oversight.

---

## When to Use

✅ **Use Roo-Cline when:**
- Working locally on complex features requiring multiple file changes
- Refactoring code across multiple modules
- Implementing features with both code and terminal commands
- Debugging issues that span multiple files
- Need human-in-the-loop approval for each action

❌ **Do NOT use Roo-Cline for:**
- CI/CD automation (use GitHub Actions workflows)
- PR reviews on GitHub (use Bito AI or OpenRouter)
- Revenue/business tasks (use GOAP agent)
- Tasks requiring server access without local environment

---

## Installation

See [ROO_CLINE_SETUP.md](../../docs/ROO_CLINE_SETUP.md) for complete installation instructions.

---

## Core Capabilities

- ✅ Autonomous file operations (create, edit, delete)
- ✅ Terminal command execution
- ✅ Multiple specialized modes (Code, Architect, Ask, Debug)
- ✅ Human-in-the-loop permissions
- ✅ Multi-LLM support (OpenAI, Claude, Gemini, Ollama)

---

## Resources

- [ROO_CLINE_SETUP.md](../../docs/ROO_CLINE_SETUP.md) — Complete setup guide
- [AGENT_PROMPT_CONVENTION.md](../../docs/AGENT_PROMPT_CONVENTION.md) — `@roo` tag usage
- [Roo-Cline GitHub](https://github.com/marco-altran/Roo-Cline) — Source code

---

## Changelog

- **1.0.0** (2026-05-03) — Initial skill definition
