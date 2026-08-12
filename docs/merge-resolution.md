# Merge Conflict Resolution Guide

## Prime Directive Alignment

All merge resolutions must serve the $10k/month → $10M in 3 years mission.

## Resolution Priority

1. **Revenue-generating code** (Polar.sh integrations, OSINT tools, product pipeline) — always keep
2. **Tests protecting revenue paths** — always keep
3. **Documentation of monetization flows** — merge both sides
4. **Formatting-only conflicts** — accept incoming (main)

## Standard Procedure

```bash
# 1. Update main
git fetch origin
git checkout main
git pull --ff-only origin main

# 2. Rebase feature branch
git checkout <feature-branch>
git rebase origin/main

# 3. Resolve conflicts per priority above
# 4. Run tests
npm test || pytest || true

# 5. Force-push with lease
git push --force-with-lease
```

## Automated Bot Review Checklist

When bots (`@github-actions`, `@dependabot`, `@codex`, `@claude`, `@devin-ai-integration`,
`@openhands-agent`, `google-labs-jules`, `@circleci-app`, `imgbot`, `@replit-agent`)
leave review comments:

- [ ] Security warnings — address immediately (blocks merge)
- [ ] Dependency bumps — auto-merge if CI green and semver-safe
- [ ] Style nits — batch into single follow-up commit
- [ ] AI suggestions — evaluate against Prime Directive before applying

## Common Conflict Patterns

### package.json / requirements.txt
Union-merge dependency lists, then run install to regenerate lockfile.

### Generated files (lockfiles, build artifacts)
Delete and regenerate from source of truth — never hand-edit.

### Documentation
Keep both sections when they describe distinct features.

## Escalation

If a conflict blocks a revenue-critical PR for more than 24h, comment `/dragnet escalate`
on the PR to route to a human maintainer.
