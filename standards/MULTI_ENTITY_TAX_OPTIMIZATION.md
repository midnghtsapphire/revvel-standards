# Multi-Entity Tax Optimization Standard

> **Status:** Active
> **Last Updated:** 2026-04-25
> **Domain:** Tax Strategy / Business Structure / Medicaid Protection

---

## Executive Summary

This standard defines the framework for multi-entity tax optimization for small business owners requiring Medicaid protection. It establishes best practices for entity structure, passive income classification, and charitable donation strategies.

---

## Domain Classification

| Category | Value |
|----------|-------|
| **Domain** | Tax Strategy |
| **Sub-domain** | Multi-Entity Optimization |
| **Use Case** | Small Business + Medicaid Protection |
| **Complexity** | High |

---

## Research Findings

### 1. Multi-Member LLC Tax Treatment

Per IRS regulations, multi-member LLCs are taxed as partnerships by default:
- Each member receives K-1 for their share of income/losses
- Losses flow through to personal returns
- Subject to basis limitations (at-risk, passive activity)

### 2. S-Corp vs Partnership Trade-offs

| Factor | Partnership/LLC | S-Corp |
|--------|-----------------|---------|
| Self-employment tax | SE tax on ALL profits | Only on salary |
| Distributions | No SE tax | No SE tax |
| Reasonable salary | N/A | Required |
| QBI deduction | Yes | Yes (with limits) |
| Complexity | Low | Medium |

### 3. Medicaid Income Limits (Colorado 2026)

| Program | Income Limit | Notes |
|---------|-------------|-------|
| Health First Colorado | ~$1,574/month | Elderly/disabled |
| Medicare | N/A | Based on work credits |
| SSI | $794/month | Supplemental |

### 4. Passive Income Classification (IRS Pub 925)

**Material Participation Tests:**
1. 500+ hours in activity
2. Substantially all participation
3. Participation > anyone else
4. Regular, continuous, substantial

**For Audrey:** Involvement = "pick products" = NOT material participation = PASSIVE

---

## Architecture Pattern

```text
┌─────────────────────────────────────────────────────────────┐
│              RECOMMENDED ENTITY STRUCTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              FREEDOM ANGEL HOLDINGS LLC                       │
│                    (Holding Company)                          │
│                         100% owns:                           │
│              ┌─────────────────────────────┐              │
│              │                             │              │
│              ▼                             ▼              │
│    Reese Reviews LLC             Rental Co LLC              │
│    (51% Audrey, 49% Caresse)  (51% Audrey, 49% Caresse)│
│              │                             │              │
│              ▼                             ▼              │
│    Overflow LLC                  Fidelity Trust Services     │
│    (51% Audrey, 49% Caresse)  (100% Audrey)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Requirements

### 1. Operating Agreements

Each LLC must have:
- [ ] Clear ownership percentages
- [ ] Management responsibilities defined
- [ ] Profit/loss allocation provisions
- [ ] Passive activity designations

### 2. Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Operating Agreement | Legal structure | CPA files |
| K-1s | Annual flow-through | Tax return |
| Donation receipts | FMV tracking | Audit folder |
| Medicaid correspondence | Eligibility proof | Healthcare file |

### 3. Tax Filing Checklist

- [ ] Schedule C (sole prop activities)
- [ ] Schedule E (rental, K-1s)
- [ ] Form 1065 (partnerships)
- [ ] Form 1120-S (S-corps if applicable)
- [ ] Schedule A (charitable deductions)

---

## Compliance Requirements

### Annual
- [ ] Colorado Secretary of State annual report
- [ ] Federal tax filings (K-1s, 1065s)
- [ ] Medicaid redetermination
- [ ] SAM.gov CAGE code renewal (if applicable)

### Monthly
- [ ] Income tracking
- [ ] Medicaid limit monitoring
- [ ] Donation logging

---

## Risk Factors

| Risk | Level | Mitigation |
|------|-------|-----------|
| Medicaid disqualification | CRITICAL | Zero taxable income strategy |
| IRS audit (passive classification) | MEDIUM | Document Caresse's participation |
| SE tax on distributions | LOW | S-corp election if income >$80K |
| State compliance | MEDIUM | Annual CO filings |

---

## Integration Points

| System | Integration |
|---------|------------|
| Odoo | Business data sync |
| QuickBooks | Expense tracking |
| TaxCalc | Calculations |
| Medicaid portal | Eligibility monitoring |

---

## Related Standards

- `AI_TAX_INTEGRATION.md` - Tax AI recommendations
- `SECURITY.md` - Data protection for financial info
- `MONITORING.md` - Compliance tracking

---

*Standard maintained by revvel-standards*
*Last updated: 2026-04-25*
