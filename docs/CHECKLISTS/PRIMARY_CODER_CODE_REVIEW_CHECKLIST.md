# Primary Coder Self-Review Checklist

**Purpose:** Coder reviews their own code before requesting review from others  
**When:** Before marking PR ready for review  
**Owner:** Primary coder who wrote the code

---

## Pre-Submission Checklist

### ✅ Syntax & Structure

- [ ] **No syntax errors** — Run linter/compiler, fix all errors
- [ ] **No unclosed brackets/braces** — `()`, `[]`, `{}`, `""`, `''`
- [ ] **No unclosed tags** — HTML/XML tags properly closed
- [ ] **Indentation consistent** — No mixed tabs/spaces, check YAML and Python especially
- [ ] **No trailing whitespace** — Lines don't end with spaces
- [ ] **No merge conflict markers** — `<<<<<<`, `======`, `>>>>>>` removed
- [ ] **File encoding correct** — UTF-8, no BOM issues

### ✅ Git & GitHub Specific

- [ ] **Branch name follows convention** — `wr/{issue}-{title}`, `fix/{desc}`, `feat/{desc}`
- [ ] **Commit messages follow convention** — `type(scope): description`
- [ ] **No secret keys in code** — API keys, tokens, passwords in env vars only
- [ ] **.gitignore updated** — No committed node_modules, .env, build artifacts
- [ ] **PR title follows convention** — `type(scope): description (#issue)`

### ✅ YAML/Workflow Checks

- [ ] **Valid YAML syntax** — No tabs, proper indentation, quoted strings where needed
- [ ] **GitHub Actions triggers correct** — `on:` properly defined
- [ ] **workflow_run has workflows list** — Required when using `workflow_run` trigger
- [ ] **Environment variables use `${{ }}`** — Proper GitHub expression syntax
- [ ] **Permissions set correctly** — `contents: write` for labels, PRs, etc.
- [ ] **No bare `${{ }}` in run scripts** — Use env vars instead

### ✅ Known Failure Points (These Break CI Most Often)

#### 1. YAML Indentation Issues

```text
❌ BAD:  key: value
❌ BAD:      nested: value  (inconsistent indent)
✅ GOOD: key: value
         nested: value
```

#### 2. GitHub Actions Multi-line Scripts

```yaml
# ❌ BAD (flush left terminates block scalar):
script: |
  line1
line2  # <- This terminates the script!

# ✅ GOOD (keep all content indented):
script: |
  line1
  line2
```

#### 3. Template Literal Multi-line in github-script

```javascript
// ❌ BAD (continuation at column 0):
body: [
  `Line 1`,
`Line 2`  // <- Flush left, terminates the array!
]

// ✅ GOOD (all indented):
body: [
  `Line 1`,
  `Line 2`
].join('\n')
```

#### 4. workflow_run Without workflows List

```yaml
# ❌ BAD:
on:
  workflow_run:
    workflows: [Workflow Name]  # WRONG - this is not valid!

# ✅ GOOD:
on:
  workflow_run:
    workflows:
      - Workflow Name
```

#### 5. Missing Git Identity

```bash
# ❌ BAD: fatal: unable to auto-detect email address
# ✅ GOOD: Set git config before operations:
git config user.email "you@example.com"
git config user.name "Your Name"
```

#### 6. Stale Rebase State

```bash
# ❌ BAD: fatal: It seems that there is already a rebase-merge directory
# ✅ FIX:
git rebase --abort
```

### ✅ Dependencies & Imports

- [ ] **All imports resolve** — No missing modules
- [ ] **No circular imports** — Import order doesn't create cycles
- [ ] **Package.json/package-lock.json synced** — After adding dependencies
- [ ] **Version constraints valid** — `^`, `~`, exact versions correct

### ✅ Testing

- [ ] **New code has tests** — Unit tests for new functions
- [ ] **Existing tests pass** — No regression
- [ ] **Edge cases covered** — Empty inputs, null values, large inputs
- [ ] **Test file naming correct** — `*.test.js`, `test_*.py`, etc.

### ✅ Documentation

- [ ] **Code comments explain WHY** — Not obvious things
- [ ] **README updated** — If adding new features/configs
- [ ] **API docs updated** — If changing endpoints/params
- [ ] **Changelog updated** — For user-facing changes

---

## Post-Review Action Items

When reviewers request changes, address each item:

- [ ] **Address all comments** — Don't ignore any feedback
- [ ] **Explain any disagreements** — If you disagree with feedback, explain why
- [ ] **Re-test after changes** — Don't assume fixes didn't break other things
- [ ] **Update PR description** — If behavior changed significantly

---

## Force-Merge Authorization

If you need to force-merge without full review completion:

### When Allowed

1. Hotfix that unblocks other work
2. Time-sensitive fix that can't wait
3. Reviewer explicitly approved with minor suggestions
4. Emergency production fix

### How to Request Authorization

Comment on PR:

```bash
/force-merge reason: <brief explanation>
```

### Required Before Force-Merge

- [ ] All CI checks passing
- [ ] At least one approval (unless hotfix)
- [ ] No unresolved blocking issues
- [ ] Document reason for bypassing normal process

---

## Quick Self-Review Script

Run this before requesting review:

```bash
# Syntax/lint check
npm run lint 2>/dev/null || echo "No lint script"

# Run tests
npm test 2>/dev/null || echo "No tests"

# Check for common issues
grep -r "<<<<<<" . --include="*.yml" --include="*.md" && echo "CONFLICT MARKERS FOUND!"
grep -r "console.log" . --include="*.js" | grep -v node_modules || echo "No debug logs"

# Validate YAML
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))" 2>/dev/null && echo "YAML valid"

# Check for secrets
grep -rE "(api_key|token|password|secret)" . --include="*.js" | grep -v node_modules | grep -v ".test." | grep -v "_test." || echo "No obvious secrets"
```

---

## Common Fix Patterns (For Reference)

| Issue | Fix |
|-------|-----|
| `status:checks-failing` but CI passing | Check API, fix labels |
| `mergeable: false` dirty state | Rebase onto main, resolve conflicts |
| Linter errors | Run formatter: `npm run format` |
| Test failures | Fix tests or code, don't skip |
| Missing env var | Add to `.env.example`, document |
| Permission denied | Add `permissions:` to workflow |

---

*Created: 2026-06-22*  
*Purpose: Ensure coders catch common issues before requesting review*
