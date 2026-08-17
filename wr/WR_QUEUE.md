# WR Idea Queue

Lightweight parking lot for research suggestions and spec ideas before they become full WRs.

**How to use:**
- Add a row when you capture a new idea (copy `wr/WR_TEMPLATE_IDEA.md` to `wr/ideas/YYYY-MM-DD-{slug}.md`).
- Update the row when priority or status changes.
- When an idea gets a full WR, set status to **Promoted** and link the WR doc.

---

## Queue

| # | Slug / File | Summary | Source | Priority | Status | Full WR |
|---|-------------|---------|--------|----------|--------|---------|
| — | *(empty — add your first idea below)* | | | | | |

---

## Status Key

| Status | Meaning |
|--------|---------|
| **Queued** | Idea captured; not yet prioritized |
| **Up Next** | Scheduled for next sprint/cycle |
| **In Progress** | Active deep-research or WR being written |
| **Promoted** | Full WR filed; link in "Full WR" column |
| **Dropped** | Decided not to pursue; reason in Notes |

## Priority Key

| Level | Monthly Revenue Target | Timeline |
|-------|------------------------|----------|
| P0 | $500 + / month | This week |
| P1 | $100-500 / month | 1-2 weeks |
| P2 | $50-100 / month | 1-2 months |
| P3 | < $50 / month | 3+ months |
| P4 | No direct revenue | As needed |

---

## Templates

| Template | When to use |
|----------|-------------|
| [`wr/WR_TEMPLATE_IDEA.md`](WR_TEMPLATE_IDEA.md) | Quick idea capture — fill only what you know |
| [`wr/WR_TEMPLATE_RESEARCH.md`](WR_TEMPLATE_RESEARCH.md) | Targeted personal research — answer a specific question |
| [`wr/WR_TEMPLATE_BASIC.md`](WR_TEMPLATE_BASIC.md) | Bug / chore / docs fix WR |
| [`wr/WR_TEMPLATE_FULL.md`](WR_TEMPLATE_FULL.md) | Full product / sellable asset WR |

---

## Promotion Workflow

```text
New idea
  → wr/ideas/YYYY-MM-DD-{slug}.md  (WR_TEMPLATE_IDEA)
  → add row here (status: Queued)
      ↓  when prioritized
  → wr/issues/issue-{N}-{slug}.md  (WR_TEMPLATE_FULL or BASIC)
  → file GitHub issue [WR] {Title}
  → update row here (status: Promoted, link Full WR)
```

---

**Maintained by:** Copilot Coding Agent  
**Last Updated:** 2026-07-05
