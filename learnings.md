# Learnings

<!--
[Template Entry]

## YYYY-MM-DD — Short Title

**Context:**

**Root Cause of Failure (If any):**

**Self-Healing Fix / Learned Lesson:**

**References:**
-->

## 2025-01-XX — Self-Healing Fix Heading Format

**Context:** A recent entry deviated from the file's established template by appending clarifying text to the `Self-Healing Fix / Learned Lesson` heading.

**Root Cause of Failure (If any):** Author added descriptive qualifiers inline with the heading, breaking exact-match grep-ability across the log.

**Self-Healing Fix / Learned Lesson:** Keep field headings verbatim as defined in the `[Template Entry]` block at the top of this file. Any clarifying context — including notes about tools and skills actually used, for whoever runs the next one of these — belongs in the body beneath the heading, never in the heading itself. This preserves the log's grep-ability by exact field name.

**References:**
- Follow-up to PR #15852 review comment
- Issues #15873, #15895
