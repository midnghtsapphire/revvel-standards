# Music Video Production Standards

> This directory contains video production standards, manifest templates, and per-song
> project records for MIDNGHTSAPPHIRE music video releases.

---

## Orchestration Standard

Every music video project follows the cross-project orchestration lifecycle defined in
[`docs/orchestration/project-orchestration-standard.md`](../orchestration/project-orchestration-standard.md).

**Key rule:** A music video is not complete because a manifest file exists.
It is complete when:
- The MP4 file exists in storage
- It is published and accessible on the destination website
- An HTTP verification check has passed
- The manifest `verified_at_utc` field is set

---

## Project Records

| Song | Artist | Status | Published URL |
|---|---|---|---|
| Bulletproof Love | Audrey Evans | `draft` — MP4 not yet generated | — |

---

## Manifest Template

See [`templates/manifest.template.json`](templates/manifest.template.json) for the
canonical manifest structure with all required fields including verified-state tracking.

### Status Fields (expected vs verified)

Every manifest distinguishes between expected and verified state:

| Field | Purpose |
|---|---|
| `render_status` | Current lifecycle stage (from the 13-value status machine) |
| `video_exists` | `true` only after a storage-level file-existence check passes |
| `provider_job_id` | The actual job ID returned by the generation provider |
| `failure_reason` | Set when `render_status` is `failed` |
| `website_url` | The URL on the destination site where this video is published |
| `canonical_video_url` | The direct URL to the MP4 or embedded player |
| `publish_status` | `unpublished` / `published` / `verified` |
| `verified_at_utc` | ISO timestamp set only after an HTTP 200 verification check passes |
| `artifact_storage_url` | Permanent storage URL (not ephemeral provider URL) |

---

## Provider Options

| Provider | Type | Docs |
|---|---|---|
| HeyGen | Lip-sync avatar video | https://docs.heygen.com |
| Luma Dream Machine | AI video generation | https://lumaai.com/api |
| Runway Gen-3 | AI video generation | https://runwayml.com/api |

Credentials are stored in Vault at `revvel/shared/video/` and in the project's runtime
environment. See `.env.example` for variable names.

---

## Destination

All Audrey Evans music videos publish to `meetaudreyevans.com`.

Publication is complete only when the video is embedded and accessible at its canonical
URL — not when a deployment workflow succeeds.
