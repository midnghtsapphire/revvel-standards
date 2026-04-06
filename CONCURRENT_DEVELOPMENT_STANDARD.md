# Concurrent Development Standard

## Branch Protection Rules (MANDATORY)
1. **No direct pushes to master/main** — all changes via feature branches + PRs
2. **No force-push EVER** — `git push --force` is banned across all repos
3. **Branch protection enabled** — require PR review before merge
4. **Linear history preferred** — rebase before merge, no merge commits

## Multi-Team Coordination
When multiple teams/agents work on the same repo simultaneously:
1. Each team gets a dedicated feature branch: `feat/team-name-description`
2. Teams commit and push to their feature branch freely
3. When ready, create a PR to master
4. PRs are merged sequentially (first-come-first-served)
5. If conflicts, the later team rebases on the updated master
6. **NEVER force-push to resolve conflicts** — always rebase

## Automated Team Workflow
1. Team starts → creates feature branch from latest master
2. Team works → commits frequently to feature branch
3. Team finishes → creates PR with description of all changes
4. Venice AI reviews the PR (mandatory)
5. PR merged to master → auto-deploys to production
6. Next team's PR is rebased on new master if needed

## Incident: April 3, 2026
Three teams pushed directly to master. Team 3 force-pushed, overwriting Teams 1 and 2's commits. This standard exists to prevent this from ever happening again.

## Enforcement
- GitHub branch protection rules set via API on all repos
- Pre-push hooks in CI/CD templates
- Any force-push triggers an alert
