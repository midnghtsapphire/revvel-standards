# Postman — manual API exploration

**What for:** poking APIs by hand, sharing collections across team, generating
curl/code snippets. This guide covers the Postman desktop workflow for manual
exploration; automated collection runs in CI, where needed, go through Newman.
**Free tier** is plenty for what we do here.

## Install (one-time)
- macOS / Windows / Linux: download from [postman.com/downloads](https://www.postman.com/downloads/).
- (Optional) sign in with a free account so collections sync across devices.

## Import the starter collection
1. Open Postman → **Collections** → **Import** → **File**.
2. Pick `postman/revvel-collections.postman_collection.json` from this repo.
3. The collection appears under "Revvel — starter collection".

## Set up an environment (optional but recommended)
Some requests use variables (`{{zip}}`, `{{leadEngineUrl}}`).
1. Postman → **Environments** → **+** → name it "Revvel".
2. Add:
   - `zip` = a ZIP code you want to probe (default `90210`)
   - `limit` = NPPES result cap (default `5`)
   - `leadEngineUrl` = your Vercel deployment URL once the lead-engine is live
3. Select "Revvel" in the env picker (top-right).

## What's in the starter collection
- **life-insurance-lead-engine → NPPES — providers by ZIP** — exercises the
  free public NPI Registry the lead-engine uses. Tests assert 200 + at least
  one result for a populated ZIP.
- **life-insurance-lead-engine → Live app — landing** — smoke-hits the
  deployed app once you've set `{{leadEngineUrl}}`.

## Why we keep it
- Closes the manual side of API work that Keploy can't help with (poking new
  endpoints to figure out their shape before writing tests).
- Collections are diffable JSON in the repo — anyone can pull and use them,
  no separate "Postman workspace" lock-in.
- Per the standards: cost = $0 (free tier), source-of-truth in repo.

## How to add a new request to the shared collection
1. In Postman, build/test the request.
2. Right-click the collection → **Export** → v2.1 → overwrite
   `postman/revvel-collections.postman_collection.json` in this repo.
3. Open a PR like any other change.
