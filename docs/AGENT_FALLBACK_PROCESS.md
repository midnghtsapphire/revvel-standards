# Agent Fallback Process — OpenHands → Cursor → OpenRouter

**Version:** 1.0.0
**Date:** April 30, 2026
**Status:** Active
**Scope:** All Revvel/MIDNGHTSAPPHIRE automation workflows

---

## Overview

This document defines the **agent fallback chain** for automated code generation and task execution. When the primary agent (OpenHands AI) reaches rate limits or becomes unavailable, the system automatically falls back to secondary agents (Cursor, then OpenRouter) to ensure continuous operation.

**Fallback Chain:**
```text
OpenHands AI → Cursor → OpenRouter (multi-model) → Manual escalation
```

---

## Why This Matters

**The Problem:** AI coding agents have usage limits. OpenHands AI has both:
- **Rate limits** (requests per minute/hour)
- **Monthly usage quotas** (total compute time/tokens per billing cycle)

When these limits are reached, workflows that depend on OpenHands fail, blocking automation and requiring manual intervention.

**The Solution:** A **fallback chain** that automatically switches to alternative agents when the primary agent is unavailable, ensuring **zero downtime** for automation.

---

## Agent Capabilities Matrix

| Agent | Strengths | Use Cases | Rate Limits | Cost |
|-------|-----------|-----------|-------------|------|
| **OpenHands AI** | Full autonomous coding, multi-file refactoring, complex debugging | Large features, architecture changes, system-wide refactors | ~10 requests/hour, monthly quota | High |
| **Cursor** | Fast iteration, inline editing, context-aware suggestions | Smaller features, bug fixes, targeted changes | ~100 requests/hour | Medium |
| **OpenRouter** | Multi-model access (Sonnet, Opus, GPT-4), no hard limits | Code review, documentation, simple changes, emergency backup | Pay-per-use, effectively unlimited | Variable (model-dependent) |

---

## Fallback Triggers

The system switches to the next agent in the chain when:

### OpenHands AI → Cursor
- **429 Too Many Requests** response from OpenHands API
- **Quota exceeded** error
- **No response** within 60 seconds (3 attempts with exponential backoff)
- **Explicit failure** message from OpenHands

### Cursor → OpenRouter
- **Rate limit exceeded** on Cursor API
- **API key invalid or expired**
- **Service unavailable** (5xx errors after 3 retries)
- **Cursor fails to complete task** within expected time

### OpenRouter → Manual Escalation
- **All models fail** (tried Sonnet → Opus → GPT-4)
- **OpenRouter service down** (confirmed via status page)
- **Task complexity exceeds model capability** (manual review required)

---

## Implementation

### 1. Environment Variables

All three API keys must be provisioned in the repository secrets:

```bash
# .env.example (variable names only)
OpenHands_API_KEY=        # Primary agent
CURSOR_API_KEY=       # Secondary agent
OPENROUTER_API_KEY=   # Tertiary agent + emergency backup
```

**Vault paths:**
- `revvel/shared/llm/OpenHands`
- `revvel/shared/llm/cursor`
- `revvel/shared/llm/openrouter`

**Provision locally:**
```bash
vault kv get -field=api_key revvel/shared/llm/OpenHands
vault kv get -field=api_key revvel/shared/llm/cursor
vault kv get -field=api_key revvel/shared/llm/openrouter
```

**Add to GitHub repo:**
```bash
# Use the credential-gatekeeper workflow or manual:
gh secret set OpenHands_API_KEY --repo midnghtsapphire/revvel-standards
gh secret set CURSOR_API_KEY --repo midnghtsapphire/revvel-standards
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

### 2. Automatic Triggers

The agent-fallback workflow **automatically triggers** on the following events:

#### Issue Labels
When an issue is labeled with:
- `wr:code` — Triggers code generation
- `wr:auto` — Triggers automated task execution
- `agent-fallback` — Explicitly requests fallback system

Example:
```bash
gh issue create --title "Add new feature" --body "Description..."
gh issue edit 123 --add-label "wr:code"
# Workflow automatically starts!
```

#### Pull Request Events
When a PR is:
- **Opened** (non-draft)
- **Reopened**
- **Ready for review** (converted from draft)

The workflow analyzes the PR and generates suggestions/improvements automatically.

Example:
```bash
gh pr create --title "New feature" --body "Implementation"
# Workflow automatically starts if PR is not a draft!
```

#### Manual Trigger
Can still be triggered manually via:
```bash
gh workflow run agent-fallback.yml -f issue_number=123
```

#### Reusable Workflow
Can be called from other workflows:
```yaml
jobs:
  my-job:
    uses: ./.github/workflows/agent-fallback.yml
    with:
      task_description: "..."
      issue_number: 123
```

### 3. Workflow Integration

The complete workflow handles all trigger types automatically:

```yaml
name: Agent Fallback Handler
on:
  # Automatic issue triggers
  issues:
    types: [labeled]

  # Automatic PR triggers
  pull_request_target:
    types: [opened, reopened, ready_for_review]

  # Reusable workflow
  workflow_call:
    inputs:
      task_description:
        required: false
        type: string
        default: ""
      issue_number:
        required: true
        type: number
    outputs:
      agent_used:
        value: ${{ jobs.execute.outputs.agent_used }}
      success:
        value: ${{ jobs.execute.outputs.success }}

jobs:
  execute:
    runs-on: ubuntu-latest
    # Only run if:
    # - Issue labeled with wr:code, wr:auto, or agent-fallback, OR
    # - PR ready for review, OR
    # - Manual/reusable workflow call
    if: |
      github.event_name == 'workflow_dispatch' ||
      github.event_name == 'workflow_call' ||
      (github.event_name == 'issues' &&
       (github.event.label.name == 'wr:code' ||
        github.event.label.name == 'wr:auto' ||
        github.event.label.name == 'agent-fallback')) ||
      (github.event_name == 'pull_request_target' &&
       github.event.pull_request.draft == false)
    steps:
      # Resolve issue context from different event types
      - name: Resolve issue context
        id: issue
        run: |
          # Handles: issues, pull_request_target, workflow_dispatch, workflow_call
          # Automatically detects event type and extracts issue/PR number

      - name: Try OpenHands AI
        id: OpenHands
        continue-on-error: true
        run: scripts/call-OpenHands-api.sh

      - name: Fallback to Cursor
        if: steps.OpenHands.outcome == 'failure'
        id: cursor
        continue-on-error: true
        run: scripts/call-cursor-api.sh

      - name: Fallback to OpenRouter
        if: steps.cursor.outcome == 'failure'
        id: openrouter
        run: node scripts/call-openrouter-with-fallback.js
```

### 4. Scripts

Three scripts implement the agent calls:

#### `scripts/call-OpenHands-api.sh`
```bash
#!/bin/bash
# Call OpenHands AI with retry logic and rate limit detection
# Returns exit code 0 on success, non-zero on failure
```

#### `scripts/call-cursor-api.sh`
```bash
#!/bin/bash
# Call Cursor API with retry logic
# Returns exit code 0 on success, non-zero on failure
```

#### `scripts/call-openrouter-with-fallback.js`
```javascript
// Call OpenRouter with model fallback chain:
// anthropic/claude-sonnet-4 → anthropic/claude-opus-4 → openai/gpt-4-turbo
// Returns JSON: { success: boolean, agent: string, result: object }
```

---

## Usage Examples

### Automatic Fallback (Recommended)

Most workflows automatically use the fallback chain:

```yaml
# .github/workflows/auto-code-generation.yml
- name: Generate code with automatic fallback
  uses: ./.github/workflows/agent-fallback.yml
  with:
    task_description: ${{ github.event.issue.body }}
    issue_number: ${{ github.event.issue.number }}
```

### Manual Agent Selection

Override the fallback and force a specific agent:

```yaml
- name: Force Cursor (skip OpenHands)
  env:
    AGENT_OVERRIDE: cursor
    CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
  run: scripts/call-cursor-api.sh
```

### Health Check Before Starting

Check agent availability before starting expensive operations:

```yaml
- name: Pre-flight health check
  id: health
  run: |
    # Check OpenHands availability
    if ! scripts/health-check-OpenHands.sh; then
      echo "agent=cursor" >> $GITHUB_OUTPUT
    else
      echo "agent=OpenHands" >> $GITHUB_OUTPUT
    fi

- name: Use recommended agent
  env:
    AGENT: ${{ steps.health.outputs.agent }}
  run: scripts/call-agent.sh $AGENT
```

---

## Monitoring & Observability

### Fallback Events

Every fallback event is logged and creates a GitHub issue for visibility:

```yaml
- name: Log fallback event
  if: steps.OpenHands.outcome == 'failure'
  uses: actions/github-script@v8
  with:
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `[AUTO-FALLBACK] OpenHands → Cursor (#${inputs.issue_number})`,
        labels: ['auto-fallback', 'agent-monitoring', 'OpenHands-limit'],
        body: `OpenHands AI rate limit reached. Automatically failed over to Cursor.

        **Original task:** #${inputs.issue_number}
        **Timestamp:** ${new Date().toISOString()}
        **Reason:** ${steps.OpenHands.outputs.error || 'Rate limit or quota exceeded'}

        No action required — fallback is working as designed.`
      });
```

### Metrics Dashboard

Track fallback frequency in the `workflow-health-dashboard.yml`:

```yaml
- name: Calculate fallback metrics
  run: |
    # Count fallback events in the last 30 days
    gh issue list --label auto-fallback --state all --created ">=$(date -d '30 days ago' +%Y-%m-%d)"

    # Calculate OpenHands success rate
    # Calculate Cursor usage percentage
    # Identify patterns (time of day, task type)
```

---

## Cost Optimization

### Smart Agent Routing

Not all tasks require OpenHands's full capabilities. Route intelligently:

```yaml
- name: Determine optimal agent
  id: route
  run: |
    TASK_COMPLEXITY=$(python scripts/estimate-task-complexity.py)

    if [ "$TASK_COMPLEXITY" = "simple" ]; then
      echo "agent=openrouter" >> $GITHUB_OUTPUT  # Cheapest
    elif [ "$TASK_COMPLEXITY" = "medium" ]; then
      echo "agent=cursor" >> $GITHUB_OUTPUT      # Balanced
    else
      echo "agent=OpenHands" >> $GITHUB_OUTPUT       # Most capable
    fi
```

**Complexity heuristics:**
- **Simple:** Documentation updates, single-file changes, <50 lines changed
- **Medium:** Bug fixes, small features, 2-5 files changed
- **Complex:** Architecture changes, multi-file refactors, >10 files changed

### Quota Management

Monitor OpenHands usage to avoid surprise overages:

```bash
# Check remaining OpenHands quota (hypothetical API)
curl -H "Authorization: Bearer $OpenHands_API_KEY" \
  https://api.OpenHands.ai/v1/quota

# Response:
# { "used": 450, "limit": 500, "resets_at": "2026-05-01T00:00:00Z" }
```

When quota is <10% remaining, **proactively switch** to Cursor for non-critical tasks.

---

## Failure Scenarios & Recovery

### Scenario 1: All Agents Fail

**What happens:** OpenHands, Cursor, and OpenRouter all fail (service outage, invalid keys, etc.)

**Recovery:**
1. Workflow creates a `needs-human` issue
2. Logs full error context (attempted agents, errors, timestamps)
3. Notifies via configured channels (Discord, email, Slack)
4. Does NOT retry automatically (prevents error spam)

**Human intervention:**
- Check agent status pages
- Verify API keys are valid
- Manually complete the task
- Update `HANDOFF.md` with resolution

### Scenario 2: Partial Agent Failure

**What happens:** OpenHands works but Cursor fails (expired key, service down)

**Recovery:**
- Workflow continues using OpenHands
- Creates a low-priority issue: `[WARNING] Cursor unavailable — fallback chain degraded`
- Human should fix Cursor config when convenient
- System continues working (no immediate impact)

### Scenario 3: Rate Limit Burst

**What happens:** Multiple workflows trigger simultaneously, all hit OpenHands rate limit

**Recovery:**
- First N workflows use OpenHands (up to rate limit)
- Next N workflows automatically fall back to Cursor
- Remaining workflows fall back to OpenRouter
- Concurrency limits prevent overwhelming any single agent

**Prevention:**
```yaml
concurrency:
  group: agent-fallback-${{ github.workflow }}
  cancel-in-progress: false  # Queue instead of cancel
```

---

## Security Considerations

### API Key Rotation

All three API keys should be rotated regularly:

```yaml
# .github/workflows/rotate-agent-keys.yml
name: Rotate Agent API Keys
on:
  schedule:
    - cron: "0 0 1 */3 *"  # Every 3 months
  workflow_dispatch:

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Rotate OpenHands key
        run: scripts/rotate-OpenHands-key.sh
      - name: Rotate Cursor key
        run: scripts/rotate-cursor-key.sh
      - name: Rotate OpenRouter key
        run: scripts/rotate-openrouter-key.sh
```

### Rate Limit Abuse Prevention

If an agent is being rate-limited excessively, it may indicate:
- **Malicious automation** (compromised workflow, fork spam)
- **Inefficient workflows** (infinite loops, redundant calls)
- **Insufficient concurrency limits**

**Detection:**
```bash
# Count fallback events in the last hour
gh issue list --label auto-fallback --created ">=@{1 hour ago}" | wc -l

# If >10, investigate
```

**Mitigation:**
- Temporarily disable problematic workflow
- Add stricter concurrency limits
- Review recent workflow changes
- Check for compromised API keys

---

## Future Enhancements

### Planned Improvements

1. **Predictive Fallback**
   - Monitor OpenHands quota usage
   - Proactively switch to Cursor when quota <20%
   - Switch back to OpenHands when quota resets

2. **Agent Performance Tracking**
   - Track success rate per agent per task type
   - Automatically route tasks to best-performing agent
   - Learn optimal agent selection over time

3. **Cost-Aware Routing**
   - Track cost per agent per task
   - Optimize for cost vs. speed vs. quality
   - Configurable cost thresholds

4. **Multi-Region Fallback**
   - Deploy workflows in multiple regions
   - Route to region with available quota
   - Reduce latency, improve reliability

---

## See Also

- [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — OpenRouter triage workflow
- [`docs/AGENTS.md`](../AGENTS.md) — Universal agent instructions (read by Cursor via `.cursorrules`)
- [`docs/AGENT_AUTONOMY_PROTOCOLS.md`](./AGENT_AUTONOMY_PROTOCOLS.md) — Self-healing patterns
- [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) — Multi-agent orchestration
- [`.env.example`](../.env.example) — Environment variable reference

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-04-30 | Initial agent fallback process documented | @copilot |
