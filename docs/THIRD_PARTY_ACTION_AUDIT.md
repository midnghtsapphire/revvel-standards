# Third-Party Action Freshness Audit — catch the next `sanjay3290` before it sticks a PR

Every `uses: <owner>/<action>@<ref>` in `.github/workflows/` is a piece of
third-party code that runs with the repo's secrets and can publish blocking
status checks. When that code is abandoned, **a single broken action can
permanently block PRs** — that's exactly what happened with
`sanjay3290/jules-pr-reviewer@v1`, an unmaintained single-author action that
left [#13916](https://github.com/midnghtsapphire/revvel-standards/pull/13916)
stuck on a `jules/review` blocking status.

This standard is the recurrence guard.

> Cross-refs:
> `docs/PROVENANCE_STANDARD.md` (name publisher + package for every tool) ·
> `docs/AGENT_MONITORING_STANDARD.md` (the agent-supervision loop) ·
> `.github/workflows/third-party-action-audit.yml` (the quarterly cron) ·
> `scripts/audit-third-party-actions.sh` (the scanner).

---

## 1. Publisher tiers

Every `uses:` reference is classified by the owner's tier. Tier determines
how strictly we audit it.

| Tier | Examples | Treatment |
| --- | --- | --- |
| **Trusted** — official publishers | `actions/*`, `github/codeql-action`, `docker/*`, `aws-actions/*`, `azure/*`, `google-github-actions/*`, `hashicorp/*` | Never flagged. Assumed maintained. |
| **Multi-author / org** — known org publisher with multiple maintainers | `cypress-io/*`, `dopplerhq/*`, `digitalocean/*`, `peter-evans/*`, `peaceiris/*`, `aquasecurity/*`, `BeksOmega/*` (Google Jules family) | Warn if no release > threshold; don't auto-flag. |
| **Single-author** — everything else | `sanjay3290/*`, `binowork/*`, `omnedia/*`, `lowlydba/*`, etc. | **Flag** if no release > threshold. Triggers a `[WR]` issue. |

The tier lists live in `scripts/audit-third-party-actions.sh` at the top
(`TRUSTED_OWNERS`, `MULTI_AUTHOR_OWNERS`, `ACCEPTED_SINGLE_AUTHOR_ACTIONS`).
Update them as the landscape shifts — e.g., when a single-author action gets
adopted by an org, move it to multi-author; when one exact `owner/repo`
remains healthy but does not justify promoting the whole owner, add that exact
action to `ACCEPTED_SINGLE_AUTHOR_ACTIONS`. **Don't delete entries, just move
them between lists** (per the comment-don't-delete convention).

## 2. Staleness threshold

**Default: 12 months since the last GitHub release.** Configurable per
audit run via the workflow's `staleness_months` input. Reasoning:

- 12 months is long enough that legitimate stability (an action that's
  "done") isn't flagged immediately.
- It's short enough that genuine abandonment (the `sanjay3290` case had no
  release for ~18 months when it stuck a PR) is caught before damage.

Adjust if needed — but document any change in `docs/UPGRADE_LOG.md` so the
audit history stays interpretable.

## 3. The loop

```text
Quarterly cron (1st of Jan/Apr/Jul/Oct)
       │
       ▼
 audit-third-party-actions.sh
   - grep `uses:` from all workflows
   - dedupe to owner/repo
   - classify by tier
   - query `gh api repos/.../releases/latest` for each
   - flag single-author + stale
       │
       ▼
 Flagged > 0 ?
   ├── no  → job succeeds, summary posted, done
   └── yes → file `[WR]` issue with labels
             `work-request, third-party-action-audit, needs-triage`
             (or comment on existing open WR — no duplicates)
             then exit 1 so the failure shows on the run history
```

The workflow is also `workflow_dispatch`-able for on-demand runs.

## 4. Per-flag disposition (acceptance criteria on every WR)

For each flagged action the WR opens, the owner / on-call agent picks one:

| Disposition | When | How |
| --- | --- | --- |
| **Pin to commit SHA** | Action is actively maintained on `main` but skipped releases | Replace `@v1` with `@<full-sha>` and open an issue upstream asking for a tag. |
| **Replace with a maintained alternative** | A trusted or multi-author equivalent exists | Open a focused PR swapping the action; cite the audit WR. |
| **Silence the auto-trigger** | Action is abandoned and no clean replacement exists yet | Comment out the `pull_request_target:` (or equivalent auto-trigger) per the comment-don't-delete convention; keep `workflow_dispatch:`; document why in the file header. (This is what #13974 did for `sanjay3290/jules-pr-reviewer@v1`.) |
| **Accept the risk** | Action is genuinely stable and "done" (rare) | Add the exact action `owner/repo` to `ACCEPTED_SINGLE_AUTHOR_ACTIONS` (or promote the owner to `MULTI_AUTHOR_OWNERS` / `TRUSTED_OWNERS` when that broader trust is justified) with a comment explaining why, and close the WR. |

Each flagged action gets one comment on the WR explaining the chosen
disposition before the WR is closed. That keeps the audit trail
auditor-ready (the enterprise-pitch angle from `AGENT_MONITORING_STANDARD.md`
§6 applies here too).

## 5. Originating case

| Item | Value |
| --- | --- |
| Action | `sanjay3290/jules-pr-reviewer@v1` |
| Tier | single-author |
| Symptom | Posted `jules/review` blocking status that never resolved → required check, PRs blocked indefinitely |
| Affected PR | [#13916](https://github.com/midnghtsapphire/revvel-standards/pull/13916) |
| Detected by | Manual review + Octopus Review audit 2026-05-28 |
| Fix landed in | [#13974](https://github.com/midnghtsapphire/revvel-standards/pull/13974) (silenced auto-trigger; `workflow_dispatch:` kept) + [#13916](https://github.com/midnghtsapphire/revvel-standards/pull/13916) (defensive skip-path posts `jules/review: success "Skipped"` when key is missing) |
| Recurrence guard | This standard |

## 6. Why the workflow fails the run instead of just opening an issue

`exit 1` on flagged-actions means:
- The audit run is visibly red in the Actions tab, not just buried in the issue list.
- Repo dashboards / status badges surface the regression.
- If someone disables issue notifications, the failure still draws attention.

This is intentional. A passing audit is a real success; a failed audit is
a real signal that someone needs to look.

## 7. Provenance on every audit

Per `docs/PROVENANCE_STANDARD.md`:

- Filed WR body: `Filed by .github/workflows/third-party-action-audit.yml → scripts/audit-third-party-actions.sh on YYYY-MM-DD`.
- Disposition comments: name the action, the chosen disposition, and the PR (if any) that applied it.
- When the script's tier lists change: cite the WR that motivated the
  move so future readers can trace the history.

---

## Quick reference

| Command | What it does |
| --- | --- |
| `scripts/audit-third-party-actions.sh` | Run the audit locally; reports to stdout, exits 1 if anything's flagged. |
| `STALENESS_MONTHS=6 scripts/audit-third-party-actions.sh` | Lower the threshold for a tighter audit. |
| `gh workflow run third-party-action-audit.yml` | Trigger the audit on demand in CI. |
| `gh workflow run third-party-action-audit.yml -f staleness_months=24` | One-off relaxed run. |
