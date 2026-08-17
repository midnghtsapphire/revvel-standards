# EDI Integration Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Purpose:** How to hand your field map to any external partner — government agency, insurance carrier, payment processor, bank, or software vendor — so they can map YOUR fields to THEIR fields without a developer present.

---

## 1. What Is EDI

**EDI** stands for **Electronic Data Interchange**. It is the process of computers exchanging business documents in a standard format — without humans manually entering data.

**Real-world examples:**
- Your app sends policyholder data to an insurance carrier → they issue a policy automatically
- Your app sends transaction data to the IRS → they receive it as a 1099 filing
- Your app sends order data to a fulfillment warehouse → they ship the product automatically
- Your app sends affiliate earnings to a payroll processor → they cut the checks

**Without EDI:** Someone manually re-enters your data into the partner's system. Slow. Error-prone.  
**With EDI:** Your system and their system talk directly. Fast. Accurate.

---

## 2. EDI Standards Used in Different Industries

When a partner asks "what EDI standard do you support?", refer to this table:

| Industry | Standard | What It Is | Your Typical Use |
|---|---|---|---|
| **IRS / US Government** | IRS MeF XML | Modernized e-File XML schema | Tax form submission (1099, W-9) |
| **Insurance** | ACORD XML | Association for Cooperative Operations Research and Development | Policy applications, claims |
| **Insurance** | HL7 FHIR | Health data standard | Health/life insurance underwriting |
| **Retail / Supply Chain** | X12 EDI | ANSI ASC X12 transaction sets | Purchase orders, invoices, shipping |
| **Banking / Payments** | ACH (NACHA) | Automated Clearing House | Direct deposits, bank transfers |
| **Banking** | ISO 20022 | Modern international banking standard | Wire transfers, payment messages |
| **Healthcare** | HIPAA 837 | Healthcare claim transaction | Medical billing (if health insurance) |
| **E-Commerce** | X12 850/856 | Purchase Order / Ship Notice | B2B ordering |
| **General / REST APIs** | JSON/REST | Modern API standard | Most SaaS integrations |
| **Batch file exchange** | CSV/XLSX | Spreadsheet format | Low-tech partner integrations |

**For most Revvel integrations:** You will use **JSON/REST** (modern APIs) or **CSV** (for batch uploads to carriers and tax processors). Full EDI (X12) is only needed for large enterprise partners.

---

## 3. The Partner Handoff Document

When you need to integrate with any partner, give them this completed template. It contains everything they need to map your fields to theirs — no developer needed for the initial mapping discussion.

See: `docs/edi-maps/GENERIC_PARTNER_FIELD_MAP_TEMPLATE.md` — blank template  
See: `docs/edi-maps/IRS_TAX_FORM_FIELD_MAP.md` — completed example for IRS  
See: `docs/field-maps/INSURANCE_LEADS_FIELD_MAP.md` — completed example for insurance

---

## 4. How to Complete a Partner Field Map

### Step 1: Get the partner's field list

Ask the partner (IRS, insurance carrier, bank, etc.):
> "Can you send me your field mapping document, API schema, or data dictionary?"

Most partners have one of:
- A PDF with their form field names
- An API documentation page (Swagger/OpenAPI)
- An Excel spreadsheet with required fields
- A technical guide (like IRS Publication 1220 for 1099s)

### Step 2: Fill in the template

Using `docs/edi-maps/GENERIC_PARTNER_FIELD_MAP_TEMPLATE.md`, complete the mapping table by looking up each partner field in this document and finding your matching database column.

### Step 3: Hand it to the developer or AI agent

The completed field map becomes the specification. A developer or AI agent reads it and builds the integration without any additional explanation needed.

### Step 4: Test with sample data

Before going live, always test with sample/dummy data. Never test integrations with real SSNs, real payment amounts, or real policy numbers.

---

## 5. The Universal Field Map Table Structure

Every partner handoff document uses the same table structure. This is the universal format:

| Column | What Goes Here |
|---|---|
| **Partner Field Name** | Exactly what the partner calls it (copy from their docs) |
| **Partner Field Code** | Technical code if different from display name |
| **Partner Field Type** | String, Integer, Decimal, Date, Boolean, Enum |
| **Partner Required?** | Yes / No / Conditional |
| **Your DB Table** | Which table in your PostgreSQL database |
| **Your DB Column** | Exact column name |
| **Your Frontend Variable** | The React/TypeScript variable name |
| **Transform Required?** | Any conversion needed (divide by 100, format date, combine fields) |
| **Example Value** | A real example of what the value looks like |
| **Notes** | Special rules, edge cases, constraints |

---

## 6. Common Transforms (Conversions)

When your data format doesn't match the partner's format, you apply a transform. These are the most common:

| Your Format | Partner Format | Transform |
|---|---|---|
| Cents (1999) | Dollars (19.99) | Divide by 100: `amount_cents / 100.0` |
| Dollars (19.99) | Cents (1999) | Multiply by 100: `Math.round(amount * 100)` |
| ISO Date (2026-04-06) | US Date (04/06/2026) | `new Date(date).toLocaleDateString('en-US')` |
| US Date (04/06/2026) | ISO Date (2026-04-06) | `new Date('04/06/2026').toISOString().split('T')[0]` |
| Full state name (Colorado) | State code (CO) | Use state code lookup table |
| State code (CO) | Full state name | Reverse lookup |
| camelCase (firstName) | snake_case (first_name) | String transform |
| snake_case (first_name) | PascalCase (FirstName) | String transform |
| Two columns (first + last) | One field (full name) | `first_name + ' ' + last_name` |
| One field (full name) | Two columns | Split on first space |
| SSN with dashes (123-45-6789) | No dashes (123456789) | Remove dashes |
| Phone with formatting (303) 555-1234 | Digits only (3035551234) | Remove non-digits |
| Boolean (true/false) | Yes/No | `value ? 'Y' : 'N'` |
| Boolean (true/false) | 1/0 | `value ? 1 : 0` |
| UUID | Integer ID | Not possible — use UUID throughout or map to partner's ID |

---

## 7. Active Partner Integrations

| Partner | Integration Type | Documents | Status |
|---|---|---|---|
| **IRS** | Tax form export (1099-NEC, 1099-K, W-9) | `docs/edi-maps/IRS_TAX_FORM_FIELD_MAP.md` | Documented |
| **Stripe** | Payment processing | `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md` (subscriptions section) | Active |
| **Plaid** | Banking data | Planned | Planned |
| **ACORD** | Insurance applications | Planned | Planned |
| **Meta/Facebook** | Ad campaign posting | `MARKETING_AUTOMATION_STANDARD.md` | Active |
| **TikTok** | Ad campaign posting | `MARKETING_AUTOMATION_STANDARD.md` | Active |
| **X/Twitter** | Ad campaign posting | `MARKETING_AUTOMATION_STANDARD.md` | Active |

---

## 8. Data Security Rules for EDI

When exchanging data with any external partner:

| Rule | Detail |
|---|---|
| Never send SSNs in plain text | Encrypt in transit (HTTPS) and at rest. Mask in logs. |
| Never send passwords | Only send tokens, never passwords |
| Never send raw financial data in URL params | Use POST body, never query strings |
| Always use HTTPS | TLS 1.2 minimum, TLS 1.3 preferred |
| Validate all incoming data | Run through Zod schema before storing |
| Log all data exchanges | Timestamp, partner, direction, record count — not the data itself |
| Use test credentials in dev | Never use production API keys in development |
| Rotate API keys every 90 days | Per `SECURITY_STANDARD.md` |
| Get partner DPA | Data Processing Agreement required before sharing PII |
