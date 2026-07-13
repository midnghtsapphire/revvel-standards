# Revvel Compliance Rubric

**Version:** 1.1.0  
**Date:** April 12, 2026  
**Status:** Mandatory Policy — Single Source of Truth  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Purpose

This rubric is the machine-readable scoring system for auditing any Revvel or MIDNGHTSAPPHIRE repository against the full standards. Every requirement is assigned a point value and a priority tier. Run `scripts/check-compliance.js` to get an automated score.

**Score Interpretation:**

| Score | Status |
|---|---|
| 90–100 | ✅ Compliant — ready to ship |
| 70–89 | ⚠️ Conditional — P0 items must be resolved before next deploy |
| 50–69 | 🔴 Non-Compliant — blocked from production |
| < 50 | 🚫 Critical failure — immediate remediation required |

---

## 2. Priority Tiers

| Tier | Meaning | Consequence of Failure |
|---|---|---|
| **P0** | Blocking — cannot ship without this | Immediate deployment block |
| **P1** | Required within 30 days of first deploy | Degraded status; no new features until resolved |
| **P2** | Best practice; strongly recommended | Noted in audit report; no block |

---

## 3. Compliance Checklist

The automated checker (`scripts/check-compliance.js`) evaluates each item below. Items marked with `[AUTO]` are checked automatically. Items marked with `[MANUAL]` require human or AI review.

---

### Category A: Repository Structure (20 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| A1 | `README.md` exists at repo root | 2 | P0 | AUTO |
| A2 | `CHANGELOG.md` exists at repo root in Keep-a-Changelog format | 3 | P0 | AUTO |
| A3 | `.gitignore` exists and excludes `node_modules`, `.env`, `dist`, `.next` | 2 | P0 | AUTO |
| A4 | `.env.example` exists (no real secrets, only key names) | 2 | P0 | AUTO |
| A5 | `docs/` directory exists | 1 | P1 | AUTO |
| A6 | `docs/adr/` directory exists for Architecture Decision Records | 2 | P1 | AUTO |
| A7 | `docs/runbooks/` directory exists | 1 | P2 | AUTO |
| A8 | `AGENTS.md` exists (universal AI agent instructions) | 3 | P0 | AUTO |
| A9 | `LICENSE` file exists | 2 | P1 | AUTO |
| A10 | `docs/specs/` directory exists | 2 | P2 | AUTO |

---

### Category B: CI/CD Pipeline (20 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| B1 | `.github/workflows/deploy.yml` exists | 5 | P0 | AUTO |
| B2 | `.github/workflows/deploy.yml` includes a test step | 3 | P0 | AUTO |
| B3 | `.github/workflows/deploy.yml` includes a build step | 3 | P0 | AUTO |
| B4 | `.github/workflows/compliance-check.yml` exists | 3 | P1 | AUTO |
| B5 | Branch protection is enabled on `main` (no direct pushes, PR required) | 3 | P0 | MANUAL |
| B6 | `force-push` is disabled via branch protection | 3 | P0 | MANUAL |

---

### Category C: Testing (25 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| C1 | `vitest.config.ts` exists with coverage thresholds defined | 3 | P0 | AUTO |
| C2 | `tests/` directory exists with at least one test file | 3 | P0 | AUTO |
| C3 | `tests/unit/` directory exists | 2 | P0 | AUTO |
| C4 | `tests/integration/` directory exists | 2 | P0 | AUTO |
| C5 | `tests/e2e/` directory exists with Playwright specs | 3 | P0 | AUTO |
| C6 | `playwright.config.ts` exists | 2 | P0 | AUTO |
| C7 | `tests/mocks/` directory exists | 2 | P1 | AUTO |
| C8 | All tests pass (`vitest run` exits 0) | 5 | P0 | AUTO |
| C9 | Coverage meets thresholds (≥80% lines, statements, functions) | 3 | P0 | AUTO |

---

### Category D: Security (15 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| D1 | No hardcoded secrets in source code (no API keys, passwords, tokens) | 5 | P0 | AUTO |
| D2 | `.env` file is in `.gitignore` | 3 | P0 | AUTO |
| D3 | `helmet` or equivalent security headers middleware present in backend | 2 | P0 | AUTO |
| D4 | Input validation using Zod (or equivalent) is present | 2 | P1 | MANUAL |
| D5 | `npm audit` or `pnpm audit` passes with no critical vulnerabilities | 3 | P0 | AUTO |

---

### Category E: Code Quality (10 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| E1 | `eslint.config.*` or `.eslintrc.*` exists | 2 | P0 | AUTO |
| E2 | `.prettierrc` or `prettier.config.*` exists | 2 | P1 | AUTO |
| E3 | `tsconfig.json` exists with `strict: true` | 3 | P0 | AUTO |
| E4 | TypeScript check passes (`tsc --noEmit` exits 0) | 3 | P0 | AUTO |

---

### Category F: Documentation (10 points)

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| F1 | `README.md` contains project description, setup instructions, and env var documentation | 3 | P0 | MANUAL |
| F2 | At least one ADR exists in `docs/adr/` for key architectural decisions | 2 | P1 | MANUAL |
| F3 | `CHANGELOG.md` has at least one entry following Keep-a-Changelog format | 2 | P0 | AUTO |
| F4 | API documentation exists (Swagger/OpenAPI or equivalent) for all backend endpoints | 3 | P1 | MANUAL |

---

### Category G: Pre-commit Hooks & Syntax Checks (10 points)

> G1–G4 are bonus points. G5–G8 are required and scored. See `SYNTAX_ERROR_PREVENTION_STANDARD.md` for full details.

| ID | Requirement | Points | Tier | Check Type |
|---|---|---|---|---|
| G1 | `.husky/` directory exists | 1 | P2 | AUTO |
| G2 | `lint-staged` config exists in `package.json` or `.lintstagedrc` | 1 | P2 | AUTO |
| G3 | Pre-commit hook runs linting | 1 | P2 | MANUAL |
| G4 | Pre-commit hook runs TypeScript check | 1 | P2 | MANUAL |
| G5 | Secret scanning configured (gitleaks or detect-secrets) | 1 | P1 | MANUAL |
| G6 | `.github/workflows/syntax-check.yml` exists | 3 | P1 | AUTO |
| G7 | `.pre-commit-config.yaml` exists at repo root | 2 | P2 | AUTO |
| G8 | `SYNTAX_ERROR_PREVENTION_STANDARD.md` present (standards repo) or referenced in `AGENTS.md` | 1 | P1 | AUTO |

---

## 4. Machine-Readable Rubric (JSON)

The `scripts/check-compliance.js` checker reads this embedded JSON to score repos. To update scoring, update both this section and the script.

```json
{
  "version": "1.0.0",
  "categories": {
    "A": { "name": "Repository Structure", "maxPoints": 20 },
    "B": { "name": "CI/CD Pipeline", "maxPoints": 20 },
    "C": { "name": "Testing", "maxPoints": 25 },
    "D": { "name": "Security", "maxPoints": 15 },
    "E": { "name": "Code Quality", "maxPoints": 10 },
    "F": { "name": "Documentation", "maxPoints": 10 }
  },
  "checks": [
    { "id": "A1", "description": "README.md exists", "points": 2, "tier": "P0", "auto": true, "check": "file_exists", "target": "README.md" },
    { "id": "A2", "description": "CHANGELOG.md exists", "points": 3, "tier": "P0", "auto": true, "check": "file_exists", "target": "CHANGELOG.md" },
    { "id": "A3", "description": ".gitignore exists with standard exclusions", "points": 2, "tier": "P0", "auto": true, "check": "file_contains", "target": ".gitignore", "contains": ["node_modules", ".env", "dist"] },
    { "id": "A4", "description": ".env.example exists", "points": 2, "tier": "P0", "auto": true, "check": "file_exists", "target": ".env.example" },
    { "id": "A5", "description": "docs/ directory exists", "points": 1, "tier": "P1", "auto": true, "check": "dir_exists", "target": "docs" },
    { "id": "A6", "description": "docs/adr/ directory exists", "points": 2, "tier": "P1", "auto": true, "check": "dir_exists", "target": "docs/adr" },
    { "id": "A7", "description": "docs/runbooks/ directory exists", "points": 1, "tier": "P2", "auto": true, "check": "dir_exists", "target": "docs/runbooks" },
    { "id": "A8", "description": "AGENTS.md exists", "points": 3, "tier": "P0", "auto": true, "check": "file_exists", "target": "AGENTS.md" },
    { "id": "A9", "description": "LICENSE file exists", "points": 2, "tier": "P1", "auto": true, "check": "file_exists", "target": "LICENSE" },
    { "id": "A10", "description": "docs/specs/ directory exists", "points": 2, "tier": "P2", "auto": true, "check": "dir_exists", "target": "docs/specs" },
    { "id": "B1", "description": ".github/workflows/deploy.yml exists", "points": 5, "tier": "P0", "auto": true, "check": "file_exists", "target": ".github/workflows/deploy.yml" },
    { "id": "B2", "description": "deploy.yml contains a test step", "points": 3, "tier": "P0", "auto": true, "check": "file_contains", "target": ".github/workflows/deploy.yml", "contains": ["vitest", "test"] },
    { "id": "B3", "description": "deploy.yml contains a build step", "points": 3, "tier": "P0", "auto": true, "check": "file_contains", "target": ".github/workflows/deploy.yml", "contains": ["build"] },
    { "id": "B4", "description": "compliance-check.yml exists", "points": 3, "tier": "P1", "auto": true, "check": "file_exists", "target": ".github/workflows/compliance-check.yml" },
    { "id": "C1", "description": "vitest.config.ts exists with coverage thresholds", "points": 3, "tier": "P0", "auto": true, "check": "file_contains", "target": "vitest.config.ts", "contains": ["thresholds", "coverage"] },
    { "id": "C2", "description": "tests/ directory exists", "points": 3, "tier": "P0", "auto": true, "check": "dir_exists", "target": "tests" },
    { "id": "C3", "description": "tests/unit/ directory exists", "points": 2, "tier": "P0", "auto": true, "check": "dir_exists", "target": "tests/unit" },
    { "id": "C4", "description": "tests/integration/ directory exists", "points": 2, "tier": "P0", "auto": true, "check": "dir_exists", "target": "tests/integration" },
    { "id": "C5", "description": "tests/e2e/ directory with spec files exists", "points": 3, "tier": "P0", "auto": true, "check": "dir_has_files", "target": "tests/e2e", "extension": ".spec.ts" },
    { "id": "C6", "description": "playwright.config.ts exists", "points": 2, "tier": "P0", "auto": true, "check": "file_exists", "target": "playwright.config.ts" },
    { "id": "C7", "description": "tests/mocks/ directory exists", "points": 2, "tier": "P1", "auto": true, "check": "dir_exists", "target": "tests/mocks" },
    { "id": "D1", "description": "No hardcoded secrets in source code", "points": 5, "tier": "P0", "auto": true, "check": "no_secrets" },
    { "id": "D2", "description": ".env in .gitignore", "points": 3, "tier": "P0", "auto": true, "check": "file_contains", "target": ".gitignore", "contains": [".env"] },
    { "id": "D3", "description": "helmet or security headers middleware present", "points": 2, "tier": "P0", "auto": true, "check": "code_contains", "pattern": "helmet", "extensions": [".ts", ".js"] },
    { "id": "D5", "description": "No critical npm vulnerabilities", "points": 3, "tier": "P0", "auto": true, "check": "npm_audit" },
    { "id": "E1", "description": "ESLint config exists", "points": 2, "tier": "P0", "auto": true, "check": "file_exists_any", "targets": ["eslint.config.js", "eslint.config.ts", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml"] },
    { "id": "E2", "description": "Prettier config exists", "points": 2, "tier": "P1", "auto": true, "check": "file_exists_any", "targets": [".prettierrc", ".prettierrc.json", "prettier.config.js", "prettier.config.ts"] },
    { "id": "E3", "description": "tsconfig.json exists with strict mode", "points": 3, "tier": "P0", "auto": true, "check": "file_contains", "target": "tsconfig.json", "contains": ["strict"] },
    { "id": "F3", "description": "CHANGELOG.md has at least one entry", "points": 2, "tier": "P0", "auto": true, "check": "file_contains", "target": "CHANGELOG.md", "contains": ["##"] },
    { "id": "G1", "description": ".husky/ directory exists", "points": 1, "tier": "P2", "auto": true, "check": "dir_exists", "target": ".husky" },
    { "id": "G2", "description": "lint-staged config exists", "points": 1, "tier": "P2", "auto": true, "check": "file_exists_any", "targets": [".lintstagedrc", ".lintstagedrc.json", ".lintstagedrc.js"] },
    { "id": "G6", "description": "syntax-check.yml workflow exists", "points": 3, "tier": "P1", "auto": true, "check": "file_exists", "target": ".github/workflows/syntax-check.yml" },
    { "id": "G7", "description": ".pre-commit-config.yaml exists", "points": 2, "tier": "P2", "auto": true, "check": "file_exists", "target": ".pre-commit-config.yaml" },
    { "id": "G8", "description": "SYNTAX_ERROR_PREVENTION_STANDARD.md exists or referenced in AGENTS.md", "points": 1, "tier": "P1", "auto": true, "check": "file_exists_any", "targets": ["SYNTAX_ERROR_PREVENTION_STANDARD.md"] }
  ]
}
```

---

## 5. How to Run the Audit

```bash
# From the root of any Revvel repo:
node /path/to/revvel-standards/scripts/check-compliance.js

# Or via curl (always uses latest version):
curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/check-compliance.js | node - .

# Output example:
# ✅ A1 [P0] README.md exists ............... 2/2
# ✅ A2 [P0] CHANGELOG.md exists ............. 3/3
# ❌ C1 [P0] vitest.config.ts missing ....... 0/3
# ...
# ─────────────────────────────────────────
# SCORE: 67/100 — 🔴 Non-Compliant
# P0 failures: C1, C2, C3 (must fix before deploy)
```

---

## 6. Updating This Rubric

Any change to this rubric requires a PR. The PR must:
1. Update the markdown table in Section 3
2. Update the JSON in Section 4 to match
3. Update `scripts/check-compliance.js` to reflect any new check logic
4. Bump the version number at the top of this file

Related standards: see `SYNTAX_ERROR_PREVENTION_STANDARD.md` for the full four-layer syntax error prevention policy.
