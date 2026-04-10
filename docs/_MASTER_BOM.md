# Master Bill of Materials — All Revvel Projects

> **Note:** Run `scripts/sync-bom.sh` to regenerate this file from individual project BOMs.
> This file shows all outstanding purchases sorted by priority across all active projects.

**Last Regenerated:** April 2026

---

## The Shopping List (All ❌ Not Purchased Items)

Sorted by Priority (P0 = do immediately, P1 = do soon, P2 = do when ready for stores).

### P0 — Do Immediately

| Project | Item | Provider | Est. Cost | Notes |
|---|---|---|---|---|
| Neurooz | OpenAI API (production tier) | OpenAI | ~$20–100/mo | Required for AI features |
| Revvel Music Studio | Audio CDN / storage | Cloudflare R2 or AWS S3 | ~$5–20/mo | Required for audio hosting |
| Revvel Music Studio | Stripe payments | Stripe | Transaction % | Required for marketplace |
| Universal SAR App | Mapping API | Google Maps or Mapbox | ~$10–50/mo | Required for GPS features |
| Universal SAR App | Push notifications | Firebase | ~$0–20/mo | Required for incident alerts |
| Premolt | Stripe payments | Stripe | Transaction % | Required for billing |

### P1 — Do Soon

| Project | Item | Provider | Est. Cost | Notes |
|---|---|---|---|---|
| GrowlingEyes | Apple Developer Program | Apple | $99/year | Required for iOS store |
| GrowlingEyes | Google Play Developer | Google | $25 one-time | Required for Android store |
| Revvel Music Studio | Domain registration | Namecheap | ~$15/yr | App needs a home |
| Universal SAR App | Domain registration | Namecheap | ~$15/yr | App needs a home |
| Premolt | Domain registration | Namecheap | ~$15/yr | App needs a home |
| Universal SAR App | Apple Developer Program | Apple | $99/year | Required for iOS store |
| Universal SAR App | Google Play Developer | Google | $25 one-time | Required for Android store |

### P2 — Do When Ready for Stores

| Project | Item | Provider | Est. Cost | Notes |
|---|---|---|---|---|
| Neurooz | Apple Developer Program | Apple | $99/year | iOS store deployment |
| Neurooz | Google Play Developer | Google | $25 one-time | Android store deployment |
| Revvel Music Studio | Apple Developer Program | Apple | $99/year | iOS store deployment |
| Revvel Music Studio | Google Play Developer | Google | $25 one-time | Android store deployment |
| Premolt | Apple Developer Program | Apple | $99/year | iOS store deployment |
| Premolt | Google Play Developer | Google | $25 one-time | Android store deployment |

---

## Summary by Project

| Project | Status | Fixed Monthly | One-Time Outstanding |
|---|---|---|---|
| GrowlingEyes | ✅ Active | ~$5/mo | $99 + $25 = $124 (stores) |
| Neurooz | 🔧 In Development | ~$25–55/mo | $99 + $25 = $124 (stores) + OpenAI setup |
| Revvel Music Studio | 📋 Planned | ~$10–25/mo | Domain + $99 + $25 + Audio CDN |
| Universal SAR App | 📋 Planned | ~$15–75/mo | Domain + $99 + $25 + Maps + Push |
| Premolt | 📋 Planned | ~$5/mo | Domain + $99 + $25 |

---

## Consolidated Monthly Cost (All Projects Running)

| Category | Estimated Monthly |
|---|---|
| DigitalOcean Droplet + Managed MySQL (shared) | ~$25/mo (split across all projects) |
| OpenAI API (Neurooz) | ~$20–50/mo |
| Audio CDN (Revvel Music Studio) | ~$5–20/mo |
| Mapping API (Universal SAR App) | ~$10–50/mo |
| **Total estimated (all projects live)** | **~$60–145/mo** |

---

## Project BOM Files

- [GrowlingEyes BOM](growlingeyes/BOM.md)
- [Neurooz BOM](neurooz/BOM.md)
- [Revvel Music Studio BOM](revvel-music-studio/BOM.md)
- [Universal SAR App BOM](universal-sar-app/BOM.md)
- [Premolt BOM](premolt/BOM.md)
