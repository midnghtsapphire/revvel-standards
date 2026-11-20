# Security checks and agent follow-through

## Delivery map

Use this draft as the parent for independently reviewable child PRs. Link each child here and record its verified outcome. Start in revvel-standards and roll out through shared standards once the pilot has evidence.

| Child | Next action | Acceptance evidence |
| --- | --- | --- |
| Large deletions | Add a keyless base-to-head diff check in the existing PR lane. Report file deletions and deleted lines, including large net deletions hidden by additions. Count recognized renames separately. Pilot alerts at 20 deleted files or 1,000 deleted lines and tune from observed PRs. Respect the existing owner deletion rule. | Fixtures cover normal edits, rename, mass delete and missing base. PR status shows an actionable summary with no file contents. |
| Malware and Trivy | Continue #18412. Reconcile its severity wording with its actual ignore-unfixed behavior. Verify scanner exit codes and report upload on findings. Add a separate malware detection check for changed executable and binary artifacts using an approved scanner and inert fixtures. | CI links show clean, finding and scanner-error cases. Reports identify the affected path and rule. |
| Prompt injection | Treat PR text, patches, artifacts and review responses as untrusted data. Keep the reviewing process read-only with constrained inputs and validated findings output. Flag suspicious instructions aimed at agents. Preserve coverage for trusted repository instructions through existing policy. | Inert fixtures show that untrusted text cannot change tool permissions or trigger commands, and legitimate instruction docs have a tested handling path. |
| API code review | Use CODE_REVIEW_STANDARD.md and existing review history to identify the previous reviewer and recover its rubric. Audit the Manus failure from existing logs and metadata. Compare the existing reviewer and a Manus adapter only if the API supports restricted, read-only review through the existing spend gate. Start with sanitized historical examples, one review per head SHA, an explicit cost cap and a timeout. | Fixture results measure actionable findings and false positives. API failure stays visible and deterministic checks still run. No credentials or raw secret findings enter reports. |
| Agent resumption and delivery | Extend the existing startup call chain and WR watcher. On login, match open WRs and PRs using stable actor identity, claim one with an expiring lease, and resume from the persisted next action. Store owner, expected outcome, latest verified SHA, validation, blocker and recovery action in GitHub. Use existing startup and retry controls, including #18424. | Two agents cannot claim the same work. A fresh session resumes without chat history. A failing run records the first failing step, retries only transient failures, and links a root-cause fix for recurring faults. |

## Completion contract

- A product ID becomes a delivery record immediately. Keep the work linked until the artifact exists, its normal entry point works, and validation or release evidence is attached.
- A PR remains owned until it is merged with outcome evidence, superseded by a linked PR with an owner, or closed with a recorded decision. Track owner review separately from implementation readiness under existing merge rules.
- When an agent discovers a bug, fix it in scope or create a linked WR with an owner, reproduction evidence, and next action. Keep the parent blocked when that bug prevents its outcome. A recurring failure needs a regression check and a fix at its source.
- Record a checkpoint before yielding. On startup, reconcile stale claims and refresh only work with a changed head or a due recovery action. Back off on service errors and surface repeated failures once per incident.
- Use PR check summaries as the first alert surface. Deduplicate alerts by repository, head SHA and finding fingerprint. Add an external channel only after the pilot proves the signal is actionable.

## Starting state

This PR records the plan. The five implementation tracks require landed changes and the acceptance evidence above. Existing work includes Trivy on CircleCI (#18412), visiting-agent false positives (#18419), and duplicate CI spend (#18424). Alert thresholds are pilot values. No billing transaction or paid API call is needed to start.
