# REVENUE_GATE.md — mandatory pre-build checklist

Every work request answers these questions **before** any build time is spent.
A WR that cannot answer them gets `needs-human`, not `wr:code`.

## The one question that gates everything

> **What is the shortest path from this work to the first $1?**

Write the answer in the WR body. "It improves the platform" is not an answer.
Name the buyer, the channel, and the price.

## FAST-TRACK criteria (any one ⇒ prioritize)

- Direct sales possible in **< 2 weeks** with existing components
- Sells to an **existing audience** (Vine reviewers, current dashboard users)
- Activates an **already-built** delivery channel (ship-to-market.yml lane
  whose secret is set)
- Recurring revenue (subscription, metering) rather than one-shot

## AUTO-ARCHIVE criteria (any one ⇒ archive, don't build)

- No named revenue path **and** estimated effort > 40 hours
- Duplicates a shipped component (check `state.json` and the dashboard first)
- Requires a platform/secret/account nobody has agreed to fund
- Third revival of an idea that was archived twice (write *why* it keeps
  coming back in `learnings.md` instead)

## Revenue stream quick reference

| Stream | Time to first $ | Monthly potential | Blocker to clear |
|---|---|---|---|
| Reese-Reviews | 1–2 weeks | $750–3,000 | Deploy dashboard, set INBOX_EMAIL, connect Apify |
| Sellable PDFs | 1–2 weeks | $500–2,000 | Add PRICE.md, connect Gumroad, landing pages |
| MCP server marketplace | 2–4 weeks | $500–1,500 | Publish to npm, mcp landing page |
| API products | 2–4 weeks | $500–5,000 | Deploy to Railway/Fly, Stripe metering |
| Affiliate auto-campaigns | 1 week | $200–2,000 | Connect social accounts, run generator |
| Digital product zips | 1 week | $500–2,000 | product-zip workflow, Gumroad listing |
| Federal grants | 4–8 weeks | $50K–500K | Renew CAGE, complete SAM.gov |

## How this gate is enforced

1. The Spec Approval Gate (`spec-approval-gate.yml`) posts the approval
   request; the owner checks this file's questions before applying
   `spec-approved`.
2. `openrouter-coder` fires **only** on human-applied `spec-approved` or
   `wr:code` labels — never on bot comments or timers.
3. A WR archived under AUTO-ARCHIVE gets one line in `learnings.md` naming
   the criterion that killed it.
