# R&D Research Fleet - Measurement Dashboard

*Track your research fleet performance in real-time*

---

## Dashboard Overview

Your research fleet generates real-time metrics. This dashboard tracks:

- Research quality scores
- Agent trust ratings
- Framework effectiveness
- Self-healing events
- Trend analysis

---

## Key Metrics

### 1. Research Quality Score (RQS)
**Target: 85+**

```text
RQS = 
  Source Quality (30%) +
  Methodology Adherence (25%) +
  Completeness (20%) +
  Actionability (15%) +
  Presentation (10%)
```

### 2. Agent Trust Score (ATS)
**Target: 80+**

Starts at 70. Updates after every research task.
- Excellent task: +5
- Good task: +2
- Failed task: -10
- Hallucination: -15

### 3. Framework Effectiveness Index (FEI)
**Target: 90%+**

Which frameworks produce the best results?

| Framework | Best For | Success Rate |
|-----------|----------|--------------|
| DOE | Feasibility | 85% |
| TRIZ | Innovation | 78% |
| BNAT | Discovery | 72% |
| Lead Search | Outreach | 90% |
| Merchandise | Products | 88% |

### 4. Self-Healing Rate (SHR)
**Target: <5%**

% of tasks that needed self-healing intervention.

### 5. Time to Insight (TTI)
**Target: <5 min**

Average time from query to actionable insight.

---

## Dashboard Template

```text
┌─────────────────────────────────────────────────────────┐
│  R&D RESEARCH FLEET - LIVE METRICS                     │
├─────────────────────────────────────────────────────────┤
│  Research Quality Score    ████████░░  85/100    ✅    │
│  Agent Trust              ████████░░  82/100    ✅    │
│  Framework Effectiveness   █████████░  91/100    ✅    │
│  Self-Healing Rate       █░░░░░░░░░   3%       ✅    │
│  Time to Insight         ██████████   2.5 min   ✅    │
├─────────────────────────────────────────────────────────┤
│  TODAY'S SESSIONS                                     │
│  ├─ DOE Screening: 12    Quality: 88                 │
│  ├─ TRIZ Analysis:  8    Quality: 82                 │
│  ├─ BNAT Hunt:      5    Quality: 79                 │
│  ├─ Lead Search:    15   Quality: 92                 │
│  └─ Merchandise:    11   Quality: 89                 │
├─────────────────────────────────────────────────────────┤
│  TRENDS                                                │
│  Quality: ↑ +3% (improving)                          │
│  Speed:   → stable                                    │
│  Trust:   ↑ +5 (climbing)                            │
└─────────────────────────────────────────────────────────┘
```

---

## Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | Excellent | Continue |
| 80-89 | Good | Minor tweaks |
| 70-79 | Acceptable | Review needed |
| 60-69 | Warning | Self-heal triggered |
| <60 | Critical | Immediate fix |

---

## Auto-Alerts

Get notified when metrics drop:

```text
⚠️ Quality Alert: RQS dropped below 80
⚠️ Trust Alert: ATS dropped below 70
⚠️ Self-Heal Spike: SHR > 10%
⚠️ Speed Warning: TTI > 10 min
```

---

## Weekly Report Template

```text
RESEARCH FLEET WEEKLY REPORT
Week of: [DATE]

SUMMARY:
- Total Sessions: [X]
- Average Quality: [X]
- Total Self-Heals: [X]
- Top Framework: [NAME]

TRENDS:
- Quality trend: [↑/↓/→]
- Speed trend: [↑/↓/→]
- Trust trend: [↑/↓/→]

ISSUES:
- [List any problems]

IMPROVEMENTS:
- [List what worked]

RECOMMENDATIONS:
- [Next week's focus]
```

---

## How to Run

```bash
# View live dashboard
node scripts/dashboard.js

# Generate weekly report
node scripts/weekly-report.js

# Check agent trust
node scripts/trust-score.js

# View trends
node scripts/trends.js
```

---

## Export Metrics

```bash
# Export to JSON
node scripts/export.js --format=json --output=metrics.json

# Export to CSV
node scripts/export.js --format=csv --output=metrics.csv

# Export to PDF report
node scripts/export.js --format=pdf --output=report.pdf
```

---

**Built with enterprise standards from MIDNGHTSAPPHIRE**
**© 2026 Freedom Angel Corp.**
