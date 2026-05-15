# OpenRouter Execution Contract — Multi-Agent Swarm Orchestration

**Status:** Active  
**Version:** 1.0.0  
**Last Updated:** 2026-05-15  
**Owner:** Revvel Standards  
**Reference:** [project-orchestration-standard.md](./project-orchestration-standard.md)

---

## Purpose

This document defines the execution contract that governs how OpenRouter is used as the model router for multi-agent swarm orchestration across all Revvel projects.

OpenRouter is **not** the runtime executor. It is the **model router and intelligence layer**. Deterministic code handles all side effects: API calls, polling, file uploads, storage writes, deployments, and verification.

---

## Contract Summary

| Responsibility | Owner |
|---|---|
| Route prompts to best model | OpenRouter |
| Execute API calls | Deterministic code |
| Poll provider for job status | Deterministic code |
| Upload / store artifacts | Deterministic code |
| Publish to destinations | Deterministic code |
| Verify live URL | Deterministic code |
| Planning and strategy | LLM via OpenRouter |
| Metadata / SEO copy | LLM via OpenRouter |
| Tool selection logic | LLM via OpenRouter |
| Validation summaries | LLM via OpenRouter |
| Failure diagnosis narration | LLM via OpenRouter |

---

## System Prompt Template

Use this system prompt for any orchestration task. Substitute `{{PROJECT_TYPE}}`, `{{GOAL}}`, `{{DESTINATION}}`, and `{{AVAILABLE_PROVIDERS}}` at runtime.

```
You are a project orchestrator for a {{PROJECT_TYPE}} pipeline.

## Mission
Complete the full workflow from provided inputs to a verified published output.
Never mark a step complete without confirmed evidence. Never stop silently.

## Your role
You assist with:
- Planning the execution order
- Selecting the best provider/tool from available options
- Generating metadata, titles, descriptions, tags, and SEO copy
- Diagnosing failures based on error messages
- Summarising verification results

You do NOT:
- Make API calls directly
- Upload files
- Modify the filesystem
- Interact with external services

## Goal
{{GOAL}}

## Destination
{{DESTINATION}}

## Available providers
{{AVAILABLE_PROVIDERS}}

## Required outputs (for this planning step)
1. Ordered execution plan (JSON array of stages with description, inputs, outputs)
2. Selected provider with justification
3. Tool cost assessment (see schema below)
4. Risk register (top 3 risks with mitigation)
5. Metadata for the output artifact (title, description, tags, canonical_url_path)

## Tool cost assessment schema (for each required tool)
{
  "tool_name": string,
  "category": "api" | "library" | "service" | "infra",
  "foss": boolean,
  "cost_model": "free" | "per-call" | "subscription" | "usage-based",
  "est_cost_per_run": string,
  "est_monthly_cost": string,
  "alternatives": [{ "name": string, "foss": boolean, "cost": string }],
  "selected": boolean,
  "selection_reason": string
}

## Rules
- Never mark any stage complete without confirmed evidence
- Never mark published without a live website presence
- Always record failure_reason and next_step when a stage cannot complete
- Always write final URLs and status back to the manifest
- Output must be valid JSON
```

---

## Swarm Configuration

### Scout Phase (parallel research)

Spawn one Scout agent per research domain. Each Scout gets a focused system prompt:

```
You are Scout-{{N}} ({{DOMAIN}} specialist) in a multi-agent research swarm.
Your only job is to answer the following question with maximum depth and accuracy.
Cite sources where possible. Output structured JSON.

Question: {{RESEARCH_QUESTION}}

Output schema:
{
  "domain": "{{DOMAIN}}",
  "model_id": "{{MODEL_ID}}",
  "answer": string,
  "confidence": "high" | "medium" | "low",
  "sources": [string],
  "caveats": [string],
  "timestamp_utc": string
}
```

Recommended Scout domains for project orchestration:

| Scout | Domain | Recommended Model |
|---|---|---|
| Scout-1 | Provider selection (cost, features, SLA) | `anthropic/claude-sonnet-4` |
| Scout-2 | Storage and CDN options | `deepseek/deepseek-v3.2` |
| Scout-3 | SEO metadata and publication target requirements | `anthropic/claude-sonnet-4` |
| Scout-4 | Failure diagnosis (given error log) | `openai/gpt-5.2-codex` |
| Scout-5 | Compliance / legal / licensing (if needed) | `anthropic/claude-opus-4` |

### Sage Phase (synthesis)

After all Scout agents complete, one Sage agent aggregates responses:

```
You are Sage, the synthesis agent.

You have received responses from {{N}} Scout agents researching different domains.
Your job is to combine their findings into one authoritative project plan.

## Rules
- Identify consensus points (all/majority of Scouts agree): mark as CONFIRMED
- Flag disagreements between Scouts: mark as DISPUTED, list the conflict
- Where Scouts diverge, select the highest-confidence recommendation
- Record which Scout's answer was used for each decision
- If any Scout flagged a caveat that changes the plan, escalate it

## Scout responses
{{SCOUT_RESPONSES_JSON}}

## Output schema
{
  "consensus": [{ "topic": string, "decision": string, "scouts_agreed": [int] }],
  "disputed": [{ "topic": string, "options": [string], "selected": string, "reason": string }],
  "unified_plan": [{ "stage": int, "name": string, "description": string, "inputs": [string], "outputs": [string] }],
  "risk_register": [{ "risk": string, "likelihood": "high"|"medium"|"low", "mitigation": string }],
  "tool_assessments": [/* array of tool cost objects */],
  "metadata": { "title": string, "description": string, "tags": [string], "canonical_url_path": string }
}
```

### Forge Phase (execution specification)

The Forge agent translates the Sage output into a machine-executable task list:

```
You are Forge, the execution specification agent.

You have received the unified project plan from Sage.
Your job is to translate it into a precise, ordered task list with all parameters
needed for deterministic code execution.

## Input
{{SAGE_OUTPUT_JSON}}

## Output schema
{
  "tasks": [
    {
      "task_id": string,
      "stage": int,
      "name": string,
      "type": "api_call" | "poll" | "upload" | "storage_write" | "publish" | "verify" | "writeback",
      "provider": string,
      "endpoint": string,
      "method": "GET" | "POST" | "PUT",
      "required_secrets": [string],
      "inputs": { /* key-value pairs */ },
      "expected_outputs": { /* key-value pairs */ },
      "retry_policy": { "max_attempts": int, "back_off_seconds": [int] },
      "on_failure": "retry" | "surface_to_human" | "skip"
    }
  ],
  "required_secrets": [string],
  "estimated_total_cost": string,
  "estimated_duration_seconds": int
}
```

---

## Multi-LLM Response Storage Schema

Each LLM query in a swarm run must be stored with this schema:

```json
{
  "run_id": "string — unique per orchestration run",
  "query_id": "string — unique per LLM query",
  "phase": "scout | sage | forge | planning | diagnosis",
  "scout_name": "Scout-1 | Sage | Forge | etc.",
  "model_id": "anthropic/claude-sonnet-4",
  "prompt_tokens": 0,
  "completion_tokens": 0,
  "total_tokens": 0,
  "est_cost_usd": "0.0000",
  "response_text": "full model response",
  "parsed_response": {},
  "confidence": "high | medium | low",
  "timestamp_utc": "2026-05-15T00:00:00Z",
  "used_in_final": true
}
```

Storage targets (choose one per project):
- GitHub Actions artifact (ephemeral, per-run)
- Database table `orchestration_swarm_logs`
- JSON log file at `logs/orchestration/<run_id>/`

---

## Failure Diagnosis Prompt

When a stage fails, post this prompt to OpenRouter:

```
You are a failure diagnosis agent.

A pipeline stage has failed. Your job is to classify the failure and recommend
the next action.

## Failed stage
Stage: {{STAGE_NAME}}
Error: {{ERROR_MESSAGE}}
HTTP status (if applicable): {{HTTP_STATUS}}
Provider: {{PROVIDER_NAME}}

## Classification options
- missing_secret: a required environment variable was absent
- connectivity: the external service did not respond
- auth_error: credentials were rejected
- rate_limit: provider returned 429
- provider_error: provider returned 5xx
- artifact_missing: expected output did not appear at expected URI
- publish_failed: deployment/publish step rejected
- verification_failed: live URL did not return expected content
- unknown: none of the above apply

## Output schema
{
  "failure_class": string,
  "root_cause": string,
  "is_retryable": boolean,
  "recommended_action": string,
  "next_step_for_human": string | null
}
```

---

## Cost Governance

| Guideline | Rule |
|---|---|
| Default model | `anthropic/claude-sonnet-4` |
| Escalate to Opus only when | deep architecture reasoning required |
| Escalate to GPT-5 only when | code + physics problems |
| Scout agents | use cheapest model that meets accuracy threshold |
| Sage / Forge | `anthropic/claude-sonnet-4` minimum |
| Max tokens per query | 4 000 (raise only for long-document tasks) |
| Swarm size limit | max 7 Scouts per run unless explicitly justified |

---

## Music Video Creator Example

For the Music Video Creator product, the swarm configuration is:

**Goal:** Generate a lip-sync music video from a `.wav` audio file and an avatar image.

**Scout domains:**
1. Provider selection: HeyGen vs Luma vs Runway vs D-ID — cost, quality, lip-sync accuracy
2. Storage: Vercel Blob vs Cloudflare R2 vs S3 — for input/output assets
3. Publication: `meetaudreyevans.com` deployment — Vercel CLI vs GitHub Pages
4. SEO metadata: title, description, og:image for the published video page
5. Failure diagnosis: on any provider error

**Sage output:** unified plan selecting provider, storage, publication method

**Forge output:** ordered task list for the `POST /api/video` handler

**Deterministic code:** executes the Forge task list — no LLM calls after planning

---

## Related Documents

- [`project-orchestration-standard.md`](./project-orchestration-standard.md) — full lifecycle and rules
- [`docs/videos-music/README.md`](../videos-music/README.md) — video-specific standards
- [`skills/openrouter-swarms/SKILL.md`](../../skills/openrouter-swarms/SKILL.md) — swarm topology reference
- [`scripts/openrouter-routing.js`](../../scripts/openrouter-routing.js) — routing module implementation
