# Workflow Permissions Standard

**WR-16450 — add perm to revvel-standards**

Every GitHub Actions workflow in this repository must declare a least-privilege
`permissions:` block so the default `GITHUB_TOKEN` cannot silently over- or
under-grant scopes.

## Rules

1. **Every workflow file declares `permissions:`** at workflow level and/or on
   each job that needs a different scope set. No bare workflows.
2. **Default baseline for read-only jobs** is `contents: read`.
3. **Grant write scopes only where a step calls a write API**, and prefer
   **job-level** overrides on multi-job workflows so sibling jobs stay narrow.
4. **Setting any `permissions:` block resets unlisted scopes to none** — always
   re-declare every scope the job still needs when overriding.
5. **Common write pairings:**

   | Call / tool | Required scope |
   | --- | --- |
   | `issues.create` / `createComment` / labels on issues | `issues: write` |
   | PR comments / reviews / PR labels | `pull-requests: write` (and often `issues: write` for `gh issue edit` on a PR number) |
   | `actions.createWorkflowDispatch` / `gh workflow run` | `actions: write` |
   | `git push` / contents write | `contents: write` |
   | OIDC (`core.getIDToken`, deploy-pages, keyless cloud auth) | `id-token: write` — see `docs/OIDC_PERMISSIONS_AUDIT.md` |

## Permanent WR Acknowledgements (every WR type)

Alongside token scopes, every Work Request type permanently includes the
**Acknowledgements** contract (heavy form, OpenHands quick form, BASIC/FULL
markdown templates, and `config/wr-field-defaults.yml`):

- Bundled outcome, not a minimum patch
- No silent deferral of secondary items
- Partial PRs document blockers
- PR reflects required bundle + definition of done
- **After implementation, open a PR and continue the loop** (reset routing
  labels / trigger downstream workflows) instead of stopping at the issue

Enforced by `tests/wr-acknowledgements-permanent.test.js`.

## Regression tests

- `tests/workflow-permissions.test.js` — every workflow has `permissions:`;
  known write consumers keep matching scopes.
- `tests/wr-acknowledgements-permanent.test.js` — every WR type keeps the five
  acknowledgement lines.

## How to fix a 403 `Resource not accessible by integration`

1. Identify the REST/CLI call that failed in the job log.
2. Add the matching scope from the table above to the **job** (preferred) or
   workflow `permissions:` block, re-declaring other needed scopes.
3. Extend `tests/workflow-permissions.test.js` if the call site is a new pattern.
4. Do **not** set `permissions: write-all` as a shortcut.
