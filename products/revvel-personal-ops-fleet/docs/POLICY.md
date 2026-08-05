# Policy Engine

## 1. Autonomy modes

| Mode | Meaning | Behavior |
| --- | --- | --- |
| `review_everything` | Default. Nothing executes without a human. | Every non-denied proposal becomes `require_approval` (rule R030). |
| `safe_automation` | Auto-execute only an explicit, small allowlist of reversible, internal-only capabilities. | Capability must appear in `safe_automation_allowed_capabilities` *and* score ≥ `allow_min_confidence`; otherwise `propose`. |
| `policy_automation` | Threshold-driven, still bounded by every hard rule. | ≥ `allow_min_confidence` → `allow`; ≥ `propose_min_confidence` → `propose`; below → `require_approval`. |

Modes never widen the hard rules. Raising the mode can only affect proposals that already passed
identity, permission, risk, reversibility, external-visibility and rollback checks.

## 2. Dispositions

| Disposition | Meaning |
| --- | --- |
| `allow` | May execute without a human, subject to connector gate and dry-run success. |
| `propose` | Surfaced in the queue as a recommendation; execution needs a click. |
| `require_approval` | Explicit human approval required; carries approvers and an expiry. |
| `deny` | Refused. Never queued, never executable. |

## 3. Confidence score (0-100)

Computed by `policy.score_confidence`, independent of the disposition. Defaults from
`config/policy.example.yaml`:

```
score = 20 (base)
      + min(12 * evidence_count, 36)
      + 20 if reversible else 8 if conditionally_reversible else 0
      + 12 if not externally_visible
      + 10 if rollback_ref present
      + round(0.30 * skill_heuristic_score)
      - risk_penalty      {low 0, medium 10, high 25, critical 45}
      - permission_penalty{read 0, suggest 0, write 8, unsubscribe 18, delete 30}
      clamped to [0, 100]
```

Every term is recorded in `PolicyDecision.reasons` (e.g. `evidence(+36)`, `risk_high(-25)`), so a
score is always explainable. **A high score never unlocks a gated capability** — scoring and gating
are separate axes by design.

## 4. Rule table (evaluated in order, first match wins)

| Rule | Condition | Result |
| --- | --- | --- |
| R000 | always | compute confidence |
| R010 | capability in `deny_capabilities` | `deny` |
| R020 | identity not allowlisted | `deny` |
| R021 | permission not granted to that identity | `deny` |
| R030 | mode is `review_everything` | `require_approval` |
| R040 | permission in `always_require_approval_permissions` (delete, unsubscribe) | `require_approval` |
| R041 | capability in `always_require_approval_capabilities` | `require_approval` |
| R050 | `externally_visible` and `externally_visible_requires_approval` | `require_approval` |
| R060 | `irreversible` and `irreversible_requires_approval` | `require_approval` |
| R061 | risk tier `high` or `critical` | `require_approval` |
| R070 | mutating permission with no `rollback_ref` and no `rollback_procedure` | `require_approval` |
| R080 | `safe_automation` and capability not allowlisted | `propose` |
| R081 | `safe_automation`, allowlisted, confidence ≥ allow threshold | `allow` |
| R082 | `safe_automation`, allowlisted, below threshold | `propose` |
| R090 | `policy_automation`, confidence ≥ allow threshold | `allow` |
| R091 | `policy_automation`, confidence ≥ propose threshold | `propose` |
| R092 | `policy_automation`, below propose threshold | `require_approval` |
| R100 | connector-declared gate is stricter than the decision | tighten to the connector gate |

R100 is one-directional: a connector may tighten a decision, never loosen it. This is why
`gmail.labels.apply` scores 100 and still lands on `propose` — its connector gate is `propose`.

## 5. Reversible-first doctrine

1. Prefer a reversible variant: label instead of archive, archive instead of trash, trash instead of
   permanent delete, staging move instead of local delete, draft instead of send.
2. A mutating action without a rollback reference cannot be automated (R070).
3. `rollback_ref` must be resolvable *before* execution (e.g. `label_snapshot:<thread>`,
   `restore_inbox:<thread>`, `untrash:<thread>`, prior parent folder id, branch ref to delete).
4. Retention (`retention_days: 400`) must exceed any provider trash window so the audit record
   outlives the ability to undo.

## 6. Approvals

`require_approval` and `propose` decisions carry `required_approvers` (default `primary_operator`)
and `expires_at` (`approval_ttl_minutes`, default 720). Expired decisions must be re-scored, not
resurrected — inputs may have changed. Approvals are recorded as audit events and can be superseded
but never erased.

## 7. Configuring policy safely

- Keep `safe_automation_allowed_capabilities` short, reversible and internal-only.
- Never move a capability off `deny_capabilities` without an ADR.
- Lowering `allow_min_confidence` below 90 requires an ADR and a changelog entry.
- Test after every change: `make test`. The suite asserts that delete, unsubscribe, externally
  visible, high-risk and rollback-less actions are never auto-allowed in *any* mode.
