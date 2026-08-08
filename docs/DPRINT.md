# dprint style gate

This repository uses [dprint](https://dprint.dev) as a fast, multi-language
code formatter. CI enforces formatting via the official
[`dprint/check@v2.3`](https://github.com/dprint/check) GitHub Action.

## Workflow

| Item          | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Workflow file | `.github/workflows/dprint-check.yml`                               |
| Job name      | `style` / step `dprint-check-action`                               |
| Action        | `dprint/check@9cb3a2b17a8e606d37aae341e49df3654933fc23` (`# v2.3`) |
| Config        | `dprint.json` (repo root)                                          |
| Runner        | `ubuntu-latest` (Linux only — avoids Windows CRLF noise)           |

Triggers: `pull_request`, `push` to `main`, and `workflow_dispatch`.

## Local usage

Install dprint once:

```bash
curl -fsSL https://dprint.dev/install.sh | sh
export PATH="$HOME/.dprint/bin:$PATH"
```

Then:

```bash
dprint check                 # same check CI runs
dprint fmt                   # write fixes for included paths
dprint output-file-paths     # list files currently in scope
```

Or via npm scripts:

```bash
npm run format:check
npm run format
```

## Scope (includes)

The first ship of this gate deliberately scopes `includes` in `dprint.json`
to a controlled set so introducing the formatter does not rewrite thousands of
legacy files in one PR:

- `/dprint.json`, `/package.json` (root only — nested product manifests stay out of scope)
- `/docs/DPRINT.md`
- `/tests/dprint-check.test.js`
- `/config/**/*.{json,jsonc}`

Expand `includes` gradually (for example root `scripts/**/*.js` or a single
`products/<name>/` tree) and run `dprint fmt` in the same PR that widens the
scope. Keep heavy generated trees in `excludes` (`node_modules`, lockfiles,
`wr/**`, agent transcripts).

## Why Linux-only

GitHub Actions on Windows checks out with `core.autocrlf` enabled, which can
produce false “line endings differed” failures under dprint. The workflow runs
on `ubuntu-latest` and keeps an explicit `if: runner.os == 'Linux'` guard for
matrix safety, matching the upstream dprint/check guidance.

## Related

- Issue / WR: midnghtsapphire/revvel-standards#16273
- Markdown lint (separate gate): `.github/workflows/lint-md.yml`
