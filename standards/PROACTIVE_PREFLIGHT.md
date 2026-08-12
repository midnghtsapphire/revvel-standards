# Proactive Preflight — Check Before Every New Request

**Status:** ACTIVE · **Updated:** 2026-08-05
**Failure mode this fixes:** Agent uses only internal weights + a few local files, skips live wiring checks, then ships work that is not connected to Actions / Projects / Models / automations.

## Mandate

Before starting **any non-trivial task** (anything more than a typo), the agent MUST:

1. **Probe live state** (repo, workflows, secrets *names*, Projects, labels, open WRs)
2. **Load governing standards** (not only memory)
3. **Decide what is missing** and either wire it or open a WR+PR for the gap
4. **Record a short preflight note** in the PR body or `wr/memory/preflight/`

Skipping preflight is a **loyalty score** penalty.

## Preflight checklist (copy into PR)

```markdown
### Preflight
- [ ] Read AGENTS.md + START_HERE_CALL_CHAIN.md + relevant standards/
- [ ] `config/labels-allowlist.yml` loaded; will not invent labels
- [ ] Searched open issues/PRs/WRs for duplicates
- [ ] Listed relevant workflows under .github/workflows and confirmed triggers exist
- [ ] Confirmed automation surface (Actions / n8n / Make / Zapier / Gumloop) — prefer these over new labels
- [ ] GitHub Models / Copilot / Projects probe: available | wired | missing (note which)
- [ ] Secrets: only names checked via docs/SECRETS_MAP.md — no values
- [ ] Formal verifier implication: will run / not applicable
- [ ] Human gate: WR+PR for review (no merge claim)
- [ ] Disaster backup: non-secret artifacts worth keeping → disaster-recovery/ or wr/memory/
```

## Probe order (practical)

1. **Repo tree** for existing standard/skill/workflow
2. **Code search** for prior art
3. **Open issues** with same labels/kind
4. **Workflow list** — is the thing already scheduled?
5. **Label allowlist** — map intent to allowlisted labels only
6. **Project fields** — set stage/priority if Project access exists
7. **Model routing** — `.github/agent-models.yml` / MODEL_CONFIG.md
8. **External automations** — `config/connections.yml` for n8n/Make/Zapier/Gumloop endpoints
9. **Formal** — if change touches merge policy or agent judgement, plan formal run

## Learning loop

After the task:

- Append one entry to `learnings.md` if something surprised you
- Emit scorecard events (formal accuracy, feature adoption, speed)
- If a check was "not wired", open or update a WR — do not leave as chat lore

## Guardrail-heavy LLMs (Claude etc.)

When a model refuses or soft-blocks:

1. Do not fight the guardrail with jailbreaks
2. Narrow the task to **draft WR + draft PR + docs** (always allowed here)
3. Route specialty work to the correct lane (OpenRouter cascade / Copilot / non-LLM script)
4. Log the refusal as a `needs-human` or model-routing event — it is data

## Non-LLM specialists

Preflight still applies: read inputs, check wiring, produce artifacts, stop at human review.
