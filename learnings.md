# Learnings

This log captures failures, root causes, and self-healing fixes so future runs can avoid the same pitfalls.

## [Template Entry]

**Date:** YYYY-MM-DD

**What Failed:**

**Root Cause of Failure (If any):**

**Self-Healing Fix / Learned Lesson:**

---

## Self-Healing Fix / Learned Lesson

**Date:** 2025-01-XX

**What Failed:**
Prior entry deviated from the template heading format by appending clarifying text directly to the `Self-Healing Fix / Learned Lesson` heading (`— tools and skills actually used, for whoever runs the next one of these`).

**Root Cause of Failure (If any):**
Heading was extended inline rather than keeping the verbatim template heading and placing supplementary context in the body.

**Self-Healing Fix / Learned Lesson:**
Tools and skills actually used, for whoever runs the next one of these: keep the `**Self-Healing Fix / Learned Lesson:**` heading verbatim so the log stays grep-able by exact field name. Any clarifying text belongs in the body under the heading, not appended to it. Validated with `npx markdownlint-cli2 learnings.md` (0 errors).
