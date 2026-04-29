# Goap Agent Memory & Self-Healing Log

*This file tracks autonomous executions, failures, root causes, and locked-in solutions so mistakes are never repeated.*

Agents (and the Gatekeeper recovery agent) read and append to this file to get smarter over time. Every autonomous run that fails — and every recovered run — should leave an entry below using the template.

## How to use

1. Before starting an autonomous task, read the most recent entries to check for known failures and locked-in fixes for similar work.
2. After every run (success or failure), append a new entry under **Auto-Generated Entries** using the template below.
3. Never delete or rewrite past entries. Supersede them by adding a newer entry that references the older one in **Self-Healing Fix / Learned Lesson**.
4. If a fix has been validated, mark it "locked-in" so future agents trust and reuse it without re-deriving the solution.

## [Template Entry - Do not delete]
**Date/Time:**
**Task Attempted:** [e.g., n8n email parse for angelreporters@gmail.com]
**Outcome:** [Success / Failed]
**Root Cause of Failure (If any):** [e.g., IMAP connection timed out after 30s]
**Self-Healing Fix / Learned Lesson:** [e.g., Added an automatic 3-minute retry node in n8n; switched Apify actor to use residential proxies]
**Next Action:** [e.g., Proceed to Video Generation step]
---

## [Auto-Generated Entries Begin Below]
