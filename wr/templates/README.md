<!--
  wr/templates/README.md — index of specialty WR templates.

  The top-level `wr/WR_TEMPLATE_*.md` files remain the primary templates for
  generic idea / research / basic / full WRs. This directory adds task-shaped
  templates for common repeat workflows so the picker can offer them by name
  instead of forcing the owner to remember which trigger word or label to use.
-->

# WR Templates — Specialty Set

Copy the file that matches the *shape* of the work you want done. Fill only
the fields you know now; leave the rest for the fleet to fill.

The generic templates in `wr/` (`WR_TEMPLATE_IDEA`, `WR_TEMPLATE_RESEARCH`,
`WR_TEMPLATE_BASIC`, `WR_TEMPLATE_FULL`) are the entry points for anything
that doesn't fit here. This directory adds shape-specific templates on top of
those.

## Two layers

Every WR combines **one work template** (how the task moves through the fleet)
with **one product template** (what artifact ships at the end). You are not
required to pick both — a bug fix on an existing product doesn't need a
product template — but new-build work should pick one of each.

### Work templates — `work/`

| Template | Use when |
|---|---|
| `work/planner-pmo.md` | You have an idea and want it turned into a testable spec before a single line of code is written. Forces your own research + RICE scoring first. |
| `work/visiting-agent.md` | A one-off LLM / agent (Cursor Cloud, Lovable, Replit, a chatbot) is about to touch the repo. Copy this in as the first comment of the WR before the visitor writes anything. |

More work templates (bug-fix, code-review, finisher, research, rescue,
experiment, demo) will be added as their patterns stabilize. Use
`WR_TEMPLATE_BASIC.md` at the repo root as the fallback until then.

### Product templates — `product/`

Product templates carry an **autonomy frontmatter block** that tells the
fleet what needs owner approval versus what can auto-merge. See any file in
`product/` for the exact schema. This is how "autonomous ≠ ship a brand-new
product without me seeing it" becomes a rule the automation enforces, not a
convention someone has to remember.

Product templates will be added incrementally: PDF, CLI, API, skill, MCP,
web app, mobile app, admin panel, browser extension.

## Autonomy frontmatter (product templates)

```yaml
---
template: product/<name>
version: 1
requires-owner-approval-for:
  - first-launch          # any first shipment of a new product surface
  - price-changes         # any pricing edit to a live product
  - public-messaging      # any copy that goes to customers or search engines
auto-approve-for:
  - typo-fix
  - image-swap
  - dependency-bump
  - internal-refactor
---
```

The dispatcher reads these fields. A PR touching a product template file
with `requires-owner-approval-for` fields that match its diff cannot
auto-merge — it waits for the owner. A PR touching only `auto-approve-for`
paths can be picked up by `.github/workflows/auto-merge.yml` once CI is
green.

## Related

- `wr/WR_TEMPLATE_BASIC.md` — bug/chore/docs WR template
- `wr/WR_TEMPLATE_FULL.md` — sellable-product WR template
- `wr/WR_TEMPLATE_IDEA.md` — quick idea capture
- `wr/WR_TEMPLATE_RESEARCH.md` — targeted personal research
- `config/saved-replies.yml` — one-liner saved replies the owner uses in PR/issue comments
- `DECISIONS.md` D018 — exit-quiet-mode restoration that unblocked the fleet these templates target
