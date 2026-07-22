# WR System — Novice Playbook

> **Who is this for?** Anyone new to the revvel-standards Work Request (WR) system who
> wants to get something built, researched, or shipped without knowing every automation
> detail. You do not need to be a developer.

---

## 1. The 30-Second Version

1. Create a GitHub issue with `[WR]` at the start of the title.
2. Fill in what you want in the body (plain English is fine).
3. Wait — automation researches, builds, and opens a PR.
4. Approve the PR when it looks right.
5. Automation merges it.

That's it for most requests. The rest of this playbook explains what happens in each
step, what to do when something stalls, and the manual escape hatches.

---

## 2. What Is a WR

A **Work Request (WR)** is a GitHub Issue that asks the automated product pipeline to
research, scope, and deliver something — code, a report, a product page, a doc, or a
combination.

Every WR is evaluated against the **Prime Directive:**

> **$10k/month → $10M in 3 years**

If your WR doesn't serve Polar.sh, OSINT tooling, or the automated product pipeline,
it will be reshaped or rejected by the research engine. That is by design.

---

## 3. Creating Your First WR

### 3.1 Choose a template

| Template                   | When to use                                                  |
| -------------------------- | ------------------------------------------------------------ |
| **`WR_TEMPLATE_BASIC.md`** | 95% of requests — just write a title + description           |
| **`WR_TEMPLATE_FULL.md`**  | You have strict requirements, deadlines, or compliance needs |

Copy the right template to `wr/WR-<issue-number>.md` after the issue is created.

### 3.2 Write a good title

- Start with `[WR]`
- Be specific: `[WR] Add Polar.sh checkout to OSINT tool landing page`
- Bad: `[WR] fix things`

### 3.3 Write a good description

Answer these three questions in plain English:

1. **What problem are you solving?** — Why does this need to exist?
2. **What does done look like?** — What will you see/use when it works?
3. **Any constraints?** — Budget, deadline, existing tech, URLs to existing repos.

> **Tip:** If you're copying or refreshing an existing repo, paste the repo URL in
> the description. The research engine uses it to keep the strongest existing assets
> and choose the optimal direction.

### 3.4 Submit the issue

Once submitted, automation picks it up within 1–2 minutes and applies labels.

---

## 4. What Happens Automatically (You Don't Need to Do Anything)

```text
T+0:00  You create the [WR] issue
T+0:01  weekly-research.yml detects it, applies routing labels
T+0:02  Jules (AI researcher) is invoked
T+0:05  OpenRouter triage analyzes scope and routes
T+1:30  Jules posts research findings as a comment
T+1:31  wr-pr-creation.yml detects the findings
T+1:32  A PR is created with the WR document
T+1:33  Jules begins refining the PR content
T+2:15  First refinement pass done
T+2:20  AI review posts a summary
T+3:00  You are notified — review the PR
T+4:00  You approve
T+4:01  PR merges, issue closes, WR is complete
```

**You only need to step in at T+3:00 to review and approve.**

---

## 5. Labels You'll See (and What They Mean)

| Label             | What it means                        | What you do           |
| ----------------- | ------------------------------------ | --------------------- |
| `wr:in-progress`  | Research or PR generation running    | Wait                  |
| `wr:checking`     | Automation is verifying something    | Wait                  |
| `deep-research`   | Jules is doing research              | Wait                  |
| `wr:complete`     | WR successfully closed               | Nothing — you're done |
| `wr:check-failed` | A check step failed                  | See §7                |
| `wr-stuck`        | WR has been stuck for a while        | See §7                |
| `needs-human`     | Automation cannot fix this alone     | See §8                |
| `auto-fix`        | Ralph Loop self-healer is active     | Wait, monitor         |
| `ralph-loop`      | Ralph is attempting automated repair | Wait                  |

---

## 6. Reviewing and Approving the PR

When a PR is opened from your WR, you'll get a GitHub notification.

### What to check

- [ ] Does the PR title match what you asked for?
- [ ] Does the WR document (in `wr/issues/`) describe the right scope?
- [ ] Are the acceptance criteria something you agree with?
- [ ] Are there any obvious gaps or misunderstandings?

### How to approve

1. Open the PR on GitHub.
2. Click **"Files changed"** — review the WR document.
3. Click **"Review changes"** → **"Approve"** → **"Submit review"**.

If the PR is good but doesn't have the `auto-merge` label, add it yourself to
trigger automatic merge once all checks pass.

### How to request changes

Leave a comment on the PR describing what needs to change. Jules will see it and
refine the WR. You don't need to edit the document yourself.

---

## 7. When Things Stall — Self-Service Recovery

### 7.1 WR stuck for > 4 hours with no PR

**Cause:** Jules didn't post findings, or PR creation failed.

**Fix (manual trigger):**

```bash
gh workflow run wr-pr-creation.yml \
  --field issue_number=<YOUR-ISSUE-NUMBER> \
  --repo midnghtsapphire/revvel-standards
```

Or via the GitHub UI:

1. Go to **Actions** → **wr-pr-creation**
2. Click **"Run workflow"**
3. Enter your issue number
4. Click **"Run workflow"**

### 7.2 WR has `wr-stuck` label

The stuck-wr-detector found your issue and flagged it. Auto-recovery is running.
Wait 30 minutes. If it's still stuck, run:

```bash
gh workflow run reset-self-heal-issue.yml \
  --field issue_number=<YOUR-ISSUE-NUMBER> \
  --repo midnghtsapphire/revvel-standards
```

### 7.3 PR created but no changes pushed

The PR exists but the branch is empty or has placeholder content.

**Fix:**

1. Check the PR for error comments from Jules.
2. If Jules has no comment, trigger Jules manually via the `jules` label:
   - Go to your issue → Labels → add `jules`

### 7.4 PR has been open > 24 hours and not merged

Check the PR status:

- **Conflicts** → you need to resolve them (see Branch Update Guide: `docs/playbooks/branch-update-guide.md`).
- **Failing CI** → read the CircleCI logs. The only real gate is `ci/circleci: lint-and-test`.
- **Waiting for review** → add the `auto-merge` label if you're ready.
- **Draft** → click "Ready for review" on the PR.

---

## 8. When to Call for Human Help (`needs-human`)

If after trying the above you still can't progress, apply the label
`needs-human` to your issue. A team member will be notified.

Common reasons automation can't fix:

- Missing or expired API key (`OPENROUTER_API_KEY`, `JULES_API_KEY`).
- Branch protection misconfiguration.
- A bug in the WR template itself.
- Your request doesn't align with the Prime Directive and needs reshaping.

---

## 9. Manual Processes Quick Reference

> Full details for each process live in `docs/playbooks/wr-manual-processes.md`.

| Process                    | When to use                  | Command / Action                                                   |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Trigger PR creation        | WR done, no PR appeared      | `gh workflow run wr-pr-creation.yml --field issue_number=N`        |
| Reset stuck issue          | Issue stuck > 1h             | `gh workflow run reset-self-heal-issue.yml --field issue_number=N` |
| Force auto-reset all stuck | Many issues stuck            | `gh workflow run auto-reset-stuck-issues.yml`                      |
| Trigger Jules on issue     | Research stalled             | Add label `jules` to issue                                         |
| Trigger Jules on PR        | PR needs more refinement     | Add label `jules` to PR                                            |
| Enable auto-merge          | PR approved, want auto-merge | Add label `auto-merge` to PR                                       |
| Block merge                | Don't merge this PR          | Add label `won't-merge` to PR                                      |
| Force re-run health check  | Want fresh self-healing scan | `gh workflow run self-healing.yml`                                 |

---

## 10. Understanding the Research Engine

The research engine (Jules + OpenRouter) performs:

1. **Scope validation** — does your WR align with Phase goals?
2. **Technical analysis** — what stack, complexity, dependencies?
3. **Revenue alignment** — how does this advance $10k/mo targets?
4. **Artifact map** — what gets produced, where it lives, how it's tested.
5. **Risk assessment** — what could go wrong?

You do not need to fill in technical details. If you fill them in incorrectly,
the engine will override them. Trust the auto-fill.

> **Caveat:** The engine defaults to the Standard tech stack (Next.js, Polar.sh,
> Vercel). If you need something different, say so explicitly in the description.

---

## 11. Common Mistakes (And How to Avoid Them)

| Mistake                             | What happens                             | Fix                                                  |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Forgetting `[WR]` prefix            | Issue is treated as a standard bug       | Edit the title to add `[WR]`                         |
| Too vague a description             | Research engine guesses wrong            | Edit the issue body with more detail                 |
| Requesting non-Prime-Directive work | WR is reshaped or rejected               | Reframe around revenue impact                        |
| Editing the "Auto-filled" section   | Your edits get overwritten               | Don't edit below the auto-fill line                  |
| Approving without reading           | Scope creep or missed requirements merge | Read the WR document before approving                |
| Adding conflicting labels           | Automation loops                         | Remove conflicting labels, keep only the correct one |

---

## 12. Definitions

| Term                | Definition                                                       |
| ------------------- | ---------------------------------------------------------------- |
| **WR**              | Work Request — an issue that starts the automated pipeline       |
| **Jules**           | Google's AI coding/research agent integrated as a GitHub Action  |
| **OpenRouter**      | LLM routing layer — sends tasks to the best available model      |
| **Ralph Loop**      | Self-healing agent — attempts automated fixes for stuck issues   |
| **Main**            | The `main` branch — the stable, shipped version of the repo      |
| **PR**              | Pull Request — the code/doc change proposed by the pipeline      |
| **Artifact**        | Any deliverable: code, PDF, doc, dashboard                       |
| **Prime Directive** | $10k/mo → $10M in 3 years — the North Star all WRs are judged by |
| **Polar.sh**        | GitHub funding/product platform used for revenue                 |

---

## 13. Getting Help

- Read first: `docs/SELF_HEALING_SYSTEM.md` — how the healing loop works.
- If automation broke: `CLAUDE.md` — known gotchas and fixes.
- For branch/merge questions: `docs/playbooks/branch-update-guide.md`.
- For all manual processes with full caveats: `docs/playbooks/wr-manual-processes.md`.
- For humans: open an issue with `needs-human` label.

---

_Last updated: see git log. This file is part of the Dragnet self-healing playbook suite._
