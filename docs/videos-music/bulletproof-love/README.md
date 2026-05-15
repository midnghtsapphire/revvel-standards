# Bulletproof Love

**Artist:** Audrey Evans  
**Publication Target:** `meetaudreyevans.com`

## Overview

This folder is the source-of-truth for the music video for **Bulletproof Love**.
It contains the manifest, input references, generation status, output metadata, and publication details.

---

## Honest Status

> A filename in a manifest is not proof that the MP4 exists.

| Item | Status |
|---|---|
| WAV audio file | ❌ Not confirmed present |
| Avatar / lip-sync image | ❌ Not confirmed present |
| Provider selected | ✅ HeyGen (draft plan) |
| Backend wiring complete | ❌ Not started |
| MP4 generated | ❌ Does not exist |
| Stored at URI | ❌ No storage URI assigned |
| Published to meetaudreyevans.com | ❌ Not published |
| Live URL verified | ❌ No URL to verify |

---

## Inputs

| Field | Value |
|---|---|
| WAV audio | `Bulletproof Love WAV` _(not yet uploaded)_ |
| Avatar | `Avatar source image/video` _(not yet uploaded)_ |

---

## Generation

| Field | Value |
|---|---|
| Provider | HeyGen |
| Mode | `lip_sync_music_video` |
| Status | `draft` |
| Provider job ID | _(not yet submitted)_ |
| Requested at | _(not yet submitted)_ |
| Completed at | _(not yet completed)_ |

---

## Outputs

| Field | Value |
|---|---|
| MP4 filename | `bulletproof-love-20260515T151936Z-v1.mp4` _(not yet generated)_ |
| Thumbnail | _(not yet generated)_ |
| Captions (VTT) | _(not yet generated)_ |
| Transcript | _(not yet generated)_ |

---

## Publishing

| Field | Value |
|---|---|
| Required on main website | `yes` |
| Main website URL | _(pending publication)_ |
| Canonical video URL | _(pending publication)_ |
| CDN URL | _(pending publication)_ |
| Embed URL | _(pending publication)_ |
| Publish status | `draft` |
| Published at | _(not yet published)_ |

> **The MP4 will be hosted externally.** Once published, `canonical_video_url` in the manifest is the authoritative link to the file.

---

## SEO

| Field | Value |
|---|---|
| SEO title | `Bulletproof Love — Official Music Video` |
| Meta description | _(to be filled before publishing)_ |
| Keywords | `bulletproof love`, `music video`, `lip sync` |
| Thumbnail alt text | `Bulletproof Love music video thumbnail` |

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
3. Submit lip-sync job to HeyGen
4. Capture `provider_job_id`
5. Poll until generation complete
6. Download MP4 to storage
7. Verify MP4 present
8. Deploy to `meetaudreyevans.com/videos/bulletproof-love`
9. Verify live URL returns 200
10. Update manifest with `canonical_video_url` and `published_at_utc`

---

## Manifests

- JSON manifest: [`video-manifest-20260515T151936Z-v1.json`](./video-manifest-20260515T151936Z-v1.json)
- YAML manifest: [`manifest.yml`](./manifest.yml)

See also: [`../video-publishing-standard.md`](../video-publishing-standard.md) for the full end-to-end workflow.

---

## Next Action

**Human action required:** Provide WAV file and avatar image. Once inputs are confirmed, upload them to storage, update both manifests, and trigger the orchestrator.
