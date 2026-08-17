# Skill: OpenClaw E-E-A-T Content Distribution

**Skill Name:** `openclaw-eeat`  
**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Beta  
**Category:** Content & Marketing  
**LLM:** Claude Sonnet 4.5 (primary) / Claude Haiku 4.5 (fast)  
**Type:** Ephemeral — spawned on demand, terminates after content is generated/queued  
**Persona:** 🌐 Echo

---

## Purpose

**OpenClaw E-E-A-T** is the automated brand content distribution skill that takes your brand statement and project descriptions and formats them for multiple high-value platforms to establish **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness) — Google's quality signals for search ranking and Knowledge Graph eligibility.

This skill exists because manually maintaining consistent brand presence across 15+ deep-web nodes (ORCID, Wikidata, ResearchGate, etc.) is time-consuming and error-prone. OpenClaw E-E-A-T automates the formatting, generates platform-specific schemas (JSON-LD, RDF, custom APIs), and either drafts submissions for review or queues them for automated posting where APIs permit.

**Key Insight:** These platforms aren't just profile directories — they're **direct feeds into Google's Knowledge Graph, academic crawlers, OSINT tools, and intelligence community databases**. Claiming and filling them correctly is the single highest-leverage move for establishing verifiable expertise.

---

## What This Skill Does

| Task | Description |
|---|---|
| **Intake** | Accept brand statement + project descriptions (markdown or YAML) |
| **Tier Classification** | Classify each platform into Tier 1 (already have foothold), Tier 2 (high-value deep web), or Tier 3 (OSINT/intelligence) |
| **Format** | Transform content to each platform's schema (JSON-LD, ORCID XML, Wikidata RDF, plain forms) |
| **Validate** | Check required fields, WCAG compliance, URL liveness, credential references |
| **Queue or Draft** | For platforms with APIs: queue via n8n/MCP. For manual: generate markdown draft with instructions |
| **Output** | Emit platform-specific files to `openclaw-eeat/output/<platform>/` directory |
| **Track** | Maintain `state.json` showing which platforms are claimed, pending, or need refresh |

---

## Supported Platforms

### Tier 1 — Build on Existing Foothold

| Platform | Format | Auto-Submit? | Notes |
|---|---|---|---|
| **ORCID** | ORCID XML API | ✅ Yes (with token) | Fill: works, employment, education, websites. Auto-feeds Google Scholar, ResearchGate |
| **GitHub** | README.md + profile | ✅ Yes (via API) | Already integrated. Indexed by package registries, code search engines |

### Tier 2 — High-Value Deep Web Nodes

| Platform | Format | Auto-Submit? | Notes |
|---|---|---|---|
| **Wikidata** | RDF/Wikidata JSON | ⚠️ Draft only | Create entity for researcher/developer. **Direct feed to Google Knowledge Graph** |
| **ResearchGate** | Web form | ⚠️ Draft only | Even non-academic work qualifies as applied research |
| **Internet Archive** | Web form + upload | ⚠️ Draft only | Publish brand statement as citable document |
| **Crunchbase** | Web form + API | ⚠️ Partial | Claim/create profile for business entities |
| **OpenCorporates** | Claim existing | ⚠️ Draft only | Colorado entity should already exist; claim it |
| **Semantic Scholar** | Auto-indexed from ORCID | ✅ Auto | Links to ORCID, good for intelligence/research angle |

### Tier 3 — OSINT & Intelligence Community

| Platform | Format | Auto-Submit? | Notes |
|---|---|---|---|
| **MISP Communities** | MISP JSON | ⚠️ Draft only | GrowlingEyes threat intel sharing |
| **IntelligenceX** | Profile registration | ⚠️ Draft only | Researcher presence in OSINT tooling |
| **Maltego** | Entity + transforms | ⚠️ Draft only | Public researcher profile |
| **Bellingcat** | Community profile | ⚠️ Draft only | Forensic geospatial work (Sun Peaks SAR) |

---

## Trigger Keywords

```text
openclaw eeat, eeat agent, distribute brand content, knowledge graph,
wikidata entity, orcid update, researchgate profile, brand distribution,
platform content, deep web presence, osint profile, intelligence community,
google knowledge panel, eeat signals, expertise signals
```

---

## Workflow

1. **Load session-start skills** — `system-state`, `model-router`, `vault-agent` (for API keys)
2. **Read brand inputs**:
   - `brand-statement.md` or `brand.yml` (name, tagline, expertise areas, URLs, credentials)
   - `projects/*.md` (project descriptions, tech stack, outcomes)
3. **Classify platforms**:
   - Tier 1: already active, update content
   - Tier 2: high priority, generate full profiles
   - Tier 3: situational, only if OSINT/research relevance is strong
4. **Format content** for each platform using templates from `openclaw-eeat/templates/`
5. **Validate**:
   - Required fields present
   - URLs reachable (HTTP 200 check)
   - Credentials available (via `vault-agent`, no value reads)
   - JSON/XML schema valid
6. **Output**:
   - API-ready: write to `output/<platform>/payload.json` + queue instructions
   - Manual: write to `output/<platform>/draft.md` with step-by-step instructions
7. **State tracking**: update `state.json` with status per platform
8. **Report**: emit summary markdown showing what was created, what needs manual action

---

## Input Schema

### Brand Statement (`brand-statement.md` or `brand.yml`)

```yaml
brand:
  name: "MIDNGHTSAPPHIRE / Audrey Evans"
  legal_entity: "Freedom Angel Corps LLC"
  tagline: "Intelligence • Geospatial • Software • SAR"
  expertise_areas:
    - "OSINT & Threat Intelligence"
    - "Geospatial Analysis & Forensics"
    - "AI Agent Systems & Automation"
    - "Search & Rescue Operations"
  urls:
    primary: "https://github.com/midnghtsapphire"
    portfolio: "https://growlingeyes.com"
    research: "https://orcid.org/[ID]"
  credentials:
    - "Colorado SAR Volunteer (Sun Peaks 2025)"
    - "20+ years software engineering"
    - "Certified OSINT Practitioner"
  contact:
    email: "via GitHub"
    location: "Colorado, USA"
  projects:
    - name: "GrowlingEyes"
      description: "OSINT & threat intelligence platform"
      url: "https://github.com/midnghtsapphire/growlingeyes"
    - name: "Neurooz"
      description: "AI-powered brain health tracking"
      url: "https://github.com/midnghtsapphire/neurooz"
    - name: "Revvel Standards"
      description: "Universal AI agent operating standards"
      url: "https://github.com/midnghtsapphire/revvel-standards"
```

### Project Description Template

Each `projects/<name>.md` should include:
```markdown
# [Project Name]

**Category:** [OSINT / Geospatial / AI / SAR / Finance / etc.]  
**Status:** [Active / Beta / Archived]  
**URL:** [GitHub URL]

## One-Line Pitch
[One sentence description]

## Problem Solved
[What problem this addresses]

## Tech Stack
- [Technology 1]
- [Technology 2]

## Outcomes / Impact
- [Measurable outcome 1]
- [Measurable outcome 2]

## Relevance to E-E-A-T
[How this demonstrates expertise/authority/trust]
```

---

## Output Schema

### State Tracking (`openclaw-eeat/state.json`)

```json
{
  "last_run": "2026-04-30T12:00:00Z",
  "brand_snapshot_hash": "abc123",
  "platforms": {
    "orcid": {
      "tier": 1,
      "status": "claimed",
      "last_updated": "2026-04-15T10:00:00Z",
      "next_action": "update_works",
      "auto_submit": true
    },
    "wikidata": {
      "tier": 2,
      "status": "pending",
      "last_updated": null,
      "next_action": "create_entity",
      "auto_submit": false,
      "draft_path": "output/wikidata/draft.md"
    },
    "researchgate": {
      "tier": 2,
      "status": "draft_ready",
      "last_updated": "2026-04-30T12:00:00Z",
      "next_action": "manual_submit",
      "auto_submit": false,
      "draft_path": "output/researchgate/profile-draft.md"
    }
  }
}
```

### Platform Output Structure

```text
skills/openclaw-eeat/
  output/
    orcid/
      works.xml              # ORCID Works API payload
      employment.xml         # ORCID Employment API payload
      instructions.md        # How to submit via API or web
    wikidata/
      entity-draft.md        # Step-by-step Wikidata entity creation
      claims.json            # Wikidata claims in JSON format
      references.md          # Citations and source URLs
    researchgate/
      profile-draft.md       # Form-fill instructions
      publications.csv       # Publications list
    github/
      profile-update.md      # README.md enhancements
      pinned-repos.json      # Recommended pinned repos
    crunchbase/
      entity-draft.md        # Company profile submission draft
    archive-org/
      upload-package.zip     # Brand statement + projects as citable docs
      submission-guide.md    # Upload instructions
    misp/
      profile-draft.md       # MISP community profile
      threat-intel.json      # Sample threat intel contribution
    bellingcat/
      profile-draft.md       # Community profile draft
      sar-case-study.md      # Sun Peaks SAR brief formatted for Bellingcat
```

---

## Templates

Templates live in `skills/openclaw-eeat/templates/` and include:

1. **JSON-LD Schemas**:
   - `organization.jsonld` — Schema.org Organization
   - `person.jsonld` — Schema.org Person
   - `research-project.jsonld` — Schema.org ResearchProject

2. **Platform-Specific**:
   - `orcid-works.xml` — ORCID Works XML template
   - `wikidata-entity.md` — Wikidata entity creation guide
   - `researchgate-profile.md` — ResearchGate profile form guide
   - `archive-org-submission.md` — Internet Archive submission guide

3. **OSINT/Intelligence**:
   - `misp-profile.json` — MISP community profile
   - `maltego-entity.json` — Maltego entity definition
   - `bellingcat-profile.md` — Bellingcat community profile

---

## Agent Instructions (System Prompt)

```text
You are Echo 🌐 — the OpenClaw E-E-A-T content distribution specialist.

## Your Core Rules

1. Read brand statement and project descriptions first. Never proceed without them.

2. Classify platforms by tier. Only generate Tier 3 content if OSINT/research
   relevance is explicitly strong (e.g., GrowlingEyes for MISP/Bellingcat).

3. For each platform:
   - Load the template from templates/<platform>/
   - Fill with brand data, respecting character limits and required fields
   - Validate schema (JSON-LD, XML, RDF) before writing
   - Check URL liveness for all external references
   - Never invent credentials or publications

4. API submission requires vault-agent to confirm credential availability.
   Never read secret values. If credential is missing, mark as "draft_only"
   and write instructions for manual setup.

5. Wikidata is THE highest-leverage platform. Generate it first. Include:
   - Occupation (Q-codes for researcher, software developer, SAR volunteer)
   - Official website, ORCID, GitHub
   - Notable works with external references
   - Draft must be human-reviewable before submission (no direct API)

6. JSON-LD must be valid schema.org. Test with https://validator.schema.org/
   before finalizing.

7. Output structure:
   - All files to openclaw-eeat/output/<platform>/
   - Update state.json after each platform
   - Emit summary.md listing what was created and what needs manual action

8. Never spam. If a platform was updated < 30 days ago (per state.json) and
   brand content hasn't changed (hash match), skip it and mark "up_to_date".

9. Sign off with:
   "🌐 Echo — E-E-A-T content distribution complete. [N] platforms ready,
   [M] need manual action. See summary.md for details."
```

---

## Validation Rules

1. **Brand Statement Required Fields**:
   - name, tagline, expertise_areas (≥ 3), urls.primary, credentials (≥ 1)

2. **Project Required Fields**:
   - name, description, status, tech_stack (≥ 2), outcomes (≥ 1)

3. **URL Liveness**:
   - All URLs in brand statement must return HTTP 200
   - Fail gracefully with warning if URL is unreachable

4. **Schema Validation**:
   - JSON-LD: must pass schema.org validator
   - ORCID XML: must pass ORCID API schema check
   - Wikidata JSON: must have valid Q-codes for claims

5. **Credential Verification**:
   - vault-agent confirms env var exists (does NOT read value)
   - If missing, downgrade to draft_only mode

---

## Dependencies

| Dependency | Required? | Purpose | Notes |
|---|---|---|---|
| `vault-agent` | ✅ Required | API key availability check | Never reads values |
| `seo-metadata` | ✅ Required | JSON-LD generation | Reuses templates |
| `system-state` | ✅ Required | Session initialization | Standard skill |
| n8n or MCP | ⚠️ Optional | Automated submission queue | For API-enabled platforms |
| xmllint | ⚠️ Optional | XML validation | For ORCID payloads |
| jq | ⚠️ Optional | JSON validation | For JSON-LD/Wikidata |

---

## Usage Examples

### Example 1: Generate all platform content

```bash
# Via skill invocation
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --projects "projects/*.md" \
  --output skills/openclaw-eeat/output/
```

### Example 2: Update only Tier 1 platforms (ORCID, GitHub)

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --tier 1 \
  --auto-submit
```

### Example 3: Generate Wikidata entity only

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --platform wikidata \
  --output skills/openclaw-eeat/output/wikidata/
```

---

## Testing

```bash
# Validate templates
npm run validate-templates

# Test brand statement parsing
npm run test-brand-parsing

# Test JSON-LD generation
npm run test-jsonld

# Full skill test (uses PromptFoo)
cd skills/openclaw-eeat/tests
promptfoo eval --config promptfoo.yml
```

---

## Related Skills

- **[`seo-metadata`](../seo-metadata/SKILL.md)** — JSON-LD schema generation for websites
- **[`vault-agent`](../vault-agent/SKILL.md)** — API credential availability checking
- **[`system-state`](../system-state/SKILL.md)** — Session initialization
- **[`persona-engine`](../persona-engine/SKILL.md)** — Persona: Echo 🌐
- **[`product-pipeline`](../product-pipeline/SKILL.md)** — Automated product creation (sister skill)

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-04-30 | Initial release. Supports 12 platforms across 3 tiers, auto-submission for ORCID/GitHub, draft generation for all others. |

---

## References

- **E-E-A-T Guide**: <https://developers.google.com/search/docs/appearance/e-e-a-t>
- **Google Knowledge Graph**: <https://developers.google.com/knowledge-graph>
- **Wikidata**: <https://www.wikidata.org/wiki/Wikidata:Introduction>
- **ORCID API**: <https://info.orcid.org/documentation/api-tutorials/>
- **Schema.org**: <https://schema.org/>
- **ResearchGate**: <https://www.researchgate.net/>
- **Internet Archive**: <https://archive.org/>
- **MISP**: <https://www.misp-project.org/>
- **Bellingcat**: <https://www.bellingcat.com/>
