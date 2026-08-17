# [WR] P1 — Persona-to-persona delegation is dead wire: bots can't summon /dragnet

## Title
[WR] Wire persona delegation via labels — oAudrey's "@dragnet execute" currently summons nothing

## Description
**Problem (observed live, issue #16054).** Dragnet is NOT deleted — persona-comment-trigger.yml + persona-comment-runner.js + dragnet-team-assignment.yml are all live and healthy. But the fleet cannot delegate to it: oAudrey's triager comment said "@dragnet This is a critical repair task — execute these steps" and nothing happened, for two stacked reasons: (1) it used the **@-mention form**, which the runner ignores BY DESIGN (slash form required; @-mentions email real GitHub users); (2) the workflow filters `github.event.comment.user.type != 'Bot'` to prevent loops — so even a correct `/dragnet` from a bot persona is dropped. Net effect: `/dragnet` works ONLY from a human comment; every persona→persona handoff silently no-ops, which is why the fleet "lost" Dragnet from the owner's perspective. Also: slash commands in issue TITLES/BODIES never fire the trigger (issue_comment events only) — #16054 had `/oaudrey /dragnet` in the title.

**Fix (loop-safe, no bot-comment exception needed).** Delegate via LABELS, not comments: (1) when a persona decides to hand off, it applies `summon:dragnet` (label family `summon:<persona>`); (2) add an `issues: labeled` trigger to persona-comment-trigger.yml (or a small sibling workflow) that maps `summon:<persona>` → the exact same persona-comment-runner.js code path dragnet-team-assignment.yml already reuses, then removes the label (REMOVE-then-ADD rule if re-fire is ever needed); (3) teach the oAudrey triager prompt to apply the label instead of writing "@dragnet". Loop safety is preserved: labels don't trigger comment events, and the runner's dedup-before-create logic already guards WR/PR duplication. Optionally (4): the WR intake workflow scans new issue TITLES for `/persona` tokens and applies the matching summon label, so title-invocation works too.

**Acceptance.** On a test issue: oAudrey (or manual label add) applies `summon:dragnet` → Dragnet persona responds within one run; no comment loops; `/dragnet` from a human comment still works unchanged; a `/dragnet` token in a new issue title summons Dragnet via the intake scan.

## Agent learning note
The fleet's own anti-loop guard (skip bot comments) severed the delegation chain — a correct safety rule with an unhandled consequence. When a guard blocks a needed path, don't weaken the guard: route around it on a channel the guard doesn't watch (labels), keeping both the safety property and the capability. Comments are for humans; labels are the fleet's inter-agent bus.

Assignee: Dragnet (self-repair) | Labels: P1, wiring, fleet, dragnet
