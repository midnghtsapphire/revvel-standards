# DRAGNET Framework Standard

> **Status:** Active
> **Last Updated:** 2026-07-09
> **Domain:** Autonomous Decision Systems / AI Orchestration

---

## Domain Classification

| Category | Value |
|----------|-------|
| **Domain** | Autonomous Systems |
| **Sub-domain** | Decision Orchestration |
| **Use Case** | Zero-Human Decision Making |
| **Complexity** | Very High |

---

## Executive Summary

DRAGNET defines a framework for autonomous decision-making using five cooperating AI systems. Each system has a specific role, and decisions flow through a structured pipeline before execution.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    DRAGNET ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT → PLATO → MEDUSA → COUNTER → DARWIN → JUDGE → OUTPUT    │
│           │       │        │        │        │                  │
│           │       │        │        │        └─────────────→ │
│           │       │        │        └─────────────────────→ │
│           │       │        └─────────────────────────────────→ │
│           │       └─────────────────────────────────────────────→ │
│           └────────────────────────────────────────────────────→ │
│                                                              │
│  ALL SYSTEMS OPERATE IN SILENT MODE                           │
│  OUTPUT ONLY ON TRIGGER CONDITIONS                            │
└─────────────────────────────────────────────────────────────┘
```

---

## System Definitions

### PLATO - Pre-cognitive Deep Research
- **Code:** P
- **Trigger:** Before any major decision
- **Output:** Recommendation + Conditions
- **Method:** Questions assumptions, counterfactual modeling, 5-year projection

### MEDUSA - Edge Case Research
- **Code:** M
- **Trigger:** When unconventional/dark intelligence needed
- **Output:** Risk factors
- **Method:** Searches unconventional sources, identifies edge cases

### COUNTER - Darwin Survival Testing
- **Code:** C
- **Trigger:** After PLATO approves
- **Output:** KILL conditions
- **Method:** Stress testing, failure mode analysis

### DARWIN - Evidence Validation
- **Code:** D
- **Trigger:** When proof required
- **Output:** Validation report
- **Method:** Fact-checking, source verification

### JUDGE - Final Authority
- **Code:** J
- **Trigger:** Continuous
- **Output:** GREEN/YELLOW/RED verdict
- **Method:** Matrix scoring, threshold application

---

## Decision Pipeline

### Phase 1: Analysis (PLATO)
```text
1. Question all assumptions
2. Identify stakeholders
3. Map unknown unknowns
4. Model counterfactuals
5. Project 5-year outcomes
```

### Phase 2: Edge Cases (MEDUSA)
```text
1. Search unconventional sources
2. Identify risk vectors
3. Map failure modes
4. Document edge cases
```

### Phase 3: Stress Test (COUNTER)
```text
1. Apply death-by-thousand-cuts test
2. Simulate negative scenarios
3. Identify KILL triggers
4. Document survival conditions
```

### Phase 4: Validation (DARWIN)
```text
1. Verify all claims
2. Check evidence chains
3. Validate sources
4. Output confidence score
```

### Phase 5: Judgment (JUDGE)
```text
1. Score all dimensions
2. Apply thresholds
3. Issue verdict
4. If GREEN → Execute
```

---

## Scoring Matrix (JUDGE)

| Dimension | Weight | Score Range |
|-----------|--------|------------|
| Financial | 25% | [0-100] |
| Legal | 25% | [0-100] |
| Operational | 20% | [0-100] |
| Strategic | 15% | [0-100] |
| Risk | 10% | [0-100] |
| Values | 5% | [0-100] |

**Thresholds:**
- GREEN: ≥75 average, no dimension <50
- YELLOW: ≥50 average
- RED: Any dimension <50, or average <50

---

## Search Loop Continuation (Field-Completion Requirement)

> Added 2026-07-09 after issue #15480: a `/dragnet please research use the
> search loop until every field is filled out in full detail` comment produced
> **no** filled fields. Root cause (three stacked gaps):
>
> 1. `detectAction()` in `scripts/persona-comment-runner.js` anchored its verb
>    regex at `^`, so the politeness prefix ("please …") meant *no action* was
>    detected — even though the file's own comments promised "please do a fix"
>    would execute.
> 2. "research" was not a routed verb at all, so the request fell into ADVISORY
>    mode: a single one-shot LLM chat reply that cannot fill WR fields.
> 3. `research-engine.yml` intentionally dropped its `issue_comment` trigger
>    (label-churn storms), so nothing else could pick the comment up either.
>
> The runner now strips politeness prefixes and routes DRAGNET research
> requests to the Research Engine via `workflow_dispatch`.

### The rule

**A research packet is DONE only when every WR field is filled with sourced
detail — or explicitly annotated with what is missing and why.** Agents MUST
NOT stop the search loop silently while fields are still empty, placeholder,
or "N/A — pending". Stopping without either (a) full fields or (b) an explicit
gap list is a defect, not a completion.

### Routing

| Trigger | Route | What runs |
|---------|-------|-----------|
| `/dragnet research <topic>` (politeness prefixes OK) | `persona-comment-runner.js` → `dispatchResearchEngine()` | `research-engine.yml` → `runRalphLoop()` |
| `/dragnet … search loop …` (no execution verb) | same as above | same as above |
| `/dragnet fix/build/… <task>` | EXECUTION mode | perm-fix WR → `wr:code` → openrouter-coder |
| Anything else `/dragnet` | ADVISORY mode | one-shot diagnosis comment (never for field-filling) |

A one-shot advisory chat reply is **never** an acceptable substitute for the
search loop when the request is to research or fill out a packet.

### Search loop mechanics (the Ralph loop, `scripts/research-engine.js`)

1. **First pass** runs every research lane in parallel.
2. **Retry passes** re-run only lanes that failed, went missing, or scored
   below `RALPH_LOOP_MIN_CONFIDENCE` (60), up to `RALPH_LOOP_MAX_ITERATIONS`
   (3) total passes, merging the best-scoring report per lane.
3. **Synthesis** receives the full iteration history so the packet reflects
   the best evidence gathered across every pass.

### Keep-going obligations (what "keeps them going")

- **Retry before surrender:** a failed or low-confidence lane MUST be retried
  by the loop, not skipped, until the iteration cap is reached.
- **Never stop silently:** if the cap is reached with fields still unfilled,
  the packet MUST list each missing field, the reason (no key, rate limit,
  no sources found, low confidence), and the confidence score achieved.
- **Leave the trail hot:** incomplete packets keep their `research:*`
  lifecycle labels so watchdogs and `wr:reset` can re-dispatch the loop; a
  blocked run is labeled `research:blocked` + `needs-human`, never closed
  quietly.
- **Re-dispatchable on demand:** because `research-engine.yml` has no comment
  trigger, `/dragnet research` is the supported way to restart the loop on an
  existing issue; it requires `actions: write` in the calling workflow.
- **Politeness never changes routing:** "please/kindly/can you …" before a
  verb MUST parse identically to the bare verb. Regressions here are exactly
  how #15480 happened.

---

## Integration Requirements

### Input Sources
- [ ] GitHub Issues
- [ ] Manual submissions
- [ ] Scheduled cron
- [ ] API calls

### Output Destinations
- [ ] GitHub Issues (for review)
- [ ] GitHub Actions (for execution)
- [ ] Notifications (for alerts)
- [ ] Logs (for audit)

### Required Standards
- [ ] ERROR_REPORTING_STANDARD.md
- [ ] MONITORING.md
- [ ] CRON_SYSTEM.md
- [ ] ZERO_HUMAN_FRAMEWORK.md

---

## Cron Jobs

| Job ID | System | Schedule | Purpose |
|--------|-------|----------|---------|
| `dragnet:plato:start` | PLATO | `0 5 * * *` | Morning analysis |
| `dragnet:medusa:edge` | MEDUSA | `0 6 * * 0` | Weekly edge scan |
| `dragnet:counter:stress` | COUNTER | `0 7 * * 1` | Weekly stress test |
| `dragnet:judge:review` | JUDGE | `0 8 * * *` | Daily verdict |
| `dragnet:darwin:validate` | DARWIN | `0 8 1 * *` | Monthly validation |

---

## Error Handling

Per ERROR_REPORTING_STANDARD.md:
- [ ] All errors logged with severity
- [ ] RED verdict = halt + alert
- [ ] Stack traces captured
- [ ] Retries with exponential backoff

---

## Monitoring

Per MONITORING.md:
- [ ] Prometheus metrics for each system
- [ ] Success/failure ratios
- [ ] Latency tracking
- [ ] Alert on consecutive failures

---

## Related Standards

- `ZERO_HUMAN_FRAMEWORK.md` - Autonomous execution
- `CRON_SYSTEM.md` - Scheduling
- `ERROR_REPORTING_STANDARD.md` - Error handling
- `MONITORING.md` - Observability
- `AI_TAX_INTEGRATION.md` - Tax decisions

---

*Standard maintained by revvel-standards*
*Last updated: 2026-07-09*
