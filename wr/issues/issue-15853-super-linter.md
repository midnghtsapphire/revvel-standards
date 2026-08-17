# WR: [WR] Super-Linter — super-linter/super-linter@v8.7.0

**Issue:** #15853
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

Add Super-Linter GitHub Action (`super-linter/super-linter@v8.7.0`) to the repository as an all-in-one linting bundle. Super-Linter packs over 40 language-specific linters into a single Docker image to validate the entire repository on push and PR events.

## Objective

Integrate Super-Linter Action as the best all-in-one bundle for code quality enforcement. It validates source code across multiple programming languages, reports issues as console output and GitHub Actions status checks, and helps establish best practices and consistent formatting.

## Required Bundle

Super-Linter is a ready-to-run collection of linters and code analyzers that:

- Runs linters in parallel (since v6) for fast scanning of massive repositories
- Supports 40+ languages including JavaScript, TypeScript, Python, Go, Shell, YAML, Markdown, Docker, Terraform, and more
- Provides a highly curated set of linters to avoid overlapping checks
- Is MIT Licensed and maintained by independent developers
- Is the most widely used and forked project of its kind (~9.8k GitHub stars)
- Runs on GitHub Actions with the only dependency being an OCI-compatible container runtime

### Key configuration choices

| Setting | Value | Rationale |
| --- | --- | --- |
| `VALIDATE_ALL_CODEBASE` | `false` | Only lint new/changed files on PRs to keep CI fast |
| `DEFAULT_BRANCH` | `main` | Match repo default branch |
| `FILTER_REGEX_EXCLUDE` | `wr/issues/.*` | Exclude WR issue docs (user-generated content with varied formatting) |

### Workflow file

`.github/workflows/super-linter.yml` — triggers on `push` to main and all `pull_request` events targeting main.

## Definition of Done

- [x] `.github/workflows/super-linter.yml` created with correct permissions and configuration
- [x] Action version `v8.7.0` checked against GitHub Advisory Database (no vulnerabilities found)
- [x] WR document created at `wr/issues/issue-15853-super-linter.md`
- [x] Workflow YAML validates (parseable, has `name` and `on` keys)
- [x] Existing tests pass without regression

## Validation

- Workflow YAML syntax validated via `yaml.safe_load`
- Action version checked against GitHub Advisory Database — clean
- Existing `npm test` suite passes (workflow-yaml-validation covers the new file)

## Blockers

None.

## Learnings — What and Why

This WR exists because the repository lacked a comprehensive multi-language linting action. The existing `markdownlint` and per-product ESLint configurations cover specific areas, but Super-Linter provides broad coverage across all file types in a single pass. The `FILTER_REGEX_EXCLUDE` for `wr/issues/.*` prevents noise from user-generated WR documents that intentionally contain varied formatting. Setting `VALIDATE_ALL_CODEBASE: false` ensures CI stays fast by only checking changed files on PRs.
