# DELIVERY_MATRIX

> Full delivery matrix for shipping WR (Working Release) artifacts across API, PDF, CLI, MCP, video, and other channels.

## Purpose

Agent stacks generate code; the delivery matrix defines **how that code becomes a consumable artifact** in each target channel.

## Who/When/Why

- **Who:** Claude (openhands)
- **When:** 2026-05-06
- **Why:** Complete the delivery layer for AI agent stacks

---

## Matrix Overview

| Channel | Trigger Label | Toolchain | Output | Verification |
|---------|---------------|-----------|--------|--------------|
| API | `ship:api` | OpenAPI + server framework | Running endpoint | Contract test |
| PDF | `ship:pdf` | Pandoc / Typst / LaTeX | `.pdf` in Release | Checksum + render check |
| CLI | `ship:cli` | Language toolchain + packager | Binary / package | `--version` + smoke test |
| MCP | `ship:mcp` | MCP SDK | MCP server manifest | Handshake test |
| Video | `ship:video` | ffmpeg / remotion / CI | `.mp4` / stream URL | Duration + codec check |
| Library | `ship:lib` | Language package manager | Published package | Install + import test |
| Container | `ship:image` | Docker / buildx | Registry image | Pull + run test |
| Site | `ship:site` | Static generator + host | Deployed URL | HTTP 200 + lighthouse |
| Dataset | `ship:data` | Data pipeline | Versioned dataset | Schema + row count |

---

## 1. API Delivery

**Trigger:** `ship:api`

**Toolchain:**
- OpenAPI spec (`openapi.yaml`)
- Server framework (FastAPI, Express, etc.)
- Deploy target (Fly.io, Render, AWS, etc.)

**Workflow:**
1. Validate OpenAPI spec.
2. Build server.
3. Deploy to target.
4. Run contract tests against live endpoint.
5. Publish endpoint URL to release notes.

**Failure handoff:** If deploy fails, capture logs, label `agent:blocked`.

---

## 2. PDF Delivery

**Trigger:** `ship:pdf`

**Toolchain:**
- Source: Markdown / Typst / LaTeX
- Renderer: Pandoc, Typst, or TeX
- Output: GitHub Release asset or S3

**Workflow:**
1. Render source to PDF in CI.
2. Compute SHA256 checksum.
3. Attach PDF + checksum to Release.
4. Verify render (page count > 0, no render errors).

---

## 3. CLI Delivery

**Trigger:** `ship:cli`

**Toolchain:**
- Language-appropriate packager (cargo, go build, pyinstaller, pkg, etc.)
- Multi-arch build matrix

**Workflow:**
1. Build binaries for target platforms.
2. Sign (if applicable).
3. Attach to Release.
4. Smoke test: `binary --version` on each platform.

---

## 4. MCP Delivery

**Trigger:** `ship:mcp`

**Toolchain:**
- MCP SDK (TypeScript or Python)
- Transport: stdio or HTTP
- Manifest: `mcp.json`

**Workflow:**
1. Build MCP server.
2. Validate manifest schema.
3. Run handshake test (initialize + list_tools).
4. Publish to MCP registry or release.

---

## 5. Video Delivery

**Trigger:** `ship:video`

**Toolchain:**
- ffmpeg, Remotion, or Manim
- CI with GPU (optional)
- CDN or YouTube upload

**Workflow:**
1. Render video from source (code, script, assets).
2. Verify duration and codec with ffprobe.
3. Upload to target (CDN / YouTube / S3).
4. Publish URL to release notes.

---

## 6. Library Delivery

**Trigger:** `ship:lib`

**Toolchain:**
- Language package manager (npm, PyPI, crates.io, etc.)
- Signing keys in CI secrets

**Workflow:**
1. Bump version.
2. Build package.
3. Publish to registry.
4. Verify: install in fresh env + import smoke test.

---

## 7. Container Delivery

**Trigger:** `ship:image`

**Toolchain:**
- Docker buildx (multi-arch)
- Registry: GHCR / Docker Hub

**Workflow:**
1. Build multi-arch image.
2. Tag: `:latest`, `:<semver>`, `:<sha>`.
3. Push to registry.
4. Verify: pull + run + healthcheck.

---

## 8. Site Delivery

**Trigger:** `ship:site`

**Toolchain:**
- Static generator (Hugo, Astro, Next.js, etc.)
- Host: Pages / Netlify / Vercel / Cloudflare

**Workflow:**
1. Build site.
2. Deploy.
3. Verify HTTP 200 on key routes.
4. Run Lighthouse (optional).

---

## 9. Dataset Delivery

**Trigger:** `ship:data`

**Toolchain:**
- Data pipeline (dbt, Airflow, custom)
- Versioning (DVC, LakeFS, or dated S3 paths)

**Workflow:**
1. Run pipeline.
2. Validate schema + row counts.
3. Publish versioned artifact.
4. Update dataset manifest.

---

## Failure Handoff Protocol

Each channel MUST:

1. Capture full logs on failure.
2. Apply `agent:blocked` label.
3. Comment with:
   - Channel attempted
   - Command/step that failed
   - Error output (trimmed to relevant lines)
   - Suggested remediation
4. Preserve partial artifacts for inspection.

---

## Verification Checklist

Before marking a WR as shipped, confirm:

- [ ] Artifact exists at published location
- [ ] Checksum / signature recorded
- [ ] Smoke test passed
- [ ] Release notes updated
- [ ] Trigger label removed, `shipped` label applied

---

## See Also

- `standards/AGENT_STACK_SETUP.md`
