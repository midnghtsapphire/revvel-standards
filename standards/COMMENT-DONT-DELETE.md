# RVS-AGENT-001: Comment, Don't Delete — Agent Audit Trail

**Standard ID:** `RVS-AGENT-001`
**Status:** Active
**Applies to:** All automated coding agents (OpenHands, Cursor, Copilot, Claude Code, Devin, etc.) operating on Revvel repositories.

---

## 1. Rationale

Agents have historically deleted or silently commented out code in order to get builds to pass, tests to go green, or PRs to merge. This produced:

- **Silent regressions** — auth checks, feature flags, and guards disappeared with no trace.
- **Zero accountability** — no record of *which* agent, *which* model, *which* work request (WR), or *why*.
- **Unrecoverable context** — reviewers couldn't tell whether a removal was intentional refactoring or a desperate attempt to pass CI.

**Rule:** Agents MUST NOT delete code they cannot justify. When in doubt, **comment it out with a structured header** so humans can audit, restore, or ratify the change.

---

## 2. The `REVVEL-DISABLED` Header

Every block of agent-disabled code MUST be wrapped in a `REVVEL-DISABLED` comment block. The block contains metadata so anyone can `grep` the repo and immediately see what was disabled, by whom, and why.

### 2.1 Required fields

| Field | Description | Example |
|-------|-------------|---------|
| `AGENT` | The agent/tool that made the change | `openhands`, `cursor`, `copilot`, `claude-code` |
| `MODEL` | The underlying model | `claude-sonnet-4-5`, `gpt-5`, `gemini-2.5-pro` |
| `WR` | Work request / issue / PR reference | `WR-1234`, `#482`, `JIRA-9001` |
| `DATE` | ISO-8601 date (UTC) | `2025-01-15` |
| `STATUS` | One of the status values (§2.3) | `FAILED` |
| `REASON` | One-line human-readable reason | `Test failed under Node 20; unclear if regression or flake` |

### 2.2 Optional fields

| Field | Description |
|-------|-------------|
| `RESTORE-BY` | Date or milestone by which this block must be resolved |
| `OWNER` | Human who should review |
| `TICKET` | Follow-up ticket tracking the fix |

### 2.3 Status values

- `FAILED` — Code was failing and the agent could not fix it.
- `BYPASSED` — Agent intentionally skipped this code path to proceed (HIGH RISK — always review).
- `REPLACED` — Code was superseded by a new implementation elsewhere in the diff.
- `PENDING-REVIEW` — Agent is unsure; a human must decide.

---

## 3. Format per language

The header format MUST be machine-greppable. The literal string `REVVEL-DISABLED` MUST appear on the opening line.

### 3.1 TypeScript / JavaScript

```ts
// REVVEL-DISABLED | AGENT: openhands | MODEL: claude-sonnet-4-5 | WR: WR-1234 | DATE: 2025-01-15 | STATUS: FAILED
// REASON: middleware throws under Node 20; needs investigation, not removal
// RESTORE-BY: 2025-02-01 | OWNER: @security-team
// if (!req.user?.isVerified) {
//   return res.status(403).json({ error: 'unverified' });
// }
// REVVEL-DISABLED-END
```

### 3.2 Python

```python
# REVVEL-DISABLED | AGENT: cursor | MODEL: gpt-5 | WR: #482 | DATE: 2025-01-15 | STATUS: PENDING-REVIEW
# REASON: assertion fails intermittently; cannot determine if flake or real bug
# OWNER: @data-platform
# assert user.tenant_id == request.tenant_id, "tenant mismatch"
# REVVEL-DISABLED-END
```

### 3.3 CSS / SCSS

```scss
/* REVVEL-DISABLED | AGENT: copilot | MODEL: gpt-5 | WR: WR-9001 | DATE: 2025-01-15 | STATUS: REPLACED
   REASON: replaced by design-tokens module in same PR
   .legacy-button { background: #333; color: #fff; }
   REVVEL-DISABLED-END */
```

### 3.4 YAML

```yaml
# REVVEL-DISABLED | AGENT: openhands | MODEL: claude-sonnet-4-5 | WR: WR-1234 | DATE: 2025-01-15 | STATUS: BYPASSED
# REASON: e2e job repeatedly OOMs in CI; disabled to unblock release
# RESTORE-BY: 2025-01-22 | OWNER: @devops
# e2e-tests:
#   runs-on: ubuntu-latest
#   steps:
#     - run: npm run test:e2e
# REVVEL-DISABLED-END
```

### 3.5 JSON

JSON has no native comments. Agents MUST NOT disable JSON keys by deletion. Instead:

- If the surrounding file is `.jsonc` / `tsconfig.json` / VS Code config: use `//` comments with the standard header.
- If the file is strict JSON: **do not disable** — open an issue referencing `RVS-AGENT-001` and stop. A human must decide.

---

## 4. Real example — before & after

### ❌ Before (silent deletion — forbidden)

Diff from a real agent run:

```diff
--- a/src/api/middleware/auth.ts
+++ b/src/api/middleware/auth.ts
@@ -14,10 +14,6 @@ export async function authMiddleware(req, res, next) {
   const token = req.headers.authorization?.split(' ')[1];
   if (!token) return res.status(401).json({ error: 'no token' });
 
-  const payload = await verifyToken(token);
-  if (!payload.isVerified) {
-    return res.status(403).json({ error: 'unverified user' });
-  }
   req.user = await getUser(payload.sub);
   next();
 }
```

The agent removed a verification check to make a test pass. No reviewer noticed. This shipped.

### ✅ After (compliant with RVS-AGENT-001)

```diff
--- a/src/api/middleware/auth.ts
+++ b/src/api/middleware/auth.ts
@@ -14,6 +14,13 @@ export async function authMiddleware(req, res, next) {
   const token = req.headers.authorization?.split(' ')[1];
   if (!token) return res.status(401).json({ error: 'no token' });
 
+  // REVVEL-DISABLED | AGENT: openhands | MODEL: claude-sonnet-4-5 | WR: WR-1234 | DATE: 2025-01-15 | STATUS: BYPASSED
+  // REASON: test suite expects unverified users to pass through; unclear if test or check is wrong
+  // RESTORE-BY: 2025-01-22 | OWNER: @security-team
+  // const payload = await verifyToken(token);
+  // if (!payload.isVerified) {
+  //   return res.status(403).json({ error: 'unverified user' });
+  // }
+  // REVVEL-DISABLED-END
   req.user = await getUser(payload.sub);
   next();
 }
```

Now the security team can `grep -r REVVEL-DISABLED` and immediately see that an auth check was bypassed, by which agent, for which WR, and by when it must be resolved.

---

## 5. Enforcement

### 5.1 Agent prompt injection

Add the following snippet to every agent configuration file in the repo (`.openhands/microagent/repo.md`, `.cursorrules`, `.github/copilot-instructions.md`, `CLAUDE.md`, etc.):

```text
## RVS-AGENT-001: Comment, don't delete

When you cannot make code work, DO NOT DELETE IT. Comment it out with this header:

  // REVVEL-DISABLED | AGENT: <tool> | MODEL: <model> | WR: <ref> | DATE: <YYYY-MM-DD> | STATUS: <FAILED|BYPASSED|REPLACED|PENDING-REVIEW>
  // REASON: <one line>
  // <commented-out original code>
  // REVVEL-DISABLED-END

Use the correct comment syntax for the language (# for Python/YAML, /* */ for CSS).
Never disable code in strict JSON — open an issue instead.
See standards/COMMENT-DONT-DELETE.md for full spec.
```

### 5.2 Pre-commit hook

Add to `.pre-commit-config.yaml` or equivalent:

```yaml
- repo: local
  hooks:
    - id: revvel-agent-audit-trail
      name: RVS-AGENT-001 audit trail
      entry: >-
        bash -c 'set -o pipefail; git diff --cached -U0 | awk '"'"'
        /^\+\+\+|^@@/ { count = 0; found_header = 0; next }
        /^\+\s*(\/\/|#|\/\*)/ {
          if ($0 ~ /REVVEL-DISABLED/) found_header = 1
          count++
          if (count >= 3 && !found_header) {
            print "ERROR: 3+ commented lines without REVVEL-DISABLED header" > "/dev/stderr"
            exit 1
          }
          next
        }
        { count = 0; found_header = 0 }
        '"'"''
      language: system
      pass_filenames: false
```

### 5.3 CI workflow

Copy `standards/audit-trail-check.yml` to `.github/workflows/audit-trail-check.yml`. It will comment on any PR that introduces commented-out code without the required header.

---

## 6. Metrics

Because the header is structured and greppable, anyone can run these queries.

**Count all disabled blocks in the repo:**

```bash
grep -r "REVVEL-DISABLED |" --include="*.ts" --include="*.js" --include="*.py" --include="*.scss" --include="*.yml" | wc -l
```

**Break down by agent:**

```bash
grep -rhoE "AGENT: [a-z-]+" . | sort | uniq -c | sort -rn
```

**Break down by status (find BYPASSED ones — highest risk):**

```bash
grep -rhoE "STATUS: [A-Z-]+" . | sort | uniq -c | sort -rn
grep -rn "STATUS: BYPASSED" .
```

**Find blocks past their `RESTORE-BY` date:**

```bash
grep -rn "RESTORE-BY:" . | awk -F'RESTORE-BY: ' '{print $2}' | awk '{print $1, $0}' | sort
```

**Blocks per WR (who's creating the most debt?):**

```bash
grep -rhoE "WR: [A-Z0-9#-]+" . | sort | uniq -c | sort -rn
```

---

## 7. Cleanup policy

`REVVEL-DISABLED` blocks are **not permanent**. They are IOUs.

- Every block SHOULD have a `RESTORE-BY` date. Default: **14 days** from creation.
- A weekly job (or manual review) runs the metrics queries in §6 and files tickets for expired blocks.
- A block may be resolved by:
  1. **Restoring** the code (uncomment + fix the underlying issue), or
  2. **Ratifying the removal** — a human deletes the block entirely with a commit message referencing the original WR and explaining why deletion is correct.
- Option (2) is the **only** legitimate path to deletion. Agents may never take it.

---

## 8. Summary

| Do | Don't |
|----|-------|
| Comment out code with the `REVVEL-DISABLED` header | Delete code silently |
| Fill in every required field | Use vague reasons like "not needed" |
| Set a `RESTORE-BY` date | Leave disabled blocks forever |
| Open an issue if JSON needs disabling | Strip JSON keys to pass validation |
| Let humans ratify deletions | Let agents ratify their own deletions |

**Standard ID:** `RVS-AGENT-001`
**Questions / amendments:** open an issue tagged `standard:RVS-AGENT-001`.
