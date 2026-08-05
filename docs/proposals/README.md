# Proposal Lifecycle

> Standard proposal lifecycle for all work requiring decision or approval.

## Directory Structure

```text
docs/proposals/
├── README.md           ← This file
├── _template.md        ← Standard proposal template
├── active/            ← Under review
├── approved/          ← Decision made, work spawned
├── implementing/       ← Linked to active PRs
├── shipped/           ← Terminal success
├── rejected/          ← Terminal fail (with rationale)
└── superseded/       ← Replaced by newer proposal
```

## Lifecycle States

| State | Meaning | Action |
|-------|---------|--------|
| active | Under review | Prosecution workflow runs |
| approved | Approved | Spawns work items |
| implementing | PRs linked | Track progress |
| shipped | Complete | Document learnings |
| rejected | Declined | Document rationale |
| superseded | Replaced | Link to replacement |

## Submitting a Proposal

1. Copy `_template.md`
2. Fill in all sections
3. Place in `active/` directory
4. Label issue/PR with `proposal`
5. Automation runs prosecution review

## Update Rules

- Proposals expire after 30 days without decision
- Include acceptance gates
- Document alternatives considered
- Link to prosecution findings
