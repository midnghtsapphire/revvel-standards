# Provenance Session Log — observable resource trail

<!-- USAGE NOTE:
  - This file records the OBSERVABLE provenance of review/analysis sessions: which
    tool produced which claim, and the source citation for it.
  - It does NOT and CANNOT contain any agent's hidden internal reasoning
    ("thinking"). Model providers (OpenAI, Anthropic, Google, etc.) do not expose
    the raw chain-of-thought as a retrievable artifact. Anything claiming to be a
    complete "AI thinking dump" is a reconstruction/guess, not extracted truth.
  - What IS capturable — and is captured here — is: question asked → tool called →
    raw result → verified claim with a `path:line` citation. That is the honest
    "where did this come from" record.
  - Naming follows `docs/PROVENANCE_STANDARD.md` — name the source every time.
  - Append-only. Newest session at the bottom.
-->

**Naming standard:** [`docs/PROVENANCE_STANDARD.md`](PROVENANCE_STANDARD.md)
**Related:** [`THINKING_SCRATCHPAD.md`](../THINKING_SCRATCHPAD.md) · [`learnings.md`](../learnings.md)

---

## What this log can and cannot contain

| Capturable (recorded here) | NOT capturable (do not fabricate) |
| --- | --- |
| The question/claim under review | The model's hidden chain-of-thought |
| Which tool answered (DeepWiki, file read, grep) | Other agents' internal reasoning traces |
| The raw tool result / source | "Every resource the AI silently consulted" |
| The verified conclusion + `path:line` citation | Provider-internal retrieval steps |

---

## [Sessions Begin Below — newest at the bottom]

---

### Session: PR #14772 review (`codex/fix-blocking-again` → `main`)

**When:** 2026-06-28
**Reviewer:** Devin Review code-review assistant (Cognition) — this tool, scoped to the PR.
**Head SHA reviewed:** `d624038a7f44e52cc767b8c297e4df4339eed7cd`

| # | Claim under review | Tool / source used | Verified result + citation |
| --- | --- | --- | --- |
| 1 | Are the workflow/JSON/test files syntactically valid at head? | Direct file read (`read_file` at head SHA) | Valid. `.github/workflows/deep-search-research.yml:52-61` has one `run:` per step; `config/model-lookup.json:45-58` has no dup keys; `tests/openrouter-triage.test.js:144-145` closes cleanly. |
| 2 | Does the `deep_search` routing profile exist? | Direct file read of `scripts/openrouter-routing.js` | YES — built from JSON at `scripts/openrouter-routing.js:40-51`, hardcoded fallback at `scripts/openrouter-routing.js:54-87`. (Corrected an earlier DeepWiki result that wrongly said it was missing — tool was stale-by-index.) |
| 3 | Is there image-upload code to fix for #14771? | DeepWiki query | NO image-upload handler in repo; closest is a Work Request spec `wr/issues/issue-14081-create-a-new-asset-artifact-process-for-merchandis.md:92-94`. #14771 reads as external GitHub UI/infra error. |
| 4 | Is there a logging / self-healing system? | DeepWiki query | YES — `learnings.md:1-15`, Ralph Loop `.github/workflows/ralph-loop.yml:62-90`, self-healing `.github/workflows/self-healing.yml:170-200`. No "VEINS"/"emobank" exist. |
| 5 | Is there a Controller over all orchestrators? | DeepWiki query | NO — oAudrey/OpenRouter are peer personas `scripts/openrouter-personas.js:60-101`; GOAP unimplemented `docs/AUTOMATION_AUDIT.md:168`; Controller is only a proposal `wr/issues/issue-13741-review-google-ax-as-a-controller.md:67-75`. |
| 6 | How is Octopus integrated; who can make WRs; what is `/dragnet`? | DeepWiki query + snippets | Octopus on-demand/auto via `.github/workflows/octopus-cli.yml:8-12`; route-only (no code write) `.github/workflows/octopus-route.yml:49-51`. WRs creatable by humans (`docs/operating-model.md:40-48`) AND bots (DRAGNET `scripts/persona-comment-runner.js:386-417`). `/dragnet` is a persona `scripts/openrouter-personas.js:149-172`. |

**Honest meta-note for this session:** one DeepWiki result (claim #2) was stale and produced a confident-but-wrong conclusion that was corrected only by a direct file read. Treat tool confidence as a prompt to re-verify at the current SHA, not as truth.

**Tools used this session (named per `docs/PROVENANCE_STANDARD.md`):**
- DeepWiki (Devin / Cognition) via the review chat's `ask_deepwiki` tool — codebase Q&A over an indexed snapshot (can lag the head SHA).
- Direct file read (Devin / Cognition) via the review chat's `read_file` tool — reads a file at an exact commit SHA (ground truth).
- Grep search (Devin / Cognition) via the review chat's `grep_search` tool — regex over repo + PR diff.
