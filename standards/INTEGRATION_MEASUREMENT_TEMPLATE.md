# Integration Measurement Template

*Copy this template when creating any new Revvel product or integration*

---

## Product Name: [YOUR PRODUCT]

**Version:** 1.0.0
**Date:** [DATE]
**Status:** [Draft/In Progress/Complete]

---

## Quality Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Research Quality Score (RQS) | 85+ | - | ⏳ |
| Agent Trust Score (ATS) | 80+ | - | ⏳ |
| Self-Healing Rate (SHR) | <5% | - | ⏳ |
| Time to Value (TTV) | <5 min | - | ⏳ |

---

## Acceptance Gates

```text
Setup:
[ ] MVI Contract filled
[ ] System State initialized
[ ] Metrics tracking enabled

Quality:
[ ] RQS > 85
[ ] ATS > 80
[ ] SHR < 5%
[ ] TTV < 5 min

Documentation:
[ ] README with metrics
[ ] Quality Standards guide
[ ] Measurement Dashboard
[ ] System State file

Self-Healing:
[ ] Error detection enabled
[ ] Self-heal triggers configured
[ ] Recovery tracking active

Release:
[ ] All gates passed
[ ] Documentation complete
[ ] Audit trail logging
[ ] Dashboard accessible
```

---

## Scoring Dimensions

| Dimension | Weight | Current Score |
|-----------|--------|---------------|
| Hallucination | 30% | - |
| Bad Code/Data | 25% | - |
| Directions | 20% | - |
| Rash | 15% | - |
| Latency | 10% | - |
| **Total** | **100%** | **-** |

---

## Self-Healing Triggers

| Tier | Action | Threshold |
|------|--------|-----------|
| 0 | Prompt Correction | Quality < 85 |
| 1 | Agent Handoff | Quality < 75 |
| 2 | Escalate to Claude | Quality < 60 |

---

## System State Template

```markdown
## [PRODUCT NAME] - System State

**Version:** [X.X.X]
**Last Updated:** [DATE]
**Status:** [Live/Dev/In Progress]

## Quality Metrics
- RQS: [X]/100
- ATS: [X]/100
- SHR: [X]%
- TTV: [X] min

## Performance
- Uptime: [X]%
- Latency: [X]ms
- Throughput: [X]/hour

## Known Issues
1. [Issue] - [Status] - [Date discovered]

## Recent Changes
1. [Change] - [Date] - [Outcome]

## Trust Grade
| Score | Grade | Status |
|-------|-------|--------|
| 90+ | A | Trusted |
| 80-89 | B | Reliable |
| 70-79 | C | Watch |
| 60-69 | D | Shaky |
| <60 | F | Quarantine |
```

---

## Audit Log Format

```json
{"timestamp": "ISO8601", "action": "type", "quality": 0-100, "trust": 0-100, "issues": [], "remediation": "tier"}
```

---

## Required Files

```text
/[product]/
├── README.md                    # Overview + quick start
├── QUALITY_STANDARDS.md        # Product-specific quality rules
├── MEASUREMENT_STANDARD.md     # This template
├── METRICS.md                 # Live metrics dashboard
├── SYSTEM_STATE.md            # Current state tracking
├── ACCEPTANCE_GATES.md        # Gates checklist
├── .github/
│   └── workflows/
│       └── quality-check.yml   # Auto quality checking
├── scripts/
│   ├── score.js               # Quality scoring
│   ├── verify.js              # Source verification
│   ├── metrics.js             # Metrics collection
│   ├── self-heal.js           # Self-healing
│   └── report.js              # Generate reports
└── audit/
    └── [year]/
        └── audit-log.jsonl    # Append-only audit trail
```

---

## Dashboard Template

```text
┌─────────────────────────────────────────────┐
│  [PRODUCT NAME] - LIVE METRICS              │
├─────────────────────────────────────────────┤
│  Quality Score    ████████████  XX/100     │
│  Trust Score      ████████████  XX/100     │
│  Self-Heal Rate  ██░░░░░░░░░   XX%        │
│  Time to Value    ████░░░░░░░░  XX min     │
├─────────────────────────────────────────────┤
│  TODAY                                       │
│  Tasks: XX | Success: XX% | Failed: XX      │
├─────────────────────────────────────────────┤
│  TRENDS                                      │
│  Quality: [↑/↓/→] | Trust: [↑/↓/→]          │
└─────────────────────────────────────────────┘
```

---

## Quick Commands

```bash
# Initialize metrics for new product
cp standards/INTEGRATION_MEASUREMENT_TEMPLATE.md [product]/
mkdir -p [product]/scripts [product]/audit/[year]

# Score current output
node scripts/score.js [output]

# Check quality gates
node scripts/quality-check.js

# Self-heal if needed
node scripts/self-heal.js [issue]

# Generate report
node scripts/report.js
```

---

## Notes

[Add product-specific notes here]

---

**Template Version:** 1.0.0
**Last Updated:** June 2026
**Source:** `standards/INTEGRATION_MEASUREMENT_TEMPLATE.md`
