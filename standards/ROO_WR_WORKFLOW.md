# ROO WR WORKFLOW — coding Work Requests with Roo-Code

**Status:** active standard
**Tool:** Roo-Code fork at `midnghtsapphire/Roo-Code` (vendored from RooVetGit/Roo-Code; renovate stays ON — the fork is a working tool, not a snapshot)

## Purpose

Open WRs (issues titled `WR #…` across the fleet) are the work queue. Roo-Code is one of the sanctioned agents that can claim and code them. This standard defines how Roo picks up a WR and how its output lands in the fleet.

## Setup

1. Install Roo-Code (VS Code extension) — upstream marketplace build is fine; the fork exists so a custom build survives upstream changes.
2. Provider: OpenRouter (fleet default). Key lives in the age vault (`~/.config/revvel/secrets.age`), never in git. Model routing per `config/secret-map.json`.
3. Open the target repo locally (clone with `git -c http.version=HTTP/1.1 clone` on flaky networks).

## Claiming a WR

1. Pick an open, unassigned WR. Comment `Claiming — Roo` on the issue and self-assign before writing code. The "assigned AND done before merge" gate applies.
2. Generate the prompt pack with `scripts/export_wr_queue.py --issue <N>` — it writes `wr/roo-queue/WR-<N>.md` with the WR body, linked context, and the fleet conventions header.
3. Feed that file to Roo as the task prompt.

## Branch and PR conventions

- Branch: `roo/wr-<N>-<slug>` (kebab-case slug from the WR title).
- One PR per WR. PR body must link the issue (`Closes #<N>`).
- Append-only files (LEDGER.md, CHANGELOG.md, wr/memory/decisions.jsonl): append new entries at the correct end. Never rewrite existing entries.
- New behavior ships with a test when the repo has a test suite.
- Do not merge your own PR — TriageChief/owner merges. Roo's job ends at a green, non-draft PR.

## Hard rules

- No secrets in git. Ever. Endpoints and URLs are fine; tokens are not.
- Golden/spec changes in forensic repos require a Verity delta check comment on the PR before merge.
- If a WR's acceptance criteria are ambiguous, comment on the issue and stop — do not guess.
