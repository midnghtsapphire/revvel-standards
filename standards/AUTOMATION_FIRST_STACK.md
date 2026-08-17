# Automation-First Stack (Prefer Actions Over Labels)

**Status:** ACTIVE · **Updated:** 2026-08-05

## Preference order

When implementing a process, pick the **highest** row that works:

1. **GitHub Actions** (in-repo, reviewable, badges, check runs)  
2. **n8n / Make / Zapier / Gumloop** (cross-SaaS glue; store blueprints under `workflows/` or `ops/automations/`)  
3. **OpenRouter / agent lanes** (reasoning + code; still ends in PR)  
4. **Project custom fields + views** (state machine)  
5. **Allowlisted labels** (routing only)  
6. **Chat instructions** (last resort — evaporates)

Labels are not a workflow engine.

## Connection registry

See `config/connections.yml` for existing endpoints. New automations MUST:

- Add a row to the registry (name, system, trigger, secret **name**, owner)  
- Ship a blueprint file (JSON/YAML) in-repo  
- Emit failure → `auto-error` issue or formal auto-WR  
- Never store API keys in blueprints  

## Suggested blueprints to add (WRs)

| Automation | System | Trigger | Output |
| --- | --- | --- | --- |
| Formal fail → WR | Actions | formal-report artifact | Issue+PR |
| Label allowlist enforce | Actions | issues/PR labeled | Comment+fix |
| Scorecard daily | Actions | cron | JSON + Project fields |
| New WR → n8n research | n8n | issue labeled `wr` | Filled WR fields |
| Deploy down → alert | Zapier/Make | healthcheck | Issue `auto-error` |
| Gumloop content | Gumloop | `content` label | Draft PR to content path |

## Anti-patterns

- Creating `deployment-down:hostname` labels per host  
- Encoding privilege solely as labels without scorecard  
- Cron workflows that cannot report failure  
- Docs that claim "automatic" when only `workflow_dispatch` exists
