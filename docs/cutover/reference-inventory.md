# Reference inventory: AGENTS.md and VISITING_AGENTS.md

**Generated 14 Nov 2026 (America/Denver)** on branch `triage/rules-metal-cutover` (draft PR #18409).

Method (MEASURED): `git grep -I -n -E 'AGENTS\.md|VISITING_AGENTS\.md'` on this branch after the cutover edits.
A "hit" is one occurrence of either filename in a line (a line can count more than once if it names both, or names one file twice).
"Section-like cites" are lines that also look like a section pointer (`§`, `section 1b`, a markdown fragment `#...`, or "Checkpoint-Gated Grids").

This inventory is documentary. **This PR does not change other CI config or workflows** to retarget these cites. CircleCI's comment citing `VISITING_AGENTS.md` section 1b is unchanged; the `VISITING_AGENTS.md` stub keeps that heading and maps it to `AGENTS.md` F2 and F3. Remaining section citations are a Phase 1 item in [`../CUTOVER_PLAN.md`](../CUTOVER_PLAN.md).

BALLS (discussion comment 19620341) reported about 436 files on `main` citing `AGENTS.md` or `VISITING_AGENTS.md`. Counts below are for this cutover branch, which also has `legacy/` copies and the new stubs.

## Totals

| Scope | Files | AGENTS.md hits | VISITING_AGENTS.md hits | Total hits | Section-like lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Whole tree | 451 | 1646 | 77 | 1723 | 26 |
| Excluding `legacy/` | 443 | 1579 | 68 | 1647 | 20 |
| `legacy/` only | 8 | 67 | 9 | 76 | 6 |

## CircleCI (unchanged in this PR, except the flagged sync step)

`.circleci/config.yml` still cites `VISITING_AGENTS.md` section 1b for the visiting-agent scan. The scan itself reads `config/visiting-agent-patterns.json`, not the markdown file. The stub keeps `## 1b. Hard rules, checked by CI` so the named section remains resolvable.

## Counts per file (excluding `legacy/`)

| File | AGENTS.md hits | VISITING_AGENTS.md hits | Total | Section-like cites |
| --- | ---: | ---: | ---: | ---: |
| `VISITING_AGENTS.md` | 31 | 6 | 37 | 1 |
| `docs/AGENTS.md` | 30 | 0 | 30 | 0 |
| `docs/CUTOVER_PLAN.md` | 25 | 3 | 28 | 1 |
| `CHANGELOG.md` | 17 | 4 | 21 | 1 |
| `docs/BOT-ROSTER.json` | 17 | 2 | 19 | 1 |
| `docs/agents/claude/transcripts/2026-06-19-201640-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-201956-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202006-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202027-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202035-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202104-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202109-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202129-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202148-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202206-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202212-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202236-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202243-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202500-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202508-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202524-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202537-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202620-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202638-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202652-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202702-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202721-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202742-369106c0-696c-52c3-bfb5-cd72cf1896a8.jsonl` | 16 | 0 | 16 | 0 |
| `LEDGER.md` | 13 | 2 | 15 | 1 |
| `agent-pack/AGENTS.md` | 15 | 0 | 15 | 0 |
| `docs/prompts/LLM/noseynoodle/SYSTEM_PROMPT.md` | 11 | 3 | 14 | 1 |
| `MASTER.md` | 13 | 0 | 13 | 0 |
| `docs/BOT-COMMON-RULES.md` | 13 | 0 | 13 | 0 |
| `docs/DEFINITION_OF_DONE.md` | 13 | 0 | 13 | 0 |
| `docs/MERGE_AND_OVERRIDE_POLICY.md` | 13 | 0 | 13 | 0 |
| `docs/REVVEL_MASTER_STANDARDS.md` | 13 | 0 | 13 | 0 |
| `docs/compliance/NIST_READINESS.md` | 8 | 4 | 12 | 0 |
| `docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md` | 12 | 0 | 12 | 0 |
| `scripts/bootstrap-repo.sh` | 12 | 0 | 12 | 0 |
| `tests/context_graph_test.py` | 8 | 3 | 11 | 0 |
| `docs/ISSUE_RESOLUTION_AGENT_STANDARDS.md` | 10 | 0 | 10 | 0 |
| `docs/AGENTS_RETRO_REVIEW.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-201640-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-201956-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202006-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202027-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202035-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202104-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202109-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202129-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202148-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202206-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202212-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202236-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202243-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202500-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202508-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202524-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202537-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202620-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202638-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202652-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202702-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202721-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/agents/claude/transcripts/2026-06-19-202742-369106c0-696c-52c3-bfb5-cd72cf1896a8.md` | 9 | 0 | 9 | 0 |
| `docs/bnatsheaf/MOTU_MASTER_PROMPT.md` | 6 | 3 | 9 | 0 |
| `docs/bots/bot-cloudy/README.md` | 7 | 2 | 9 | 0 |
| `llms.txt` | 7 | 2 | 9 | 0 |
| `mcp-servers/gemini-notebook-mcp-cli/src/notebooklm_tools/cli/commands/skill.py` | 9 | 0 | 9 | 0 |
| `trust-community/audits/revvel-standards/truthslayer-report.md` | 8 | 0 | 8 | 0 |
| `docs/Master_Inventory/AUTONOMOUS_AGENT_IMPLEMENTATION.md` | 7 | 0 | 7 | 0 |
| `docs/tool-history/TOOLS.csv` | 4 | 3 | 7 | 0 |
| `docs/tool-history/visiting-llms.md` | 5 | 2 | 7 | 1 |
| `projects/devina-imposter/SPEC.md` | 7 | 0 | 7 | 0 |
| `scripts/context_graph.py` | 5 | 2 | 7 | 0 |
| `seed.md` | 6 | 1 | 7 | 2 |
| `wr/fleet-maintenance/music-projects/AGENTS.md` | 7 | 0 | 7 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/AGENTS.md` | 7 | 0 | 7 | 0 |
| `IMPLEMENTATION_SUMMARY.md` | 6 | 0 | 6 | 0 |
| `docs/bnatsheaf/README.md` | 4 | 2 | 6 | 0 |
| `scripts/ghcr-setup.js` | 6 | 0 | 6 | 0 |
| `scripts/mergeme-wiring.js` | 6 | 0 | 6 | 0 |
| `wr/issues/issue-15428-github-plugin-claude-by-anthropic-dragnet-add-this.md` | 6 | 0 | 6 | 0 |
| `.circleci/config.yml` | 4 | 1 | 5 | 1 |
| `.github/copilot-instructions.md` | 5 | 0 | 5 | 0 |
| `.sandbox/claude-code-opus5/SESSION.md` | 4 | 1 | 5 | 0 |
| `AGENTS.md` | 5 | 0 | 5 | 0 |
| `HANDOFF.md` | 4 | 1 | 5 | 1 |
| `docs/Master_Inventory/COMPLIANCE_RUBRIC.md` | 5 | 0 | 5 | 0 |
| `docs/Universal-BOM_List/FOLDER_STRUCTURE_RECOMMENDATIONS.md` | 5 | 0 | 5 | 0 |
| `docs/bots/bot-cartographer/README.md` | 5 | 0 | 5 | 0 |
| `docs/tool-history/manus.md` | 4 | 1 | 5 | 1 |
| `mcp-servers/gemini-notebook-mcp-cli/CHANGELOG.md` | 5 | 0 | 5 | 0 |
| `trust-community/audits/revvel-standards/truthslayer-report.json` | 5 | 0 | 5 | 0 |
| `wr/issues/issue-15247-red-light-therapy-comprehensive-evidence-based-analy.md` | 5 | 0 | 5 | 0 |
| `START_HERE_CALL_CHAIN.md` | 3 | 1 | 4 | 0 |
| `docs/30Dayiteration/IMPLEMENTATION_SUMMARY_30DAY_LAUNCH.md` | 4 | 0 | 4 | 0 |
| `docs/AGENT_PROMPT_EXECUTION_EVALUATION.md` | 4 | 0 | 4 | 0 |
| `docs/IMPLEMENTATION_SUMMARY_AGENT_FALLBACK.md` | 4 | 0 | 4 | 0 |
| `docs/bots/bot-promptorchestrator/README.md` | 4 | 0 | 4 | 0 |
| `docs/llms-txt-eval-2026-08-27.md` | 4 | 0 | 4 | 0 |
| `docs/tool-history/README.md` | 2 | 2 | 4 | 1 |
| `projects/devina-imposter/HANDOFF.md` | 4 | 0 | 4 | 0 |
| `scripts/visiting-agent-scan.js` | 2 | 2 | 4 | 0 |
| `skills/openclaw-self-eval/SKILL.md` | 4 | 0 | 4 | 0 |
| `skills/project-router/detect.py` | 3 | 1 | 4 | 0 |
| `standards/SUGGESTION_HANDLING_STANDARD.md` | 4 | 0 | 4 | 0 |
| `tests/verify-the-postcondition-standard.test.js` | 4 | 0 | 4 | 0 |
| `wr/issues/issue-DRAFT-provenance-ledger-automation.md` | 3 | 1 | 4 | 0 |
| `.github/pull_request_template.md` | 3 | 0 | 3 | 0 |
| `.github/workflows/weekly-research.yml` | 3 | 0 | 3 | 0 |
| `THINKING_SCRATCHPAD.md` | 3 | 0 | 3 | 0 |
| `docs/CODE_REVIEW_WORKFLOW_STATUS.md` | 3 | 0 | 3 | 0 |
| `docs/ROO_CLINE_SETUP.md` | 3 | 0 | 3 | 0 |
| `docs/WEEKLY_RESEARCH_PROCESS.md` | 3 | 0 | 3 | 0 |
| `docs/agents/grokapi/HANDOFF.md` | 2 | 1 | 3 | 0 |
| `docs/agents/grokapi/PROFILE.md` | 2 | 1 | 3 | 0 |
| `docs/bnatsheaf/BNAT_SHEAF_STANDARD.md` | 2 | 1 | 3 | 0 |
| `docs/bots/bot-git-master/README.md` | 3 | 0 | 3 | 0 |
| `docs/bots/bot-pedal-to-the-metal/README.md` | 3 | 0 | 3 | 0 |
| `docs/bots/bot-promptsteward/README.md` | 3 | 0 | 3 | 0 |
| `docs/premolt/PLAN.md` | 3 | 0 | 3 | 0 |
| `docs/process/REVVEL_TRIGGER_CATALOG.md` | 2 | 1 | 3 | 0 |
| `docs/prompts/LLM/cartographer/SYSTEM_PROMPT.md` | 3 | 0 | 3 | 0 |
| `install/mac/install-revvel-skills.command` | 3 | 0 | 3 | 0 |
| `install/windows/install-revvel-skills.bat` | 3 | 0 | 3 | 0 |
| `learnings.md` | 3 | 0 | 3 | 0 |
| `scripts/check-compliance.js` | 3 | 0 | 3 | 0 |
| `scripts/openrouter-personas.js` | 2 | 1 | 3 | 0 |
| `skills/openclaw-self-eval/tests/promptfoo.yml` | 3 | 0 | 3 | 0 |
| `standards/MOBILE_TESTING.md` | 3 | 0 | 3 | 0 |
| `standards/SELF_HEALING_STANDARDS.md` | 3 | 0 | 3 | 0 |
| `templates/issue-template-archive/issue.yml` | 3 | 0 | 3 | 0 |
| `wr/IMPLEMENTATION_SUMMARY.md` | 3 | 0 | 3 | 0 |
| `wr/README.md` | 3 | 0 | 3 | 0 |
| `wr/WR-MOTU-BNAT-SHEAF.md` | 2 | 1 | 3 | 0 |
| `wr/fleet-maintenance/music-projects/tests/repo-baseline.test.js` | 3 | 0 | 3 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/tests/repo-baseline.test.js` | 3 | 0 | 3 | 0 |
| `wr/issues/issue-13483-we-need-to-update-research-engine-prompt-stack-use.md` | 3 | 0 | 3 | 0 |
| `wr/issues/issue-13886-social-agent-ecosystem-wr-working-requirements-pro.md` | 3 | 0 | 3 | 0 |
| `wr/issues/issue-14703-fleet-maintenance-midnghtsapphire-infrastructure.md` | 3 | 0 | 3 | 0 |
| `wr/issues/issue-14723-research-openclaw-web-agent-nikola66.md` | 3 | 0 | 3 | 0 |
| `wr/issues/issue-social-agent-ecosystem-wr.md` | 3 | 0 | 3 | 0 |
| `wr/memory/learnings-bnat-sheaf.md` | 2 | 1 | 3 | 0 |
| `wr/summaries/optional-intelligence-experiments-2026-11-10.md` | 2 | 1 | 3 | 0 |
| `.github/workflows/auto-error-handler.yml` | 2 | 0 | 2 | 1 |
| `.mcp.json` | 2 | 0 | 2 | 0 |
| `AGENT_BUILD_PROMPT.md` | 2 | 0 | 2 | 0 |
| `CODE_REVIEW_STANDARD.md` | 2 | 0 | 2 | 0 |
| `GOAP.md` | 2 | 0 | 2 | 0 |
| `config/visiting-agent-patterns.json` | 1 | 1 | 2 | 0 |
| `docs/AGENT_AUDIT_MONITORING.md` | 2 | 0 | 2 | 0 |
| `docs/AGENT_FALLBACK_PROCESS.md` | 2 | 0 | 2 | 0 |
| `docs/AGENT_PROMPT_CONVENTION.md` | 2 | 0 | 2 | 0 |
| `docs/AUTOMATION_AUDIT.md` | 2 | 0 | 2 | 0 |
| `docs/AUTOMATION_EXTENSIONS_INTEGRATION.md` | 2 | 0 | 2 | 1 |
| `docs/GOVERNANCE_GAP_CLOSURE_REPORT.md` | 2 | 0 | 2 | 1 |
| `docs/GRADLE_ACTIONS_EVAL_2026-04-28.md` | 2 | 0 | 2 | 0 |
| `docs/NEEDS_ACTION_ROUTER_PROCESS.md` | 2 | 0 | 2 | 0 |
| `docs/PR_REVIEW_REQUEST_AUTOMATION.md` | 2 | 0 | 2 | 0 |
| `docs/WR_FLOW_DIAGRAM.md` | 2 | 0 | 2 | 0 |
| `docs/archive/README.md` | 2 | 0 | 2 | 0 |
| `docs/bots/bot-prompttester/README.md` | 2 | 0 | 2 | 0 |
| `docs/bots/bot-rules-steward/README.md` | 2 | 0 | 2 | 0 |
| `docs/prompts/LLM/noseynoodle/GROK_SETUP.md` | 2 | 0 | 2 | 0 |
| `docs/proposals/approved/fieldwork-extraction-and-pdf-products.md` | 2 | 0 | 2 | 0 |
| `docs/tool-history/claude.md` | 1 | 1 | 2 | 0 |
| `docs/tool-history/cursor.md` | 1 | 1 | 2 | 0 |
| `osint-hub/README.md` | 2 | 0 | 2 | 0 |
| `products/cli-engine/README.md` | 2 | 0 | 2 | 0 |
| `products/ghcr-console/lib/ghcr.ts` | 2 | 0 | 2 | 0 |
| `products/mergeme-status/lib/wiring.ts` | 2 | 0 | 2 | 0 |
| `projects/devina-imposter/SUMMARY.md` | 2 | 0 | 2 | 0 |
| `revvel-rosette-automation/README.md` | 2 | 0 | 2 | 0 |
| `scripts/BITO_README.md` | 2 | 0 | 2 | 0 |
| `skills/REGISTRY.md` | 2 | 0 | 2 | 0 |
| `skills/project-router/SKILL.md` | 2 | 0 | 2 | 0 |
| `skills/prompt-routing/SKILL.md` | 2 | 0 | 2 | 0 |
| `standards/INDIRECT_PROMPT_INJECTION_STANDARD.md` | 2 | 0 | 2 | 0 |
| `standards/SEARCH_AND_SOURCING.md` | 2 | 0 | 2 | 0 |
| `testing/SKILL.md` | 2 | 0 | 2 | 0 |
| `tests/compliance-evidence.test.js` | 1 | 1 | 2 | 0 |
| `tests/visiting-agent-scan.test.js` | 1 | 1 | 2 | 1 |
| `wr/WR_TRACKER.md` | 2 | 0 | 2 | 0 |
| `wr/fleet-maintenance/music-projects/docs/README.md` | 2 | 0 | 2 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/docs/README.md` | 2 | 0 | 2 | 0 |
| `wr/fleet-maintenance/nomad-navigator.patch` | 2 | 0 | 2 | 0 |
| `wr/greenfield-ui-research.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13357-connect-wr-template-dropdowns-to-automation-implem.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13369-things-sitting-too-long-in-not-ready.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13392-broken-wiring-all-throughout-revvel-standards.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13394-structural-problems-things-slowing-everything-down.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13403-how-do-we-correct-this-error-check-for-scaffolding.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13431-create-a-pdf-that-can-help-a-hotel-worker.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13437-automated-sellable-pdfs.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13459-rebrand-soup2bowl-its-all-wrong.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13460-create-engine-for-website-ui-creation-using-openro.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13476-lead-generation-engine-based-on-compilation-of-sou.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13535-need-a-database-architecture-fleet.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13546-create-a-website-that-generates-prompts-i-have-use.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13559-what-do-we-need-to-be-aaa-compliant-for-disabiliti.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13568-ship-to-market-auto-deploy-to-stores.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13569-revvel-skill-runner-ship-to-market.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13582-tell-me-how-we-could-implement-this-and-where-or-h.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13583-implement-this-for-revvel-standards-and-new-produc.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13584-ship-to-market-benchmarking-tool.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13587-roo-code-is-closing-up-shop-use-free-here-https-gi.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13630-research-and-implement-this-template-https-n8n-io-.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13653-please-evaluate-for-use-in-revvel-standards-this-o.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13664-create-product-for-the-graphify-new-implementation.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13666-ship-to-market-openmythos.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13681-create-a-github-action-that-assigns-midnghtsapphir.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13687-add-no-api-perplexity-rex-agent-in-oaudrey-as-rex-.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13688-add-no-api-perplexity-as-the-professor-to-assignee.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13700-create-webhook-inside-coder-labeler-that-calls-ope.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13745-review-https-github-com-google-ax-as-a-controller.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13746-create-pdf-skills-cli-mcp-api-video-1-hour-to-crea.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13757-implement-life-insurance-leads-and-fex.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13760-research-and-implement-this-for-life-insurance-lea.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13764-research-to-use-for-life-insurance-leadshttps-gith.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13783-revamp-pdf-creation-pdf-engine.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13786-update-api-generation-for-revvel-standards.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13788-update-music-generation-videos-in-revvel-standards.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13789-tiktok-video-generation-for-viral-music-campaign.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13796-create-tiktok-affliate-link-engine-part-of-what-re.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13797-master-affiliate-link-engine-generation.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13798-reviews-generation-add-and-update-in-revvel-standa.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13800-update-fine-tune-revvel-standards.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13802-update-revvel-standards-for-templates-for-each-of-.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13803-update-revvel-standards-with-all-these-prompts-and.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13834-assign-codeql-to-api-endpoints-and-everything-with.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13863-create-process-that-flags-off-duplicate-wr-and-pr.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13872-consolidate-standards-files-into-standards-directo.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13873-incorrect-product-timeline-30-days-needs-to-be-rem.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13882-build-a-full-stack-emergency-intelligence-platform.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13894-music-video-generation-website.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13939-integrate-new-functionality.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13995-fix-out-of-scope-mcppromptpack-variable-causing-mc.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-13997-add-test-coverage-for-audit-third-party-actions-sh.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14010-remove-redundant-red-ocean-100-cap-test-or-clarify.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14012-separate-generated-dashboard-html-artifact-from-fe.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14024-add-source-citations-for-seo-keyword-volume-and-cp.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14027-nppes-test-incorrectly-rejects-valid-empty-results.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14028-replace-fragile-marketing-copy-assertion-in-landin.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14060-standardize-blockquote-attributions-in-caveat-note.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-14753-console-neyox-ai-login-scrape.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-15266-qiu2022-efficacy-assessment-for-low-level.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-15299-can-ageing-be-slowed-by-harnessing-light-gowing-li.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-16827-fleet-maintenance-midnghtsapphire-music-projects.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-16831-fleet-maintenance-midnghtsapphire-no-kill-shelter-business.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-17646-fleet-maintenance-midnghtsapphire-oz-prompt-librar.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-17961-llms-txt-asset-synthesis.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-life-insurance-lead-generation-engine.md` | 2 | 0 | 2 | 0 |
| `wr/issues/issue-merchandise-asset-artifact-process.md` | 2 | 0 | 2 | 0 |
| `wr/pending/audit-2026-07-14/WR-A7-broken-links.md` | 2 | 0 | 2 | 0 |
| `.github/workflows/anti-scaffolding-enforcer.yml` | 1 | 0 | 1 | 0 |
| `.github/workflows/ci-error-prevention.yml` | 1 | 0 | 1 | 0 |
| `.github/workflows/host.yml` | 1 | 0 | 1 | 1 |
| `.github/workflows/ship-quality.yml` | 1 | 0 | 1 | 0 |
| `.github/workflows/wr-pr-creation.yml` | 1 | 0 | 1 | 0 |
| `.sandbox/claude-code-opus5/gen-preview-readmes.js` | 1 | 0 | 1 | 0 |
| `.sandbox/jules/AGENT.md` | 1 | 0 | 1 | 0 |
| `BUSINESSES.md` | 1 | 0 | 1 | 0 |
| `CLAUDE.md` | 1 | 0 | 1 | 0 |
| `IMPLEMENTATION_SUMMARY_BITO_AI.md` | 1 | 0 | 1 | 0 |
| `SYSTEM_STATE.md` | 1 | 0 | 1 | 0 |
| `config/routing-failover.yml` | 1 | 0 | 1 | 0 |
| `disaster-recovery/grok-build-2026-08-05/memory/MEMORY_SNAPSHOT.md` | 1 | 0 | 1 | 0 |
| `disaster-recovery/grok-build-2026-08-05/thoughts/SESSION_THOUGHT_PROCESS.md` | 1 | 0 | 1 | 0 |
| `docs/30Dayiteration/30_DAY_INTEGRATION_GUIDE.md` | 1 | 0 | 1 | 0 |
| `docs/30Dayiteration/README.md` | 1 | 0 | 1 | 1 |
| `docs/49AGENTS_EVALUATION.md` | 1 | 0 | 1 | 0 |
| `docs/AGENT_ROUTING_POLICY.md` | 1 | 0 | 1 | 0 |
| `docs/AUTONOMOUS_AGENT_QUICK_REF.md` | 1 | 0 | 1 | 0 |
| `docs/CALL-NAMES.md` | 1 | 0 | 1 | 0 |
| `docs/GHCR_SETUP.md` | 1 | 0 | 1 | 0 |
| `docs/GREENFIELD_UI_PIPELINE.md` | 1 | 0 | 1 | 0 |
| `docs/HIGH_VALUE_OPPORTUNITY_SELECTION_STANDARD.md` | 1 | 0 | 1 | 0 |
| `docs/ISSUE_542_SUMMARY.md` | 1 | 0 | 1 | 0 |
| `docs/JULES_AUTO_REVIEW_ROUTING.md` | 1 | 0 | 1 | 0 |
| `docs/MERGEME_INTEGRATION.md` | 1 | 0 | 1 | 0 |
| `docs/Master_Inventory/AGENTIC_METHODOLOGY_STANDARD.md` | 1 | 0 | 1 | 0 |
| `docs/OSINT_POLAR_SOUTH_PARK_FOLLOWUP.md` | 1 | 0 | 1 | 0 |
| `docs/REVVEL_STANDARDS_AUDIT.md` | 1 | 0 | 1 | 0 |
| `docs/TRIAGE_FAILED_RECOVERY_GAP.md` | 1 | 0 | 1 | 0 |
| `docs/WORKFLOW_STATE_MACHINE.md` | 1 | 0 | 1 | 0 |
| `docs/WR_STUCK_STATES_FIX_SUMMARY.md` | 1 | 0 | 1 | 0 |
| `docs/agent-stack/DEVIN_OBSERVATIONS.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-aba-publishops/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-aba-shortswriter/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-aidinventor/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-archexplorer/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-assethunter/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-atomic-illuminator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-audiologist/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-avatarreel/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-balls/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-blue-ocean-inventor/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-bookcrew-covercrafter/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-bookcrew-evaluator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-bookcrew-publisher/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-bookcrew-reviewer/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-cagecodeclerk/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-changeauditor/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-channelscout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-citechecker/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-cloudexecutor/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-codescout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-conflictreviewer/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-corpusbot/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-dbarchitect/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-decipherer/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-fleet-orchestrator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-freedomangelops/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-git-brain-dump/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-git-classifier/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-grammarbot/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-granthunter/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-hackerpulse/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-hearingorchestrator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-indexrunner/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-libraryarchivist/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-localbedscout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-localfilescout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-localstudio/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-mailclerk/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-marketshipper/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-mechsensorforge/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-medicalear/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-mergemender/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-mixcaptain/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-moneycrew-git-controller/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-noseynoodle/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-optstability/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-outbound-prospecting/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-paperfinder/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-phonelaptopmigrator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-pipeline-warden/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-projects-manager/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-promptinator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-promptiscuous/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-proofy/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-quickwin-builder/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-quickwin-playbook/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-quickwin-rainmaker/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-quickwin-testharness/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-researchrodney/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-reviewerforge/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-rightsscout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-scalebench/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-searchorchestrator/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-secret/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-aquifer/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-backscatter/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-bedrock/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-chitin/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-deepscan/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-fringe/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-fusion/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-godotforge/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-humus/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-isotope/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-ledgerplay/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-loam/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-pixellantern/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-quartz/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-quill/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-strata/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-strata/SYSTEM_PROMPT.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-verity/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-sense-waveform/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-seolongtailhashtag/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-settingssteward/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-songscrubber/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-storeregistrar/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-ticktac/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-triagechief/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-webscout/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-wineresearchagent/README.md` | 1 | 0 | 1 | 0 |
| `docs/bots/bot-xpulse/README.md` | 1 | 0 | 1 | 0 |
| `docs/examples/README.md` | 1 | 0 | 1 | 0 |
| `docs/growlingeyes/REBRAND_PROPOSAL.md` | 1 | 0 | 1 | 0 |
| `docs/ml-assets/SOURCES.md` | 1 | 0 | 1 | 0 |
| `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md` | 1 | 0 | 1 | 0 |
| `docs/prompts/README.md` | 1 | 0 | 1 | 0 |
| `docs/teams/promptcrew-team/README.md` | 1 | 0 | 1 | 0 |
| `mcp-servers/gemini-notebook-mcp-cli/AGENTS.md` | 1 | 0 | 1 | 0 |
| `products/creator-payout-tracker/README.md` | 1 | 0 | 1 | 0 |
| `products/deck-to-video-kit/README.md` | 1 | 0 | 1 | 0 |
| `products/life-insurance-lead-engine/build/CLAUDE.md` | 1 | 0 | 1 | 0 |
| `products/life-insurance-lead-saas/build/CLAUDE.md` | 1 | 0 | 1 | 0 |
| `products/revvel-skill-runner/build/CLAUDE.md` | 1 | 0 | 1 | 0 |
| `products/ugc-review-generator/CLAUDE.md` | 1 | 0 | 1 | 0 |
| `products/wr-title-studio/README.md` | 1 | 0 | 1 | 0 |
| `projects/devina-imposter/IMPLEMENTATION.md` | 1 | 0 | 1 | 0 |
| `promptforproject.md` | 1 | 0 | 1 | 0 |
| `recurse-rules.md` | 1 | 0 | 1 | 0 |
| `revenue/oaudrey-malama-open-core.md` | 1 | 0 | 1 | 0 |
| `revvel-rosette-automation/IMPLEMENTATION_SUMMARY.md` | 1 | 0 | 1 | 0 |
| `revvel-rosette-automation/docs/directory-structure.txt` | 1 | 0 | 1 | 0 |
| `schemas/agent-contract.schema.json` | 1 | 0 | 1 | 1 |
| `scripts/host.js` | 1 | 0 | 1 | 0 |
| `scripts/openrouter-triage.js` | 1 | 0 | 1 | 0 |
| `scripts/sandbox-bootstrap.sh` | 1 | 0 | 1 | 0 |
| `scripts/wr-preprocess.js` | 1 | 0 | 1 | 0 |
| `skills/SKILLS_INDEX.yml` | 1 | 0 | 1 | 0 |
| `skills/bot-creator/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/bot-creator/bot-creator.skill.yml` | 1 | 0 | 1 | 0 |
| `skills/dragnet-scaffold/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/grant-mgmt-agent/IMPLEMENTATION_GUIDE.md` | 1 | 0 | 1 | 0 |
| `skills/grant-mgmt-agent/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/openrouter-swarms/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/persona-engine/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/project-router/project-router.skill.yml` | 1 | 0 | 1 | 0 |
| `skills/project-router/routes.yml` | 1 | 0 | 1 | 0 |
| `skills/self-healer/SKILL.md` | 1 | 0 | 1 | 0 |
| `skills/ui-creation-engine/SKILL.md` | 1 | 0 | 1 | 0 |
| `standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md` | 1 | 0 | 1 | 0 |
| `standards/NOIMOSAI_INTEGRATION_STANDARD.md` | 1 | 0 | 1 | 0 |
| `standards/PROACTIVE_PREFLIGHT.md` | 1 | 0 | 1 | 0 |
| `standards/PRODUCT_INCUBATION_STANDARD.md` | 1 | 0 | 1 | 0 |
| `tests/check-workflow-yaml.test.js` | 1 | 0 | 1 | 0 |
| `tests/main-gate-cannot-be-silenced.test.js` | 1 | 0 | 1 | 0 |
| `tests/music-projects-fleet-package.test.js` | 1 | 0 | 1 | 0 |
| `tests/no-kill-shelter-business-fleet-package.test.js` | 1 | 0 | 1 | 0 |
| `ui/freedom-angel-repo-manager/MASTER_PROMPT.md` | 1 | 0 | 1 | 0 |
| `workflows/IMPLEMENTATION_SUMMARY.md` | 1 | 0 | 1 | 0 |
| `wr/FINAL_SUMMARY.md` | 1 | 0 | 1 | 0 |
| `wr/USAGE.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/music-projects/CHANGELOG.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/music-projects/CONTRIBUTING.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/music-projects/README.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/music-projects/docs/OVERVIEW.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/CHANGELOG.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/CONTRIBUTING.md` | 1 | 0 | 1 | 0 |
| `wr/fleet-maintenance/no-kill-shelter-business/README.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-14705-fleet-maintenance-k9-community-site.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15237-medical-device-compliance-testing-micom-labs-create.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15249-photobiomodulation-pbm-devices-premarket-notificat.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15283-laser-therapy-for-stretch-marks.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15301-efficacy-of-photobiomodulation-therapy-in-older-adults-a-systematic-review.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15325-2016-proposed-mechanisms-of-photobiomodulation-or-.md` | 1 | 0 | 1 | 0 |
| `wr/issues/issue-15331-the-role-of-sirtuins-in-dermal-fibroblast-function-pmc.md` | 1 | 0 | 1 | 0 |

## Counts per file (`legacy/` only)

| File | AGENTS.md hits | VISITING_AGENTS.md hits | Total | Section-like cites |
| --- | ---: | ---: | ---: | ---: |
| `legacy/README.md` | 40 | 5 | 45 | 5 |
| `legacy/VISITING_AGENTS.md` | 8 | 0 | 8 | 0 |
| `legacy/docs/BOT-COMMON-RULES.md` | 5 | 2 | 7 | 0 |
| `legacy/AGENTS.md` | 4 | 2 | 6 | 0 |
| `legacy/docs/AGENTS.md` | 6 | 0 | 6 | 0 |
| `legacy/.github/copilot-instructions.md` | 2 | 0 | 2 | 0 |
| `legacy/agent-pack/AGENTS.md` | 1 | 0 | 1 | 0 |
| `legacy/docs/DEFINITION_OF_DONE.md` | 1 | 0 | 1 | 1 |

## Sample section-like lines

These are examples, not an exhaustive rewrite list. Phase 1 can walk this inventory and retarget cites to `AGENTS.md` IDs.

- `legacy/README.md` L34: CircleCI and other docs cite old section IDs (for example `.circleci/config.yml` cites "VISITING_AGENTS.md section 1b"). This PR does not change other CI config
- `legacy/README.md` L43: | §2b Imprint-at-spawn (BNAT Knowledge Sheaf) | not in `AGENTS.md` (A4: advice); see this legacy file |
- `legacy/README.md` L47: | §6 What already runs the fleet | not in `AGENTS.md` (A4: advice); see this legacy file |
- `VISITING_AGENTS.md` L22: CircleCI and other docs cite sections of this file by name (for example `.circleci/config.yml` cites "VISITING_AGENTS.md section 1b"). Those IDs now map to `AGE
- `docs/CUTOVER_PLAN.md` L42: **Phase 1: finish the single rulebook.** Move the remaining rule-bearing files that still disagree with `AGENTS.md` into `legacy/` the same way (rename, pointer
- `CHANGELOG.md` L33: - Added the visiting-agent hard rules to `VISITING_AGENTS.md` (section 1b) and a check, `scripts/visiting-agent-scan.js`, driven by `config/visiting-agent-patte
- `docs/BOT-ROSTER.json` L220: "description": "# Cartographer: revvel-standards claims-vs-reality auditor\n\n## Who you are\nYou are Cartographer. You audit the GitHub account midnghtsapphire
- `LEDGER.md` L77: - **Files:** `docs/tool-history/` (added: README, `TOOLS.csv`, 44 tool files, `visiting-llms.md`); `VISITING_AGENTS.md` (added section 1b; nothing removed); `sc
- `docs/prompts/LLM/noseynoodle/SYSTEM_PROMPT.md` L122: - ships TODOs, stubs or tool fingerprints (VISITING_AGENTS.md §1, standards/AGENT_SCAFFOLDING_BAN.md)
- `docs/tool-history/visiting-llms.md` L31: [`VISITING_AGENTS.md`](../../VISITING_AGENTS.md) section 1b.
- `seed.md` L31: Read in order. You are now the eldest agent. Follow AGENTS.md §0: read the call chain,
- `seed.md` L33: REVVEL_LLM_ALLOW_CLOUD=="1"). Instantiation: instantiate the fleet per AGENTS.md §4 —
- `.circleci/config.yml` L46: # Visiting-agent rule (VISITING_AGENTS.md section 1b): flags tracker,
- `HANDOFF.md` L96: 1. Read `docs/AGENTS.md` § Checkpoint-Gated Grids first.
- `docs/tool-history/manus.md` L32: - Repo record: AGENTS.md section "Orchestrator discipline" says a capable agent (e.g. Manus) kept doing the work itself instead of assigning it out and recordin
- `docs/tool-history/README.md` L72: [`VISITING_AGENTS.md`](../../VISITING_AGENTS.md) section 1b. They are checked by
- `.github/workflows/auto-error-handler.yml` L211: body += `**Reference:** See [AGENTS.md](docs/AGENTS.md#agent-autonomy--obsessive-self-sufficiency) for autonomy protocol.\n`;
- `docs/AUTOMATION_EXTENSIONS_INTEGRATION.md` L199: | *Scope: review AGENTS.md, skills, standards, templates, `.github/`* | §1 + §6: cross-references AGENTS.md mandatory skills (vault-agent, fork-audit-bot), the 
- `docs/GOVERNANCE_GAP_CLOSURE_REPORT.md` L205: - Old stubs remain in git history per AGENTS.md §1
- `tests/visiting-agent-scan.test.js` L3: // Guards the visiting-agent rule (VISITING_AGENTS.md section 1b).
- `.github/workflows/host.yml` L9: # docs/AGENTS.md § Checkpoint-Gated Grids for the review semantics.
- `docs/30Dayiteration/README.md` L4: > standard (`docs/DEFINITION_OF_DONE.md` §6, `docs/AGENTS.md`, EXRUP in
- `legacy/docs/DEFINITION_OF_DONE.md` L37: See `docs/AGENTS.md` § Checkpoint-Gated Grids.
- `schemas/agent-contract.schema.json` L5: "description": "Decomposition of one Work Request (Grid) into Blocks and Threads. Produced by the Host from a WR issue; consumed by agent-fallback.yml to dispat
