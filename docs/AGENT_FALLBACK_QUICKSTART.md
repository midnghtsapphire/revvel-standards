# Agent Fallback Quickstart

This guide describes how to configure the multi-agent fallback lane used by
automation in this repository. The fallback lane lets us route work to a
primary agent (Devin) and fall back to a secondary agent (Cursor) when the
primary is unavailable or over budget.

## Prerequisites

- A POSIX-compatible shell (`bash` recommended)
- `curl` available on `PATH`
- API credentials for each agent you plan to enable (see below)

## System-provided scripts

The repository ships with the following agent driver scripts under `scripts/`:

- `scripts/call-devin-api.sh` — primary lane, Devin API driver
- `scripts/call-cursor-api.sh` — fallback lane, Cursor API driver

> **Note:** Earlier revisions of this document referenced
> `scripts/call-openhands-api.sh` (and its `call-OpenHands-api.sh` variant).
> That script has been removed from the fallback lane. If you have local
> automation or onboarding notes that still reference it, update them to use
> the Devin or Cursor drivers above. Setup will no longer attempt to
> `chmod +x` a missing OpenHands driver.

## One-time setup

Run the setup helper from the repository root:

```bash
./scripts/setup-agent-fallback.sh
```

This will:

1. Ensure the current list of driver scripts is executable
   (`call-devin-api.sh`, `call-cursor-api.sh`).
2. Print a summary of which lanes are configured based on the environment
   variables it detects.
3. Emit a clear warning — not a hard failure — if it encounters a reference to
   a legacy script name such as `call-openhands-api.sh` or
   `call-OpenHands-api.sh`, and point you at this document.

## Environment variables

Each lane is enabled by exporting its credentials before invoking automation:

| Lane   | Required variables                          |
| ------ | ------------------------------------------- |
| Devin  | `DEVIN_API_KEY`                             |
| Cursor | `CURSOR_API_KEY`                            |

Unset variables simply disable that lane; they are not an error.

## Migrating from the OpenHands lane

If your workflow previously called `scripts/call-openhands-api.sh` (or the
capitalized `call-OpenHands-api.sh`), migrate as follows:

1. Replace the invocation with `scripts/call-devin-api.sh` for the primary
   lane, or `scripts/call-cursor-api.sh` for the fallback lane.
2. Remove any `chmod +x` lines that target the old filename.
3. Update any CI configuration or runbooks that reference the old path.

See `scripts/setup-agent-fallback.sh` for the authoritative list of scripts
that are wired into the fallback lane today.

## Troubleshooting

- **"not found" for `call-openhands-api.sh`** — expected on current `main`;
  the script has been removed. Update your local references per the
  migration section above.
- **Setup reports a lane as disabled** — export the corresponding API key
  and re-run `./scripts/setup-agent-fallback.sh`.
- **Permission denied when invoking a driver** — re-run the setup script,
  which will restore executable bits on the current driver set.
