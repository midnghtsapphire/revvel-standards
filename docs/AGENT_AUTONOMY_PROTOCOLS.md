# Agent Autonomy Protocols

## Overview

This document defines the protocols that enable agents to operate with **driven autonomy** in the MIDNGHTSAPPHIRE organization. These protocols ensure agents are self-sufficient, self-healing, and relentlessly resourceful.

## GOAP (Goal-Oriented Action Planning)

### What is GOAP

Goal-Oriented Action Planning is an AI planning system where agents:

1. Start with a clear goal
2. Identify available actions
3. Build a plan to achieve the goal
4. Execute actions dynamically
5. Adapt when conditions change

### GOAP Implementation

When facing a complex task:

#### 1. Define the Goal State

```text
GOAL: Branch creation succeeds for all issue titles
CURRENT STATE: Branch creation fails for titles containing URLs
DELTA: Need to sanitize issue titles to remove git-unsafe characters
```

#### 2. Identify Available Actions

- Research git ref naming rules
- Update configuration files
- Test sanitization logic
- Deploy and verify
- Document solution

#### 3. Build Action Plan

```text
1. Research → Learn what characters are invalid
2. Update config → Add characters to gitReplaceChars
3. Test → Verify sanitization works
4. Deploy → Commit and push changes
5. Document → Record solution for future
```

#### 4. Execute with Adaptation

- Execute actions in sequence
- Monitor for blockers
- If action fails, add recovery actions:
  - Diagnose root cause
  - Research solutions
  - Implement alternative approach
  - Continue toward goal

#### 5. Verify Goal Achievement

- Test that original failure case now succeeds
- Verify no regressions
- Confirm goal state is reached

### GOAP Template for Complex Tasks

````markdown
## Task: [Clear description]

### Goal State

- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] [Specific, measurable outcome 3]

### Current State

- Current condition 1
- Current condition 2
- Current condition 3

### Available Actions

1. **Action name** — what it does, inputs/outputs
2. **Action name** — what it does, inputs/outputs
3. **Action name** — what it does, inputs/outputs

### Action Plan

```
[Action 1] → [Expected result]
  ↓
[Action 2] → [Expected result]
  ↓
[Action 3] → [Expected result]
  ↓
[GOAL ACHIEVED]
```

### Recovery Actions (if any action fails)

- **If [Action 1] fails:** [Alternative approach]
- **If [Action 2] fails:** [Alternative approach]
- **If [Action 3] fails:** [Alternative approach]

### Verification Criteria

- [ ] Test 1 passes
- [ ] Test 2 passes
- [ ] No regressions
- [ ] Documentation updated
````

## Swarm Coordination

### What is Swarm Coordination

Swarm coordination enables multiple agents to work on parallel, independent subtasks while sharing context and synchronizing results.

### When to Use Swarms

Use swarm coordination when:

- Task decomposes into 3+ independent subtasks
- Subtasks can execute in parallel
- Results need to be integrated
- Overall complexity is high but subtasks are straightforward

**Example:** Updating 10 different services in a microservices architecture

### Swarm Protocol

#### 1. Task Decomposition

Break the main task into independent subtasks:

```text
MAIN TASK: Update all services to use new authentication library

SUBTASKS:
1. Update user-service
2. Update payment-service
3. Update notification-service
4. Update analytics-service
5. Update admin-service
```

#### 2. Spawn Sub-Agents

For each subtask, spawn a specialized agent with:

- Clear goal
- Required context
- Success criteria
- Communication channel

```bash
# Example using task tool
task agent_type=task name=update-user-service description="Update user-service auth"
task agent_type=task name=update-payment-service description="Update payment-service auth"
task agent_type=task name=update-notification-service description="Update notification-service auth"
# ... etc
```

#### 3. Monitor Progress

Track each agent's status:

- Started
- In progress
- Blocked (needs intervention)
- Completed
- Failed

#### 4. Handle Failures

When an agent fails:

- Diagnose why it failed
- Determine if it blocks other agents
- Retry with different approach
- If unrecoverable, document and continue with other subtasks

#### 5. Synthesize Results

Once all agents complete:

- Combine outputs
- Test integration
- Verify overall goal is met
- Document what worked and what didn't

### Swarm Anti-Patterns

❌ **Don't use swarms when:**

- Subtasks have tight dependencies
- Subtasks need to execute sequentially
- Task is simple enough to do yourself
- Coordination overhead exceeds parallelization benefit

## Self-Healing Workflows

### Self-Healing Principles

Every workflow should be **self-healing**:

1. **Detect failures** — monitor execution, capture errors
2. **Diagnose root cause** — parse errors, check logs, inspect state
3. **Attempt automatic fix** — retry with backoff, use fallback, apply known solutions
4. **Escalate if needed** — create issue, notify humans, but only after exhausting options
5. **Document solution** — record what failed and how it was fixed

### Self-Healing Pattern for Workflows

```yaml
name: Self-Healing Example

on:
  workflow_dispatch:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours

jobs:
  main-task:
    runs-on: ubuntu-latest
    steps:
      - name: Attempt primary action
        id: primary
        continue-on-error: true
        run: |
          # Primary action that might fail
          ./run-primary-task.sh

      - name: Diagnose failure if needed
        if: steps.primary.outcome == 'failure'
        id: diagnose
        run: |
          echo "Primary action failed, diagnosing..."
          # Check logs, inspect state, identify root cause
          ./diagnose-failure.sh

      - name: Attempt automatic fix
        if: steps.primary.outcome == 'failure'
        id: fix
        continue-on-error: true
        run: |
          echo "Attempting automatic remediation..."
          # Apply known fixes, retry with different params
          ./auto-fix.sh

      - name: Retry primary action
        if: steps.fix.outcome == 'success'
        id: retry
        continue-on-error: true
        run: |
          echo "Retrying primary action after fix..."
          ./run-primary-task.sh

      - name: Try fallback approach
        if: steps.retry.outcome == 'failure' || steps.fix.outcome == 'failure'
        id: fallback
        continue-on-error: true
        run: |
          echo "Primary failed, trying fallback approach..."
          ./run-fallback-task.sh

      - name: Create issue for persistent failure
        if: steps.fallback.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '[AUTO] Self-Healing Workflow Failed: ${{ github.workflow }}',
              body: `## Workflow Failure Report
              
              **Workflow:** ${{ github.workflow }}
              **Run:** ${{ github.run_id }}
              **Time:** ${{ github.event.repository.updated_at }}
              
              ### What Failed
              - Primary action: ${{ steps.primary.outcome }}
              - Auto-fix attempt: ${{ steps.fix.outcome }}
              - Retry: ${{ steps.retry.outcome }}
              - Fallback: ${{ steps.fallback.outcome }}
              
              ### Next Steps
              This workflow has exhausted all automatic recovery options. Manual investigation required.
              
              ### Logs
              [View full run logs](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
              `,
              labels: ['workflow-failure', 'auto-created', 'needs-investigation']
            });
            console.log(\`Created issue #\${issue.data.number}\`);

      - name: Report success
        if: steps.primary.outcome == 'success' || steps.retry.outcome == 'success' || steps.fallback.outcome == 'success'
        run: |
          echo "✅ Workflow completed successfully"
          if [ "${{ steps.retry.outcome }}" == "success" ]; then
            echo "Note: Required automatic fix and retry"
          elif [ "${{ steps.fallback.outcome }}" == "success" ]; then
            echo "Note: Primary failed, fallback succeeded"
          fi
```

### Error Detection Patterns

#### Pattern 1: API Call with Retry

```yaml
- name: Call API with retry
  id: api_call
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 2
    max_attempts: 3
    retry_wait_seconds: 10
    command: |
      curl -f -X POST https://api.example.com/endpoint \
        -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
        -d '{"data": "value"}'
```

#### Pattern 2: Check Dependencies

```yaml
- name: Verify dependencies
  run: |
    # Check if required tools are available
    command -v node || (echo "Node not found, installing..." && sudo apt-get install -y nodejs)
    command -v npm || (echo "npm not found, installing..." && sudo apt-get install -y npm)

    # Verify versions
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "18" ]; then
      echo "Node version too old, updating..."
      # Install newer version
    fi
```

#### Pattern 3: Fallback to Alternative

```yaml
- name: Try primary service
  id: primary_service
  continue-on-error: true
  run: ./use-primary-service.sh

- name: Use fallback service
  if: steps.primary_service.outcome == 'failure'
  run: |
    echo "Primary service unavailable, using fallback"
    ./use-fallback-service.sh
```

## OpenRouter Failure Handling

### OpenRouter-Specific Self-Healing

When OpenRouter API calls fail:

#### 1. Immediate Retry with Backoff

> **For illustration only.** Do **not** paste this example into a CI workflow where stdout/stderr is logged. Always call OpenRouter via `scripts/openrouter-routing.js` (or another wrapper) so the key never appears in user-controlled contexts. — Octopus audit 2026-05-28

See the illustration-only caveat in [OPENROUTER_API_KEY_VERIFICATION_STANDARD.md](./OPENROUTER_API_KEY_VERIFICATION_STANDARD.md) before using any code examples below.

```javascript
async function callOpenRouterWithRetry(prompt, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4",
            messages: [{ role: "user", content: prompt }],
          }),
        },
      );

      if (response.ok) {
        return await response.json();
      }

      // Handle rate limiting
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(
          `Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxAttempts}`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Handle other errors
      console.error(
        `OpenRouter error (attempt ${attempt}/${maxAttempts}):`,
        response.status,
      );
    } catch (error) {
      console.error(
        `Network error (attempt ${attempt}/${maxAttempts}):`,
        error.message,
      );
    }

    // Wait before retry
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("OpenRouter API failed after all retry attempts");
}
```

#### 2. Model Fallback Chain

```javascript
const MODEL_FALLBACK_CHAIN = [
  "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4",
  "openai/gpt-4-turbo",
  "openai/gpt-4",
  "anthropic/claude-3-haiku",
];

async function callWithFallback(prompt) {
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await callOpenRouter(prompt, model);
      console.log(`✅ Success with model: ${model}`);
      return response;
    } catch (error) {
      console.error(`❌ ${model} failed:`, error.message);
      // Continue to next model
    }
  }

  throw new Error("All OpenRouter models failed");
}
```

#### 3. Circuit Breaker Pattern

```javascript
class OpenRouterCircuitBreaker {
  constructor() {
    this.failures = 0;
    this.threshold = 5;
    this.timeout = 60000; // 1 minute
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          "Circuit breaker is OPEN - OpenRouter temporarily disabled",
        );
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
      console.error(
        `Circuit breaker opened due to ${this.failures} consecutive failures`,
      );
    }
  }
}

const circuitBreaker = new OpenRouterCircuitBreaker();

// Usage
await circuitBreaker.call(() => callOpenRouter(prompt));
```

#### 4. Health Check & Pre-emptive Fallback

```yaml
- name: Check OpenRouter health
  id: health_check
  continue-on-error: true
  run: |
    # Simple health check
    response=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer ${{ secrets.OPENROUTER_API_KEY }}" \
      https://openrouter.ai/api/v1/models)

    if [ "$response" != "200" ]; then
      echo "healthy=false" >> $GITHUB_OUTPUT
      echo "OpenRouter unhealthy: $response"
    else
      echo "healthy=true" >> $GITHUB_OUTPUT
    fi

- name: Use OpenRouter
  if: steps.health_check.outputs.healthy == 'true'
  run: ./use-openrouter.sh

- name: Use local model fallback
  if: steps.health_check.outputs.healthy != 'true'
  run: |
    echo "OpenRouter unavailable, using local model"
    ./use-local-model.sh
```

## Automatic Issue Creation for Failures

### When to Create Auto-Issues

Create automatic issues for:

- ✅ Errors that were fixed (for documentation)
- ✅ Recurring failures that need pattern recognition
- ✅ Workflow failures after exhausting recovery options
- ✅ Security vulnerabilities discovered
- ✅ Performance issues detected

Do NOT create issues for:

- ❌ Transient errors that resolved on retry
- ❌ Expected failures (e.g., validation rejecting bad input)
- ❌ Errors that are still occurring (fix first, document second)

### Auto-Issue Template

```yaml
- name: Create documentation issue for solved problem
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '[AUTO-FIX] ${{ env.ERROR_TITLE }}',
        body: `## Problem
        ${{ env.ERROR_DESCRIPTION }}
        
        ## Error Details
        \`\`\`
        ${{ env.ERROR_MESSAGE }}
        \`\`\`
        
        ## Root Cause
        ${{ env.ROOT_CAUSE }}
        
        ## Solution Implemented
        ${{ env.SOLUTION }}
        
        ## Prevention
        ${{ env.PREVENTION_MEASURES }}
        
        ## Links
        - PR: #${{ github.event.pull_request.number }}
        - Workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        
        ---
        
        _This issue was created automatically to document a problem that was solved autonomously._
        `,
        labels: ['auto-fix', 'documentation', 'solved']
      });
```

## Fine-Grained Error Learning

### Error Pattern Database

Maintain a knowledge base of errors and solutions:

```json
{
  "errors": [
    {
      "pattern": "refs/heads/.* is not a valid ref name",
      "category": "git-branch-naming",
      "root_cause": "Issue title contains git-unsafe characters",
      "solution": "Update .github/issue-branch.yml gitReplaceChars to include all invalid characters",
      "prevention": "Comprehensive character sanitization",
      "occurrences": 5,
      "last_seen": "2026-04-29T19:00:00Z",
      "fixed": true
    },
    {
      "pattern": "OpenRouter API returned 429",
      "category": "rate-limiting",
      "root_cause": "Too many requests in short time",
      "solution": "Exponential backoff retry with circuit breaker",
      "prevention": "Request throttling, caching",
      "occurrences": 12,
      "last_seen": "2026-04-29T18:30:00Z",
      "fixed": true
    }
  ]
}
```

### Learning Loop

1. **Capture** — When error occurs, capture full context
2. **Analyze** — Match against known patterns
3. **Apply** — Use known solution if pattern matches
4. **Update** — If new pattern, add to database
5. **Share** — Propagate learning across all repos

## Summary

These protocols enable agents to:

- ✅ Work autonomously without constant human intervention
- ✅ Recover from failures automatically
- ✅ Learn from errors and improve over time
- ✅ Coordinate complex tasks across multiple agents
- ✅ Document solutions for future use
- ✅ Ship working code despite obstacles

**This is the MIDNGHTSAPPHIRE way. This is driven autonomy.**
