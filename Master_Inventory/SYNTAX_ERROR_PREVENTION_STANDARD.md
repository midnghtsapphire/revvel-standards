# Syntax Error Prevention Standard

**Version:** 1.0.0  
**Date:** April 12, 2026  
**Status:** Mandatory Policy — Single Source of Truth  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Purpose

Syntax errors are the most common cause of CI failures, broken PRs, and wasted agent cycles in Revvel projects. This standard establishes a **four-layer defense** that catches syntax errors as early as possible — ideally before a single character is committed to the repository.

**Goal:** Zero syntax errors ever reach `main`.

---

## 2. The Four-Layer Defense

| Layer | When It Runs | Tools | Catches |
|---|---|---|---|
| **1 — Git Pre-commit Hook** | On every `git commit` locally | `bash -n`, `node --check`, `python -m py_compile` | Shell, JS/TS, Python syntax |
| **2 — Pre-commit Framework** | On every `git commit` locally | `.pre-commit-config.yaml` hooks | YAML, JSON, mixed-language syntax |
| **3 — Husky + lint-staged** | On every `git commit` in Node.js repos | ESLint, `tsc --noEmit` | TypeScript/JS type errors & style |
| **4 — CI/CD Syntax Check** | On every push and pull request | GitHub Actions `syntax-check.yml` | All of the above, server-side |

Every Revvel project **MUST** implement at minimum **Layer 3** (Husky + lint-staged with ESLint) and **Layer 4** (CI syntax-check workflow). Layers 1 and 2 are strongly recommended.

---

## 3. Layer 1 — Git Pre-commit Hook

A native Git hook that runs automatically before every commit. If it returns a non-zero exit code, the commit is aborted.

### 3.1 Setup

```bash
# Create the hook file (run from your repo root)
mkdir -p .git/hooks
cp /path/to/revvel-standards/templates/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or use the bootstrap script (Step 5) which does this automatically.

### 3.2 What It Checks

The standard Revvel pre-commit hook (`templates/hooks/pre-commit`) checks:

| File Type | Command | What It Catches |
|---|---|---|
| `.sh` / `.bash` | `bash -n <file>` | Shell syntax errors |
| `.js` / `.mjs` | `node --check <file>` | JavaScript syntax errors |
| `.ts` / `.tsx` | `npx tsc --noEmit --skipLibCheck` | TypeScript type errors |
| `.json` | `python3 -m json.tool` or `node -e "JSON.parse(…)"` | JSON syntax errors |
| `.py` | `python3 -m py_compile <file>` | Python syntax errors |

### 3.3 Hook Template

See: [`templates/hooks/pre-commit`](../../templates/hooks/pre-commit)

### 3.4 Rules

- The hook **MUST** be executable (`chmod +x`)
- The hook **MUST** exit non-zero on any syntax error
- The hook **MUST NOT** be skipped with `--no-verify` except in emergency with explicit team lead approval
- Any bypass of `--no-verify` **MUST** be noted in the commit message

---

## 4. Layer 2 — Pre-commit Framework

The [pre-commit framework](https://pre-commit.com/) is a multi-language plugin system that manages hooks via `.pre-commit-config.yaml`. It is especially powerful for polyglot repos.

### 4.1 Installation

```bash
# Install the framework (Python required)
pip install pre-commit

# Install hooks into this repo
pre-commit install

# Run against all files (initial setup)
pre-commit run --all-files
```

### 4.2 Configuration

Place `.pre-commit-config.yaml` in the repo root. See the template at [`templates/hooks/.pre-commit-config.yaml`](../../templates/hooks/.pre-commit-config.yaml).

### 4.3 Required Hooks for Revvel Projects

| Hook | What It Checks |
|---|---|
| `check-yaml` | YAML syntax (catches broken GitHub Actions, CI configs) |
| `check-json` | JSON syntax (.prettierrc, tsconfig, package.json) |
| `check-merge-conflict` | Leftover merge conflict markers |
| `end-of-file-fixer` | Trailing newlines |
| `trailing-whitespace` | Trailing spaces |
| `detect-private-key` | Accidental private key commits |
| `eslint` | JavaScript/TypeScript lint + syntax |

### 4.4 Updating Hooks

```bash
pre-commit autoupdate
```

Run this monthly or before starting a new project phase.

---

## 5. Layer 3 — Husky + lint-staged (Node.js / TypeScript)

For all Node.js projects, Husky manages Git hooks via npm and lint-staged runs linters only on staged files (fast).

### 5.1 Setup

```bash
npm install --save-dev husky lint-staged
npx husky init
```

### 5.2 Required Husky Pre-commit Hook

`.husky/pre-commit`:
```sh
#!/bin/sh
npx lint-staged
```

### 5.3 Required lint-staged Configuration

In `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "bash -c 'tsc --noEmit --skipLibCheck'"
    ],
    "*.{js,jsx,mjs}": [
      "eslint --fix"
    ],
    "*.{json,yaml,yml}": [
      "prettier --write"
    ],
    "*.sh": [
      "bash -n"
    ]
  }
}
```

### 5.4 ESLint Requirements

Every Revvel TypeScript project **MUST** have an ESLint config (`.eslintrc.json` or `eslint.config.js`) that includes:

- `@typescript-eslint/parser` as the parser
- `@typescript-eslint/eslint-plugin` rules enabled
- `"no-undef": "error"` to catch undefined variables
- `"no-unreachable": "error"` to catch unreachable code

See [`COMPLIANCE_RUBRIC.md`](./COMPLIANCE_RUBRIC.md) Category E for the full code quality checklist.

---

## 6. Layer 4 — CI/CD Syntax Check (GitHub Actions)

Even if local hooks are bypassed, CI is the last line of defense. The `syntax-check.yml` workflow runs on every push and pull request.

### 6.1 Workflow Template

See: [`templates/cicd/syntax-check.yml`](../../templates/cicd/syntax-check.yml)

Copy it to `.github/workflows/syntax-check.yml` in your app repo.

### 6.2 What It Runs

| Step | Command | Blocks PR? |
|---|---|---|
| YAML lint | `yamllint .github/` | ✅ Yes |
| JSON validate | `node -e "JSON.parse(…)"` on all `.json` files | ✅ Yes |
| Shell syntax | `bash -n` on all `.sh` files | ✅ Yes |
| ESLint | `eslint . --ext .ts,.tsx,.js,.jsx` | ✅ Yes |
| TypeScript check | `tsc --noEmit` | ✅ Yes |
| Prettier check | `prettier --check .` | ✅ Yes |

### 6.3 PR Blocking

The `syntax-check.yml` workflow **MUST** be added as a required status check in branch protection rules. A PR **CANNOT** be merged to `main` if this workflow fails.

See `templates/cicd/branch-protection.json` for the required branch protection configuration.

---

## 7. Language-Specific Syntax Rules

### 7.1 TypeScript / JavaScript

- **Never** use `any` unless explicitly annotated with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and a justification comment
- All files **MUST** pass `tsc --noEmit` with `strict: true` in `tsconfig.json`
- No implicit `any` — `"noImplicitAny": true` in tsconfig

### 7.2 YAML (GitHub Actions, configs)

- All YAML files **MUST** use 2-space indentation
- All YAML files **MUST** pass `yamllint` or `js-yaml` parsing
- GitHub Actions workflow files **MUST** be validated before merging (the `syntax-check.yml` workflow does this automatically)

### 7.3 JSON

- All JSON files **MUST** be valid JSON (no comments, no trailing commas in `.json` files)
- Use `.jsonc` extension for JSON with comments
- All `package.json` changes **MUST** pass `npm install --dry-run` before committing

### 7.4 Shell Scripts

- All `.sh` scripts **MUST** begin with a shebang (`#!/bin/bash` or `#!/bin/sh`)
- All `.sh` scripts **MUST** pass `bash -n <script>`
- Scripts that run in CI **MUST** include `set -e` (exit on error)

### 7.5 Python

- All `.py` files **MUST** pass `python3 -m py_compile <file>`
- Recommended: use `ruff` for lint + syntax in Python files

---

## 8. Auto-fix on CI Failure

When CI syntax checks fail, the `auto-fix.yml` workflow creates a GitHub Issue automatically and assigns it to Copilot for repair. The issue will contain:

- Which files have syntax errors
- Which syntax check step failed
- A link to the full CI log

Copilot **MUST** fix the syntax error and open a PR referencing the issue before it can be closed.

---

## 9. Compliance Integration

This standard is enforced by the Revvel Compliance Rubric (`COMPLIANCE_RUBRIC.md`) under **Category G: Pre-commit Hooks & Syntax Checks**.

| Check | ID | Tier |
|---|---|---|
| `.husky/` directory exists | G1 | P2 |
| `lint-staged` config exists | G2 | P2 |
| Pre-commit hook runs linting | G3 | P2 |
| Pre-commit hook runs TypeScript check | G4 | P2 |
| Secret scanning configured | G5 | P1 |
| `syntax-check.yml` workflow exists | G6 | P1 |
| `.pre-commit-config.yaml` exists | G7 | P2 |
| Husky pre-commit hook runs `tsc --noEmit` | G8 | P1 |

Run `node scripts/check-compliance.js` to audit your repo against all checks.

---

## 10. Quick-Start Checklist

For a new project, run through this checklist:

- [ ] `npm install --save-dev husky lint-staged` run
- [ ] `npx husky init` run — `.husky/pre-commit` created
- [ ] `lint-staged` config added to `package.json` with ESLint + tsc
- [ ] `.pre-commit-config.yaml` copied from `templates/hooks/` to repo root
- [ ] `pre-commit install` run (if Python available)
- [ ] `templates/cicd/syntax-check.yml` copied to `.github/workflows/syntax-check.yml`
- [ ] `syntax-check.yml` added as required status check in branch protection
- [ ] First `pre-commit run --all-files` passes clean
- [ ] Compliance score ≥ 70 (`node scripts/check-compliance.js`)

---

## 11. References

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [pre-commit framework](https://pre-commit.com/)
- [Husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [yamllint](https://yamllint.readthedocs.io/)
- [`COMPLIANCE_RUBRIC.md`](./COMPLIANCE_RUBRIC.md) — Category G
- [`templates/cicd/syntax-check.yml`](../../templates/cicd/syntax-check.yml)
- [`templates/hooks/pre-commit`](../../templates/hooks/pre-commit)
- [`templates/hooks/.pre-commit-config.yaml`](../../templates/hooks/.pre-commit-config.yaml)
