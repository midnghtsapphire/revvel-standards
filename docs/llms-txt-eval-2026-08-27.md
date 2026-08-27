# Eval: incoming Asset Synthesis `llms.txt` vs current SSOT

**Date:** 2026-08-27
**WR:** #17961
**Operator:** Grok Build (OpenRouter lane untrusted this session)
**Rule:** restructure without deleting. Incoming archived as
[`llms.txt.incoming.bak`](../llms.txt.incoming.bak). Live file is
[`llms.txt`](../llms.txt).

## Bottom line

The incoming draft is the right *job* (score chatter, pick an asset class,
compile it) and the wrong *wiring* for this repo. Dropping it in unchanged
would have reintroduced denylisted Claude Sonnet as the default synthesis
model and taught callers to hit OpenRouter with a placeholder key, skipping
Layer 0 and the spend gate. That matches the symptom “OpenRouter is not
working even though there are credits” — it can be a rotating/auto agent
or a denylist hit, not an empty balance.

There was **no root `llms.txt`** to overwrite. The only existing file with
that name is the V.E.I.N.S. crawler in `veinsloop`. It was left alone.

## What was already there

| Surface | Role | Keep? |
| --- | --- | --- |
| *(none)* `revvel-standards/llms.txt` | — | N/A — create |
| [`AGENTS.md`](../AGENTS.md) | Operating contract, Prime Directive, spend gate, guest rules | Keep as SSOT for *how* to work |
| [`.github/agent-models.yml`](../.github/agent-models.yml) | Profiles, routing tree, denylist | Keep as SSOT for *which model* |
| [`MODEL_CONFIG.md`](../MODEL_CONFIG.md) | Human summary of the YAML | Keep |
| [`CLAUDE.md`](../CLAUDE.md) | Short per-task checklist | Keep |
| `midnghtsapphire/veinsloop` `public/llms.txt` | 15-line product crawler (Home + optional Sign in) | Keep. Do not replace with this pipeline. SEO audit #15396 already flagged VSPR/S-MOS trust risk in *that* file. |

## Incoming vs live (after eval)

| Topic | Incoming (`llms.txt.incoming.bak`) | Live (`llms.txt`) |
| --- | --- | --- |
| Job | Asset Synthesis Pipeline + CS formula | Same job, kept |
| Asset classes | PDF / MCP / Action / app / media / n8n | Same list, kept |
| Reasoning behavior | CoT Understand→Conclude | Kept on `reasoning` lane |
| BLUF / 150–300 word paragraphs | Required for “Sonnet / GPT-4o” | Kept, retargeted at `orchestrator` / `code_patch` |
| Default model | `anthropic/claude-3.5-sonnet:beta` | **Removed.** Denylist `anthropic/*sonnet*` |
| Reasoning examples | DeepSeek R1, GPT-o1, Claude 3.7 Thinking | `anthropic/claude-fable-5` → Opus 5 |
| Auto / rotating router | Implied by “OpenRouter optimize” | Explicitly banned (`openrouter/auto`, `openrouter/fusion`) |
| API key | `"your_openrouter_api_key_here"` in source | `os.environ["OPENROUTER_API_KEY"]` only, after spend gate |
| Local | Commented-out LM Studio snippet | `scripts/local_llm.py` Layer 0 first |
| Prime Directive | Missing | Required |
| Composable loops | Missing (generative-only vibe) | Generative + Agentic + Deterministic |
| Bitwise / four-eyes | Missing | Pointer to Formal Logic Orchestrator, not a second prompt religion |
| veinsloop crawler | Would have been easy to clobber | Explicitly out of scope |

## OpenRouter diagnosis (credits but not working)

Ordered checklist now in `llms.txt`. Most likely for *this* draft:

1. **Denylist.** Default model is Sonnet. Fleet A/B (2026-07) banned the
   whole family because it refused / violated operating rules. A caller
   that still pins Sonnet looks “dead” from the outside.
2. **Rotating agent = `openrouter/auto`.** Also denylisted. Opus twins
   beat auto/fusion. If a wrapper still sends `openrouter/auto`, credits
   will not save it.
3. **Spend gate.** Paid lane is refused unless
   `REVVEL_LLM_ALLOW_CLOUD` is exactly `"1"`. A funded key behind a closed
   gate returns nothing useful.
4. **402/401/403/429.** Dashboard credits ≠ that key, that org, that
   spend cap. Doppler has wiped keys before (`wr/pending/12-secrets-sanity.md`).
5. **Opus 5 thinking.** On by default; `max_tokens` includes thinking.
   Truncation looks like a hung rotator.

This session did the WR/PR here instead of waiting on OpenRouter.

## CS for this change

| Factor | Score | Why |
| --- | --- | --- |
| U | 9 | OpenRouter blocked; visiting models had no synthesis contract |
| V | 9 | Directly feeds the automated product pipeline (Focus Area 3) |
| F | 10 | Text SSOT + archive; no new SaaS |
| D | 2 | Root `llms.txt` was empty space in this repo |

`CS = (9 * 9 * 10) / 2 = 405` ≥ 7.5 → **build** (and it is built).

Note: 7.5 is a low bar on this multiplicative scale (typical passing
work sits well above 20). Left the formula intact; do not “normalize”
it without a separate WR.

## What was not done (on purpose)

- No edit to `veinsloop/public/llms.txt`.
- No drive-by rewrite of `AGENTS.md` / `MODEL_CONFIG.md`.
- No restoration of Sonnet “just for synthesis.”
- No live OpenRouter probe from this sandbox (would spend owner quota
  and still fail the denylist test).

Follow-up if wanted: one-line pointer at the top of `AGENTS.md` (“synthesis
contract: `llms.txt`”). Separate PR, not this one.
