# Learnings

This file tracks lessons learned from failures, self-healing fixes, and process improvements across the automated pipeline.

## [Template Entry]

**Date:** YYYY-MM-DD
**Issue/PR:** #N
**Agent:** (openrouter | openhands | manual)

**What Happened:**
Brief description of what went wrong or what was learned.

**Root Cause of Failure (If any):**
Why did it fail? What was missing?

**Self-Healing Fix / Learned Lesson:**
What was changed to prevent recurrence, or what heuristic should future agents apply?

---

## Entries

**Date:** 2025-01-15
**Issue/PR:** #15852 follow-up (#15873)
**Agent:** openrouter

**What Happened:**
A `learnings.md` entry added in #15852 deviated from the file's established template format. The `Self-Healing Fix / Learned Lesson` heading was extended with inline clarifying text (`— tools and skills actually used, for whoever runs the next one of these`) instead of matching the template's verbatim `**Self-Healing Fix / Learned Lesson:**` form. A Copilot review comment flagged this.

**Root Cause of Failure (If any):**
When writing the entry, clarifying context was appended directly to the header rather than placed in the body. This broke exact-string greppability of the log by field name.

**Self-Healing Fix / Learned Lesson:**
Tools and skills actually used, for whoever runs the next one of these: when adding entries to `learnings.md`, keep the four heading lines (`Date:`, `Issue/PR:`, `Agent:`, and the three bolded field headers) byte-for-byte identical to the `[Template Entry]` block at the top of the file. All clarifying prose, caveats, and context belong in the body paragraph beneath each header — never inline in the header itself. This preserves `grep -F '**Self-Healing Fix / Learned Lesson:**' learnings.md` as a reliable way to enumerate every lesson recorded.

---
