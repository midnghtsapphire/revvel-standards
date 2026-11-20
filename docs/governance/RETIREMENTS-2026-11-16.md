# Retirements & Superseded Processes — Consolidated Record (2026-11-16)

**Author of record:** Audrey Evans (owner direction, 2026-11-16 session)
**Prepared by:** Kimi (auditing agent), at owner request
**Rule in effect:** retire with a dated note, never delete (`AGENTS.md` OWNER RULE, 2026-10-30;
`standards/COMMENT-DONT-DELETE.md`, RVS-AGENT-001). This file is the dated note for each
retirement. Everything listed here remains in the repo and in git history.

> Owner context (2026-11-16, verbatim intent): rules written earlier were written in reaction to
> specific LLM behavior patterns ("I wrote stuff unequivocally"). **Now things are different.**
> Current operating mode: draft PRs, owner merges, spend gate on, receipts required, honesty
> statuses (CAN / CAN-PARTIAL / CANNOT / UNKNOWN). Where an older doc below says something more
> aggressive or contradictory, this record marks it superseded. The old text stays in place.

---

## 1. Silenced schedules — 63 workflows with commented-out triggers

**Status: RETIRED (in place, commented, recoverable).**
**When:** in two waves — the OpenRouter spend incident (#17849, ~$80/day, 46 scheduled workflows
firing ~496 runs/day) and the Actions billing lock (2026-11-06).
**Why retired:** cost. Every hosted scheduled run was either spend risk or, after 2026-11-06, a
job that can never start ("account is locked due to a billing issue").
**What happens if restored blindly:** spend resumes at up to ~496 runs/day, or jobs fail red on
every PR. Reactivate individually, on owner decision, after the billing question is settled and
the n8n/Gumloop lane (pending WR 05) exists.

Families retired (full file list lives in the audit, `docs/audits/GITHUB-AUDIT-2026-11-16.md` §2.3):

| Family | Files | Replacement, if any |
| --- | --- | --- |
| Daily/weekly digests & audits | `daily-diagnostic-audit.yml`, `daily-news-briefing.yml`, `daily-wr-summary.yml`, `weekly-research.yml`, `ai-weekly-changelog.yml`, `migration-cron.yml`, `hourly-growth-prioritizer.yml` | None running. On-demand dispatch still works once billing unlocks. |
| Biome homeostat suite | `biome-homeostat.yml`, `biome-inspector.yml`, `biome-medic.yml`, `biome-sentinel.yml`, `biome-sheaf.yml` | Retired to manual. |
| Third-party AI reviewers | `bito-ai.yml`, `mabl.yml`, `neuralegion.yml`, `apisec-scan.yml`, `jules-coding-agent.yml` (partial) | Octopus remains default reviewer lane; Proofy gates in CircleCI carry security. |
| Security scanners | `codeql.yml`, `apisec-scan.yml` | Proofy gates 1–4 in CircleCI (2026-11-15): huge-delete guard, Trivy secrets + ClamAV, prompt-injection scan, API review. |
| Marketing automation | `image-seo-pipeline.yml`, `amplitude-to-notion.yml`, `market-evaluator.yml`, `naukri-resume.yml`, `news-with-cache.yml`, `social-media-automation.yml` | None running. |
| Fleet infra / mirrors | `fleet-controller.yml`, `fleet-maintenance.yml`, `durability-mirror.yml`, `ghcr-setup-status.yml`, `green-website.yml`, `app-artifact-audit.yml`, `auto-approve-clean-prs.yml`, `auto-deploy-to-stores.yml`, `automate-gumroad-artifacts.yml`, `ci-error-prevention.yml`, `formal-auto-wr.yml`, `mergeme-status.yml`, `api-monitor.yml`, `agent-audit-logger.yml`, `agent-monitor.yml`, `agent-scorecard-governance.yml`, `ai-architecture-market-evaluator.yml`, and the remainder listed in the audit | Event-gated versions remain. |

**The one schedule still alive:** `blue-ocean-sar-source-health.yml` (`17 */6 * * *`) — SAR
data-source health. Left on deliberately.

## 2. Hard-disabled workflow files

**Status: RETIRED.** `agent-approval-check.yml.disabled`, `probe-selfhosted.yml.disabled`.
Renamed off the `.yml` extension so GitHub never parses them. Kept for history.

## 3. Agent fallback chain — Cursor removed

**Status: SUPERSEDED (PR #14539).** Chain is now OpenRouter → OpenHands → human
(`config/connections.yml`, README fallback block). Cursor IDE config retained for history.
Note: `docs/AGENTS.md` still describes the older OpenHands → Cursor → OpenRouter chain —
that text is historical; the SSOT is `config/connections.yml`.

## 4. VEINS self-healing engine

**Status: DORMANT (115 silent days, observed 2026-11-14/15 snapshots).**
Engine repos `veinsloop` and `veins-self-healing-engine` are private and untouched since
2026-06/07. Monitoring resumed via `chunk/veins-*` branches and `docs/VEINS_MONITORING_REPORT.md`.
**Reactivation is gated on pending WR 14 (veins-grounding-gate)** — do not restart the engine
without the BNAT-sheaf H¹ grounding check (`scripts/bnatsheaf/cli.js consistency_check`).

## 5. Superseded method docs

- `docs/30Dayiteration/` — **RETIRED**, superseded by the one-iteration UPREV method
  (`UPREV_METHOD.md`, `MASTER.md`). Kept as reference.
- "Phase 1/MVP-first" language in old prompts — **RETIRED** by the anti-scaffolding enforcement
  in `docs/AGENTS.md` and `wr-lint`.
- CircleCI OpenRouter `pr-review` job — **REMOVED** (duplicated the GitHub Actions reviewer);
  recorded in `.circleci/config.yml` header comment.
- oAudrey DNS instructions pointing at Namecheap nameservers — **SUPERSEDED 2026-11-11**:
  DNS lives on Cloudflare; old cells preserved in git history (note in `SYSTEM_STATE.md`).

## 6. Conflicting era-rules — reconciliation

The repo accumulated rules from different eras. This is the current precedence, owner-confirmed
2026-11-16:

1. `AGENTS.md` OWNER RULE (2026-10-30) — top precedence: never delete, comment out, draft PRs,
   owner merges.
2. Owner-directed work rules (2026-11-01) — Audrey decides scope/framing; agents state
   consequences, never veto.
3. LLM spend gate (`REVVEL_LLM_ALLOW_CLOUD=1` exactly) — still on. OWNER RULE #7 already
   supersedes the older "never call a provider directly" gotcha; the gate is what governs spend.
4. `docs/AGENTS.md` "Driven Autonomy / zero human involvement / no questions" block —
   **SUPERSEDED for daily operation.** It produced runaway merges and empty-PR incidents
   (prosecuted in WRs #17756, #17881 and the huge-delete guard). Current mode: autonomous work,
   but draft PRs and owner review; receipts over claims. Text retained in place as history.
5. Optimistic "production" labels in `SYSTEM_STATE.md` — **SUPERSEDED 2026-11-10** by honest
   "staged, not live" statuses. Historical rows preserved.

## 7. Branch policy record (2026-11-16)

- **14 branches fully merged into `main` were deleted** (bot branches whose every commit is in
  main's history — zero work lost): the `15463-dragnet-…` branch, 5 `copilot/*` branches,
  `feat/supabase-agent-registry`, `feat/veins-foundation`,
  `fix/ban-pending-placeholders-in-wr-lint`, 2 `jules/issue-*`, 3 `veins/heal-auto-*` branches.
- **~300 unmerged bot branches** (`agent-fallback/issue-*`, `jules-*`, `wr/issue-*`,
  `copilot/*`, `dependabot/*`) are **PARKED, NOT deleted** — they hold unique unmerged commits
  from the July–August automation era. Triage is a future owner decision; per the retire-don't-
  delete rule, they stay until individually reviewed.

---

*Anything retired after this date gets its own dated section appended below. Never edit old
sections away — add the new note under them.*
