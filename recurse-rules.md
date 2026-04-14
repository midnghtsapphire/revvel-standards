# Recurse Rules — MIDNGHTSAPPHIRE / Revvel Standards
#
# This file defines custom code quality rules enforced by RecurseML on every PR.
# RecurseML reads this file and flags any patterns listed below as violations.
#
# Rule format:
#   ## Rule Name
#   **Pattern:** description of what to look for
#   **Why:** rationale
#   **Fix:** how to fix it
#
# Reference: https://docs.recurse.ml/recurse-rules

---

## No Hardcoded Secrets or API Keys

**Pattern:** Any string literal that looks like an API key, token, password, connection string,
or secret (e.g. matches patterns like `sk-`, `ghp_`, `Bearer `, `password =`, `api_key =`,
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
