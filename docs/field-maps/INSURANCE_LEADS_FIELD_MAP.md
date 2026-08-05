# Insurance Leads Field Map

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Developers, AI agents, QA, compliance reviewers, non-technical staff  
**Products Covered:**
- Burial / Final Expense Insurance
- Term Life Insurance
- Whole Life Insurance
- Universal Life Insurance (UL / IUL)
- Pet Insurance

---

## How to Read This Document

Each section maps the fields a lead sees on the form → the variable name in the code → the database column where it is stored → the validation rule that applies.

**Field ID format:** `FM-INS-[PRODUCT_CODE]-[NUMBER]`

| Product Code | Product |
|---|---|
| `BUR` | Burial / Final Expense Insurance |
| `TERM` | Term Life Insurance |
| `WHOLE` | Whole Life Insurance |
| `UL` | Universal / Indexed Universal Life |
| `PET` | Pet Insurance |
| `COMMON` | Common to all insurance products |

---

## Part 1: Common Fields (All Insurance Products)

These fields appear on every insurance lead form, regardless of product type. They are stored in the `leads` table directly.

| Field ID | Screen Label | DB Column | Frontend Var | Component | Required | Validation | Notes |
|---|---|---|---|---|---|---|---|
| FM-INS-COMMON-001 | First Name | `leads.first_name` | `firstName` | Text Input | ✅ Yes | 1–100 chars, letters only | |
| FM-INS-COMMON-002 | Last Name | `leads.last_name` | `lastName` | Text Input | ✅ Yes | 1–100 chars, letters only | |
| FM-INS-COMMON-003 | Phone Number | `leads.phone` | `phone` | Phone Input | ✅ Yes | 10 digits, US format | Primary contact method |
| FM-INS-COMMON-004 | Email Address | `leads.email` | `email` | Email Input | No | Valid email format | Optional but recommended |
| FM-INS-COMMON-005 | Date of Birth | `leads.date_of_birth` | `dateOfBirth` | Date Picker | ✅ Yes | Must be valid date, age check per product | Used for rate calculation |
| FM-INS-COMMON-006 | Age | `leads.age` | `age` | Number Input (auto-calc) | Auto | Computed from DOB | Shown as read-only after DOB entered |
| FM-INS-COMMON-007 | Gender | `leads.gender` | `gender` | Radio Group | ✅ Yes | male / female / non_binary / prefer_not_to_say | Affects insurance rates |
| FM-INS-COMMON-008 | State | `leads.state` | `state` | Dropdown | ✅ Yes | 2-letter code, must be licensed state | BLOCKING: reject if not licensed |
| FM-INS-COMMON-009 | ZIP Code | `leads.zip_code` | `zipCode` | Text Input | ✅ Yes | 5 or 9 digits | Auto-fills city/state |
| FM-INS-COMMON-010 | City | `leads.city` | `city` | Text Input | Auto-filled | Auto from ZIP | Can be edited |
| FM-INS-COMMON-011 | Coverage Amount | `leads.coverage_amount_cents` | `coverageAmountCents` | Dropdown / Slider | ✅ Yes | Per product range | See per-product sections |
| FM-INS-COMMON-012 | Monthly Budget | `leads.monthly_budget_cents` | `monthlyBudgetCents` | Dropdown | No | 0–99999 cents | "How much can you spend per month?" |
| FM-INS-COMMON-013 | Preferred Contact Method | `leads.preferred_contact` | `preferredContact` | Radio Group | No | phone / text / email | |
| FM-INS-COMMON-014 | Best Time to Call | `leads.best_time_to_call` | `bestTimeToCall` | Dropdown | No | morning / afternoon / evening / anytime | |
| FM-INS-COMMON-015 | TTY / Relay needed? | `leads.requires_tty` | `requiresTty` | Checkbox | No | boolean | For deaf/hard of hearing. Triggers TTY workflow. |
| FM-INS-COMMON-016 | Preferred Language | `leads.preferred_language` | `preferredLanguage` | Dropdown | No | en / es / fr / other | Affects which agent is assigned |
| FM-INS-COMMON-017 | Consent to Contact | `leads.consented_to_contact` | `consentedToContact` | Checkbox | ✅ Yes | Must be true to submit | TCPA REQUIRED. Form cannot submit if false. |
| FM-INS-COMMON-018 | (hidden) Consent Timestamp | `leads.consent_timestamp` | `consentTimestamp` | Hidden | Auto | Set by system on submit | Logged automatically |
| FM-INS-COMMON-019 | (hidden) Consent IP | `leads.consent_ip_address` | `consentIpAddress` | Hidden | Auto | Set by system on submit | TCPA compliance record |
| FM-INS-COMMON-020 | (hidden) Lead Source | `leads.lead_source` | `leadSource` | Hidden | Auto | UTM or 'direct' | Set from UTM params |
| FM-INS-COMMON-021 | (hidden) Landing Page | `leads.landing_page_url` | `landingPageUrl` | Hidden | Auto | Full URL | The page they were on when they submitted |

---

## Part 2: Burial / Final Expense Insurance

**What it is:** Small life insurance policy ($5,000–$25,000) designed to cover funeral and burial costs. Target age: 50–85. No medical exam. Simplified health questions only.

**Why no medical exam:** Simplified underwriting — carriers approve based on a few yes/no health questions.

### Eligibility Rules (Enforced by Form Validation)

| Rule | Value | What Happens if Failed |
|---|---|---|
| Minimum age | 50 | Form shows: "This product is available for ages 50–85" |
| Maximum age | 85 | Same message |
| US residents only | State must be in `LICENSED_STATES` | Form rejects and shows waitlist |
| Minimum coverage | $5,000 | Dropdown starts at $5K |
| Maximum coverage | $25,000 | Dropdown ends at $25K |

### Burial Insurance Lead Form Fields

| Field ID | Screen Label | DB Location | Frontend Var | Component | Required | Options / Validation |
|---|---|---|---|---|---|---|
| FM-INS-BUR-001 | Coverage Amount Desired | `leads.coverage_amount_cents` | `coverageAmountCents` | Dropdown | ✅ | $5,000 / $7,500 / $10,000 / $12,500 / $15,000 / $20,000 / $25,000 |
| FM-INS-BUR-002 | Tobacco Use (last 12 months) | `leads.product_data.tobacco_user` | `tobaccoUser` | Radio | ✅ | Yes / No — affects rate significantly |
| FM-INS-BUR-003 | Are you currently hospitalized or in a nursing facility? | `leads.product_data.currently_hospitalized` | `currentlyHospitalized` | Radio | ✅ | Yes / No — Yes = likely declined |
| FM-INS-BUR-004 | Confined to bed or wheelchair? | `leads.product_data.confined_to_bed` | `confinedToBed` | Radio | ✅ | Yes / No |
| FM-INS-BUR-005 | Terminal illness diagnosed? | `leads.product_data.terminal_illness` | `terminalIllness` | Radio | ✅ | Yes / No — Yes = declined |
| FM-INS-BUR-006 | Heart attack or stroke in last 2 years? | `leads.product_data.heart_stroke_recent` | `heartStrokeRecent` | Radio | ✅ | Yes / No |
| FM-INS-BUR-007 | Diagnosed with cancer in last 2 years? | `leads.product_data.cancer_recent` | `cancerRecent` | Radio | ✅ | Yes / No |
| FM-INS-BUR-008 | Diagnosed with COPD, emphysema, or on oxygen? | `leads.product_data.copd` | `copd` | Radio | ✅ | Yes / No |
| FM-INS-BUR-009 | Diagnosed with diabetes? | `leads.product_data.diabetes` | `diabetes` | Radio | No | Yes / No — affects rate tier |
| FM-INS-BUR-010 | Beneficiary Full Name | `leads.product_data.beneficiary_name` | `beneficiaryName` | Text Input | ✅ | Full legal name |
| FM-INS-BUR-011 | Beneficiary Relationship | `leads.product_data.beneficiary_relationship` | `beneficiaryRelationship` | Dropdown | ✅ | Spouse / Child / Parent / Sibling / Other |
| FM-INS-BUR-012 | Beneficiary Phone | `leads.product_data.beneficiary_phone` | `beneficiaryPhone` | Phone Input | No | Valid phone format |

**Health question logic:**
- **Preferred rate** (lowest price): No to all questions
- **Standard rate**: Diabetes = Yes, all others No
- **Graded benefit**: Heart/stroke/cancer = Yes → policy pays 30%/70%/100% in years 1/2/3+
- **Decline**: Terminal illness, currently hospitalized, confined to bed

---

## Part 3: Term Life Insurance

**What it is:** Temporary coverage for a set number of years (10, 15, 20, 25, 30). Pays a death benefit if the insured dies during the term. Larger face amounts. Usually requires a medical exam for amounts over $500K.

**Target:** Ages 20–65 with dependents, mortgage, income replacement needs.

### Term Life Eligibility Rules

| Rule | Value |
|---|---|
| Minimum age | 18 |
| Maximum age | 70 |
| Coverage range | $100,000–$5,000,000 |
| Medical exam | Required for >$500,000 (typically) |

### Term Life Insurance Lead Form Fields

| Field ID | Screen Label | DB Location | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|
| FM-INS-TERM-001 | Coverage Amount | `leads.coverage_amount_cents` | `coverageAmountCents` | Dropdown | ✅ | $100K / $250K / $500K / $750K / $1M / $2M / $5M |
| FM-INS-TERM-002 | Term Length | `leads.product_data.term_years` | `termYears` | Radio Group | ✅ | 10 / 15 / 20 / 25 / 30 years |
| FM-INS-TERM-003 | Annual Income | `leads.product_data.annual_income_cents` | `annualIncomeCents` | Dropdown | ✅ | Under $25K / $25K–$50K / $50K–$100K / $100K–$250K / $250K+ |
| FM-INS-TERM-004 | Reason for Coverage | `leads.product_data.coverage_reason` | `coverageReason` | Checkbox Group | No | Income Replacement / Mortgage / Children's Education / Business / Estate Planning / Other |
| FM-INS-TERM-005 | Number of Dependents | `leads.product_data.num_dependents` | `numDependents` | Number Input | No | 0–20 |
| FM-INS-TERM-006 | Height | `leads.product_data.height_inches` | `heightInches` | Two Dropdowns (ft + in) | ✅ | Stored as total inches. Affects BMI calculation. |
| FM-INS-TERM-007 | Weight (lbs) | `leads.product_data.weight_lbs` | `weightLbs` | Number Input | ✅ | Affects BMI → rate classification |
| FM-INS-TERM-008 | Tobacco Use (last 12 months) | `leads.product_data.tobacco_user` | `tobaccoUser` | Radio | ✅ | Yes / No — smoker rates are 2–3× higher |
| FM-INS-TERM-009 | Currently in good health? | `leads.product_data.good_health` | `goodHealth` | Radio | ✅ | Yes / No / Some conditions |
| FM-INS-TERM-010 | Existing health conditions | `leads.product_data.health_conditions` | `healthConditions` | Checkbox Group | No | Diabetes / Heart Disease / Cancer (past 5 years) / High Blood Pressure / High Cholesterol / Depression/Anxiety / Other |
| FM-INS-TERM-011 | Any hospitalizations in past 2 years? | `leads.product_data.recent_hospitalization` | `recentHospitalization` | Radio | ✅ | Yes / No |
| FM-INS-TERM-012 | DUI or reckless driving (past 5 years)? | `leads.product_data.dui_history` | `duiHistory` | Radio | ✅ | Yes / No — affects rate significantly |
| FM-INS-TERM-013 | Hazardous occupation? | `leads.product_data.hazardous_occupation` | `hazardousOccupation` | Radio | No | Yes / No (pilots, miners, loggers, etc.) |
| FM-INS-TERM-014 | Hazardous hobbies? | `leads.product_data.hazardous_hobbies` | `hazardousHobbies` | Checkbox Group | No | Skydiving / Scuba / Racing / Rock Climbing / None |
| FM-INS-TERM-015 | Existing life insurance? | `leads.product_data.existing_coverage_cents` | `existingCoverageCents` | Dropdown | No | None / Under $100K / $100K–$500K / $500K+ |
| FM-INS-TERM-016 | Beneficiary Full Name | `leads.product_data.beneficiary_name` | `beneficiaryName` | Text Input | ✅ | Primary beneficiary |
| FM-INS-TERM-017 | Beneficiary Relationship | `leads.product_data.beneficiary_relationship` | `beneficiaryRelationship` | Dropdown | ✅ | Spouse / Child / Parent / Sibling / Trust / Estate / Other |
| FM-INS-TERM-018 | Beneficiary Date of Birth | `leads.product_data.beneficiary_dob` | `beneficiaryDob` | Date Picker | No | Required for minors |
| FM-INS-TERM-019 | Contingent Beneficiary | `leads.product_data.contingent_beneficiary_name` | `contingentBeneficiaryName` | Text Input | No | Backup if primary dies first |

---

## Part 4: Whole Life Insurance

**What it is:** Permanent life insurance that never expires as long as premiums are paid. Builds cash value over time that can be borrowed against. Higher premiums than term.

**Target:** Ages 0–85. Often used for estate planning, business succession, or as a savings vehicle.

### Whole Life Insurance Lead Form Fields

| Field ID | Screen Label | DB Location | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|
| FM-INS-WHOLE-001 | Coverage Amount | `leads.coverage_amount_cents` | `coverageAmountCents` | Dropdown | ✅ | $10K / $25K / $50K / $100K / $250K / $500K / $1M |
| FM-INS-WHOLE-002 | Primary Purpose | `leads.product_data.primary_purpose` | `primaryPurpose` | Radio Group | ✅ | Final Expenses / Estate Planning / Cash Value Savings / Business Succession / Leave Inheritance |
| FM-INS-WHOLE-003 | Interested in Cash Value? | `leads.product_data.cash_value_interest` | `cashValueInterest` | Radio | No | Yes / No / Tell me more |
| FM-INS-WHOLE-004 | Participating Policy? | `leads.product_data.wants_dividends` | `wantsDividends` | Radio | No | Yes (receives dividends) / No / Not sure |
| FM-INS-WHOLE-005 | Premium Payment Plan | `leads.product_data.payment_plan` | `paymentPlan` | Radio Group | No | Pay to Age 65 / 20-Pay / 10-Pay / Single Premium / Not sure |
| FM-INS-WHOLE-006–019 | (Same health questions as Term Life) | See FM-INS-TERM-008 through 019 | — | — | Same | Underwriting similar to term |

---

## Part 5: Universal / Indexed Universal Life (UL/IUL)

**What it is:** Flexible permanent life insurance. Premiums and death benefit can be adjusted. IUL (Indexed Universal Life) ties cash value growth to a stock market index (e.g., S&P 500) with a floor (0%) and cap (e.g., 12%).

**Target:** Ages 25–65. Often used as a tax-advantaged retirement savings vehicle ("LIRP").

### UL/IUL Additional Fields (on top of Whole Life fields)

| Field ID | Screen Label | DB Location | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|
| FM-INS-UL-001 | Primary Goal | `leads.product_data.ul_primary_goal` | `ulPrimaryGoal` | Radio | ✅ | Tax-Free Retirement Income / Death Benefit / Both Equal / Not Sure |
| FM-INS-UL-002 | Monthly Contribution Budget | `leads.monthly_budget_cents` | `monthlyBudgetCents` | Slider / Input | ✅ | $100–$5,000/month |
| FM-INS-UL-003 | Target Retirement Age | `leads.product_data.target_retirement_age` | `targetRetirementAge` | Number Input | No | |
| FM-INS-UL-004 | Interested in Index-Linked Growth? | `leads.product_data.wants_index_linking` | `wantsIndexLinking` | Radio | No | Yes (IUL) / No (UL) / Explain the difference |
| FM-INS-UL-005 | Risk Tolerance | `leads.product_data.risk_tolerance` | `riskTolerance` | Radio Group | No | Conservative / Moderate / Growth-Oriented |

---

## Part 6: Pet Insurance

**What it is:** Insurance covering veterinary expenses for pets. Covers accidents, illness, and optionally wellness/preventive care.

**Target:** Any pet owner. No age restriction for owner. Pet age and breed affect rates significantly.

### Pet Insurance Lead Form Fields

| Field ID | Screen Label | DB Location | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|
| FM-INS-PET-001 | Pet's Name | `leads.product_data.pet_name` | `petName` | Text Input | ✅ | Shown in all communications: "Quote for Buddy" |
| FM-INS-PET-002 | Species | `leads.product_data.pet_species` | `petSpecies` | Radio Group | ✅ | Dog / Cat / Bird / Rabbit / Reptile / Exotic |
| FM-INS-PET-003 | Breed | `leads.product_data.pet_breed` | `petBreed` | Searchable Dropdown | ✅ | High-risk breeds have higher rates (bulldogs, Great Danes, etc.) |
| FM-INS-PET-004 | Mixed Breed? | `leads.product_data.pet_mixed_breed` | `petMixedBreed` | Checkbox | No | If checked, breed field = dominant breed |
| FM-INS-PET-005 | Age | `leads.product_data.pet_age_years` | `petAgeYears` | Dropdown | ✅ | Under 1 year / 1–3 / 4–6 / 7–9 / 10+ |
| FM-INS-PET-006 | Age (months for puppies/kittens) | `leads.product_data.pet_age_months` | `petAgeMonths` | Dropdown | If under 1 yr | 6–8 weeks / 3 months / 6 months / Under 1 year |
| FM-INS-PET-007 | Gender | `leads.product_data.pet_gender` | `petGender` | Radio | ✅ | Male / Female |
| FM-INS-PET-008 | Spayed or Neutered? | `leads.product_data.pet_spayed_neutered` | `petSpayedNeutered` | Radio | ✅ | Yes / No — affects rates |
| FM-INS-PET-009 | Microchipped? | `leads.product_data.pet_microchipped` | `petMicrochipped` | Radio | No | Yes / No |
| FM-INS-PET-010 | Any pre-existing conditions? | `leads.product_data.pet_preexisting` | `petPreexisting` | Radio | ✅ | Yes / No / Not sure — Pre-existing = excluded |
| FM-INS-PET-011 | Pre-existing condition details | `leads.product_data.pet_preexisting_details` | `petPreexistingDetails` | Textarea | If yes | Free text |
| FM-INS-PET-012 | Primary vet name | `leads.product_data.vet_name` | `vetName` | Text Input | No | |
| FM-INS-PET-013 | Primary vet ZIP code | `leads.product_data.vet_zip` | `vetZip` | Text Input | No | Used for network/reimbursement |
| FM-INS-PET-014 | Coverage Type | `leads.product_data.pet_coverage_type` | `petCoverageType` | Radio Group | ✅ | Accident Only (cheapest) / Accident + Illness / Accident + Illness + Wellness |
| FM-INS-PET-015 | Annual Deductible Preference | `leads.product_data.pet_deductible_cents` | `petDeductibleCents` | Radio Group | No | $100 / $250 / $500 / $1,000 — higher = lower premium |
| FM-INS-PET-016 | Reimbursement Level | `leads.product_data.pet_reimbursement_pct` | `petReimbursementPct` | Radio Group | No | 70% / 80% / 90% of vet bill — higher = higher premium |
| FM-INS-PET-017 | Annual Benefit Limit | `leads.product_data.pet_annual_limit_cents` | `petAnnualLimitCents` | Radio Group | No | $5,000 / $10,000 / $15,000 / Unlimited |
| FM-INS-PET-018 | Number of pets (wanting coverage) | `leads.product_data.num_pets` | `numPets` | Number Input | No | Multi-pet discount available |
| FM-INS-PET-019 | Owner's full name | `leads.first_name` + `leads.last_name` | `firstName`, `lastName` | Text Inputs | ✅ | Same as common fields |
| FM-INS-PET-020 | Owner's ZIP code | `leads.zip_code` | `zipCode` | Text Input | ✅ | Required for location-based rating |

---

## Part 7: Lead Status Flow Diagram (All Products)

```text
Form Submitted
      │
      ▼
  [status: new]
  Lead Score calculated
  Assigned to agent/AI
      │
      ▼
  [status: contacted]  ←── Call/text/email made
      │
      ├─── No response × 7 → [status: unreachable]
      │
      ▼
  [status: qualified]  ←── Age ✅ State licensed ✅ Budget ✅ Health prelim ✅
      │
      ├─── Wrong age/state → [status: disqualified]
      ├─── Not interested → [status: not_interested]
      │
      ▼
  [status: quoted]  ←── Rate/premium generated and shared
      │
      ├─── Chose competitor → [status: lost_competition]
      │
      ▼
  [status: applied]  ←── Application form submitted
      │
      ▼
  [status: underwriting]  ←── Carrier reviewing application
      │
      ├─── Denied → [status: declined]
      │
      ▼
  [status: approved]  ←── Carrier approved
      │
      ▼
  [status: issued]  ◄── Policy in force ✅ Lead becomes Customer
```

---

## Part 8: Quote Calculation Fields (Stored After Quote Generated)

When a quote is generated, these additional fields are stored in `leads`:

| Field | DB Column | What It Holds |
|---|---|---|
| Monthly Premium | `leads.quoted_premium_cents` | e.g., 4500 = $45.00/month |
| Annual Premium | `leads.product_data.quoted_annual_premium_cents` | Monthly × 12 |
| Rate Classification | `leads.product_data.rate_class` | Preferred Plus / Preferred / Standard Plus / Standard / Substandard / Table Rating |
| Carrier Name | `leads.carrier_name` | e.g., "Mutual of Omaha", "AIG", "Banner Life" |
| Quote Valid Until | `leads.product_data.quote_expires_at` | Usually 30 days |
| Quote Reference # | `leads.product_data.quote_reference` | Carrier's quote ID |
