# R.A.I.D. Log — Soul2Bowl

**R**isks · **A**ssumptions · **I**ssues · **D**ependencies  
**Project:** Soul2Bowl  
**Last Updated:** April 2026

---

## How to Use This Log

This log tracks all risks, assumptions, open issues, and external dependencies for Soul2Bowl. Review and update at the start of each sprint.

---

## Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-001 | Food photography not ready before launch | High | High | Schedule photo session in Week 1; use placeholder images that match final dimensions until photos arrive |
| R-002 | Owner video production delayed | Medium | Medium | About page ships with text bio first; video embed added in Phase 4 sprint; no hard block on launch |
| R-003 | Stripe integration rejected due to food business category | Low | High | Pre-register `soul2bowl.com` as a food/catering business in Stripe dashboard; provide business docs early |
| R-004 | Apple Sign-In requires Apple Developer account ($99/yr) | High | Medium | Clerk handles Apple Sign-In but Apple Developer account must be created before going live; order in Week 1 |
| R-005 | Calendar overbooking (orders exceed prep capacity) | Medium | High | Implement slot limit per time window in admin panel; admin sets max orders per slot |
| R-006 | Delivery logistics not set up at launch | Medium | Medium | Launch with pickup-only first; delivery option UI built but disabled until logistics partner is confirmed |
| R-007 | Domain DNS propagation delay at launch | Low | Low | Set DNS ahead of launch date; use DigitalOcean DNS management; propagation ~24hrs |
| R-008 | Stripe webhook failures causing missed order confirmations | Low | High | Implement webhook signature verification; log all events; retry logic via Stripe dashboard |
| R-009 | High volume of custom catering requests overwhelming chef | Medium | Medium | Catering inquiry form has a 5-business-day response SLA; admin panel shows all requests in priority order |
| R-010 | No-show or last-minute cancellation on Sunday Dinner orders | Medium | Medium | Refund policy: cancel before Friday 5PM for full refund; after cutoff = store credit only; stated in T&C |

---

## Assumptions

| ID | Assumption | Risk if Wrong |
|---|---|---|
| A-001 | The client already owns `soul2bowl.com` and will provide DNS access | Medium — launch delayed if domain access not provided |
| A-002 | Food photography will be sourced by the client (not AI-generated) | High — real photos are critical for trust and SEO |
| A-003 | The owner video will be shot and delivered as MP4 by Week 7 | Medium — About page video section will remain placeholder |
| A-004 | Logo files will be provided by the client; brand colors derived from logo | High — design system must be finalized before Sprint 1 UI work begins |
| A-005 | Chef operates from St. Louis, MO and serves the greater St. Louis metro area at launch | Low — geo-targeting in SEO and schema must be updated if service area expands |
| A-006 | Pickup is available at a fixed address (to be confirmed by client) | Medium — Contact page Google Maps embed requires confirmed address |
| A-007 | The client will provide final menu prices before Sprint 2 | Medium — placeholder prices used in Sprint 1; must be confirmed before payment flows go live |
| A-008 | Resend free tier (3,000 emails/mo) is sufficient at launch | Low — upgrade to paid Resend when volume exceeds this |
| A-009 | `angelreporters@gmail.com` is the admin account; Clerk will be configured to auto-elevate this email to admin role | None — standard Revvel practice |

---

## Issues

| ID | Issue | Severity | Status | Owner | Resolution |
|---|---|---|---|---|---|
| I-001 | Logo files not yet provided | P0 | 🔴 Open | Client | Client to provide SVG logo files before Sprint 1 design work |
| I-002 | Food photography not yet available | P0 | 🔴 Open | Client | Schedule photo session; provide placeholder images to dev team |
| I-003 | Owner video not yet produced | P1 | 🟡 Pending | Client | Schedule video shoot for Week 6 |
| I-004 | Final menu prices not confirmed | P1 | 🟡 Pending | Client | Must be confirmed before Stripe products are created (Sprint 2) |
| I-005 | Pickup address not confirmed | P1 | 🟡 Pending | Client | Required for Google Maps embed and delivery radius |
| I-006 | Apple Developer account not purchased | P1 | 🟡 Pending | Client | Required for Apple Sign-In in production |
| I-007 | Google Cloud Console OAuth app not created | P0 | 🟡 Pending | Dev Team | Create in Week 1 alongside Clerk setup |

---

## Dependencies

| ID | Dependency | Type | Owner | Required By |
|---|---|---|---|---|
| D-001 | SVG logo files from client | External | Client | Sprint 1, Day 1 |
| D-002 | Food photography (all menu items + hero) | External | Client/Photographer | Sprint 4 (but need before final QA) |
| D-003 | Owner video (MP4, 1080p) | External | Client/Videographer | Sprint 4 |
| D-004 | Final confirmed menu prices | External | Client | Sprint 2, Day 1 |
| D-005 | Pickup address + operating hours | External | Client | Sprint 2 (Contact page + schema) |
| D-006 | Stripe account activation (soul2bowl.com) | External | Client | Sprint 2, Day 1 |
| D-007 | Apple Developer Program enrollment | External | Client | Sprint 4 (pre-launch) |
| D-008 | Google Cloud Console OAuth app credentials | Internal | Dev Team | Sprint 1 |
| D-009 | DigitalOcean account + DNS access to soul2bowl.com | External | Client | Sprint 4 (deploy) |
| D-010 | Resend account + domain verification for `soul2bowl.com` | Internal | Dev Team | Sprint 2 (order emails) |
| D-011 | Plausible Analytics account | Internal | Dev Team | Sprint 4 (launch) |
| D-012 | LIFEMADE packaging certification badge images | External | Client | Sprint 1 (eco section design) |
