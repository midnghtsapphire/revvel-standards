# Schedule — amazon-lemon8

| Field | Value |
|---|---|
| Frequency | hourly |
| Timezone | UTC |
| Runner | persistent host with Playwright + logged-in profile |
| n8n workflow | `amazon-lemon8.n8n.json` |
| Kill switch | set n8n workflow inactive, or run `python3 run.py` without `--publish` to stage only |

Cadence rationale: Amazon deal inventory rotates through the day; hourly keeps posts fresh without spamming. Cap publishing at one post per cycle and skip cycles with no qualifying deal (exit 2).
