# Goap Agent Memory & Self-Healing Log

<!-- AGENT USAGE NOTE: This is the ONE source-of-truth log for all Goap executions.
  - Before writing: check this file exists at this path. Do NOT create a duplicate.
  - Writes must be append-only and atomic (write to a temp file, then rename/move).
  - On lock or write failure: save entry to learnings.tmp as a rollback buffer; retry on next run.
  - Malformed entries (missing required fields) must be flagged with a [MALFORMED] prefix and NOT deleted.
  - Archive entries older than 90 days to DigitalOcean Spaces under goap-logs/archive/.
  - Never delete the [Template Entry] section below.
-->

**SSOT Links:** [`GOAP.md`](GOAP.md) · [`GOAL.md`](GOAL.md) · [`GOAP_AGENT_PROMPT.md`](GOAP_AGENT_PROMPT.md)  
**Rule:** Read this file at the start of every session. Append after every task or failure. Never repeat the same mistake twice.

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

---

**Date/Time:** 2026-05-01T19:37:00Z

**Task Attempted:** Fix recurring `oAudrey retro` issues reporting HTTP 000 for `oaudrey.com` and `fieldwork.oaudrey.com`

**Outcome:** Infrastructure blocker identified and documented; workflow deduplication implemented; AGENTS.md improved

**Root Cause of Failure (If any):** The oAudrey deployment requires two human-only one-time actions that were never performed: (1) setting the `DIGITALOCEAN_API_TOKEN` GitHub Actions secret, and (2) pointing `oaudrey.com` nameservers to DigitalOcean in the Namecheap registrar (`uprisinghope` account). Without these, `curl` returns `HTTP 000` (DNS does not resolve; no app was ever deployed). The retro workflow was also creating a brand-new issue every week with no deduplication check, generating compounding noise.

**Self-Healing Fix / Learned Lesson:**
1. **Infrastructure blockers ≠ code blockers.** When `curl` returns `HTTP 000` for a domain and the deploy workflow has never run with a valid credential, this is an infrastructure blocker that no amount of code changes can fix. Classify it immediately and escalate with exact human steps.
2. **Deduplication is required for recurring automated issues.** Any workflow that opens an issue on a schedule MUST check for existing open issues first and comment on them instead of cloning.
3. **SYSTEM_STATE.md `⏳` state.** Use `⏳ Pending human action` (not `❌`) to distinguish "this is intentionally not deployed yet" from "this needs a human to take a specific action." Agents reading `❌` with a comment like "(standards repo)" assume the component is not meant to be deployed; `⏳` with exact steps is unambiguous.
4. **New section in AGENTS.md: Infrastructure Blocker Protocol.** Added clear classification table and handling steps so future agents stop the retry loop immediately.

**Next Action:** Human (Audrey) must set `DIGITALOCEAN_API_TOKEN` secret and update Namecheap DNS. See `docs/AGENTS_RETRO_REVIEW.md` for full analysis and `standards/OAUDREY_DEPLOYMENT_STANDARD.md` for step-by-step instructions.

---

---

**Date/Time:** 2026-05-02T01:00Z

**Task Attempted:** Fix YAML parsing errors in GitHub Actions workflow files revvel-standards

**Outcome:** Success - All 334 tests now passing

**Root Cause of Failure (If any):** 
- `credential-label-router.yml` and `weekly-research.yml` had YAML parsing errors due to multiline JavaScript template literal strings
- Lines in template literal strings starting with text (like "This issue has been routed..." or "**What happens next:**") without proper indentation were being interpreted as new YAML keys
- Lines containing only "---" were being interpreted as YAML document separators
- The YAML parser requires ALL text within script blocks to have consistent indentation (12 spaces)

**Self-Healing Fix / Learned Lesson:**
1. **Identify all script blocks with backtick template literals** - Find lines with "= \`" that start script blocks in YAML
2. **Fix ALL lines within the block, not just some** - The opening line has indentation, but subsequent lines need it too
3. **Remove standalone "---" lines** - These are YAML document separators and break flow scalar parsing
4. **Include the closing line in fixes** - Even the line ending with `_`; needs proper indentation

**Next Action:** None - Work complete

