# Example: Auto-Documentation Issue

## Purpose

This is an example of how to document a problem that was solved autonomously. This issue serves as a knowledge base entry for future reference.

---

## Problem

Branch creation was failing for issues with titles containing URLs or special characters.

**Error Message:**
```text
Could not create branch issue/issue-381--wr-evaluate-https-//github-com/strongdm-or-others-then-implement 
due to: refs/heads/issue/issue-381--wr-evaluate-https-//github-com/strongdm-or-others-then-implement 
is not a valid ref name.
```

**Trigger:**
- Any issue with a title containing URLs (e.g., `https://`)
- Any issue with titles containing special shell or git characters
- Happened on multiple workflow runs (every PR/WR)

## Error Details

**Context:**
- Workflow: `.github/workflows/create-issue-branch.yml`
- Config: `.github/issue-branch.yml`
- Tool: `robvanderleek/create-issue-branch@v1.9.0`

**Root Issue:**
The `gitReplaceChars` setting in `.github/issue-branch.yml` only included:
```text
gitReplaceChars: "'\"()[]{}!?"
```

This didn't cover git-unsafe characters like:
- Forward slash `/` (in URLs)
- Colon `:` (in URLs)
- At sign `@`
- Hash `#`
- Many others per `git-check-ref-format`

## Root Cause

Git has strict rules for ref (branch) names per [git-check-ref-format](https://git-scm.com/docs/git-check-ref-format):

**Git-prohibited characters/patterns:**
- ASCII control characters (< \040)
- Space, tilde `~`, caret `^`, colon `:`, question mark `?`, asterisk `*`, brackets `[]`
- Consecutive dots `..`, slash-dot sequences `/./` or `/../`
- Multiple consecutive slashes `//`
- Ending with dot `.` or `.lock`
- At sign `@` in the sequence `@{` (reserved for ref syntax)

**Additionally sanitized for shell safety and usability:**
- Shell operators and special characters: `#`, `|`, `&`, `;`, `<`, `>`, `` ` ``, `$`, `%`, `+`, `=`, `,`
- Forward slash `/` (problematic in certain ref patterns)

The branch naming tool was only sanitizing a small subset of these characters, causing creation to fail when issue titles contained URLs or special characters.

## Solution Implemented

**File:** `.github/issue-branch.yml`

Updated `gitReplaceChars` to include **all** git-unsafe characters:

```yaml
gitReplaceChars: "'\"()[]{}!?/:@~^*\\#|&;<>`$%+=.,"
```

**Characters added:**
- `/` — forward slash (URLs, paths)
- `:` — colon (URLs, time)
- `@` — at sign (mentions, emails)
- `~` — tilde
- `^` — caret
- `*` — asterisk
- `\\` — backslash
- `#` — hash (shell comments)
- `|` — pipe (shell operator)
- `&` — ampersand (shell operator)
- `;` — semicolon (shell operator)
- `<>` — angle brackets (shell operators)
- `` ` `` — backtick (shell expansion)
- `$` — dollar sign (variables)
- `%` — percent
- `+` — plus
- `=` — equals
- `.` — period (to prevent ending with dot)
- `,` — comma

**Testing:**
Verified with 5 test cases including the original failure case. All now produce valid git refs.

## Prevention

**Immediate:**
- Comprehensive character list based on git documentation
- Detailed comments explaining each character class
- All git-unsafe characters now covered

**Long-term:**
- Consider pre-validation of issue titles at creation time
- Add workflow test that creates branches from problematic titles
- Monitor for new git ref format rules in future git versions

**Documentation:**
- Updated `.github/issue-branch.yml` with full explanation
- Added this issue as knowledge base entry
- Documented in `docs/AGENT_AUTONOMY_PROTOCOLS.md` as example of self-healing

## Links

- Original issue: #381
- PR with fix: #[ACTUAL-PR-NUMBER] (replace with actual PR number when creating real issues)
- Git ref format docs: <https://git-scm.com/docs/git-check-ref-format>
- Related workflow: `.github/workflows/create-issue-branch.yml`

## Tags

`auto-fix` `documentation` `solved` `git` `branch-naming` `workflow`

---

**Note:** This issue was created as an example of autonomous problem-solving documentation. 
Real auto-created issues would be created programmatically via GitHub Actions after fixing a problem.
