# Test Harness Research — `revvel-standards` Repository

**Version:** 1.0.0
**Date:** April 19, 2026
**Status:** Requirements / Recommendation (awaiting adoption sign-off)
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Scope:** `midnghtsapphire/revvel-standards` only (the docs/standards/skills repository)
**Related:** [`docs/Master_Inventory/TESTING_STANDARD.md`](../Master_Inventory/TESTING_STANDARD.md) · [`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) · [`skills/testing/`](../../skills/testing/) · [`skills/testing-agent/`](../../skills/testing-agent/) · [`skills/shift-testing/`](../../skills/shift-testing/)

---

## 1. Introduction

The `revvel-standards` repository is **not** a runtime application — it is a documentation, standards, skill-vault, and template repository. The existing `TESTING_STANDARD.md` targets Revvel *applications* (Vitest, Playwright, coverage gates). It does not prescribe what to run against this repo's artifacts (markdown, YAML, `.skill.yml`, `.bat`/`.command` installers, GitHub Actions workflows, JSON schemas).

This document:

1. Clarifies the terminology **test suite vs. test harness** (the issue asked which term applies).
2. Evaluates the best **affordable / FOSS** tooling to form a test harness for this specific repository.
3. Captures the recommendation as a **requirements document** so the harness can be adopted incrementally via PRs.

---

## 2. Terminology — Suite vs. Harness vs. Framework

The three terms are often conflated. For Revvel's purposes we use them as follows:

| Term | Meaning | Example in this repo |
|---|---|---|
| **Test case** | A single assertion or scenario. | "README.md contains no broken links." |
| **Test suite** | A *collection of test cases* grouped by subject (a file, a module, a skill). | All markdownlint rules applied to `docs/`. |
| **Test harness** | The *machinery that discovers, runs, reports on, and gates* test suites — runners, reporters, CI wiring, fixtures, mocks, and the glue that makes the whole thing executable as one command. | `npm test` plus the `.github/workflows/ci.yml` that runs markdownlint + yamllint + lychee + actionlint + promptfoo. |
| **Test framework** | A *library* that provides primitives for writing test cases (describe/it, assertions, mocks). | Vitest, Jest, Pytest, PromptFoo. |

> **Answer to the issue question:** What we need for `revvel-standards` is a **test harness** — a single, reproducible entry point that runs *multiple* specialized test suites (markdown, YAML, links, actions, skill prompts). Each underlying tool is a small framework; together, wired up in CI, they form the harness. We may colloquially call the whole thing "the test suite," but the accurate term is **harness**.

---

## 3. What Actually Needs Testing in `revvel-standards`

Before picking tools, enumerate the artifacts:

| Artifact | Path(s) | What can go wrong |
|---|---|---|
| Markdown docs | `README.md`, `docs/**/*.md`, `standards/*.md`, `skills/**/*.md` | Broken internal/external links, bad headings, trailing whitespace, inconsistent list style, dead anchors |
| YAML skill manifests | `skills/**/*.skill.yml`, `skills/SKILLS_INDEX.yml` | Syntax errors, missing required keys, duplicate skill names, drift between `REGISTRY.md` and `SKILLS_INDEX.yml` |
| GitHub Actions workflows | `.github/workflows/*.yml` | Deprecated action versions, wrong shell syntax, missing permissions, secrets drift |
| Shell/batch installers | `install/mac/*.command`, `install/windows/*.bat` | Syntax errors, missing `set -e`, unquoted paths, POSIX vs. bashism |
| PromptFoo test configs | `skills/*/tests/promptfoo.yml` | YAML errors, missing `providers`, malformed `assert` blocks |
| Skill registry consistency | `skills/REGISTRY.md` ↔ `skills/SKILLS_INDEX.yml` ↔ directory listing | Skill listed in registry but directory missing, or directory present but not registered |
| Licensing / required files | `LICENSE`, `README.md`, `CHANGELOG.md` | Files removed or renamed accidentally |

Each row above is a **test suite**. The goal is a single `npm test` (or `make test`) that runs them all and reports pass/fail.

---

## 4. FOSS Tool Evaluation

### 4.1. Evaluation criteria

1. **License** — must be OSI-approved FOSS (MIT, Apache-2.0, GPL, BSD).
2. **Cost** — $0 for our usage pattern (single repo, public, moderate size).
3. **Maintenance** — released within the last 12 months, healthy GitHub issues/PRs.
4. **CI-friendly** — easy to invoke from GitHub Actions, non-interactive, machine-readable output.
5. **Local-first** — must run on a developer laptop (Mac and Windows) with a single command.
6. **Zero-config-possible** — sensible defaults, config optional.

### 4.2. Recommended tools

| Concern | Recommended Tool | License | Cost | Why |
|---|---|---|---|---|
| Markdown lint | **[markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2)** | MIT | $0 | De facto standard, already used by GitHub, Node-based, easy glob config. |
| Link checking (internal + external) | **[lychee](https://github.com/lycheeverse/lychee)** | Apache-2.0 / MIT | $0 | Rust, fast, handles rate limiting, has a maintained `lycheeverse/lychee-action` GH Action. |
| YAML lint | **[yamllint](https://github.com/adrienverge/yamllint)** | GPL-3.0 | $0 | Python-based but distributed via `pip`/`brew`; runs in seconds. Has a battle-tested default ruleset. |
| YAML schema validation (skill manifests) | **[ajv-cli](https://github.com/ajv-validator/ajv-cli)** with a JSON Schema for `*.skill.yml` | MIT | $0 | Lets us enforce *semantic* contract (required keys, enums), not just syntax. |
| GitHub Actions linting | **[actionlint](https://github.com/rhysd/actionlint)** | MIT | $0 | Go binary, zero deps, catches 90% of workflow bugs pre-merge. |
| Shell scripts / `.command` installers | **[shellcheck](https://github.com/koalaman/shellcheck)** | GPL-3.0 | $0 | Gold standard; catches bashisms, quoting bugs, missing `set -e`. |
| Batch `.bat` installers | Manual review + `cmd /c` syntax check in CI on `windows-latest` runner | — | $0 | No mature FOSS batch linter exists; best we can do is a CI dry-run on a Windows runner. |
| PromptFoo test execution | **[promptfoo](https://github.com/promptfoo/promptfoo)** | MIT | $0 (binary) / usage-based for LLM calls | Already used in `skills/*/tests/`; standardize on it. |
| Skill registry consistency | Custom Node script (`scripts/check-skill-registry.js`) using `js-yaml` + `fs.readdirSync` | MIT (our code) | $0 | 50-line script; asserts that every `skills/*/` directory has a matching entry in `REGISTRY.md` and `SKILLS_INDEX.yml`. |
| Orchestration / entry point | **npm scripts** (plus optional `Makefile`) | — | $0 | Already have `package.json` conventions across the ecosystem. |
| CI runner | **GitHub Actions** | — | $0 (public repo) | Already the documented CI in `docs/revvel-standards/BOM.md`. |

### 4.3. Alternatives considered and rejected

| Tool | Why rejected |
|---|---|
| **Vale** (prose linter) | Valuable but high-signal cost; author-style noise will drown out real issues at this stage. Reconsider for v1.1. |
| **Spectral** (YAML/OpenAPI lint) | Overpowered for skill manifests; ajv + yamllint cover our needs. |
| **remark-lint** | Good Node-native markdown linter, but `markdownlint-cli2` has wider adoption and matches GitHub's own tooling. |
| **mabl / BrowserStack / Percy** | Paid; no UI to test in this repo. Already tracked as `P1` in `BOM.md` for *application* repos, not this one. |
| **Codemagic / CircleCI / Buildkite** | Paid above free tier; GitHub Actions is sufficient and free for public repos. |
| **Dependabot** | Already configured per `DEPENDABOT_STANDARD.md`; it's a complementary dependency updater, not a test harness. |

### 4.4. Total cost of ownership

| Category | Annual Cost |
|---|---|
| Licensing (all FOSS) | **$0** |
| CI minutes (GitHub Actions, public repo) | **$0** |
| PromptFoo LLM calls (self-tests only, bounded) | **≤ $5/year** (absorbed under the existing `OPENROUTER_API_KEY` budget) |
| **Total** | **≤ $5/year** |

This fits the repo-level budget in [`docs/revvel-standards/BOM.md`](./BOM.md) with zero new line items.

---

## 5. Requirements (the "Requirements Documentation" part)

These requirements use **RFC 2119** keywords (MUST / SHOULD / MAY) so they are testable and reviewable.

### 5.1. Functional requirements

| ID | Requirement |
|---|---|
| **R-TH-01** | The repository MUST expose a single command — `npm test` — that runs every suite listed in §3 and exits non-zero if any suite fails. |
| **R-TH-02** | Every suite MUST be runnable in isolation (e.g., `npm run test:markdown`, `npm run test:links`, `npm run test:yaml`, `npm run test:actions`, `npm run test:shell`, `npm run test:skills`, `npm run test:registry`). |
| **R-TH-03** | The harness MUST produce machine-readable output (SARIF, JSON, or JUnit XML) for each suite where the underlying tool supports it. |
| **R-TH-04** | The harness MUST block PR merges on failure via a required GitHub status check named `revvel-standards / test`. |
| **R-TH-05** | Link checking MUST tolerate transient network errors (retry ≥ 3 times, 5s backoff) before marking a link as broken. |
| **R-TH-06** | Skill-registry consistency MUST fail CI if any `skills/<name>/` directory is missing from either `REGISTRY.md` or `SKILLS_INDEX.yml`, **or** vice versa. |
| **R-TH-07** | PromptFoo suites MUST run in a **offline / cached** mode on every PR (no live LLM calls) and in **live** mode only on `main` after merge (to bound cost). |
| **R-TH-08** | The harness MUST be installable via the existing `install/mac/install-revvel-skills.command` and `install/windows/install-revvel-skills.bat` one-click installers, or document a separate `install-test-harness` script. |

### 5.2. Non-functional requirements

| ID | Requirement |
|---|---|
| **R-TH-N-01** | Full `npm test` run MUST complete in ≤ 3 minutes on a standard GitHub-hosted Ubuntu runner. |
| **R-TH-N-02** | Every tool selected MUST be OSI-approved FOSS; no proprietary SaaS MAY be required to pass CI. |
| **R-TH-N-03** | The harness MUST run on macOS, Linux, and Windows (manual testing on the last, via the existing `windows-latest` runner for `.bat` verification). |
| **R-TH-N-04** | All tool versions MUST be pinned (exact version in `package.json` / `Dockerfile` / action `@version`). |
| **R-TH-N-05** | Any new dependency MUST be added to `docs/revvel-standards/BOM.md` with license, cost, and justification. |

### 5.3. Governance / process requirements

| ID | Requirement |
|---|---|
| **R-TH-G-01** | Each suite SHOULD have a corresponding row in the Bill of Materials for this repo. |
| **R-TH-G-02** | Changes to the harness itself (adding/removing a tool) MUST be reviewed by the standards owner (Audrey Evans) and logged in `CHANGELOG.md`. |
| **R-TH-G-03** | Skill authors MUST run `npm run test:skills` locally before opening a PR touching `skills/*`. |
| **R-TH-G-04** | This document MUST be revisited every 12 months; re-evaluate tool choices, licenses, and maintenance health. |

---

## 6. Proposed directory layout

```text
revvel-standards/
├── package.json                       # scripts: test, test:markdown, test:links, test:yaml, ...
├── .markdownlint.jsonc                # markdownlint-cli2 config
├── .yamllint                          # yamllint config
├── .lycheeignore                      # allow-list of known-dead external URLs (with justification)
├── schemas/
│   └── skill.schema.json              # JSON Schema for *.skill.yml — used by ajv
├── scripts/
│   └── check-skill-registry.js        # §3 row 6 — registry consistency
└── .github/
    └── workflows/
        └── test.yml                   # runs all suites on PR and main
```

No existing files are overwritten; this is additive.

---

## 7. Rollout plan (incremental, minimal-risk)

Each bullet is a **single PR** so adoption can be paused at any point:

1. **PR-1:** Land this research doc (current PR).
2. **PR-2:** Add `markdownlint-cli2` + config + `npm run test:markdown` + CI job (non-blocking at first).
3. **PR-3:** Add `lychee` link check + allowlist; start blocking on **internal** links only, external links as warning.
4. **PR-4:** Add `yamllint` + `ajv-cli` + `schemas/skill.schema.json` + `npm run test:yaml` + `test:skills`.
5. **PR-5:** Add `actionlint` + `shellcheck` jobs.
6. **PR-6:** Add `scripts/check-skill-registry.js` + `npm run test:registry`.
7. **PR-7:** Add aggregate `npm test` command and flip CI status check to **required** on `main`.
8. **PR-8:** Wire into `install/` one-click installers.

Total expected engineering time: **~1 day** across the 8 PRs, assuming a single reviewer.

---

## 8. Decision record

- **Decision:** Adopt the **multi-tool FOSS harness** described in §4.2, orchestrated by npm scripts and GitHub Actions.
- **Alternatives rejected:** see §4.3.
- **Owner:** Audrey Evans.
- **Review date:** April 2027.
- **Open questions:** None blocking PR-1; tool-specific configuration happens in PR-2..PR-8.

---

## 9. Related documents

- [`docs/Master_Inventory/TESTING_STANDARD.md`](../Master_Inventory/TESTING_STANDARD.md) — application-level testing standard (Vitest/Playwright).
- [`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) — four-stage pipeline (dev → staging → live-test → prod).
- [`skills/testing/SKILL.md`](../../skills/testing/SKILL.md) — developer-facing testing skill.
- [`skills/testing-agent/SKILL.md`](../../skills/testing-agent/SKILL.md) — ephemeral test-generation agent.
- [`skills/shift-testing/SKILL.md`](../../skills/shift-testing/SKILL.md) — S.H.I.F.T. self-healing test framework.
- [`skills/openclaw-self-eval/SKILL.md`](../../skills/openclaw-self-eval/SKILL.md) — OpenClaw agent self-evaluation skill (companion to this document).
- [`docs/revvel-standards/BOM.md`](./BOM.md) — this repo's Bill of Materials.
- [`docs/revvel-standards/HIVE_HARNESS_RESEARCH.md`](./HIVE_HARNESS_RESEARCH.md) — evaluation of `aden-hive/hive` (an **agent** harness, not a test harness); clarifies why it does not apply to this document's plan.
