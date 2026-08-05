# Bill of Materials — Revvel Forensic Studio

**Last Updated:** April 2026
**Status:** Deployed — Active Development
**Project:** Revvel Forensic Studio (`midnghtsapphire/revvel-forensic-studio`)
**Description:** AI-powered image analysis and enhancement tool with a "Glass Observatory" theme. 12 distinct workspaces, FastAPI backend. Hybrid beauty enhancement + forensic analysis (face reconstruction, EXIF recovery, IMSI/Stingray integration).

---

## Already Covered by Revvel Stack

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean Droplet | $0 (shared) | Shared `164.90.148.7` — PM2 / Uvicorn |
| Database | DigitalOcean Managed MySQL | $0 (shared) | Shared instance |
| CI/CD | GitHub Actions | $0 | Free for public repos |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| OpenAI API (GPT-4o Vision) | AI image analysis, face feature description | OpenAI | ~$20–100/mo | P0 | ❌ Not set up |
| Domain registration | `revvelforensics.com` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| DeepAI / Replicate API | Image enhancement, face reconstruction models | Replicate or DeepAI | ~$10–50/mo | P1 | ❌ Not set up |
| Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Google Play Developer | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |
| Sentry Error Tracking | Production error monitoring | Sentry | $0 (free tier) | P1 | ❌ Not configured |

---

## One-Time Purchases

| Item | Provider | Cost | Status |
|---|---|---|---|
| Domain registration | Namecheap | ~$15/yr | ❌ Not purchased |
| Apple Developer Account | Apple | $99/yr | ❌ Not purchased |
| Google Play Developer | Google | $25 one-time | ❌ Not purchased |

---

## Specialist APIs

| API | Purpose | Provider | Est. Cost |
|---|---|---|---|
| OpenAI GPT-4o Vision | Image description and analysis | OpenAI | Variable |
| Replicate | Open-source image models (face restoration, enhancement) | Replicate | ~$0.01/image |
| ExifTool (open source) | EXIF metadata extraction | Open source | $0 |
| FaceNet / DeepFace (open source) | Face recognition and comparison | PyPI | $0 |

---

## Total Estimated Monthly Cost

| Category | Cost |
|---|---|
| Shared infrastructure (pro-rated) | ~$5/mo |
| OpenAI API | ~$20–100/mo |
| Replicate (image models) | ~$10–50/mo |
| **Total estimated monthly** | **~$35–155/mo** |

---

## Notes

- Blue Ocean opportunity: only tool combining beauty enhancement with forensic reconstruction.
- FastAPI backend — ensure Uvicorn is configured as a PM2 process on the shared droplet.
- EXIF and forensics tools are mostly open source — key cost driver is AI vision APIs.
- If volume grows, consider GPU-backed DigitalOcean droplet or Modal.com for inference.
