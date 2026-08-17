# WR: add markdownlint-cli GitHub Action — nosborn/github-action-markdown-cli@v3.5.0

**Issue:** #16267
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-16
**Research Date:** 2026-08-08
**Researcher:** Copilot
**WR Status:** Complete

---

## Issue Context

Wire `nosborn/github-action-markdown-cli@v3.5.0` as the repository Markdown style
gate. The intake form defaulted `Output Type` to `production-app`; the actual
requested deliverable is CI workflow wiring (not a SaaS product scaffold).

## Summary

Replace the previous `DavidAnson/markdownlint-cli2-action` step in
`.github/workflows/lint-md.yml` with the WR-requested
`nosborn/github-action-markdown-cli` action, pinned to the full commit SHA for
tag `v3.5.0`, using repo-native config and ignore files.

## Objective

```yaml
- name: markdownlint-cli
  uses: nosborn/github-action-markdown-cli@508d6cefd8f0cc99eab5d2d4685b1d5f470042c1 # v3.5.0
  with:
    files: .
    config_file: .markdownlint.yaml
    dot: true
    ignore_path: .markdownlintignore
```

### Inputs used

| Input | Value | Rationale |
| --- | --- | --- |
| `files` | `.` | Lint the whole checkout |
| `config_file` | `.markdownlint.yaml` | YAML mirror of `.markdownlint.jsonc` rules |
| `dot` | `true` | Include `.github` and other dotpaths |
| `ignore_path` | `.markdownlintignore` | Single ignore SSOT (generated WRs, transcripts, deps) |

### Inputs intentionally not used

| Input | Why omitted |
| --- | --- |
| `ignore_files` | Action entrypoint only supports one `-i` value cleanly; multi-pattern ignores belong in `ignore_path` |
| `rules` | No custom rule pack; stock markdownlint rules via config are sufficient. The WR's `examples/rules/custom.js` path is upstream README demo content, not a repo asset. |

## Research notes (evidence-first)

| Claim | Evidence | Confidence |
| --- | --- | --- |
| Action tag `v3.5.0` resolves to commit `508d6cefd8f0cc99eab5d2d4685b1d5f470042c1` | GitHub git ref API for `nosborn/github-action-markdown-cli` annotated tag | high |
| Action bundles `markdownlint-cli@0.43.0` | `package.json` at tag `v3.5.0` | high |
| License is MIT | GitHub repo license metadata (`spdx_id: MIT`) | high |
| GitHub stars ≈ 31 | GitHub API `stargazers_count` at implementation time | medium (point-in-time) |
| Monetization path | Keeps the free OSS markdown gate green so product/docs PRs ship without paid linter SaaS | medium |

### Marketing / SEO keywords

- markdownlint github action
- markdownlint-cli ci
- nosborn github-action-markdown-cli
- markdown style gate monorepo

## Required Bundle

- **`.github/workflows/lint-md.yml`** — nosborn action, SHA-pinned, least privilege
- **`.markdownlint.yaml`** — YAML rule config for the action
- **`.markdownlintignore`** — expanded ignore SSOT (WRs, transcripts, deps)
- **`.github/workflows/pr-lifecycle.yml`** — allowlist name updated to match
- **`tests/lint-md-workflow.test.js`** — regression contract for the wiring
- **`docs/WR_MARKDOWN_LINT_PLAYBOOK.md`** — documents the CI gate tool
- **`wr/issues/issue-16267-add-markdownlint-cli-github-action.md`** — this WR doc

No new secrets. `docs/SECRETS_MAP.md` unchanged.

## Definition of Done

- [x] Workflow uses `nosborn/github-action-markdown-cli` at the `v3.5.0` commit SHA
- [x] Config and ignore paths point at repo files (not `examples/*`)
- [x] Regression tests cover action pin, inputs, permissions, allowlist name
- [x] `npm test` / `npm run workflows:validate` green for the change
- [x] Conventional Commits PR title
- [x] Closes #16267

## Validation

```bash
npm ci
node --test tests/lint-md-workflow.test.js
npm run workflows:validate
npm test
```

## Blockers

None.

## Learnings — What and Why

The WR pasted the upstream action README demo (including `examples/ignore/*` and
`examples/rules/custom.js`). Shipping those paths would fail checkout because
they are not part of this monorepo. Map every demo input onto the real SSOT
files (`.markdownlint.yaml`, `.markdownlintignore`) and keep the local
`npm run lint` path on `markdownlint-cli2` + `.markdownlint.jsonc` so agents
can fix Markdown without pulling the Docker-based action.
