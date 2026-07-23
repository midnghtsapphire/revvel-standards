# Code Review Skill

Enforce Revvel code review standards including security, accessibility, test coverage, and style gates before merging.

## Review Pipeline

> **Note:** Updated May 6, 2026 — reflects current production setup

1. **Bito AI** — Primary AI PR reviewer (assigned automatically via workflow labels)
2. **OpenRouter** (claude-sonnet-4 via OpenRouter) — Fallback for complex logic/architecture  
3. **Coderabbit** — Automated line-by-line PR review; all comments must be addressed before merge
4. **PromptFoo** — Skill/LLM testing with Claude Sonnet 4 (replaces PandaOps)

### Primary Model Configuration (Claude Sonnet 4 via OpenRouter)
```yaml
# promptfooconfig.yaml
providers:
  - id: anthropic/claude-sonnet-4  # Primary - Claude Sonnet 4
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0

# Fallback: Claude Sonnet 4.5
  - id: anthropic/claude-sonnet-4.5
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0
```

### Fallback Model Chain
```text
Bito AI → Claude Sonnet 4 (OpenRouter) → Claude Sonnet 4.5 (fallback)
```

### Integration (How to Enable)

```bash
# Bito AI - enable via GitHub Marketplace
# https://github.com/marketplace/bito-ai-code-reviewer

# PromptFoo for skill/LLM testing - GitHub Action
# https://github.com/promptfoo/promptfoo-action
cp templates/cicd/prompt-eval.yml .github/workflows/

# Coderabbit - enable via GitHub Marketplace
# https://github.com/marketplace/coderabbit-ai
```

### Skill Testing with PromptFoo

For testing Revvel skills (ephemeral agents), use PromptFoo with Claude Sonnet 4:

```bash
# Run skill tests
npm install -g promptfoo
promptfoo eval --config skills/my-skill/tests/promptfoo.yml

# Or use GitHub Action - runs on PR changes to skills/
```

**Why PromptFoo over PandaOps:**
- Tests actual skill/prompt outputs, not code diffs
- Claude Sonnet 4 via OpenRouter as primary
- Red-teaming security built-in
- GitHub Action for CI automation

## Deployment Pipeline

- Official flow: Dev → Test → Live
- Current exception: Live-First (code pushed directly to `main` → auto-deploys)
- CI/CD via GitHub Actions (web/backend) or CodeMagic (mobile/React Native/Expo)

## No Force-Push Policy (Non-Negotiable)

`git push --force` is **permanently banned** across all repos.
- Branch protection rules must block force-pushes at the server level
- If a branch diverged, always use `git rebase` — never `--force`
- Any force-push triggers an immediate alert to the repo owner

## Security Gates (CI-Enforced)

- All secrets via HashiCorp Vault or GitHub Actions Secrets — hardcoded credentials = immediate pipeline failure
- `pnpm audit --audit-level=high` for dependency scanning
- Static analysis for SQL injection, XSS before deployment

## PR Checklist (Every PR Before Merge)

- [ ] No hardcoded secrets or credentials
- [ ] All new API routes have Zod input validation
- [ ] All new API routes have auth/authorization checks
- [ ] No raw SQL with user-provided values
- [ ] No `console.log` leaking sensitive data to production logs
- [ ] No `eval()`, `Function()`, or dynamic `require()`
- [ ] CORS not widened beyond necessary origins
- [ ] Rate limiting on all new public endpoints
- [ ] Tests written for new functionality (no test = PR rejected)
- [ ] Coverage thresholds maintained (80% statements/functions/lines, 75% branches)
- [ ] Coderabbit comments addressed

## CI/CD Templates

- Copy `templates/cicd/security.yml` → `.github/workflows/security.yml`
- Copy `templates/cicd/auto-fix.yml` → `.github/workflows/auto-fix.yml`
- Copy `templates/cicd/deploy.yml` for standard deploy workflow
