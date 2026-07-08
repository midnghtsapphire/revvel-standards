# [WR] Spec-to-action bridge — research completes, execution actually starts

## Output Type

internal-script-automation

## Objective

THE observed gap: the fleet "does a whole spec but cannot seem to put it in
action." Research lanes produce rich WR docs, then nothing builds. Add an
execution kickoff stage: when `research:complete` lands (or a WR doc passes
wr-lint), a workflow must (1) extract the Definition of Done + Requirements
from the WR doc, (2) generate a concrete implementation task list (files to
create, commands to run) using the `code_patch` lane, (3) dispatch it —
`wr:code` label for the coder lane or `wr:jules` for Jules — with the task
list embedded in the handoff, and (4) apply `lifecycle:stuck` + `needs-human`
if nothing has moved within a timeout. The spec must never be the terminus.

## Definition of Done

- A WR reaching `research:complete` produces a coder handoff within one run
- Handoff contains an actionable task list, not a restated spec
- Stuck detection covers the research→code transition explicitly
