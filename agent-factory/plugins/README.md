# Plugins — Bundled Kits

Plugins package agents, commands, settings, and hooks into a reusable kit. Start from `templates/agent-factory/PLUGIN_TEMPLATE.md` and adjust per client, industry, or project type.

## Plugin patterns
- **Web App Starter**: frontend + backend agents, UI/DB commands, accessibility + schema hooks, default settings profile.
- **Security-Hardened**: security agent default, locked-down settings, secret/license scans, deployment gate hooks.
- **Data/ML**: data agent default, read-only settings, ETL/analytics commands, cost caps.
- **DevOps**: pipeline/infra agent, docker + CI commands, build/cache settings, failure-to-recovery hooks.

## Publishing & reuse
- Keep plugin manifests in the repo under `plugins/` or `.claude-plugin/`.
- Document install steps (what to symlink or copy) and triggers it enables.
- Version plugins; note required tools and minimum settings.

## Governance
- Plugins must declare the guardrails they enforce (e.g., secret scan, redaction).
- Favor additive design: teams can compose multiple plugins without conflicts.
