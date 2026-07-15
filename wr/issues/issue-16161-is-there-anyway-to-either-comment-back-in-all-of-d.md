# WR: [WR] Is there anyway to either comment back in all of  /dragnet and that team individually, it was working perfect now i do not have them at all

**Issue:** #16161  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-15  
**Research Date:** 2026-07-15  
**Researcher:** Copilot  
**WR Status:** ✅ Fixed

---

## Scope

Restore all persona comment triggers (`/dragnet` and all fleet personas) so that typing a slash command in any issue or PR comment summons the correct AI persona. Specifically:

- `/dragnet` — DRAGNET error-hunter/scaffolder (was already present; verified working)
- `/mender` — MENDER (Mabl expert) — **was missing from the `if` condition** despite being documented in the workflow header
- `/coder`, `/fixer` — Coder persona — **also missing from the `if` condition**
- Duplicate `/🐙` entry in the condition — **cleaned up**
- Duplicate emoji header comment block — **cleaned up**

**Out of scope:** API key funding issues (OPENROUTER_API_KEY balance); GitHub Copilot billing.

---

## Approach

**Root cause found** in `.github/workflows/persona-comment-trigger.yml`:

1. **`/mender` was never wired into the `if` condition.** The workflow header comment (line 9) documented `/mender <mabl task>` but the actual job-level `if` expression only checked for `/mabl` and `/🧪`. Any comment containing `/mender` was silently ignored by the workflow — the job never started.

2. **`/coder` and `/fixer` were also absent** from the `if` condition, so the Coder persona could only be reached via its emoji aliases (`/🛠️`, `/🛠`).

3. **Duplicate `/🐙` check** (introduced by commit `bbbf467e`) added a second `contains(github.event.comment.body, '/🐙')` line. Harmless but misleading.

4. **Duplicate emoji header comment** (same commit) left an orphaned `#   /🎓 ...` line from before the mender persona was added.

**Fix applied:** 
- Added `/mender` and `/mabl` order fixed — `/mender` is the canonical handle and must fire the workflow
- Added `/coder` and `/fixer` to the `if` condition
- Removed the duplicate `/🐙` line
- Consolidated the duplicate header comment into a single clean line
- All existing triggers (`/dragnet`, `/professor`, `/oaudrey`, `/mindmappr`, `/openrouter`, `/orbit`, `/octo`, etc.) were untouched and remain in place

---

## Acceptance Criteria

- [x] `/mender` comments on issues/PRs trigger the `Persona Comment Trigger` workflow
- [x] `/coder` and `/fixer` comments trigger the workflow
- [x] No duplicate `/🐙` entry in the `if` condition
- [x] All existing triggers (`/dragnet`, `/professor`, `/oaudrey`, etc.) still present
- [x] Workflow YAML is valid (no syntax errors)
- [x] Tests pass

---

## Risks & Mitigations

- **OPENROUTER_API_KEY must be funded** for persona responses to complete. The workflow will trigger (job starts) but the persona runner will emit a warning and no LLM reply will be posted if the key is empty or out of credits. This is a separate operational concern from the trigger wiring fixed here.
- **No regressions** — only additive changes to the `if` condition; existing triggers unchanged.

---

## Learnings — What & Why

When a new persona is added (MENDER in commit `aee1c6d9`), the implementation correctly registers the persona in `scripts/openrouter-personas.js` and documents it in the workflow header comment, but **the actual `if` condition in `persona-comment-trigger.yml` must also be updated** — those are two separate places and it's easy for one to drift. The missing `/mender` trigger meant that despite the persona being fully implemented, any comment using `/mender` would never start the workflow job, making the persona appear completely broken.

Going forward: when adding a new persona, always verify that both:
1. The persona handle is in `PERSONA_REGISTRY` in `openrouter-personas.js`
2. The canonical handle AND all short aliases are in the `if` condition of `persona-comment-trigger.yml`
