# Goap Agent Memory & Self-Healing Log

<!-- AGENT USAGE NOTE: This is the ONE source-of-truth log for all Goap executions.
  - Before writing: check this file exists at this path. Do NOT create a duplicate.
  - Writes must be append-only and atomic (write to a temp file, then rename/move).
  - On lock or write failure: save entry to learnings.tmp as a rollback buffer; retry on next run.
  - Malformed entries (missing required fields) must be flagged with a [MALFORMED] prefix and NOT deleted.
  - Archive entries older than 90 days to DigitalOcean Spaces under goap-logs/archive/.
  - Never delete the [Template Entry] section below.
-->

This file tracks autonomous executions, failures, root causes, and locked-in solutions so mistakes are never repeated.

## [Template Entry - Do not delete]

**Date/Time:**

**Task Attempted:** [e.g., n8n email parse for angelreporters@gmail.com]

**Outcome:** [Success / Failed]

**Root Cause of Failure (If any):** [e.g., IMAP connection timed out after 30s]

**Self-Healing Fix / Learned Lesson:** [e.g., Added an automatic 3-minute retry node in n8n; switched Apify actor to use residential proxies]

**Next Action:** [e.g., Proceed to Video Generation step]

---

## [Auto-Generated Entries Begin Below]

