# Daily BOM — Codex + OpenRouter (today)

**Last Updated:** 2026-08-27
**Owner:** Audrey Evans (`midnghtsapphire`)
**Status:** You do these. Agents cannot flip GitHub/ChatGPT account toggles or paste keys.

Master BOM (`docs/_MASTER_BOM.md`) last regenerated **2026-06-17**. Treat this file as the live daily list until `bash scripts/sync-bom.sh` is run again.

---

## What the table means (corrected)

| What | Status | You do |
|---|---|---|
| Auto-assign on every WR (`REVVEL_ALLOW_COPILOT_ASSIGN`) | still gated | **Leave unset.** Do not set to `1`. |
| `@copilot` / `/copilot` | roster only | **Ignore.** Does not start Copilot. |
| `@codex` / `/codex` | live on `main` (PR #17963 merged) | Comment `@codex` on a WR **after** the toggles below. |

---

## P0 — Do today (human only)

### 1. Turn Codex on (GitHub)

1. Open [Copilot coding agent settings](https://github.com/settings/copilot/coding_agent)
2. Allow repo `midnghtsapphire/revvel-standards`
3. Partner agents → **Codex = On** (Copilot can stay Off)

Without this, `@codex` assigns nothing and you get the ruleset / “unable to start” error.

### 2. Connect ChatGPT → GitHub

Codex on GitHub is the OpenAI agent. In ChatGPT: Settings → Connectors → GitHub, connected to `midnghtsapphire`.

### 3. Keys (Actions secrets)

Paste the same keys you already pay for. Dashboard credits do nothing until the **secret name** exists on the repo.

| Secret | Where | Why | Get it |
|---|---|---|---|
| `OPENROUTER_API_KEY` | [revvel-standards secrets](https://github.com/midnghtsapphire/revvel-standards/settings/secrets/actions) | WR orchestrator, cheap DeepSeek | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_API_KEY` | [revvel-twin-run secrets](https://github.com/midnghtsapphire/revvel-twin-run/settings/secrets/actions) | Cheap twins (DeepSeek / Llama / Hermes) | same key |
| `XAI_API_KEY` | [revvel-twin-run secrets](https://github.com/midnghtsapphire/revvel-twin-run/settings/secrets/actions) | Cheap fallback (Grok Build) + premium | [console.x.ai](https://console.x.ai) |
| `ADMIN_GITHUB_TOKEN` | revvel-standards (already used by assign/push) | `@codex` assign from a comment | PAT with `repo` + `workflow`; must be a **repo admin** so it bypasses the `main` ruleset |

A 402 from OpenRouter means the key cannot spend, even if the dashboard shows credits.

CLI if you prefer:

```bash
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/revvel-twin-run
gh secret set XAI_API_KEY --repo midnghtsapphire/revvel-twin-run
```

### 4. Variables (not secrets)

| Variable | Repo | Value | Why |
|---|---|---|---|
| `REVVEL_ALLOW_COPILOT_ASSIGN` | revvel-standards | **do not set / not `1`** | Auto Copilot stays off |
| `REVVEL_LLM_ALLOW_CLOUD` | revvel-standards | `1` only if you want OpenRouter workflows to spend | If unset, fillers refuse with the spend-gate comment |

[revvel-standards variables](https://github.com/midnghtsapphire/revvel-standards/settings/variables/actions)

---

## P1 — Prove it once

1. Open any WR on `revvel-standards`.
2. Comment: `@codex` plus one line of instruction.
3. You should see assignee **codex** and a coding-agent session, not a ruleset error.
4. Twin Run: Actions → Twin Run → Run workflow, or an issue body with `spend: cheap`.

---

## Do not buy / do not flip

| Item | Why |
|---|---|
| Copilot auto-assign | 657 paid sessions last time it was on |
| Anthropic Claude premium | Claude via OpenRouter if needed |
| `openrouter/auto` or Sonnet | denylisted in `.github/agent-models.yml` |
| RecurseML trial (expired Apr 2026) | stale on master BOM — ignore until you re-evaluate |

---

## APIs in play for this lane (not the whole vault)

| API | Used for | Status you must verify |
|---|---|---|
| GitHub Copilot coding agent / Agent HQ | hosts Codex sessions | Codex toggle On |
| OpenAI Codex (`@codex` user) | the agent you mention | ChatGPT connected |
| OpenRouter | WR orchestrator + cheap twins | secret present **and** key can spend |
| xAI | Twin Run cheap fallback / premium | secret on `revvel-twin-run` |
| GitHub API (`ADMIN_GITHUB_TOKEN`) | assign Codex, push around ruleset | token not expired |

Full graveyard of video/voice keys still lives in [`SECRETS_BOM.md`](SECRETS_BOM.md). That list is not the daily list.

---

## Is the old daily BOM still working?

No as a daily loop.

- `docs/_MASTER_BOM.md` header: auto-generated **2026-06-17**
- `docs/Universal-BOM_List/API_REGISTRY_BOM.md`: last updated **2026-04-14**
- `docs/revvel-standards/BOM.md`: **April 2026**, RecurseML trial “decision by 2026-04-28”

To rebuild the master later:

```bash
bash scripts/sync-bom.sh
```

Until then, this file is the daily checklist.
