# Recurse Rules — MIDNGHTSAPPHIRE / Revvel Standards
##
## This file defines custom code quality rules enforced by RecurseML on every PR
## RecurseML reads this file and flags any patterns listed below as violations
##
## Rule format
## ## Rule Name
## **Pattern:** description of what to look for
## **Why:** rationale
## **Fix:** how to fix it
##
## Reference: <https://docs.recurse.ml/recurse-rules>

---

## No Hardcoded Secrets or API Keys

**Pattern:** Any string literal that looks like an API key, token, password, connection string,
or secret (e.g. matches patterns like `sk-`, `ghp_`, `Bearer`, `password =`, `api_key =`,
base64 blobs of 40+ chars in assignment positions).

**Why:** Secrets committed to source code become public and are immediately exploited by bots.

**Fix:** Move the value to a `.env` file referenced by `process.env.MY_KEY` or
`os.environ["MY_KEY"]`. Add `.env` to `.gitignore`. Never commit real credential values.

---

## No `any` Types in TypeScript

**Pattern:** TypeScript files containing `: any` or `as any` (explicit `any` casts or type
annotations).

**Why:** `any` defeats TypeScript's type system and hides bugs that the compiler would
otherwise catch. All Revvel projects use TypeScript strict mode.

**Fix:** Replace `any` with the correct type, `unknown` (with a type guard), or a proper
generic. If the type is genuinely unknown at compile time, use `unknown` and narrow it.

---

## No Silent Error Swallowing

**Pattern:** `catch` blocks that are empty or contain only `console.log` / `console.error`
with no re-throw and no error reporting call (Sentry, Resend alert, GitHub Issue).

**Why:** Silent failures hide production bugs. All Revvel apps use three-tier error reporting:
console → email → GitHub Issue.

**Fix:** Add `throw err` to re-propagate, or call the Revvel monitored wrapper
(`monitoredWrapper(fn)` from `skills/error-reporting/SKILL.md`).

---

## No Direct `console.log` in Production Code

**Pattern:** `console.log(` in non-test TypeScript/JavaScript files under `src/`, `app/`,
`lib/`, or `api/` (excluding `*.test.*` and `*.spec.*` files).

**Why:** Debug logs clutter production output and can leak sensitive data (user IDs, tokens,
payloads).

**Fix:** Use a structured logger (`pino`, `winston`) or remove the statement. Retain
`console.error` only for critical paths and strip debug logs before merging to `main`.

---

## No TODO or FIXME Left in Merged Code

**Pattern:** Comments containing `TODO`, `FIXME`, `HACK`, `XXX`, or `TEMP` in files
being merged to `main`.

**Why:** Unresolved TODOs in `main` indicate incomplete work was shipped.

**Fix:** Convert the TODO to a GitHub Issue, then remove the comment. If the TODO is
intentional future work, open an issue and reference it: `// See issue #42`.

---

## DRY — No Duplicated Logic Blocks

**Pattern:** Functions or code blocks of 10+ lines that are identical or nearly identical
(≥ 90% similarity) in two or more files within the same project.

**Why:** Duplicated logic means bugs must be fixed in multiple places and diverge over time.

**Fix:** Extract the shared logic into a utility function in `lib/utils` or a shared module.

---

## No `.env` Files Committed

**Pattern:** Any file named `.env`, `.env.local`, `.env.production`, `.env.staging`, or
containing real credential values committed to the repo.

**Why:** Exposing `.env` files leaks all credentials to anyone with repo read access.

**Fix:** Add `.env*` to `.gitignore`. Commit only `.env.example` with placeholder values.
Use GitHub Actions secrets (`secrets.MY_KEY`) for CI/CD.

---

## Accessible UI — No Images Without Alt Text

**Pattern:** `<img` elements in React/HTML files that are missing the `alt` attribute, or
have `alt=""` on non-decorative images.

**Why:** All Revvel projects target WCAG 2.2 AA compliance. Missing alt text breaks screen
readers and violates ADA.

**Fix:** Add a descriptive `alt="…"` to every meaningful image. Use `alt=""` only for
purely decorative images (CSS background images or icons repeated with text labels).

---

## No Unvalidated User Inputs to Database Queries

**Pattern:** User-supplied values (from `req.body`, `req.params`, `req.query`, form fields)
passed directly into raw SQL strings (template literals containing `SELECT`, `INSERT`,
`UPDATE`, `DELETE`) without parameterization.

**Why:** SQL injection is in the OWASP Top 10 and can destroy or exfiltrate an entire
database.

**Fix:** Use parameterized queries (`db.query("SELECT … WHERE id = $1", [userId])`),
an ORM (Prisma, SQLAlchemy), or a query builder (Knex) that escapes inputs automatically.

---

## All API Routes Must Have Authentication

**Pattern:** Express/FastAPI route handlers that do not include an authentication middleware
call (`requireAuth`, `verifyToken`, `authenticate`, `@require_auth`, etc.) unless they are
explicitly marked as public with a comment `// PUBLIC ROUTE`.

**Why:** Unprotected endpoints expose data and allow unauthorized actions.

**Fix:** Add auth middleware. If the route is genuinely public, add `// PUBLIC ROUTE — no auth
required` to signal that the omission is intentional and has been reviewed.

---

## Tests Required for All New Functions

**Pattern:** New exported functions or React components added in a PR that do not have a
corresponding test file (`*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`).

**Why:** Untested code is unverified behavior. All Revvel projects require tests before merging.

**Fix:** Write a Vitest unit test for each new function and a Playwright E2E test for each
new user-facing route. Run `npm test` locally before pushing.

---

## Revvel Stack Compliance

**Pattern:** Imports of non-approved frameworks or libraries without a comment explaining the
exception. Specifically flag: jQuery, Moment.js (use `date-fns`), CRA (`create-react-app`,
use Vite), Lodash (use native ES methods), Axios in new projects (use `fetch`).

**Why:** Revvel projects share a standard stack. Non-standard dependencies increase maintenance
burden and conflict with shared tooling.

**Fix:** Replace with the approved alternative. If a non-standard library is genuinely needed,
add a comment `// EXCEPTION: <reason>` and note it in the PR description.

---

## Unsafe Recursion — Missing Depth Guards

**Pattern:** Recursive functions that do not include a depth parameter and maximum depth check.
Functions that call themselves without tracking how deep the recursion has gone.

**Why:** Unguarded recursion causes stack overflow crashes on large or malicious inputs. All
Revvel projects must prevent production crashes from recursive functions.

**Fix:** Add a `depth` parameter (default 0) and check against a maximum (typically 50-100).
Throw an error when the limit is exceeded. See `RECURSION_STANDARD.md` for full guidance.

**Example:**
```typescript
// ❌ WRONG - No depth tracking
function process(data: any): any {
  if (typeof data === 'object') {
    return Object.values(data).map(process);
  }
  return data;
}

// ✅ CORRECT - Has depth guard
function process(data: any, depth = 0, maxDepth = 50): any {
  if (depth > maxDepth) {
    throw new Error(`Recursion depth limit ${maxDepth} exceeded`);
  }
  if (typeof data === 'object') {
    return Object.values(data).map(v => process(v, depth + 1, maxDepth));
  }
  return data;
}
```

---

## Recursion on Untrusted Input

**Pattern:** Recursive functions processing user-uploaded data, API responses, or any external
input without strict depth limits. Recursion on data from `req.body`, uploaded files, or
third-party APIs.

**Why:** Attackers can craft deeply nested payloads that exhaust the stack and crash the
application (Denial of Service attack). All external data must be treated as potentially
malicious.

**Fix:** Either convert to iteration with an explicit stack, or use recursion with a very
conservative depth limit (≤20). Validate input structure before processing. See
`RECURSION_STANDARD.md` Section 5.1.

---

## No Placeholder Escalation Labels Without Action

**Pattern:** Code comments, TODO items, or workflow steps that create labels like `needs-investigation`,
`escalate`, `blocked`, `waiting-for-human` without first attempting automatic resolution.

**Why:** MIDNGHTSAPPHIRE agents are relentlessly autonomous. Escalation is a last resort after
exhausting all self-healing options. Creating escalation labels prematurely indicates a lack of
resourcefulness.

**Fix:** Before escalating:
1. Research documentation and similar issues
2. Attempt automatic fixes (retries, fallbacks, alternatives)
3. Test multiple approaches
4. Only escalate if genuinely impossible to resolve autonomously
5. When escalating, document everything attempted

See `docs/AGENTS.md` Section "Driven Autonomy".

---

## Workflows Must Have Self-Healing Capabilities

**Pattern:** GitHub Actions workflows that fail without any error recovery, retry logic, or fallback
mechanisms. Workflows with `run:` steps that don't use `continue-on-error` or follow-up recovery
steps.

**Why:** Workflows must be resilient and self-healing. Transient failures (network issues, rate
limits, temporary unavailability) should trigger automatic recovery, not immediate failure.

**Fix:** Add to all workflows:
- Retry logic with exponential backoff for network calls
- `continue-on-error: true` only for non-critical diagnostic/recovery steps, and explicitly fail the job after diagnostics when critical steps fail
- Fallback approaches when primary method fails
- Automatic issue creation only after exhausting recovery options

See `docs/AGENT_AUTONOMY_PROTOCOLS.md` Section "Self-Healing Workflows".

---

## No Silent Test Failures in CI

**Pattern:** CI workflows where test failures are logged but don't fail the build, or tests are
wrapped in `|| true` to prevent workflow failure.

**Why:** Tests exist to prevent broken code from shipping. Silencing test failures defeats their
purpose and allows bugs into production.

**Fix:** Let tests fail the build. If a test is flaky, fix the test, don't silence it. If a test
is temporarily failing due to external dependencies, disable the test and open an issue to fix it,
don't mask the failure.

---

## API Calls Must Have Retry Logic

**Pattern:** HTTP requests (fetch, axios, curl) that don't implement retry logic for transient
failures (5xx errors, timeouts, network issues).

**Why:** External APIs fail temporarily. Retrying with exponential backoff turns transient failures
into successes without manual intervention.

**Fix:** Wrap API calls in retry logic:
```typescript
async function fetchWithRetry(url: string, maxAttempts = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return response; // Success or client error (don't retry)
      }
      // Server error - retry
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    }
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  }
  throw new Error('Max retry attempts exceeded');
}
```

See `docs/AGENT_AUTONOMY_PROTOCOLS.md` Section "OpenRouter Failure Handling".

---

## Errors Must Be Self-Documenting

**Pattern:** Error messages that are vague, don't include context, or don't suggest solutions.
Examples: "Error occurred", "Failed", "Invalid input".

**Why:** Good error messages enable autonomous debugging and recovery. Agents and developers need
context to diagnose and fix issues without manual investigation.

**Fix:** Error messages must include:
1. What failed (specific operation)
2. Why it failed (root cause if known)
3. What was attempted (input/context)
4. What to do next (suggestion for fix)

```typescript
// ❌ BAD
throw new Error('Failed');

// ✅ GOOD
throw new Error(
  `Failed to create branch 'issue-${issueNumber}-${issueTitle}': ` +
  `Branch name contains invalid characters (/:@). ` +
  `Update .github/issue-branch.yml to add these characters to gitReplaceChars. ` +
  `See git-check-ref-format documentation for full rules.`
);
```
