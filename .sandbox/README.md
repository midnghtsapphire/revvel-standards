# `.sandbox/` — Per-Agent Workspaces

Every visiting agent (LLM, coding tool, orchestrator, marketplace bot) gets
its own folder here and writes to it as it works. The purpose is simple:

- **Data survives credit / timeout blackouts.** When a conversation is cut
  short by a rate limit or the tab crashes, nothing the agent did is lost.
- **The fleet can learn from every visiting agent.** Every thought, script,
  API call, and outcome is inspectable after the fact and can be promoted
  into a fleet standard, a skill, or a training module.
- **The owner has a permanent audit trail.** No "what did that agent do
  again?" — it's all here.

## Folder layout

```text
.sandbox/
├── README.md                     ← this file
└── <agent-name>/                 ← one folder per agent identity
    ├── AGENT.md                  ← who this agent is + how to resume it
    ├── sessions/                 ← per-conversation log (YYYY-MM-DD-HHMM.md)
    ├── memory/                   ← persistent facts the agent should re-load
    ├── thoughts/                 ← "think" / reasoning logs, brainstorms
    ├── scripts/                  ← throwaway scripts the agent wrote
    ├── api-calls/                ← saved API request/response pairs
    ├── cli/                      ← saved shell commands + outputs
    ├── mcp/                      ← MCP tool calls + payloads
    ├── tools/                    ← any tool binary or config the agent used
    ├── skills/                   ← draft skills the agent produced
    └── artifacts/                ← PDFs, images, generated docs, etc.
```

## Rules — for every visiting agent

1. **Create `.sandbox/<your-name>/` on first write** if it doesn't exist.
   Use a stable, lowercase, hyphenated identifier — `openhands`,
   `copilot-swe-agent`, `jules`, `devin`, `cursor`, `roo`, `kilo`, etc.
2. **Open a session file the moment you start work:**
   `.sandbox/<you>/sessions/YYYY-MM-DD-HHMM-<slug>.md`
3. **Log every non-trivial action** as you take it:
   - shell commands → `cli/`
   - API calls → `api-calls/`
   - MCP tool invocations → `mcp/`
   - scripts you wrote and ran → `scripts/`
   - reasoning / brainstorming → `thoughts/`
   - persistent facts you want future you to see → `memory/`
4. **Write append-only.** Never rewrite or delete prior session files.
5. **End every session with a `session-end.md`** in the same session
   folder: what was accomplished, what's still pending, what to resume.
6. **When you find something worth promoting to the fleet** (a script that
   should be a standard, a pattern that should be a training module, a
   skill draft), copy it out of your sandbox to the correct fleet location
   and open a PR. Do NOT hoard useful work in the sandbox.

## Rules — what the sandbox is NOT

- Not a place to store secrets. Redact every token, key, and credential
  before writing. The sandbox is committed to the repo.
- Not a permanent home. Sessions older than 90 days may be archived by
  the fleet cleanup workflow (see `.github/workflows/sandbox-archive.yml`
  once it exists).
- Not a shortcut around WRs. If you find a bug, you still open a WR
  (see `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md`).

## Why this exists

Three real incidents made the sandbox mandatory:

1. **2026-08-08 Copilot credit-exhaustion.** Copilot's recovery session
   claimed "all validation green" but ran out of credits before actually
   running chaosmender. The verification step never happened. There was
   no log, so nobody knew what had actually been verified vs. asserted.
2. **2026-08-09 OpenHands session context loss.** Owner switched tabs
   and lost the local reasoning + partial edits from a long troubleshooting
   thread. Recovering required re-deriving the whole plan.
3. **Recurring: pattern-matching agents rediscover the same fixes.** No
   memory across sessions means every agent starts from zero — the
   "orphaned key + skill file + no workflow" pattern got misdiagnosed and
   re-litigated four times in different repos.

The sandbox turns transient reasoning into persistent, inspectable data.
Every session becomes a data point for the fleet to learn from.
