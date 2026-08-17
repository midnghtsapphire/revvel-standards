# Ship to Market: Full Delivery Matrix for AI Agent Stacks

## Overview

Every work request (WR) produces an artifact that needs to ship somewhere. Most agent stacks handle code generation but leave the delivery layer — PDF, API, CLI, video, MCP server, app bundle, marketplace listing — completely unaddressed. This document maps every major output type to the correct toolchain, GitHub workflow trigger, agent action, and failure handoff so that "done" means shipped, not just merged.

---

## The Core Problem

When Copilot, OpenHands, or SWE-agent closes a WR by opening a PR, that PR contains code. What it does not contain is:

- a deployed endpoint,
- a packaged CLI binary,
- a rendered PDF or documentation artifact,
- a published npm/PyPI package,
- a video demo,
- a registered MCP server,
- an app store submission, or
- a working API with auth and rate limits.

Each of those requires a separate delivery workflow wired to the same WR trigger. The table below maps every output type to what needs to happen after the agent merges code.

---

## Delivery Matrix

| Output type | Trigger label | Agent action | Key toolchain | Auto or manual | Failure signal |
|---|---|---|---|---|---|
| **PDF / Report** | `deliver:pdf` | Render markdown/HTML to PDF, attach to PR or release | `pandoc`, `weasyprint`, `puppeteer`, GitHub Release asset | Auto | Missing release asset → comment on PR |
| **API (REST/GraphQL)** | `deliver:api` | Deploy to cloud, run smoke test, return live URL | Vercel, Railway, Render, Fly.io, AWS Lambda | Auto | Health check fails → comment + block merge |
| **App (web)** | `deliver:app` | Build bundle, deploy to CDN or hosting, return preview URL | Vercel, Netlify, Cloudflare Pages, Firebase Hosting | Auto | Deploy fails or build errors → comment on PR |
| **App (mobile)** | `deliver:mobile` | Build iOS/Android, upload to TestFlight / Play internal | Fastlane, Expo EAS, Bitrise | Semi-auto | Build failure → comment, human submits to store |
| **CLI tool** | `deliver:cli` | Build binary, publish to npm/PyPI/Homebrew, or attach to GitHub Release | `pkg`, `pyinstaller`, `ncc`, `oclif`, npm publish | Auto | Publish fails → comment with error |
| **npm / PyPI package** | `deliver:package` | Bump version, tag release, publish to registry | `semantic-release`, `release-please`, `twine`, `npm publish` | Auto | Registry auth fails → comment, human publishes |
| **PowerPoint / Deck** | `deliver:deck` | Generate PPTX/slide deck, export PDF if needed, attach artifact or publish deck link | `pptxgenjs`, Google Slides API, Marp/Reveal export | Auto | Deck render/export fails → comment with artifact gap |
| **Video / Demo** | `deliver:video` | Record screen or render from script, upload to YouTube/S3 | `ffmpeg`, `playwright` screen recording, `remotion`, `manim` | Semi-auto | Render fails → comment, human records |
| **MCP server** | `deliver:mcp` | Package server, register with MCP registry or deploy as endpoint, update manifest | Docker, Fly.io, MCP SDK, `mcp.json` manifest | Auto | Registration fails → comment with manifest diff |
| **Chrome extension** | `deliver:extension` | Zip, validate manifest, upload to Chrome Web Store draft | `web-ext`, CWS Upload API | Semi-auto | Validation fails → comment with lint output |
| **VS Code extension** | `deliver:vscode` | Build VSIX, publish to VS Marketplace | `vsce`, `@vscode/vsce` | Auto | Publish fails → comment with VSCE output |
| **GitHub Action** | `deliver:action` | Tag release, update `action.yml`, publish to GitHub Marketplace | `release-please`, GitHub Release | Auto | Missing `action.yml` → comment |
| **Docker image** | `deliver:docker` | Build image, push to registry (GHCR, Docker Hub, ECR) | `docker buildx`, `ghcr.io`, `docker push` | Auto | Push fails → comment with build log |
| **Documentation site** | `deliver:docs` | Build from markdown/JSDoc/OpenAPI spec, deploy to GitHub Pages or Vercel | `docusaurus`, `mintlify`, `nextra`, `mkdocs` | Auto | Build fails or broken links → comment |
| **OpenAPI spec** | `deliver:openapi` | Generate/validate spec, publish to API gateway or docs | `swagger-ui`, `redoc`, `zod-to-openapi`, `openapi-generator` | Auto | Spec validation errors → comment |
| **Database migration** | `deliver:migration` | Run migration in staging, validate schema, await human approval for prod | `prisma migrate`, `alembic`, `flyway` | Semi-auto | Migration fails → block deploy, comment |
| **Marketplace listing** | `deliver:marketplace` | Draft listing copy, screenshots, metadata — human reviews and publishes | Notion/Linear draft, store-specific tools | Manual | N/A — human always reviews before submit |

---

## GitHub Workflow Pattern

Every delivery type follows the same three-step wiring pattern inside `.github/workflows/`:

### Step 1 — Detect label on PR merge

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  deliver:
    if: github.event.pull_request.merged == true && contains(github.event.pull_request.labels.*.name, 'deliver:api')
```

### Step 2 — Run delivery action

Each delivery type has its own job. They can be in the same workflow file with different `if` conditions, or split into separate files per output type for clarity.

### Step 3 — Report result to the originating issue

Every delivery job ends with a success or failure comment on the originating issue, not just the PR, so the WR is fully closed or flagged in the place you opened it:

```yaml
- name: Report delivery result
  uses: actions/github-script@v7
  with:
    script: |
      const success = process.env.DELIVERY_STATUS === 'success';
      github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: success
          ? "✅ **Shipped.** Live URL: " + process.env.DEPLOY_URL
          : "⚠️ **Delivery failed.** [View logs](" + process.env.LOG_URL + ") — human review needed."
      });
```

---

## MCP Server Delivery (Detail)

MCP (Model Context Protocol) is the most underspecified delivery type in most agent stacks. A WR that produces an MCP server needs to:

1. Package the server using the MCP SDK (TypeScript or Python).
2. Generate or update `mcp.json` with the correct tool manifest, schema, and endpoint.
3. Deploy to a persistent runtime (Fly.io, Railway, or a Lambda with a public URL).
4. Register the endpoint with any MCP router or client config in the consuming application.
5. Run a smoke test: call one tool, verify the response schema.
6. Comment on the WR with the live endpoint, manifest diff, and tool list.

Label: `deliver:mcp`. If the smoke test fails, the workflow comments on the issue and does not complete the delivery — human jumps in.

---

## PDF / Documentation Delivery (Detail)

For WRs that produce research outputs, specs, or reports:

1. Agent writes output as markdown in `/docs/` or as a PR artifact.
2. `pandoc` or `puppeteer`/`weasyprint` renders to PDF.
3. PDF is attached to the GitHub Release for that version, or uploaded as a PR artifact.
4. A comment on the WR includes a direct download link.

For API documentation specifically, the preferred path is: OpenAPI spec → `redoc` or `swagger-ui` static build → deploy to GitHub Pages or docs subdomain.

---

## Video / Demo Delivery (Detail)

Video is the hardest to fully automate but is achievable for structured demos:

- **Playwright screen recording**: works for web app demos. The agent runs the app in headless Chromium, records the key user flow, and uploads the `.webm` to S3 or GitHub Release.
- **`remotion` or `manim`**: for programmatic video (code walkthroughs, animated diagrams). The agent writes the script, renders to MP4, uploads.
- **Manual recording**: if neither works, the workflow comments on the WR with a Loom or OBS recording checklist so the human knows exactly what to record.

Label: `deliver:video`. Failure path: workflow comments with recording checklist + draft YouTube metadata.

---

## Routing Profile to Delivery Type

Most WR routing profiles map naturally to one or more delivery types:

| Routing profile | Most likely delivery types |
|---|---|
| `repo_surgery` | `deliver:api`, `deliver:docker`, `deliver:migration` |
| `cheap_batch_edits` | `deliver:package`, `deliver:docs`, `deliver:openapi` |
| `hard_debug` | `deliver:api` (re-deploy after fix), `deliver:pdf` (incident report) |
| New feature | `deliver:app`, `deliver:api`, `deliver:docs`, `deliver:video` |
| CLI tool | `deliver:cli`, `deliver:package`, `deliver:docs` |
| MCP integration | `deliver:mcp`, `deliver:docs`, `deliver:openapi` |

---

## Updated WR Template (Delivery Extension)

Add this section to the existing WR template to capture delivery intent at the time the WR is opened, so the agent and workflow know what "done" looks like before they start:

```markdown
## Delivery targets
<!-- Check all that apply — these labels will trigger the matching delivery workflows after merge -->
- [ ] `deliver:api` — deploy live endpoint, return URL
- [ ] `deliver:app` — deploy web app, return preview URL
- [ ] `deliver:cli` — publish binary or npm/PyPI package
- [ ] `deliver:pdf` — render and attach PDF artifact
- [ ] `deliver:docs` — build and deploy documentation
- [ ] `deliver:openapi` — publish/update API spec
- [ ] `deliver:docker` — build and push Docker image
- [ ] `deliver:mcp` — package and deploy MCP server
- [ ] `deliver:video` — record or render demo video
- [ ] `deliver:package` — publish to npm / PyPI / Homebrew
- [ ] `deliver:deck` — generate PowerPoint / review / training deck artifact
- [ ] `deliver:extension` — build and upload Chrome / VS Code extension
- [ ] `deliver:action` — publish GitHub Action to Marketplace
- [ ] `deliver:marketplace` — draft store listing (human review required)
- [ ] `deliver:migration` — run and validate database migration

**If `deliver:video` is selected:**
- format: demo / training / review / YouTube / news-brand
- target length: <60s / 1–5 min / 5–15 min / 15+ min

**Definition of done for this WR:**
<!-- One sentence: what does "shipped" look like? -->
```

---

## Failure Handoff Protocol

No silent failures. Every delivery workflow follows the same protocol:

1. **Attempt delivery** — automated, no human needed.
2. **On success** — comment on originating issue with live URL, artifact link, or confirmation.
3. **On failure** — comment on originating issue with:
   - what was attempted,
   - the error summary,
   - a direct link to the workflow log,
   - the exact manual step needed to unblock.
4. **Label the issue** `needs-human` so it surfaces in triage.
5. **Never close the issue automatically on failure** — only close on confirmed successful delivery.

This protocol means you always know the state of every WR: delivered, failed with log, or waiting for human input. No guessing.

---

## What Was Missing Before

The original agent stack handled:

- ✅ Issue routing (labels, auto-assign)
- ✅ Code generation (OpenHands, SWE-agent)
- ✅ PR opening
- ✅ Code review (Augment Code)
- ❌ Deployment
- ❌ Packaging / publishing
- ❌ Documentation generation
- ❌ MCP registration
- ❌ Demo / video
- ❌ Marketplace submission
- ❌ Delivery confirmation back to originating issue

This document fills all of those gaps. Each `deliver:*` label added to a WR activates the matching post-merge workflow, and every outcome — success or failure — closes the loop on the originating issue.
