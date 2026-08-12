# VISITING AGENT SANDBOX STANDARD

**Status:** ACTIVE · **Owner:** @midnghtsapphire · **Effective:** 2026-08-10
**Applies to:** every visiting agent (any LLM, coding tool, orchestrator,
marketplace bot, or automation) that is invoked on this repo but is not a
first-class fleet member with its own dedicated home in `standards/`,
`skills/`, or `docs/agents/`.

## Prime rule

Every visiting agent MUST save its working data — session logs, thoughts,
scripts, API calls, MCP invocations, memory, artifacts — to
`.sandbox/<agent-name>/` **as it works**, not at the end. Blackouts
(credit exhaustion, timeouts, tab crashes) are the norm, not the exception.
Data not persisted before the blackout is data lost.

## Folder layout (per agent)

```text
.sandbox/
├── README.md
└── <agent-name>/                 ← lowercase, hyphenated, stable
    ├── AGENT.md                  ← identity + resume instructions
    ├── sessions/                 ← YYYY-MM-DD-HHMM-<slug>.md
    ├── memory/                   ← persistent-facts.md + topic files
    ├── thoughts/                 ← reasoning / brainstorm logs
    ├── scripts/                  ← any script the agent wrote
    ├── api-calls/                ← saved API request/response pairs
    ├── cli/                      ← saved shell commands + outputs
    ├── mcp/                      ← MCP tool calls + payloads
    ├── tools/                    ← external tool binaries / configs
    ├── skills/                   ← draft skills before promotion
    └── artifacts/                ← generated PDFs, images, docs
```

## Required — every visiting agent

1. **Create `.sandbox/<your-name>/` on first write** if it doesn't exist,
   plus an `AGENT.md` that describes:
   - Agent name, vendor, invocation surface
   - Auth secrets used
   - Strengths and known failure modes
   - How to resume: which files to re-read
2. **Open a session file** the moment work begins:
   `.sandbox/<you>/sessions/YYYY-MM-DD-HHMM-<slug>.md`
   with sections: **The owner's asks (verbatim)**, **What was shipped**,
   **Key discoveries**, **Pending / handed off**.
3. **Log actions as they happen** (never batched at end):
   - Non-trivial shell commands → `cli/`
   - External API calls → `api-calls/`
   - MCP tool calls → `mcp/`
   - Any script you wrote and ran → `scripts/`
   - Reasoning chains, brainstorms, alternative-analysis → `thoughts/`
   - Facts you want future sessions to have → `memory/`
4. **Write append-only.** Never rewrite or delete prior session files.
   To supersede an old fact, add a new entry with a date stamp — never
   silently overwrite.
5. **End every session with a `<session>.session-end.md`** — what was
   accomplished, what's still pending, exact resume steps.

## Required — what NOT to write

- **Secrets.** Redact every token/key/password before writing. The
  sandbox is committed to the repo and public forks copy it.
- **Full PR bodies containing user quotes.** Reference by PR number,
  quote only the specific line you're reasoning about.
- **The output of every command.** Log the command + a summary of the
  result, not the full 100k-line stack trace. Save the full output as
  an attachment in `artifacts/` if truly needed.

## Promotion pipeline

When a visiting agent produces something useful for the whole fleet:

| In sandbox | Promote to |
|---|---|
| `scripts/*.py` or `scripts/*.js` | `scripts/` (repo root) via PR |
| `skills/draft-*.md` | `skills/<name>/SKILL.md` via PR |
| `thoughts/lesson-*.md` | append to `learnings.md` in training-module format |
| `memory/pattern-*.md` | new `standards/*.md` if it's a fleet-wide rule |
| `artifacts/*.pdf` | `docs/pdf/` or the appropriate product location |

Do NOT hoard useful work in the sandbox — the sandbox is a workspace, not
a warehouse. If something belongs to the fleet, PR it up.

## Enforcement (future workflow)

`.github/workflows/visiting-agent-sandbox-check.yml` (not yet built) will
run on every PR authored by a bot / visiting agent and verify:

- `.sandbox/<author-name>/` exists
- At least one session file exists for the PR's date range
- Session file has all four required sections
- No secrets are present (regex scan for common token shapes)

Until that workflow exists, this standard is honor-system with the owner
spot-checking sandbox contents during PR review.

## Why this exists — three real incidents

### 1. Copilot credit-exhaustion, 2026-08-10 (PR #17147)

Copilot ran `chaosmender.js` fixes, wrote a "Completed ✅ all validation
green" summary claiming "chaosmender --changed-only reports 0 findings"
— then hit the credit limit before actually re-running chaosmender after
its own second commit. The verification step never happened. Owner had
no way to see this because Copilot's summary was written from *intent*,
not *result*. If Copilot had a sandbox and had been logging every command
to `cli/` as it went, the owner could have seen the last successful run
happened before the final commit.

### 2. OpenHands session context loss, 2026-08-09

Owner switched browser tabs mid-thread and lost the local reasoning +
partial edits from a multi-hour troubleshooting session. Recovery
required re-deriving the whole plan from scratch. Every subsequent
"wait, we already discussed this" moment was time paid to reconstruct
lost context.

### 3. Recurring: pattern-matching agents rediscover the same fixes

No memory across sessions means every agent starts from zero. The
"orphaned key + skill file + no workflow" pattern got misdiagnosed and
re-litigated four times in different repos before anyone codified it.

## Related standards

- `AGENTS.md` — global fleet operating rules
- `wr/templates/work/visiting-agent.md` — the visiting-agent WR template
- `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md` — how to file bugs found
  during a task
- `standards/TRIAGE_ROLE_STANDARD.md` — the role with override authority
  to file out-of-scope WRs
- `learnings.md` — training-module format used to promote sandbox
  thoughts into fleet-wide lessons

## Companion files

- `.sandbox/README.md` — user-facing sandbox docs
- `.sandbox/openhands/AGENT.md` — example agent identity file
- `.sandbox/openhands/sessions/2026-08-09-1400-secrets-audit-and-subscription-tracker.md`
  — example session log using this standard
