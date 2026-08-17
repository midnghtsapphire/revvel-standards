# Visiting Agents — House Rules

**Read this before you touch anything.** You are a *guest* in this repo.

This file exists for any visiting or transient agent — OpenHands, Cursor Cloud,
Lovable, Replit, Jules, Copilot, a one-off API caller, or a human's throwaway
script. The goal is simple: **do the work, leave the carpet clean.** Don't
scaffold over our code, don't recreate config that already exists, don't leave
junk behind.

For the product/monorepo map and per-product commands, see [`AGENTS.md`](./AGENTS.md).
This file is only the guest contract.

---

## 0. First command — bootstrap your sandbox

**Run this once, before your first write:**

```bash
bash scripts/sandbox-bootstrap.sh <your-agent-name>
```

Pick a stable lowercase-hyphenated identifier — `openhands`, `cursor`, `jules`,
`copilot-swe-agent`, `devin`, `roo`, `kilo`, etc. — and stick with it across
every session.

That one command creates `.sandbox/<your-name>/` with the full canonical folder
tree (`sessions/ memory/ thoughts/ scripts/ api-calls/ cli/ mcp/ tools/`
`skills/ artifacts/`), writes a starter `AGENT.md`, and opens today's session
log. It's idempotent — safe to re-run — and never overwrites existing files.

**Why this is step zero, not step ten:** blackouts (credit exhaustion,
timeouts, tab crashes) are the norm here. Data not saved to `.sandbox/`
**before** the blackout is lost. Bootstrap first, work second — that ordering
is the whole point.

If you skip this step, a workflow ([`.github/workflows/sandbox-guardrail.yml`](.github/workflows/sandbox-guardrail.yml))
will politely nudge you on the PR you open. It doesn't block — but the
onboarding cost is one second, so please just do it.

The three mandatory standards to read after bootstrapping:

1. [`standards/VISITING_AGENT_SANDBOX_STANDARD.md`](./standards/VISITING_AGENT_SANDBOX_STANDARD.md) — sandbox usage rules
2. [`standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md`](./standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md) — "not my bug" without a filed WR is banned
3. [`standards/TRIAGE_ROLE_STANDARD.md`](./standards/TRIAGE_ROLE_STANDARD.md) — override authority every agent has to file that WR

---

## 1. The Prime Directive

**Ship working code, not plans.** No TODO stubs, no "this would do X" placeholders,
no scaffolding language. The [Anti-Scaffolding Enforcer](.github/workflows/anti-scaffolding-enforcer.yml)
will block a PR that adds placeholder code. If you can't finish it, say so in the
PR body — don't fake it.

## 2. Where you may and may not write

- ✅ **Write inside** the relevant `products/<name>/`, `docs/`, `skills/`, `wr/`,
  or the specific files your task names.
- ❌ **Do not drop files in the repo root.** The
  [no-root-junk guard](.github/workflows/no-root-junk.yml) rejects stray root files.
  No `test.js`, `tmp/`, `output.json`, `scratch/`, screenshots, or logs at root.
- ❌ **Do not re-scaffold** existing tooling. We already have CI, lint, tests,
  agent fallback, monitoring, and self-healing (see §6). Extend them; don't
  clone them under a new name.
- ❌ **Do not commit secrets.** Keys live in GitHub Actions secrets / Doppler,
  never in files. See §4.

## 3. Durability — your sandbox is ephemeral, so pipe to git immediately

Sandboxes get cleared. If your only copy of the work is in the sandbox, it's
gone. **Commit and push early and often** to your task branch — that is the
only durable store. Don't batch a day of work into one final commit you might
lose. (`durability-mirror.yml` snapshots the repo, but it can't snapshot what
you never pushed.)

## 4. Where to get setup / API info — ONE place each

Don't go spelunking and reinventing config. The canonical sources are:

| You need… | Look here (only here) |
| --- | --- |
| Env vars / required keys | [`.env.example`](./.env.example) |
| Agent stack + API credential setup | [`docs/agent-stack/AGENT_STACK_SETUP.md`](./docs/agent-stack/AGENT_STACK_SETUP.md) |
| Repo / product layout + run commands | [`AGENTS.md`](./AGENTS.md) |
| Prior decisions (don't re-litigate) | [`wr/memory/decisions.jsonl`](./wr/memory/decisions.jsonl) |
| Onboarding | [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) |

If a value isn't in one of these, ask via the work-request issue — don't guess
and don't hardcode.

## 5. Record what you did

Fast iteration only works if it's observable. Write down what you're doing in
real time:

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, …) so the
  audit logger and changelog can read your trail.
- Significant decisions go in `wr/memory/decisions.jsonl` (one JSON object per
  line) so the next agent doesn't repeat your work.
- The [agent audit logger](.github/workflows/agent-audit-logger.yml) and
  `scripts/agent-activity-monitor.js` track agent latency and actions — keep
  steps named clearly so the trail is legible.

## 6. What already runs the fleet — don't rebuild it

| Capability | Owned by |
| --- | --- |
| Agent task execution + fallback chain | `.github/workflows/agent-fallback.yml` (OpenRouter → OpenHands → manual) |
| Health + 15-min refresh / EOP monitor | `.github/workflows/agent-monitor.yml`, `scripts/agent-activity-monitor.js` |
| Self-healing / auto-fix on error | `.github/workflows/auto-error-handler.yml`, `scripts/agent-self-heal.js` |
| Durability snapshot | `.github/workflows/durability-mirror.yml` |
| Anti-scaffolding / root-junk guards | `anti-scaffolding-enforcer.yml`, `no-root-junk.yml` |

If your task is "make agents do X," wire into these. A second monitor or a
parallel fallback chain is scaffolding — it will be removed.

## 7. Before you open your PR

- [ ] No new files in repo root (unless the task explicitly is a root file).
- [ ] No secrets, no `.env`, no credentials in the diff.
- [ ] No placeholder/scaffolding language in added code.
- [ ] Commits are Conventional Commits.
- [ ] You pushed your branch (durability) and opened a **draft** PR.
- [ ] You cleaned up scratch files, logs, and temp dirs.

Guests who follow this get invited back. Welcome — now go ship something that
makes money.
