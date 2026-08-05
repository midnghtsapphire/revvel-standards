# Bill of Materials — The Alt Text (thealttext)

**Last Updated:** April 2026
**Status:** Deployed — Active
**Project:** The Alt Text (`midnghtsapphire/the-alt-text`)
**Description:** AI-powered SaaS for generating SEO-optimized alt text for images. Includes a 3-tier Stripe subscription model and a REST API.

---

## Already Covered by Revvel Stack

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean Droplet | $0 (shared) | Shared `164.90.148.7` — PM2 process |
| Database | DigitalOcean Managed MySQL | $0 (shared) | Shared instance |
| Email Delivery | Resend | $0 (free tier) | Free tier: 3,000 emails/mo, 100/day |
| Payments | Stripe | Transaction % only | 2.9% + $0.30/txn; 0.5% subscriptions |
| CI/CD | GitHub Actions | $0 | Free for public repos |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| OpenAI API (GPT-4o Vision) | Core AI: generate alt text from images | OpenAI | ~$10–50/mo | P0 | ❌ Check usage — may need upgrade |
| Domain renewal | Keep `thealttext.com` active | Namecheap | ~$15/yr | P0 | ❌ Verify renewal date |
| RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Google Play Developer | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |

---

## One-Time Purchases

| Item | Provider | Cost | Status |
|---|---|---|---|
| Domain registration | Namecheap | ~$15/yr | ✅ Purchased (verify renewal) |
| Apple Developer Account | Apple | $99/yr | ❌ Not purchased |
| Google Play Developer | Google | $25 one-time | ❌ Not purchased |

---

## Total Estimated Monthly Cost

| Category | Cost |
|---|---|
| Shared infrastructure (pro-rated) | ~$5/mo |
| OpenAI API (GPT-4o Vision) | ~$10–50/mo depending on volume |
| Stripe fees | Variable (transaction %) |
| **Total estimated monthly** | **~$15–55/mo** |

---

## Notes

- Core value prop depends entirely on OpenAI Vision API quality — monitor cost per request carefully.
- 3-tier subscription model means Stripe Billing Portal must stay configured.
- SaaS architecture — monitor conversion from free to paid tier.
- If RecurseML trial passes its decision gate (14 days), add $250/yr to this BOM.
