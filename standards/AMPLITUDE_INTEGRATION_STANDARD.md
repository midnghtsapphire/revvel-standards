# Amplitude Integration Standard

**Version:** 1.0.0
**Status:** Active
**Scope:** `midnghtsapphire/revvel-standards` (and any sibling repo that adopts the workflow)
**Workflow:** [`.github/workflows/amplitude-events.yml`](../.github/workflows/amplitude-events.yml)
**Registry row:** `docs/Universal-BOM_List/API_REGISTRY_BOM.md` → §9 *Analytics & Product Intelligence APIs* → **Amplitude**

---

## 1. What this is (and isn't)

This standard governs the integration of **Amplitude Analytics** (amplitude.com — product analytics; HTTP V2 events API) with the standards repo via a GitHub Action.

> **Disambiguation.** The originating issue body referenced "Amplitude Audio SDK". That is a different product — the Sparky Studios C++ game audio engine ([github.com/SparkyStudios/AmplitudeAudioSDK](https://github.com/SparkyStudios/AmplitudeAudioSDK)). It has no place in a standards/governance repo. The repo's API Registry already lists **Amplitude (Analytics)** under §9, so we implemented that. If a future request truly wants the Audio SDK, file a separate issue scoped to the consumer game/app — not to `revvel-standards`.

---

## 2. Why we track repo events

`revvel-standards` is the canonical governance repo. Tracking issue / PR / release activity lets us measure governance throughput (time-to-merge, issue volume, release cadence, agent throughput) using the same analytics tool we recommend for products. It also gives us a real production probe of the Amplitude HTTP V2 API before any product team adopts it, satisfying the "evaluate" status assigned to Amplitude in the registry.

---

## 3. Required configuration

### 3.1 Secret

| Name | Purpose | Vault path |
|---|---|---|
| `AMPLITUDE_API_KEY` | Amplitude project API key. Obtain from Amplitude UI → *Settings → Projects → \[project\] → API Key*. | `revvel/shared/analytics/amplitude` |

Provision via:

```bash
gh secret set AMPLITUDE_API_KEY --repo midnghtsapphire/revvel-standards
```

If the secret is missing the workflow logs a warning and exits cleanly (no failed runs, no leaked data).

### 3.2 Optional repo variables

Set under *Settings → Secrets and variables → Actions → Variables*:

| Variable | Values | Default | Purpose |
|---|---|---|---|
| `AMPLITUDE_REGION` | `us`, `eu` | `us` | Selects the Amplitude data-residency endpoint. Use `eu` only if the project was provisioned in Amplitude's EU data center. |
| `AMPLITUDE_ENABLED` | `true`, `false` | `true` | Kill switch. Set `false` to disable sending without removing the workflow. |

Endpoints:

* US: `https://api2.amplitude.com/2/httpapi`
* EU: `https://api.eu.amplitude.com/2/httpapi`

---

## 4. Tracked events

The workflow triggers on the following GitHub events and emits one Amplitude event per trigger.

| GitHub trigger | Amplitude `event_type` | Notable properties |
|---|---|---|
| `issues` opened/closed/reopened | `gh_issue_<action>` | `issue_number`, `issue_title`, `issue_labels`, `issue_state` |
| `pull_request` opened/reopened/ready_for_review | `gh_pr_<action>` | `pr_number`, `pr_title`, `pr_state`, `pr_draft`, `pr_labels`, `pr_base`, `pr_head`, `pr_additions`, `pr_deletions`, `pr_changed_files` |
| `pull_request` closed (merged) | `gh_pr_merged` | as above + `pr_merged: true` |
| `pull_request` closed (not merged) | `gh_pr_closed` | as above + `pr_merged: false` |
| `release` published | `gh_release_published` | `release_tag`, `release_name`, `release_prerelease` |
| `push` to `main` | `gh_push_main` | `commit_count`, `head_commit_message`, `pusher` |
| `workflow_dispatch` (verification) | `amplitude_workflow_verify` (or user-provided) | none beyond defaults |

Common properties on every event: `repo`, `workflow`, `run_id`, `github_event`, `github_action`, `ref`, `sha`, `actor`.

`user_id` is set to `gh:<owner>/<repo>` so Amplitude groups events by repository. `insert_id` is set to `${runId}-${runNumber}-${eventName}` (that is: run id + run number + event name, with no job identifier) so deduplication/idempotency expectations match the workflow's actual payload construction.

### What is *not* sent

* No issue/PR body text, comments, diffs, or file contents.
* No PII is intentionally collected beyond public GitHub metadata already associated with the event.
* Issue/PR titles and push `head_commit_message` are forwarded as-is by the workflow and may contain sensitive text, including PII, if authors include it.
* No secret values, no environment dumps.

---

## 5. Verification

Manually trigger the workflow from *Actions → Amplitude — Repo Event Telemetry → Run workflow*. The job will:

1. Confirm `AMPLITUDE_API_KEY` and the chosen region.
2. Build the event JSON and write it to the Action run summary.
3. POST it to Amplitude and assert HTTP 2xx.

Then confirm the event landed in Amplitude *User Lookup → search `gh:midnghtsapphire/revvel-standards`*.

---

## 6. Adopting in a sibling repo

Drop `.github/workflows/amplitude-events.yml` into the sibling repo unchanged, set the `AMPLITUDE_API_KEY` secret (and optionally `AMPLITUDE_REGION` / `AMPLITUDE_ENABLED` variables), and the same event schema will flow with that repo's slug as `user_id`. No code changes required.
