# Audrey's Business Tracker - MVP

> **Version:** 1.0
> **Created:** 2026-04-25
> **Type:** Google Sheets / Excel Tracker
> **Purpose:** Combined tracking for all businesses

---

## Quick Start

**Link to create:** [Create new Google Sheet](https://docs.google.com/spreadsheets/create)

---

## Sheet Structure

### 1. DASHBOARD (Summary)

| Metric | This Month | YTD |
|--------|-----------|-----|
| Total Income | | |
| Total Expenses | | |
| Net Profit/Loss | | |
| Donations Made | | |
| Medicaid Status | 🟢 | |

---

### 2. BUSINESS OVERVIEW

| Business | Owner(s) | % | Status | Income | Expenses | Net |
|----------|-----------|---|--------|--------|----------|-----|
| Freedom Angel Corp | Audrey | 100% | Active | | | |
| Reese Reviews LLC | Audrey 51%, Caresse 49% | 100% | Active | | | |
| Overflow LLC | Audrey 51%, Caresse 49% | 100% | New | | | |
| Rental Co | Audrey 51%, Caresse 49% | 100% | New | | | |
| Fidelity Trust Services | Audrey | 100% | New | | | |

---

### 3. INCOME TRACKER

| Date | Business | Source | Amount | Type | Taxable to Audrey? |
|------|----------|--------|--------|------|-------------------|
| | | | | 1099/W-2/K-1 | Y/N |

---

### 4. EXPENSE TRACKER

| Date | Business | Category | Amount | Receipt | Deductible |
|------|----------|----------|--------|---------|-------------|
| | | | | Y/N | Y/N |

---

### 5. DONATION TRACKER

| Date | Item | Purchase $ | FMV $ | To Business | Receipt | Schedule A |
|------|------|-----------|--------|-------------|---------|------------|
| | | | | | Y/N | Y/N |

---

### 6. COMPLIANCE TRACKER

| Item | Credential | Expiry | Status | Renewal Due | Notes |
|------|-----------|---------|--------|-------------|-------|
| SAM.gov | CAGE Code | May 2026 | 🔴 URGENT | | |
| CLE | Sponsor | TBD | ⬜ | | |
| CO Secretary | Annual Report | March | ⬜ | | |

---

### 7. MEDICAID WATCHDOG

| Item | Amount | Limit | Status |
|------|--------|-------|--------|
| SSDI | $3,400/mo | - | Fixed |
| Business K-1 Income | | - | |
| Total Taxable | | ~$1,574 | 🟢/🟡/🔴 |

---

### 8. GRANT OPPORTUNITIES

| Grant | Agency | Due Date | Requirements | Status | Notes |
|-------|--------|----------|--------------|--------|-------|
| | | | | Open/Applied/Won | |

---

## Formulas (Google Sheets)

### Net Profit
```text
=SUMIF(Business Column, "Reese Reviews", Income) - SUMIF(Business Column, "Reese Reviews", Expenses)
```

### Medicaid Status
```text
=IF(Total_Taxable < 1574, "🟢 SAFE", IF(Total_Taxable < 1700, "🟡 WARNING", "🔴 DANGER"))
```

### YTD Totals
```text
=SUMIF(Date_Column, ">="&DATE(2026,1,1), Income_Column)
```

---

## How to Use

### Weekly
1. Log all income in INCOME TRACKER
2. Log all expenses in EXPENSE TRACKER
3. Log any donations in DONATION TRACKER

### Monthly
1. Review DASHBOARD
2. Check MEDICAID WATCHDOG
3. Update COMPLIANCE for any renewals
4. Review GRANT OPPORTUNITIES

### Quarterly
1. Verify all K-1 projections
2. Check Medicaid status with CPA
3. Review business performance

---

## Sharing

**Recommended sharing:**
- Audrey (owner)
- Caresse (editor)
- CPA (viewer)
- Attorney (viewer)

---

## Next Steps

1. Create Google Sheet from template
2. Set up formulas
3. Share with team
4. Start logging daily

---

*MVP Tracker for Audrey Evans - revvel-standards*
