# Music Video Folder Scaffolding

Use this scaffold when creating each new song folder under `docs/videos-music/`.

## 1) Create folder

```text
docs/videos-music/<song-slug>/
```

## 2) Copy and fill manifest

Copy `video-manifest-template.json` into the song folder and rename it to:

```text
video-manifest-YYYYMMDDTHHMMSSZ-v1.json
```

Format note:

- `created_at_utc` in JSON uses ISO 8601 UTC: `YYYY-MM-DDTHH:MM:SSZ`
- Filenames use a filesystem-safe compact UTC timestamp: `YYYYMMDDTHHMMSSZ`

## 3) Canonical video filename

```text
<song-slug>-YYYYMMDDTHHMMSSZ-v1.mp4
```

## 4) Version bump rule

- Use `v1` for first export
- Increment major version (`v2`, `v3`, ...) when re-exporting/revising
