# Proposal T004: Tax Navigator Agent + Business Tracker

> **Status:** Draft
> **Created:** 2026-04-25
> **Owner:** @openhands
> **Target:** revvel-standards

---

## Problem Statement

Audrey Evans has multiple businesses spread across different niches, each with unique certifications, compliance requirements, and tax situations. Current tracking is manual and fragmented.

### Current Business Portfolio

| # | Business | Purpose | Entity Type | Status |
|---|----------|---------|------------|--------|
| 1 | **Freedom Angel Corp** | Main holding/operations | LLC/S-corp | Active |
| 2 | **Reese Reviews LLC** | Vine reviews | LLC | Active |
| 3 | **Overflow/Overstock** | Sell overstock products | LLC (new) | In formation |
| 4 | **Rental Company** | Rent costumes, heaters, catering equipment | LLC (new) | In formation |
| 5 | **Fidelity Trust Services** | Legal doc assistance, classes, CLE sponsor | LLC (new) | In formation |

### Credential & Compliance Status (CRITICAL)

| Credential | Holder | Expiration | Renewal By |
|------------|--------|-----------|------------|
| Colorado Supreme Court CLE | Audrey | TBD | TBD |
| SAM.gov Cage Code | Fidelity Trust | TBD | **May 2026** |
| DUNS Number | TBD | N/A | N/A |
| UEI (Unique Entity ID) | Fidelity Trust | Required for grants | TBD |

### Audrey's Personal Profile

- **Age:** 60 years old
- **Disability Status:** Disabled, 6 months post-mastectomy
- **SSDI:** $3,400/month
- **Medical Costs:** $130/month
- **Location:** Colorado
- **Critical Programs:**
  - Medicaid (Health First Colorado) - MUST MAINTAIN
  - Medicare - MUST MAINTAIN
  - In-home care - depends on Medicaid
  - Housing voucher - depends on Medicaid

### Income Constraints (MUST NOT VIOLATE)

**Colorado Medicaid Income Limit:** ~$1,574/month (varies by program)

**SSDI ($3,400/mo) + Any Taxable Income = RISK of Disqualification**

---

## Proposed Solution

### Multi-System Enterprise Tracker

```text
┌─────────────────────────────────────────────────────────────┐
│              ENTERPRISE BUSINESS TRACKER                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ TAX NAVIGATOR    │  │ COMPLIANCE       │                   │
│  │                 │  │ TRACKER         │                   │
│  │ • Odoo Sync      │  │ • CLE Renewals  │                   │
│  │ • Entity Graph  │  │ • Cage Codes   │                   │
│  │ • Passive Inc   │  │ • DUNS/UEI     │                   │
│  │ • Medicaid     │  │ • SAM.gov      │                   │
│  │ • Credits      │  │ • Grants.gov  │                   │
│  │ • Donations    │  │ • Licenses    │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ GRANT           │  │ ASSET            │                   │
│  │ DISCOVERY       │  │ MANAGER         │                   │
│  │                 │  │                 │                   │
│  │ • SAM.gov       │  │ • Products      │                   │
│  │ • Grants.gov   │  │ • Rental Items  │                   │
│  │ • State CO     │  │ • Donations    │                   │
│  │ • Federal     │  │ • FMV Calc     │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Compliance Tracker

### Credentials & Renewals

```python
compliance_tracker = {
    "fidelity_trust_services": {
        "cle_certification": {
            "holder": "audrey_evans",
            "colorado_supreme_court": "certified_sponsor",
            "expiration": "2026-XX-XX",  # Need to fill in
            "renewal_notice": "60_days_before"
        },
        "sam_gov": {
            "cage_code": "XXXXX",  # Need to fill in
            "expiration": "2026-05-XX",  # MAY RENEWAL!
            "dunss_number": None,  # Need to get
            "uei": None,  # Need to get for grants.gov
        }
    }
}
```

### Alert System

| Item | Renewal Notice | Warning Window |
|------|--------------|----------------|
| CLE Certification | 60 days before | CRITICAL |
| CAGE Code (SAM.gov) | 30 days before | **MAY 2026** |
| DUNS/UEI | 30 days before | As needed |
| Business License | 30 days before | Per jurisdiction |

---

## Feature 2: Grant Discovery Engine

### Where to Find Grants

| Source | URL | For What |
|--------|-----|---------|
| SAM.gov | sam.gov | Federal contracts |
| Grants.gov | grants.gov | Federal grants |
| Colorado.com | colorado.gov/grants | State grants |
| USAspending | usaspending.gov | Contract awards |

### Grant Categories for Audrey's Businesses

| Business | Potential Grants | Requirements |
|----------|-----------------|-------------|
| **Fidelity Trust Services** | Legal aid, community programs | CLE + UEI |
| **Rental Company** | Small business, equipment | LLC + financials |
| **All businesses** | R&D, disability-owned | DBE certification |

---

## Feature 3: Tax Navigator (Updated)

### Passive Income Classification

| Income Stream | Classification | Tax to Audrey? |
|---------------|----------------|----------------|
| Reese Reviews (daughter does work) | **PASSIVE** | No |
| Rental income (rental company) | **PASSIVE** | No* |
| Freedom Angel consulting | ACTIVE/OWNER | Maybe |
| Overflow sales | **PASSIVE** | No* |

*If proper entity structure, income flows to LLC, not to Audrey personally

### Medicaid Watchdog

```python
medicaid_watch = {
    "ssdi_income": 3400,  # $3,400/month - FIXED
    "medicaid_limit": 1574,  # Colorado limit - VARIES
    "buffer_needed": 1826,  # MUST reduce other income
    "strategy": "donate_everything_possible"
}
```

---

## Feature 4: Asset Donation Engine

### How to Minimize Taxable Income

```text
Audrey purchases product → Donates to Rental LLC → 
    → Rental LLC gets FMV deduction
    → Audrey gets charitable deduction
    → NO income to Audrey!
```

| Item | Cost | FMV Donation | Audrey Deduction |
|------|------|-------------|-----------------|
| Costume | $100 | $100 | $100 |
| Heater | $200 | $200 | $200 |
| Catering set | $300 | $300 | $300 |

---

## Implementation Phases

### Phase 1: Compliance Tracker
- [ ] Input all credentials with expiration dates
- [ ] Set up 60/30 day alerts
- [ ] Build renewal dashboard

### Phase 2: Odoo Integration  
- If Odoo exists, sync business data
- If not, build simple tracker

### Phase 3: Grant Engine
- [ ] Register for SAM.gov (if not done)
- [ ] Get DUNS/UEI
- [ ] Set up grant opportunity alerts

### Phase 4: Tax Engine
- [ ] Classify all income streams
- [ ] Build Medicaid watch
- [ ] Track donations

---

## Updated Questions for Audrey

1. **Fidelity Trust Services:**
   - What is the exact CLE expiration date?
   - Do you have CAGE code? What is it?
   - Do you have DUNS? UEI?
   - Is entity formed or in progress?

2. **All Businesses:**
   - What % ownership in each?
   - Does daughter have ownership in Reese Reviews?
   - What are the entity names exactly?

3. **Compliance:**
   - When was/last renew anything?
   - Who is your accountant?
   - Who is your business attorney?

---

## Risk Register

| Risk | Impact | Mitigation |
|------|-------|------------|
| **May CAGE code expiration** | Lose grants/contracts | Set calendar alert NOW |
| **Medicaid disqualification** | Lose all benefits | Keep income under limit |
| **MISSING credentials** | Can't operate | Get UEI/DUNS |

---

*Proposal updated by @openhands on behalf of Audrey Evans*
*revvel-standards proposal system*
