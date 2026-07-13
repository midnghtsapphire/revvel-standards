# Secrets Management vs Governance Clarification

**Last Updated:** May 6, 2026  
**Status:** Current

## Overview

This document clarifies the distinction between **secrets management tooling** and **governance/routing/quality gates** in the Revvel standards repository. This separation was introduced to address confusion about the role of secrets tools in the code review and automation pipeline.

## Key Principle

> **Secrets management tools (HashiCorp Vault, GitHub Secrets) are NOT output-type classifiers or quality gates.**

Their job is to **store and retrieve secrets securely**. They do not determine:
- Whether code is good or bad
- Whether a PR should be approved or rejected
- What type of output an agent produced
- Whether tests passed or failed

## Secrets Management Tools

### Purpose
**Store, retrieve, and inject secrets into workflows securely.**

### Tools Used
- **HashiCorp Vault** — Enterprise secret storage (AppRole + OIDC auth)
- **GitHub Actions Secrets** — Repository-level secret injection
- **BITO AI Vault integration** — Desktop API secret retrieval

### Responsibilities
✅ **DOES:**
- Store API keys (`OPENROUTER_API_KEY`, `BITO_API_KEY`, `ANTHROPIC_API_KEY`)
- Inject secrets into CI/CD workflows
- Rotate and revoke credentials
- Audit secret access
- Provide secure desktop API access via `bito secret get`

❌ **DOES NOT:**
- Determine if code is ready to merge
- Classify agent outputs (e.g., "this is a bug fix" vs "this is a feature")
- Run quality checks or linters
- Route tasks to specific agents
- Approve or reject PRs

### Example: Correct Usage
```yaml
# .github/workflows/pr-auto-review.yml
- name: Run OpenRouter auto-review
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}  # ✅ Secret injection
  run: node scripts/pr-auto-review.js
```

The secret is **injected**, but the **review logic** lives in `pr-auto-review.js`, not in the secrets tool.

---

## Governance & Routing Tools

### Purpose
**Route tasks to appropriate agents, enforce quality gates, and manage workflow orchestration.**

### Tools Used
- **Anti-Scaffolding Enforcer** — Blocks incomplete code from merging
- **BITO AI** — Primary code reviewer (logic, security, context)
- **Coderabbit** — Automated line-by-line review (syntax, style)
- **PromptFoo** — Skill/LLM output testing (correctness, security)
- **OpenRouter Routing** — Task-based model selection with fallbacks
- **Label-based automation** — Route issues/PRs based on labels (`openrouter`, `needs-action`, etc.)

### Responsibilities
✅ **DOES:**
- Determine if PR passes quality checks
- Route issues to appropriate agents (OpenRouter, Cursor, Devin)
- Classify task types (bug fix, feature, refactor)
- Enforce coding standards (no scaffolding, test coverage, security)
- Select appropriate models for tasks (`repo_surgery`, `cheap_batch_edits`, `hard_debug`)

❌ **DOES NOT:**
- Store or retrieve secrets (delegates to Vault/GitHub Secrets)
- Manage credential rotation or access control

### Example: Correct Usage
```yaml
# .github/workflows/openrouter-assignee.yml
- name: Assign Copilot for OpenRouter routing
  uses: actions/github-script@v7
  with:
    script: |
      // ✅ Governance logic: route based on labels
      if (context.payload.issue.labels.some(l => l.name === 'openrouter')) {
        await github.rest.issues.addAssignees({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.payload.issue.number,
          assignees: ['Copilot']
        });
      }
```

This workflow **routes** tasks but doesn't store secrets.

---

## Output-Type Classification

### What It Is
Determining the **type of output** an agent produced:
- Bug fix
- Feature implementation
- Refactor
- Documentation update
- Configuration change

### Where It Belongs
**NOT in secrets management.** Output-type classification should live in:

1. **Agent prompts** — Agents should self-classify outputs
   ```javascript
   // scripts/openrouter-routing.js
   const result = await routedChat({
     profile: 'repo_surgery',  // ✅ Task classification
     messages: [{ role: 'user', content: 'Fix auth bug' }]
   });
   ```

2. **Workflow logic** — Analyze git diffs or PR labels
   ```yaml
   - name: Classify PR type
     run: |
       if git diff --name-only | grep -q "\.test\."; then
         echo "type=test-only" >> $GITHUB_ENV  # ✅ Output classification
       fi
   ```

3. **Project prompt documentation** — Guide agents on classification
   ```markdown
   # PROJECT_PROMPT.md
   
   ## Output Classification
   
   When completing a task, classify your work:
   - `bug-fix`: Fixes incorrect behavior
   - `feature`: Adds new functionality
   - `refactor`: Improves code without changing behavior
   ```

### Where Output-Type Routing Should Live

**Future enhancement:** Add output-type routing to `docs/PROJECT_PROMPT_TEMPLATE.md` or `templates/project-prompt/`.

**Example integration:**
```markdown
# PROJECT_PROMPT.md

## Agent Output Classification

After completing a task, classify your output and apply appropriate labels:

| Output Type | Label | When to Use |
|-------------|-------|-------------|
| Bug Fix | `type:bug-fix` | Fixed incorrect behavior |
| Feature | `type:feature` | Added new functionality |
| Refactor | `type:refactor` | Improved code structure |
| Docs | `type:docs` | Updated documentation |
| Config | `type:config` | Changed configuration |
| Security | `type:security` | Fixed vulnerability |

Apply labels automatically:
```yaml
gh issue edit $ISSUE_NUMBER --add-label "type:bug-fix"
```
```

---

## Common Confusion Points

### ❌ Wrong Assumption
"HashiCorp Vault knows if my code is good quality."

### ✅ Correct Understanding
"HashiCorp Vault stores my API keys. BITO AI and Coderabbit check code quality."

---

### ❌ Wrong Assumption
"GitHub Secrets will route my task to the right agent."

### ✅ Correct Understanding
"GitHub Secrets provides API keys. `openrouter-assignee.yml` routes tasks based on labels."

---

### ❌ Wrong Assumption
"I should add quality gate logic to my Vault integration."

### ✅ Correct Understanding
"Vault retrieves secrets. Quality gates live in CI workflows like `anti-scaffolding-enforcer.yml`."

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Developer writes code                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Push to PR   │
         └───────┬───────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐    ┌─────────────────────────┐
│ SECRETS         │    │ GOVERNANCE & ROUTING    │
│ (Storage only)  │    │ (Decision making)       │
├─────────────────┤    ├─────────────────────────┤
│ • Vault         │◄───┤ • BITO AI (reviewer)    │
│ • GitHub Secrets│    │ • Coderabbit (linter)   │
│                 │    │ • Anti-scaffolding      │
│ Provides:       │    │ • PromptFoo (testing)   │
│ - API keys      │    │ • OpenRouter routing    │
│ - Credentials   │    │                         │
│                 │    │ Decides:                │
│ Does NOT:       │    │ - Approve/reject PR     │
│ - Review code   │    │ - Route to agent        │
│ - Route tasks   │    │ - Classify output       │
│ - Classify work │    │ - Enforce standards     │
└─────────────────┘    └─────────────────────────┘
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  PR Merged    │
              └───────────────┘
```

---

## Related Documentation

- [CODE_REVIEW_WORKFLOW_STATUS.md](CODE_REVIEW_WORKFLOW_STATUS.md) - Current workflow status
- [OPENROUTER_MODEL_ROUTING.md](OPENROUTER_MODEL_ROUTING.md) - Task-based model routing
- [AGENT_ROUTING_POLICY.md](AGENT_ROUTING_POLICY.md) - Agent routing rules
- [PROJECT_PROMPT_TEMPLATE.md](PROJECT_PROMPT_TEMPLATE.md) - Where output classification should live (TODO)
