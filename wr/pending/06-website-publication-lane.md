# [WR] Website publication lane — #website deliverables land on the public hub

## Output Type

production-app

## Objective

Route tag `#website` now infers `production-app` (PR #15497). Close the
loop: a `deliver:app`/website WR that merges should automatically (1) add
its page under the repo root (served by Pages `static.yml` + Vercel), (2)
register itself on `index.html` (the "Freedom Angel Corp — Public Hub" tab
list) with title/description from the WR, and (3) comment the live URL back
on the WR issue. Registration should be generated (like
`agent-creator-data.js`) rather than hand-edited, so the hub never drifts.

## Definition of Done

- A merged website WR appears on the hub with a working link, no hand edit
- Hub registry is generated + committed by workflow
- Live URL posted back to the source issue
