# Runbooks

| Runbook | Use when |
| --- | --- |
| [email-cleanup.md](email-cleanup.md) | Running an inbox cleanup pass end to end |
| [approvals.md](approvals.md) | Working the approval queue |
| [rollback.md](rollback.md) | Undoing an applied action |
| [incident-unexpected-action.md](incident-unexpected-action.md) | Something happened that you did not approve |
| [connector-reauthorization.md](connector-reauthorization.md) | A connector needs reauthorization, or is disabled by choice |
| [companion-enrollment.md](companion-enrollment.md) | Installing/enrolling the Windows or mobile companion |
| [audit-verification.md](audit-verification.md) | Proving the audit chain is intact |

Every runbook assumes: no live adapters exist in the MVP, so any step that would touch an external
service is written as the *intended* procedure and marked accordingly.
