# Generic Partner Field Map Template

**Version:** 1.0.0  
**For:** [PARTNER NAME] Integration  
**Date Prepared:** [DATE]  
**Prepared By:** Audrey Evans / MIDNGHTSAPPHIRE  
**Integration Contact:** [PARTNER CONTACT NAME + EMAIL]  
**Integration Type:** [REST API / CSV Upload / SFTP / EDI X12 / Other]

---

## Section 1: System Overview

**Our System:**

| Property | Value |
|---|---|
| Company | MIDNGHTSAPPHIRE / Revvel |
| Contact | <audrey@midnghtsapphire.com> |
| Database | PostgreSQL 16 |
| API Format | REST / JSON |
| Authentication | Bearer token (JWT) |
| Base URL (Production) | `https://api.[appname].com/v1` |
| Base URL (Staging) | `https://api.staging.[appname].com/v1` |
| Data encoding | UTF-8 |
| Date format | ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`) |
| Money format | Integer cents (e.g., 1999 = $19.99) — divide by 100 to get dollars |
| ID format | UUID v4 (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`) |

---

## Section 2: Field Mapping Table

Replace the example rows below with the actual fields for your partner. Add or remove rows as needed. One row per field.

| # | Partner Field Name | Partner Field Code | Partner Type | Required? | Our DB Table | Our DB Column | Our Frontend Var | Transform Needed | Example Value | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | First Name | `first_name` | String(50) | ✅ Yes | `users` | `first_name` | `firstName` | None | `Audrey` | |
| 2 | Last Name | `last_name` | String(50) | ✅ Yes | `users` | `last_name` | `lastName` | None | `Evans` | |
| 3 | Email Address | `email` | String(255) | ✅ Yes | `users` | `email` | `email` | Lowercase before send | `audrey@example.com` | |
| 4 | Phone Number | `phone` | String(20) | ✅ Yes | `users` | `phone` | `phone` | Digits only, no formatting | `3035551234` | Remove `(`, `)`, `-`, spaces |
| 5 | Date of Birth | `dob` | Date | ✅ Yes | `leads` | `date_of_birth` | `dateOfBirth` | Format as MM/DD/YYYY | `04/06/1985` | Partner may want different format |
| 6 | Street Address | `address1` | String(100) | ✅ Yes | `users` | `address_line1` | `addressLine1` | None | `123 Main St` | |
| 7 | Address Line 2 | `address2` | String(100) | No | `users` | `address_line2` | `addressLine2` | None | `Apt 4B` | |
| 8 | City | `city` | String(50) | ✅ Yes | `users` | `city` | `city` | None | `Denver` | |
| 9 | State | `state` | String(2) | ✅ Yes | `users` | `state` | `state` | 2-letter code | `CO` | |
| 10 | ZIP Code | `zip` | String(10) | ✅ Yes | `users` | `zip_code` | `zipCode` | 5-digit only if partner requires | `80201` | |
| 11 | Social Security Number | `ssn` | String(11) | Conditional | `users` | `tax_id_number_encrypted` | `taxIdNumber` | Decrypt, format as XXX-XX-XXXX | `123-45-6789` | ⚠️ SENSITIVE — HTTPS only, never log |
| 12 | Coverage Amount | `coverage_amount` | Decimal(12,2) | ✅ Yes | `leads` | `coverage_amount_cents` | `coverageAmountCents` | Divide by 100 | `25000.00` | Partner wants dollars, we store cents |
| 13 | Monthly Premium | `monthly_premium` | Decimal(8,2) | If quoted | `leads` | `quoted_premium_cents` | `quotedPremiumCents` | Divide by 100 | `45.00` | |
| 14 | [Add more rows] | | | | | | | | | |

---

## Section 3: Enumerations (Coded Values)

When a field only accepts specific values, list the translation between your system's values and the partner's codes here.

| Field | Our Value | Partner Value | Notes |
|---|---|---|---|
| Gender | `male` | `M` | |
| Gender | `female` | `F` | |
| Gender | `non_binary` | `X` | If partner supports, else `U` = Unknown |
| Gender | `prefer_not_to_say` | `U` | |
| Tax Classification | `individual` | `1` | |
| Tax Classification | `llc` | `2` | |
| Tax Classification | `c_corp` | `3` | |
| Tax Classification | `s_corp` | `4` | |
| Tobacco User | `true` | `Y` | |
| Tobacco User | `false` | `N` | |
| Lead Status | `new` | `00` | Translate as needed per partner |
| Lead Status | `qualified` | `01` | |
| Lead Status | `quoted` | `02` | |
| Lead Status | `applied` | `03` | |
| Lead Status | `issued` | `10` | |
| State | `Colorado` | `CO` | Use 2-letter ISO 3166-2 state codes |
| [Add more] | | | |

---

## Section 4: API Endpoints We Expose to the Partner

If the partner needs to push data TO us (webhook or inbound API), these are our endpoints:

| Action | Method | URL | Auth | Request Body Format | Response |
|---|---|---|---|---|---|
| Create lead | POST | `/api/leads` | Bearer token | JSON | `{id, status, created_at}` |
| Update lead status | PATCH | `/api/leads/:id` | Bearer token | JSON `{status}` | `{id, status, updated_at}` |
| Get quote | POST | `/api/leads/:id/quote` | Bearer token | JSON `{product_type, ...fields}` | `{premium_cents, carrier, expires_at}` |
| Submit application | POST | `/api/leads/:id/apply` | Bearer token | JSON `{...full_application_fields}` | `{application_id, status}` |
| Receive policy issued | POST | `/api/webhooks/[partner-slug]` | HMAC signature | JSON `{policy_number, ...}` | `200 OK` |

---

## Section 5: Sample Payload

This is an example of the JSON object we send to the partner for a [PRODUCT TYPE] application:

```json
{
  "applicant": {
    "first_name": "Audrey",
    "last_name": "Evans",
    "email": "audrey@example.com",
    "phone": "3035551234",
    "dob": "04/06/1968",
    "gender": "F",
    "tobacco": "N",
    "address1": "123 Main St",
    "city": "Denver",
    "state": "CO",
    "zip": "80201"
  },
  "coverage": {
    "product_type": "burial_insurance",
    "coverage_amount": 15000.00,
    "monthly_budget": 75.00
  },
  "health": {
    "currently_hospitalized": "N",
    "confined_to_bed": "N",
    "terminal_illness": "N",
    "heart_stroke_recent": "N",
    "cancer_recent": "N",
    "copd": "N",
    "diabetes": "N"
  },
  "beneficiary": {
    "name": "Marcus Evans",
    "relationship": "Child"
  },
  "consent": {
    "tcpa_consent": true,
    "consent_timestamp": "2026-04-06T20:00:00Z",
    "consent_ip": "192.168.1.1"
  },
  "attribution": {
    "utm_source": "facebook",
    "utm_campaign": "burial_spring_2026",
    "referral_code": null
  }
}
```

---

## Section 6: Error Codes

When the partner's API returns an error, these are the known codes and how to handle them:

| Error Code | Meaning | Our Response |
|---|---|---|
| `INVALID_STATE` | Not licensed in that state | Show "Not available in your state" UI message |
| `AGE_OUT_OF_RANGE` | Applicant too young or too old | Show age eligibility message |
| `DUPLICATE_APPLICATION` | Already applied | Show "Application already exists" |
| `MISSING_REQUIRED_FIELD` | Required field blank | Highlight the field in the form |
| `INVALID_TIN` | SSN/EIN format wrong | Re-prompt for correct format |
| `UNDERWRITING_DECLINED` | Health disqualified | Show "We're sorry, you don't qualify" message |
| [Add partner-specific codes] | | |

---

## Section 7: Testing

Before going live, test with these sample values:

| Field | Test Value |
|---|---|
| First Name | `Test` |
| Last Name | `User` |
| Email | `test@revvel-test.com` |
| Phone | `5555550100` |
| DOB | `01/01/1960` (for burial: age 66 ✅) |
| SSN | `900-00-0001` (IRS test SSN) |
| Coverage | `$10,000` |
| State | Use a state where test mode is confirmed |

**Never test with real SSNs, real payment amounts, or real policy numbers.**

---

## Section 8: Go-Live Checklist

- [ ] Partner has confirmed test credentials work
- [ ] All required fields in Section 2 are mapped
- [ ] All enumeration translations in Section 3 confirmed with partner
- [ ] Sample payload (Section 5) validated by partner
- [ ] Error handling for all codes in Section 6 implemented in UI
- [ ] Consent language approved by legal
- [ ] HTTPS enforced on all endpoints
- [ ] Partner DPA (Data Processing Agreement) signed
- [ ] Production credentials stored in HashiCorp Vault (not in code)
- [ ] Webhook endpoint secured with HMAC signature validation
- [ ] Go-live date agreed with partner
