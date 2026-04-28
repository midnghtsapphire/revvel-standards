# The One Issue Template

**Audrey's standing rule:** every MIDNGHTSAPPHIRE repository uses exactly
**one** user-facing issue template — and every issue filed through it gets
deep-researched before any code is written. Bugs, features, questions,
refactors, docs — all routed through the same intake form, the same `jules`
label, and the same `jules-invoke.yml` workflow.

This directory is the **canonical, portable copy** of that template. Drop
it into any new (or existing) MIDNGHTSAPPHIRE repo to bring it onto the
standard.

Tracked by issue: _"ONE TEMPLATE ALL DEEP RESEARCH"_ in
`midnghtsapphire/revvel-standards`.

---

## Files

| File         | Where it goes in your app repo                |
|--------------|-----------------------------------------------|
| `issue.yml`  | `.github/ISSUE_TEMPLATE/issue.yml`            |
| `config.yml` | `.github/ISSUE_TEMPLATE/config.yml`           |

---

## Install in a new repo

```bash
# from the root of the target repo
mkdir -p .github/ISSUE_TEMPLATE
cp ../revvel-standards/templates/issue-template/issue.yml   .github/ISSUE_TEMPLATE/issue.yml
cp ../revvel-standards/templates/issue-template/config.yml  .github/ISSUE_TEMPLATE/config.yml
git add .github/ISSUE_TEMPLATE
git commit -m "chore(issues): adopt the One Template (deep-research by default)"
```

If the target repo already has `bug-report.yml`, `deep-research.yml`, or
similar split user-facing templates, **delete them** when adopting this
one — that's the whole point. Keep operational/cron templates
(`daily-decision.md`, `exit-quiet-mode.md`, `urgent-compliance.md`, etc.)
untouched; they are not user entry points.

---

## What the template does

1. **Single intake.** No more "do I file a bug or a research request?". One
   form, one path.
2. **Task type is informational only.** The dropdown captures whether the
   task is a bug, feature, research, etc. for human readers — it does
   **not** change routing.
3. **Every issue is labelled `jules` on creation.** That label triggers
   [`jules-invoke.yml`](https://github.com/midnghtsapphire/revvel-standards/blob/main/.github/workflows/jules-invoke.yml),
   which calls Google Jules to do the deep-research pass and rewrite the
   request into a system-design-quality spec before any code is written.
4. **`triage` + `triage:new` keep it visible.** The triage workflow can
   still see and prioritise the issue while Jules is researching.
5. **Eisenhower-friendly.** A severity dropdown is included so the
   Eisenhower Priority Labeler can assign P0–P3 if installed.

---

## Required labels in the target repo

The template applies `jules`, `triage`, and `triage:new`. These labels are
defined in the canonical
[`labels.yml`](https://github.com/midnghtsapphire/revvel-standards/blob/main/.github/labels.yml)
and are synced into every repo by `sync-labels.yml`. If you are adopting
this template in a repo that does not yet sync labels, also adopt
`templates/cicd/sync-labels.yml` (or the equivalent already in
`templates/github-workflows/`) so the labels actually exist when issues
are filed.

---

## Required workflow in the target repo

For deep-research routing to actually fire, the target repo needs an
equivalent of `.github/workflows/jules-invoke.yml` that listens for the
`jules` label on `issues: opened, reopened` and calls
`BeksOmega/jules-action`. The canonical version lives in
`midnghtsapphire/revvel-standards/.github/workflows/jules-invoke.yml`;
copy it (and the `JULES_API_KEY` secret reference) when adopting this
template.

---

## Keeping the two copies in sync

`templates/issue-template/issue.yml` and
`.github/ISSUE_TEMPLATE/issue.yml` in `revvel-standards` must stay
identical. Same for the two `config.yml` copies. If you change one,
change the other in the same PR.

Until a CI drift check exists, verify manually before committing:

```bash
diff .github/ISSUE_TEMPLATE/issue.yml  templates/issue-template/issue.yml
diff .github/ISSUE_TEMPLATE/config.yml templates/issue-template/config.yml
```

Both `diff` calls must produce no output. A follow-up issue may add a CI
check that runs these `diff`s and fails the PR if they drift.
