# OpenClaw E-E-A-T Content Distribution Skill

Automated brand content distribution across high-value platforms to establish E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals for Google Knowledge Graph eligibility and OSINT community presence.

## Quick Start

1. **Prepare brand statement** — See `templates/brand-statement-example.md`
2. **Describe projects** — One markdown file per project
3. **Run skill** — `openclaw run-skill openclaw-eeat --brand brand.yml --projects "projects/*.md"`
4. **Review outputs** — Check `output/<platform>/` for drafts and submission guides
5. **Submit manually or via API** — Follow platform-specific instructions

## Supported Platforms

### Tier 1 — Already Have Foothold
- ✅ **ORCID** — Auto-submit with API token
- ✅ **GitHub** — Auto-update via API

### Tier 2 — High-Value Deep Web (Manual)
- ⚠️ **Wikidata** — Highest priority, direct Google Knowledge Graph feed
- ⚠️ **ResearchGate** — Even non-academic work qualifies
- ⚠️ **Internet Archive** — Citable permanent URLs
- ⚠️ **Crunchbase** — Business entity profiles
- ⚠️ **OpenCorporates** — Claim existing legal entities
- ✅ **Semantic Scholar** — Auto-indexed from ORCID

### Tier 3 — OSINT & Intelligence (Conditional)
- ⚠️ **MISP** — Threat intelligence communities
- ⚠️ **IntelligenceX** — OSINT researcher profiles
- ⚠️ **Maltego** — Entity and transform definitions
- ⚠️ **Bellingcat** — Investigative journalism community

## File Structure

```text
skills/openclaw-eeat/
├── SKILL.md                          # This documentation
├── openclaw-eeat.skill.yml           # Skill configuration
├── README.md                         # Quick start guide
├── templates/                        # Platform-specific templates
│   ├── organization.jsonld           # Schema.org Organization
│   ├── person.jsonld                 # Schema.org Person
│   ├── research-project.jsonld       # Schema.org ResearchProject
│   ├── orcid-works.xml               # ORCID Works API payload
│   ├── wikidata-entity.md            # Wikidata creation guide
│   ├── researchgate-profile.md       # ResearchGate setup guide
│   ├── archive-org-submission.md     # Internet Archive upload guide
│   ├── misp-profile.json             # MISP community profile
│   ├── bellingcat-profile.md         # Bellingcat community guide
│   └── brand-statement-example.md    # Example brand statement
├── output/                           # Generated content (gitignored)
│   ├── state.json                    # Platform status tracking
│   ├── summary.md                    # Execution summary
│   ├── orcid/                        # ORCID submission files
│   ├── wikidata/                     # Wikidata entity draft
│   ├── researchgate/                 # ResearchGate profile draft
│   ├── github/                       # GitHub profile updates
│   ├── archive-org/                  # Archive.org upload package
│   ├── misp/                         # MISP profile draft
│   └── bellingcat/                   # Bellingcat profile draft
└── tests/                            # PromptFoo tests (future)
    └── promptfoo.yml
```

## Usage Examples

### Generate All Platform Content

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --projects "projects/*.md" \
  --output skills/openclaw-eeat/output/
```

### Update Tier 1 Only (ORCID, GitHub)

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --tier 1 \
  --auto-submit
```

### Generate Wikidata Entity Only

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --platform wikidata \
  --output skills/openclaw-eeat/output/wikidata/
```

### Generate OSINT Profiles (Tier 3)

```bash
openclaw run-skill openclaw-eeat \
  --brand brand-statement.yml \
  --tier 3 \
  --platforms "misp,bellingcat" \
  --output skills/openclaw-eeat/output/
```

## Key Features

- **12 Platforms Supported** — Covers Tier 1 (active), Tier 2 (high-value), Tier 3 (OSINT)
- **Auto-Submission** — ORCID and GitHub can be updated via API
- **Human-Reviewable Drafts** — All manual platforms generate step-by-step guides
- **Schema Validation** — JSON-LD, ORCID XML, Wikidata JSON validated before output
- **State Tracking** — `state.json` tracks status per platform, prevents duplicate work
- **Template-Based** — Handlebars templates for easy customization
- **E-E-A-T Optimized** — Content formatted for maximum expertise/authority signals

## Dependencies

- **Required:** `vault-agent`, `seo-metadata`, `system-state`
- **Optional:** `n8n` or MCP for automated submission queue
- **Tools:** `jq` (JSON validation), `xmllint` (XML validation)

## Related Skills

- [`seo-metadata`](../seo-metadata/SKILL.md) — JSON-LD schema generation
- [`vault-agent`](../vault-agent/SKILL.md) — API credential management
- [`product-pipeline`](../product-pipeline/SKILL.md) — Automated product creation
- [`persona-engine`](../persona-engine/SKILL.md) — Persona: Echo 🌐

## References

- **E-E-A-T Guide:** <https://developers.google.com/search/docs/appearance/e-e-a-t>
- **Wikidata:** <https://www.wikidata.org/wiki/Wikidata:Introduction>
- **ORCID API:** <https://info.orcid.org/documentation/api-tutorials/>
- **Schema.org:** <https://schema.org/>
- **ResearchGate:** <https://www.researchgate.net/>
- **Internet Archive:** <https://archive.org/>
- **MISP:** <https://www.misp-project.org/>
- **Bellingcat:** <https://www.bellingcat.com/>

---

**Version:** 1.0.0  
**Author:** MIDNGHTSAPPHIRE  
**Date:** April 30, 2026  
**Persona:** Echo 🌐
