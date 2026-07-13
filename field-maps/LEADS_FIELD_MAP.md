# General Leads Field Map

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Developers, AI agents, QA, non-technical staff  
**Purpose:** Maps every field on every lead capture form — UI label → variable name → database column → validation rule

---

## Section 1: Lead Capture Form (Universal — All Products)

This is the standard short-form lead capture used on landing pages and ads. Collects minimal info to qualify and contact the lead. Full product-specific questions come after first contact.

| Field ID | Screen | Label (What User Sees) | DB Table | DB Column | Frontend Var | Component Type | Required | Validation | Placeholder | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| FM-LEAD-001 | Lead Capture Form | First Name | `leads` | `first_name` | `firstName` | Text Input | ✅ | 1–100 chars | `Jane` | |
| FM-LEAD-002 | Lead Capture Form | Last Name | `leads` | `last_name` | `lastName` | Text Input | ✅ | 1–100 chars | `Smith` | |
| FM-LEAD-003 | Lead Capture Form | Phone Number | `leads` | `phone` | `phone` | Phone Input | ✅ | 10-digit US | `(303) 555-0100` | Primary contact method |
| FM-LEAD-004 | Lead Capture Form | Email Address | `leads` | `email` | `email` | Email Input | No | Valid email | `jane@example.com` | Optional on short form |
| FM-LEAD-005 | Lead Capture Form | ZIP Code | `leads` | `zip_code` | `zipCode` | Text Input | ✅ | 5 digits | `80201` | Auto-fills state |
| FM-LEAD-006 | Lead Capture Form | State | `leads` | `state` | `state` | Dropdown (auto) | ✅ | Licensed states only | — | Blocked if not licensed |
| FM-LEAD-007 | Lead Capture Form | Date of Birth | `leads` | `date_of_birth` | `dateOfBirth` | Date Picker | ✅ | Valid date, age per product | `MM/DD/YYYY` | Used for instant rate estimate |
| FM-LEAD-008 | Lead Capture Form | I consent to be contacted | `leads` | `consented_to_contact` | `consentedToContact` | Checkbox | ✅ | Must be true | — | TCPA required. Blocks submit if false. |
| FM-LEAD-009 | Lead Capture Form | (hidden) UTM Source | `leads` | `utm_source` | `utmSource` | Hidden | Auto | Set from URL params | — | e.g., `facebook` |
| FM-LEAD-010 | Lead Capture Form | (hidden) UTM Campaign | `leads` | `utm_campaign` | `utmCampaign` | Hidden | Auto | Set from URL params | — | e.g., `burial_spring_2026` |
| FM-LEAD-011 | Lead Capture Form | (hidden) Landing Page | `leads` | `landing_page_url` | `landingPageUrl` | Hidden | Auto | Full URL | — | |
| FM-LEAD-012 | Lead Capture Form | (hidden) Lead Source | `leads` | `lead_source` | `leadSource` | Hidden | Auto | Derived from UTM | — | `facebook_ad`, `organic`, etc. |
| FM-LEAD-013 | Lead Capture Form | (hidden) Referral Code | `leads` | `referral_code` | `referralCode` | Hidden | Auto | From `?ref=` param | — | Affiliate tracking |
| FM-LEAD-014 | Lead Capture Form | (hidden) Consent IP | `leads` | `consent_ip_address` | `consentIpAddress` | Hidden | Auto | Set server-side | — | TCPA compliance |
| FM-LEAD-015 | Lead Capture Form | (hidden) Consent Timestamp | `leads` | `consent_timestamp` | `consentTimestamp` | Hidden | Auto | Set server-side | — | TCPA compliance |
| FM-LEAD-016 | Lead Capture Form | TTY / Relay needed? | `leads` | `requires_tty` | `requiresTty` | Checkbox | No | boolean | — | Shows below consent. For deaf/HoH users. |

---

## Section 2: Lead Detail Page (CRM View — Agent/Admin Sees This)

This is what the agent or admin sees when they open a lead record. All fields are editable unless marked read-only.

| Field ID | Screen | Label | DB Table | DB Column | Frontend Var | Component | Editable? | Notes |
|---|---|---|---|---|---|---|---|---|
| FM-LEAD-100 | Lead Detail | Lead ID | `leads` | `id` | `leadId` | Read-only text | No | First 8 chars shown |
| FM-LEAD-101 | Lead Detail | First Name | `leads` | `first_name` | `firstName` | Text Input | ✅ | |
| FM-LEAD-102 | Lead Detail | Last Name | `leads` | `last_name` | `lastName` | Text Input | ✅ | |
| FM-LEAD-103 | Lead Detail | Phone | `leads` | `phone` | `phone` | Phone Input | ✅ | Click-to-call |
| FM-LEAD-104 | Lead Detail | Alternative Phone | `leads` | `alt_phone` | `altPhone` | Phone Input | ✅ | |
| FM-LEAD-105 | Lead Detail | Email | `leads` | `email` | `email` | Email Input | ✅ | |
| FM-LEAD-106 | Lead Detail | Date of Birth | `leads` | `date_of_birth` | `dateOfBirth` | Date Picker | ✅ | |
| FM-LEAD-107 | Lead Detail | Age | `leads` | `age` | `age` | Read-only number | No | Auto-calculated from DOB |
| FM-LEAD-108 | Lead Detail | Gender | `leads` | `gender` | `gender` | Dropdown | ✅ | |
| FM-LEAD-109 | Lead Detail | Address | `leads` | `address_line1` | `addressLine1` | Text Input | ✅ | |
| FM-LEAD-110 | Lead Detail | City | `leads` | `city` | `city` | Text Input | ✅ | |
| FM-LEAD-111 | Lead Detail | State | `leads` | `state` | `state` | Dropdown | ✅ | |
| FM-LEAD-112 | Lead Detail | ZIP Code | `leads` | `zip_code` | `zipCode` | Text Input | ✅ | |
| FM-LEAD-113 | Lead Detail | Status | `leads` | `status` | `status` | Dropdown | ✅ | new / contacted / qualified / quoted / applied / issued / etc. |
| FM-LEAD-114 | Lead Detail | Product Type | `leads` | `product_type` | `productType` | Dropdown | ✅ | burial_insurance / term_life / whole_life / pet_insurance |
| FM-LEAD-115 | Lead Detail | Lead Score | `leads` | `lead_score` | `leadScore` | Read-only badge | No | 0–100, color-coded |
| FM-LEAD-116 | Lead Detail | Priority | `leads` | `priority` | `priority` | Dropdown | ✅ | hot / warm / normal / cold |
| FM-LEAD-117 | Lead Detail | Assigned To | `leads` | `assigned_to` | `assignedTo` | Agent Dropdown | ✅ | Assigns to agent or AI |
| FM-LEAD-118 | Lead Detail | Preferred Contact | `leads` | `preferred_contact` | `preferredContact` | Dropdown | ✅ | phone / text / email / tty |
| FM-LEAD-119 | Lead Detail | Best Time to Call | `leads` | `best_time_to_call` | `bestTimeToCall` | Dropdown | ✅ | morning / afternoon / evening / anytime |
| FM-LEAD-120 | Lead Detail | TTY Required | `leads` | `requires_tty` | `requiresTty` | Toggle | ✅ | Shows TTY badge if true |
| FM-LEAD-121 | Lead Detail | Preferred Language | `leads` | `preferred_language` | `preferredLanguage` | Dropdown | ✅ | en / es / fr / other |
| FM-LEAD-122 | Lead Detail | Coverage Desired | `leads` | `coverage_amount_cents` | `coverageAmountCents` | Currency Input | ✅ | Stored as cents, displayed as $ |
| FM-LEAD-123 | Lead Detail | Monthly Budget | `leads` | `monthly_budget_cents` | `monthlyBudgetCents` | Currency Input | ✅ | Stored as cents |
| FM-LEAD-124 | Lead Detail | Quoted Premium | `leads` | `quoted_premium_cents` | `quotedPremiumCents` | Read-only currency | No | Set by quote system |
| FM-LEAD-125 | Lead Detail | Carrier | `leads` | `carrier_name` | `carrierName` | Text Input | ✅ | Insurance carrier offering the quote |
| FM-LEAD-126 | Lead Detail | Policy Number | `leads` | `policy_number` | `policyNumber` | Text Input | ✅ | After policy issued |
| FM-LEAD-127 | Lead Detail | Lead Source | `leads` | `lead_source` | `leadSource` | Read-only text | No | Where they came from |
| FM-LEAD-128 | Lead Detail | UTM Campaign | `leads` | `utm_campaign` | `utmCampaign` | Read-only text | No | |
| FM-LEAD-129 | Lead Detail | Internal Notes | `leads` | `internal_notes` | `internalNotes` | Textarea | ✅ | Never shown to lead |
| FM-LEAD-130 | Lead Detail | Next Follow-Up | `leads` | `next_followup_at` | `nextFollowupAt` | Date+Time Picker | ✅ | Schedules reminder |
| FM-LEAD-131 | Lead Detail | Contact Attempts | `leads` | `contact_attempts` | `contactAttempts` | Read-only number | No | Increments on each attempt |
| FM-LEAD-132 | Lead Detail | Last Contacted | `leads` | `last_contacted_at` | `lastContactedAt` | Read-only datetime | No | |
| FM-LEAD-133 | Lead Detail | Created | `leads` | `created_at` | `createdAt` | Read-only datetime | No | |
| FM-LEAD-134 | Lead Detail | TCPA Consent | `leads` | `consented_to_contact` | `consentedToContact` | Read-only badge | No | ✅ Consented / ❌ Not consented |
| FM-LEAD-135 | Lead Detail | Consent Given | `leads` | `consent_timestamp` | `consentTimestamp` | Read-only datetime | No | |

---

## Section 3: Lead List / Pipeline Board (Admin/Agent CRM View)

The pipeline view shows leads as cards in columns, one column per status stage.

| Field ID | Screen | Label | DB Source | Display Format | Notes |
|---|---|---|---|---|---|
| FM-LEAD-200 | Pipeline Board | Name | `first_name + ' ' + last_name` | Card title | |
| FM-LEAD-201 | Pipeline Board | Phone | `leads.phone` | Formatted: (303) 555-0100 | Click-to-call |
| FM-LEAD-202 | Pipeline Board | Age | `leads.age` | `Age 67` | |
| FM-LEAD-203 | Pipeline Board | Product | `leads.product_type` | Badge: "Burial" / "Term Life" / etc. | |
| FM-LEAD-204 | Pipeline Board | Score | `leads.lead_score` | 0–100 color badge: 🔴 hot / 🟡 warm / 🟢 cold | |
| FM-LEAD-205 | Pipeline Board | Source | `leads.lead_source` | Icon: Facebook / TikTok / Google / etc. | |
| FM-LEAD-206 | Pipeline Board | TTY | `leads.requires_tty` | TTY badge if true | |
| FM-LEAD-207 | Pipeline Board | Next Follow-Up | `leads.next_followup_at` | Relative: "in 2 hours" / "Overdue" | Red if past due |
| FM-LEAD-208 | Pipeline Board | Days in Stage | Computed | `3 days` | Today - date entered current stage |
| FM-LEAD-209 | Pipeline Board | Assigned To | `users.first_name` (via assigned_to) | Agent avatar + name | |

---

## Section 4: Lead Activity Feed (Timeline)

Below every lead detail, a chronological feed of all actions taken.

| Field ID | Screen | Label | DB Table | DB Column | Display Format |
|---|---|---|---|---|---|
| FM-LEAD-300 | Activity Feed | Activity Type | `lead_activities` | `activity_type` | Icon + text: 📞 Call Made / ✉️ Email Sent / 💬 SMS Sent / 📝 Note Added |
| FM-LEAD-301 | Activity Feed | Date/Time | `lead_activities` | `created_at` | Relative + absolute: "2 hours ago (Apr 6, 2026 6:34 PM)" |
| FM-LEAD-302 | Activity Feed | Performed By | `users` via `performed_by` | `first_name` | Agent name or "System" |
| FM-LEAD-303 | Activity Feed | Notes | `lead_activities` | `notes` | Free text |
| FM-LEAD-304 | Activity Feed | Stage Change | `lead_activities` | `metadata.from_status` → `metadata.to_status` | "New → Contacted" |

---

## Section 5: Lead Metrics Dashboard (Admin View)

| Field ID | Screen | Metric Label | Source Query | Display |
|---|---|---|---|---|
| FM-LEAD-400 | Lead Dashboard | Total Leads Today | `COUNT(*) WHERE DATE(created_at) = today` | Number |
| FM-LEAD-401 | Lead Dashboard | Hot Leads | `COUNT(*) WHERE lead_score >= 70` | Number + 🔴 |
| FM-LEAD-402 | Lead Dashboard | Conversion Rate | `COUNT(status='issued') / COUNT(*) × 100` | `%` |
| FM-LEAD-403 | Lead Dashboard | Avg Response Time | `AVG(first_contact_at - created_at)` | Minutes |
| FM-LEAD-404 | Lead Dashboard | Leads by Source | Grouped by `lead_source` | Bar chart |
| FM-LEAD-405 | Lead Dashboard | Pipeline by Stage | Grouped by `status` | Funnel chart |
| FM-LEAD-406 | Lead Dashboard | Leads by Product | Grouped by `product_type` | Pie chart |
| FM-LEAD-407 | Lead Dashboard | TTY Leads | `COUNT(*) WHERE requires_tty = true` | Number |
| FM-LEAD-408 | Lead Dashboard | Overdue Follow-Ups | `COUNT(*) WHERE next_followup_at < NOW() AND status NOT IN ('issued','lost','disqualified')` | Number + 🚨 |
