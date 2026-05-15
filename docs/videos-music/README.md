# Video Standards — Music Videos

**Status:** Active  
**Version:** 1.0.0  
**Last Updated:** 2026-05-15  
**Owner:** Revvel Standards  
**Completion standard:** [docs/orchestration/project-orchestration-standard.md](../orchestration/project-orchestration-standard.md)

---

## Overview

This directory is the source-of-truth for all music video specifications, manifests, and publication metadata within the Revvel ecosystem.

Every music video product must follow the [Cross-Project Orchestration Standard](../orchestration/project-orchestration-standard.md). A video is not complete because a manifest file exists — it is only complete when the MP4 exists, is published to the destination website, and verification has passed.

---

## Requirements

Every completed and published music video product **must**:

1. **Appear on the main website** — no product is considered complete until it has a public page on the main website with the video embedded or linked.
2. **Have a README in its song folder** — each song folder must contain a `README.md` documenting inputs, generation, outputs, publishing status, and public URLs.
3. **Have a filled manifest** — each song folder must contain a `video-manifest-<timestamp>-v<major>.json` with all required fields populated, including the public URL once published.

---

## Directory Structure

```
docs/videos-music/
├── README.md                        ← this file
├── manifest-template.yml            ← YAML manifest template (orchestrator-compatible)
├── video-publishing-standard.md     ← end-to-end workflow specification
├── _template/                       ← scaffolding for new song folders
│   ├── README.md
│   └── video-manifest-template.json
└── <song-slug>/
    ├── README.md                    ← per-song status and URLs
    └── video-manifest-*.json        ← live manifest for this song
```

---

## Folder and Filename Rules

Create one folder per song using kebab-case:

```text
docs/videos-music/<song-slug>/
```

Use UTC timestamp + versioning in the manifest filename:

```text
video-manifest-YYYYMMDDTHHMMSSZ-v<major>.json
```

MP4 filename rule:

```text
<song-slug>-YYYYMMDDTHHMMSSZ-v<major>.mp4
```

---

## Manifest Key Fields

Key fields that must be kept truthful at all times:

| Field | Meaning |
|---|---|
| `generation.status` | Current lifecycle status: `draft` / `generating` / `ready` / `published` / `failed` |
| `outputs.video_filename` | Canonical MP4 filename — only fill when the file actually exists |
| `generation.provider_job_id` | The actual job ID returned by the generation provider |
| `publishing.website_url` | Full URL to the product page on the main website — blank until live |
| `publishing.canonical_video_url` | Direct public URL to the hosted MP4 — blank until verified |
| `publishing.publish_status` | `draft` / `generating` / `ready` / `published` / `failed` |
| `publishing.published_at_utc` | Timestamp of first publication — blank until published |

YAML manifest additionally tracks (for orchestrator compatibility):

| Field | Meaning |
|---|---|
| `render_status` | Full 13-state orchestrator status (see orchestration standard) |
| `video_exists` | `true` only when the MP4 file is confirmed present at its storage URI |
| `failure_reason` | Exact error message if any stage failed |
| `verified_at_utc` | Timestamp when the live URL was confirmed accessible |

---

## Supported Providers

| Provider | Type | FOSS | Cost Model | Lip-sync |
|---|---|---|---|---|
| HeyGen | SaaS API | No | Per-credit | Yes |
| D-ID | SaaS API | No | Per-credit | Yes |
| Runway Gen-4 | SaaS API | No | Per-second | No (scene generation) |
| Luma Dream Machine | SaaS API | No | Per-second | No (scene generation) |
| Wav2Lip (self-hosted) | Open source | Yes | Infra cost only | Yes |
| SadTalker (self-hosted) | Open source | Yes | Infra cost only | Yes |

---

## Publication Target

All produced music videos for the Audrey Evans catalog must be published to:

**`meetaudreyevans.com`**

The orchestrator must:
1. Confirm the deployment target is configured before the publish stage
2. Verify the live URL returns 200 after publication
3. Record the live URL in `publishing.canonical_video_url`

---

## Scaffolding for New Videos

Use `docs/videos-music/_template/` as the reusable scaffold for each new song folder.

See [`_template/README.md`](./_template/README.md) for step-by-step instructions.

---

## Workflow

See [`video-publishing-standard.md`](./video-publishing-standard.md) for the full end-to-end workflow: avatar + WAV intake → video generation → storage → website publication → README update.

---

## Examples

- [`bulletproof-love/`](./bulletproof-love/) — reference implementation with honest state

---

## Related Documents

- [`docs/orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md)
- [`docs/orchestration/openrouter-execution-contract.md`](../orchestration/openrouter-execution-contract.md)
- [`products/music-video-creator/`](../../products/music-video-creator/) — the production app
