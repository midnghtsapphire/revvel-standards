# Revvel pack: labels · projects · privilege · formal auto-WR · disaster recovery

Landed for human review. See standards listed below.

| Path | Purpose |
| --- | --- |
| config/labels-allowlist.yml | Canonical ≤80 labels + aliases |
| standards/GITHUB_PROJECT_FIELDS.md | Project V2 field catalog |
| standards/BADGES_AND_STATUS.md | Badge usage |
| standards/GITHUB_MODELS_AND_ADVANCED.md | Models + advanced features checklist |
| standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md | Scores + tiers + emergency pool |
| standards/PROACTIVE_PREFLIGHT.md | Pre-request probe mandate |
| standards/FORMAL_VERIFY_AUTO_WR.md | Formal → WR/PR, human gate |
| standards/AUTOMATION_FIRST_STACK.md | Actions/n8n/Make/Zapier/Gumloop > labels |
| scripts/*.mjs | Allowlist, formal auto-WR, scorecard |
| .github/workflows/* | CI hooks |
| disaster-recovery/grok-build-2026-08-05/ | Sandbox lifeboat |

## Auth / Actions (2026-08-05)

- **Apps vs PAT vs Actions:** `standards/GITHUB_AUTH_TOKEN_MATRIX.md`
- Grok MCP tools for create-PR / review **are write APIs**, but the connector token is still **read-only** (403) until reconnect with Contents + PR + Issues write.
- Automated PR checks belong in **GitHub Actions** (already ~189 workflows live, including `ship-quality`, `pr-check-status`, fleet `agent-scorecard`).
