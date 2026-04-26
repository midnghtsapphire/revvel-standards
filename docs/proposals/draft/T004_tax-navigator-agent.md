# Proposal T004: Tax Navigator Agent

> **Status:** Draft
> **Created:** 2026-04-25
> **Owner:** @openhands
> **Target:** revvel-standards

---

## Problem Statement

Audrey Evans has multiple businesses and specific tax situation that requires automation:

### Current State
- **Freedom Angel Corp** - main business entity
- **Reese Reviews LLC** - handles vine reviews (daughter does work, income flows there)
- **Overflow/Overstock Business** - to sell overstock products
- **Rental Company** - rents products (costumes, catering equipment, heaters, etc.)
- **60 years old**, disabled, 6 months post-mastectomy
- **SSDI**: $3,400/month
- **Medical costs**: $130/month
- **Colorado resident**

### Critical Constraints (MUST NOT VIOLATE)
- **Medicaid qualification** - must stay eligible
- **Medicare qualification** - must stay eligible  
- **In-home care** - depends on Medicaid
- **Housing voucher** - depends on Medicaid income limits

### Income Boundaries (Colorado Medicaid)
- **Single person income limit**: ~$1,500-2,000/month (varies by program)
- **SSDI is INCOME** - counts toward Medicaid limits
- **Any taxable income risks Medicaid**

### Passive Income Goal
- ALL involvement should be **passive income**
- Vine reviews: pick product, daughter does rest → income to Reese Reviews LLC
- **Key insight**: If Audrey's involvement is passive, income may not count as HER taxable income

---

## Proposed Solution

### Tax Navigator Agent Architecture

```
┌────────────────────────────────────────────────────────────┐
│                  TAX NAVIGATOR AGENT                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Odoo Connection (via XML-RPC)                        │
│     → Pulls all business data                             │
│     → Tracks expenses, revenue, assets                    │
│                                                            │
│  2. Entity Graph                                        │
│     → Maps ownership: Freedom Angel, Reese Reviews, etc.     │
│     → Tracks intercompany transactions                   │
│                                                            │
│  3. Passive Income Classifier                           │
│     → Audits: "Is this active or passive income?"       │
│     → Flags risky transactions                        │
│                                                            │
│  4. Medicaid Watchdog                                │
│     → Monitors: SSDI + any other income              │
│     → Alerts: "You're hitting the limit"              │
│     → Calculates: What can you deduct/donate?         │
│                                                            │
│  5. Tax Credit Scanner                            │
│     → Tracks: R&D credits, WOTC, ERC, etc.         │
│     → Watches: What you QUALIFY for               │
│                                                            │
│  6. Asset Donation Tracker                           │
│     → Tracks: Products donated to businesses       │
│     → Calculates: Fair market value → deduction     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Odoo Business Integration

```python
# Connect to Odoo (XML-RPC)
import xmlrpc.client

url = "https://your-odoo-instance.com"
db = "your_database"
username = "admin"
password = "your_password"

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

# Pull accounts receivable, payable, expenses
expenses = models.execute_kw(db, uid, password, 'account.move', 'search_read', 
    [[('move_type', '=', 'entry')], {'fields': ['date', 'amount', 'partner_id']}])
```

### 2. Passive Income Classification

**IRS Rules** (Publication 925):
- Income is **PASSIVE** if:
  - You don't materially participate
  - It's from a business your family does most work
  - You have no regular involvement

**CLF (material participation test)**:
- 500+ hours in the activity = ACTIVE
- Less than 100 hours AND less than anyone else = PASSIVE

**Key strategy for Audrey**:
- Donate PRODUCTS (not cash) to businesses → capital contributions
- NO taxable income to Audrey
- Businesses depreciate/rent items

### 3. Medicaid Watchdog (Colorado)

| Program | Income Limit | 2024 Limit |
|---------|------------|------------|
| Health First Colorado | ~$1,574/mo | For elderly/disabled |
| Medicare | N/A | SSDs only |

**If SSDI goes over** → Lose Medicaid → Lose:
- In-home care
- Housing voucher
- Medical coverage

**Solution**: Keep income LOW via:
- Charitable donations (reduce AGI)
- Business losses (flow through)
- Asset contributions (no income)

### 4. Tax Credit Opportunity Scanner

Credits to monitor for disabled/senior:

| Credit | Qualification |
|--------|-------------|
| **Disability Savings Account** | Have DB plan? |
| **Elderly/Dependent Care Credit** | Qualify? |
| **Child/Dependent Care** | Not applicable |
| **R&D Credit** | If renting equipment |
| **Cost Segregation** | Real estate |

### 5. Asset Donation Tracker

For Audrey's model:

```
Product donated → Donation Tracker → FMV Calculation → Deduction

Example:
- Costume purchased: $100
- Donated to Rental LLC: $100 FMV
- Rental LLC depreciates: $100/yr deduction
- Audrey: $100 charitable deduction

NO TAX to Audrey!
```

---

## Implementation Plan

### Phase 1: Odoo Connection
- [ ] Set up Odoo XML-RPC connection
- [ ] Pull business data for each entity
- [ ] Build entity ownership graph

### Phase 2: Passive Income Engine
- [ ] Classify each income stream
- [ ] Alert on active vs passive classification
- [ ] Build year-end projections

### Phase 3: Medicaid Watchdog
- [ ] Input: SSDI amount ($3,400/mo)
- [ ] Calculate: Other income buffers
- [ ] Alert: Danger zones

### Phase 4: Tax Credit Scanner
- [ ] Monitor credits based on activities
- [ ] Track: What you qualify for when
- [ ] Build: Application reminders

### Phase 5: Asset Donation Engine
- [ ] Track: All donated items
- [ ] Calculate: FMV for each
- [ ] Export: Schedule C, K-1s

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|-----------|
| Medicaid disqualification | **CRITICAL** | NEVER exceed income limits |
| IRS audit (passive income) | MEDIUM | Document family participation |
| Medicare loss | **CRITICAL** | Maintain SSDI, don't add income |
| Odoo setup | LOW | Test with sample data |

---

## Next Steps

1. **Review this proposal** - Does this match your need?
2. **Clarify ownership** - What % of each business do you own?
3. **Confirm Odoo** - Do you have Odoo running now?
4. **Define rental company** - Formal entity or informal?
5. **Start with Phase 1** - Just get Odoo connected first

---

## Questions for Audrey

1. What % of Reese Reviews do you own? Daughter?
2. What's the name of the rental company?
3. Is Overflow a formal LLC or DBA?
4. Do you have Odoo set up for any businesses?
5. What's your current accountant's name?

---

*Proposal created by @openhands on behalf of Audrey Evans*
*Automated via revvel-standards proposal system*
