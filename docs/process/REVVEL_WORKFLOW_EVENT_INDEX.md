# Revvel Standards — Workflow Event and Static Call Index

> Companion to `REVVEL_TRIGGER_CATALOG.md`. Generated from `revvel-trigger-audit.json`.
> Static inspection of the default branch at `fc8be2c59c8b9144e25d4f0692e899371e104e90` only.
> An event listed here proves a YAML listener exists; it does not prove the workflow is enabled,
> that secrets/runners/apps exist, or that a run succeeds. Job-level predicates may narrow it further.

## Scope and totals

- **238 root workflow files** parsed.
- **764 operational text/documentation files** retrieved; zero retrieval failures recorded by the fetch manifest.
- YAML 1.1's unquoted `on` key was normalized correctly during parsing.
- Dynamic dispatches constructed inside JavaScript or shell are not exhaustively resolved; the curated catalog covers the important ones found by manual cross-check.

### Event totals

| Event | Workflow files declaring it |
| --- | ---: |
| `pull_request` | 61 |
| `push` | 41 |
| `workflow_dispatch` | 192 |
| `pull_request_target` | 10 |
| `pull_request_review` | 6 |
| `issue_comment` | 12 |
| `issues` | 41 |
| `repository_dispatch` | 5 |
| `release` | 2 |
| `workflow_call` | 3 |
| `schedule` | 1 |
| `check_suite` | 5 |
| `workflow_run` | 4 |
| `pull_request_review_comment` | 2 |
| `check_run` | 1 |

## All root workflows

Use the repository-relative path to inspect exact job predicates. `Spend gate` means the file mentions `REVVEL_LLM_ALLOW_CLOUD`; lane switches are listed separately. `if:false` flags at least one statically disabled job, not necessarily the whole workflow.

| Workflow file | Display name | Declared events | Dispatch inputs | Repository-dispatch types | Runners | Reusable calls | Spend gate | Lane switches | `if:false` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.github/workflows/actions-lint.yml` | Actions Lint | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-approval-check.yml` | Agent Approval Check | `pull_request_target:opened,synchronize,reopened,ready_for_review`, `pull_request_review:submitted,dismissed`, `issue_comment:created,edited`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-audit-logger.yml` | Agent Audit Logger | `issues:opened,closed`, `pull_request_review:submitted`, `issue_comment:created`, `workflow_dispatch` | `action` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/agent-command-window-ci.yml` | Agent Command Window CI | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-command-window.yml` | Agent Command Window | `issue_comment:created`, `repository_dispatch:agent_status` | — | `agent_status` | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-dispatcher.yml` | Agent Dispatcher | `issues:labeled,opened`, `workflow_dispatch` | `agent`, `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/agent-fallback.yml` | Agent Fallback Handler | `workflow_dispatch` | `issue_number`, `prefer_agent`, `task_description` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/agent-fingerprint-gate.yml` | Agent Fingerprint Gate | `pull_request:opened,synchronize,reopened,edited` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-monitor.yml` | Agent Monitor | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/agent-request-delivery.yml` | Agent Request Delivery | `repository_dispatch:agent_requested` | — | `agent_requested` | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-scorecard-governance.yml` | agent-scorecard-governance | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/agent-scorecard.yml` | Agent Scorecard | `workflow_dispatch` | `cross_model`, `pr_number` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/ai-architecture-market-evaluator.yml` | AI Architecture — Daily Market Evaluator | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ai-ci-failure-helper.yml` | AI CI Failure Helper | `workflow_dispatch` | `workflow_run_id` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/ai-pr-review-openrouter.yml` | AI PR Review (OpenRouter) | `pull_request:opened,synchronize,reopened,ready_for_review`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/ai-weekly-changelog.yml` | AI Weekly Changelog | `workflow_dispatch` | `days_back`, `dry_run`, `extended`, `force`, `language`, `model` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/amplitude-events.yml` | Amplitude — Repo Event Telemetry | `issues:opened,closed,reopened`, `pull_request:opened,closed,reopened,ready_for_review`, `release:published`, `push`, `workflow_dispatch` | `event_type` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/amplitude-to-notion.yml` | Amplitude → Notion Agent | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/anti-scaffolding-enforcer.yml` | Anti-Scaffolding Enforcer | `pull_request:opened,edited,synchronize,reopened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/api-monitor.yml` | API Monitor | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/api-rate-limit-handler.yml` | API Rate Limit Handler | `workflow_dispatch` | `agent_used`, `error_message`, `failed_workflow` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/apisec-scan.yml` | APIsec Security Scan (archived — see REVVEL-DISABLED header) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | yes |
| `.github/workflows/app-artifact-audit.yml` | App Artifact Audit | `workflow_dispatch`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/apply-revvel-command-project-fields.yml` | apply-revvel-command-project-fields | `workflow_dispatch` | `mode`, `project_number`, `project_title` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/arsc-labels.yml` | ARSC Labels | `workflow_dispatch`, `issues:opened` | `labels`, `object-id`, `operation` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auditor-controller.yml` | Auditor Controller | `workflow_dispatch`, `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/augment-check.yml` | Augment Code App Check | `pull_request_target:opened,reopened,ready_for_review`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-approve-clean-prs.yml` | Auto-Approve Clean PRs | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-bootstrap.yml` | Auto Bootstrap | `workflow_dispatch` | `repo` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-branch-update.yml` | Auto-Update PR Branch from Main | `push`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-deploy-to-stores.yml` | 📱 Auto Deploy to Stores | `workflow_dispatch` | `android_track`, `ios_environment`, `issue_number`, `platform` | — | `macos-latest`, `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-error-handler.yml` | Auto-Error Handler & Self-Healing | `workflow_dispatch`, `workflow_call` | `attempted_fixes`, `error_context`, `error_message`, `error_type`, `workflow_run_id` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-merge.yml` | Auto-Merge on Approval | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/auto-reset-stuck-issues.yml` | 🔄 Auto-Reset Stuck Issues | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/automate-gumroad-artifacts.yml` | scheduled-market-evaluator | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/bernstein-orchestrator.yml` | Bernstein Orchestrator | `workflow_dispatch` | `budget`, `cli`, `plan`, `task` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/biome-homeostat.yml` | BIOME Homeostat | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/biome-inspector.yml` | BIOME Inspector | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/biome-medic.yml` | BIOME Medic | `workflow_dispatch` | `allow_reruns` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/biome-sentinel.yml` | BIOME Sentinel | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/biome-sheaf.yml` | BIOME Sheaf | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/bito-ai.yml` | BITO AI — Code Review | `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/blue-ocean-sar-live.yml` | Blue Ocean SAR live run | `workflow_dispatch` | `after`, `before`, `cams_country`, `case_id`, `lat`, `lon`, `lpb_category`, `lpb_hours`, `radius_m`, `usgs_sites` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/blue-ocean-sar-source-health.yml` | Blue Ocean SAR source health | `schedule`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/bootstrap-pr-labels.yml` | Bootstrap PR Labels | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/brain-dump-intake.yml` | Brain Dump Intake — Parse Unstructured Ideas into WRs | `workflow_dispatch`, `issue_comment:created` | `brain_dump`, `dry_run` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/budget-aware-agent.yml` | Budget-Aware Agent Router | `workflow_dispatch`, `issues:labeled` | `budget_priority`, `required_agents`, `task` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/bulk-close-failure-spam.yml` | Bulk Close Failure Spam | `workflow_dispatch` | `dry_run`, `max_to_close` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/chaosmender.yml` | ChaosMender | `pull_request`, `workflow_dispatch` | `file_issues` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ci-error-prevention.yml` | CI Error Prevention Tests | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/claude-renovate-review.yml` | Claude Renovate Review | `pull_request:opened,edited` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/close-linked-issue.yml` | Close Linked Issue on PR Merge | `pull_request:closed` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/codeql.yml` | CodeQL | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/commit-queue-monitor.yml` | Commit Queue Monitor | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/compliance-check.yml` | Compliance Check | `workflow_dispatch`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/compliance-watcher.yml` | compliance-watcher | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/conflict-helper.yml` | Merge Conflict Helper | `pull_request:opened,synchronize,reopened,labeled` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/connections-registry.yml` | Connections Registry | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/content-automation.yml` | Content Automation | `workflow_dispatch` | `format`, `target_audience`, `topic`, `urgency` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/copilot-setup-steps.yml` | Copilot Setup Steps | `workflow_dispatch`, `push`, `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/create-issue-branch.yml` | Create Issue Branch | `issues:opened,assigned`, `issue_comment:created`, `pull_request:opened,closed` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/cypress-lead-engine.yml` | Cypress E2E — life-insurance-lead-engine | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/daily-diagnostic-audit.yml` | Daily Diagnostic Audit | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/daily-news-briefing.yml` | Daily News Briefing | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/daily-wr-summary.yml` | Daily WR & PR Summary | `workflow_dispatch` | `date_override` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/deep-search-research.yml` | Deep Search Research | `issues:labeled`, `workflow_dispatch` | `issue_number`, `profile`, `research_query` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_RESEARCH` | no |
| `.github/workflows/default-project-v2-fields-pat.yml` | Set default Project v2 fields for new issues using PAT | `issues:opened`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/dependafix.yml` | DependaFix AI Remediation | `pull_request:opened,synchronize,reopened` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/dependency-update-checker.yml` | Dependency & Version Update Checker | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/deploy-oaudrey.yml` | Deploy oAudrey Hub → DigitalOcean App Platform | `push`, `workflow_dispatch` | `force_redeploy` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/deployment-health-check.yml` | Deployment Health Check | `workflow_dispatch` | `url` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/devin-code-review.yml` | Devin Code Review | `issue_comment:created`, `pull_request:opened,synchronize,reopened,ready_for_review,labeled`, `workflow_dispatch` | `pr_number`, `prompt_text` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/devinci-debug.yml` | DevInCi Debug Environment | `workflow_dispatch` | `client_id`, `client_secret`, `interface`, `ttl_minutes`, `tunnel_host`, `tunnel_name`, `tunnel_port` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_INFRA` | no |
| `.github/workflows/docs-freshness-check.yml` | Docs Freshness Check | `pull_request:opened,synchronize,reopened,edited` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/dprint-check.yml` | dprint check | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/dragnet-ci-autofix.yml` | Dragnet CI Autofix | `check_suite:completed`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/dragnet-team-assignment.yml` | DRAGNET Team Assignment | `issues:opened` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_PERSONAS` | no |
| `.github/workflows/duplicate-detector.yml` | Duplicate WR and PR Detector | `issues:opened,edited`, `pull_request_target:opened,edited` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/durability-mirror.yml` | durability-mirror | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/easy-env-vars.yml` | Easy Env Vars | `workflow_dispatch`, `workflow_call` | `env_block`, `seed_env` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/eco-github-extensions.yml` | Eco Github Extensions | `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/eeat-trust-cron.yml` | eeat-trust-cron | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/email-error-intake.yml` | Email Error Intake | `workflow_dispatch` | `dry_run`, `max_issues` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/fix-wr-gate.yml` | Fix-WR Gate | `pull_request:opened,edited,synchronize,labeled,unlabeled` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/fleet-controller.yml` | Fleet Controller | `workflow_dispatch` | `preempt` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/fleet-dispatch.yml` | Fleet Dispatch | `issue_comment:created`, `workflow_dispatch` | `args`, `fleet`, `issue_number` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/fleet-maintenance.yml` | Fleet Maintenance Sweep | `workflow_dispatch` | `dry_run`, `max_repos` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/flow-chart-sync.yml` | Flow Chart Sync | `push`, `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/followup-checkbox-router.yml` | Follow-up Checkbox Router | `pull_request:edited`, `issues:edited` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/fork-audit-bot.yml` | Fork-Audit Bot | `workflow_dispatch` | `config_path`, `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/formal-auto-wr.yml` | formal-auto-wr | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/free-llm-router.yml` | LLM Router | `workflow_dispatch`, `workflow_call` | `prompt` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/ghcr-publish.yml` | GHCR publish | `push`, `workflow_dispatch` | `dry_run`, `tag_suffix` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ghcr-setup-status.yml` | GHCR setup status | `workflow_dispatch`, `push` | `fail_if_unwired`, `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/goap-assignment-router.yml` | GOAP Assignment Router | `issues:opened,reopened,edited`, `pull_request_target:opened,reopened,edited,ready_for_review` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/gosqlx-lint.yml` | GoSQLX Lint | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/green-website.yml` | Website green-o-meter | `push`, `workflow_dispatch` | `url` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/gumloop-pdf-pipeline.yml` | Gumloop PDF Pipeline | `workflow_dispatch` | `keywords`, `niche`, `output_name` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/gumroad-covers.yml` | Gumroad Covers | `workflow_dispatch`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/host.yml` | Host — decompose WR into agent-contract | `issues:labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/hourly-growth-prioritizer.yml` | Hourly Star Growth & Prioritization Engine | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/image-seo-pipeline.yml` | image-seo-pipeline | `workflow_dispatch` | `kind`, `primary_keyword`, `topic` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/image-seo-qa.yml` | image-seo-qa | `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/issue-auto-triage.yml` | Auto-Triage Issues | `issues:opened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/issue-lifecycle.yml` | Issue Lifecycle Automation | `issues:opened`, `pull_request:opened,closed,reopened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/issue-state-machine.yml` | Issue State Machine | `issues:labeled,opened,closed,reopened`, `workflow_dispatch` | `issue_number`, `target_state` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/jules-coding-agent.yml` | Jules Coding Agent (disabled) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | yes |
| `.github/workflows/jules-feedback.yml` | Send Feedback to Jules | `pull_request_review:submitted` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/jules-invoke.yml` | Jules Invoke | `workflow_dispatch`, `issues:opened,reopened,closed` | `include_commit_log`, `include_last_commit`, `prompt`, `starting_branch` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/jules-pr-comment.yml` | Jules PR Comment | `pull_request:opened`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/jules-pr-reviewer.yml` | Jules PR Reviewer | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/label-allowlist.yml` | label-allowlist | `issues:labeled`, `pull_request:labeled`, `workflow_dispatch` | `labels` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/lane-canary.yml` | lane-canary | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/lint-md.yml` | Lint Markdown (markdownlint-cli) | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/mabl.yml` | mabl Automated Tests | `workflow_dispatch` | `app-url`, `continue-on-failure`, `plan-labels` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/markdown-image-alt-text-checker.yml` | Markdown Image Alt-text Checker | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_INFRA` | no |
| `.github/workflows/markdown-lint-auto-heal.yml` | Markdown Lint Advisory | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/market-evaluator.yml` | market-evaluator | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/merge-prosecutor.yml` | Merge Prosecutor | `pull_request:opened,synchronize,reopened,ready_for_review` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/mergeme-status.yml` | MergeMe.dev wiring status | `workflow_dispatch`, `push` | `fail_if_unwired`, `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/mergify-merge-queue-labels-copier.yml` | Mergify Merge-Queue Labels Copier | `pull_request_target:opened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/migration-cron.yml` | migration-cron | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/mirror-malama.yml` | Mirror Mālama Engine | `workflow_dispatch`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/morty-post-mortems.yml` | Morty Post Mortems | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/naukri-resume.yml` | Update Naukri Resume | `workflow_dispatch` | — | — | `self-hosted` | — | no | — | no |
| `.github/workflows/needs-action-router.yml` | Needs Action Router — Auto-Assign to OpenRouter | `workflow_dispatch` | `dry_run`, `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/neon-branch.yml` | Neon Preview Branch | `pull_request:opened,reopened,synchronize,closed` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_INFRA` | no |
| `.github/workflows/neuralegion.yml` | NeuraLegion DAST (archived — see REVVEL-DISABLED header) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | yes |
| `.github/workflows/news-with-cache.yml` | News with Cache | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/no-destroy-guard.yml` | No-Destroy Guard | `pull_request:opened,synchronize,reopened,labeled,unlabeled` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/no-root-junk.yml` | No Root Junk | `pull_request:opened,synchronize,reopened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/noimosai.yml` | NoimosAI — Autonomous Marketing | `workflow_dispatch`, `issues:opened,reopened` | `project`, `prompt`, `task_type` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/oaudrey-git-greetings.yml` | oAudrey Git Greetings | `issues:opened`, `pull_request:opened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/oaudrey-retro.yml` | oAudrey — Post-Deploy Retro & Gap Analysis | `workflow_run:completed`, `workflow_dispatch` | `skip_health_check` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/octopus-cli.yml` | Octopus CLI | `workflow_dispatch` | `command`, `pr_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/octopus-review-fallback.yml` | Octopus Review Fallback | `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/octopus-route.yml` | Octopus Issue Router | `workflow_dispatch` | `backfill`, `max_issues`, `rate_limit_minutes` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/openhands-resolver.yml` | OpenHands Resolver | `issues:labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/openrouter-agent.yml` | OpenRouter Agent | `issue_comment:created`, `issues:opened`, `pull_request_review_comment:created` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/openrouter-assignee.yml` | OpenRouter Assignee — First Line of Sight | `issues:opened,reopened`, `pull_request_target:opened,reopened,ready_for_review`, `workflow_dispatch` | `dry_run`, `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/openrouter-auto-route.yml` | OpenRouter Auto-Route | `issues:opened,reopened,edited,labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/openrouter-coder.yml` | OpenRouter Coder | `issues:labeled`, `workflow_dispatch` | `issue_number`, `prompt` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/openrouter-instantiation-check.yml` | OpenRouter Instantiation Check | `workflow_dispatch`, `push` | `force_escalate` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/openrouter-key-reset.yml` | OpenRouter Key Reset — Reprocess Failures | `workflow_dispatch`, `repository_dispatch:openrouter-key-updated` | `dry_run`, `max_items` | `openrouter-key-updated` | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/openrouter-triage.yml` | OpenRouter Triage | `issues:opened,reopened`, `pull_request_target:opened,reopened,ready_for_review`, `workflow_dispatch` | `issue_number`, `prompt` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/ossar.yml` | OSSAR | `workflow_dispatch` | — | — | `windows-latest` | — | no | — | no |
| `.github/workflows/panda-ops.yml` | PandaOps AI PR Review | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/patch-agent.yml` | Patch Agent (disabled) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | yes |
| `.github/workflows/pdf-work-request-router.yml` | PDF work request router | `issues:opened,edited,labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/perplexity-research-agent.yml` | Perplexity Research Agent | `issues:labeled`, `workflow_dispatch` | `issue_number`, `prompt`, `skip_labels` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_RESEARCH` | no |
| `.github/workflows/persona-comment-trigger.yml` | Persona Comment Trigger | `issue_comment:created` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_PERSONAS` | no |
| `.github/workflows/pr-auto-review.yml` | PR Auto Review via OpenRouter | `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/pr-check-status.yml` | PR Check Status Automation | `check_suite:completed` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/pr-governance-checks.yml` | pr-governance-checks | `pull_request:opened,synchronize,reopened,ready_for_review,labeled,unlabeled`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/pr-lifecycle.yml` | PR Lifecycle | `pull_request:opened,synchronize,reopened,ready_for_review,converted_to_draft,closed`, `pull_request_target:opened,synchronize,reopened,ready_for_review,converted_to_draft,closed`, `check_suite:completed`, `workflow_run:completed` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/pr-review-request-handler.yml` | PR Review Request Handler | `pull_request_review:submitted`, `pull_request:labeled` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/pr-review-status.yml` | PR Review Status Automation | `pull_request:opened,reopened,ready_for_review`, `pull_request_review:submitted,edited,dismissed`, `pull_request_review_comment:created` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/pr-state-orchestrator.yml` | 🎛️ PR State Orchestrator | `pull_request:opened,reopened,ready_for_review,converted_to_draft,synchronize,closed,labeled`, `pull_request_review:submitted`, `check_suite:completed`, `check_run:completed`, `workflow_dispatch` | `pr_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/print-project-v2-ids-pat.yml` | Print Project v2 field and option IDs using PAT | `workflow_dispatch` | `owner`, `owner_type`, `project_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/print-project-v2-ids.yml` | Print Project v2 field and option IDs | `workflow_dispatch` | `owner`, `owner_type`, `project_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/prioritize-stars.yml` | Prioritize Starred Repositories | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/priority-router.yml` | Priority Router — Issues & PRs | `pull_request_target:opened,reopened,edited,labeled,unlabeled,ready_for_review,closed`, `workflow_dispatch` | `dry_run`, `use_openrouter` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/project-board-sync.yml` | Project Board Sync | `issues:opened,labeled,unlabeled,closed,reopened`, `pull_request:opened,labeled,unlabeled,closed,reopened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/proof-of-life.yml` | Proof of Life — app-review revvel-standards-run | `workflow_dispatch` | `assignee`, `dry_run`, `role`, `target_issue` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/proposal-prosecution.yml` | Proposal Prosecution | `issues:labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/publish-site.yml` | Publish site | `push`, `workflow_dispatch` | `dir`, `force` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/python-flake8.yml` | Python flake8 Lint | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ralph-loop.yml` | Ralph Loop — Self-Healing CI | `check_suite:completed` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/readme-landing.yml` | readme-landing | `push`, `workflow_dispatch` | `template` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ready-for-review.yml` | Ready for Review Automation | `pull_request_target:opened,synchronize,reopened,ready_for_review,closed` | — | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/recovery-engine.yml` | PR & Issue Recovery Engine | `workflow_dispatch` | `dry_run`, `max_inspected` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/recurse-ml.yml` | RecurseML — Autonomous Code Review | `workflow_dispatch` | `target_branch` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/release-banner-social.yml` | release-banner-social | `release:released`, `workflow_dispatch` | `tag` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/renovate-config-validator.yml` | Renovate Config Validator | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/repo-organizer.yml` | Repo Organizer | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/repo-self-healer.yml` | Repo Self-Healer | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/research-engine.yml` | Research Engine Orchestrator | `issues:opened,reopened`, `workflow_dispatch` | `issue_number`, `pr_number`, `research_depth`, `research_query` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_RESEARCH` | no |
| `.github/workflows/research-module.yml` | AI Research Module | `workflow_dispatch` | `create_issue`, `output_file`, `question` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_RESEARCH` | no |
| `.github/workflows/reset-self-heal-issue.yml` | 🔄 Reset Self-Heal Issue | `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/revvel-engine-spine.yml` | 🦴 Revvel Engine Spine | `workflow_dispatch` | `dry_run`, `intake_path`, `output_type`, `revenue`, `slug` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/run-human-testing-api.yml` | Human Testing API | `workflow_dispatch` | `app_name`, `create_issue`, `output_file`, `target_url`, `test_scenarios` | — | `ubuntu-latest` | — | yes | — | no |
| `.github/workflows/runtime-gateway-triage.yml` | Runtime Gateway Triage | `repository_dispatch:sentry,runtime-5xx`, `workflow_dispatch` | `dry_run`, `event_json` | `runtime-5xx`, `sentry` | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/saml-sso-registration.yml` | SAML SSO Registration Check (disabled) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | yes |
| `.github/workflows/sandbox-guardrail.yml` | Sandbox Guardrail | `pull_request:opened,ready_for_review` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/security-fleet.yml` | security-fleet | `issues:opened,edited`, `issue_comment:created,edited`, `pull_request:opened,edited,synchronize`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/self-heal-pr.yml` | Self-Heal PR | `workflow_dispatch`, `repository_dispatch:self-heal-fix` | `branch_suffix`, `fix_description`, `fix_type`, `issue_number`, `patch_content` | `self-heal-fix` | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/self-healing.yml` | Self-Healing Agent | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/semgrep.yml` | Semgrep SAST | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/seo-a11y-guard.yml` | SEO + A11y Guard | `pull_request:opened,synchronize,reopened,labeled,unlabeled` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/set-default-project-v2-fields.yml` | Set default Project v2 fields for new issues | `issues:opened`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ship-quality.yml` | Intelligent Code Quality Scanner | `pull_request:opened,edited,synchronize,reopened` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/ship-status-audit.yml` | Ship Status Audit | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ship-to-market.yml` | 🚀 Ship to Market | `pull_request:closed`, `workflow_dispatch` | `channel` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/social-media-automation.yml` | Social Media Automation | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/spec-approval-gate.yml` | Spec Approval Gate | `issues:labeled` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stale-branch-cleanup.yml` | Stale Branch Cleanup | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stale-docs-check.yml` | Stale Docs Check | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/static.yml` | Deploy static content to Pages | `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stuck-check-watchdog.yml` | Stuck Check Watchdog | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stuck-label-automation.yml` | Stuck Label Detection & Auto-Progression | `workflow_dispatch` | `dry_run` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stuck-label-watchdog.yml` | Stuck Label Watchdog | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stuck-pr-sweep.yml` | Stuck PR Sweeper | `workflow_dispatch` | `dry_run`, `max_dirty`, `max_inspected` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/stuck-wr-detector.yml` | Stuck WR Detector & Auto-Healer | `workflow_dispatch` | `dry_run`, `max_age_hours` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/subscription-tracker.yml` | Subscription & Trial Tracker | `workflow_dispatch` | `warn_within_days` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/super-linter.yml` | Super-Linter | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/swe-agent.yml` | SWE-Agent | `issues:labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/sync-labels.yml` | Sync Standard Labels | `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/sync-oaudrey-dns.yml` | Sync oAudrey DNS records | `workflow_dispatch`, `workflow_run:completed` | `dry_run`, `provider` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/synopsys-action.yml` | Synopsys Security Testing | `push`, `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/template-sync-check.yml` | Template Sync Check | `pull_request`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/test-bito-integration.yml` | Test BITO AI Integration | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/third-party-action-audit.yml` | Third-Party Action Freshness Audit | `workflow_dispatch` | `staleness_months` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/triage-cron.yml` | triage-cron | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/trivy.yml` | Trivy | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/trusted-bot-auto-approve.yml` | Trusted Bot Auto-Approve | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ui-audit-logger.yml` | Greenfield UI Agent Audit & Health Logger | `push`, `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/ui-creation-engine.yml` | UI Creation Engine | `issues:labeled`, `issue_comment:created`, `workflow_dispatch` | `business`, `industry`, `issue_number`, `location`, `platform`, `services` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/update-agent-creator-data.yml` | Update Agent Creator Data | `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_PERSONAS` | no |
| `.github/workflows/update-project-dashboard.yml` | Update Project Dashboard | `workflow_dispatch`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/veins-intake-dedup.yml` | VEINS Intake Dedup | `issues:opened` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/veins-monitor.yml` | VEINS Monitor — Vital Engine INtelligence Surveillance | `workflow_dispatch` | `dry_run`, `max_age_days` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/verify-security-fix.yml` | Verify Security Fix | `pull_request` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/vine-to-marketplace.yml` | Vine → Marketplace Automation | `workflow_dispatch` | `action`, `date_before`, `date_since` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/watchtower.yml` | WR-4600 Watchtower | `workflow_dispatch` | `all`, `shard` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/website-publish.yml` | Website Publish (Hub Registry) | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/weekly-research.yml` | Weekly Research (WR) Automation | `issues:opened,reopened,labeled`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_RESEARCH` | no |
| `.github/workflows/workflow-action-ref-audit.yml` | Workflow Action-Ref Auditor | `push`, `pull_request`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/workflow-health-dashboard.yml` | Workflow Health Dashboard | `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/workflow-monitor.yml` | Workflow Monitor (Real-Time) | `workflow_dispatch` | `workflow_run_id` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/wr-auto-classify.yml` | WR Auto-Classify Project v2 Fields | `issues:opened` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/wr-autotitle.yml` | WR Autotitle | `issues:opened,edited`, `issue_comment:created`, `workflow_dispatch` | `force`, `issue_number` | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/wr-field-filler.yml` | WR Field Filler — no blanks ever ship | `issues:opened,edited,labeled`, `workflow_run:completed`, `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/wr-lint.yml` | WR Lint | `pull_request`, `push` | — | — | `ubuntu-latest` | — | no | — | no |
| `.github/workflows/wr-pr-creation.yml` | WR PR Creation | `workflow_dispatch` | `issue_number` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_CODING_AGENTS` | no |
| `.github/workflows/wr-rewrite.yml` | wr-rewrite-sweep | `workflow_dispatch` | `max_docs` | — | `self-hosted` | — | yes | `REVVEL_SWITCH_ROUTERS` | no |
| `.github/workflows/xai-code-review.yml` | xAI Code Review | `pull_request:opened,synchronize,reopened,ready_for_review`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/xai-review-oleg-fork.yml` | XAI Review (oleg fork) | `pull_request:opened,synchronize,reopened,ready_for_review`, `workflow_dispatch` | `pull-request-number`, `review-command` | — | `ubuntu-latest` | — | yes | `REVVEL_SWITCH_REVIEW` | no |
| `.github/workflows/zizmor.yml` | Zizmor (Actions security) | `pull_request`, `push`, `workflow_dispatch` | — | — | `ubuntu-latest` | — | no | — | no |

## Statically detected calls

This table includes literal `gh workflow run`, Octokit `workflow_id`, reusable-workflow, and literal `event_type` calls found in workflow YAML. `target found` is not a runtime health check. Input validation beyond the fleet registry is incomplete for multiline and dynamic shell calls.

| Kind | Source | Target | Static status | Matched listeners | Call text |
| --- | --- | --- | --- | --- | --- |
| gh workflow run | `.github/workflows/agent-dispatcher.yml:159` | `perplexity-research-agent.yml` | target found | — | `gh workflow run perplexity-research-agent.yml -f issue_number=$ISSUE_NUMBER -f prompt="$PROMPT"` |
| gh workflow run | `.github/workflows/agent-dispatcher.yml:163` | `jules-coding-agent.yml` | target found; target has job if:false | — | `gh workflow run jules-coding-agent.yml -f issue_number=$ISSUE_NUMBER -f prompt="$PROMPT"` |
| gh workflow run | `.github/workflows/agent-dispatcher.yml:167` | `openrouter-coder.yml` | target found | — | `gh workflow run openrouter-coder.yml -f issue_number=$ISSUE_NUMBER -f prompt="$PROMPT"` |
| gh workflow run | `.github/workflows/agent-dispatcher.yml:171` | `openrouter-triage.yml` | target found | — | `gh workflow run openrouter-triage.yml -f issue_number=$ISSUE_NUMBER -f prompt="$PROMPT"` |
| repository_dispatch | `.github/workflows/agent-request-delivery.yml:43` | `agent_status` | matched | `agent-command-window.yml` | `event_type: "agent_status",` |
| gh workflow run | `.github/workflows/api-rate-limit-handler.yml:85` | `openrouter-coder.yml` | target found | — | `gh workflow run openrouter-coder.yml \` |
| Octokit createWorkflowDispatch | `.github/workflows/auto-deploy-to-stores.yml:241` | `research-engine.yml` | target found | — | `workflow_id: 'research-engine.yml',` |
| Octokit createWorkflowDispatch | `.github/workflows/auto-reset-stuck-issues.yml:119` | `openrouter-assignee.yml` | target found | — | `workflow_id: 'openrouter-assignee.yml',` |
| Octokit createWorkflowDispatch | `.github/workflows/auto-reset-stuck-issues.yml:133` | `openrouter-triage.yml` | target found | — | `workflow_id: 'openrouter-triage.yml',` |
| gh workflow run | `.github/workflows/conflict-helper.yml:243` | `jules-coding-agent.yml` | target found; target has job if:false | — | `gh workflow run jules-coding-agent.yml -f pr_number="$PR_NUMBER" 2>/dev/null \` |
| gh workflow run | `.github/workflows/eeat-trust-cron.yml:554` | `eeat-trust-cron.yml` | target found | — | `echo "gh workflow run eeat-trust-cron.yml"` |
| repository_dispatch | `.github/workflows/pdf-work-request-router.yml:320` | `pdf_work_request` | no static listener | — | `event_type: 'pdf_work_request',` |
| gh workflow run | `.github/workflows/reset-self-heal-issue.yml:132` | `openrouter-assignee.yml` | target found | — | `if gh workflow run openrouter-assignee.yml \` |
| gh workflow run | `.github/workflows/reset-self-heal-issue.yml:143` | `openrouter-triage.yml` | target found | — | `if gh workflow run openrouter-triage.yml \` |
| Octokit createWorkflowDispatch | `.github/workflows/ship-to-market.yml:578` | `auto-deploy-to-stores.yml` | target found | — | `workflow_id: 'auto-deploy-to-stores.yml',` |
| Octokit createWorkflowDispatch | `.github/workflows/stuck-label-automation.yml:343` | `openrouter-triage.yml` | target found | — | `workflow_id: 'openrouter-triage.yml',` |
| Octokit createWorkflowDispatch | `.github/workflows/stuck-wr-detector.yml:303` | `wr-pr-creation.yml` | target found | — | `workflow_id: 'wr-pr-creation.yml',` |
| Octokit createWorkflowDispatch | `.github/workflows/stuck-wr-detector.yml:320` | `wr-pr-creation.yml` | target found | — | `workflow_id: 'wr-pr-creation.yml',` |
| gh workflow run | `.github/workflows/veins-monitor.yml:258` | `wr-pr-creation.yml` | target found | — | ``   gh workflow run wr-pr-creation.yml --field issue_number=${issue.number} --repo ${owner}/${repo}`,` |
| gh workflow run | `.github/workflows/veins-monitor.yml:311` | `openrouter-triage.yml` | target found | — | ``   gh workflow run openrouter-triage.yml --field issue_number=${issue.number} --repo ${owner}/${repo}`,` |

## Fleet target compatibility

Every declared dispatch-based fleet target was checked for existence, a `workflow_dispatch` listener, supplied-input declarations, and required-input coverage. This is a static compatibility check only.

| Fleet | Aliases | Route | Target | Supplied inputs | Declared inputs | Undeclared supplied | Missing required | Cloud |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `security-fleet` | `security`, `redteam-fleet` | `dispatch` | `security-fleet.yml` | — | — | — | — | no |
| `biome` | `biome-crew`, `crew` | `dispatch` | `biome-sentinel.yml` | — | — | — | — | no |
| `biome` | `biome-crew`, `crew` | `dispatch` | `biome-medic.yml` | — | `allow_reruns` | — | — | no |
| `biome` | `biome-crew`, `crew` | `dispatch` | `biome-homeostat.yml` | — | — | — | — | no |
| `biome` | `biome-crew`, `crew` | `dispatch` | `biome-sheaf.yml` | — | — | — | — | no |
| `biome` | `biome-crew`, `crew` | `dispatch` | `biome-inspector.yml` | — | — | — | — | no |
| `dragnet-team` | `dragnet-fleet` | `dispatch` | `deep-search-research.yml` | `issue_number`, `profile`, `research_query` | `issue_number`, `profile`, `research_query` | — | — | yes |
| `research` | `rnd`, `rnd-research`, `research-fleet` | `dispatch` | `research-engine.yml` | `issue_number`, `research_depth`, `research_query` | `issue_number`, `pr_number`, `research_depth`, `research_query` | — | — | yes |
| `bernstein` | `octopus-orchestra`, `claude-octopus` | `dispatch` | `bernstein-orchestrator.yml` | `budget`, `task` | `budget`, `cli`, `plan`, `task` | — | — | yes |
| `octopus` | `octo-review` | `dispatch` | `octopus-review-fallback.yml` | `pr_number` | `pr_number` | — | — | yes |
| `coding-agents` | `openhands`, `swe`, `coder-fleet` | `dispatch` | `openhands-resolver.yml` | `issue_number` | `issue_number` | — | — | yes |
| `fleet-controller` | `fleet-ops`, `controller` | `dispatch` | `fleet-controller.yml` | `preempt` | `preempt` | — | — | no |
| `agent-creator-refresh` | `agentic-workflow-fleet`, `workflow-fleet` | `dispatch` | `update-agent-creator-data.yml` | — | — | — | — | yes |
| `personas` | `oaudrey`, `openrouter`, `mindmappr`, `professor`, `dragnet`, `coder`, `orbit`, `octo`, `mender` | `persona` | `persona-comment-trigger.yml` | — | — | — | — | yes |

## Interpretation limits

- A workflow with only `workflow_dispatch` does **not** run from labels, issue comments, schedules, or PR events even if old job predicates still mention them.
- A parsed listener can still be unusable because of a job `if`, spend switch, missing secret, unavailable self-hosted runner, disabled Actions setting, or external application outage.
- External GitHub Apps can react to comments without any listener in this repository. Those are identified separately in the curated catalog.
- This is not an audit of every historical branch, every deleted workflow, or every byte of Git history.
