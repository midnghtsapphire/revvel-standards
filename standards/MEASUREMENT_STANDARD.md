# Measurement Standard

**Version:** 1.0.0
**Date:** June 2026
**Status:** Mandatory
**Scope:** All Revvel products, integrations, and agent outputs

---

## 1. Overview

Every Revvel product and integration MUST include measurement standards. This ensures:
- Quality consistency across all products
- Trust tracking for agents
- Performance visibility
- Self-healing capability

---

## 2. Core Metrics (Required for ALL Products)

### 2.1 Research Quality Score (RQS)

**Target: 85+**

```text
RQS = 
  Source Quality (30%) +
  Methodology Adherence (25%) +
  Completeness (20%) +
  Actionability (15%) +
  Presentation (10%)
```

### 2.2 Agent Trust Score (ATS)

**Target: 80+**

Starts at 70. Updates after every task.
- Excellent task: +5
- Good task: +2
- Failed task: -10
- Hallucination: -15

### 2.3 Self-Healing Rate (SHR)

**Target: <5%**

% of tasks needing self-healing intervention.

### 2.4 Time to Value (TTV)

**Target: <5 min**

Average time from setup/activation to first useful output.

---

## 3. Quality Gates

Every product MUST pass these gates before release:

```text
[ ] Quality Score > 85
[ ] Trust Score > 80
[ ] Self-Healing Rate < 5%
[ ] Time to Value < 5 min
[ ] No hallucinations detected
[ ] All acceptance gates pass
[ ] System State documented
```

---

## 4. Framework Adherence (Per Product Type)

### 4.1 Research Products

| Framework | Measurement |
|-----------|-------------|
| DOE Screening | 5-point check completion |
| TRIZ | Contradiction identification |
| BNAT | Emerging tech discovery |
| Lead Search | ICP definition quality |
| Merchandise | Margin calculation accuracy |

### 4.2 Integration Products

| Aspect | Measurement |
|--------|-------------|
| Setup | Steps required, time to first result |
| Reliability | Uptime, error rate |
| Latency | Response time, throughput |
| Error Handling | Self-heal success rate |

### 4.3 Agent Products

| Aspect | Measurement |
|--------|-------------|
| Accuracy | Correct outputs vs errors |
| Completeness | All steps followed |
| Speed | Tasks per hour |
| Recovery | Self-heal rate |

---

## 5. Scoring Dimensions

### 5.1 Weighted Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Hallucination | 30% | Unverified claims, missing sources |
| Bad Code/Data | 25% | Incorrect results, wrong calculations |
| Directions | 20% | Following framework correctly |
| Rash | 15% | Skipping steps, incomplete |
| Latency | 10% | Speed and efficiency |

### 5.2 Trust Grades

| Grade | Score | Status | Action |
|-------|-------|--------|--------|
| A | 90+ | Trusted | Continue |
| B | 80-89 | Reliable | Minor tweaks |
| C | 70-79 | Watch | Review needed |
| D | 55-69 | Shaky | Self-heal triggered |
| F | <55 | Quarantine | Immediate fix |

---

## 6. Self-Healing Triggers

| Tier | Action | When to Use |
|------|--------|-------------|
| 0 | Prompt Correction | Minor hallucinations |
| 1 | Agent Handoff | Framework not followed |
| 2 | Escalate to Claude | Critical failures |

---

## 7. Documentation Requirements

Every product MUST include:

### 7.1 SYSTEM_STATE.md

```text
## Current State
Version: [X]
Last Updated: [DATE]

## Quality Metrics
- RQS: [X]
- ATS: [X]
- SHR: [X]
- TTV: [X]

## Known Issues
- [List]

## Recent Changes
- [List]
```

### 7.2 Metrics Dashboard

Real-time visibility into:
- Quality scores
- Trust ratings
- Trend analysis
- Self-healing events

### 7.3 Audit Trail

Log all outputs:
- Timestamp
- Agent/Tool used
- Quality score
- Issues found
- Remediation taken

---

## 8. Product Checklist

Use this for every new product/integration:

```text
PRODUCT MEASUREMENT CHECKLIST

Setup:
[ ] MVI Contract filled
[ ] System State initialized
[ ] Metrics tracking enabled

Quality Gates:
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

## 9. Integration Pattern

For any new integration, include:

```text
/[product]/
├── standards/
│   ├── QUALITY_STANDARDS.md    # Product-specific quality rules
│   └── MEASUREMENT_STANDARD.md # Copy of this standard
├── scripts/
│   ├── score.js                # Quality scoring
│   ├── verify.js               # Source verification
│   ├── metrics.js              # Metrics collection
│   └── self-heal.js            # Self-healing
├── SYSTEM_STATE.md             # Current state
├── METRICS.md                 # Dashboard
└── AUDIT_LOG.jsonl            # Audit trail
```

---

## 10. Quick Reference

```bash
# Score quality
node scripts/score.js [output]

# Verify sources
node scripts/verify.js [output]

# Track metrics
node scripts/metrics.js

# Self-heal
node scripts/self-heal.js [issue]

# Generate report
node scripts/report.js
```

---

## 11. Exceptions

Products MAY deviate from these standards with:
1. Documented reason
2. Alternative metrics that achieve same goals
3. Approval from product lead

---

**Related Standards:**
- `SELF_HEALING_STANDARDS.md`
- `MVI_CONTRACT_STANDARD.md`
- `SYSTEM_STATE_STANDARD.md`
- `AGENT_SCAFFOLDING_BAN.md`
