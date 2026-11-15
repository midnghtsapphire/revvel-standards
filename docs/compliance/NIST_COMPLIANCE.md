# REVVEL AI agent readiness and evidence

Who: Codex · When: 2026-11-10 · Why: WR #18343 · What: evidence-bound assessment scope.

## Scope and status

This record covers the repository's agent planning, execution routing, review,
logging, and recovery mechanisms. It does not establish the security state of a
customer deployment, cloud account, third-party provider, or production domain.
Assessment status: **unassessed**. A control's source file is design evidence;
operating effectiveness requires deployment evidence and an assessment result.

NIST announced its AI Agent Standards Initiative on February 17, 2026, addressing
interoperability, open protocols, and security/identity research. That announcement
is not a certification checklist or a contract authorization. The mapping below
uses the SP 800-53 Rev. 5 control catalog as a readiness organizing framework.
No claim of NIST certification, federal procurement eligibility, FedRAMP, or a
passed external assessment is made by this repository.

## System boundary and responsibilities

The owner selects goals, approves access, and owns deployment risk decisions.
The orchestrator routes work; specialists produce changes; CI and reviewers
evaluate changes; external deployment services execute delivery. A symbolic plan
does not itself authorize a production action. Provider credentials remain in
runtime secret stores, and access must be scoped per deployment and agent.

| Boundary | Existing evidence | Required operating evidence |
| --- | --- | --- |
| Single-agent planning | `products/goap-swarm-console/lib/goap-engine.js` | Accepted/rejected task runs and reviewer checkpoints |
| Cross-agent routing | `.github/workflows/agent-fallback.yml` | Delegation identities, allowed capabilities, revocation, and denied-call tests |
| Tool authorization | `mcp-servers/wr-control-plane/wr_control_plane/server.py` | Per-customer authorization tests and tool invocation records |
| Change acceptance | `.circleci/config.yml`, `.github/workflows/merge-prosecutor.yml` | Required-check configuration and a sampled merged-PR trail |
| Audit | `.github/workflows/agent-audit-logger.yml` | Exported artifacts, retention policy, access policy, and tamper/replay tests |
| Recovery | `scripts/agent-self-heal.js` | Incident exercise, rollback evidence, and escalation delivery receipt |

## Identity and authorization assessment

For each deployed agent, record the issuer, subject, credential type, expiration,
allowed resources, permitted actions, and revocation owner. Capture a denied-call
test for expired credentials and out-of-scope resources. For multi-agent tasks,
preserve the original principal and delegation chain; a receiving agent must not
gain the caller's broader permissions implicitly. Verify replay protection,
signature checks, and tenant isolation in the actual communication service.
The repository evidence register deliberately does not mark these controls as
effective merely because a routing workflow or configuration file exists.

## Readiness procedure

1. Define the deployment boundary, data classification, impact level, and owner.
2. Select and tailor controls with the risk owner; document parameters and exclusions.
3. Run `node scripts/compliance-evidence.js` from the repository root to verify
   referenced design evidence still exists. This is a documentation integrity
   check, not a compliance pass.
4. Collect operating evidence for every row of the accompanying control mapping.
   Record environment, commit, timestamp, test procedure, result, and assessor.
5. Exercise unauthorized access, prompt injection, cross-tenant requests, tool
   failure, credential revocation, recovery, and audit export.
6. Record residual risks and remediation owners. Only a named assessor can change
   assessment status after reviewing results for the stated deployment boundary.

## Sources

- [NIST AI Agent Standards Initiative announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure)
- [NIST SP 800-53 Rev. 5 and catalog updates](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [NCCoE agent identity and authorization concept paper](https://www.nccoe.nist.gov/sites/default/files/2026-02/accelerating-the-adoption-of-software-and-ai-agent-identity-and-authorization-concept-paper.pdf)

See [SP-800-53-OVERLAYS.md](SP-800-53-OVERLAYS.md) for the repository-specific mapping.

## Rescope note (2026-11-11, Rules-Steward, WR #18343)

TriageChief approved a rescope the same day. The paragraphs above stay as written.
The labelled readiness mapping is [NIST_READINESS.md](NIST_READINESS.md).
SP-800-53-OVERLAYS.md stays deferred until NISTIR 8605D is published.
Neither file is a compliance attestation.
