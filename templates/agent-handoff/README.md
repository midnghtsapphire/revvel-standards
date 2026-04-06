# Agent Handoff Templates

This directory contains reference examples of **build specification documents** — the instructions you hand to an agent at the start of a new session to tell it exactly what to build, in what order, with zero ambiguity.

## Files

| File | What It Is |
|---|---|
| `GROWLINGEYES_BUILD_SPEC.md` | The canonical GrowlingEyes 18-domain build spec — 95 data sources, sprint order, schema, deploy instructions |

## How to Write a Good Build Spec (Lessons from GrowlingEyes)

A good agent handoff document includes:

1. **"Read This First" section** — Prime directive, XP rules, what NOT to do
2. **Existing stack table** — Every technology, location, and process name documented
3. **Your mission** — One clear sentence: what gets added, what stays the same
4. **Unified schema** — The exact TypeScript/SQL schema to use, copy-paste ready
5. **All data sources** — Organized by tier (free/no-key first, paid last), with exact URLs, params, and auth
6. **Build order** — Numbered sprints, each one fully wired before the next starts
7. **What NOT to do** — Explicit list of architectural decisions that must not change
8. **Success criteria** — Numbered list of what "done" looks like, verifiable

## The GrowlingEyes Standard

Every new Revvel app that requires agent-assisted development should have a `docs/MANUS_INSTRUCTIONS.md` (or equivalent) committed to its repo before any build session starts.
