# Apply this fleet package to `midnghtsapphire/music-projects`

Package root: `wr/fleet-maintenance/music-projects/`

## One-shot apply (from a checkout of music-projects)

```bash
# From revvel-standards repo root:
PKG=wr/fleet-maintenance/music-projects
TARGET=/path/to/music-projects

rsync -a \
  --exclude APPLY.md \
  --exclude '.git' \
  "$PKG"/ "$TARGET"/

cd "$TARGET"
npm test
git checkout -b fleet/music-projects-baseline
git add -A
git commit -m "chore(fleet): docs refresh, jury workflows, and baseline tests"
git push -u origin HEAD
gh pr create --draft --title "chore(fleet): docs refresh + full review jury" \
  --body "Closes midnghtsapphire/revvel-standards#16827

Fleet maintenance package from revvel-standards.
- Docs: README, CONTRIBUTING, OVERVIEW, AGENTS fix
- Jury: OpenRouter, Jules, Semgrep, CodeQL
- DX: package.json + structure tests
"
```

## GitHub API apply (no local clone)

Use `gh api` / Contents API to create branch `fleet/music-projects-baseline`
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

- Draft PR: <https://github.com/midnghtsapphire/music-projects/pull/1>
- Branch: `fleet/music-projects-baseline`
- Date: 2026-08-08
