# IRS Tax Form Field Map — EDI Integration

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Developers, compliance staff, tax preparers, IRS integration partners  
**Purpose:** Maps every Revvel database field to the exact IRS form field it corresponds to, for electronic filing, third-party integrations, and giving partners a handoff document.

---

## About TTY / Phone Filing for the IRS

**Your daughter and any deaf/hard of hearing users can interact with the IRS through:**

| Method | Number / URL | What It's For |
|---|---|---|
| **IRS TTY/TDD Line** | 1-800-829-4059 | Call the IRS directly via TTY device or 711 relay |
| **IRS Phone (general)** | 1-800-829-1040 | Regular phone, use 711 relay for TTY |
| **IRS Free File** | irs.gov/freefile | File federal taxes free online (screen reader accessible) |
| **IRS Direct File** | directfile.irs.gov | IRS's own free filing tool (WCAG 2.1 AA compliant) |
| **711 Relay** | Dial 711 | Free nationwide TTY relay — operator reads your typed messages aloud |

**Your app does NOT need to connect to the IRS TTY phone line.** What your app needs to do is:
1. Export/pre-fill data into the correct IRS form fields (electronic filing)
2. Be screen-reader and TTY accessible so users can use your app to prepare their filing

---

## How Electronic Tax Filing Works (MeF)

The IRS's **Modernized e-File (MeF)** system accepts XML files that match specific schemas. Your app stores data in PostgreSQL — this document maps your database columns to the IRS field names so you (or a developer) can build the export.

You don't file directly with MeF yourself unless you're an **Authorized IRS e-File Provider**. Most businesses use an intermediary:
- **Track1099** (recommended for 1099s)
- **Tax1099.com**
- **Yearli**
- **AMS (Advanced Micro Solutions)**
- **Drake Tax** (for preparers)

You give these services a CSV or API payload — this document tells you exactly which fields to include.

---

## Part 1: IRS Form W-9 — Request for Taxpayer Identification

**When you use it:** Collect from every US contractor, affiliate, or vendor you pay **before** you pay them. Required before issuing any 1099.

**Your database** → **W-9 Form fields:**

| W-9 Line | IRS Field Name | IRS Field Code | Your DB Table | Your DB Column | Frontend Label | Notes |
|---|---|---|---|---|---|---|
| Line 1 | Name | `name` | `users` | `first_name` + `last_name` | Full Legal Name | Must match name on tax return |
| Line 2 | Business name / DBA | `businessName` | `users` | `business_name` | Business Name (if different) | Optional |
| Line 3a | Federal tax classification | `taxClassification` | `users` | `tax_classification` | Tax Classification | Individual/Sole Prop / LLC / C-Corp / S-Corp / Partnership / Trust / Other |
| Line 3b | LLC type | `llcType` | `users` | `llc_type` | LLC Type | C / S / P (only if Line 3a = LLC) |
| Line 4 | Exemptions | `exemptionCode` | `users` | `exemption_code` | Exempt Payee Code | Most individuals = blank |
| Line 5 | Address (street, apt) | `addressLine1` | `users` | `address_line1` | Street Address | |
| Line 5 | Address line 2 | `addressLine2` | `users` | `address_line2` | Apt / Suite / Unit | |
| Line 6 | City, State, ZIP | `cityStateZip` | `users` | `city` + `state` + `zip_code` | City, State, ZIP | Combined for form |
| Part I | SSN or EIN | `tinNumber` | `users` | `tax_id_number` | SSN or EIN | **NEVER store unencrypted. Use Vault or encrypted column.** |
| Part I | TIN Type | `tinType` | `users` | `tin_type` | TIN Type | `SSN` or `EIN` |
| Part II | Signature | (digital) | `users` | `w9_signed_at` | Electronic Signature Date | Stored as timestamp of acceptance |
| Part II | Date | (digital) | `users` | `w9_signed_at` | Date | Same field |

**Security note:** `tax_id_number` (SSN/EIN) must be:
- Encrypted at rest (AES-256)
- Never logged
- Never exposed in API responses (mask as `***-**-1234`)
- Stored in HashiCorp Vault or encrypted DB column

---

## Part 2: IRS Form 1099-NEC — Nonemployee Compensation

**When you use it:** File for every contractor/affiliate who earned **$600 or more** in a calendar year.  
**Due date:** January 31 of the following year (both to recipient AND to IRS).

**Your database** → **1099-NEC fields:**

| Box | IRS Field Name | IRS Code | Your DB Table | Your DB Column | Notes |
|---|---|---|---|---|---|
| Payer Name | Your company name | `payerName` | (app settings) | `company_name` | Your business legal name |
| Payer TIN | Your EIN | `payerTin` | (app settings) | `company_ein` | Your company's EIN |
| Payer Address | Your address | `payerAddress` | (app settings) | `company_address` | |
| Recipient Name | Contractor/affiliate name | `recipientName` | `users` | `first_name` + `last_name` | Must match their W-9 |
| Recipient TIN | Their SSN or EIN | `recipientTin` | `users` | `tax_id_number` | From their W-9 |
| Recipient Address | Their address | `recipientAddress` | `users` | `address_line1` + `city` + `state` + `zip_code` | |
| Box 1 | Nonemployee Compensation | `nonemployeeCompensation` | `affiliate_payouts` | `SUM(amount_cents) ÷ 100` | Total paid in calendar year |
| Box 2 | Payer made direct sales >$5,000 | `directSales` | (manual check) | — | Usually blank |
| Box 4 | Federal income tax withheld | `federalTaxWithheld` | `affiliate_payouts` | `federal_tax_withheld_cents ÷ 100` | Usually 0 unless backup withholding |
| Box 5 | State tax withheld | `stateTaxWithheld` | `affiliate_payouts` | `state_tax_withheld_cents ÷ 100` | If applicable |
| Box 6 | State/Payer state no. | `stateId` | (app settings) | `state_tax_id` | Your state employer ID |
| Box 7 | State income | `stateIncome` | `affiliate_payouts` | `SUM(amount_cents) ÷ 100` | Same as Box 1 for most |

---

## Part 3: IRS Form 1099-K — Payment Card and Third-Party Network Transactions

**When you use it:** If you process payments through Stripe and your customers receive >$600 in payments in a year (as of 2025 threshold). **Stripe files this on your behalf for your customers.** You may need to file this for your own platform users.

**Your database** → **1099-K fields:**

| Box | IRS Field Name | IRS Code | Your DB Table | Your DB Column | Notes |
|---|---|---|---|---|---|
| Filer Name | Stripe (or your platform) | `filerName` | (app settings) | `platform_name` | Usually "Stripe" as the PSE |
| Filer TIN | Stripe's EIN | `filerTin` | (Stripe provides) | — | Stripe handles this |
| Payee Name | Seller/recipient name | `payeeName` | `users` | `first_name` + `last_name` | |
| Payee TIN | Seller's SSN/EIN | `payeeTin` | `users` | `tax_id_number` | From their W-9 |
| Payee Address | Seller's address | `payeeAddress` | `users` | address fields | |
| Box 1a | Gross amount of payment card/third-party transactions | `grossAmount` | `orders` | `SUM(total_cents) ÷ 100` WHERE `status = 'paid'` | Total for calendar year |
| Box 1b | Card not present transactions | `cardNotPresent` | `orders` | Same as 1a for online | All online = card not present |
| Box 2 | Merchant category code | `merchantCategoryCode` | (app settings) | `mcc_code` | e.g., 5999 for misc retail |
| Box 3 | Number of payment transactions | `transactionCount` | `orders` | `COUNT(id)` WHERE year | |
| Box 4 | Federal income tax withheld | `federalTaxWithheld` | — | `0` | Usually 0 |
| Box 5a–5l | Monthly payment amounts | `monthlyAmounts[1-12]` | `orders` | `SUM(total_cents)` grouped by month | Jan–Dec breakdown |

---

## Part 4: Insurance-Related IRS Forms

If you sell insurance as a direct business, these additional forms apply:

### 1099-R — Distributions from Annuities / Life Insurance

**When:** When a policyholder surrenders a cash-value policy or receives a distribution.

| Box | Field | Your DB | Notes |
|---|---|---|---|
| Box 1 | Gross distribution | `policy_distributions.gross_cents ÷ 100` | Total amount paid out |
| Box 2a | Taxable amount | `policy_distributions.taxable_cents ÷ 100` | Earnings over basis |
| Box 7 | Distribution code | `policy_distributions.distribution_code` | `'1'` = early, `'7'` = normal, `'D'` = annuity |
| Recipient | Policyholder | `users` table | Name, TIN, address |

### 1095-A — Health Insurance Marketplace Statement

**Only if:** You sell health insurance through a marketplace. Not applicable for life/burial/pet insurance.

---

## Part 5: State-Level Tax Form Mapping

Insurance is regulated at the **state level**. Each state may require additional filings. Key states:

| State | Filing Requirement | Notes |
|---|---|---|
| **Colorado** | CO Form DR 1093 (Annual Withholding) | File annually |
| **California** | CA DE 43 (Employer's Annual Reconciliation) | If you have CA contractors |
| **New York** | NY IT-2102 | Annual wage/contractor summary |
| **Texas** | No state income tax | No state 1099 filing |
| **Florida** | No state income tax | No state 1099 filing |

For all states where you have contractors/affiliates earning $600+: check that state's revenue department for 1099 filing requirements.

---

## Part 6: How to Give This to a Partner (EDI Handoff)

When you need to integrate with the IRS, a tax software provider, or any government agency, hand them this section. It contains your field names, their IRS names, and the data types — everything they need to map your data into their system.

### Your System → IRS Field Cross-Reference (Machine-Readable)

```json
{
  "system": "Revvel/MIDNGHTSAPPHIRE",
  "version": "1.0.0",
  "contact": "audrey@midnghtsapphire.com",
  "database": "PostgreSQL 16",
  "orm": "Drizzle ORM",
  "forms": {
    "W9": {
      "description": "Collected from all contractors and affiliates before first payment",
      "storage_table": "users",
      "fields": [
        { "irs_field": "name", "irs_line": "Line 1", "your_column": "users.first_name + ' ' + users.last_name", "type": "string", "max_length": 40 },
        { "irs_field": "businessName", "irs_line": "Line 2", "your_column": "users.business_name", "type": "string", "max_length": 40 },
        { "irs_field": "taxClassification", "irs_line": "Line 3a", "your_column": "users.tax_classification", "type": "enum", "values": ["individual", "llc", "c_corp", "s_corp", "partnership", "trust"] },
        { "irs_field": "tinNumber", "irs_line": "Part I", "your_column": "users.tax_id_number (encrypted)", "type": "string", "format": "SSN (XXX-XX-XXXX) or EIN (XX-XXXXXXX)", "security": "AES-256 encrypted at rest, never logged" },
        { "irs_field": "tinType", "irs_line": "Part I", "your_column": "users.tin_type", "type": "enum", "values": ["SSN", "EIN"] },
        { "irs_field": "streetAddress", "irs_line": "Line 5", "your_column": "users.address_line1", "type": "string" },
        { "irs_field": "city", "irs_line": "Line 6", "your_column": "users.city", "type": "string" },
        { "irs_field": "state", "irs_line": "Line 6", "your_column": "users.state", "type": "string", "format": "2-letter ISO 3166-2 code" },
        { "irs_field": "zipCode", "irs_line": "Line 6", "your_column": "users.zip_code", "type": "string", "format": "XXXXX or XXXXX-XXXX" }
      ]
    },
    "1099NEC": {
      "description": "Filed annually for contractors/affiliates paid $600+",
      "storage_tables": ["users", "affiliate_payouts"],
      "fields": [
        { "irs_field": "recipientName", "box": "Recipient", "your_query": "SELECT first_name || ' ' || last_name FROM users WHERE id = affiliate.user_id", "type": "string" },
        { "irs_field": "recipientTin", "box": "Recipient TIN", "your_column": "users.tax_id_number (encrypted)", "type": "string" },
        { "irs_field": "nonemployeeCompensation", "box": "Box 1", "your_query": "SELECT SUM(amount_cents) / 100.0 FROM affiliate_payouts WHERE EXTRACT(YEAR FROM paid_at) = :year AND affiliate_id = :id AND status = 'paid'", "type": "decimal(12,2)" },
        { "irs_field": "federalTaxWithheld", "box": "Box 4", "your_column": "affiliate_payouts.federal_tax_withheld_cents / 100.0", "type": "decimal(12,2)", "default": 0 }
      ]
    }
  }
}
```

---

## Part 7: Required DB Columns to Add for Tax Compliance

If not already present, add these columns to your `users` table before handling any payments to affiliates or contractors:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id_number_encrypted TEXT;  -- Encrypted SSN/EIN
ALTER TABLE users ADD COLUMN IF NOT EXISTS tin_type VARCHAR(3);             -- 'SSN' or 'EIN'
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_classification VARCHAR(20);  -- W-9 Line 3
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);      -- W-9 Line 2
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS w9_signed_at TIMESTAMP;          -- When they e-signed their W-9
ALTER TABLE users ADD COLUMN IF NOT EXISTS w9_signed_ip VARCHAR(45);        -- IP address when signed
ALTER TABLE users ADD COLUMN IF NOT EXISTS ytd_earnings_cents INTEGER DEFAULT 0; -- Running year-to-date total
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_1099 BOOLEAN DEFAULT false;  -- True when YTD >= $600
```
