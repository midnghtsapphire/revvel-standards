# Leads Management Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Applies To:** Any Revvel application that captures, tracks, or works leads toward a sale

---

## 1. What Is a Lead

A **lead** is any person who has expressed interest in a product or service but has not yet purchased. A lead has a lifecycle — they move through stages from first contact to closed deal (or lost).

A lead is different from a customer:

| | Lead | Customer |
|---|---|---|
| **Has purchased?** | No | Yes |
| **DB Table** | `leads` | `users` + `orders` |
| **Primary goal** | Move to next stage | Retain and upsell |
| **Primary action** | Follow up / qualify | Fulfill / support |

When a lead purchases, they become a customer. Their lead record stays in the `leads` table (for attribution), and a `users` row is created.

---

## 2. Lead Pipeline Stages

Every lead is always in exactly one stage. Stages are ordered — leads move forward (or are lost/disqualified).

```text
NEW → CONTACTED → QUALIFIED → QUOTED → APPLIED → APPROVED → ISSUED
                                              ↓
                                           DECLINED
       ↓            ↓          ↓
    UNREACHABLE  NOT_INTERESTED  LOST_TO_COMPETITION
```

| Stage | Code | Meaning | Who Moves It |
|---|---|---|---|
| **New** | `new` | Just captured. Not yet contacted. | System (auto on form submit) |
| **Contacted** | `contacted` | First outreach made (call, email, text). | Agent / AI agent |
| **Qualified** | `qualified` | Confirmed interest + meets basic eligibility (age, state, budget). | Agent / AI agent |
| **Quoted** | `quoted` | Received a rate quote. Considering. | System (auto after quote generated) |
| **Applied** | `applied` | Submitted an application. | System (auto on app submit) |
| **Underwriting** | `underwriting` | Application under review by carrier. | System / Agent |
| **Approved** | `approved` | Carrier approved the application. | System (carrier webhook) |
| **Issued** | `issued` | Policy is in force. Lead → Customer. | System (carrier webhook) |
| **Declined** | `declined` | Carrier denied the application. | System / Agent |
| **Not Interested** | `not_interested` | Lead confirmed they do not want the product. | Agent |
| **Unreachable** | `unreachable` | 5+ contact attempts, no response. | Agent (after attempt limit) |
| **Lost to Competition** | `lost_competition` | Went with another provider. | Agent |
| **Disqualified** | `disqualified` | Does not meet eligibility (wrong age, state not licensed, etc.). | Agent / System |

---

## 3. Core Lead Database Schema

```sql
-- leads table: one row per lead
leads:
  id                    UUID PK
  -- Contact info
  first_name            VARCHAR(100)  NOT NULL
  last_name             VARCHAR(100)  NOT NULL
  email                 VARCHAR(255)
  phone                 VARCHAR(20)   NOT NULL  -- Primary contact method
  phone_type            VARCHAR(20)   -- 'mobile', 'home', 'work'
  alt_phone             VARCHAR(20)   -- Secondary phone
  preferred_contact     VARCHAR(20)   -- 'phone', 'text', 'email'
  best_time_to_call     VARCHAR(50)   -- 'morning', 'afternoon', 'evening', 'anytime'
  -- Demographics
  date_of_birth         DATE
  age                   INTEGER       -- Computed from DOB or entered directly
  gender                VARCHAR(20)   -- 'male', 'female', 'non_binary', 'prefer_not_to_say'
  state                 VARCHAR(2)    -- 2-letter state code. CRITICAL for insurance licensing.
  city                  VARCHAR(100)
  zip_code              VARCHAR(10)
  address_line1         VARCHAR(255)
  -- Lead management
  status                VARCHAR(50)   NOT NULL DEFAULT 'new'
  product_type          VARCHAR(100)  NOT NULL  -- 'burial_insurance', 'term_life', 'whole_life', 'pet_insurance', etc.
  assigned_to           UUID FK→users -- Which agent/AI handles this lead
  priority              VARCHAR(20)   DEFAULT 'normal'  -- 'hot', 'warm', 'normal', 'cold'
  lead_score            INTEGER       DEFAULT 0  -- 0-100 AI-calculated score
  -- Attribution / source
  lead_source           VARCHAR(100)  -- 'facebook_ad', 'google_search', 'tiktok', 'referral', 'organic', 'email'
  utm_source            VARCHAR(255)
  utm_medium            VARCHAR(255)
  utm_campaign          VARCHAR(255)
  utm_content           VARCHAR(255)
  referral_code         VARCHAR(50)   -- Affiliate code if referred
  landing_page_url      TEXT          -- Which page they filled the form on
  -- Product interest
  coverage_amount_cents INTEGER       -- How much coverage they want
  monthly_budget_cents  INTEGER       -- What they can afford per month
  -- Communication consent (TCPA compliance — REQUIRED)
  consented_to_contact  BOOLEAN       NOT NULL DEFAULT false
  consent_timestamp     TIMESTAMP     -- When they gave consent
  consent_ip_address    VARCHAR(45)   -- Their IP when they consented
  consent_text          TEXT          -- Exact consent language shown to them
  tcpa_opt_in           BOOLEAN       DEFAULT false  -- Explicit SMS/call consent
  -- TTY / Accessibility
  requires_tty          BOOLEAN       DEFAULT false  -- Deaf/hard of hearing, needs TTY contact
  preferred_language    VARCHAR(10)   DEFAULT 'en'   -- 'en', 'es', 'fr', etc.
  accessibility_notes   TEXT          -- Any specific accommodation needs
  -- Follow-up tracking
  last_contacted_at     TIMESTAMP
  next_followup_at      TIMESTAMP
  contact_attempts      INTEGER       DEFAULT 0
  -- Outcome
  quoted_premium_cents  INTEGER       -- Monthly premium quoted
  policy_number         VARCHAR(100)  -- If issued, the policy number
  carrier_name          VARCHAR(255)  -- Which insurance carrier
  -- Product-specific data (stored as JSONB for flexibility)
  product_data          JSONB         -- All product-specific fields (see INSURANCE_LEADS_FIELD_MAP.md)
  -- Notes
  internal_notes        TEXT          -- Agent notes. Never shown to lead.
  -- Standard audit fields
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW()
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW()
  deleted_at            TIMESTAMP     -- Soft delete
```

---

## 4. Lead Activity Log

Every action taken on a lead is recorded. This is separate from `audit_logs` — it's the full conversation history.

```sql
lead_activities:
  id              UUID PK
  lead_id         UUID FK→leads
  activity_type   VARCHAR(50)  -- see table below
  performed_by    UUID FK→users  -- agent, AI, or system
  notes           TEXT
  metadata        JSONB   -- call duration, email subject, etc.
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
```

| Activity Type | Code | Triggered By |
|---|---|---|
| Lead created | `lead_created` | System |
| Stage changed | `stage_changed` | Agent / System |
| Call made | `call_made` | Agent |
| Call received | `call_received` | Agent |
| SMS sent | `sms_sent` | Agent / System |
| SMS received | `sms_received` | System |
| Email sent | `email_sent` | Agent / System |
| Email opened | `email_opened` | System (tracking pixel) |
| Email clicked | `email_clicked` | System |
| Quote generated | `quote_generated` | System |
| Application started | `application_started` | Lead / System |
| Application submitted | `application_submitted` | Lead / System |
| Note added | `note_added` | Agent |
| Document uploaded | `document_uploaded` | Lead / Agent |
| TTY contact made | `tty_contact` | Agent (via TTY relay) |

---

## 5. TCPA Compliance — MANDATORY

The **Telephone Consumer Protection Act (TCPA)** is federal law. Violating it = fines of **$500–$1,500 per call or text**. This is not optional.

### What You Must Do

| Requirement | How to Meet It |
|---|---|
| Get explicit consent before calling/texting | Consent checkbox on every lead form |
| Record what consent language was shown | Store `consent_text` in `leads` table |
| Record when and from what IP consent was given | Store `consent_timestamp` and `consent_ip_address` |
| Honor opt-outs immediately | Remove from all contact lists within minutes |
| No calls before 8am or after 9pm local time | Check `leads.state` timezone before scheduling |
| Identify yourself on every call | "Hi, this is [Name] from [Company]…" |
| Provide opt-out on every text | "Reply STOP to opt out" |

### Consent Language (Copy-Paste This Exactly)

Place this below every lead capture form submit button:

> *By clicking "Get My Free Quote," you agree to receive calls, texts, and emails from [Company Name] and its partners at the number and email provided, including by autodialer. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out. [Privacy Policy] | [Terms of Service]*

### Do-Not-Call Registry

Check the National Do Not Call Registry before contacting any lead:
- API: `https://donotcall.gov` (commercial API access required for businesses)
- Check frequency: Before every outbound call, or at minimum on lead creation

---

## 6. Lead Scoring

Leads are automatically scored 0–100 based on signals. Higher score = hotter lead = contact first.

| Signal | Points Added | Reason |
|---|---|---|
| Provided phone (not just email) | +20 | Phone leads close at higher rates |
| Correct age for product | +15 | In-range leads are qualified |
| State where we are licensed | +15 | Can't sell if not licensed there |
| Answered health questions | +10 | Shows real intent |
| Came from paid ad (high-intent) | +10 | Paid traffic is warmer |
| Came from organic search | +8 | High intent, low cost |
| Filled all fields (vs partial) | +10 | More complete = more serious |
| Budget matches product range | +10 | Can afford it |
| Responded to first contact | +15 | Engaged lead |
| Referred by affiliate | +5 | Warm introduction |

**Thresholds:**
- 70–100 → 🔴 Hot — contact within 1 hour
- 40–69 → 🟡 Warm — contact within 24 hours
- 0–39 → 🟢 Cold — contact within 72 hours, automate follow-up

---

## 7. Follow-Up Cadence (Mandatory)

Never leave a lead without a next step. The system auto-schedules follow-ups.

| Attempt | Timing | Method |
|---|---|---|
| 1st contact | Within 5 minutes of form submit | Call |
| 2nd attempt | 1 hour later (if no answer) | Call + SMS |
| 3rd attempt | Next day, morning | Call |
| 4th attempt | 2 days later | Email + Call |
| 5th attempt | 5 days later | SMS + Email |
| 6th attempt | 14 days later | Email |
| Final | 30 days later | Email ("Last chance") |
| After 7 attempts no response | Mark `unreachable` | Stop outreach |

---

## 8. State Licensing Compliance

**You must be licensed to sell insurance in every state where you accept leads.**  
The app must check `leads.state` against a list of licensed states and reject leads from unlicensed states with a friendly message.

```ts
// lib/insurance-licensing.ts
export const LICENSED_STATES = ['CO', 'CA', 'TX', 'FL', 'NY']; // Update as you get licensed

export function isLicensedInState(stateCode: string): boolean {
  return LICENSED_STATES.includes(stateCode.toUpperCase());
}
```

If a lead submits from an unlicensed state:
- Do NOT store their data in `leads`
- Show: *"We're not yet licensed in [State]. Enter your email to be notified when we launch there."*
- Store email only in a `waitlist` table — never contact them about insurance until licensed

---

## 9. Lead Sources and Attribution

| Source Code | Where Lead Came From | UTM Source |
|---|---|---|
| `facebook_ad` | Facebook/Instagram paid ad | `facebook` |
| `tiktok_ad` | TikTok paid ad | `tiktok` |
| `google_search` | Google organic result | `google` |
| `google_ad` | Google paid ad | `google` |
| `referral` | Affiliate referral | affiliate code |
| `organic_social` | Unpaid social post | platform name |
| `email_campaign` | Newsletter or email | `email` |
| `direct` | Typed URL directly | (none) |
| `partner` | From a partner integration | partner name |
| `phone_inbound` | Called in (no form) | `phone` |
| `tty_inbound` | TTY relay call | `tty` |

---

## 10. TTY / Deaf and Hard of Hearing Leads

The **Americans with Disabilities Act (ADA)** and **Section 504 of the Rehabilitation Act** require insurance companies to provide equal access to deaf and hard of hearing individuals.

### What TTY Means

**TTY** (TeleTypewriter) / **TDD** (Telecommunications Device for the Deaf) is a device that lets deaf or hard of hearing people communicate over phone lines using typed text. Instead of speaking, both parties type back and forth through a relay operator or direct TTY connection.

### What Your App Must Do

| Requirement | Implementation |
|---|---|
| Display TTY number on all contact pages | Add TTY number field to company settings |
| Allow leads to identify as needing TTY | `leads.requires_tty` checkbox on forms |
| Tag TTY leads in the pipeline | `leads.preferred_contact = 'tty'` |
| Train agents on TTY relay calls | Via TTY relay service (711 nationwide) |
| App UI must be screen-reader accessible | WCAG 2.1 AA minimum (see `ACCESSIBILITY_STANDARD.md`) |
| All lead forms keyboard-navigable | No mouse required for any step |
| All required fields have ARIA labels | For screen reader compatibility |

### How to Call a TTY Lead

1. Dial 711 (nationwide TTY relay service — free)
2. Tell the relay operator the number to call
3. The relay operator types your words to the TTY user and reads their typed responses back to you
4. Note in `lead_activities`: `activity_type: 'tty_contact'`

### TTY Display on Your Lead Forms

Add this to every lead capture form footer:
> *Deaf or hard of hearing? Call our TTY line: 1-800-XXX-XXXX | Or check the box below and we will contact you via TTY relay.*

---

## 11. Lead Form Field Map (General — All Products)

See `docs/field-maps/LEADS_FIELD_MAP.md` for the complete UI-to-database field mapping for all lead forms, and `docs/field-maps/INSURANCE_LEADS_FIELD_MAP.md` for insurance product-specific fields.
