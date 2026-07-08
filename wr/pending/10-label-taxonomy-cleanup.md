# [WR] Label taxonomy cleanup — 195 labels is a failure surface, not a system

## Output Type

internal-script-automation

## Objective

`.github/labels.yml` defines ~195 labels; lifecycle, routing, roles, and
ad-hoc tags overlap, and label-churn already caused real outages (the
wr-pr-creation concurrency cancellations, labeled-noise filters, docs of
label automation). Consolidate:

1. Inventory usage: for every label, count of open/closed issues actually
   carrying it (dead labels = delete).
2. One namespace per axis, documented: `wr:*` (lifecycle — the state
   machine in agent-prompts.yml), `role:*`, `fleet:*`, `deliver:*`,
   `output-type:*`, `priority-*`, plus a SMALL free set. Everything else
   maps to one of these or dies.
3. A migration workflow that renames/merges historical labels so old
   issues stay queryable.
4. A lint gate: new labels must exist in labels.yml with an axis —
   workflows may not invent labels inline (this is how 195 happened).
5. Update every `label_triggers` / router reference to the surviving set.

## Definition of Done

- Label count reduced to a documented target (aim: under 60)
- Zero workflow references to deleted labels (grep-verified, tests green)
- Axis documentation added to docs/AGENT_MONITORING_STANDARD.md
