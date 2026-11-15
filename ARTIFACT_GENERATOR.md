# Artifact Generator Standard

> **Version:** 1.0.0  
> **Status:** SINGLE SOURCE OF TRUTH (SSOT)  
> **Authority:** MASTER.md §2  
> **Owner:** Audrey Evans (MIDNGHTSAPPHIRE)  
> **Governed by:** UPREV_METHOD.md (Max Over Minimum pillar)  

---

## Purpose

Every product-class WR must produce a complete artifact package across all surfaces. This document defines what artifacts are required, their specifications, and how they are generated.

**Rule:** No product ships without its full artifact package. Skeletons are rejected.

---

## Artifact Surfaces

A "surface" is a delivery channel or format. Every product must support the surfaces relevant to its domain.

| Surface | Description | Required For |
|---------|-------------|-------------|
| **Web** | Browser-accessible application or site | All products |
| **Mobile** | iOS / Android app (Capacitor, React Native, native) | Consumer-facing products |
| **CLI** | Command-line interface | Developer tools, automation |
| **API** | REST / GraphQL / gRPC endpoint | Backend services, integrations |
| **MCP** | Model Context Protocol server | Agent-facing tools |
| **PDF** | Printable document, booklet, or report | User guides, research, compliance |
| **Skill** | Reusable agent skill (SKILL.md) | Agent-facing features |
| **Extension** | Browser extension, VS Code extension, etc. | Tool integrations |
| **Docker** | Containerized deployment | All backend services |
| **GitHub Action** | Reusable workflow | CI/CD, automation |

---

## Artifact Package Specification

### Core Artifacts (Every Product)

#### 1. README.md

```markdown
# {Product Name}

> One-line value proposition.

## Quick Start
<!-- 3 commands to running -->

## Features
<!-- Bullet list of key features -->

## Installation
<!-- Step-by-step install -->

## Usage
<!-- Code examples -->

## API Reference
<!-- Link to OpenAPI spec or inline docs -->

## Configuration
<!-- Environment variables, config files -->

## Testing
<!-- How to run tests -->

## Deployment
<!-- How to deploy -->

## Contributing
<!-- Link to standards -->

## License
<!-- License file -->
```

**Rules:**
- One H1 only
- No scaffolding, no placeholders
- Every code block is runnable
- Every link is valid

#### 2. LEDGER.md

Per `standards/LEDGER_STANDARD.md`:

```markdown
# LEDGER — {Product Name}

## Entry YYYY-MM-DD
- **Who:** @agent-name
- **What:** Description of work
- **Files:** List of files changed
- **Decisions:** Why choices were made
- **Sources:** URLs, papers, repos referenced
- **Blockers:** Anything that slowed progress
- **Next:** What comes next
```

**Rules:**
- Updated in the same commit as the work
- Used for AI crediting and handoff
- Never deleted or rewritten

#### 3. Library/

Per `REPO_LIBRARY_STANDARD.md`:

```
Library/
├── sources/
│   ├── papers/          # Academic papers (PDFs)
│   ├── repos/           # Cloned / forked repos
│   ├── docs/            # Official documentation
│   └── data/            # Datasets, benchmarks
├── notes/
│   ├── research/        # Research notes
│   ├── decisions/       # Decision records
│   └── experiments/     # Experiment results
└── index.md             # Catalog of all sources
```

**Rules:**
- Every source has a citation
- Every citation has a context note
- Index.md is auto-generated where possible

#### 4. Tests

| Test Type | Coverage Target | Tools |
|-----------|----------------|-------|
| Unit | >80% | Jest, pytest, vitest |
| Integration | All critical paths | Playwright, Cypress, supertest |
| Property-based | Complex logic | fast-check, hypothesis |
| Visual regression | UI components | Chromatic, Percy |
| Performance | Baseline + regression | Lighthouse, k6 |
| Security | OWASP Top 10 | Semgrep, CodeQL, Snyk |

#### 5. OpenAPI Spec (if API)

```yaml
openapi: 3.1.0
info:
  title: {Product Name} API
  version: 1.0.0
  description: |
    {Value proposition}

    ## Authentication
    {Auth method}

    ## Rate Limits
    {Limits}

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-staging.example.com/v1
    description: Staging

paths:
  /endpoint:
    get:
      summary: {What it does}
      description: {Detailed description}
      parameters: []
      responses:
        200:
          description: Success
          content:
            application/json:
              schema: {}
        400:
          description: Bad Request
        401:
          description: Unauthorized
        500:
          description: Server Error
```

**Rules:**
- Every endpoint documented
- Every schema defined
- Error codes explained
- Examples for every request/response

#### 6. Dockerfile + Docker Compose

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

**Rules:**
- Multi-stage build
- Non-root user
- Health check
- Minimal final image
- No secrets in image

#### 7. GitHub Actions Workflows

Every product repo needs:

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Test, lint, build on every PR |
| `deploy.yml` | Deploy to staging/production |
| `security-scan.yml` | SAST, dependency audit, secret scan |
| `docs-check.yml` | Verify README links, OpenAPI validity |

#### 8. Monitoring Configuration

```yaml
# alerts.yml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    action: page_oncall

  - name: high_latency
    condition: p99_latency > 500ms
    duration: 10m
    severity: warning
    action: slack_alert

  - name: low_availability
    condition: availability < 99.9%
    duration: 2m
    severity: critical
    action: page_oncall
```

**Rules:**
- Every critical path has an alert
- Alerts have runbook links
- Severity maps to response time (P0 = 5 min, P1 = 30 min, P2 = 4 hours)

---

## Surface-Specific Artifacts

### Web Surface

| Artifact | Spec | Required |
|----------|------|----------|
| `index.html` | Semantic HTML, accessibility (WCAG 2.1 AA) | Yes |
| CSS | Design system tokens, responsive, dark mode | Yes |
| JS/TS | Framework-agnostic where possible, <100KB initial bundle | Yes |
| PWA manifest | Icons, theme, offline capability | Recommended |
| Sitemap | XML sitemap for SEO | Yes |
| Robots.txt | Crawl rules | Yes |

### Mobile Surface

| Artifact | Spec | Required |
|----------|------|----------|
| iOS build | Xcode project, App Store metadata | If iOS |
| Android build | Gradle project, Play Store metadata | If Android |
| Capacitor config | `capacitor.config.ts` | If Capacitor |
| App icons | All required sizes per platform | Yes |
| Splash screen | Branded, fast load | Yes |
| Deep links | Universal links / app links | Recommended |

### CLI Surface

| Artifact | Spec | Required |
|----------|------|----------|
| Binary | Single executable or `npx` runnable | Yes |
| `--help` | Comprehensive help text | Yes |
| `--version` | Version flag | Yes |
| Man page | `man {command}` | Recommended |
| Shell completion | Bash, Zsh, Fish | Recommended |
| Config file | YAML/JSON/TOML, validated | Yes |

### API Surface

| Artifact | Spec | Required |
|----------|------|----------|
| OpenAPI spec | `openapi.yaml` at root | Yes |
| Postman collection | For manual testing | Recommended |
| SDK (if public) | TypeScript, Python, Go | If public API |
| Rate limit docs | Headers, limits, retry strategy | Yes |
| Changelog | API versioning and breaking changes | Yes |

### MCP Surface

| Artifact | Spec | Required |
|----------|------|----------|
| `mcp/manifest.json` | Tool definitions, input/output schemas | Yes |
| `SKILL.md` | Agent skill documentation | Yes |
| Sandbox config | Execution limits, timeout, permissions | Yes |
| Example prompts | 3+ example conversations | Recommended |

### PDF Surface

| Artifact | Spec | Required |
|----------|------|----------|
| Source (Markdown/LaTeX) | Version-controlled source | Yes |
| Generated PDF | Print-ready, accessible | Yes |
| Cover page | Branded, title, version, date | Yes |
| Table of contents | Linked, auto-generated | Yes |
| Page numbers | Footer, consistent | Yes |

### Skill Surface

Per `docs/AGENT_SPECIALTY_SKILLS_STANDARD.md`:

```markdown
# SKILL — {Skill Name}

## Purpose
What this skill does and when to use it.

## Prerequisites
What must be true before using this skill.

## Input
Expected input format and validation rules.

## Output
Expected output format and validation rules.

## Steps
1. Step one
2. Step two
3. Step three

## Examples
### Example 1: {Scenario}
```input
{example input}
```
```output
{example output}
```

## Error Handling
What to do when things go wrong.

## References
Links to docs, standards, and related skills.
```

---

## Artifact Generation Pipeline

```
WR Intake
    ↓
ARTIFACT_GENERATOR.md — Determine required surfaces
    ↓
Per-surface generator — Produce artifacts
    ↓
wr-lint.mjs — Validate artifact completeness
    ↓
PR with full artifact package
```

### Generator Rules

1. **Deterministic**: Same WR → same artifact set (modulo content)
2. **Complete**: No surface is half-implemented
3. **Consistent**: All artifacts follow the same design system, naming conventions, and standards
4. **Versioned**: Every artifact has a version that matches the product version
5. **Tested**: Every artifact has a validation step

---

## Quality Gates

### Artifact Completeness Gate

```bash
npx artifact-lint --wr=WR-NNNNN --surfaces=web,api,mcp
```

Checks:
- [ ] All required surfaces have artifacts
- [ ] No scaffolding in any artifact
- [ ] All links are valid
- [ ] All code examples are runnable
- [ ] All tests pass
- [ ] All docs are accurate

### Surface-Specific Gates

| Surface | Gate | Tool |
|---------|------|------|
| Web | Lighthouse score >90 | Lighthouse CI |
| Mobile | App Store / Play Store compliance | fastlane |
| CLI | `--help` exits 0, man page renders | shellcheck, man |
| API | OpenAPI validation, contract tests | spectral, schemathesis |
| MCP | Manifest validation, sandbox test | custom validator |
| PDF | Accessibility, print test | veraPDF, Acrobat |

---

## Invariants

1. Every product-class WR produces a complete artifact package.
2. No surface is shipped with scaffolding.
3. Every artifact is versioned and tested.
4. The artifact package is validated by `wr-lint.mjs` before merge.
5. LEDGER.md and Library/ are updated in the same commit.

---

*Last updated: 2026-11-09*  
*Next review: When new surfaces are added or artifact standards change*
