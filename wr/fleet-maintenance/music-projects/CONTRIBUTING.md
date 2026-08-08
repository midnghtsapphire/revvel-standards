# Contributing — Music Projects

Private repository. Contributors are owner-approved agents and humans only.

## Branch conventions

| Branch | Use |
| --- | --- |
| `main` | Protected default. Green only. |
| `fleet/*` | Fleet-maintenance packages from revvel-standards |
| `feat/*` | Features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation-only |
| `chore/*` | Tooling / workflows |

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add stem-separation checklist
fix: correct AGENTS project context
docs: refresh README overview table
chore(ci): add CodeQL workflow
```

PR titles must match `type(scope): description`.

## Pull request flow

1. Branch from latest `main`.
2. Keep the diff minimal and complete — no scaffolding and no unfinished stub handlers.
3. Run `npm test` and `npm run validate:workflows` locally.
4. Open a PR (draft is fine while jury runs; mark ready when green).
5. Full jury must complete:
   - OpenRouter AI PR review
   - Jules PR reviewer
   - Semgrep
   - CodeQL
6. Squash-merge preferred; never force-push `main`.

## Secrets

| Secret | Required by | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | `ai-pr-review-openrouter.yml` | Funded OpenRouter account; `:free` models still need credits |
| `JULES_API_KEY` | `jules-pr-reviewer.yml` | Skip path publishes success status if unset |
| `ADMIN_GITHUB_TOKEN` | optional PAT | Prefer for higher rate limits on review actions |
| `GITHUB_TOKEN` | default | Provided by Actions; does not re-trigger workflows |

Never put secrets in argv, commit messages, or workflow `echo` output. Prefer
`--token-stdin` / env injection.

## Kill switches

| Mechanism | Effect |
| --- | --- |
| `[skip-review]` in PR title | Skips OpenRouter AI review job |
| Label `jules-override` | Bypasses Jules fail-on blocking |
| Draft PR | OpenRouter review waits until ready_for_review |

## Local validation

```bash
npm install
npm test
npm run validate:workflows
```

## Documentation expectations

- Update `README.md` when structure or live URLs change.
- Append `CHANGELOG.md` for user-visible or ops-visible changes.
- Keep `docs/OVERVIEW.md` aligned with monetization and tool choices.
- Keep `AGENTS.md` project-specific context accurate (no copy-paste from other apps).

## Definition of done (fleet)

Borrowed from `revvel-standards/docs/DEFINITION_OF_DONE.md`:

- No scaffolding in shipped files.
- Tests pass.
- Jury workflows present and syntactically valid.
- Live product URLs recorded when a deployable surface exists.
