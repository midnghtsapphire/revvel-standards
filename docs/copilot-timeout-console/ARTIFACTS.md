# Delivery artifacts — copilot-timeout-console (WR #17775)

| Artifact | Path | Role |
| --- | --- | --- |
| Policy SSOT | `config/copilot-timeouts.yml` | Floor + target job list |
| Auditor | `scripts/copilot-timeout-audit.js` | Fail-closed CI gate |
| Root tests | `tests/copilot-timeout-audit.test.js` | Regression for 10m0s class of failure |
| OpenRouter coder test | `tests/openrouter-coder-workflow.test.js` | Locks coder job ≥ 60m |
| Device tree | `config/device-tree.yml` | Kind defaults ≥ 60m for OpenRouter agents |
| Schema default | `schemas/agent-contract.schema.json` | `timeout_minutes` default 60 |
| Host fallback | `scripts/host.js` | Emits 60 when kind omits timeout |
| Standard | `standards/COPILOT_TIMEOUT_STANDARD.md` | Human + agent rule |
| Product app | `products/copilot-timeout-console` | Status console UI |
| Docs page | `docs/copilot-timeout-console/` | Static deploy twin |

## Validation evidence

```bash
node scripts/copilot-timeout-audit.js --markdown   # exit 0
node --test tests/copilot-timeout-audit.test.js
cd products/copilot-timeout-console && npm test && npm run build
```
