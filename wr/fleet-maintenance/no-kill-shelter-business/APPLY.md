# Apply this fleet package to `midnghtsapphire/no-kill-shelter-business`

Package root: `wr/fleet-maintenance/no-kill-shelter-business/`

## One-shot apply (from a checkout of no-kill-shelter-business)

```bash
# From revvel-standards repo root:
PKG=wr/fleet-maintenance/no-kill-shelter-business
TARGET=/path/to/no-kill-shelter-business

rsync -a \
  --exclude APPLY.md \
  --exclude '.git' \
  "$PKG"/ "$TARGET"/

cd "$TARGET"
npm test
git checkout -b fleet/no-kill-shelter-business-baseline
git add -A
git commit -m "chore(fleet): docs refresh, jury workflows, and baseline tests"
git push -u origin HEAD
gh pr create --draft --title "chore(fleet): docs refresh + full review jury" \
  --body "Closes midnghtsapphire/revvel-standards#16831

Fleet maintenance package from revvel-standards.
- Docs: README, CONTRIBUTING, OVERVIEW, AGENTS fix
- Jury: OpenRouter, Jules, Semgrep, CodeQL
- DX: package.json + structure tests
"
```

## GitHub API apply (no local clone)

Use `gh api` / Contents API to create branch `fleet/no-kill-shelter-business-baseline`
from `main`, then commit each file under this package (except `APPLY.md`).
Open a draft PR against `main` when the commit lands.

## Required repository secrets on the target

| Secret | Workflow |
| --- | --- |
| `OPENROUTER_API_KEY` | ai-pr-review-openrouter.yml |
| `JULES_API_KEY` | jules-pr-reviewer.yml (optional skip path) |
| `ADMIN_GITHUB_TOKEN` | optional PAT for higher rate limits |

## Verification

```bash
npm test
npm run validate:workflows
```

## Applied

- Draft PR: <https://github.com/midnghtsapphire/no-kill-shelter-business/pull/1>
- Branch: `fleet/no-kill-shelter-business-baseline`
- Date: 2026-08-08
