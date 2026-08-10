# Markdown Image Alt-text Checker (WR #16270)

Accessibility + SEO gate for markdown images.

## What it does

Flags markdown image syntax that is missing inline alt-text:

```markdown
<!-- bad — empty alt -->
![](https://example.com/chart.png)

<!-- good -->
![bar chart of monthly revenue](https://example.com/chart.png)
```

## Why two lanes

| Lane | When it runs | Role |
| --- | --- | --- |
| **Local script** `scripts/markdown-image-alt-text-checker.js` | Every PR/push that touches `*.md` | **Authoritative gate.** Fast checkout walk with the same excludes as `lint-md.yml`. |
| **Marketplace action** `ruthtxh/markdown-image-alt-text-checker@v1` | `workflow_dispatch` only | Satisfies the WR wiring; optional Azure Computer Vision suggestions. |

The marketplace action walks the **entire** git tree via the GitHub Contents API.
This monorepo has thousands of markdown files (WR packets, agent transcripts),
so running that walk on every PR would thrash rate limits. The local script is
the PR-blocking check; the marketplace step stays available for manual audits.

## Workflow

[`.github/workflows/markdown-image-alt-text-checker.yml`](../.github/workflows/markdown-image-alt-text-checker.yml)

- Triggers: `pull_request` / `push` to `main` (path-filtered to `**/*.md`) + `workflow_dispatch`
- Permissions: `contents: read`, `checks: write`
- Action pin: `ruthtxh/markdown-image-alt-text-checker@a30c7afd02e2af7048f4e84f06e2f422052e2153` (`# v1`)
- Runtime force: `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` (upstream still declares `node16`)

## Optional Azure suggestions

The marketplace action can call Azure Computer Vision when both are set as
Actions secrets (names only — never commit values):

| Secret | Purpose |
| --- | --- |
| `AZURE_COMPUTER_VISION_KEY` | API key for a Computer Vision resource |
| `AZURE_COMPUTER_VISION_ENDPOINT` | e.g. `https://YOUR_RESOURCE.cognitiveservices.azure.com` |

Create the resource in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision),
then add the secrets under **Settings → Secrets and variables → Actions**.

## Third-party disposition

- Publisher tier: **single-author** (`ruthtxh`)
- Last upstream release: **2023-04-21** (`v1`)
- Disposition (per [`THIRD_PARTY_ACTION_AUDIT.md`](./THIRD_PARTY_ACTION_AUDIT.md)):
  pin full commit SHA + accept the exact `owner/repo` in
  `ACCEPTED_SINGLE_AUTHOR_ACTIONS` so the quarterly audit does not reopen a WR.
  Local script remains the required gate so an abandoned upstream cannot stick
  a blocking check (lesson from `sanjay3290/jules-pr-reviewer`).

## Local usage

```bash
# Scan the whole repo (respects default excludes)
node scripts/markdown-image-alt-text-checker.js

# Point at a subdirectory
ROOT=./docs node scripts/markdown-image-alt-text-checker.js
```

Exit code `0` = clean, `1` = one or more empty-alt images (or I/O error).

## Tests

`tests/markdown-image-alt-text-checker.test.js` — scanner unit tests + workflow
wiring (SHA pin, dispatch-only marketplace step, permissions).
