# [WR] P1 — Research engine Mirror lane judges dates against model training data, not the system clock

## Title
[WR] Inject actual system date into research-engine lane prompts — stop false "temporal anomaly" blockers

## Description
**Problem (observed live, issue #16054, 2026-07-14).** The factual-validation (Mirror) lane scored a legitimate P1 repair WR **25/100** and issued "DO NOT PROCEED" because it judged the date 2026-07-14 to be "~18 months in the future." The LLM compared the WR's date against its own training-data cutoff instead of the actual current date. This poisoned the overall confidence score, added false labels (blocked-temporal-issue), and would block every legitimate WR carrying a current date.

**Fix.** In the research-engine prompt assembly (docs/research-engine + the workflow that builds lane prompts), inject `CURRENT_DATE: <ISO date from the runner clock>` into every lane's system prompt with the instruction: "Judge all temporal claims against CURRENT_DATE, never against your training knowledge." Add a regression: feed a packet dated today and assert Mirror does not emit a temporal-anomaly finding.

**Acceptance.** Re-run the research engine on issue #16054 (or a copy): Mirror lane no longer flags a temporal anomaly; confidence score reflects real findings only.

## Agent learning note
LLMs have no clock. Any lane that validates facts MUST receive the runner's current date in-prompt, or it will confidently misclassify the present as the future. Same class as "hardcoded expectations vs source-of-truth drift" — the source of truth for "now" is the system clock, never the model.

Assignee: Dragnet | Labels: P1, research-engine, false-blocker
