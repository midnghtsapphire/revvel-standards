# Music Video Publishing Standard

> **Status:** Standard / Specification  
> This document describes the required end-to-end workflow for music video generation and publishing under revvel-standards.
> It is a **spec and contract** — not executable automation code.
>
> Cross-project orchestration gates are defined in [`../orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md).

---

## 1. Overview

Every music video product must travel from raw inputs (WAV + avatar) through generation, storage, and website publication to produce a publicly accessible video with a canonical URL. The product is not considered complete until:

- the MP4 is hosted and publicly accessible,
- the main website has a page featuring the video, and
- the song folder README contains the live public URL.

---

## 2. Required Inputs

| Input | Type | Notes |
|---|---|---|
| Audio | WAV | Lossless audio; the sync source for lip animation |
| Avatar | Image or video | Still image (PNG/JPG) or short video clip of the artist/avatar |

Both inputs **must** be recorded in the manifest `inputs` block before generation begins.

---

## 3. End-to-End Workflow

### Step 1 — Intake

1. Create a song folder: `docs/videos-music/<song-slug>/`.
2. Copy `_template/video-manifest-template.json` → `video-manifest-<timestamp>-v1.json`.
3. Copy `_template/README.md` → `README.md`.
4. Fill in `song_title`, `slug`, `created_at_utc`, `folder`, and both `inputs` fields.
5. Set `generation.status` to `draft` and `publishing.publish_status` to `draft`.

### Step 2 — Video generation / lip-sync

1. Upload the WAV and avatar to the chosen lip-sync provider (see §5).
2. Submit the render job; record `generation.provider_job_id` and `generation.requested_at_utc` in the manifest.
3. Set `generation.status` to `generating`.
4. Poll for job completion.
5. On success: record `generation.completed_at_utc` and set `generation.status` to `ready`.
6. On failure: set `generation.status` to `failed`; investigate and retry.

### Step 3 — Output retrieval and storage

1. Download the rendered MP4 from the provider.
2. Name it according to the canonical rule: `<song-slug>-YYYYMMDDTHHMMSSZ-v1.mp4`.
3. Upload it to the main website media host or CDN.
4. Record the file path/name in `outputs.video_filename` and `outputs.video_repo_path`.
5. Generate or retrieve a thumbnail; record in `outputs.thumbnail`.
6. Optionally generate captions (VTT) and transcript; record in `outputs.captions_vtt` and `outputs.transcript`.

### Step 4 — Website publication

1. Create or update the product page on the main website (`meetaudreyevans.com`), embedding the video or linking to `canonical_video_url`.
2. Apply all SEO fields from the manifest `seo` block to the page metadata.
3. Record the live page URL in `publishing.website_url`.
4. Record the direct hosted MP4 URL in `publishing.canonical_video_url`.
5. Record the CDN URL in `publishing.cdn_url` (if applicable).
6. Record the embed player URL in `publishing.embed_url` (if applicable).
7. Set `publishing.publish_status` to `published` and record `publishing.published_at_utc`.
8. Confirm `publishing.required_on_main_website` is `true`.

### Step 5 — README update

1. Open `docs/videos-music/<song-slug>/README.md`.
2. Fill in all sections: Inputs, Generation, Outputs, Publishing, SEO.
3. Ensure `website_url` and `canonical_video_url` are present and correct.
4. Commit the updated README and manifest to the repository.

### Step 6 — Verification checklist

Before marking a video product as complete, verify:

- [ ] `publishing.publish_status` = `published`
- [ ] `publishing.website_url` is a live, publicly accessible URL
- [ ] `publishing.canonical_video_url` returns the MP4 directly
- [ ] Song folder README shows the live URLs
- [ ] Main website product page is visible and video loads
- [ ] `seo.title`, `seo.description`, and `seo.keywords` are populated
- [ ] Thumbnail present and `seo.thumbnail_alt` is set

---

## 4. Publish Status Values

| Status | Meaning |
|---|---|
| `draft` | Manifest created; generation not yet started |
| `generating` | Render job submitted to provider; awaiting completion |
| `ready` | Render complete; MP4 available but not yet published to website |
| `published` | MP4 is live on the main website with a public canonical URL |
| `failed` | Generation or publishing step failed; requires investigation |

---

## 5. Provider Roles

This section names current recommended tools. The manifest schema is provider-agnostic — providers can change without altering the contract.

### Primary lip-sync / avatar video generation

**[HeyGen](https://www.heygen.com)**

- Role: Submit the WAV + avatar and produce a lip-synced talking-head or full-body music video MP4.
- Manifest field: `generation.provider` = `"heygen"`
- Key inputs: avatar asset, audio file, rendering mode
- Key outputs: MP4 video, optional thumbnail

### Visual asset generation (thumbnails, cover art, avatar source)

**[Leonardo.ai](https://leonardo.ai)**

- Role: Generate high-quality still images for use as the avatar source, promotional artwork, or video thumbnail.
- Not required for every video; used when the artist needs AI-generated imagery rather than a supplied photo.
- Output: PNG/JPG asset referenced in `inputs.avatar.source` or `outputs.thumbnail`

### Voice / audio generation (optional)

**[ElevenLabs](https://elevenlabs.io)**

- Role: Generate or enhance the vocal WAV if the artist does not supply one.
- Not required when the user supplies their own WAV directly.
- Output: WAV file referenced in `inputs.audio.source`

### Additional creative / media tooling

**Nano Banana** and other tools in the stack may be used for:

- auxiliary video effects or composition,
- social media clip variants,
- subtitle generation,
- metadata or SEO copy generation.

Add these to the manifest `generation.provider` field or document them separately if multiple tools are chained.

---

## 6. SEO Requirements

An MP4 alone is not sufficient for strong organic reach. The main website page must also include:

- `<title>` and `<meta name="description">` from `seo.title` and `seo.description`
- Open Graph tags: `og:title`, `og:description`, `og:image` (thumbnail)
- Twitter Card tags if applicable
- Schema.org `VideoObject` structured data including:
  - `name`, `description`, `thumbnailUrl`, `uploadDate`, `contentUrl`
- Captions/subtitles embedded or linked (VTT format) for accessibility and indexing
- Canonical `<link rel="canonical">` matching `publishing.canonical_video_url`

---

## 7. Naming Conventions

| Convention | Rule |
|---|---|
| Song folder | `docs/videos-music/<song-slug>/` (kebab-case) |
| Manifest filename | `video-manifest-YYYYMMDDTHHMMSSZ-v<major>.json` |
| MP4 filename | `<song-slug>-YYYYMMDDTHHMMSSZ-v<major>.mp4` |
| Thumbnail filename | `<song-slug>-YYYYMMDDTHHMMSSZ-v<major>-thumb.jpg` (recommended) |
| Captions filename | `<song-slug>-YYYYMMDDTHHMMSSZ-v<major>.vtt` (recommended) |
| Version bump | Increment `v<major>` only on a full re-export/revision |

Timestamp format in filenames: `YYYYMMDDTHHMMSSZ` (filesystem-safe, UTC).  
Timestamp format in JSON: ISO 8601 UTC — `YYYY-MM-DDTHH:MM:SSZ`.

---

## 8. How to Find the MP4 / Public Link

Once a video is published, the authoritative locations are:

1. **`publishing.canonical_video_url`** in the manifest — direct link to the hosted MP4.
2. **`publishing.website_url`** in the manifest — the main website product page where the video is embedded.
3. **Song folder README** — both URLs are reproduced in the Publishing section for quick reference.

If `publish_status` is not `published` or these fields are empty, the video is not yet publicly available.

---

## 9. Current Gaps and Implementation Notes

> This repository is the **standards and specification layer**. The automation runtime (API adapters, CI jobs, CMS integrations) may live in separate repositories or services.

| Gap | Notes |
|---|---|
| Automated HeyGen job submission | Not implemented in this repo; must be built in the automation runtime |
| CDN/media hosting integration | Depends on the main website stack; canonical URL must be recorded manually until automated |
| Website CMS publish automation | Depends on the main website CMS; product pages may need to be created manually until integrated |
| README auto-update on publish | Not implemented in this repo; currently a manual step after publishing |
| Captions/transcript generation | Optional; may use ElevenLabs, HeyGen built-in, or a third-party subtitle tool |
| Thumbnail auto-generation | Recommended; may use Leonardo or the frame-extraction feature of the video provider |

Until the runtime automation exists, all steps in §3 are performed manually and the manifest + README are updated by hand.

---

## 10. Template Files

| File | Purpose |
|---|---|
| [`_template/video-manifest-template.json`](./_template/video-manifest-template.json) | Copy this into a new song folder and fill all fields |
| [`_template/README.md`](./_template/README.md) | Copy this into a new song folder and fill all sections |
