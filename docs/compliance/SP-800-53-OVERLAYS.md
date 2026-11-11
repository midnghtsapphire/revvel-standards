# REVVEL SP 800-53 readiness mapping

Who: Codex · When: 2026-11-10 · Why: WR #18343 · What: repository evidence crosswalk.

This is a REVVEL-authored, selected control mapping. It is not a NIST-issued
overlay, baseline, certification, or exhaustive set of applicable controls.
Control selection, organization-defined parameters, inherited controls, and
deployment effectiveness remain the responsibility of the system risk owner.
All listed controls are **unassessed** until operating evidence is reviewed.

| Control | Agent-specific application | Design evidence | Evidence needed for effectiveness |
| --- | --- | --- | --- |
| AC-3 Access Enforcement | Deny tool actions outside the requesting principal's grants | `mcp-servers/wr-control-plane/wr_control_plane/server.py` | Positive and negative authorization tests for each tool and tenant |
| AC-6 Least Privilege | Limit workflow and delegated-agent credentials to assigned work | `.github/workflows/agent-fallback.yml` | Runtime grants, token scopes, cross-repository denial, and revocation test |
| IA-2 Identification and Authentication | Identify human approvers separately from automation principals | `.github/workflows/pr-state-orchestrator.yml` | Issuer/subject inventory, authentication policy, expired-token rejection |
| IA-9 Service Identification and Authentication | Authenticate agent-to-agent and tool-service peers | `.mcp.json` | Peer verification and signed-message/replay tests; configuration alone is insufficient |
| AU-2 Event Logging | Record delegation, tool invocation, review, and remediation events | `.github/workflows/agent-audit-logger.yml` | Event catalog and sampled end-to-end runs including denied actions |
| AU-3 Content of Audit Records | Link principal, action, resource, time, result, and parent task | `scripts/agent-scorecard/ledger.js` | Event field completeness, clock source, and correlation tests |
| AU-9 Protection of Audit Information | Protect audit artifacts from tampering and unauthorized access | `.github/workflows/agent-audit-logger.yml` | Store access policy, integrity verification, retention and recovery test |
| CM-3 Configuration Change Control | Review and test agent-generated changes before release | `.github/workflows/merge-prosecutor.yml`, `.circleci/config.yml` | Protected-branch settings and sampled release approvals |
| IR-4 Incident Handling | Detect, diagnose, escalate, and recover agent failures | `scripts/agent-self-heal.js` | Incident drill, escalation receipt, rollback and containment results |
| CA-7 Continuous Monitoring | Observe agent health and review evidence over time | `scripts/agent-activity-monitor.js` | Monitor deployment, alert delivery, review cadence, and coverage results |
| SI-2 Flaw Remediation | Identify and remediate vulnerable dependencies | `.github/dependabot.yml` | Remediation SLA, advisory triage, patched build and regression evidence |
| SA-11 Developer Testing and Evaluation | Test planning logic and review failure behavior | `products/goap-swarm-console/tests/goap-engine.test.js` | Deployed integration, adversarial input, isolation, and performance results |

## Multi-agent additions to assessment procedures

For AC-3/AC-6/IA-9, test both the initial caller and every delegate. Verify that
capability negotiation cannot expand privileges, credentials are not embedded in
messages, and a revoked peer cannot continue a previous session. For AU-2/AU-3,
require trace and parent-task IDs across delegation boundaries. For IR-4, inject
a failed delegate, unavailable tool, and invalid signature and inspect escalation
and recovery. For SA-11, test untrusted tool output and instructions embedded in
agent messages as data, plus denial of cross-tenant session resume.

## Assessment record format

Use one result per control and deployed environment: control ID, deployment,
commit SHA, assessor, date, procedure, evidence URI, result, residual risk,
remediation owner, and due date. Store sensitive deployment evidence in an
access-controlled location; include only the reference in this public repository.
The local evidence checker reports file presence and missing references and never
turns file presence into an assessed-control result.

Catalog source: [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final).

## Rescope note (2026-11-11, Rules-Steward, WR #18343)

TriageChief approved a rescope the same day. The table above stays as written.
This overlay draft is deferred until NISTIR 8605D is published.
The labelled readiness mapping is [NIST_READINESS.md](NIST_READINESS.md).
This file is not a compliance attestation.
