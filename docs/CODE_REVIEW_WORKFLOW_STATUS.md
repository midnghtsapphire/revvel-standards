# Code Review Workflow Status

**Last Updated:** May 6, 2026
**Status:** Current

## Overview

This document clarifies the current state of code review automation in `revvel-standards`, including which workflows are active, which are disabled, and why.

## Active Workflows

### 1. BITO AI (Primary Reviewer)
**Workflow:** `.github/workflows/bito-ai.yml`  
**Status:** ✅ **ACTIVE** — Primary PR reviewer  
**Trigger:** Automatic on PR open/sync  
**Model:** BITO AI (persistent memory reviewer)  
**Labels Applied:** `bito-ai`, `bito-ai:review`, `awaiting-approval` or `bito-ai:changes-needed`

**Why BITO AI is primary:**
- Persistent memory of repository context
- Desktop API integration for local development
- Agentic code review with context awareness
- Complements (doesn't replace) other review tools

### 2. Coderabbit AI
**Workflow:** GitHub Marketplace integration  
**Status:** ✅ **ACTIVE** — Automated line-by-line PR review  
**Trigger:** Automatic on PR open/sync  
**Purpose:** Syntax, style, and anti-pattern detection  
**Action Required:** All Coderabbit comments must be addressed before merge

### 3. PromptFoo (Skill/LLM Testing)
**Workflow:** `templates/cicd/prompt-eval.yml` (copy to `.github/workflows/`)  
**Status:** ✅ **ACTIVE** (template available for projects)  
**Trigger:** PR changes to `skills/`, `prompts/`, or promptfoo config files  
**Model:** Claude Sonnet 4 via OpenRouter  
**Purpose:** Test prompts and skill outputs for correctness and security  
**Failure Mode:** ⚠️ **ADVISORY** — Failures generate warnings but don't block merge

### 4. Anti-Scaffolding Enforcer
**Workflow:** `.github/workflows/anti-scaffolding-enforcer.yml`  
**Status:** ✅ **ACTIVE** — Blocks PRs with scaffolding language  
**Trigger:** Automatic on PR open/edit/sync  
**Purpose:** Enforce "No scaffolding" rule from AGENTS.md Prime Directive  
**Failure Mode:** 🚫 **BLOCKING** — Violations prevent merge

### 5. Devin Code Review (Opt-In)
**Workflow:** `.github/workflows/devin-code-review.yml`  
**Status:** ✅ **ACTIVE** — opt-in only (WR #15672)  
**Trigger:** `/devin` slash command on PR/issue comments, `devin-review` label on a non-draft PR, or manual dispatch — deliberately no automatic PR open/sync trigger (Devin is a paid surface, sessions cost ACUs)  
**Action:** `aaronsteers/devin-action` (SHA-pinned; listed in `ACCEPTED_SINGLE_AUTHOR_ACTIONS`)  
**Config:** `DEVIN_API_KEY` repo secret + `DEVIN_ORG_ID` repo variable; soft-skips (stays green) when either is missing  
**Notes:** Operational strengths/weaknesses in `docs/agent-stack/DEVIN_OBSERVATIONS.md` — verify Devin's "✅ Resolved" claims before trusting them

## Disabled Workflows (Manual Dispatch Only)

### 1. pr-auto-review.yml
**Status:** ⚠️ **DISABLED** (manual dispatch only)  
**Who:** OpenHands-RESTRUCTURE team  
**When:** 2026-05-04  
**Why:** BITO AI is now the sole assigned PR reviewer. Having 6+ bots review the same PR generated noise instead of signal.  
**Re-enable conditions:** If BITO AI becomes unavailable or manual fallback needed  
**Trigger:** `workflow_dispatch` only

```yaml
# DISABLED — see header. BITO AI is the assigned reviewer.
# pull_request:
#   types: [labeled, opened, reopened, ready_for_review, synchronize]
workflow_dispatch:
```

### 2. ai-pr-review-openrouter.yml
**Status:** ⚠️ **DISABLED** (manual dispatch only)  
**Who:** OpenHands-RESTRUCTURE team  
**When:** 2026-05-04  
**Why:** BITO AI is now the sole assigned PR reviewer. This OpenRouter reviewer kept as manual fallback only.  
**Re-enable conditions:** If BITO AI is unavailable  
**Trigger:** `workflow_dispatch` only

```yaml
# DISABLED — see header. BITO AI is the assigned reviewer.
# pull_request:
#   types: [opened, synchronize, reopened, ready_for_review]
workflow_dispatch:
```

## Review Pipeline Flow

```text
┌──────────────────────────────────────────────────────┐
│  1. PR Opened/Synchronized                           │
└──────────────────┬───────────────────────────────────┘
                   │
         ┌─────────┴────────────┐
         │                      │
         ▼                      ▼
┌────────────────┐    ┌────────────────────┐
│  BITO AI       │    │  Coderabbit        │
│  (Primary)     │    │  (Line-by-line)    │
│  - Context     │    │  - Syntax          │
│  - Logic       │    │  - Style           │
│  - Security    │    │  - Anti-patterns   │
└────────────────┘    └────────────────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Anti-Scaffolding    │
         │  Enforcer            │
         │  (Blocks incomplete) │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  PromptFoo           │
         │  (If skills changed) │
         │  Advisory only       │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Human Review        │
         │  (Final approval)    │
         └──────────────────────┘
```

## OpenRouter Fallback Chain (for disabled workflows)

When `pr-auto-review.yml` or `ai-pr-review-openrouter.yml` are manually triggered:

```text
Primary:   anthropic/claude-sonnet-4
Fallback:  anthropic/claude-sonnet-4.5
```

## PromptFoo Failure Modes

### Advisory (Non-Blocking)
PromptFoo test failures **do not block** PR merges. They generate warnings and upload results as artifacts for human review.

**Why advisory?**
- Prompt/LLM outputs can be subjective
- False positives in edge cases
- Allows experimentation without blocking workflow

**When to treat as blocking:**
- Security test failures (secret leakage, injection)
- Critical skill failures (auth, data validation)
- Regression in previously passing tests

## Model Consistency

All workflows now use **valid OpenRouter model IDs**:
- ✅ `anthropic/claude-sonnet-4` (primary)
- ✅ `anthropic/claude-sonnet-4.5` (fallback)
- ✅ `anthropic/claude-sonnet-4.6` (content automation)
- ✅ `anthropic/claude-opus-4` (research tasks)

❌ Invalid model IDs removed:
- `anthropic/claude-3.7-sonnet` → replaced with `anthropic/claude-sonnet-4`
- `anthropic/claude-3.5-sonnet` → replaced with `anthropic/claude-sonnet-4`

## Secrets Required

| Workflow | Secret | Where to get it |
|----------|--------|-----------------|
| BITO AI | `BITO_API_KEY` | [bito.ai](https://bito.ai) → Settings → API Keys |
| OpenRouter fallbacks | `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) → API Keys |
| PromptFoo | `OPENROUTER_API_KEY` | Same as above |

## FAQs

### Why disable multiple reviewers
Having 6+ AI bots review every PR created noise and confusion. BITO AI provides the best balance of context-awareness and actionable feedback.

### Can I still use OpenRouter for reviews
Yes, via manual dispatch on `pr-auto-review.yml` or `ai-pr-review-openrouter.yml`. Useful for second opinions or when BITO is unavailable.

### What happens if BITO AI fails
The workflows have graceful fallback. PRs can still be merged with human review approval.

### Are PromptFoo failures blocking
No. PromptFoo runs in advisory mode. Review the artifacts and decide whether to address findings before merge.

---

## Related Documentation

- [CODE_REVIEW_STANDARD.md](Master_Inventory/CODE_REVIEW_STANDARD.md) - Full code review policy
- [skills/code-review/SKILL.md](../skills/code-review/SKILL.md) - Code review skill documentation
- [AGENTS.md](AGENTS.md) - Prime Directive and anti-scaffolding rules
- [BITO_AI_INTEGRATION.md](BITO_AI_INTEGRATION.md) - BITO AI setup guide
