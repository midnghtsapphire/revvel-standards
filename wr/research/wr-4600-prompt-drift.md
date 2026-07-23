# WR-4600 Prompt Drift Report

**Status:** Low urgency. `.md` files remain source of truth.

## Summary

Canonical WR-4200 spec (from Drive) vs shipped Photon Bench dashboard: three sections and one principle dropped in the condensed embed. All safety gates faithful.

## Dropped Sections

### 1. IDENTITY
Canonical spec includes an `IDENTITY` block establishing operator persona, scope boundaries, and refusal posture. Dashboard embed omits it — condensed to a single-line role hint.

**Impact:** Model may drift on tone/scope in extended sessions. Gates still fire; refusals still land.

### 2. MODEL ROUTING
Canonical routes queries by class: `adverse → strict-mode LLM`, `research → retrieval-augmented`, `math → symbolic tool`. The shipped dashboard is static and does not invoke a model.

**Impact:** No runtime routing occurs today. If model dispatch is added later, adverse-event escalation must be implemented then.

### 3. INVENTORY
Canonical enumerates the tool inventory (harvest, dose-engine, snapshot store, triage) so the model can reason about its own capabilities. Dashboard omits.

**Impact:** Cosmetic. Tools are wired at the app layer.

### 4. n8n / Gumloop Principle
Canonical: **"Every automation edge must be reversible or have a manual stop."** Dropped from embed.

**Impact:** Principle still honored in code (cron + dispatch, triage requires human ack). Missing from prompt means model won't restate it if asked.

## Faithful Gates

All of the following survived the condensation intact:
- WR-4200 no-fabrication rule (every URL from API response)
- HARM / FLICKER / OCULAR triage triggers
- Quiet-day snapshot requirement
- Adverse-first ordering
- Key-required shard degrade-to-zero (never pad)

## Recommendation

Restore `IDENTITY`, `MODEL ROUTING`, `INVENTORY`, and the n8n principle in the next dashboard rev. No code changes required now — `.md` canonical spec is authoritative and the harvest pipeline enforces the load-bearing rules directly.
