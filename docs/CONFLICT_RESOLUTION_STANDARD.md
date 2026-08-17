# Conflict Resolution Standard — don't make the owner pick "current / incoming / both

The owner kept hitting merge conflicts where they didn't know whether to take
the current change, the incoming change, or both. For mechanical cases that
question shouldn't reach a human at all. This standard is the rule + the
free-tier auto-resolver + the LLM hand-off for genuinely ambiguous cases.

> Cross-refs:
> `docs/THIRD_PARTY_ACTION_AUDIT.md` (version-pinning rules informing the
> "newer ref wins" call) ·
> `docs/DOCS_FRESHNESS_STANDARD.md` (the rest of the docs/code drift loop) ·
> `.github/workflows/conflict-helper.yml` (the runner) ·
> `scripts/auto-resolve-mechanical-conflicts.js` (the deterministic engine).

---

## 1. The three lanes

Every PR with conflicts gets routed through this ladder. Cheapest first.

| Lane | What handles it | Cost | Patterns |
| --- | --- | --- | --- |
| **Mechanical** | `scripts/auto-resolve-mechanical-conflicts.js` (deterministic, free) | **Free** — runs in GH Actions on every PR with conflicts | Version bumps in `uses:` lines, additive table rows / list items |
| **Semantic** | Jules via `jules-coding-agent.yml` | Already covered by the Jules API key — **no per-PR add-on** | Value swaps, function-signature changes, prose edits in the same paragraph |
| **Human** | The owner | Time | Anything Jules also can't decide (label `conflicts:needs-human` if Jules surrenders) |

Explicitly **not** used:

- **Copilot** — per-PR cost adds up on a high-PR-volume repo.
- **Bito** — review-only; can't push commits to a branch, so it can't resolve.
- **openrouter-triage** — that lane is the Ralph Loop CI-fixer; mixing concerns muddies the audit trail.

## 2. The mechanical patterns (auto-resolved every time)

### 2a. Version bump

A conflict hunk where both sides are exactly one line and both match
`uses: <owner>/<repo>@<ref>` with the same `owner/repo`. The newer ref wins.

Ranking (high to low):

1. **40-char commit SHA** — immutable, can't be re-tagged → always wins over a tag.
2. **Higher semver** (`v8.1.1` > `v7.0.0` > `v6.10.2`).
3. **Same SHA / same semver** — ambiguous, leave for Jules.

This implements the `peter-evans/create-pull-request@SHA # v8.1.1` vs
`peter-evans/create-pull-request@v7` case the owner reported on the
`jules-affiliate-engine` branch: SHA-pinned newer version wins, indent
preserved, trailing comment retained.

### 2b. Additive structural lines

A conflict hunk where every non-blank line on both sides matches a
recognizable additive shape:

- Markdown table row: `|` … `|`
- Markdown table separator: `| --- | --- |`
- Markdown bullet: `-` / `*` / `+` followed by content
- Markdown numbered: `1.` etc.

And no single line appears on both sides (no duplicate row). When the
test passes, current + incoming are concatenated in that order so the
diff baseline is preserved.

**Conservative on purpose**: arbitrary one-liners that just *happen* to
not overlap (`foo = "a"` vs `foo = "b"`) do NOT match this pattern.
They're value swaps and only Jules / a human should resolve them.

## 3. The semantic lane (Jules)

When the script returns `exit_code: 2`, the workflow:

1. Aborts the in-progress merge so the worktree is clean.
2. Applies label `conflicts:needs-jules` to the PR.
3. Dispatches `jules-coding-agent.yml` with `pr_number=N`.

Jules sees the PR, reads the conflicting hunks, and pushes a resolution
commit. The `jules:review` status records its work for audit.

Jules is the right tool here because:

- It's already a coding agent (pushes commits, not just comments).
- The API key is already paid — no per-PR add-on cost.
- Its track record on the repo (the BeksOmega lane) shows it handles
  small-scope code edits well.

If Jules also can't decide (rare — usually means architecturally
significant), the owner takes over.

## 4. The audit trail

Every auto-resolution commit uses a fixed message format:

```text
chore: auto-resolve mechanical merge conflicts (version bumps + additive blocks)

Resolved by scripts/auto-resolve-mechanical-conflicts.js per docs/CONFLICT_RESOLUTION_STANDARD.md.
Safe patterns only — see commit diff for the rules each hunk matched.
```

That makes every auto-resolution discoverable via `git log --grep` and the
PR comment trail shows which hunks ran which rule.

## 5. Originating case + the gap it closes

| Date | PR | Conflict | Old path | New path |
| --- | --- | --- | --- | --- |
| 2026-05-29 | `jules-affiliate-engine-…` (TikTok affiliate engine branch) | `uses: peter-evans/create-pull-request@v7` vs `@SHA # v8.1.1` | Owner had to manually pick "incoming" in the web UI for every PR that hit this | Auto-resolved by the script the next time the workflow runs |
| 2026-05-29 | (general) | "I never know if I need both" | One-by-one human decision | Script handles two safe cases; Jules handles the rest; human only sees architecturally significant ambiguities |

## 6. When to extend the rules

When a new mechanical pattern emerges (the same conflict shape across
multiple PRs), add it to `tryXxx` in
`scripts/auto-resolve-mechanical-conflicts.js`. Keep the rules:

- Deterministic — same input always same output.
- Conservative — false negatives (leave for Jules) are fine; false
  positives (silently pick wrong side) are not.
- Tested — add a row to the in-script test harness.

## 7. Disabling for a specific PR

If you want a PR's conflicts handled entirely by hand (you're rewriting
the history anyway), add `conflicts:hands-off` to the PR. The
conflict-helper job skips the resolve + Jules-dispatch steps and only
posts the annotation comment from Phase 1.

---

## Quick reference

| Phase | When it fires | What it does |
| --- | --- | --- |
| **Phase 1: Annotate** | Always when `mergeable_state: dirty` | Posts a sticky comment naming current vs incoming with PR provenance |
| **Phase 2: Mechanical** | After Phase 1 | Runs the script; resolves version bumps + additive blocks; pushes a single audit-trail commit |
| **Phase 3: Jules** | If Phase 2 left anything ambiguous | Applies `conflicts:needs-jules` and dispatches `jules-coding-agent.yml` with `issue_number=<PR number>` (Jules' declared input name — PRs and issues share GitHub's number space) |
| **Phase 4: Human** | If Phase 3 surrenders (`conflicts:needs-human`) | The owner takes over |

## 8. Manual trigger — `/resolve-conflicts`

Post a comment containing `/resolve-conflicts` (or the short alias `/resolve`)
on any PR with conflicts to kick the workflow immediately without waiting for
a new commit or label change. Gated to `OWNER`, `MEMBER`, or `COLLABORATOR` so
random commenters cannot dispatch the workflow.

Useful when:

- A previous run failed and you want to retry after fixing a dependency
- You want to force a fresh run after main advanced
- Jules was down before but is now available

## 9. Outcome labels — filter your PR list without opening each one

After every run, the workflow applies exactly one of these labels so the PR
list becomes filterable:

| Label | Meaning | Your action |
| --- | --- | --- |
| `conflicts:auto-resolved` | Phase 2 fixed everything and pushed a commit | Wait for CI, then merge |
| `conflicts:needs-jules` | Phase 2 handed leftovers to Jules and dispatch succeeded | Wait for Jules to push |
| `conflicts:needs-human` | Everything else — script errored, or Jules dispatch failed, or Jules already tried and quit | You resolve manually |

Bookmark this URL for a one-click "PRs I need to touch" view:

```text
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 10. What the sticky comment tells you

At the top of the sticky comment is a **Conflict Helper — outcome** block
with three lines:

1. **Emoji + one-line headline** — ✅ auto-resolved, 🟡 handed to Jules, 🔴 needs you
2. **Your job** — exactly what you should do next
3. **Phase details** (collapsed by default) — exit codes, dispatch state,
   phase decision. Only unfold if something looks wrong.

Below that is the original Phase-1 provenance table — who introduced each
side of each conflict — for the cases where you still want to inspect.

## 11. When the sticky comment says the PR needs a human

The workflow surrenders. You have three choices:

1. **Fix it locally in GitHub's web UI** — click the "Resolve conflicts"
   button, edit each hunk, mark resolved, commit. This is the "brute force"
   answer that always works.
2. **Rebase-then-force-push** — if you have a git client handy, `git rebase
   origin/main`, resolve the few hunks Jules couldn't, force-push. Cleaner
   history, but requires CLI.
3. **Retry Jules** — if the dispatch failed for a fixable reason (secret was
   missing, workflow file broke, rate limit), fix the root cause and comment
   `/resolve-conflicts` to try again.
