# Security Fleet

Five agents, one job each. Every member of this fleet is expert at exactly
one security concern — an AI-exploit red team built on the same
one-job-per-agent model as
[`skills/agentic-workflow-fleet/`](../agentic-workflow-fleet/SKILL.md).
The fleet's scope is **red teaming this repo's own automation**: workflows,
agent-consumed inputs, secrets, and permissions.

Machine-readable definition: [`SECURITY_FLEET.yml`](./SECURITY_FLEET.yml).
Personas are **derived, not hand-copied**: `scripts/build-agent-creator-data.js`
folds this file into `agent-creator-data.json`, and
`scripts/openrouter-personas.js` registers the members from that catalog —
`SECURITY_FLEET.yml` stays the single source of truth.

## The five members

| Handle | Name | Pattern | Group | One job |
| --- | --- | --- | --- | --- |
| `@sentinel` | Tripwire | Prompt-Injection Detection | Agent Input Defense | Scan issue/PR/comment/WR text for instruction-smuggling before agents consume it (S-MOS §4 log-poisoning tripwire) |
| `@exprwatch` | Hardline | Untrusted-Expression Auditing | Workflow Hardening | Find untrusted `${{ github.event.* }}` interpolated into `run:` shells across all workflows (CLAUDE.md gotcha #4) |
| `@exfil` | Blackout | Secret-Exfil Detection | Data Exfiltration Defense | Watch diffs and logs for leaked tokens; extends `secrets-sentinel.yml` |
| `@permit` | Keysmith | Permission Minimization | Least Privilege | Audit per-workflow `permissions:` vs what the jobs actually do (CLAUDE.md gotcha #3) |
| `@redteam` | Foxglove | Adversarial Red Teaming | Offense-Informed Defense | `scripts/patch-agent.js` dependency lane plus adversarial test generation against our own agents |

## Lanes and findings

Detectors live in [`scripts/security-fleet.js`](../../scripts/security-fleet.js)
(pure, deterministic, no network). The workflow
[`.github/workflows/security-fleet.yml`](../../.github/workflows/security-fleet.yml)
gives each member a lane:

- **Event lane** — `@sentinel` runs on `issues`, `issue_comment`, and
  `pull_request` events, scanning the event body (passed via `env:`, never
  interpolated into the shell).
- **Scheduled lane** — `@exprwatch`, `@exfil`, `@permit`, and `@redteam`
  sweep the repo weekly.

Findings are filed as issues labeled `security` + `security-fleet`, deduped
by a stable title so scheduled lanes never spam the tracker.

## Reuse first — the fleet coordinates, it does not duplicate

- [`skills/security/`](../security/SKILL.md) — OWASP P0 requirements the
  fleet enforces, not re-states.
- [`skills/vault-agent/`](../vault-agent/SKILL.md) — secret provisioning;
  `@exfil` detects leaks, vault-agent owns storage.
- `.github/workflows/secrets-sentinel.yml` — audits *configured* secrets;
  `@exfil` extends it to *leaked* secrets in diffs and logs.
- `skills/patch-agent/` + `scripts/patch-agent.js` — `@redteam`'s
  dependency lane invokes it, never reimplements it.
- The security-review skill — deep human-grade review; the fleet is the
  always-on tripwire in front of it.

## Seeded catches

Every member has one demonstrated catch on a seeded test case in
[`tests/security-fleet.test.js`](../../tests/security-fleet.test.js). A
detector without a proven catch does not ship — that is a charter rule.

## CLI

```bash
node scripts/security-fleet.js sentinel --text "body to scan"
node scripts/security-fleet.js exprwatch          # sweep .github/workflows
node scripts/security-fleet.js exfil --text "$(git diff origin/main)"
node scripts/security-fleet.js permit             # sweep .github/workflows
node scripts/security-fleet.js redteam            # detector coverage + patch-agent
```

Each command prints findings and exits 0 (report-only); pass `--json` for
machine-readable output and `--strict` to exit 1 when findings exist.
