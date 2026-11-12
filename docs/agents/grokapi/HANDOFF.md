# Grok API Navigator — documentation handoff

**Date:** November 12, 2026. **Authoring role:** delegated Manus documentation specialist. **Persona:** Grok API Navigator, canonical `grokapi`; aliases `grok-api`, `xai-api`, `grok-demo`, `grok-test`.

## Delivered scope

Created only `PROFILE.md`, `README.md`, and this `HANDOFF.md` under `docs/agents/grokapi/`. The profile follows the supplied agent-factory structure and covers inputs, responsibilities, protocol, security, test matrix, diagnosis, outputs, and acceptance. The README documents the recommended `/persona grokapi <task>` invocation.

No existing files were overwritten or deleted. No Git operations, commits, pushes, PR creation, registry implementation, workflow changes, live API requests, dependency installation, credentials, skill, schedule, webhook, or saved Manus agent were created by this documentation task. GitHub permissions were not exercised or independently verified.

**Documentation is delivered; integration is CAN-PARTIAL:** the main agent owns the registry entry and keyword metadata in `scripts/openrouter-personas.js`, plus draft-branch publication and review. The requested private demo destination is <https://github.com/midnghtsapphire/grok-api-demo>; intended code branch is `feat/tested-grok-demo-2026-11-12`. These are owner-provided targets, not a claim that this task pushed them or verified a PR URL. These persona documents will be publicly visible after the draft branch push; they contain no key or reasoning trace.

## Guidance and source context

Read the supplied `AGENTS.md`, `VISITING_AGENTS.md`, `templates__agent-factory__AGENT_TEMPLATE.md`, and `AGENT_FACTORY_STANDARD.md` from `/home/ubuntu/revvel-guidance/`, plus its write-as-you-go and review standards. Read `/home/ubuntu/grok-api-demo/README.md`, `CAPABILITIES.md`, `TEST_RESULTS.md`, `grok_demo.py`, `test_demo.py`, the sanitized JSON reports below, and the supplied call-chain reference.

The task's explicit path restriction and no-Git instruction govern this delivery; broader standard requests to update other files or publish immediately were not executed. No second pipeline was introduced.

## Original live evidence—not rerun here

All original tests target `https://api.x.ai/v1`; the generation model is `grok-4.7`. The original configured key is not copied or required to read the evidence.

| Original artifact | Recorded UTC time | Observed result |
| --- | --- | --- |
| `smoke-test.json` | 2026-11-12 19:22:42.833685 | Separate Chat Completions HTTP 200; exact final answer `GROK_API_OK` |
| `live-test-results.json` | 2026-11-12 19:25:32.212563 | Seven core requests, all HTTP 200, empty failures list |
| `web-search-test-results.json` | 2026-11-12 19:26:13.272166 | One Responses request, HTTP 200, empty failures list; two reported web-search calls |

The core seven requests comprise discovery, chat, Responses, streaming, JSON extraction, and two custom-function round-trip requests. Thus **eight feature-suite requests** succeeded; the earlier smoke test is separate. `TEST_RESULTS.md` also reports an initial HTTP 200 discovery probe; no separate count is inferred from an uninspected probe artifact.

The JSON result was `{"product":"rooftop planters","quantity":3,"unit_price_usd":25}`, with local schema and numeric checks. The allowlisted `rectangle_area` call used dimensions 4.0 by 3.0 meters and produced local `12.00`, then final `12.00 m²` (formatted in the JSON report). Streaming produced complete final text and usage without displaying reasoning traces.

Web search returned citation URLs and a legacy quickstart path. That success does not guarantee link freshness. No performance/reliability benchmark, universal account/model access, exhaustive failure-path coverage, or dollar total is claimed. Provider raw cost units were not converted.

## Original offline tests and current verification

`TEST_RESULTS.md` records **six original offline unit tests passed**, successful compilation, and an original deliverable scan finding no copy of the configured API key. That scan is reported historical evidence, not a new secret-value comparison performed here.

Current attempted rerun, executed from `/home/ubuntu/grok-api-demo` with credentials removed and bytecode writes disabled:

```bash
env -u XAI_API_KEY PYTHONDONTWRITEBYTECODE=1 \
  python3 -B -m unittest -v test_demo.py
```

**Current outcome: exit 1, import blocked by `ModuleNotFoundError: No module named 'jsonschema'`.** The loader reported one failed import; none of the six test methods executed. This is a dependency gap in the current system interpreter, not evidence that the six assertions regressed. No installation was attempted because writes outside the permitted documentation directory were forbidden.

The original test methods cover final-text-only extraction for Chat and Responses, empty output, citation deduplication, multiline SSE/completion marker parsing, and missing-key failure before network. Both `grok_demo.py` and `test_demo.py` compiled successfully **in memory**, without `.pyc` artifacts. Current read-only JSON validation confirmed seven core 200 statuses and one search 200 status with empty failures lists.

## Evidence fingerprints

SHA-256 fingerprints of the original files read in this task:

| File | SHA-256 |
| --- | --- |
| `grok_demo.py` | `b4b44fabd94f910e04d30b42b2596f8f2d8aa8d3c74f072af2edffe8ddae604e` |
| `test_demo.py` | `197d3b2714dc1596f2c55ace0a7835f6c19b6cb9c3f9cb9d8d4ead5414705834` |
| `TEST_RESULTS.md` | `0586da7d7f933389f39a86a02cd8e6a41dca61e91532f9001c39aa779b2fcf36` |
| `smoke-test.json` | `e41089e620bd637a98b120d128fd96ca3cbbe1db32440ac1d7813a0c831e527b` |
| `live-test-results.json` | `7f48c0f5323b21095a9da7d389d442268b46df0f63a6eb004b4021455749cdc4` |
| `web-search-test-results.json` | `a05e936fba9db06bc447fbad9dc860f528ae0cdfcd015e988b8ac77db48cc67f` |

Reports remain in the original demo folder; they were not copied into publicly visible persona documentation. Fingerprints identify local evidence bytes, not remote publication or authorship verification.

## Untested and next-agent acceptance

Optional `x-search` and `vision` were not live-tested. Voice, image/video generation, and SDK alternatives were not implemented/tested by these demos. Negative HTTP 401/429 cases were not exercised live. No account settings were changed. Token caps, timeouts, and requested tool-call limits are not spending caps; ambiguous timeouts must not be retried automatically.

The main agent should confirm registration, canonical/alias resolution, provider-specific keyword metadata, and exclusions for generic api/auth/token/Grok and Groq. Preserve the existing OpenRouter `repo_surgery` runtime and recommend `/persona` commands only: local shortcut resolution is not workflow admission, and natural-language keywords are dispatch metadata, not automatic GitHub event activation.

Within its authorized environment, the next testing agent can use the documented dependencies/interpreter and rerun the unchanged offline suite. Report the actual result separately from historical evidence. Any new live tests require explicit spending and data-sharing authorization. Publication remains a draft PR for owner review; these documents do not assert a merge or completed rollout.

## Main-agent integration update — November 12, 2026

The main Manus agent created the private owner repository `midnghtsapphire/grok-api-demo`, pushed commit `2c52c39` on `feat/tested-grok-demo-2026-11-12`, and opened [draft PR #2](https://github.com/midnghtsapphire/grok-api-demo/pull/2). Its source, docs, original package, research/reference snapshots and sanitized evidence are durable in GitHub; no merge occurred.

Implemented `PERSONA_REGISTRY.grokapi` in `scripts/openrouter-personas.js`, with canonical name, four aliases, provider-specific trigger metadata, exclusions, descriptive instructions and the existing `repo_surgery` routing profile. Added discoverability to the agent index, Agent Factory matrix/command registry and Grok source index. No workflow, scheduler, webhook, secret or saved Manus profile was created.

Current offline verification: seven new specialist tests passed; sixteen existing comment-parser tests passed; the unchanged imported demo suite passed all six tests in the documented virtual environment. Registry JavaScript syntax and `git diff --check` passed. No new live xAI or OpenRouter request was made for integration. The drafting subtask's system-interpreter `jsonschema` import failure above remains historical, not an unresolved failure of the correctly installed demo.

The existing BNAT feed became available after the sparse checkout included `docs/biome`: consistency check reported energy 0, `consistent: true` and no obstructions. `imprint_agent --agent grokapi` reported `known: false` and `imprinted: false` because this new persona has no BIOME stalk yet. No status data was fabricated and no high-blast workflow/spend/permission change was attempted. Registration documentation/tests are ready for owner review; downstream BIOME onboarding remains a separate fleet decision.

The runtime authorization clarification appended to `PROFILE.md` supersedes any mistaken reading of the drafting lane's no-Git restriction as a permanent limit on the specialist. Future owner-assigned implementation may use existing code-execution/PR lanes. Natural-language keyword metadata does not auto-run paid tests, and the supported GitHub invocation remains `/persona grokapi <task>` after registration review/merge and existing gates permit it.
