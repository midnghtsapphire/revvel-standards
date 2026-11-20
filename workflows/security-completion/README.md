# Security completion — existing lifecycle blueprint

Audrey authorization, 2026-11-15. Machine-readable registration: [`trigger-blueprint.json`](trigger-blueprint.json). Full ownership contract, commands, evidence and blockers: [`docs/security-completion/OWNERSHIP.md`](../../docs/security-completion/OWNERSHIP.md).

## Deployment state

**Draft, not deployed.** This extends `.github/workflows/pr-lifecycle.yml` / `scripts/ci/pr-lifecycle.js`, not a second scheduler. The existing Windows self-hosted metadata path is retained, but checkout is pinned and reads trusted default-branch code only. No PR candidate code is executed with write credentials. Account-wide GitHub Actions trouble remains an external activation blocker; CircleCI is unchanged and local pure tests are the current execution receipt.

Existing lifecycle PR/check completion events inspect ownership/proof and upsert deduplicated metadata. `ownership-scan` is an on-demand mode for the existing monitor/operator, not a timer. `.github/workflows/agent-monitor.yml` retains its existing on-demand/cost-frozen configuration; no new schedule is registered or enabled.

## Registered agent and work

Stable worker identity: `lifecycle-specialist`; platform: Manus assigned specialist; authenticated GitHub actor in this task: `midnghtsapphire`. This identity is provenance, not product branding. Owned ref: `feat/agent-completion-20261115`; existing work is Audrey's lifecycle-completion task. The durable journal/PR ownership record contains the actual PR number, heartbeat, retry budget and current blocker. Never create replacement WRs on each login.

Executable session/auth command, run from a trusted reviewed checkout:

```bash
node scripts/ci/agent-session-start.js session-start --owner-id lifecycle-specialist --repo midnghtsapphire/revvel-standards
```

For another worker use that worker's stable recorded identity. The CLI uses existing `gh` authentication and refuses cross-repository mutation. `REVVEL_GH_PATH` may be set by the operator to the session's authenticated GitHub connector wrapper; it must not come from a PR body.

## Integration inventory

| Agent/runner | Current status | Exact next action and owner |
| --- | --- | --- |
| Existing PR Lifecycle Windows runner | Draft wiring proposed; no new run receipt | Audrey reviews/merges; runner operator captures metadata-only execution receipt |
| Repository agents reading AGENTS.md | Binding invocation requirement appended; CLI exists | Each agent invokes session-start before new work |
| Manus session/auth startup | Executable wrapper available; no universal installed login hook | Manus integration operator inserts the command in that service's startup/auth-restoration wrapper |
| Cursor, Copilot, Jules, OpenHands and other services | Not automatically integrated by this repo PR | Each service integration operator wires its supported hook/wrapper and saves a test receipt |
| Manus API review continuation | Inactive; usable API key unavailable in parent runtime | Audrey/integration owner provisions authorized access; no automatic paid/new task dispatch |

A hook is active only after a service-specific receipt demonstrates invocation. Repository instructions alone do not install hooks on external services. Operator integrations serialize transitions for each owner/task; GitHub issue comments have no distributed compare-and-swap lease primitive. Conflicting revisions fail closed for explicit reconciliation.

## Activation checklist

1. Owner reviews the draft and merges; agents never merge.
2. Existing runner operator executes metadata-only lifecycle code from trusted default and stores run URL.
3. Each external service operator adds session/auth wrapper invocation, preserving the queue as continuation instructions, not shell commands.
4. Run mocked focused tests and capture one service wrapper receipt.
5. Only then update the blueprint's deployment/integration status. No billing changes or new schedules are part of this registration.
