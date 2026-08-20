# PR Signal Hygiene — make a red check mean something again

**WR:** [#17738](https://github.com/midnghtsapphire/revvel-standards/issues/17738)
**Status:** Active runbook (2026-08-20)
**Companion files:**
- `config/known-red-checks.yml` — every always-red check with owner + unblock path
- `config/required-checks.yml` — required vs informational merge checks
- `docs/MERGE_AND_OVERRIDE_POLICY.md` — when force-merge is acceptable
- `standards/GREEN_MAIN_STANDARD.md` — never weaken a gate to look green

---

## The problem in one sentence

When three Vercel checks and Octopus Review are red on **every** PR for reasons
unrelated to the diff, a sixth red check — a real one — is indistinguishable
from the noise. That is the precondition `GREEN_MAIN_STANDARD.md` exists to
prevent.

## Pattern that caused it

A decision retired or wrote off a **workflow lane**, but the **GitHub App was
never uninstalled or muted**. The App kept posting failing statuses. Decision
log and running system diverged. Same conflation as D014 (RecurseML workflow
vs App).

---

## 1. Vercel — disconnect until the account is unblocked (D022)

### Decision

**Disconnect** the three Vercel Git integrations from this repository until a
deploy actually succeeds on a healthy account. Leaving three permanent red
checks is explicitly off the table (#17738). Hosting is still desired
long-term — reconnect only after proof.

### Why agents cannot finish this alone

Removing a GitHub App's repository access requires an **owner** session in the
GitHub UI (or the Vercel dashboard). `GITHUB_TOKEN` / CI tokens cannot mute or
uninstall the Vercel App. That owner step is tracked as a WR-BLOCKER linked
from the hygiene PR.

### Click-by-click — disconnect Vercel from this repo (pick ONE path)

#### Path A — from GitHub (stops checks on this repo only)

1. Open <https://github.com/midnghtsapphire/revvel-standards>.
2. Click **Settings** (repo settings, not your profile).
3. Left sidebar → **Integrations** → **GitHub Apps**
   (URL shape: `…/settings/installations`).
4. Find **Vercel** in the installed apps list → click **Configure**.
5. Under **Repository access**:
   - If it says **All repositories**, switch to **Only select repositories**.
   - Uncheck **`revvel-standards`** (and any other repo that should stop
     getting blocked deploy statuses).
6. Click **Save**.
7. **Success looks like:** open any open PR → **Checks** tab → the three
   `Vercel – …` rows no longer appear on new commits. Old commits keep their
   historical statuses; that is normal.

#### Path B — from Vercel (stops Git-triggered deploys per project)

1. Open <https://vercel.com/login> and sign in as the account that owns the
   blocked team (dashboard currently referenced as
   <https://vercel.com/oaudrey-projects>).
2. For each of these projects, open **Settings → Git**:
   - `standards`
   - `revvel-standards`
   - `marketplace-relister`
3. Click **Disconnect** (or remove the GitHub link) and confirm.
4. **Success looks like:** Vercel no longer lists a connected GitHub repo, and
   new pushes to GitHub do not create Vercel deployments or commit statuses.

#### After the account is healthy again

1. Resolve the block using Vercel's guide:
   <https://vercel.com/knowledge/why-is-my-account-deployment-blocked>
2. Reconnect Git (Path B reverse) **or** re-add the repo under the Vercel
   GitHub App (Path A reverse).
3. Trigger one deploy. Only after it succeeds:
   - set `config/connections.yml` `vercel.status` back to `verified`
   - run `npm run connections` to regenerate `docs/CONNECTIONS_REGISTRY.md`
   - remove the three Vercel rows from `config/known-red-checks.yml`
   - delete or close the WR-BLOCKER

---

## 2. Octopus Review — monthly 20-review cycle (D023)

### Decision

- **Do NOT uninstall** Octopus. The free tier's **20 code reviews / month**
  are real value (owner clarification on #17738).
- When the month's 20 are consumed and the App posts
  `Your organization is out of credits.` / the quota banner, **mute** the App
  for this repo for the rest of the billing period.
- On monthly reset, **unmute** so the next 20 reviews run.
- While muted (or while out of credits before mute), the fleet fallback
  already reviews: `.github/workflows/octopus-review-fallback.yml` +
  `scripts/octopus-review-fallback.js`.

### Is mute automatable?

| Approach | Automatable from this repo? | Notes |
| --- | --- | --- |
| Remove repo from Octopus GitHub App installation | **No** with `GITHUB_TOKEN` | Needs owner UI or an admin token with App-installation scope the sandbox does not have |
| Vendor dashboard "pause reviews" | **No** from CI | Manual at <https://octopus-review.ai> if the control exists |
| Repo ruleset / required-check exclusion | **N/A** | Octopus is already **not** a required check (see `config/required-checks.yml`) |
| Detect quota death and remind | **Yes** | Fallback workflow already fires; this runbook + `REMINDERS.md` is the mute/unmute checklist |

**Conclusion:** mute/unmute is a **manual monthly owner action**. It is listed
in `REMINDERS.md`. Do not pretend a workflow toggles the App.

### Click-by-click — mute Octopus when out of credits

1. Confirm quota death on any open PR: check named **`Octopus Review`** shows
   `Your organization is out of credits.` (or the bot comment says
   "add your own API keys" / "usage limit" / "quota").
2. Open <https://github.com/settings/installations> (user)
   or the org equivalent if the App is org-installed.
3. Find **Octopus Review** → **Configure**.
4. Under **Repository access** → **Only select repositories** → uncheck
   **`revvel-standards`** → **Save**.
5. **Success looks like:** new commits no longer get an `Octopus Review`
   failure. Fallback reviews may still appear from
   `octopus-review-fallback.yml` (that is wanted).

### Click-by-click — unmute on monthly reset

1. On the day the Octopus free-tier counter resets (check
   <https://octopus-review.ai> usage, or the first day you again see successful
   Octopus reviews on another repo):
2. Same **Configure** page → re-check **`revvel-standards`** → **Save**.
3. Open a small PR or re-run a review; confirm **`Octopus Review`** goes green
   or posts a real review, not `out of credits`.
4. **Success looks like:** Octopus sticky review is back; fallback skips
   because a healthy Octopus review exists.

---

## 3. RecurseML — restore track (not this WR)

- Decision **D014** restored the workflow lane; App was never the thing D007
  measured.
- Tracked in [#17732](https://github.com/midnghtsapphire/revvel-standards/issues/17732).
- Workflow lane is **inert** until `RECURSE_ML_API_KEY` is set
  ([#17739](https://github.com/midnghtsapphire/revvel-standards/issues/17739)).
- Intermittent `recurseml/analysis` App errors stay in
  `config/known-red-checks.yml` until upstream is stable.

---

## 4. Required vs informational checks (D024)

Active ruleset **`main`** (id `17149543`) requires exactly:

1. `check-for-scaffolding`
2. `ci/circleci: lint-and-test`
3. `GitGuardian Security Checks`

Everything in the "informational" list in `config/required-checks.yml`
(Vercel ×3, Octopus Review, RecurseML App, Devin, AI PR review) must **not**
be added as required. Adding them would make merge impossible whenever a
vendor account or quota dies — the failure mode #17738 is fixing.

**Not in scope here:** `actions-lint` on main is a real lint failure tracked
in [#17734](https://github.com/midnghtsapphire/revvel-standards/issues/17734)
— fix it, do not mute it.

---

## 5. Definition of done for a "clean" PR

After Vercel is disconnected and Octopus is muted only when out of credits:

| Check | Clean PR expectation |
| --- | --- |
| Ruleset required trio | Green |
| Vercel ×3 | Absent (disconnected) or green (account fixed) |
| Octopus Review | Green during the 20-review window; **absent** when muted after quota death |
| RecurseML App | Green or documented intermittent (#17732) |
| Any other red | Real — investigate; must not be "account blocked" noise |

Any remaining always-red check must appear in `config/known-red-checks.yml`
with owner + unblock path, or it is unexplained by construction.

---

## 6. Related decisions

| ID | Summary |
| --- | --- |
| D008 | Historical: replace Octopus with OpenRouter lane when quota-dead (fallback still stands) |
| D014 | Restore RecurseML workflow; App was never measured by D007 |
| D015 | Retire OSSAR (permanently-red security check) |
| D022 | Disconnect Vercel integrations until account unblocked |
| D023 | Octopus keep-installed + monthly mute cycle |
| D024 | Required checks = ruleset trio only; vendor noise stays informational |
