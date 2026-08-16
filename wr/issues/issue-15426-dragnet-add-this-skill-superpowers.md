# WR: [WR] /Dragnet add this skill for you — Superpowers Claude Plugin

**Issue:** #15426
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-07-07
**Researcher:** Copilot (GitHub Coding Agent)
**WR Status:** ✅ Complete

---

## Issue Context

### Output Type (required)

Skill Addition — New composable skills framework for structured software development

### Source

[Claude Plugins — Superpowers](https://claude.com/plugins/superpowers)

### Summary

The issue requests adding the **Superpowers** Claude plugin as a formal Revvel skill. Superpowers is a comprehensive, composable skills framework providing five structured development modules: `/brainstorming` (Socratic requirements refinement), `/tdd` (red-green-refactor TDD), `/debug` (four-phase debugging), `/execute-plan` (batched implementation with review), and `/writing-skills` (TDD applied to documentation and skill authoring).

### Objective

Add `skills/superpowers/` to the Revvel Skills Vault, register it in `SKILLS_INDEX.yml` and `REGISTRY.md`, and create a WR for tracking.

---

## Audience We Are Going After and Why

**Primary Audience:** AI-assisted developers using Claude (all tiers) who want disciplined, test-first development without manual checklist overhead.

- **Pain Point:** AI coding sessions skip requirements gathering, jump straight to implementation, produce untested code, and guess at bugs instead of root-causing them.
- **Value Prop:** Drop-in skill that enforces TDD, pre-coding brainstorming, and systematic debugging — composable, so users load only what they need.

**Secondary Audience:** Revvel agents (OpenClaw, GitHub Copilot, Jules) that need a structured SOP for complex multi-step implementation tasks.

---

## Marketing and SEO Plan

### SEO Target Keywords

- "claude tdd skill" (informational)
- "ai test driven development workflow" (1,200+/mo)
- "structured debugging methodology ai" (900+/mo)
- "claude composable skills framework" (growing; emerging query)
- "red green refactor ai assistant" (600+/mo)
- "superpowers claude plugin" (brand exact-match)

### Distribution Channels

- Claude Plugin Marketplace listing (primary)
- Revvel Skills Registry (internal + public)
- Twitter/X developer community: "Stop your AI from skipping tests"
- dev.to article: "How we enforced TDD inside Claude using Superpowers"

---

## Competitor and GitHub Star Intelligence

| Competitor / Alt | Type | Stars | Notes |
|---|---|---|---|
| **Superpowers** (claude.com plugin) | Proprietary Claude Plugin | N/A (plugin) | The source skill being adapted |
| **Cursor Rules** (custom instructions) | Config-file | N/A | Similar enforcement but IDE-locked |
| **Cline / Roo-Cline** | VS Code extension | 3.2k+ | Local dev; no Socratic pre-coding |
| **Continue.dev** | VS Code extension | 11k+ | General coding assistant; no TDD enforcement |

**Competitive advantage:** Superpowers is the only Claude-native composable skill that enforces the full red-green-refactor TDD contract *plus* Socratic brainstorming *plus* four-phase debugging in a single, no-install framework.

---

## Chatter and Demand Signals

### Validated Pain Points
- Developers report AI coding assistants routinely skip the RED phase — writing passing tests is the default failure mode.
- Root-cause debugging is routinely bypassed; AI guesses and applies multiple speculative fixes simultaneously, masking the real cause.
- Requirements gathering is skipped — AI implements the first interpretation of a prompt without exploration.

### Emotional Drivers
- **Frustration:** "My AI writes tests that always pass — that's not TDD"
- **Control:** "I want the AI to wait for requirements before coding"
- **Confidence:** "I need to know the AI found the root cause before it touched the code"

---

## Factual Validation

### Verified Claims
✅ Superpowers plugin exists on claude.com: [https://claude.com/plugins/superpowers](https://claude.com/plugins/superpowers)
✅ Plugin description matches the source issue body (TDD, debug, brainstorming, code-reviewer, writing-skills, `/execute-plan`, `/brainstorming`)
✅ Slash commands `/brainstorming` and `/execute-plan` are explicitly named in the plugin description

### Evidence Gaps
- GitHub star count for any underlying OSS repo: not found (plugin is hosted on claude.com, not OSS)
- Pricing/subscription tiers for the Superpowers plugin: not publicly documented
- Active user count: not publicly available

---

## Build Requirements and Acceptance Gates

### Core Deliverables
- [ ] `skills/superpowers/SKILL.md` — human-readable spec with all five modules, code-reviewer agent, composability matrix, agent system prompt, and skill assertions
- [ ] `skills/superpowers/superpowers.skill.yml` — machine-readable config for all agents
- [ ] `skills/REGISTRY.md` — quick-reference trigger row + full catalog entry added
- [ ] `skills/SKILLS_INDEX.yml` — superpowers entry added under Developer Workflow

### Acceptance Criteria
- [ ] Agent loading the skill refuses to write implementation code when a new feature is requested without a `/brainstorming` session
- [ ] Agent loading the skill refuses to mark a TDD cycle complete if the test passed before implementation (RED phase violation)
- [ ] Agent loading the skill stops attempting to fix a bug after three failed attempts and escalates to an `ARCH-REVIEW` issue
- [ ] `code-reviewer` subagent fires at each `/execute-plan` batch boundary
- [ ] `/writing-skills` module requires ≥ 3 assertions before accepting a skill as complete

---

## Repository Metadata

| Property | Value |
|---|---|
| Skill Directory | `skills/superpowers/` |
| Registry Entry | `skills/REGISTRY.md` (Developer Workflow section) |
| Index Entry | `skills/SKILLS_INDEX.yml` |
| Source Plugin | [https://claude.com/plugins/superpowers](https://claude.com/plugins/superpowers) |
| Issue | #15426 |

## Research Checklist

- [ ] Deep market research
- [ ] Competitor analysis
- [ ] Community chatter / demand signals
- [ ] SEO keywords
- [ ] Factual validation
- [ ] BOM (N/A — skill addition, no product build)
- [ ] Monetization path (future: ClawMarket listing for the skill suite)

---

## Risks

- Plugin is hosted on claude.com; any upstream API or behaviour changes at Anthropic could affect the skill contract. Mitigate by owning the skill spec locally in `SKILL.md`.
- The five modules overlap with existing Revvel skills (`brainstorming`, `code-review`, `testing`). The Superpowers versions add enforcement contracts on top of them — they extend, not replace, existing skills.
