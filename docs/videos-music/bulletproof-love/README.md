# Bulletproof Love — Music Video Project

**Artist:** Audrey Evans  
**Project Status:** `draft` — MP4 does not yet exist  
**Publication Target:** `meetaudreyevans.com`

---

## Honest Status

> A filename in a manifest is not proof that the MP4 exists.

As of initial documentation (2026-05-15):

| Item | Status |
|---|---|
| WAV audio file | ❌ Not confirmed present |
| Avatar / lip-sync image | ❌ Not confirmed present |
| Provider selected | ❌ Not selected |
| Backend wiring complete | ❌ Not started |
| MP4 generated | ❌ Does not exist |
| Stored at URI | ❌ No storage URI assigned |
| Published to meetaudreyevans.com | ❌ Not published |
| Live URL verified | ❌ No URL to verify |

This project remains in `draft` status until all inputs are confirmed present and the orchestrator can proceed to planning.

---

## Required Inputs

Before the orchestrator can begin:

1. `.wav` audio file for "Bulletproof Love" — upload to designated storage and record path in `manifest.yml`
2. Avatar image (high-resolution portrait of Audrey Evans) — upload and record path in `manifest.yml`
3. Confirm `HEYGEN_API_KEY` (or equivalent) exists in the runtime environment

---

## Orchestration Plan (once inputs are available)

The orchestrator will run a three-layer swarm:

### Scout Phase (parallel)
- **Scout-1:** Provider comparison — HeyGen vs D-ID vs Wav2Lip for lip-sync quality and cost
- **Scout-2:** Storage options — Vercel Blob vs Cloudflare R2 for input/output assets
- **Scout-3:** Publication requirements for `meetaudreyevans.com` — Vercel deploy path, og:video tags
- **Scout-4:** SEO metadata — title, description, tags for the video page

### Sage Phase
Sage aggregates Scout responses into a unified plan: selected provider, storage target, publication method, and SEO copy.

### Forge Phase
Forge translates the Sage plan into a deterministic task list:
1. Upload WAV to storage
2. Upload avatar to storage
3. Submit lip-sync job to selected provider
4. Capture `provider_job_id`
5. Poll until `artifact_created`
6. Download MP4 to storage
7. Verify MP4 present (`video_exists: true`)
8. Deploy to `meetaudreyevans.com/videos/bulletproof-love`
9. Verify live URL returns 200
10. Update manifest with `canonical_video_url` and `verified_at_utc`

---

## Manifest

See [`manifest.yml`](./manifest.yml) for live status fields.

---

## Next Action

**Human action required:** Provide WAV file and avatar image. Once inputs are confirmed, set `wav_exists: true` and `avatar_exists: true` in `manifest.yml` and trigger the orchestrator.
