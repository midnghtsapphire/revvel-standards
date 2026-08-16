# WR: [WR] add lint-md GitHub Action — lint-md/github-action@v0.2.0

**Issue:** #15855
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-13
**Research Date:** 2026-07-13
**Researcher:** Copilot
**WR Status:** ✅ Complete

---

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

## Summary

Add lint-md GitHub Action (`lint-md/github-action@v0.2.0`) to the repository for Chinese technical documentation Markdown format checking. lint-md detects spacing, punctuation, and formatting issues common in Chinese-English mixed Markdown content. The Action runs directly in CI without requiring npm install.

## Objective

Integrate lint-md as a CI step to automatically check Markdown files for Chinese technical documentation formatting issues including space-around-alphabet, space-around-number, empty code blocks, and empty URLs. This complements the existing markdownlint-cli2 infrastructure which focuses on general Markdown structure rules.

## Required Bundle

The integration includes:

- **`.github/workflows/lint-md.yml`** — GitHub Actions workflow triggered on push to main and pull requests targeting main
- **`.lintmdrc`** — JSON configuration file with rule settings and exclusion patterns
- **`wr/issues/issue-15855-add-lint-md-github-action.md`** — This WR document

### Key configuration choices

| Setting | Value | Rationale |
| --- | --- | --- |
| `files` | `'./'` | Check all Markdown files in the repository |
| `configFile` | `'.lintmdrc'` | Use repository-level configuration for consistent rules |
| `failOnWarnings` | `'false'` | Warnings are advisory; only errors fail the workflow |
| `excludeFiles` | `wr/issues/**`, `node_modules/**`, `.git/**`, `dist/**` | Exclude generated WR docs and build artifacts |

### Supported configuration options

- **`files`** — Directory or file paths to check, space-separated
- **`configFile`** — Path to `.lintmdrc` (JSON) or `.lintmdrc.js` (JavaScript module)
- **`failOnWarnings`** — When `'true'`, warnings also cause failure

### Rule configuration

Rules are set to severity levels: 0 (off), 1 (warning), 2 (error).

| Rule | Severity | Description |
| --- | --- | --- |
| `space-around-alphabet` | 1 (warn) | Require spaces between Chinese and English text |
| `space-around-number` | 1 (warn) | Require spaces between Chinese text and numbers |
| `no-empty-code-lang` | 2 (error) | Code blocks must specify a language |
| `no-empty-code` | 2 (error) | No empty code blocks |
| `no-empty-inline-code` | 2 (error) | No empty inline code |
| `no-empty-url` | 2 (error) | No empty links |
| `no-empty-blockquote` | 1 (warn) | No empty blockquotes |
| `no-empty-list` | 1 (warn) | No empty list items |

### Workflow file

`.github/workflows/lint-md.yml` — triggers on `push` to main and all `pull_request` events targeting main.

## Definition of Done

- [ ] `.github/workflows/lint-md.yml` created with correct permissions and configuration
- [ ] `.lintmdrc` configuration file created with appropriate rules and exclusions
- [ ] Action version `v0.2.0` checked against GitHub Advisory Database (no vulnerabilities found)
- [ ] WR document created at `wr/issues/issue-15855-add-lint-md-github-action.md`
- [ ] Workflow YAML validates (parseable, has `name` and `on` keys)
- [ ] Existing tests pass without regression

## Validation

- Workflow YAML syntax validated via `yaml.safe_load`
- Action version checked against GitHub Advisory Database — clean
- Existing `npm test` suite passes (workflow-yaml-validation covers the new file)

## Blockers

None.

## Learnings — What and Why

This WR adds lint-md as a complementary Markdown linter alongside the existing markdownlint-cli2 infrastructure. While markdownlint-cli2 enforces general Markdown structure rules (heading levels, list formatting, code block style), lint-md specifically targets Chinese technical documentation conventions such as spacing between Chinese and English text, spacing around numbers, and proper punctuation usage. The `.lintmdrc` excludes `wr/issues/**` to avoid noise from user-generated WR documents, consistent with the Super-Linter configuration. Space-around rules are set to warning level (1) rather than error (2) since this is a new tool and the repository may have existing files that need gradual adoption.
