# Ring owner export (`ring_export.py`)

Export the event history and recordings of **your own** Ring devices, with a
tamper-evident manifest, so you can publish your own records.

## Your own account only

This tool signs in as the Ring account owner and works only on devices that
account owns:

- Devices someone else has shared with you (Ring's "authorized" / shared
  devices) are filtered out and cannot be selected.
- There is no Neighbors app, neighbourhood, public post or shared-feed
  feature, and none will be added.
- `download` only accepts event ids it finds in the history of one of your own
  devices, so it cannot fetch arbitrary recording ids.

Do not use it with anyone else's credentials.

## Requirements

- Python 3.9+ and the unofficial open-source library
  [python-ring-doorbell](https://github.com/python-ring-doorbell/python-ring-doorbell):
  `pip install ring_doorbell` (tested against the 0.9.x async API).
- Downloading recordings requires an active **Ring Protect** subscription on
  the device. Without one Ring keeps no recordings; `download` reports each
  such event as failed and exits 1. Event history works without it.

## Log in (once, on your own machine)

```sh
python3 ring_export.py login --token-file ~/.config/ring-export/token.json
```

You are prompted for your Ring email, then your password (hidden, via
`getpass`), then the 2FA code Ring sends you. The password and 2FA code are
never accepted as command-line arguments. If you pass `--password`,
`--token`, `--otp` or similar, the tool exits 2 before contacting Ring.

### Where the token lives

Only Ring's **refresh token** is saved: in the file you name with
`--token-file`, as `{"refresh_token": "..."}`. It is created with mode `0600`.
A missing parent directory is created with mode `0700`. Ring rotates the
refresh token whenever it is used. Each rotation is written back through a
`0600` temporary file that is then renamed over the old one (atomic), so a
crash cannot leave a half-written or world-readable token. The tool refuses
to use a token file that group or others can read. Treat the file like a
password, and keep it out of git. To revoke it, delete the file and remove
this tool's entry under Control Center → Authorized Client Devices in the
Ring app (or change your Ring password).

## Commands

```sh
TOKEN=~/.config/ring-export/token.json

# your own devices: id, name, kind, location id
python3 ring_export.py devices --token-file "$TOKEN" [--json]

# event history (paged with older_than, newest first), UTC timestamps
python3 ring_export.py events --token-file "$TOKEN" \
    [--device ID] [--since 2026-09-01] [--until 2026-09-30T23:59:59Z] \
    [--kind motion|ding|on_demand] --out events.csv   # or events.json

# recordings, byte-for-byte, with a hash-chained manifest
python3 ring_export.py download --token-file "$TOKEN" \
    --ids 7301234567890123456 7301234567890123457 --out-dir ring-recordings

# re-hash every file and check the chain
python3 ring_export.py verify --out-dir ring-recordings
```

`events` columns: `event_id, device_id, device_name, kind, created_at_utc,
duration_s, answered, recording_status`. Dates without a timezone are read as
UTC.

Paging options (`events`, `download`): `--page-size` (default 50),
`--page-delay` seconds slept between API pages (default 1.0, the rate limit),
and `--max-pages` (default 200).

### Manifest and verification

`download` writes each MP4 exactly as Ring served it, then appends one JSON
line per file to `manifest.jsonl` in the output directory:

| field | meaning |
| --- | --- |
| `event_id`, `device_id`, `device_name`, `kind` | which event |
| `created_at_utc` | when Ring recorded the event |
| `file`, `sha256`, `bytes` | the file and its hash and size |
| `retrieved_at_utc` | when this tool downloaded it |
| `prev_hash`, `chain_hash` | running hash chain |

`chain_hash = sha256(prev_hash + "\n" + canonical JSON of the line without
chain_hash)`, and the first line's `prev_hash` is 64 zeros. Re-running
`download` into the same directory skips ids already in the manifest and
extends the chain. It refuses to extend a directory that no longer verifies.

`verify` exits 1 if any file is missing, altered or resized, if any manifest
line is edited, removed or reordered, or if an `.mp4` in the directory is not
in the manifest. Publish `manifest.jsonl` (or its last `chain_hash`) alongside
the videos so others can check them.

The chain proves the files have not changed since you downloaded them. It does
not prove anything about Ring's servers. Anyone who can rewrite the whole
directory can rebuild a fresh chain, so keep a copy of the last `chain_hash`
somewhere you don't control alone, such as a published post or a commit.

## Exit codes

| code | meaning |
| --- | --- |
| 0 | everything asked for was done (or `verify` passed) |
| 1 | incomplete: `--max-pages` hit, an id not found, no recording, an API error, or `verify` failed |
| 2 | bad input or auth error: bad arguments, a secret on argv, a missing or insecure token file, or a rejected login or token |

## Before you publish

- **Other people appear in your footage.** Neighbours, passers-by, delivery
  drivers, children and licence plates are often in frame, and audio may
  capture conversations. Consider blurring faces and plates and muting audio
  before publishing. Check local privacy and recording laws (some places
  restrict publishing audio or footage of people without consent). Keep the
  original files and manifest unmodified, and publish edited copies as
  separate derived files.
- Exported metadata includes device names and location ids. Remove anything
  that reveals your home address if you don't want it public.

## Caveats

- `ring_doorbell` is an **unofficial**, reverse-engineered client. Ring can
  change its API at any time and break this tool.
- Ring's terms of service limit automated access to its services. Use this
  only for your own account, at a modest rate (keep `--page-delay`), and at
  your own risk. Ring may rate-limit or lock accounts that make too many
  requests.
- Ring keeps history and recordings only for your plan's retention window.
  Anything older is gone and cannot be exported.
- Intercom devices are not exported, because the library reports them as
  shared devices.
