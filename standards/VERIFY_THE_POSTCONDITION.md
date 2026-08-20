# RVS-VERIFY-001: Verify the Postcondition, Don't Trust the Marker

**Standard ID:** `RVS-VERIFY-001`
**Status:** Active
**Author:** revvel governance agent (claude-code) · **Added:** 2026-08-20
**Applies to:** All agents and humans operating on Revvel repositories.

> This standard is **additive**. It sharpens CLAUDE.md gotcha #6 ("exit codes
> must reflect true resolution state") into a general rule, and gives the
> recurring defect a name so it can be caught by inspection.

---

## 1. The rule

**A marker is a claim. If nothing checks the claim, the marker is decoration.**

Before writing or trusting any signal that something happened — a label, an
exit code, a `Closes #N`, a comment, a count, a name in a config file — ask:

> **What would fail if this were false?**

If the answer is "nothing," you do not have a control. You have a decoration
that reads like a control, which is worse than having neither: it stops people
looking.

---

## 2. Why this one is dangerous

Ordinary bugs announce themselves. This one is silent **by construction**,
because the marker is what people check instead of the state.

Three properties make it compound:

1. **It reads as evidence.** `issue:done`, a green check, `Fixes #N` — each
   looks like proof to a human scanning quickly and to an agent parsing.
2. **It survives review.** There is nothing wrong with the line. The defect is
   the *absence* of a second line elsewhere.
3. **It can seal itself.** A marker that blocks the work that would clear it
   creates a state nothing can leave. See §4, instance 1.

---

## 3. The two halves

Every instance has a **producer** that writes the marker and a **consumer**
that trusts it. Fixing one half is not enough:

- Fix only the consumer → the marker keeps being written falsely, and the next
  consumer inherits the trap.
- Fix only the producer → existing false markers stay, and whatever they
  stranded stays stranded.

**Fix both, and repair the residue.** If the consumer can detect a
contradiction (an `issue:done` label on an *open* issue), it should repair it
rather than obey it — that way old damage heals instead of accumulating.

---

## 4. Observed instances

All found in a single day, 2026-08-20, in this repository.

| # | Marker | Asserted | Verified by | Fixed in |
|---|---|---|---|---|
| 1 | `issue:done` label | issue delivered | nothing | #17791 |
| 2 | `Fixes #16438` on a **zero-file** PR | WR built | nothing | #17792 |
| 3 | `Closes #N` on a doc-only PR | issue resolved | nothing | #17766, #17752 |
| 4 | `.flake8ignore` file | paths excluded | read by nothing | earlier |
| 5 | `exit 0` from a gate that never ran | postcondition holds | nothing | #17767 |
| 6 | `MAX_RATCHET_ENTRIES = 12` | coverage unchanged | a count, not names | #17782 |
| 7 | Four test assertions on `inferOutputTypeFromTitle` | routing works | a name in dead code | #17793 |
| 8 | A comment claiming `#123` parses | input handled | nothing — the test used `77abc` | #17797 |

Three deserve reading in full.

### 4.1 The self-sealing marker (#17750 → #17791)

`issue-lifecycle.yml` applied `issue:done` whenever a merged PR body matched
`Closes #N`, without confirming the issue closed. `wr-pr-creation.yml` refused
to open a WR PR for any issue carrying `issue:done`, without confirming
anything was delivered.

One spurious `Closes #N` therefore put an **open, undelivered** issue into a
state the fleet could never act on again — and nothing could clear the label,
because the only code that removes it runs when a PR linking the issue is
opened, and the label is precisely what prevented that.

Alive, unfinished, unreachable. **The issue describing this defect was then
closed by this defect**, while its own fix PR was still open.

### 4.2 The empty diff (#17058 → #17792)

A PR titled `[WIP] Build a production-grade orchestration engine` merged with
**zero changed files**, all eight checklist boxes unchecked.

> An empty diff is the easiest thing in the repository to get green. No code to
> fail a test, no file to fail a lint, no line to fail a scan.

Every quality gate passed unanimously on a PR that did nothing. "Checks
passing" was being read as evidence of delivery when it is **compatible with
total non-delivery**.

### 4.3 The workflow that had never run (#17783 → #17793)

`openrouter-auto-route.yml` contained nine concatenated versions of the same
routing decision — `outputType` declared ten times — and did not parse.
Successive agents each appended a new version without removing the previous
one.

> Because the file never executed, nothing ever contradicted them. **A workflow
> that cannot start cannot disagree with you.**

Four test assertions were pinned to identifiers that existed *only* in the dead
strata. All green, for the entire life of the defect.

---

## 5. How to comply

### 5.1 Writing a marker

- Establish the state **first**, then write the marker. Never the reverse.
- If you cannot confirm the state, **do not write the marker**. A missing
  marker is recoverable; a false one is not.
- Prefer deriving the signal over storing it. A stored `issue:done` can drift
  from `issue.state`; reading `issue.state` cannot.

### 5.2 Trusting a marker

- Decide on the **state**, not the marker, when the state is available.
- When a marker contradicts the state, treat the marker as damage and repair
  it — do not obey it.

### 5.3 Writing the guard

A guard for this defect is itself easy to write as a decoration. Four rules,
each learned by a guard that failed its own mutation test:

1. **Name, don't count.** `MAX_RATCHET_ENTRIES = 12` passes when one excluded
   file is swapped for another. A frozen list of twelve basenames does not.
2. **Assert behaviour, not presence.** A string in a comment satisfies
   `src.includes('...')`. Locate the real call site, or execute the code.
3. **Strip comments before asserting on source.** Otherwise prose *describing*
   the defect satisfies a check *for* the defect — and forbidding the
   explanation is not the fix.
4. **Mutation-test the guard.** Re-introduce the exact defect and confirm the
   guard fails. A guard that has never failed has never been shown to work.

### 5.4 Scoping the guard

Where a defect has several call sites, assert the invariant **repo-wide** so a
new site cannot be added unguarded — and **bound each site by the previous
one**. "Is there a guard anywhere before this?" passes when one of five guards
in a file is deleted, because an earlier one still precedes the later call.

---

## 6. Ratchets

When a defect cannot be fixed everywhere at once, record the remainder as a
**ratchet**: a frozen list of names, never a count.

- It may only shrink, and only by name.
- Fixing an entry means deleting its name **in the same commit**.
- A test must assert that a listed item is still broken, so a name left behind
  after its fix fails the suite instead of quietly re-authorising that path.
- **Adding a name is not a fix.** Say so in the list.

Examples: `tests/github-script-syntax.test.js` (now empty — all 227 workflows
parse), `tests/actions-lint-workflow.test.js`, `.github/workflows/no-root-junk.yml`.

---

## 7. Relationship to other standards

| Standard | Boundary |
|---|---|
| `GREEN_MAIN_STANDARD.md` | Requires a regression test per fix. This standard says what makes such a test real rather than decorative. |
| `DELIVERY_MATRIX.md` | Close only on confirmed delivery. §4.1–4.2 are what happens when "confirmed" is a marker nobody checked. |
| `PRESERVE_GOALS_AND_HISTORY.md` | Forbids closing an undelivered goal. A false completion marker is the usual way that happens by accident. |
| `COMMENT-DONT-DELETE.md` | Governs removal. Unrelated, except that both exist because an agent's own assertion is not evidence. |
| `AUDIT_AND_SELF_HEALING_PLAYBOOK.md` | Pattern #6 in its catalog is the narrow exit-code case; this standard is the general form. |

---

## 8. One-line summary for the agent loop

> **Assert the postcondition. A marker nobody checks is decoration, and
> decoration that looks like a control is worse than nothing.**
