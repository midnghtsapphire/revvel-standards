# WR: [WR] Research to use for life insurance leadshttps://github.com/serumwriter/life-insurance-crm

**Issue:** #13764  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-24  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Research Complete

---

## ⚡ Pre-flight: Autonomous Research Defaults

- [x] Investigated referenced repository and selected a high-value product wedge
- [x] Documented SEO/marketing keywords and commercial path
- [x] Included GitHub traction signal (stars/activity) for referenced tool
- [x] Included compliance constraints for outreach automation
- [x] Included product/output selections
- [x] Included Artifact Engine Map
- [x] Included Agent Self-Healing Journal

---

## Executive Summary

The requested source repo (`serumwriter/life-insurance-crm`) is a very early-stage Python CRM skeleton (0 stars, single-day activity window) and should be treated as a seed implementation rather than a complete product. The highest-value wedge is to ship a **compliance-first life-insurance lead ops app**: lead intake + dedupe + outreach gating (TCPA/DNC/CAN-SPAM) + agent workflow visibility. This aligns with revvel goals by creating a monetizable production app surface (subscription CRM + lead routing) instead of only static research artifacts.

---

## Step 1: Repository Discovery (Referenced Repo)

| Property | Value |
| --- | --- |
| Repository | [serumwriter/life-insurance-crm](https://github.com/serumwriter/life-insurance-crm) |
| Description | "Standalone Python CRM for leads & calling" |
| Primary Language | Python |
| Stars | 0 |
| Forks | 0 |
| Open Issues | 0 |
| Created | 2025-12-18 |
| Last Push | 2025-12-18 |
| Activity signal | Early prototype / low external traction |

**Implementation correction applied:** The WR prompt is sparse, so direction is derived from the source repo's proven asset (insurance-lead CRM concept) and converted into a production wedge: compliance-gated lead operations.

---

## Step 2: Market, SEO, and Commercial Signals

### Primary SEO keywords

- life insurance leads
- life insurance CRM
- exclusive insurance leads
- insurance lead management
- insurance sales automation

### Long-tail keywords

- best CRM for life insurance agents
- shared vs exclusive life insurance leads
- TCPA compliant insurance lead workflow
- life insurance lead follow up automation
- life insurance lead distribution software

### Commercial mechanics and pricing signal

- Shared insurance leads are commonly marketed around **$20-$40/lead**.
- Exclusive insurance leads are commonly marketed around **$75-$150/lead**.
- High-intent real-time exclusive leads are often higher than those ranges.

### Monetization path (recommended)

1. **Core SaaS**: per-agent CRM/workflow subscription (`$99-$299/month` tiers).
2. **Lead operations add-on**: per-seat compliance workflow + audit exports.
3. **Premium lane**: exclusive lead routing and SLA-backed speed-to-lead module.

### Distribution channel fit

- Organic SEO for intent keywords above
- Agent community distribution (insurance broker groups, B2B outbound)
- Product-led demo funnel with "upload leads + compliance audit" trial

---

## Step 3: Production-App Build Direction (single pass)

### Product wedge to implement

Build a **Life Insurance Lead Operations App** that includes:

1. Lead intake (CSV/API/manual)
2. Dedupe + assignment queue
3. Outreach compliance gate before call/text/email
4. Agent dashboard for pipeline and contact outcomes
5. Admin panel for policy rules + audit trails

### Suggested architecture for revvel implementation

- **API/backend:** Python service (preserves source-repo stack compatibility)
- **Website/UI:** Next.js app in `products/` for operator + admin workflows
- **Data:** Postgres for leads, events, consent records, suppression status
- **Automation:** GitHub Actions for scheduled imports, QA checks, reporting jobs
- **Deployment target:** Vercel (UI) + DigitalOcean runtime for backend jobs (documented default)

### Definition of done for this WR

- Research packet finalized (this file)
- Product shape and monetization path selected
- Compliance and architecture guardrails defined
- Artifact engine ownership mapped for implementation

---

## Step 4: Compliance Guardrails

Minimum enforced controls for outreach:

- Enforce TCPA calling-hour and consent-aware outreach policies.
- Scrub and honor National DNC requirements before outbound contact.
- Enforce CAN-SPAM sender identity + opt-out handling for email workflows.
- Persist consent evidence, source metadata, and decision audit logs per lead event.

---

## Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | Yes | Production app | `products/` + Vercel deployment standard | Agent + admin surfaces |
| API | Yes | REST | Python backend service pattern | Lead ingestion, workflow, audit |
| CLI | No | N/A | N/A | Not required for this WR |
| MCP | No | N/A | N/A | Optional later for tooling ops |
| Skill | No | N/A | N/A | Not required |
| PDF | Optional | Audit export PDF | Existing PDF engine standards | Compliance/export artifact |
| PowerPoint / deck | No | N/A | N/A | Not required |
| Video | No | N/A | N/A | Not required |
| Docs | Yes | WR + implementation docs | `wr/issues/` + docs standards | Required |
| Agent automation | Yes | Workflows/jobs | `.github/workflows/` patterns | Import, QA, and reporting |

### Platform Defaults & Website Requirements

- **Website in Test:** Gap (to be provisioned on Vercel during implementation)
- **Integration runtime:** DigitalOcean default for backend/integration jobs
- **Admin surface:** Required
- **User auth:** Required (Google/GitHub minimum; Apple optional per market)

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | revvel product app pattern in `products/` | Exists | Create `products/life-insurance-crm` app |
| API | Source repo Python orientation + revvel backend conventions | Partial | Implement lead/workflow/audit endpoints |
| CLI | None selected | N/A | No action |
| MCP | Optional future | Gap | Defer unless integration requires tool surface |
| Skill | None selected | N/A | No action |
| PDF | Existing PDF standards in repo | Exists | Add compliance/audit export template if required |
| Deck | None selected | N/A | No action |
| Video | None selected | N/A | No action |
| Docs | WR docs under `wr/issues/` | Exists | Keep implementation log + deployment notes |
| Agent automation | GitHub Actions workflows | Exists | Add scheduled import/compliance/report jobs |

---

## Agent Self-Healing Journal

1. **What was wrong:** WR prompt contained minimal detail and no implementation boundaries.
2. **What was researched/corrected:** Converted the request into a concrete product wedge based on the referenced repo's strongest asset (insurance CRM intent), then added missing SEO, monetization, compliance, and artifact mapping requirements required by revvel standards.
3. **What should be institutionalized:** Keep auto-generated WR packets from shipping with empty placeholders; ensure each packet includes at least one explicit monetization model, compliance section, and completed Artifact Engine Map before `research:complete` labeling.

---

## References

- Source repository metadata: [serumwriter/life-insurance-crm](https://github.com/serumwriter/life-insurance-crm)
- Lead pricing signal references:
  - [Exclusive vs Shared Insurance Leads (ClosrLeads)](https://closrleads.com/exclusive-vs-shared-insurance-leads/)
  - [Life Insurance Leads Cost Guide (MADLeadFlow)](https://www.madleadflow.com/knowledge-base/exclusive-life-insurance-leads-price)
  - [Insurance leads cost overview (ActiveProspect)](https://activeprospect.com/blog/insurance-leads-cost/)
- Compliance reference points:
  - [TCPA statutory text (Cornell LII, 47 U.S.C. § 227)](https://www.law.cornell.edu/uscode/text/47/227)
  - [FCC telemarketing/robocall rules overview](https://www.fcc.gov/general/telemarketing-and-robocalls)
  - [Telemarketing Sales Rule guidance (FTC)](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule)
  - [CAN-SPAM compliance guide (FTC)](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

---

## Status Summary

| Field | Value |
| --- | --- |
| Research Status | ✅ Complete |
| Implementation Priority | P1 |
| Revenue Potential | Medium-to-high (B2B lead-ops SaaS + add-ons) |
| Estimated Effort | 2-4 weeks for MVP production app |
| Ship-to-Market Ready | Research-ready; implementation pending |
| Approval Required | @midnghtsapphire |

**Last Updated:** 2026-05-24
