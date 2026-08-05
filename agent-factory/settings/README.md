# Settings — Guardrails & Profiles

Settings control model choices, tool access, redaction rules, and resource limits. Start from `templates/agent-factory/SETTINGS_TEMPLATE.json` and tailor per repo or client.

## Profiles to define
- **Default**: balanced model, standard tool allowlist, 120k token soft cap, recap every major tool use.
- **Security**: network disabled by default, secrets redaction on, dependency/license scan required.
- **Data**: read-only DB/tooling, slower/cheaper model for bulk queries, sampling caps.
- **Frontend**: UI linting on save, accessibility checks enabled, screenshot diff hooks.
- **DevOps**: elevated shell tooling, docker/build cache controls, artifact retention.

## Required fields (suggested)
- `models`: preferred + fallback.
- `tools`: allowlist/denylist per agent.
- `timeouts`: per-command ceilings.
- `memory`: context window, recap cadence, pruning strategy.
- `security`: PII redaction, secret scanning, network rules.
- `observability`: logging level, artifact paths, metrics toggle.

## Tips
- Keep profiles in version control; never commit secrets.
- Couple settings with hooks (e.g., security profile + pre-commit secret scan).
- Document per-agent overrides directly in the agent frontmatter to avoid drift.
