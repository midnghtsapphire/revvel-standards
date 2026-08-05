# Pack workflows (land via PR; do not force-push over fleet)

| File | Purpose | Collides with live? |
|---|---|---|
| `pr-governance-checks.yml` | PR allowlist + formal soft schema | New |
| `label-allowlist.yml` | Fail unknown labels + sticky comment | New (compose with `sync-labels` / `arsc-labels`) |
| `formal-auto-wr.yml` | Formal → WR artifacts; no merge | New |
| `agent-scorecard-governance.yml` | Pack privilege scorecard | **Named to avoid** live `agent-scorecard.yml` |

Auth model: see `standards/GITHUB_AUTH_TOKEN_MATRIX.md`.
Actions write via `GITHUB_TOKEN`. Grok connector is separate (currently read-only App token).
