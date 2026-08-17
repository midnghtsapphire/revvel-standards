# Waydev GitHub App — Setup & Evaluation Guide

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Under Evaluation (1-week trial)  
**Cost:** ~$20/month per contributor, billed annually (~$240/year) — verify exact rate at checkout  
**GitHub Marketplace:** <https://github.com/marketplace/waydev>  
**Waydev Dashboard:** <https://app.waydev.co>

---

## 1. What Is Waydev

Waydev is a **developer productivity analytics platform** that connects to GitHub (and GitLab, Jira, etc.) to automatically collect commit, pull-request, and code-review metadata. It produces dashboards and reports that surface:

| Metric | What It Shows |
|---|---|
| **Commit volume** | How much code is being written and merged over time |
| **PR cycle time** | How long PRs sit open before review and merge |
| **Review activity** | Who is reviewing, and how quickly |
| **Code churn** | Rewrites, rework, and instability indicators |
| **Work breakdown** | Feature vs bug fix vs refactor split |
| **Team benchmarks** | Compare activity trends across contributors |

> **Privacy note:** Waydev reads only repository *metadata* (commits, PR titles, timestamps, authors). It does **not** access source code content.

---

## 2. Where It Fits in Revvel Standards

| Revvel Standard | Waydev Role |
|---|---|
| **CODE_REVIEW_STANDARD.md** | Tracks PR review latency, cycle time; confirms Coderabbit/Venice reviews are happening regularly |
| **DEPLOYMENT_STANDARD.md** | Monitors deployment frequency (commits to `main`) |
| **CONCURRENT_DEVELOPMENT_STANDARD.md** | Detects long-lived branches and stale PRs that violate the no-force-push + fast-merge policy |
| **TESTING_STANDARD.md** | Tracks the ratio of test-related commits vs feature commits over time |
| **SECURITY_STANDARD.md** | Identifies contributors with unusually high direct-to-`main` commit rates (audit flag) |

Waydev operates as a **passive observer** — it requires no changes to workflows, no GitHub Actions steps, and no code modifications. Installing the GitHub App at the organisation level is sufficient to begin collecting data from all repositories under `midnghtsapphire`.

---

## 3. Installation (GitHub App — Organisation Level)

> Install **once** for the entire `midnghtsapphire` organisation. All repositories are covered automatically.

### Step 1 — Install the GitHub App

1. Go to: <https://github.com/marketplace/waydev>
2. Click **"Set up a plan"** → choose the **Pro** tier (~$20/month per contributor, billed annually).
3. Under **"Install it for free"** (trial) or the paid plan page, select **"midnghtsapphire"** as the account.
4. When prompted for repository access, choose **"All repositories"** (recommended) or select specific repos.
5. Click **"Install"** — GitHub will redirect you to the Waydev onboarding flow.

### Step 2 — Complete Waydev Onboarding

1. Sign in / create a Waydev account at <https://app.waydev.co> (use GitHub SSO for simplicity).
2. Authorise the Waydev app to read your GitHub data.
3. Select the repositories you want tracked. Recommended starting set:
   - `midnghtsapphire/revvel-standards`
   - `midnghtsapphire/growlingeyes`
   - `midnghtsapphire/openclaw`
   - Any other active application repos
4. Add **contributors** — these are the GitHub usernames you want tracked as active developers.
5. Wait 5–15 minutes for the initial data sync to complete.

### Step 3 — Verify the Dashboard

1. Open <https://app.waydev.co> → **Dashboard**.
2. Confirm your repositories appear and recent commits/PRs are visible.
3. Explore the **"Engineering Performance"** and **"Cycle Time"** tabs to see your team's baseline metrics.

---

## 4. What to Check During the 1-Week Evaluation

Use this checklist to decide whether to keep Waydev after the trial:

- [ ] Data from all active repos synced successfully
- [ ] PR cycle time visible for the past 30 days
- [ ] Code churn / rework percentage surfaced (flag if > 30%)
- [ ] Commit frequency trends match expected sprint cadence
- [ ] Deployment frequency (commits to `main`) aligns with release logs
- [ ] No unexpected repository permissions warnings in GitHub Settings → Applications
- [ ] Dashboard is useful enough to warrant the subscription cost

---

## 5. Pricing Summary

| Plan | Price | Contributors | Repos | History |
|---|---|---|---|---|
| **Pro** | ~$20/month per contributor (billed annually, ~$240/year) | Up to team size | Up to 50 | 6 months |
| **Premium** | ~$54/month per contributor (billed annually, ~$648/year) | Up to team size | Up to 300 | 36 months |

For a solo developer / small team, the **Pro annual** plan is the right choice. The issue referenced "~$20/year" — verify the exact checkout price before purchasing, as GitHub Marketplace promotional rates can differ from the standard rate.

---

## 6. Removing Waydev (If Evaluation Fails)

If Waydev is not retained after the trial:

1. Go to **GitHub → Settings → Applications → Installed GitHub Apps**.
2. Find **Waydev** and click **"Configure"**.
3. Scroll down and click **"Uninstall"**.
4. Log in to <https://app.waydev.co> → **Settings → Billing** → cancel the subscription (if one was started).

No code changes are required — Waydev has no footprint in the repositories themselves.

---

## 7. Integration With Existing Revvel Tooling

Waydev complements (not replaces) existing tools:

| Tool | Role | Overlap With Waydev |
|---|---|---|
| **RecurseML** (`.github/workflows/recurse-ml.yml`) | Automated code quality review on PRs | RecurseML reviews *code*; Waydev tracks *process metrics* — no overlap |
| **Coderabbit** | Line-by-line PR review comments | Same split — content vs process |
| **DeployBot** | Deployment event tracking | Waydev's deployment frequency view complements DeployBot |
| **GitHub Projects** | Sprint board / issue tracking | Waydev's cycle time metrics validate whether sprint estimates are accurate |

---

## 8. Optional: Jira / Linear Integration

If the project later adopts Jira or Linear for issue tracking, Waydev supports direct integration:

1. In Waydev dashboard → **Integrations** → select Jira / Linear.
2. Authorise the connection.
3. Waydev will correlate commit/PR data with issue keys, showing end-to-end delivery time from ticket-open to production deploy.

---

*For questions, contact the Revvel platform team or open an issue tagged `bom-purchase` in `midnghtsapphire/revvel-standards`.*
