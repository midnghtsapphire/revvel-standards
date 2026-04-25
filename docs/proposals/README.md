# Proposals

Proposals are shippable decision artifacts. Every proposal reaches a terminal state.

## Lifecycle

```
Draft → Active → Approved → Implementing → Shipped
                ↘ Rejected
                ↘ Superseded (linked to replacement)
```

## Directories

| Directory | What Lives Here |
|---|---|
| `active/` | Under review or in rebuttal window |
| `approved/` | Decision made, implementation work spawned |
| `implementing/` | Linked to active PRs |
| `shipped/` | Terminal success — deployed/delivered |
| `rejected/` | Terminal fail — with documented rationale |
| `superseded/` | Replaced by newer proposal (linked) |

## Creating a Proposal

1. Copy `_template.md` to `active/your-proposal-name.md`
2. Fill in all sections
3. Create a GitHub issue with label `proposal`
4. The prosecution workflow will automatically run an adversarial review
5. Address findings in the rebuttal section
6. Move file to the appropriate terminal directory when decided

## Rules

- **Every proposal reaches a terminal state.** No silent abandonment.
- **Rejected proposals keep their rationale.** Future proposers learn from them.
- **Superseded proposals link to their replacement.** The chain is traceable.
- **The weekly audit flags proposals in `active/` for >30 days.**
