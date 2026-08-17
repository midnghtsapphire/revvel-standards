# Revvel Automated Audit Agent Standard

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Manual code review is insufficient for continuous security and quality assurance across a growing portfolio of applications. Revvel mandates **autonomous audit agents** that operate 24/7, scanning code, dependencies, configurations, and infrastructure for security vulnerabilities, quality regressions, compliance drift, and performance degradation — automatically raising issues and applying remediations without human intervention.

This standard defines the architecture, toolchain, workflows, and behavioral contracts for automated review and audit agents across all Revvel and MIDNGHTSAPPHIRE repositories.

---

## 2. Core Principles

- **Always-on** — agents run on every push, every PR, and on scheduled intervals. There is no "off switch" in production.
- **Fail fast, fix faster** — when an agent detects an issue, it opens a PR with the fix before raising an alert.
- **Evidence-based alerts** — every alert includes the rule triggered, the file and line number, the CVSS or severity score, and a recommended remediation.
- **Human escalation as a last resort** — agents attempt automated remediation first; they escalate to a human only after exhausting automated options (see Ralph Loop in `AGENT_FACTORY_STANDARD.md`).
- **Immutable audit trail** — every agent action produces a signed, timestamped log entry that is archived and never mutated.

---

## 3. Agent Taxonomy

| Agent | Trigger | Primary Role |
|-------|---------|--------------|
| **Security Scanner** | Push, PR, schedule | SAST, secret scanning, dependency CVEs |
| **Code Quality Agent** | Push, PR | Lint, complexity, dead code, style drift |
| **Dependency Watcher** | Schedule (daily) | New CVEs, outdated packages, license drift |
| **Config Drift Detector** | Push, schedule | Env var drift, IaC diff, config schema violations |
| **Compliance Auditor** | Schedule (weekly) | OWASP, CWE, HIPAA, SOC2 mapping |
| **Performance Regression Detector** | Push, PR | Bundle size, Lighthouse, DB query cost |
| **Remediation Bot** | Alert from any agent | Auto-fix PRs, dependency bumps |
| **Incident Responder** | P0/P1 alert | Rollback, quarantine, stakeholder notify |

---

## 4. 24/7 Continuous Security Scanning

### 4.1. Always-On Security Workflow

```yaml
# templates/cicd/audit-agent.yml
name: Automated Audit Agent

on:
  push:
    branches: ["**"]
  pull_request:
  schedule:
    - cron: "0 */4 * * *"    # full scan every 4 hours

concurrency:
  group: audit-${{ github.ref }}
  cancel-in-progress: false  # never cancel security scans

jobs:
  sast:
    name: Static Application Security Testing
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Semgrep SAST scan
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/nodejs
            p/typescript
            p/secrets
          auditOn: push

      - name: Upload SARIF report
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif

  secret-scan:
    name: TruffleHog Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified

  dependency-audit:
    name: Dependency Vulnerability Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Audit with OSV scanner
        uses: google/osv-scanner-action@v1.9.0
        with:
          scan-args: |-
            --lockfile=pnpm-lock.yaml
            --format=sarif
            --output=osv-results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: osv-results.sarif

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    strategy:
      matrix:
        language: [javascript-typescript]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

### 4.2. SAST Rule Sets

Every Revvel application must enable the following Semgrep rule packs:

| Rule Pack | Coverage |
|-----------|---------|
| `p/owasp-top-ten` | OWASP A01–A10 |
| `p/nodejs` | Node.js-specific vulnerabilities |
| `p/typescript` | TypeScript type safety and injection |
| `p/secrets` | Hardcoded credentials and tokens |
| `p/jwt` | JWT misconfiguration |
| `p/sql-injection` | SQL injection patterns |
| `p/xss` | Cross-site scripting |
| `p/command-injection` | Shell injection |
| `p/prototype-pollution` | Prototype pollution |

---

## 5. Code Quality Enforcement

### 5.1. Quality Gate Thresholds

```yaml
# .quality-gate.yml — checked by the quality agent
thresholds:
  complexity:
    max_cyclomatic: 15          # Per-function cyclomatic complexity
    max_cognitive: 20           # Cognitive complexity (sonar method)
  coverage:
    min_line_coverage: 80       # %
    min_branch_coverage: 70     # %
  duplication:
    max_duplicated_blocks: 3    # Per-file duplicate blocks
  bundle_size:
    max_js_kb: 500              # Total JS bundle (gzipped)
    max_increase_kb: 20         # Max increase per PR
  debt:
    max_new_issues_per_pr: 5
```

### 5.2. Quality Agent Workflow

```yaml
# Runs on every PR
  quality-gate:
    name: Code Quality Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: ESLint with quality rules
        run: |
          pnpm dlx eslint . \
            --max-warnings 0 \
            --format json \
            --output-file eslint-report.json || true

      - name: Complexity analysis
        run: |
          npx complexity-report \
            --format json \
            --output complexity-report.json \
            src/

      - name: Evaluate quality gate
        run: python scripts/audit/quality_gate.py \
          --eslint eslint-report.json \
          --complexity complexity-report.json \
          --config .quality-gate.yml
```

---

## 6. Dependency Vulnerability Monitoring

### 6.1. Continuous Dependency Watch

```yaml
# templates/cicd/dependency-watch.yml
name: Dependency Vulnerability Watch

on:
  schedule:
    - cron: "0 8 * * *"      # daily at 8am UTC
  workflow_dispatch:

jobs:
  dependency-watch:
    name: Monitor New CVEs for Dependencies
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile

      - name: Check for new vulnerabilities since yesterday
        run: |
          pnpm audit --json > /tmp/audit-$(date +%Y%m%d).json || true
          python scripts/audit/diff_vulns.py \
            --today /tmp/audit-$(date +%Y%m%d).json \
            --baseline reports/vuln-baseline.json \
            --output reports/new-vulns.json

      - name: Open issue for new CVEs
        if: ${{ hashFiles('reports/new-vulns.json') != '' }}
        uses: actions/github-script@v8
        with:
          script: |
            const fs = require('fs');
            const newVulns = JSON.parse(fs.readFileSync('reports/new-vulns.json'));
            if (newVulns.length === 0) return;
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[VULN] ${newVulns.length} new CVEs detected in dependencies`,
              labels: ['vulnerability', 'auto-fix', 'copilot'],
              assignees: ['copilot'],
              body: [
                '## New Vulnerabilities Detected',
                '',
                '| Package | Version | CVE | Severity |',
                '|---------|---------|-----|----------|',
                ...newVulns.map(v =>
                  `| ${v.package} | ${v.version} | ${v.cve} | ${v.severity} |`
                ),
                '',
                '_Opened automatically by the Dependency Watch agent._'
              ].join('\n')
            });
```

### 6.2. License Compliance

```bash
# Fail CI if any dependency has a prohibited license
npx license-checker \
  --excludePrivatePackages \
  --failOn "AGPL-3.0;GPL-2.0;GPL-3.0;LGPL-2.0;LGPL-2.1;LGPL-3.0;CDDL-1.0" \
  --json > reports/licenses.json
```

Prohibited licenses for commercial apps: AGPL, GPL, LGPL, CDDL, EPL (without exception).  
Required in reports: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.

---

## 7. Configuration Drift Detection

### 7.1. What Drift Detection Covers

| Category | What is Monitored |
|----------|-------------------|
| Environment variables | New `.env.example` keys without corresponding GitHub Secret |
| IaC (Terraform) | Planned changes vs. applied state (`terraform plan` diff) |
| Docker images | Base image versions, added `RUN` layers |
| GitHub Actions | Pinned action SHA vs. latest published SHA |
| Security headers | Helmet.js config vs. `SECURITY_STANDARD.md` requirements |
| Dependency lock file | Unexpected changes to `pnpm-lock.yaml` |

### 7.2. Drift Detection Workflow

```yaml
# templates/cicd/drift-detect.yml
name: Configuration Drift Detection

on:
  push:
    paths:
      - ".env.example"
      - "Dockerfile*"
      - "terraform/**"
      - ".github/workflows/**"
      - "pnpm-lock.yaml"
  schedule:
    - cron: "0 6 * * *"

jobs:
  drift:
    name: Detect Configuration Drift
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Check action SHA pinning
        run: python scripts/audit/check_action_pins.py .github/workflows/

      - name: Validate env var coverage
        run: python scripts/audit/check_env_coverage.py \
          --env-example .env.example \
          --secrets-ref .github/required_secrets.txt

      - name: Docker base image freshness
        run: python scripts/audit/check_docker_base.py Dockerfile

      - name: Security header drift
        run: python scripts/audit/check_security_headers.py src/
```

### 7.3. Action SHA Pinning Requirement

All GitHub Actions must be pinned to a full commit SHA, not a mutable tag:

```yaml
# WRONG
- uses: actions/checkout@v4

# CORRECT
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

The drift detector will fail CI on any action reference using a mutable tag (`v4`, `latest`, `main`, etc.).

---

## 8. Compliance Auditing

### 8.1. OWASP Top 10 Coverage Matrix

The compliance auditor maps every finding to OWASP and CWE identifiers:

| OWASP ID | Title | Agent | Rule Set |
|----------|-------|-------|---------|
| A01:2021 | Broken Access Control | Security Scanner | `p/owasp-top-ten` |
| A02:2021 | Cryptographic Failures | Security Scanner | Semgrep crypto rules |
| A03:2021 | Injection | Security Scanner | `p/sql-injection`, `p/xss` |
| A04:2021 | Insecure Design | Quality Agent | Architecture review |
| A05:2021 | Security Misconfiguration | Config Drift | Header/CORS audit |
| A06:2021 | Vulnerable Components | Dependency Watcher | OSV, pnpm audit |
| A07:2021 | Auth Failures | Security Scanner | `p/jwt`, auth rules |
| A08:2021 | Software Integrity Failures | Config Drift | Action SHA pins |
| A09:2021 | Logging Failures | Compliance Auditor | Log presence check |
| A10:2021 | SSRF | Security Scanner | Semgrep SSRF rules |

### 8.2. Compliance Report Generation

```yaml
# Weekly compliance report
  compliance-report:
    name: Weekly Compliance Report
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate OWASP compliance matrix
        run: python scripts/audit/compliance_report.py \
          --sarif-dir .sarif/ \
          --output reports/compliance-$(date +%Y-W%V).md

      - name: Post summary to PR/Slack
        run: python scripts/audit/notify.py \
          --report reports/compliance-$(date +%Y-W%V).md \
          --channel osint-alerts
```

---

## 9. Performance Regression Detection

### 9.1. Monitored Metrics

| Metric | Tool | Threshold |
|--------|------|-----------|
| JS bundle size | `size-limit` | Max +20 KB per PR |
| Lighthouse Performance | `lhci` | Min score 85 |
| Lighthouse Accessibility | `lhci` | Min score 90 |
| Core Web Vitals (LCP) | `lhci` | Max 2.5s |
| DB query cost | `EXPLAIN ANALYZE` | Max +20% per query |
| API response time | k6 / autocannon | Max p95 500ms |

```yaml
# In CI workflow
  perf-check:
    name: Performance Regression Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Check bundle size
        run: pnpm exec size-limit --json > reports/bundle-size.json

      - name: Lighthouse CI
        run: |
          pnpm dlx @lhci/cli autorun \
            --config=lighthouserc.json \
            --upload.target=temporary-public-storage
```

---

## 10. Automated Remediation Workflows

### 10.1. Remediation Priority Ladder

```text
P0 — Critical CVE or verified secret leak
  → Immediate: block merge, open incident, attempt auto-fix PR within 5 minutes

P1 — High severity finding
  → Within 1 hour: auto-fix PR opened, assigned to @copilot

P2 — Medium severity finding
  → Within 24 hours: issue opened with fix instructions

P3 — Low severity / informational
  → Weekly batch: grouped into single issue for human review
```

### 10.2. Auto-Fix PR Pattern

```python
# scripts/audit/auto_fix.py — opens a PR with automated fix
import os
import subprocess
from github import Github  # PyGithub

def open_fix_pr(repo_name: str, branch: str, fix_commit_msg: str, body: str):
    g = Github(os.environ["GITHUB_TOKEN"])
    repo = g.get_repo(repo_name)
    default = repo.default_branch

    # Create fix branch
    ref = repo.get_git_ref(f"heads/{default}")
    repo.create_git_ref(f"refs/heads/{branch}", ref.object.sha)

    # Push fixes (assumes local git state is ready)
    subprocess.run(["git", "push", "origin", branch], check=True)

    # Open PR
    repo.create_pull(
        title=f"[AUTO-FIX] {fix_commit_msg}",
        body=body + "\n\n_Opened automatically by the Remediation Bot._",
        head=branch,
        base=default,
        labels=["auto-fix", "security"],
    )
```

### 10.3. Dependency Bump Automation

Dependabot handles routine dependency bumps (see `DEPENDABOT_STANDARD.md`). The Remediation Bot supplements it for **P0/P1 CVEs only**, applying fixes without waiting for the Dependabot schedule:

```yaml
# templates/cicd/auto-fix.yml — P0 emergency dependency patch
  emergency-patch:
    if: ${{ contains(github.event.issue.labels.*.name, 'vulnerability') && contains(github.event.issue.labels.*.name, 'auto-fix') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable && pnpm install --frozen-lockfile

      - name: Parse vulnerable package from issue
        id: parse
        run: python scripts/audit/parse_vuln_issue.py "${{ github.event.issue.body }}"

      - name: Bump package
        run: pnpm update ${{ steps.parse.outputs.package }} --latest

      - name: Create fix PR
        run: python scripts/audit/auto_fix.py \
          --repo "${{ github.repository }}" \
          --branch "fix/vuln-${{ steps.parse.outputs.package }}-$(date +%Y%m%d)" \
          --message "fix(deps): patch ${{ steps.parse.outputs.package }} CVE"
```

---

## 11. Alert and Notification Systems

### 11.1. Alert Routing

| Severity | Channel | SLA |
|----------|---------|-----|
| P0 Critical | PagerDuty + Slack `#security-p0` | Immediate (< 5 min) |
| P1 High | Slack `#security-alerts` + GitHub Issue | < 1 hour |
| P2 Medium | GitHub Issue | < 24 hours |
| P3 Low | Weekly digest email | Weekly |
| Compliance | `#compliance-reports` Slack | Weekly |

### 11.2. Alert Schema

```json
{
  "alert_id": "uuid-v4",
  "timestamp": "2026-04-14T18:00:00Z",
  "severity": "P1",
  "agent": "dependency-watcher",
  "repository": "midnghtsapphire/growlingeyes",
  "finding": {
    "type": "CVE",
    "cve": "CVE-2025-12345",
    "package": "express",
    "version": "4.18.1",
    "cvss_score": 8.1,
    "fix_available": "4.19.0"
  },
  "remediation": {
    "action": "bump_dependency",
    "pr_url": "https://github.com/..."
  },
  "owasp_mapping": "A06:2021"
}
```

### 11.3. Slack Alert Workflow Step

```yaml
- name: Send Slack alert
  if: failure()
  run: |
    python scripts/audit/slack_alert.py \
      --webhook "${{ secrets.SECURITY_SLACK_WEBHOOK }}" \
      --severity "${{ steps.scan.outputs.severity }}" \
      --finding "${{ steps.scan.outputs.summary }}" \
      --repo "${{ github.repository }}" \
      --run-url "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

---

## 12. Self-Healing System Patterns

The **Ralph Loop** (`templates/cicd/ralph-loop.yml`) is the CI implementation of the self-healing loop defined in `AGENT_FACTORY_STANDARD.md`. The Automated Audit Agent integrates with the Ralph Loop by:

1. Emitting structured failure JSON when a scan fails.
2. Tagging GitHub Issues with `ralph-loop` + `auto-fix` + `copilot`.
3. Providing a minimal reproduction command in the issue body.
4. Assigning `@copilot` as the default fixer.

```yaml
# In any audit job — standardized failure handler
  on-failure:
    if: failure()
    needs: [sast, secret-scan, dependency-audit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v8
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[RALPH] Audit failure in run #${context.runId}`,
              labels: ['ralph-loop', 'auto-fix', 'copilot'],
              assignees: ['copilot'],
              body: `## Audit Agent Failure\n\n` +
                    `**Run:** ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}\n` +
                    `**Commit:** ${context.sha}\n` +
                    `**Branch:** ${context.ref}\n\n` +
                    `## Reproduction\n\`\`\`bash\ngit checkout ${context.sha}\npnpm install\nnpx semgrep --config p/owasp-top-ten src/\n\`\`\``
            });
```

---

## 13. Audit Agent Directory Structure

```text
scripts/
└── audit/
    ├── quality_gate.py        # Quality threshold evaluator
    ├── diff_vulns.py          # Detect new CVEs vs. baseline
    ├── compliance_report.py   # OWASP compliance matrix
    ├── check_action_pins.py   # Validate SHA-pinned actions
    ├── check_env_coverage.py  # Env var vs. secrets coverage
    ├── check_docker_base.py   # Docker base image freshness
    ├── check_security_headers.py  # Helmet.js header audit
    ├── auto_fix.py            # Auto-fix PR opener
    ├── parse_vuln_issue.py    # Parse vuln info from issues
    ├── slack_alert.py         # Alert dispatcher
    └── notify.py              # Multi-channel notifier

reports/
├── compliance-*.md            # Weekly OWASP matrices
├── vuln-baseline.json         # Vuln baseline snapshot
├── bundle-size.json           # Bundle size history
└── new-vulns.json             # Delta: newly found CVEs
```

---

## 14. Required GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `SECURITY_SLACK_WEBHOOK` | Security alert channel |
| `PAGERDUTY_INTEGRATION_KEY` | P0 critical escalation |
| `GITHUB_TOKEN` | Auto-fix PR creation (built-in) |
| `SEMGREP_APP_TOKEN` | Semgrep Cloud dashboard (optional) |

---

## 15. References

- `AGENT_FACTORY_STANDARD.md` — Ralph Loop and agent orchestration
- `SECURITY_STANDARD.md` — base security requirements
- `OSINT_STANDARD.md` — threat intelligence that feeds into audit agents
- `API_GATEKEEPER_STANDARD.md` — gatekeeper enforcement of audit findings
- `templates/cicd/security.yml` — base security workflow template
- `templates/cicd/auto-fix.yml` — automated fix PR workflow
- `templates/cicd/ralph-loop.yml` — self-healing CI loop
- Semgrep: <https://semgrep.dev/docs>
- OSV Scanner: <https://google.github.io/osv-scanner>
- Lighthouse CI: <https://github.com/GoogleChrome/lighthouse-ci>
