# WR: [WR] docs: add "for illustration only" caveat above OpenRouter-key example in AGENT_AUTONOMY_PROTOCOLS.md (Octopus audit item #5)

**Issue:** #13987  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-28  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Executive Summary

This WR addresses an issue found during an Octopus audit (finding #5 in #13978) regarding the potential leakage of the `OPENROUTER_API_KEY`. Documentation files contained code examples reading `process.env.OPENROUTER_API_KEY` directly. A caveat banner has been added above these code blocks to warn developers against pasting them directly into CI workflows where the key could leak in logs.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property         | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Repository       | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created          | 2026-05-28                                                                              |
| Last Updated     | 2026-05-28                                                                              |
| Primary Language | JavaScript                                                                              |

### Current Status

- **Active Development:** Yes

### Key Technologies

- **Frontend:** N/A
- **Backend:** N/A
- **Database:** N/A
- **Deployment:** GitHub Actions

---

## Step 4: Redevelopment & Redesign

### Fix All Errors

#### Audit Findings

**Octopus Review** (octopus-review-bot) via the GitHub App, 2026-05-28 — finding #5 in the deferred set tracked in #13978.

#### What to fix

`docs/AGENT_AUTONOMY_PROTOCOLS.md` contains an example that reads `process.env.OPENROUTER_API_KEY` directly. If an agent (or a docs reader) literally pastes that example into a workflow where stdout/stderr is logged, the key can leak.

#### Acceptance criteria

- Add a clearly-formatted **caveat banner immediately above** the example code block, of the form:
  > **For illustration only.** Do **not** paste this example into a CI workflow where stdout/stderr is logged. Always call OpenRouter via `scripts/openrouter-routing.js` (or another wrapper) so the key never appears in user-controlled contexts. — Octopus audit 2026-05-28
- If the same anti-pattern appears in any other `docs/*` file, add the same banner there too.
- No code logic changes — pure docs.
- Closes part of #13978.

#### Implementation Steps

1. Search `docs/*` for `process.env.OPENROUTER_API_KEY`
2. Add caveat banner to `docs/AGENT_AUTONOMY_PROTOCOLS.md`
3. Add caveat banner to `docs/49AGENTS_EVALUATION.md`
4. Add caveat banner to `docs/OPENROUTER_API_KEY_VERIFICATION_STANDARD.md`

#### Provenance

Per `docs/PROVENANCE_STANDARD.md`, the resulting PR description must cite: **Octopus Review (octopus-review-bot) via the GitHub App, 2026-05-28**, and reference #13978.

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0
**Ship-to-Market Ready:** Yes
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-28
**Next Review:** After implementation
