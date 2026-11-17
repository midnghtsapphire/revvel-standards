# Fleet Status — Live Agent Ownership Labels (RVS-FLEET-STATUS-001)

**Status:** Active · **Added:** 2026-11-16 · **Requested by:** Audrey Evans

> "I want labels so I know at any time who is doing what, where, at that second."
> "Everyone leaves detailed comments… no one says ready to merge."

## The rule

Every issue/PR being worked carries exactly **two** labels at all times:

| Label family | Meaning | Examples |
|---|---|---|
| `agent:<name>` | Who holds it **right now** | `agent:openrouter`, `agent:copilot`, `agent:gitar`, `agent:jules`, `agent:kimi`, `agent:manus`, `agent:codex`, `agent:openhands` |
| `status:<state>` | Where it is in the pipeline **right now** | `status:claimed` → `status:in-progress` → `status:checks-passing` → `status:waiting-for-review` → `status:ready-to-merge` · plus `status:blocked`, `status:needs-audrey` |

- **Handoff = label swap.** When OpenRouter hands to Copilot, `agent:openrouter` comes off and `agent:copilot` goes on, with a comment noting the handoff. The provenance question ("was this OpenRouter or Copilot?") is answered by the label history + comments.
- **Every state change posts a comment** with agent name, UTC timestamp, and evidence (CI run link, test counts). `status:ready-to-merge` is never set without a comment stating what was verified.
- Labels are additive and reversible; nothing is deleted (RVS-PRESERVE-001 applies).

## The tool

`scripts/fleet-status.js` — zero dependencies, uses the authenticated `gh` CLI, runs on
any lane (laptop, Gitar, CircleCI, self-hosted). No GitHub-hosted Actions required, so it
works under the billing lock.

```bash
node scripts/fleet-status.js claim  --repo midnghtsapphire/neurooz --number 12 --agent openrouter
node scripts/fleet-status.js status --repo midnghtsapphire/neurooz --number 12 --to in-progress
node scripts/fleet-status.js ready  --repo midnghtsapphire/neurooz --number 45 --agent kimi --evidence "CircleCI green, 27/27 tests"
node scripts/fleet-status.js block  --repo midnghtsapphire/neurooz --number 12 --reason "needs Plaid sandbox keys"
node scripts/fleet-status.js board  --repo midnghtsapphire/neurooz   # who-owns-what table
```

## Wiring (who calls it)

- Agents call `claim` when starting and `ready`/`block` when done. This is the contract going forward.
- CI lanes (CircleCI, Gitar, laptop scheduler) call `status --to checks-passing/checks-failing` after runs.
- `board` gives the owner a one-command live view per repo. GitHub Projects boards can group by these labels for client demos.
- `scripts/ci/agent-session-start.js session-start` returns `fleet_label_gaps`: every open PR missing its `agent:*` / `status:*` label, so gaps surface at login instead of hiding until someone asks "who had this?" (added 2026-11-17, kimi-agent; read-only check, never blocks the queue).

## Commit identity — the layer GCM does not solve (added 2026-11-16, kimi-agent)

Why past PRs all showed `@midnghtsapphire` as author even when Cursor ("MergeMender") or Grok Bot
did the work: every agent authenticates with the **same GitHub account**. Git Credential Manager's
multiple-user support (`credential.<url>.username`, or `user@` in the remote URL — see GCM's
"Multiple users" doc) only distinguishes **separate GitHub accounts**. It cannot distinguish agents
sharing one login, and it never touches `user.name`/`user.email` in commits. So provenance must live
in two places GCM does not reach:

1. **Commit author + trailer.** Agents set an agent author (`git -c user.name="<agent>"`, or the API
   `author` field) and add an `Agent: <name>` trailer naming model/route where known. GitHub renders
   commit authors even when the authenticated account is shared. (`kimi-agent` commits of 2026-11-16
   are the reference pattern.)
2. **The label/comment layer above** for live runtime ownership — labels say *now*, commit trailers
   say *forever*.

**Rule:** every agent-authored commit carries an agent author name or an `Agent:` trailer; every PR
body states the agent (and model/route where known). A PR whose provenance cannot be told from its
page is treated as unclaimed work and gets a provenance-backfill comment, not silent assumption.
