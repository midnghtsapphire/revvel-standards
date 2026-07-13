# Music Video Standard

This directory is the source-of-truth for all music video specifications, manifests, and publication metadata.

## Orchestration contract

Music video workflows must also follow the cross-project orchestration contract:

- [`../orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md)

That standard governs lifecycle gates, backend/API wiring completeness, verification, and the rule that docs/manifests alone are never completion.

## Requirements

Every completed and published music video product **must**:

1. **Appear on the main website** — no product is considered complete until it has a public page on the main website with the video embedded or linked.
2. **Have a README in its song folder** — each song folder must contain a `README.md` documenting inputs, generation, outputs, publishing status, and public URLs.
3. **Have a filled manifest** — each song folder must contain a `video-manifest-<timestamp>-v<major>.json` with all required fields populated, including the public URL once published.

## Folder rule

Create one folder per song using kebab-case:

```text
docs/videos-music/<song-slug>/
```

## Filename rule

Use UTC timestamp + versioning in the filename:

```text
<song-slug>-YYYYMMDDTHHMMSSZ-v<major>.mp4
```

Example: `bulletproof-love-20260515T151936Z-v1.mp4`

## Source-of-truth: manifest vs. public media URL

- The **manifest JSON** is the source of truth for all metadata (inputs, generation job, output filenames, SEO fields, publish status).
- **Actual hosted media** (the MP4 and thumbnail) lives on the main website CDN or media host — not necessarily in this repository.
- Once published, the manifest must contain the public `website_url` and `canonical_video_url` so any consumer can locate the asset.

## Expected output vs. verified output

- `outputs.video_filename` and `outputs.video_repo_path` can be **expected** values before render completion.
- A listed filename is **not proof** the MP4 exists.
- Use verification fields (for example `outputs.video_exists`, `verification.video_verified_at_utc`, and publish verification timestamps) to mark actual verified outputs.

## Required inputs per video

| Field | Description |
|---|---|
| `audio_wav` | WAV audio file path, URL, or asset identifier |
| `avatar` | Avatar image or video file path, URL, or asset identifier |

## Required outputs per video

| Field | Description |
|---|---|
| `video_filename` | Canonical MP4 filename using the naming rule above |
| `thumbnail` | Poster/thumbnail image (strongly recommended for SEO) |
| `captions_vtt` | Captions/subtitles file (recommended for accessibility and SEO) |

## Required publishing fields (once published)

| Field | Required | Description |
|---|---|---|
| `required_on_main_website` | always `true` | Signals that this video must appear on the main website |
| `website_url` | yes | Full URL to the product page on the main website |
| `canonical_video_url` | yes | Direct public URL to the hosted MP4 |
| `cdn_url` | recommended | CDN-served URL for the MP4 |
| `embed_url` | optional | Embed player URL if applicable |
| `publish_status` | always present | One of: `draft`, `generating`, `ready`, `published`, `failed` |
| `published_at_utc` | yes when published | ISO 8601 UTC timestamp of first publication |

## Required SEO fields

| Field | Description |
|---|---|
| `title` | Page/video SEO title |
| `description` | Meta description (≤160 characters recommended) |
| `keywords` | Array of keywords/tags |
| `thumbnail_alt` | Alt text for the thumbnail image |

## Scaffolding for new videos

Use `docs/videos-music/_template/` as the reusable scaffold for each new song folder.

See [`_template/README.md`](./_template/README.md) for step-by-step instructions.

## Workflow summary

See [`video-publishing-standard.md`](./video-publishing-standard.md) for the full end-to-end workflow: avatar + WAV intake → video generation → storage → website publication → README update.

See [`../orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md) for cross-project completion gates, backend wiring requirements, and LLM/OpenRouter orchestration governance.

## Example

[`bulletproof-love/`](./bulletproof-love/) is the reference implementation. Its manifest and README demonstrate the expected structure for a music video product.
