# Operations Handbook

## 1. Daily loop

| When | Action | Command |
| --- | --- | --- |
| Start of session | Confirm posture | `revvel-ops doctor` |
| Before any planning | Revalidate connector state (statuses are hints) | `revvel-ops inventory --demo` + manual check |
| Plan | Build proposals | `revvel-ops plan --mode review_everything` |
| Simulate | Confirm zero external calls | `revvel-ops dry-run` |
| Review | Work the approval queue | read `var/plans/<plan_id>.json` |
| Close out | Verify integrity | `revvel-ops verify-audit` |

## 2. Reading a plan

Each `PlanItem` pairs a proposal with its decision. Review order: **deny** (understand why),
**require_approval** (decide), **propose** (batch-accept only if the rollback is real), **allow**
(spot-check). For each item confirm: correct identity, correct target, evidence supports the summary,
`rollback_ref` is resolvable, and the disposition matches the rule ids in `reasons`.

## 3. Evidence handling

- Evidence IDs (`ev_*`) and digests are the audit currency. Reference them in reviews, tickets and
  incident notes instead of pasting content.
- Never widen `Evidence.notes` to hold message text; it is capped at 280 characters on purpose.
- If a decision cannot be justified from its evidence rows, treat that as a defect in the skill.

## 4. Autonomy escalation ladder

1. Run `review_everything` for at least two weeks of real plans.
2. Review false-positive rate per capability from the audit log.
3. Promote **one** capability into `safe_automation_allowed_capabilities` — reversible and
   internal-only only. Record an ADR + changelog entry.
4. Watch for a week; roll back the config change if any unexpected disposition appears.
5. Only consider `policy_automation` after several capabilities have been stable, and never for
   delete, unsubscribe, send, share or PR creation.

## 5. Approval hygiene

- Approvals expire (`approval_ttl_minutes`, default 720). Expired items are re-scored, never revived.
- Approve batches only when every item shares the same capability and rollback path.
- One approver in the MVP (`primary_operator`). Multi-approver support is in the backlog.

## 6. Audit operations

```bash
revvel-ops verify-audit                 # all chains
python scripts/verify_audit_chain.py var/audit/<run_id>.jsonl
python scripts/tamper_check_demo.py     # tamper-evidence demonstration on a temp copy
```

Retention is 400 days (must exceed any provider trash window). Never edit or delete a chain file: it
is append-only. Rotate by run id; archive whole files.

## 7. Rollback

Every mutating capability documents its rollback in [CONNECTORS.md](CONNECTORS.md); the concrete
procedure is in [runbooks/rollback.md](runbooks/rollback.md). Rule: if you cannot state the rollback
in one sentence, the action does not get automated.

## 8. Connector state changes

Statuses recorded in this repository are **non-secret samples** and must be revalidated at runtime.
Current sample state and the change log live in
[INVENTORY_AND_CONSOLIDATION.md](INVENTORY_AND_CONSOLIDATION.md). When a connector changes state:

1. Update `config/connectors.example.yaml` and `inventory.SAMPLE_STATUS` together.
2. Add a line to the status change log.
3. Run `make test` — inventory assertions are part of the suite.
4. Never auto-retrigger an authorization the operator dismissed (see Box).

## 9. Incident response

See [runbooks/incident-unexpected-action.md](runbooks/incident-unexpected-action.md). Summary: stop
planning, set `REVVEL_AUTONOMY_MODE=review_everything`, verify the chain, identify the run id,
reconstruct the decision from `policy.decided`, execute the rollback, then write the ADR or policy
change that prevents recurrence.

## 10. Change management

- Tests must pass (`make test`) before any commit.
- Policy or scope changes require an ADR in `docs/adr/` and an entry in `CHANGELOG.md`.
- Schemas are generated (`make schemas`); never hand-edit `schemas/*.json`.
- Ownership is in `CODEOWNERS`; contribution rules in `CONTRIBUTING.md`.
