# Learnings

This file logs lessons learned from self-healing fixes, incidents, and other operational learnings.

## [Template Entry]

**Date:** YYYY-MM-DD

**Context:** What was happening / what was being worked on.

**Root Cause of Failure (If any):** What actually broke and why.

**Self-Healing Fix / Learned Lesson:** What was done to fix it, or what was learned.

---

## Entries

**Date:** 2025-01-15

**Context:** Automating issue triage and code changes via OpenRouter → OpenHands fallback chain for the $10k/month → $10M mission pipeline.

**Root Cause of Failure (If any):** A prior `learnings.md` entry deviated from the established template by extending the `Self-Healing Fix / Learned Lesson` heading with extra clarifying text (`— tools and skills actually used, for whoever runs the next one of these`). This broke exact-string grep-ability of the log by field name.

**Self-Healing Fix / Learned Lesson:** Keep template headings verbatim. Any clarifying context belongs in the body of the entry, not appended to the heading. This preserves `grep -F '**Self-Healing Fix / Learned Lesson:**'` as a reliable way to enumerate lessons across the log. Tools and skills actually used, for whoever runs the next one of these: `markdownlint-cli2` for validation, `grep -F` for verifying heading consistency across entries, and a discipline of "template first, prose second" when appending to structured logs.

---
