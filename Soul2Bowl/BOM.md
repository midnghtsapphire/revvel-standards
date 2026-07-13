# Bill of Materials — Soul2Bowl

**Last Updated:** April 2026  
**Status:** Active — Pre-Build  
**Project:** Soul2Bowl (`midnghtsapphire/Soul2Bowl`)

---

## Already Covered by Revvel Stack

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean App Platform or Droplet | ~$12–24/mo | Shared or dedicated depending on traffic |
| Database | DigitalOcean Managed PostgreSQL | ~$15/mo | Managed PostgreSQL, daily backups |
| Email Delivery | Resend | $0 (free tier) | Free tier: 3,000 emails/mo, 100/day — sufficient at launch |
| Payments | Stripe | Transaction % only | ~2.9% + $0.30 per transaction; 0.5% for subscriptions |
| Authentication | Clerk | $0 (free tier) | 10k monthly active users free; Google + Apple + Email |
| CI/CD | GitHub Actions | $0 | Free for public repos |
| Analytics | Plausible | $9/mo | Privacy-respecting, no GDPR cookie banner |
| Error Tracking | Sentry | $0 (free tier) | 5,000 errors/mo free |
| Media CDN | DigitalOcean Spaces CDN | ~$5/mo | 250 GB storage + CDN delivery |

---

## Domains

| Domain | Status | Provider | Cost |
|---|---|---|---|
| `soul2bowl.com` | ✅ Owned by client | Already registered | ~$15/yr renewal |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Resend paid tier (if needed) | Transactional email beyond 3k/mo | Resend | $20/mo | P1 | ❌ Not yet |
| Plausible Analytics | Privacy analytics | Plausible | $9/mo | P1 | ❌ Not yet |
| DigitalOcean Spaces | Image / media CDN | DigitalOcean | $5/mo | P0 | ❌ Not yet |
| Apple Developer Program | Apple Sign-In in production | Apple | $99/yr | P1 | ❌ Not purchased |
| Google Cloud Console project | Google OAuth | Google | $0 | P0 | ❌ Not set up |

---

## Eco Packaging (Operational Cost — Not Dev)

| Item | Description | Provider | Cost |
|---|---|---|---|
| LIFEMADE 16 oz Bowls (160 count) | TUV OK compost HOME + BPI® Certified. 8 bundles × 20 bowls | LIFEMADE / Amazon | ~$35–45/case |
| Compostable lids | Matching lids for 16 oz bowls | LIFEMADE compatible | ~$20/100 |
| Compostable cutlery sets | Forks/spoons in wrapped sets | Assorted eco brands | ~$15/100 |
| Compostable bags | For bulk/by-the-pound packaging | Assorted eco brands | ~$15/100 |

---

## Third-Party Integrations

| Integration | Purpose | Cost |
|---|---|---|
| Stripe (Checkout + Billing Portal) | Payments and subscriptions | 2.9% + $0.30/txn |
| Clerk | Auth (Google, Apple, Email) | Free (0–10k MAU) |
| Resend | Order confirmation + newsletter emails | Free → $20/mo |
| FullCalendar.js | Booking calendar UI | Open source (free) |
| Framer Motion | Animations | Open source (free) |
| Google Maps Embed | Pickup location on Contact page | Free |
| YouTube / Vimeo embed | Owner video on About page | Free |
| Plausible | Analytics | $9/mo |
| Sentry | Error tracking | Free tier |

---

## One-Time Setup Costs

| Item | Provider | Cost | Status |
|---|---|---|---|
| Domain (already owned) | — | $0 | ✅ |
| SSL Certificate | DigitalOcean (Let's Encrypt) | $0 | Auto via DO |
| Logo / brand asset design | Designer or AI tools | TBD | ❌ Pending |
| Food photography session | Photographer | $200–500 | ❌ Pending |
| Owner video production | Videographer | $200–600 | ❌ Pending |

---

## Total Estimated Monthly Cost (Launch)

| Category | Cost |
|---|---|
| DigitalOcean (App Platform basic) | ~$12/mo |
| DigitalOcean Managed PostgreSQL | ~$15/mo |
| DigitalOcean Spaces CDN | ~$5/mo |
| Resend (free tier at launch) | $0 |
| Plausible Analytics | $9/mo |
| Clerk (free tier) | $0 |
| Stripe fees | Variable (2.9% + $0.30/txn) |
| **Total fixed monthly** | **~$41/mo** |

---

## Notes

- Clerk free tier supports up to 10,000 monthly active users — sufficient for launch phase
- Stripe fees are variable and come out of revenue, not operating costs
- Resend free tier (3,000 emails/mo) is enough for initial order volume
- Scale to paid Resend ($20/mo) when order volume exceeds ~100 orders/day
- DigitalOcean App Platform preferred over raw Droplet for easier scaling + managed deploys
- Food photography and owner video are critical — schedule before launch
