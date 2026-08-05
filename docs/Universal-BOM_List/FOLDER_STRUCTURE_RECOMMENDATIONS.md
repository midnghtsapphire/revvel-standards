# Folder Structure Recommendations — Revvel Standards

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Recommendation — Review and Implement  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

> This document captures recommended improvements to the Revvel Standards repository and docs folder structure. These are recommendations based on auditing the current state of the repository. Each item is labeled with a priority and implementation effort. Open a GitHub Issue for each section you want to implement (label: `enhancement` + `New Project` + `documentation`, assign to `midnghtsapphire`).

---

## Current Structure Assessment

After auditing the full `revvel-standards` repository, the current structure is strong but has several areas where clarity, discoverability, and automation could be improved significantly.

**Strengths:**
- Clear per-project docs in `docs/<project>/` with BOM, BRAND, SPRINT_LOG
- Master BOM auto-generation via `scripts/sync-bom.sh`
- Comprehensive standards documents at root level
- Agent Factory, skills, and templates well-organized

**Areas for improvement:**
1. Root-level standard files (30+) are undifferentiated — hard to navigate
2. `docs/` has a mix of project docs and general docs — could be split
3. No dedicated `tests/` directory structure at the standards repo level
4. Skills directory lacks consistent test coverage
5. Templates are scattered — no clear entry point
6. No `CHANGELOG` auto-generation from conventional commits
7. Missing `.github/` standard files (PR templates, issue templates, CODEOWNERS)

---

## Recommended Structure

### Current vs. Recommended Top-Level

```text
CURRENT ROOT                          RECOMMENDED ROOT
─────────────────────────────────     ─────────────────────────────────
revvel-standards/                     revvel-standards/
├── ACCESSIBILITY_STANDARD.md         ├── .github/
├── AFFILIATE_MARKETING_STANDARD.md   │   ├── ISSUE_TEMPLATE/
├── AGENT_FACTORY_STANDARD.md         │   │   ├── bom-gap.md
├── AUDREY_AUTONOMOUS_AGENT_STANDARD  │   │   ├── bug-report.md
├── AUTO_DOCUMENTATION_STANDARD.md    │   │   └── feature-request.md
├── CHANGELOG.md                      │   ├── PULL_REQUEST_TEMPLATE.md
├── CODE_REVIEW_STANDARD.md           │   └── CODEOWNERS
├── COMPLIANCE_RUBRIC.md              │
├── CONCURRENT_DEVELOPMENT_STANDARD   ├── standards/           ← MOVE ALL *_STANDARD.md here
├── CONTENT_STANDARD.md               │   ├── ACCESSIBILITY.md
├── DATABASE_ARCHITECTURE_STANDARD    │   ├── AGENT_FACTORY.md
├── DATA_MODEL_STANDARD.md            │   ├── CODE_REVIEW.md
├── DEPLOYMENT_STANDARD.md            │   ├── DEPLOYMENT.md
├── ...20+ more standards...           │   ├── SECURITY.md
│                                     │   ├── TESTING.md
├── README.md                         │   └── ...
├── agent-factory/                    │
├── docs/                             ├── docs/
│   ├── (project docs)                │   ├── projects/         ← MOVE project docs here
│   ├── (session notes)               │   │   ├── growlingeyes/
│   ├── (general docs)                │   │   ├── neurooz/
│   ├── Universal-BOM_List/ ← NEW     │   │   └── ...
│   └── _MASTER_BOM.md                │   ├── guides/           ← MOVE general guides here
│                                     │   │   ├── ONBOARDING.md
├── skills/                           │   │   ├── NON_CODER_GUIDE.md
├── scripts/                          │   │   └── ...
└── templates/                        │   ├── sessions/         ← SESSION_NOTES
                                      │   │   ├── 2026-02-25.md
                                      │   │   └── ...
                                      │   ├── Universal-BOM_List/ ← KEEP HERE
                                      │   └── _MASTER_BOM.md
                                      │
                                      ├── agent-factory/
                                      ├── skills/
                                      │   ├── <skill-name>/
                                      │   │   ├── SKILL.md
                                      │   │   ├── tests/        ← ADD TESTS
                                      │   │   │   └── skill.test.yml  (PromptFoo)
                                      │   │   └── examples/
                                      │   └── REGISTRY.md
                                      │
                                      ├── scripts/
                                      ├── templates/
                                      │   ├── cicd/
                                      │   ├── testing/
                                      │   ├── agent-factory/
                                      │   └── bom/              ← ADD BOM TEMPLATES
                                      │
                                      ├── .github/
                                      ├── README.md
                                      └── CHANGELOG.md
```

---

## Detailed Recommendations

### REC-001: Consolidate Standards Files into `standards/` Directory

**Priority:** P2 | **Effort:** Medium (1 day) | **Impact:** High discoverability

**Problem:** 30+ `*_STANDARD.md` files at the root level make the root cluttered and hard to navigate. New contributors don't know where to start.

**Solution:** Move all `*_STANDARD.md` files into `standards/` with shortened names:

```text
standards/
├── README.md              # Index of all standards
├── accessibility.md       # was ACCESSIBILITY_STANDARD.md
├── agent-factory.md       # was AGENT_FACTORY_STANDARD.md
├── affiliate-marketing.md
├── audrey-agent.md
├── auto-documentation.md
├── code-review.md
├── compliance-rubric.md
├── concurrent-development.md
├── content.md
├── database-architecture.md
├── data-model.md
├── deployment.md
├── field-mapping.md
├── github-projects.md
├── leads.md
├── marketing-automation.md
├── mcp.md
├── runbook.md
├── security.md
├── seo-metadata.md
├── syntax-error-prevention.md
├── testing.md             # MOST IMPORTANT — link to this everywhere
└── vault-agent.md
```

**Implementation Steps:**
1. Create `standards/` directory
2. Copy each file with new name (keep originals temporarily with redirect notice)
3. Update all cross-references in README.md and other documents
4. After 2 weeks, remove originals with git history preserved

**GitHub Issue Template:**
```text
Title: [Folder Structure] Move standards files into standards/ directory
Labels: enhancement, documentation, New Project
Assign: midnghtsapphire
```

---

### REC-002: Add `.github/` Templates Directory

**Priority:** P1 | **Effort:** Low (2 hours) | **Impact:** High — improves all new issues and PRs

**Problem:** No standardized issue templates, PR template, or CODEOWNERS file. Issues are created inconsistently.

**Solution:** Add `.github/` with standard templates:

```text
.github/
├── ISSUE_TEMPLATE/
│   ├── bom-gap.md          # For missing APIs, tools, purchases
│   ├── bug-report.md       # Standard bug template
│   ├── feature-request.md  # New feature template
│   ├── skill-request.md    # Request a new Revvel skill
│   └── project-kickoff.md  # Start a new project
├── PULL_REQUEST_TEMPLATE.md
└── CODEOWNERS
```

**`CODEOWNERS` content:**
```text
* @midnghtsapphire
docs/Universal-BOM_List/ @midnghtsapphire @Copilot
standards/ @midnghtsapphire
```

**`PULL_REQUEST_TEMPLATE.md` key sections:**
- Summary of changes
- Link to related issue
- BOM impact (did you add/change any services or APIs?)
- Self-healing checklist (did you run the phase transition checklist?)
- Test coverage (is coverage still above thresholds?)

---

### REC-003: Split `docs/` into `docs/projects/`, `docs/guides/`, and `docs/sessions/`

**Priority:** P2 | **Effort:** Low (1 hour) | **Impact:** Medium discoverability

**Problem:** `docs/` contains a mix of project-specific docs (GrowlingEyes, Neurooz, etc.), general guides (ONBOARDING.md, NON_CODER_GUIDE.md), and session notes (SESSION_NOTES_2026-02-25.md). This makes it hard to find things.

**Solution:**
```text
docs/
├── projects/          ← project-specific directories
│   ├── growlingeyes/
│   ├── neurooz/
│   ├── revvel-music-studio/
│   ├── universal-sar-app/
│   ├── premolt/
│   ├── Soul2Bowl/
│   └── ...
├── guides/            ← general how-to docs
│   ├── ONBOARDING.md
│   ├── NON_CODER_GUIDE.md
│   ├── GITHUB_PROJECTS_SETUP.md
│   └── ...
├── sessions/          ← session notes (archive)
│   ├── 2026-02-20.md
│   ├── 2026-02-25.md
│   └── ...
├── Universal-BOM_List/ ← keep at docs root (high-visibility)
└── _MASTER_BOM.md     ← keep at docs root
```

---

### REC-004: Add `tests/` to Each Skill

**Priority:** P1 | **Effort:** Medium (1 day per skill) | **Impact:** Critical — skills are untested

**Problem:** The `skills/` directory has 24+ skills but **zero test files**. Skills are AI-powered functions that directly affect production behavior. Running untested skills is a critical quality gap.

**Solution:** Every skill gets a PromptFoo test suite:

```text
skills/
├── <skill-name>/
│   ├── SKILL.md
│   ├── examples/
│   │   ├── input-1.txt
│   │   └── output-1.txt
│   └── tests/
│       ├── promptfoo.yml   ← PromptFoo test config
│       └── assertions/     ← expected outputs
```

**PromptFoo test template for skills:**
```yaml
# skills/<skill-name>/tests/promptfoo.yml
description: Tests for [Skill Name] skill
prompts:
  - file://./examples/input-1.txt
providers:
  - id: anthropic:claude-sonnet-4-20251101
    config:
      temperature: 0
tests:
  - description: Happy path — standard input
    assert:
      - type: contains
        value: "[expected key phrase in output]"
      - type: not-contains
        value: "Error"
      - type: javascript
        value: "output.length > 100"

  - description: Edge case — empty input
    vars:
      input: ""
    assert:
      - type: contains
        value: "[expected error or empty handling message]"
```

---

### REC-005: Add `templates/bom/` Directory

**Priority:** P1 | **Effort:** Low (1 hour) | **Impact:** Medium — enables faster project bootstrapping

**Problem:** The `SELF_HEALING_BOM_TEMPLATE.md` is now in `docs/Universal-BOM_List/` but should also be accessible from `templates/` for the `bootstrap-new-project.sh` script.

**Solution:**
```text
templates/
├── bom/
│   ├── BOM_TEMPLATE.md        ← copy of SELF_HEALING_BOM_TEMPLATE.md
│   └── BRAND_TEMPLATE.md      ← standard brand doc template
├── cicd/
├── testing/
└── agent-factory/
```

Update `scripts/bootstrap-new-project.sh` to auto-copy `templates/bom/BOM_TEMPLATE.md` to `docs/<project>/BOM.md`.

---

### REC-006: Add Conventional Commits and Auto-Changelog

**Priority:** P1 | **Effort:** Low (2 hours) | **Impact:** High — automated changelog, semantic versioning

**Problem:** Commits are inconsistent. `CHANGELOG.md` is manually maintained. This is error-prone and time-consuming.

**Solution:**
1. Adopt [Conventional Commits](https://www.conventionalcommits.org/) spec for all commits
2. Add `commitlint` to enforce the spec in CI
3. Use `semantic-release` or `release-please` to auto-generate `CHANGELOG.md` and version tags

**Commit format:**
```text
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore, ci
Scope: bom, skills, standards, docs, ci, scripts

Examples:
feat(bom): add Universal BOM List folder with tooling and API registry
fix(skills): correct vault-agent credential handling
docs(standards): update testing standard with axe-core integration
chore(ci): add bom-self-heal workflow
```

---

### REC-007: Add `docs/catalog/` for Project Discovery

**Priority:** P2 | **Effort:** Low (1 hour) | **Impact:** Medium

**Problem:** `docs/PROJECT_CATALOG.md` and `docs/REPO_CATALOG.md` exist but are not prominently linked. New team members and agents have trouble discovering what projects exist.

**Solution:** Create `docs/catalog/` with auto-generated project index:
```text
docs/catalog/
├── README.md           ← Quick-start "what is Revvel building?"
├── PROJECTS.md         ← All active projects with status, tech stack, BOM link
├── REPOS.md            ← All GitHub repos with purpose and status
├── SKILLS.md           ← All skills with description (generated from SKILLS_INDEX.yml)
└── APIS.md             ← All active APIs (generated from API_REGISTRY_BOM.md)
```

---

### REC-008: Standardize `skills/` with SKILLS_INDEX.yml

**Priority:** P1 | **Effort:** Low (2 hours) | **Impact:** High — enables agent routing

**Current state:** `skills/SKILLS_INDEX.yml` exists but many skills don't have consistent metadata.

**Recommended `SKILLS_INDEX.yml` entry format:**
```yaml
- name: vault-agent
  path: skills/vault-agent/SKILL.md
  status: stable          # stable | beta | experimental | deprecated
  llm: claude-sonnet-4
  triggers:               # keywords that route to this skill
    - vault
    - secret
    - api-key
    - credential
  tested: true
  test_path: skills/vault-agent/tests/promptfoo.yml
  last_tested: 2026-04-14
  version: 1.2.0
```

---

### REC-009: Add `AGENTS.md` at Root Level

**Priority:** P0 | **Effort:** Very Low (30 min) | **Impact:** High — agent onboarding

**Problem:** `docs/AGENTS.md` exists in the `docs/` folder but is not at the repo root where coding agents naturally look first (Claude Code, GitHub Copilot).

**Solution:** Add `AGENTS.md` at the root level (the coding agent reads this automatically):

```markdown
# AGENTS.md — Revvel Coding Agent Instructions

This file provides instructions for AI coding agents working in this repository.

## You Are
Audrey Evans' coding agent for the Revvel ecosystem. You follow Revvel Standards.

## Before Making Any Change
1. Read TESTING_STANDARD.md
2. Check docs/Universal-BOM_List/README.md for BOM requirements
3. Check docs/Universal-BOM_List/API_REGISTRY_BOM.md before adding any new API
4. Run the Self-Healing Checklist in docs/Universal-BOM_List/SELF_HEALING_BOM_TEMPLATE.md

## Standards to Follow
[Links to all standard files]

## Do Not
- Hardcode API keys
- Commit to main directly
- Skip tests
```

---

## Summary — Priority Matrix

| # | Recommendation | Priority | Effort | Impact |
|---|---|---|---|---|
| REC-001 | Move standards into `standards/` | P2 | Medium | High |
| REC-002 | Add `.github/` templates | P1 | Low | High |
| REC-003 | Split `docs/` into sub-folders | P2 | Low | Medium |
| REC-004 | Add `tests/` to each skill | P1 | Medium | Critical |
| REC-005 | Add `templates/bom/` directory | P1 | Low | Medium |
| REC-006 | Conventional commits + auto-changelog | P1 | Low | High |
| REC-007 | Add `docs/catalog/` | P2 | Low | Medium |
| REC-008 | Standardize `SKILLS_INDEX.yml` | P1 | Low | High |
| REC-009 | Add `AGENTS.md` at root | P0 | Very Low | High |

---

## How to Implement These Recommendations

For each recommendation you want to implement:

1. Open a GitHub Issue using this template:
   ```text
   Title: [Folder Structure] REC-00X: [Recommendation Name]
   Labels: enhancement, documentation, New Project
   Assign: midnghtsapphire
   Body: Paste the relevant section from this document
   ```

2. Create a new branch: `feat/folder-structure-rec-00X`

3. Make the changes following the instructions in each section

4. Update `README.md` to reflect the new structure

5. Update `scripts/bootstrap-new-project.sh` if affected

6. Run `scripts/sync-bom.sh` to verify BOM generation still works

---

*Last updated: April 14, 2026. This document itself should be reviewed quarterly.*
