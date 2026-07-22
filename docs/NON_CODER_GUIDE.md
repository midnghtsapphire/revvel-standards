# Non-Coder Guide to Revvel Applications

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Project managers, stakeholders, QA testers, and anyone who works with the system without writing code

---

## 1. What This Guide Is For

You do not need to write code to work effectively with a Revvel application. You do need to understand how the pieces fit together so you can:
- Catch errors and bugs before users do
- Describe problems clearly so developers or AI agents can fix them instantly
- Read documentation and understand what it means
- Make decisions about features and data without guessing

This guide teaches you exactly that.

---

## 2. How a Web Application Works (Plain English)

Think of a web application like a restaurant:

| Restaurant | Web App |
|---|---|
| Customer (diner) | User |
| The menu | The UI (what you see on screen) |
| Waiter | The API (carries requests between kitchen and table) |
| Kitchen | The Backend (server — processes requests) |
| Pantry / Refrigerator | The Database (stores all the data) |
| Health code | Security rules |
| Receipt | The response / confirmation |

**When a user logs in:**
1. The user fills in email and password on the screen (UI).
2. The browser sends those values to the backend via an API request (the waiter takes the order).
3. The backend looks up the email in the database (the kitchen checks the pantry).
4. The backend compares the password and, if correct, creates a token (the kitchen prepares the meal).
5. The token is sent back to the browser in the response (the waiter delivers).
6. The browser stores the token and uses it on every future request to prove identity.

---

## 3. The Three Layers — And What Can Go Wrong in Each

### Layer 1: The UI (What You See)

This is the screen — buttons, text boxes, dropdowns, images.

**What to look for:**
- Does the right label appear next to each field?
- Does the placeholder text (hint text inside the box) make sense?
- Does validation feedback appear when you type something wrong?
- Is the error message helpful and human? ("That email is already in use" is good. "Error 409" alone is not.)
- Does the button do what it says?
- Does the page load quickly? (Should feel under 2 seconds)
- Does it work on mobile?
- Is there a loading indicator when the app is fetching data?

**How to report a UI bug:**
> "On the [Page Name] screen, the [Field Name] field (FM-ID if known) shows [what you see] but I expected to see [what you expected]. Steps to reproduce: 1. Go to [URL]. 2. [Action]. 3. [What happened]."

---

### Layer 2: The API (The Waiter Between UI and Database)

You can't see the API directly, but you can observe its effects. When you submit a form, the API either:
- Returns success → the UI shows a confirmation
- Returns an error → the UI shows an error message
- Times out → the UI shows a loading spinner forever, or an error

**What to look for:**
- Does submitting a form give you a response (either success or an error)?
- Is the error message on screen clear and specific?
- Does the browser's URL change after a successful submit?
- Is any expected data missing from the page after it loads?

**How to see API errors without coding knowledge:**

On any modern browser (Chrome, Firefox, Edge):
1. Press `F12` to open Developer Tools
2. Click the **Network** tab
3. Perform the action that seems broken (submit form, load page)
4. Look for rows with a red color or a status code of 400, 401, 403, 404, or 500
5. Click on the red row → look at the **Response** tab to see the error message
6. Screenshot this and include it in your bug report

---

### Layer 3: The Database (The Pantry)

You can't access this directly without a database tool, but you can detect database problems by asking:

- "Was my data saved?" → Log out and log back in. If your data is gone, it wasn't saved.
- "Is the right data showing?" → Compare what you see on screen to what was entered.
- "Is old/deleted data still showing?" → Something might not be triggering a page refresh after a delete.

---

## 4. Reading a Field Map (No Code Required)

The field map is your rosetta stone. When something looks wrong in the app, find the field in the field map and you instantly know:
- What variable name the developer used
- What the database column is called
- What API endpoint handles it
- What type of data it expects

**Example scenario:** The user's display name is showing their email address instead of their first name.

1. Open the field map for the Profile page: `docs/field-maps/PROFILE_FIELD_MAP.md`
2. Find the row for "Display Name" or "First Name"
3. Check the **Database Column** — let's say it's `users.first_name`
4. Check the **API Request Field** — let's say it's `firstName`
5. Report: "The Display Name on the Profile page (FM-PROFILE-003) is showing `email` instead of `first_name`. The API field is `firstName`. It looks like the UI is reading from the wrong variable."

That level of detail means a developer can find and fix the bug in minutes instead of hours.

---

## 5. How to Read the CHANGELOG

The `CHANGELOG.md` in every repo is your history book. It tells you what changed in every version.

**Reading a CHANGELOG entry:**

```text
## [1.3.0] — 2026-04-05

### Added
- Stripe subscription management page
- Admin can toggle user roles

### Fixed  
- Cart total was displaying in dollars instead of cents (divided by 100 now correct)
- Email validation was not rejecting .con typos

### Changed
- Product images now load from CDN instead of the server

### Removed
- Legacy /api/v1/products endpoint removed (use /api/products)
```

**What each section means:**
- **Added** → New features that didn't exist before
- **Fixed** → Bugs that were broken and are now working correctly
- **Changed** → Existing behavior that works differently now
- **Removed** → Features or endpoints that no longer exist (if you're seeing errors, check here first)
- **Deprecated** → Still works but will be removed in a future version — stop using it

---

## 6. How to Read an API Endpoint

You'll see endpoints written like this in documentation and bug reports:

```text
POST /api/auth/register
GET  /api/products?category=electronics&limit=20
PUT  /api/users/:id
DELETE /api/orders/:id
```

**Decoding this:**
- The first word (`POST`, `GET`, `PUT`, `DELETE`) is the **HTTP Method** — the type of action
- The path after it (`/api/auth/register`) is the **endpoint** — the specific address

| Method | What It Does | Real-World Analogy |
|---|---|---|
| `GET` | Fetch / read data | Looking something up in a filing cabinet |
| `POST` | Create new data | Filing a new document |
| `PUT` | Replace an entire record | Swapping out a whole document |
| `PATCH` | Update part of a record | Editing just one field in a document |
| `DELETE` | Remove a record | Shredding a document |

`:id` means "replace this with an actual ID". So `/api/users/abc123` means "the user with ID abc123."

---

## 7. How to Read a Database Schema

You'll occasionally see schema definitions like this:

```text
users table:
  id          UUID        PRIMARY KEY
  email       VARCHAR(255) UNIQUE NOT NULL
  first_name  VARCHAR(100)
  is_active   BOOLEAN     DEFAULT true
  created_at  TIMESTAMP   DEFAULT NOW()
  deleted_at  TIMESTAMP   (null = not deleted)
```

**Plain English translation:**
- `id` — every user has a unique random ID (like a social security number that's never reused)
- `email` — stored text, max 255 characters, must be unique (no two users with the same email), required
- `first_name` — stored text, max 100 characters, optional
- `is_active` — true/false flag, starts as true when account is created
- `created_at` — automatically set to the current timestamp when the row is created
- `deleted_at` — empty (null) means the user is active; if set to a date, the user has been "deleted" (soft delete)

---

## 8. How to Read an Error Message

**Frontend validation error** (appears on the form):
- Location: directly under the field that failed
- Meaning: the data you typed doesn't meet the rules
- What to do: read the message and fix the input

**Toast error** (appears briefly in a corner):
- "Something went wrong" → The server returned an unexpected error. Check the Network tab.
- "Session expired" → Log out and log back in.
- "Already exists" → You tried to create a duplicate (e.g., an email already registered).

**Browser console error** (F12 → Console tab):
- Red text starting with `Error:` or `TypeError:` → A JavaScript error in the frontend code
- `Failed to fetch` or `NetworkError` → The browser couldn't reach the backend. Check if the server is running.
- `401 Unauthorized` → The auth token is missing or expired

**Server log error** (SSH → PM2 logs):
- `Cannot read property of undefined` → A variable was expected to have a value but was null
- `relation "table_name" does not exist` → A database table is missing (migration not run)
- `ECONNREFUSED` → The app can't connect to the database
- `Port already in use` → An old process is still running on the same port

---

## 9. Error Reporting Template

When something goes wrong, use this template to file a bug report (in GitHub Issues):

```text
**Bug Title:** [Short description — max 10 words]

**Severity:** 
  [ ] P0 — App is unusable / data is being lost or corrupted
  [ ] P1 — Major feature broken / significant user impact
  [ ] P2 — Minor issue / workaround exists

**What I Expected to Happen:**
[Describe the normal behavior]

**What Actually Happened:**
[Describe the broken behavior exactly]

**Steps to Reproduce:**
1. Go to [URL]
2. [Action]
3. [Action]
4. [What you observed]

**Field Map Reference (if applicable):**
FM-[SCREEN]-[NUMBER]

**Screenshots/Recordings:**
[Attach images or screen recordings]

**Browser / Device:**
[Chrome on Windows 11 / iPhone 14 Safari / etc.]

**Network Tab Screenshot:**
[If the error involves data not saving or loading, paste a screenshot of the Network tab in F12]

**Console Errors (if any):**
[Copy/paste any red text from the F12 Console tab]
```

---

## 10. Understanding the Compliance Rubric

The compliance rubric (`COMPLIANCE_RUBRIC.md`) is a scored checklist of everything a Revvel app must have. Think of it as a home inspection checklist.

| Score | Meaning | What It Means for You |
|---|---|---|
| 90–100 | ✅ Compliant | App is ready to ship |
| 70–89 | ⚠️ Conditional | App can run but has issues to fix |
| 50–69 | 🔴 Non-Compliant | App is blocked from going live |
| < 50 | 🚫 Critical | Immediate attention needed |

**P0 items** are non-negotiable. If even one P0 item fails, the app cannot be deployed.

---

## 11. Quick Reference: Where to Find Everything

| What You Need | Where to Find It |
|---|---|
| What does this word mean? | `docs/DATA_DICTIONARY.md` |
| What fields are on this screen? | `docs/field-maps/[SCREEN]_FIELD_MAP.md` |
| What changed in the last update? | `CHANGELOG.md` (root of repo) |
| Why was this decision made? | `docs/adr/ADR-XXXX-*.md` |
| How do I restart the app? | `docs/runbooks/[app-name].md` |
| What are all the rules for this app? | `MASTER_APP_TEMPLATE.md` |
| How do I report a bug? | Section 9 of this document |
| How do I audit this app for compliance? | `COMPLIANCE_RUBRIC.md` |
| What tests exist? | `tests/` directory, `TESTING_STANDARD.md` |
| What security rules apply? | `SECURITY_STANDARD.md` |
| How is the database structured? | `DATA_MODEL_STANDARD.md`, `db/schema.ts` |
