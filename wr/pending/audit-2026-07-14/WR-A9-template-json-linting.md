# [WR] P3 — Handlebars templates with .json extension false-flag JSON linters

## Title
[WR] Rename templated .json files to .json.hbs + add convention to standards

## Description
**Problem.** skills/openclaw-eeat/templates/misp-profile.json contains `{{#each}}` Handlebars — invalid JSON by design, so every JSON validity sweep reports a false positive, training agents to ignore the check.

**Fix.** Rename misp-profile.json → misp-profile.json.hbs (still pending on this branch — the rename was applied in the local audit copy; an agent should complete it here). Sweep for other `{{`-containing .json files; codify in standards/: *templates carry a template extension; rendered output carries the data extension.*

**Acceptance.** Repo-wide JSON validation runs clean with zero suppressions.

## Agent learning note
False positives are corrosive: one known-bad-but-ignored check teaches the fleet to ignore the checker. Keep checkers 100% signal by fixing the naming, not muting the rule.

Assignee: Coder | Labels: P3, hygiene
