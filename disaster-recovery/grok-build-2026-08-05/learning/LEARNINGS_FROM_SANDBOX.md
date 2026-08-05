# Learnings from Grok Build sandbox session (2026-08-05)

Append-compatible block for root `learnings.md`.

---

**Date/Time:** 2026-08-05T14:50:00Z

**Task Attempted:** Canonical label allowlist; Project custom fields catalog; badges + GitHub Models checklist; proactive preflight; disaster-recovery dump of sandbox formal system + thought process; agent reward/privilege system; formal dual-path → auto WR; automation-first preference (Actions/n8n/Make/Zapier/Gumloop). Human-gated PR only.

**Outcome:** Pack authored under disaster-recovery + standards/config/scripts/workflows; pushed as PR for human review. Projects V2 list failed (403) so fields documented for apply-with-PAT. Label inventory: 301 labels, critical near-dups on priority.

**Root Cause of Failure (If any):** N/A for pack authorship. Observed systemic risk: process encoded as labels without allowlist → taxonomy explosion; formal verifier lived only in ephemeral sandbox without repo backup.

**Self-Healing Fix / Learned Lesson:** (1) Treat sandbox cognition as mortal — copy formal sources, reports, and thought process into `disaster-recovery/` on the SSOT repo every session that produces non-trivial work. (2) Cap labels via allowlist + aliases; put metrics on Project fields and scorecard JSON. (3) Agent "loyalty" is protocol honesty (preflight, human gate, no silent main), not agreeableness. (4) Motivation that works: tool access tiers, better tasks, public scoreboard, model budget. (5) Formal verification should open WRs/PRs automatically on fail/reaudit — never merge. (6) Prefer Actions and external automations over labels. (7) When MCP lacks Projects scope, still ship the field catalog so the next PAT-enabled agent can apply it.

**Next Action:** Human merge of this PR; create Project fields; enable formal-auto-wr + scorecard workflows; run one live formal window against recent merges; archive/map legacy labels.
