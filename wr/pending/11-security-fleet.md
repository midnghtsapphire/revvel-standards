# [WR] Security fleet — AI-exploit red team as single-job pattern experts

## Output Type

internal-script-automation

## Objective

Stand up a security fleet on the same one-job-per-agent model as
`skills/agentic-workflow-fleet/` (FLEET.yml shape, personas derived, not
hand-copied). Members, each expert at exactly one thing:

1. **Prompt-injection sentinel** — scans issue/PR/comment text and WR
   bodies for instruction-smuggling before agents consume them (the fleet
   ingests untrusted text constantly).
2. **Expression auditor** — untrusted `${{ github.event.* }}` interpolated
   into `run:` shells (CLAUDE.md gotcha #4) across all ~170 workflows.
3. **Secret-exfil watcher** — diffs and logs for leaked tokens; extends
   existing secrets-sentinel.yml.
4. **Permission minimizer** — per-workflow `permissions:` audit vs what the
   job actually does (gotcha #3).
5. **Dependency/red-team lane** — scripts/patch-agent.js plus adversarial
   test generation against our own agents (charter already names
   red-teaming under Security & Governance).

Reuse first: `skills/security/`, `skills/vault-agent/`, secrets-sentinel,
security-review skill. The fleet coordinates them; it does not duplicate.

## Definition of Done

- SECURITY_FLEET.yml registered in SKILLS_INDEX; personas resolve
- Each member has a scheduled or event lane and files labeled findings
- One demonstrated catch per member on a seeded test case
