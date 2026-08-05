# Issue Templates (canonical, portable copies)

MIDNGHTSAPPHIRE repositories use **two** issue templates that both feed the
same Work Request pipeline:

1. **`00-work-request.yml`** — the **primary, anti-under-scoping form**. Output
   Type is the only required field. The scope/routing sections (Research Mode,
   Delivery Mode, Lifecycle Mode, Commercial Mode, Summary, Objective, Required
   Bundle, Definition of Done, Do Not Under-Scope, Delivery Shape, Blocker
   Rule) remain available but optional so research can backfill details.
2. **`10-OpenHands-system-wr.yml`** — the **lightweight system form**. Output Type
   is the only required field; every other routing dropdown defaults to
   `auto-classify` and is filled in by the [auto-classifier workflow](../../.github/workflows/wr-auto-classify.yml).
   Use this for low-risk, internal, or agent-driven work.

Both templates apply the `work-request` and `weekly-research` labels so the
auto-classifier and downstream automation (`wr-pr-creation.yml`,
`jules-invoke.yml`, the Project v2 board sync) treat them identically. Both
use the `[WR]` title prefix, and WR workflows also accept the BASIC WR issue
type if GitHub issue-type selection arrives before labels are present.

This directory is the **canonical, portable copy** of both templates. Drop
them into any new (or existing) MIDNGHTSAPPHIRE repo to bring it onto the
standard.

Tracked by issue: _"ONE TEMPLATE ALL DEEP RESEARCH"_ in
`midnghtsapphire/revvel-standards`.

---

## Files

| File                          | Where it goes in your app repo                                |
|-------------------------------|---------------------------------------------------------------|
| `00-work-request.yml`         | `.github/ISSUE_TEMPLATE/00-work-request.yml`                  |
| `10-OpenHands-system-wr.yml`      | `.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml`               |
| `config.yml`                  | `.github/ISSUE_TEMPLATE/config.yml`                           |

Filename prefixes (`00-`, `10-`) force the chooser ordering ([per the
docs][gh-template-order] — `.yml` before `.md`, alpha within each group):
the heavy primary form sorts first, the lightweight system form sorts second.
Without numeric prefixes, alphabetical ordering can scatter the templates
behind unrelated `.yml` forms.

[gh-template-order]: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository

---

## Install in a new repo

```bash
# from the root of the target repo
mkdir -p .github/ISSUE_TEMPLATE
cp ../revvel-standards/templates/issue-template/00-work-request.yml      .github/ISSUE_TEMPLATE/00-work-request.yml
cp ../revvel-standards/templates/issue-template/10-OpenHands-system-wr.yml   .github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml
cp ../revvel-standards/templates/issue-template/config.yml               .github/ISSUE_TEMPLATE/config.yml
git add .github/ISSUE_TEMPLATE
git commit -m "chore(issues): adopt the canonical WR templates (heavy + lightweight)"
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

For each template, `templates/issue-template/<name>.yml` and
`.github/ISSUE_TEMPLATE/<name>.yml` in `revvel-standards` must stay identical.
Same for the `config.yml` pair. If you change one, change the other in the
same PR.

Verify manually before committing:

```bash
diff .github/ISSUE_TEMPLATE/00-work-request.yml      templates/issue-template/00-work-request.yml
diff .github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml   templates/issue-template/10-OpenHands-system-wr.yml
diff .github/ISSUE_TEMPLATE/config.yml               templates/issue-template/config.yml
```

All three `diff` calls must produce no output.

**Automation:** The `.github/workflows/template-sync-check.yml` workflow
automatically verifies that both copies stay in sync on every PR or push
that touches these files. If they drift, the workflow will fail and show
the differences.

---

## Troubleshooting

### "The scope checkboxes aren't pre-filled when I create an issue

**This is almost certainly a GitHub template cache issue.** The template IS
configured to auto-fill the "Scope for the deep-research pass" section with
pre-checked checkboxes.

**Solutions:**

1. **Hard-refresh the new-issue page:**
   - Windows/Linux: `Ctrl+Shift+R` or `Ctrl+F5`
   - Mac: `Cmd+Shift+R` or `Cmd+Option+R`

2. **Clear GitHub cookies/cache** for `github.com` in your browser settings

3. **Wait 5-10 minutes** — GitHub's CDN can take time to propagate template
   changes to all edge nodes

4. **Try incognito/private mode** to rule out local caching

5. **Verify on another browser** to confirm it's not browser-specific

If none of these work, check:
- Is the template actually at `.github/ISSUE_TEMPLATE/issue.yml` in the repo?
- Does it have a `value:` attribute with the markdown checklist? Look for the
  `id: scope` section (starts at line 116, checklist is lines 124–131).
- Run `git log .github/ISSUE_TEMPLATE/issue.yml` — when was it last
  updated? Template changes committed recently might still be propagating.

### "The template works in revvel-standards but not in my other repo

You need to **copy the template files** into that repo. See the "Install in
a new repo" section above. The template lives in two places:

- `.github/ISSUE_TEMPLATE/issue.yml` — active in **revvel-standards**
- `templates/issue-template/issue.yml` — portable copy to **install elsewhere**

Each repo needs its own copy of the template in its own
`.github/ISSUE_TEMPLATE/` directory.
