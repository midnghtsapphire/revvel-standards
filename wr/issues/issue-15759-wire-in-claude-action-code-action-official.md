# WR: [WR] Wire-in Claude Action Code Action Official

**Issue:** #15759  
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

Wire-in Claude Action Code Action Official

### Objective

Claude Code Action
A general-purpose Claude Code action for GitHub PRs and issues that can answer questions and implement code changes. This action intelligently detects when to activate based on your workflow context—whether responding to @claude mentions, issue assignments, or executing automation tasks with explicit prompts. It supports multiple authentication methods including Anthropic direct API (API key or workload identity federation), Amazon Bedrock, Google Vertex AI, and Microsoft Foundry.

Features
🎯 Intelligent Mode Detection: Automatically selects the appropriate execution mode based on your workflow context—no configuration needed
🤖 Interactive Code Assistant: Claude can answer questions about code, architecture, and programming
🔍 Code Review: Analyzes PR changes and suggests improvements
✨ Code Implementation: Can implement simple fixes, refactoring, and even new features
💬 PR/Issue Integration: Works seamlessly with GitHub comments and PR reviews
🛠️ Flexible Tool Access: Access to GitHub APIs and file operations (additional tools can be enabled via configuration)
📋 Progress Tracking: Visual progress indicators with checkboxes that dynamically update as Claude completes tasks
📊 Structured Outputs: Get validated JSON results that automatically become GitHub Action outputs for complex automations
🏃 Runs on Your Infrastructure: The action executes entirely on your own GitHub runner (Anthropic API calls go to your chosen provider)
⚙️ Simplified Configuration: Unified prompt and claude_args inputs provide clean, powerful configuration aligned with Claude Code SDK
📦 Upgrading from v0.x?
See our Migration Guide for step-by-step instructions on updating your workflows to v1.0. The new version simplifies configuration while maintaining compatibility with most existing setups.

Quickstart
The easiest way to set up this action is through Claude Code in the terminal. Just open claude and run /install-github-app.

This command will guide you through setting up the GitHub app and required secrets.

Note:

You must be a repository admin to install the GitHub app and add secrets
This quickstart method is only available for direct Anthropic API users. For AWS Bedrock, Google Vertex AI, or Microsoft Foundry setup, see docs/cloud-providers.md.
📚 Solutions & Use Cases
Looking for specific automation patterns? Check our Solutions Guide for complete working examples including:

🔍 Automatic PR Code Review - Full review automation
📂 Path-Specific Reviews - Trigger on critical file changes
👥 External Contributor Reviews - Special handling for new contributors
📝 Custom Review Checklists - Enforce team standards
🔄 Scheduled Maintenance - Automated repository health checks
🏷️ Issue Triage & Labeling - Automatic categorization
📖 Documentation Sync - Keep docs updated with code changes
🔒 Security-Focused Reviews - OWASP-aligned security analysis
📊 DIY Progress Tracking - Create tracking comments in automation mode
Each solution includes complete working examples, configuration details, and expected outcomes.

Documentation
Solutions Guide - 🎯 Ready-to-use automation patterns
Migration Guide - ⭐ Upgrading from v0.x to v1.0
Setup Guide - Manual setup, custom GitHub apps, and security best practices
Usage Guide - Basic usage, workflow configuration, and input parameters
Custom Automations - Examples of automated workflows and custom prompts
Configuration - MCP servers, permissions, environment variables, and advanced settings
Experimental Features - Execution modes and network restrictions
Cloud Providers - AWS Bedrock, Google Vertex AI, and Microsoft Foundry setup
Capabilities & Limitations - What Claude can and cannot do
Security - Access control, permissions, and commit signing
FAQ - Common questions and troubleshooting
📚 FAQ
Having issues or questions? Check out our Frequently Asked Questions for solutions to common problems and detailed explanations of Claude's capabilities and limitations.

License
This project is licensed under the MIT License—see the LICENSE file for details

### Required Bundle

- name: Claude Code Action Official
  uses: anthropics/claude-code-action@v1
Upgrading from v0.x?
See our [Migration Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/migration-guide.md) for step-by-step instructions on updating your workflows to v1.0. The new version simplifies configuration while maintaining compatibility with most existing setups.

Quickstart
The easiest way to set up this action is through [Claude Code](https://claude.ai/code) in the terminal. Just open claude and run /install-github-app.

This command will guide you through setting up the GitHub app and required secrets.

Note:

You must be a repository admin to install the GitHub app and add secrets
This quickstart method is only available for direct Anthropic API users. For AWS Bedrock, Google Vertex AI, or Microsoft Foundry setup, see [docs/cloud-providers.md](https://github.com/anthropics/claude-code-action/blob/main/docs/cloud-providers.md).
📚 Solutions & Use Cases
Looking for specific automation patterns? Check our [Solutions Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md) for complete working examples including:

🔍 Automatic PR Code Review - Full review automation
📂 Path-Specific Reviews - Trigger on critical file changes
👥 External Contributor Reviews - Special handling for new contributors
📝 Custom Review Checklists - Enforce team standards
🔄 Scheduled Maintenance - Automated repository health checks
🏷️ Issue Triage & Labeling - Automatic categorization
📖 Documentation Sync - Keep docs updated with code changes
🔒 Security-Focused Reviews - OWASP-aligned security analysis
📊 DIY Progress Tracking - Create tracking comments in automation mode
Each solution includes complete working examples, configuration details, and expected outcomes.

Documentation
[Solutions Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md) - 🎯 Ready-to-use automation patterns
[Migration Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/migration-guide.md) - ⭐ Upgrading from v0.x to v1.0
[Setup Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md) - Manual setup, custom GitHub apps, and security best practices
[Usage Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md) - Basic usage, workflow configuration, and input parameters
[Custom Automations](https://github.com/anthropics/claude-code-action/blob/main/docs/custom-automations.md) - Examples of automated workflows and custom prompts
[Configuration](https://github.com/anthropics/claude-code-action/blob/main/docs/configuration.md) - MCP servers, permissions, environment variables, and advanced settings
[Experimental Features](https://github.com/anthropics/claude-code-action/blob/main/docs/experimental.md) - Execution modes and network restrictions
[Cloud Providers](https://github.com/anthropics/claude-code-action/blob/main/docs/cloud-providers.md) - AWS Bedrock, Google Vertex AI, and Microsoft Foundry setup
[Capabilities & Limitations](https://github.com/anthropics/claude-code-action/blob/main/docs/capabilities-and-limitations.md) - What Claude can and cannot do
[Security](https://github.com/anthropics/claude-code-action/blob/main/docs/security.md) - Access control, permissions, and commit signing
[FAQ](https://github.com/anthropics/claude-code-action/blob/main/docs/faq.md) - Common questions and troubleshooting
📚 FAQ

### Definition of Done

Automatic PR Code Review - Full review automation
📂 Path-Specific Reviews - Trigger on critical file changes
👥 External Contributor Reviews - Special handling for new contributors
📝 Custom Review Checklists - Enforce team standards
🔄 Scheduled Maintenance - Automated repository health checks
🏷️ Issue Triage & Labeling - Automatic categorization
📖 Documentation Sync - Keep docs updated with code changes
🔒 Security-Focused Reviews - OWASP-aligned security analysis
📊 DIY Progress Tracking - Create tracking comments in automation mode
Each solution includes complete working examples, configuration details, and expected outcomes.

### Do Not Under-Scope

Read all links and different use cases
name: Claude Auto Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Please review this pull request with a focus on:
            - Code quality and best practices
            - Potential bugs or issues
            - Security implications
            - Performance considerations

            Note: The PR branch is already checked out in the current working directory.

            Use `gh pr comment` for top-level feedback.
            Use `mcp__github_inline_comment__create_inline_comment` (with `confirmed: true`) to highlight specific code issues.
            Only post GitHub comments - don't submit review text as messages.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr diff:_),Bash(gh pr view:*)"

### Explicit Exclusions

Nothing

### Delivery Shape

One PR

### Sellable Artifact Bundle

name: PR Review Checklist
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  checklist-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Review this PR against our team checklist:

            ## Code Quality
            - [ ] Code follows our style guide
            - [ ] No commented-out code
            - [ ] Meaningful variable names
            - [ ] DRY principle followed

            ## Testing
            - [ ] Unit tests for new functions
            - [ ] Integration tests for new endpoints
            - [ ] Edge cases covered
            - [ ] Test coverage > 80%

            ## Documentation
            - [ ] README updated if needed
            - [ ] API docs updated
            - [ ] Inline comments for complex logic
            - [ ] CHANGELOG.md updated

            ## Security
            - [ ] No hardcoded credentials
            - [ ] Input validation implemented
            - [ ] Proper error handling
            - [ ] No sensitive data in logs

            For each item, check if it's satisfied and comment on any that need attention.
            Post a summary comment with checklist results.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:*)"
name: Issue Triage
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            ISSUE NUMBER: ${{ github.event.issue.number }}
            TITLE: ${{ github.event.issue.title }}
            BODY: ${{ github.event.issue.body }}
            AUTHOR: ${{ github.event.issue.user.login }}

            Analyze this new issue and:
            1. Determine if it's a bug report, feature request, or question
            2. Assess priority (critical, high, medium, low)
            3. Suggest appropriate labels
            4. Check if it duplicates existing issues

            Use ./scripts/gh.sh to interact with GitHub:
            - `./scripts/gh.sh issue view [number]` to view the issue
            - `./scripts/gh.sh search issues "query"` to find similar issues
            - `./scripts/gh.sh label list` to see available labels

            Based on your analysis, add the appropriate labels using:
            `./scripts/edit-issue-labels.sh --add-label "label1" --add-label "label2"`
            (the issue number is read automatically from the workflow event)

            If it appears to be a duplicate, post a comment mentioning the original issue.

          claude_args: |
            --allowedTools "Bash(./scripts/gh.sh:_),Bash(./scripts/edit-issue-labels.sh:_)"
name: Issue Triage
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            ISSUE NUMBER: ${{ github.event.issue.number }}
            TITLE: ${{ github.event.issue.title }}
            BODY: ${{ github.event.issue.body }}
            AUTHOR: ${{ github.event.issue.user.login }}

            Analyze this new issue and:
            1. Determine if it's a bug report, feature request, or question
            2. Assess priority (critical, high, medium, low)
            3. Suggest appropriate labels
            4. Check if it duplicates existing issues

            Use ./scripts/gh.sh to interact with GitHub:
            - `./scripts/gh.sh issue view [number]` to view the issue
            - `./scripts/gh.sh search issues "query"` to find similar issues
            - `./scripts/gh.sh label list` to see available labels

            Based on your analysis, add the appropriate labels using:
            `./scripts/edit-issue-labels.sh --add-label "label1" --add-label "label2"`
            (the issue number is read automatically from the workflow event)

            If it appears to be a duplicate, post a comment mentioning the original issue.

          claude_args: |
            --allowedTools "Bash(./scripts/gh.sh:_),Bash(./scripts/edit-issue-labels.sh:_)"
name: Sync API Documentation
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - "src/api/**/*.ts"
      - "src/routes/**/*.ts"

jobs:
  doc-sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          fetch-depth: 0

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            This PR modifies API endpoints. Please:

            1. Review the API changes in src/api and src/routes
            2. Update API.md to document any new or changed endpoints
            3. Ensure OpenAPI spec is updated if needed
            4. Update example requests/responses

            Use standard REST API documentation format.
            Commit any documentation updates to this PR branch.

          claude_args: |
            --allowedTools "Read,Write,Edit,Bash(git:*)
name: Security Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          # Optional: Add track_progress: true for visual progress tracking during security reviews
          # track_progress: true
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Perform a comprehensive security review:

            ## OWASP Top 10 Analysis
            - SQL Injection vulnerabilities
            - Cross-Site Scripting (XSS)
            - Broken Authentication
            - Sensitive Data Exposure
            - XML External Entities (XXE)
            - Broken Access Control
            - Security Misconfiguration
            - Cross-Site Request Forgery (CSRF)
            - Using Components with Known Vulnerabilities
            - Insufficient Logging & Monitoring

            ## Additional Security Checks
            - Hardcoded secrets or credentials
            - Insecure cryptographic practices
            - Unsafe deserialization
            - Server-Side Request Forgery (SSRF)
            - Race conditions or TOCTOU issues

            Rate severity as: CRITICAL, HIGH, MEDIUM, LOW, or NONE.
            Post detailed findings with recommendations.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr diff:_)"
name: Security Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          # Optional: Add track_progress: true for visual progress tracking during security reviews
          # track_progress: true
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Perform a comprehensive security review:

            ## OWASP Top 10 Analysis
            - SQL Injection vulnerabilities
            - Cross-Site Scripting (XSS)
            - Broken Authentication
            - Sensitive Data Exposure
            - XML External Entities (XXE)
            - Broken Access Control
            - Security Misconfiguration
            - Cross-Site Request Forgery (CSRF)
            - Using Components with Known Vulnerabilities
            - Insufficient Logging & Monitoring

            ## Additional Security Checks
            - Hardcoded secrets or credentials
            - Insecure cryptographic practices
            - Unsafe deserialization
            - Server-Side Request Forgery (SSRF)
            - Race conditions or TOCTOU issues

            Rate severity as: CRITICAL, HIGH, MEDIUM, LOW, or NONE.
            Post detailed findings with recommendations.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr diff:_)"
name: Claude Auto Review with Tracking
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          track_progress: true # ✨ Enables tracking comments
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Please review this pull request with a focus on:
            - Code quality and best practices
            - Potential bugs or issues
            - Security implications
            - Performance considerations

            Provide detailed feedback using inline comments for specific issues.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr diff:_),Bash(gh pr view:*)"

name: Claude Auto Review with Tracking
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          track_progress: true # ✨ Enables tracking comments
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Please review this pull request with a focus on:
            - Code quality and best practices
            - Potential bugs or issues
            - Security implications
            - Performance considerations

            Provide detailed feedback using inline comments for specific issues.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr diff:_),Bash(gh pr view:*)"

name: External Contributor Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  external-review:
    if: github.event.pull_request.author_association == 'FIRST_TIME_CONTRIBUTOR'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}
            CONTRIBUTOR: ${{ github.event.pull_request.user.login }}

            This is a first-time contribution from @${{ github.event.pull_request.user.login }}.

            Please provide a comprehensive review focusing on:
            - Compliance with project coding standards
            - Proper test coverage (unit and integration)
            - Documentation for new features
            - Potential breaking changes
            - License header requirements

            Be welcoming but thorough in your review. Use inline comments for code-specific feedback.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:_),Bash(gh pr view:_)"

name: Weekly Maintenance
on:
  schedule:
    - cron: "0 0 ** 0" # Every Sunday at midnight
  workflow_dispatch: # Manual trigger option

jobs:
  maintenance:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}

            Perform weekly repository maintenance:

            1. Check for outdated dependencies in package.json
            2. Scan for security vulnerabilities using `npm audit`
            3. Review open issues older than 90 days
            4. Check for TODO comments in recent commits
            5. Verify README.md examples still work

            Create a single issue summarizing any findings.
            If critical security issues are found, also comment on open PRs.

          claude_args: |
            --allowedTools "Read,Bash(npm:_),Bash(gh issue:_),Bash(git:*)"
And more research attached links to fully wire in

### Purchase Validation (functions-as-purchased)

Implement Claude Actions Code Official-Test send WR and PR through and watchbbehavior. Follow existing test harness

### Expected Scope

3

### Validation Expectations

Save money on claude as this is an action
Track cost vs claude api, cloud, claude code 
Communicate with Audrey Evans within WR Issues system 
Show up in assignee
Be reachable by an alias at anytume? Or where?
Add him into whole system that tells me whos processing what as we go

### Blocker Rule

Still complete all non blocked items
Escalate block to me audrey evans

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
