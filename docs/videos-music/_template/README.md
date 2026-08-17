# <Song Title>

## Overview

This folder is the source-of-truth for the music video for **<Song Title>**.
It contains the manifest, input references, generation status, output metadata, and publication details.

---

## Inputs

| Field | Value |
|---|---|
| WAV audio | `<wav filename, URL, or asset ID>` |
| Avatar | `<avatar filename, URL, or asset ID>` |

---

## Generation

| Field | Value |
|---|---|
| Provider | HeyGen |
| Mode | `lip_sync_music_video` |
| Status | `draft` / `generating` / `ready` / `published` / `failed` |
| Provider job ID | `<job ID once submitted>` |
| Requested at | `YYYY-MM-DDTHH:MM:SSZ` |
| Completed at | `YYYY-MM-DDTHH:MM:SSZ` |

---

## Outputs

| Field | Value |
|---|---|
| MP4 filename | `<song-slug>-YYYYMMDDTHHMMSSZ-v1.mp4` |
| MP4 exists (verified) | `yes` / `no` |
| Thumbnail | `<thumbnail path or URL>` |
| Captions (VTT) | `<captions path or URL>` |
| Transcript | `<transcript path or URL>` |

> A filename alone is not proof of render completion. Mark `MP4 exists (verified)` only after existence checks pass.

---

## Publishing

| Field | Value |
|---|---|
| Required on main website | `yes` |
| Main website URL | `<https://…>` |
| Canonical video URL | `<https://…>` |
| CDN URL | `<https://…>` |
| Embed URL | `<https://…>` |
| Publish status | `draft` / `published` |
| Published at | `YYYY-MM-DDTHH:MM:SSZ` |

> **The MP4 is hosted externally.** Once published, `canonical_video_url` in the manifest is the authoritative link to the file.

---

## SEO

| Field | Value |
|---|---|
| SEO title | `<title>` |
| Meta description | `<≤160 character description>` |
| Keywords | `<comma-separated keywords>` |
| Thumbnail alt text | `<alt text>` |

---

## Manifest

Manifest file: `video-manifest-YYYYMMDDTHHMMSSZ-v1.json`

See also (music-video workflow): [`../video-publishing-standard.md`](../video-publishing-standard.md).
See also (cross-project orchestration): [`../../orchestration/project-orchestration-standard.md`](../../orchestration/project-orchestration-standard.md).

---

## Scaffolding steps

1. Copy `_template/video-manifest-template.json` → `video-manifest-YYYYMMDDTHHMMSSZ-v1.json` and fill all fields.
2. Copy `_template/README.md` → `README.md` and fill all fields above.
3. Upload WAV and avatar to the generation provider (HeyGen or equivalent).
4. Submit the lip-sync job and record `provider_job_id` in the manifest.
5. On completion, record output filenames and public URLs in the manifest and this README.
6. Publish to the main website and update `publishing.*` fields in the manifest.
7. Confirm this README shows the live `website_url` and `canonical_video_url`.
