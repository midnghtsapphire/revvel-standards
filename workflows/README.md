# Automation Workflows

This directory contains automation workflows for various Revvel products and processes.

## 📁 Available Workflows

### 1. 🎨 PDF Product Creation Pipeline ⭐ NEW

**Platforms**: n8n, Make.com, Zapier, Gumloop

**Purpose**: Automate the complete 6-step process for creating and marketing PDF products

**Features**:
- AI-powered title generation (Claude)
- 15-20 page content creation
- Canva design integration
- Shopify product listing
- YouTube influencer campaign prep

**Quick Start**:
```bash
./setup-pdf-automation.sh [n8n|make|zapier|gumloop]
```

**Documentation**:

- **[PDF_WR_PLAYBOOK.md](./PDF_WR_PLAYBOOK.md)** — WR (`sellable-pdf` + batch dropdown) → full automation path (form-driven, not label-driven).
- **[PDF_AUTOMATION_GUIDE.md](./PDF_AUTOMATION_GUIDE.md)** — Make / n8n / Zapier / Gumloop setup.

---

### 2. 🏡 USDA Loan Eligibility Checker

**Platform**: n8n

This n8n workflow automates the USDA loan eligibility checking process. It validates user input, checks rural area eligibility, compares income to state/county limits, and generates a comprehensive eligibility report.

## Features

- **Address Validation:** Checks if property is in USDA-eligible rural area
- **Income Comparison:** Compares household income to state/county-specific USDA limits
- **Automated Reporting:** Generates detailed eligibility report with next steps
- **Lead Capture:** Stores applicant data in Google Sheets for follow-up
- **Email Notifications:** Sends eligibility report to applicant's email

## Prerequisites

### Required Services
1. **n8n** (self-hosted or cloud) — <https://n8n.io/>
2. **Google Maps API** — For geocoding addresses (get state/county)
3. **PostgreSQL Database** — To store USDA income limit data
4. **Google Sheets** — For lead storage
5. **Email Service** — SendGrid, Gmail, or SMTP

### API Keys / Credentials
- `googleMapsApiKey` — Google Maps Geocoding API key
- PostgreSQL connection (host, port, username, password, database)
- Google Sheets OAuth credentials
- Email service credentials

## Setup Instructions

### 1. Import Workflow into n8n

1. Open n8n dashboard
2. Click "Workflows" → "Import from File"
3. Upload `usda-loan-eligibility-checker.n8n.json`
4. Workflow will be created (disabled by default)

### 2. Set Up PostgreSQL Database

Create a table to store USDA income limits:

```sql
CREATE TABLE usda_income_limits (
  id SERIAL PRIMARY KEY,
  year INT NOT NULL,
  state VARCHAR(100) NOT NULL,
  county VARCHAR(100) NOT NULL,
  income_limit_1_4 DECIMAL(10, 2) NOT NULL,  -- 1-4 person household
  income_limit_5_8 DECIMAL(10, 2) NOT NULL,  -- 5-8 person household
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, state, county)
);

-- Create index for faster lookups
CREATE INDEX idx_income_limits_lookup ON usda_income_limits(year, state, county);
```

### 3. Populate Income Limit Data

**Data Source:** USDA Rural Development website (updated annually)
**URL:** <https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-guaranteed-loan-program/eligibility>

**Example Data (2026):**

```sql
INSERT INTO usda_income_limits (year, state, county, income_limit_1_4, income_limit_5_8) VALUES
(2026, 'Colorado', 'El Paso', 103350.00, 136450.00),
(2026, 'Colorado', 'Boulder', 115000.00, 151800.00),
(2026, 'Missouri', 'St. Louis', 110250.00, 145550.00),
(2026, 'Missouri', 'Boone', 95500.00, 126050.00),
(2026, 'Texas', 'Travis', 115500.00, 152500.00),
(2026, 'Texas', 'Williamson', 118000.00, 155750.00),
(2026, 'California', 'Sacramento', 126000.00, 166300.00),
(2026, 'California', 'San Bernardino', 118500.00, 156400.00);

-- Add more counties as needed
```

**Automation Tip:** Scrape USDA website annually to update limits (use Python script + cron job).

### 4. Configure n8n Credentials

In n8n dashboard → Settings → Credentials:

1. **Google Maps API**
   - Type: Query Auth
   - Parameter Name: `key`
   - Parameter Value: `YOUR_GOOGLE_MAPS_API_KEY`

2. **PostgreSQL**
   - Host: `your-postgres-host.com`
   - Port: `5432`
   - Database: `usda_loans`
   - User: `your_username`
   - Password: `your_password`

3. **Google Sheets**
   - OAuth2 authentication (n8n provides wizard)
   - Create spreadsheet with "Leads" sheet
   - Columns: Date, Name, Address, State, County, Household Size, Income, Income Limit, Eligibility

4. **Email Service**
   - SMTP or SendGrid credentials
   - From email: `noreply@yourdomain.com`

### 5. Activate Workflow

1. Open workflow in n8n
2. Click "Activate" toggle (top right)
3. Webhook URL will be generated (e.g., `https://your-n8n.com/webhook/usda-eligibility`)

## API Usage

### Request Format

**Endpoint:** `POST https://your-n8n.com/webhook/usda-eligibility`

**Headers:**
```text
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Audrey Evans",
  "email": "audrey@example.com",
  "address": "123 Main St, Colorado Springs, CO 80918",
  "income": 85000,
  "householdSize": 1
}
```

### Response Format

#### Eligible
```json
{
  "success": true,
  "message": "Eligibility report generated",
  "eligible": true,
  "report": {
    "applicantName": "Audrey Evans",
    "address": "123 Main St, Colorado Springs, CO 80918",
    "state": "Colorado",
    "county": "El Paso",
    "householdSize": 1,
    "userIncome": 85000,
    "incomeLimit": 103350,
    "incomePercentage": "82.3",
    "overallEligible": true,
    "ruralStatus": "ELIGIBLE",
    "incomeStatus": "ELIGIBLE",
    "nextSteps": [
      "1. Gather required documents (see checklist)",
      "2. Contact a USDA-approved lender for pre-qualification",
      "3. Get pre-approved (soft credit check, no commitment)",
      "4. Start house hunting in your eligible area",
      "5. Make an offer and begin the underwriting process"
    ],
    "documentChecklist": [
      "2 years of tax returns (Form 1040)",
      "2 months of pay stubs (all household earners)",
      "2 months of bank statements (all accounts)",
      "Credit report (will be pulled by lender)",
      "Photo ID (driver's license or passport)",
      "Social Security card",
      "Proof of citizenship (if applicable)"
    ],
    "recommendations": [
      "Contact a local credit union or rural bank (often best USDA rates)",
      "Consider working with a loan packager to streamline the process",
      "Ask about USDA Direct Loan if income is below 80% area median"
    ]
  }
}
```

#### Ineligible (Rural)
```json
{
  "success": true,
  "message": "Property not in USDA-eligible area",
  "eligible": false,
  "ruralStatus": "ineligible",
  "alternatives": [
    "FHA loans",
    "Conventional loans",
    "VA loans (if veteran)"
  ]
}
```

#### Ineligible (Income)
```json
{
  "success": true,
  "message": "Eligibility report generated",
  "eligible": false,
  "report": {
    "applicantName": "Audrey Evans",
    "address": "123 Main St, Colorado Springs, CO 80918",
    "state": "Colorado",
    "county": "El Paso",
    "householdSize": 2,
    "userIncome": 130000,
    "incomeLimit": 103350,
    "incomePercentage": "125.8",
    "overallEligible": false,
    "ruralStatus": "ELIGIBLE",
    "incomeStatus": "INELIGIBLE",
    "overBy": 26650,
    "nextSteps": [
      "Income ($130,000) exceeds limit ($103,350)",
      "Consider these options:",
      "  - Lower-income spouse applies alone (other added to title later)",
      "  - Look for nearby counties with higher income limits",
      "  - FHA/Conventional loans have no income limits (only DTI matters)",
      "  - If self-employed, maximize business deductions to lower AGI"
    ],
    "recommendations": [
      "You are 125.8% of the income limit (over by $26,650)",
      "Talk to a tax professional about strategies to lower adjusted gross income"
    ]
  }
}
```

## Workflow Diagram

```text
┌────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Webhook   │────>│ Validate     │────>│ Check USDA       │
│  Trigger   │     │ Input        │     │ Eligibility      │
└────────────┘     └──────────────┘     └──────────────────┘
                    (throws on error)            │
                                                 ▼
                                        ┌──────────────────┐
                                        │ Is Rural Area?   │
                                        └──────────────────┘
                                         │              │
                                 YES     │              │    NO
                                         ▼              ▼
                              ┌──────────────┐   ┌──────────────┐
                              │ Set Rural    │   │ Set Rural    │
                              │ Eligible     │   │ Ineligible   │
                              └──────────────┘   └──────────────┘
                                     │                  │
                                     ▼                  ▼
                              ┌──────────────┐   ┌──────────────┐
                              │ Geocode      │   │ Return       │
                              │ Address      │   │ Ineligible   │
                              └──────────────┘   └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Extract      │
                              │ State/County │
                              └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Get Income   │
                              │ Limit (DB)   │
                              └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Compare      │
                              │ Income       │
                              └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Generate     │
                              │ Report       │
                              └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Save to      │
                              │ Google       │
                              │ Sheets       │
                              └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Has Email?   │
                              └──────────────┘
                               │            │
                          YES  │            │  NO
                               ▼            │
                        ┌──────────────┐    │
                        │ Email        │    │
                        │ Report       │    │
                        └──────────────┘    │
                               │            │
                               └──────┬─────┘
                                      ▼
                              ┌──────────────┐
                              │ Return       │
                              │ Success      │
                              └──────────────┘
```

## Important Notes

### USDA Eligibility Map API
**WARNING:** USDA does **NOT** provide a public API for their eligibility map. The workflow includes a placeholder HTTP Request node that assumes an API exists.

**Production Options:**
1. **Scrape USDA Website:** Use Puppeteer/Playwright to automate the eligibility map form submission
2. **Geocoding + Manual Database:** Use Google Maps geocoding to get coordinates, then check against a manually maintained database of rural ZIP codes
3. **Third-Party API:** Use a paid service that aggregates USDA rural area data (if available)

### Legal Compliance

**RESPA Section 8:** If you charge borrowers for this service, you may violate RESPA. Options:
- **SaaS Model:** Charge a subscription fee for access to the tool (not per-loan)
- **B2B Model:** Partner with lenders and get paid by them (not borrowers)
- **Nonprofit:** Offer free service through a HUD-approved housing counseling agency

**State Licensing:** Check your state's requirements for loan packagers. Some states require NMLS MLO license.

## Maintenance

### Annual Income Limit Updates
USDA releases new income limits every spring (April-May). Update your database:

```sql
-- Clear old year (optional — keep for historical reporting)
-- DELETE FROM usda_income_limits WHERE year < 2026;

-- Insert new year's data
INSERT INTO usda_income_limits (year, state, county, income_limit_1_4, income_limit_5_8)
VALUES (2027, 'Colorado', 'El Paso', 106500.00, 140600.00);
-- Repeat for all counties
```

**Automation:** Create a Python script to scrape USDA website and bulk-insert new data.

## Support

- **USDA RD Website:** <https://www.rd.usda.gov/>
- **n8n Documentation:** <https://docs.n8n.io/>
- **USDA Skill:** `skills/usda-loan-agent/SKILL.md` (in this repo)

## License

All Rights Reserved — Audrey Evans / MIDNGHTSAPPHIRE. See repository root LICENSE for details.

---

**Created:** April 30, 2026
**Maintained By:** MIDNGHTSAPPHIRE / Revvel Standards
