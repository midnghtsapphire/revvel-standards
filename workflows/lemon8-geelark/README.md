# Workflow blueprint — Lemon8 publishing via GeeLark cloud phone

Reusable pattern for publishing to Android-only social platforms from CI without a physical
device. First implementation: `midnghtsapphire/manus` → `automation/lemon8-geelark/`.

## When to use

- The target platform has no posting API and its web app has no composer (Lemon8, some
  regional apps).
- You need a persistent, logged-in session with a stable device fingerprint.
- Volume is low (≤ a few posts/day) and human-quality accounts matter more than raw scale.

## Architecture

```
GitHub Actions (schedule + dispatch)
  ├─ deal scout → campaign folder (post.txt + slides)
  ├─ GeeLark OpenAPI: upload slides → cloud phone
  ├─ shell: uiautomator dump → input tap → ADB_INPUT_B64 → Post
  └─ evidence: runs/<ts>/report.json + screenshots → commit
```

See `architecture.md` for the sequence diagram and failure model.

## Files to copy into a target repo

| File | Purpose |
|---|---|
| `workflow.yml` | GitHub Actions: 2×/day schedule, manual modes, artifact + report commit |
| `selectors.json` | UI labels and ratio fallbacks — recalibrate per app version |
| `architecture.md` | Design notes, activation checklist |

## Required secrets

| Secret | Required | Notes |
|---|---|---|
| `GEElARK_APP_ID` | key mode | Team AppId from the GeeLark dashboard |
| `GEElARK_API_KEY` | key mode | Team ApiKey; sign = SHA256(appId+traceId+ts+nonce+apiKey) |
| `GEElARK_APP_TOKEN` | token mode | Alternative to the pair above |
| `GEElARK_PHONE_ID` | yes | Cloud phone to publish from; job skips cleanly when unset |

## Activation checklist

1. Cloud phone created (Android 12+, US region or US proxy) and started.
2. Target app installed; account signed in once via the GeeLark VNC console.
3. ADBKeyboard IME installed for unicode captions.
4. `--calibrate` run reviewed; `selectors.json` updated to the current app version.
5. Secrets set; dry-run dispatch green; first live run verified by screenshot.

## Guardrails

- Duplicate guard: a campaign with a `published` report is skipped unless `--force`.
- Max two posts/day; no proxy rotation after login; human handoff on verification walls.
- Every run commits a machine-readable report, so history is auditable.
- Never store credentials in the repo; screenshots stay in a private repo only.

## Cost notes

- GeeLark: subscription + per-phone billing.
- GitHub Actions private repos: 2,000 min/month free; 2 runs/day ≈ 300 min/month.
- GeeLark API limit: 200 req/min; a publish uses ~40 requests.
