# Bill of Materials — GrowlingEyes

**Last Updated:** April 2026
**Status:** Active

---

## Already Covered by Revvel Stack

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean Droplet | $0 (shared) | Shared `164.90.148.7` — PM2 process: `growlingeyes` |
| Database | DigitalOcean Managed MySQL | $0 (shared) | Shared instance — DB: `growlingeyes_prod` |
| Email delivery | Resend | $0 (free tier) | Free tier: 3,000 emails/mo, 100/day |
| Payments | Stripe | Transaction % only | ~2.9% + $0.30 per transaction (no monthly fee) |
| Auth | Google OAuth | $0 | Via `passport-google-oauth20` |
| CI/CD | GitHub Actions | $0 | Free for public repos; shared minutes for private |
| DNS | Namecheap | Already purchased | `growlingeyes.com` — renews annually |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Apple Developer Program | iOS App Store submission + TestFlight | Apple | $99/year | P1 | ❌ Not purchased |
| Google Play Developer account | Android Play Store submission | Google | $25 one-time | P1 | ❌ Not purchased |
| Domain renewal (future) | Keep `growlingeyes.com` active | Namecheap | ~$15/yr | P0 | ✅ Current |

---

## One-Time Purchases

| Item | Provider | Cost | Status |
|---|---|---|---|
| Domain registration — `growlingeyes.com` | Namecheap | ~$15/yr | ✅ Purchased |
| Apple Developer Account | Apple | $99/yr | ❌ Not purchased |
| Google Play Developer | Google | $25 one-time | ❌ Not purchased |

---

## Total Estimated Monthly Cost

| Category | Cost |
|---|---|
| Shared infrastructure (pro-rated, split across active projects) | ~$5/mo |
| Resend email | $0 (free tier) |
| Stripe fees | Variable (transaction %) |
| **Total fixed monthly** | **~$5/mo** |

---

## Notes

- GrowlingEyes is the most mature active project — first to go to stores when accounts are purchased
- Error reporting uses Resend (free tier is sufficient for current volume)
- Authentication is Google OAuth only — no Clerk, no custom auth server
- Database is shared DigitalOcean MySQL — no dedicated instance needed at current scale
