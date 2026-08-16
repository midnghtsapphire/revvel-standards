# WR: [WR]  add Devin Reminders Action so he can self-heal, do recursive code, code review

**Issue:** #15675  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-12  
**Research Date:** 2026-07-12  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

**Issue:** N/A — completed
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-12  
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-07-12  
**WR Status:** 🟡 In Progress  

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

### Summary

add Devin Reminders Action so he can self-heal, do recursive code, code review

### Objective

Create a Devin Reminders Action that enables autonomous self-healing capabilities, recursive code generation, and automated code review functionality. This action will allow Devin to proactively identify and resolve issues, generate code that can call itself for complex problem-solving, and perform systematic code quality assessments without human intervention.

### Required Bundle

A comprehensive Devin Reminders Action bundle that includes self-healing monitoring scripts, recursive code generation templates, and automated code review workflows. The bundle must contain reminder scheduling logic, error detection and recovery mechanisms, recursive function patterns with proper termination conditions, and code quality assessment tools integrated with version control systems. This production-ready bundle should include configuration files for autonomous operation, logging systems for tracking self-healing activities, and integration points with existing development infrastructure.

### Definition of Done

The Devin Reminders Action is successfully deployed and integrated into the production environment with full autonomous capabilities. All three core functionalities are operational: self-healing detects and automatically resolves system issues, recursive code generation handles complex multi-layered problems, and automated code review performs comprehensive quality assessments. The action demonstrates reliable performance across test scenarios and maintains proper logging and monitoring for all autonomous operations.

### Do Not Under-Scope

Ensure the Devin Reminders Action includes comprehensive error handling and fallback mechanisms to prevent infinite loops in recursive operations. The self-healing capabilities must cover edge cases like memory limitations, API timeouts, and dependency conflicts. Don't limit the code review functionality to basic syntax checking - include security vulnerability detection, performance optimization suggestions, and architectural pattern validation to make it truly autonomous.

### Explicit Exclusions

This work request does not include implementing real-time monitoring dashboards, user interface components for manual intervention, or integration with external code repositories beyond the core Devin system. The scope excludes developing backup or rollback mechanisms for failed self-healing attempts, and does not cover training or documentation for human operators to override autonomous decisions.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The Devin Reminders Action should successfully trigger self-healing workflows when system anomalies are detected, automatically generating and executing corrective code. Recursive code generation must produce functional, terminating algorithms that can solve multi-layered problems through iterative self-calls. The automated code review functionality should identify syntax errors, security vulnerabilities, and performance issues while providing actionable feedback. All three capabilities should integrate seamlessly and operate without requiring human oversight or intervention.

### Blocker Rule

Devin Reminders Action
A reusable GitHub Action for scheduling, listing, cancelling, and firing reminders for Devin.ai sessions. Uses GitHub Actions artifacts for storage and the Devin API to deliver reminders.

Features
Schedule reminders for existing Devin sessions (put)
List all pending reminders and filter due items (list)
Cancel pending reminders by GUID (cancel)
Fire due reminders and clean up automatically (cron)
Optional Slack notifications (opt-in via slack-channel input)
Timezone-aware display for notification messages
Inputs
Name Description Required Default
action Action to perform: put, list, cancel, or cron Yes 
remind-at ISO 8601 timestamp with timezone offset for when the reminder fires. Must be in the future and no more than 3 days ahead. Required for put. No 
reminder-message Message to deliver when the reminder fires. Required for put. No 
agent-session-url Devin session URL to ping when the reminder fires. Required for put and cancel. No 
slack-users-cc Comma or newline-delimited list of Slack user tags to CC on notifications (e.g. <@U12345>, <@U67890>). No 
devin-token Devin API token. Yes 
slack-channel Slack channel name for notifications. Leave empty to skip Slack. No 
slack-token Slack bot token. Only needed if slack-channel is set. No 
reminder-timezone Timezone for displaying times in notifications. Accepts IANA names (e.g. America/Los_Angeles) or UTC offsets. Does not affect parsing of remind-at. No UTC
cancel-guids JSON array of reminder GUIDs to cancel. Required for cancel. No 
lock-mode Controls artifact-based locking to prevent race conditions. auto locks on put, cancel, and cron, none disables locking, always locks on all actions including list. No auto
Outputs
Name Description
reminders-json JSON array of all current reminders
due-json JSON array of reminders that are currently due
due-count Number of reminders currently due
due-guids Newline-delimited list of GUIDs for due reminders
total-count Total number of reminders in the list
item-guid GUID of the newly added reminder (only for put)
popped-count Number of reminders removed after cron firing
cancelled-count Number of reminders cancelled (only for cancel)
Usage
Schedule a Reminder
- uses: aaronsteers/devin-reminders-action@v1
  with:
    action: put
    remind-at: "2026-02-20T17:00:00-08:00"
    reminder-message: "Check on the deployment status"
    agent-session-url: "<https://app.devin.ai/sessions/abc123>"
    devin-token: ${{ secrets.DEVIN_AI_API_KEY }}
    slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
    slack-channel: devin-reminders
    reminder-timezone: America/Los_Angeles
List Reminders
- uses: aaronsteers/devin-reminders-action@v1
  id: reminders
  with:
    action: list
    devin-token: ${{ secrets.DEVIN_AI_API_KEY }}

- run: echo "Due: ${{ steps.reminders.outputs.due-count }} / Total: ${{ steps.reminders.outputs.total-count }}"
Cancel Reminders
Cancel by GUIDs for a session (requires agent-session-url + cancel-guids):

- uses: aaronsteers/devin-reminders-action@v1
  with:
    action: cancel
    agent-session-url: "<https://app.devin.ai/sessions/abc123>"
    cancel-guids: '["abc-123", "def-456"]'
    devin-token: ${{ secrets.DEVIN_AI_API_KEY }}
    slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
    slack-channel: devin-reminders
Full Workflow (Cron + Manual)
name: Devin Reminders Workflow
run-name: "Devin Reminders (${{ inputs.action || 'cron' }})"

on:
  schedule:
    - cron: "*/30* ** *"

  workflow_dispatch:
    inputs:
      action:
        description: "Action to perform: put, list, cancel, or cron"
        required: true
        type: choice
        options:
          - cron
          - list
          - put
          - cancel
      reminder_message:
        description: "Reminder message to deliver (required for 'put')."
        required: false
        type: string
      remind_at:
        description: >
          ISO 8601 timestamp with timezone offset for when the reminder fires
          (required for 'put'). Must be in the future and no more than 3 days ahead.
          Example: 2026-02-20T17:00:00-08:00
        required: false
        type: string
      agent_session_url:
        description: "Devin session URL (required for 'put' and 'cancel')."
        required: false
        type: string
      slack_users_cc:
        description: >
          Comma-delimited list of Slack user tags to CC on notifications.
          Example: '<@U12345>, <@U67890>'
        required: false
        type: string
      cancel_guids:
        description: "JSON array of reminder GUIDs to cancel (required for 'cancel')."
        required: false
        type: string

jobs:
  list-reminders:
    name: List Reminders
    runs-on: ubuntu-latest
    if: ${{ inputs.action == 'list' }}
    permissions:
      contents: read
      actions: read
    steps:
      - name: Execute reminder action
        uses: aaronsteers/devin-reminders-action@v0.4.0
        with:
          action: 'list'
          reminder-timezone: America/Los_Angeles
          devin-token: ${{ secrets.DEVIN_AI_API_KEY }}

  create-new-reminder:
    name: Create New Reminder
    runs-on: ubuntu-latest
    if: ${{ inputs.action == 'put' }}
    permissions:
      contents: read
      actions: write
    steps:
      - name: Execute reminder action
        uses: aaronsteers/devin-reminders-action@v0.4.0
        with:
          action: 'put'
          lock-mode: auto
          reminder-timezone: America/Los_Angeles
          devin-token: ${{ secrets.DEVIN_AI_API_KEY }}
          slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
          slack-channel: devin-reminders
          remind-at: ${{ inputs.remind_at }}
          reminder-message: ${{ inputs.reminder_message }}
          agent-session-url: ${{ inputs.agent_session_url }}
          slack-users-cc: ${{ inputs.slack_users_cc }}

  cancel-reminders:
    name: Cancel Reminders
    runs-on: ubuntu-latest
    if: ${{ inputs.action == 'cancel' }}
    permissions:
      contents: read
      actions: write
    steps:
      - name: Execute reminder action
        uses: aaronsteers/devin-reminders-action@v0.4.0
        with:
          action: 'cancel'
          lock-mode: auto
          reminder-timezone: America/Los_Angeles
          devin-token: ${{ secrets.DEVIN_AI_API_KEY }}
          slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
          slack-channel: devin-reminders
          agent-session-url: ${{ inputs.agent_session_url }}
          cancel-guids: ${{ inputs.cancel_guids }}

  process-reminders-due:
    name: Process Reminders Due
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'schedule' || inputs.action == 'cron' }}
    permissions:
      contents: read
      actions: write
    steps:
      - name: Execute reminder action
        uses: aaronsteers/devin-reminders-action@v0.4.0
        with:
          action: 'cron'
          lock-mode: auto
          reminder-timezone: America/Los_Angeles
          devin-token: ${{ secrets.DEVIN_AI_API_KEY }}
          slack-token: ${{ secrets.SLACK_BOT_TOKEN }}
          slack-channel: devin-reminders
How It Works
put schedules a reminder by appending it to a JSON artifact
list reads the artifact, filters due reminders, and outputs counts and JSON
cancel removes reminders matching the given GUIDs for the given session URL from the artifact
cron reads the artifact, fires each due reminder via the Devin API, pops successful ones, and uploads the updated artifact
Storage Model
Reminders are stored as a JSON array in a GitHub Actions artifact (devin-reminders-list). The artifact is persisted across workflow runs using actions/download-artifact@v4 with a run-id lookup via the GitHub API, and updated via actions/upload-artifact@v4 with overwrite: true. Old artifacts expire via the 4-day retention policy.

Important: All reminder actions (put, list, cancel, cron) must be defined in a single workflow file. GitHub Actions only allows workflows to upload artifacts to their own workflow run, so splitting actions across multiple workflow files would prevent them from sharing the same artifact.

Dependencies
actions/download-artifact@v4 — cross-run artifact download
actions/upload-artifact@v4 — artifact upload
slackapi/slack-github-action@v2 — Slack notifications (optional)
guibranco/github-artifact-lock-action@v3.0.14 — artifact-based mutex locking to prevent race conditions on concurrent put/cron runs
License

### Acknowledgements

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done.
- [ ] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [ ] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [ ] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [ ] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
N/A — completed

## Executive Summary

N/A — completed

## Step 1A — Product/Output Selections

N/A — completed

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — completed

## Step 3 — Requirements

N/A — completed

## Recommendations

N/A — completed

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — completed |
| Blocked by | N/A — completed |
| Blocks (downstream WRs) | N/A — completed |

N/A — completed

## Risks

N/A — completed

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — completed |
| Reason for replacement | N/A — completed |
| Archival status | N/A — completed |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->
