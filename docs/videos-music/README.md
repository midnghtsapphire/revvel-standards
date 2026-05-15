# Video Standards — Music Videos

**Status:** Active  
**Version:** 1.0.0  
**Last Updated:** 2026-05-15  
**Owner:** Revvel Standards  
**Completion standard:** [docs/orchestration/project-orchestration-standard.md](../orchestration/project-orchestration-standard.md)

---

## Overview

This directory contains standards, templates, and examples for AI-generated music video production within the Revvel ecosystem.

Every music video project must follow the [Cross-Project Orchestration Standard](../orchestration/project-orchestration-standard.md). A video is not complete because a manifest file exists — it is only complete when the MP4 exists, is published to the destination website, and verification has passed.

---

## Directory Structure

```
docs/videos-music/
├── README.md                    ← this file
├── manifest-template.yml        ← manifest template for all music video projects
└── <project-slug>/
    ├── README.md                ← project-specific notes, honest status
    └── manifest.yml             ← live manifest for this project
```

---

## Manifest Template

Use [`manifest-template.yml`](./manifest-template.yml) for every new music video project.

Key fields that must be kept truthful:

| Field | Meaning |
|---|---|
| `render_status` | Current status in the lifecycle state machine |
| `video_exists` | `true` only when the MP4 file is confirmed present at `artifact_uri` |
| `provider_job_id` | The actual job ID returned by the generation provider |
| `failure_reason` | Exact error message if any stage failed |
| `website_url` | Target publication URL (fill in even if not yet published) |
| `canonical_video_url` | Real public URL of the published video — blank until verified |
| `publish_status` | `unpublished` / `published` / `verified` |
| `verified_at_utc` | Timestamp when the live URL was confirmed — blank until verified |

---

## Supported Providers

| Provider | Type | FOSS | Cost Model | Lip-sync |
|---|---|---|---|---|
| HeyGen | SaaS API | No | Per-credit | Yes |
| Runway Gen-4 | SaaS API | No | Per-second | No (scene generation) |
| Luma Dream Machine | SaaS API | No | Per-second | No (scene generation) |
| D-ID | SaaS API | No | Per-credit | Yes |
| Wav2Lip (self-hosted) | Open source | Yes | Infra cost only | Yes |
| SadTalker (self-hosted) | Open source | Yes | Infra cost only | Yes |

---

## Publication Target

All produced music videos for the Audrey Evans catalog must be published to:

**`meetaudreyevans.com`**

The orchestrator must:
1. Confirm the deployment target is configured before the publish stage
2. Verify the live URL returns 200 after publication
3. Record the live URL in `canonical_video_url`

---

## Examples

- [`bulletproof-love/`](./bulletproof-love/) — reference example with honest state (MP4 not yet generated as of initial documentation)

---

## Related Documents

- [`docs/orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md)
- [`docs/orchestration/openrouter-execution-contract.md`](../orchestration/openrouter-execution-contract.md)
- [`products/music-video-creator/`](../../products/music-video-creator/) — the production app
