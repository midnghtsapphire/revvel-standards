# LEDGER — revvel-standards

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only. Newest first.
This file was absent at the repository root on 2026-11-11. This entry is the first one. No earlier entry was removed or rewritten.

## 2026-11-11 15:40 UTC — Cloudy — Codex OAuth login command

- **Actor:** Cloudy (Cursor cloud agent, Grok 4.7)
- **Requested by:** Gitar review on PR #18373
- **Role:** executed
- **Files:** `docs/MCP_REVVEL_CATALOG.md` (added the login command beside the existing add command); `docs/Master_Inventory/MCP_STANDARD.md` (same); `.codex/config.toml` (comment only); `tests/action-gateway-mcp.test.js` (asserts the login command); `config/connections.yml` (note); generated registry views; `CHANGELOG.md`; `LEDGER.md`
- **What was done:** Codex `mcp add --url` stores the endpoint and does not start OAuth. The operator command is `codex mcp login action-gateway`. The earlier 15:31 entry still describes the registration. This entry adds the login command. No token was added.
- **Decisions:** Keep the add command from WR #18290 and add the login command next to it — because the Codex MCP docs say login is a separate step for an OAuth server.
- **Sources:** [Codex MCP](https://developers.openai.com/codex/mcp) (read 2026-11-11): "Run `codex mcp login <server-name>` separately to start an MCP OAuth login." Gitar review on PR #18373.
- **Commits / PRs:** [PR #18373](https://github.com/midnghtsapphire/revvel-standards/pull/18373)
- **Open / handoff:** Audrey runs both the Claude login and `codex mcp login action-gateway` on her machine. TriageChief merges. Do not merge from this agent.
- **Credit note:** Gitar named the missing command. Cloudy added it. Audrey owns the login.

## 2026-11-11 15:31 UTC — Cloudy — DigitalOcean action-gateway for Claude and Codex

- **Actor:** Cloudy (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, WRs #18288 and #18290, routed by TriageChief on 2026-11-11
- **Role:** executed
- **Files:** `.mcp.json` (added `action-gateway`); `.codex/config.toml` (added); `docs/MCP_REVVEL_CATALOG.md` (added the remote HTTP section); `docs/Master_Inventory/MCP_STANDARD.md` (added section 14); `config/connections.yml` (added `mcp-action-gateway`); `docs/CONNECTIONS_REGISTRY.md`, `README.md`, and `connections-dashboard.html` (regenerated from that YAML); `tests/action-gateway-mcp.test.js` (added); `CHANGELOG.md` (prepended); `LEDGER.md` (prepended); `wr/memory/decisions.jsonl` (appended)
- **What was done:** Registered the same public DigitalOcean endpoint for Claude as HTTP transport (`type: http` plus `url` in `.mcp.json`) and for Codex as `url` in `.codex/config.toml`. Documented `claude mcp add --transport http`, `claude mcp login action-gateway`, and `codex mcp add --url`. No token, key, or `.env` file.
- **Decisions:** Left `templates/mcp/mcp.*.json` unchanged — because `scripts/setup-mcp.sh` copies those stdio profiles onto other projects, and copying this URL would publish this repository's endpoint into unrelated projects. The checked-in registration is the root Claude file and the Codex project file.
- **Sources:** [WR #18288](https://github.com/midnghtsapphire/revvel-standards/issues/18288); [WR #18290](https://github.com/midnghtsapphire/revvel-standards/issues/18290); TriageChief comments on both issues (2026-11-11). No `Library/` copy; the issues are the source.
- **Commits / PRs:** PR link follows the push. Branch `cursor/do-action-gateway-mcp-5603`.
- **Open / handoff:** Audrey runs the Claude login and the Codex add on her own machine. TriageChief merges after CircleCI `lint-and-test` is green. Do not merge from this agent.
- **Credit note:** Cloudy registered the endpoint and the docs. Audrey owns the login. TriageChief routed the work requests.

## 2026-11-11 09:00 MST — QuickWinBuilder — tool history log and visiting-agent rule check

- **Actor:** QuickWinBuilder (MoneyCrew Builder, Grok Bot)
- **Requested by:** Audrey Evans, through TriageChief and WR #18374
- **Role:** executed
- **Files:** `docs/tool-history/` (added: README, `TOOLS.csv`, 44 tool files, `visiting-llms.md`); `VISITING_AGENTS.md` (added section 1b; nothing removed); `scripts/visiting-agent-scan.js`, `config/visiting-agent-patterns.json`, `tests/visiting-agent-scan.test.js` (added); `.circleci/config.yml` (added one step); `CHANGELOG.md`, `Library/README.md`, `LEDGER.md` (appended)
- **What was done:** Searched `midnghtsapphire` and `freedom-angel-corp` issues and PRs, the repo files, and commit history for each tool, and logged what the evidence shows. Recorded the verdicts Audrey stated on 2026-11-11 (Manus, visiting LLMs forgetting rules, Grok token limits, mabl local, Bito paid). Added the check for tracker, marketing, affiliate, and branding strings.
- **Decisions:** Created `docs/tool-history/` because no per-tool history existed; `DECISIONS.md`, the cost index, and the subscriptions file are linked, not edited. Kept `RECORDED` (repo decision under the shared login) separate from `AUDREY` (her words). Baselined the 145 hits in 40 files that were already in the repo instead of deleting or editing them.
- **Sources:** each tool file lists its own links.
- **Commits / PRs:** branch `task/tool-history-log-20261111`, draft PR into `main`.
- **Open / handoff:** Manus account recovery is separate (recovered content goes to `docs/agents/manus/recovered/` in a later PR). Audrey owns the `NEEDS AUDREY` list. TriageChief merges after CircleCI is green.
- **Credit note:** QuickWinBuilder wrote the log. Audrey supplied the verdicts. Earlier agents wrote the repo records it cites.

## 2026-11-11 14:25 UTC — Rules-Steward — merge main, keep both changelog entries

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** TriageChief gate on PR #18365
- **Role:** executed
- **Files:** `CHANGELOG.md` (union of both 2026-11-11 sides; nothing removed); merge of `origin/main` at `7b17a654`
- **What was done:** Normal merge commit, not a rebase. The readiness entries and the halo-demo-stream entry all stay. Markdown link checks, including `[text](path#Lnn)`, were already added on this branch and a fragment test was added before the merge.
- **Decisions:** Took the evidence-checker fix rather than deferring it. It does not touch CI config.
- **Sources:** [TriageChief gate comment](https://github.com/midnghtsapphire/revvel-standards/pull/18365#issuecomment-6798217780)
- **Commits / PRs:** [PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365)
- **Open / handoff:** CircleCI on the merge head. TriageChief merges.
- **Credit note:** TriageChief named the gate. Rules-Steward merged and kept the link check.

## 2026-11-11 14:20 UTC — Rules-Steward — evidence checker follows mapping links

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** Cursor Bugbot review on PR #18365
- **Role:** executed
- **Files:** `scripts/compliance-evidence.js` (added markdown-link collection beside the existing backtick scan); `tests/compliance-evidence.test.js` (added)
- **What was done:** The checker only collected backtick paths under `products/`, `scripts/`, `mcp-servers/`, `.github/`, and `.circleci/`. `NIST_READINESS.md` cites those files as relative markdown links, so a deleted citation still reported `missing: []`. Relative links are now resolved from the document directory. `http` links stay out. The live check reports 37 paths and none missing.
- **Decisions:** Keep the old backtick rule and add link resolution next to it — because replacing the checker would drop the 2026-11-10 behavior.
- **Sources:** [Bugbot review on PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365#discussion_r4538945807)
- **Commits / PRs:** [PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365)
- **Open / handoff:** TriageChief still merges. Issue #18343 body edit remains blocked by the 403 on the installation token.
- **Credit note:** Bugbot found the gap. Rules-Steward fixed it.

## 2026-11-11 14:10 UTC — Rules-Steward — NIST readiness mapping (WR #18343)

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** TriageChief, rescope of WR #18343, approved 2026-11-11
- **Role:** executed
- **Files:** `docs/compliance/NIST_READINESS.md` (added); `docs/compliance/NIST_COMPLIANCE.md` (appended rescope note); `docs/compliance/SP-800-53-OVERLAYS.md` (appended rescope note); `scripts/compliance-evidence.js` (added the new document to the existing path check); `CHANGELOG.md` (appended); `LEDGER.md` (added, first entry); `wr/memory/decisions.jsonl` (appended)
- **What was done:** Mapped repository controls that could be pointed at in the tree to SP 800-53 Rev. 5 families AC, AU, IA, CM, SI, SA, SR, and IR. Each row is implemented, partial, or gap. A2A is recorded as not implemented because issue #18340 is still open and no signed agent-to-agent path was found. Identity is recorded as the shared GitHub login `midnghtsapphire` plus the bot-name prefix and signature in `docs/BOT-COMMON-RULES.md`.
- **Decisions:** Deliver a readiness mapping rather than a compliance attestation — because NIST has published no AI-agent standard and no agent SP 800-53 overlay, COSIS (formerly COSAiS) lists NISTIR 8605D as a planned volume that is not yet drafted, and NIST offers no readiness assessment. The 2026-11-10 overlay file stays and is deferred until 8605D is published. The mapping will be re-done when that volume is published.
- **Sources:** [NIST COSIS project page](https://csrc.nist.gov/Projects/cosis) (read 2026-11-11); [NIST AI Agent Standards Initiative announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure) (17 February 2026); [COSAiS annotated outline, January 2026](https://csrc.nist.gov/csrc/media/Projects/cosais/documents/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf); [SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final). No Library/ copy of these sources was already in the repo, so the links are the record.
- **Commits / PRs:** branch `cursor/nist-readiness-mapping-2ab3`. PR link to be added in a later ledger entry after the PR exists, not by rewriting this one.
- **Open / handoff:** CircleCI must be green. TriageChief merges. Follow-up work listed in `docs/compliance/NIST_READINESS.md` is not opened here. Next owner: TriageChief.
- **Credit note:** Rules-Steward executed the mapping and the ledger entry. TriageChief approved the rescope. Audrey Evans owns the repository.
