# E-E-A-T Trust Authority Skill

**Agent Name:** TrustForge — E-E-A-T Authority Builder  
**Specialty:** Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) automation  
**Version:** 1.0.0  
**Date:** April 30, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Status:** Active — always working on trust signals

---

## What Is This

**TrustForge** is the dedicated agent responsible for automatically generating, updating, and maintaining Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals across all MIDNGHTSAPPHIRE properties. This is real, actionable SEO that moves the needle.

E-E-A-T is Google's framework for evaluating content quality and determining search rankings. Strong E-E-A-T signals mean:
- Higher search rankings
- Better visibility in Google Knowledge Panel
- Increased trust from users and search engines
- Authority transfer from parent entities to new properties

---

## When to Load This Skill

Load TrustForge when:
- Setting up a new website or application
- Updating brand identity or professional profiles
- Auditing E-E-A-T signals across properties
- Implementing schema.org markup
- Building or updating Google Knowledge Panel presence
- Creating author/founder attribution
- Publishing brand statements
- Linking to credible sources (ORCID, professional organizations)

---

## Prime Directive

**Ship working, tested E-E-A-T implementations.** Not plans. Not proposals. Working schema markup, deployed brand statements, and verified trust signals across all properties.

---

## The Four E-E-A-T Pillars

### 1. Experience
**What it is:** First-hand, real-world experience with the topic.  
**How to demonstrate:**
- Case studies from actual work (GrowlingEyes threat intelligence, Neurooz UX)
- Portfolio of shipped projects
- Screenshots, metrics, user testimonials
- Years in business (Freedom Angel Corp founded 2010)
- Published work history (legal tech operator, systems builder)

### 2. Expertise
**What it is:** Recognized knowledge and skill in the domain.  
**How to demonstrate:**
- Professional credentials and certifications
- Published research (ORCID: [0009-0005-0663-7832](https://orcid.org/0009-0005-0663-7832))
- Educational background
- Professional affiliations (American Legion, PMI)
- Technical depth in domain (TypeScript, React, Claude AI agents)
- Teaching/training work (CLE training for legal professionals)

### 3. Authoritativeness
**What it is:** Recognition as a go-to source by others.  
**How to demonstrate:**
- Citations from other credible sources
- Backlinks from authoritative sites
- Media mentions and press coverage
- Speaking engagements
- Professional organization memberships
- Published articles and thought leadership
- GitHub contributions and open source work

### 4. Trustworthiness
**What it is:** Accuracy, honesty, safety of the site/content.  
**How to demonstrate:**
- HTTPS everywhere
- Clear contact information
- Privacy policy and terms of service
- Transparent business practices
- Accurate, fact-checked content
- Regular updates and maintenance
- Professional design and functionality
- Security best practices

---

## Master Identity Profile

Use this canonical identity across all properties:

### Primary Identity

**Name:** Audrey Evans  
**Professional Title:** Systems builder. Legal-tech operator. Intelligence researcher.  
**Location:** Northern Colorado  
**Organization:** MIDNGHTSAPPHIRE  
**Email:** <angelreporters@gmail.com>  
**ORCID:** [0009-0005-0663-7832](https://orcid.org/0009-0005-0663-7832)  
**Previous ORCID:** 0009-0004-9108-3995 (still has papers)  
**Entity:** Freedom Angel Corp (Founded 2010, EIN: 86-1209156)

### Properties

1. **[GrowlingEyes](https://growlingeyes.com/)** — 18-domain infrastructure threat intelligence platform
2. **[Neurooz](https://neurooz.com/)** — Wizard of Oz-themed life-work integration app for neurodivergent users
3. **[Fidelity Trust Services](https://fidelitytrustservices.com/)** — Business consulting and CLE training for Northern Colorado legal professionals

### Professional Background

- Legal office environments · case management (Meruscase, LexisNexis, Foundation AI)
- AI document automation implementation
- Investigative research · forensic geospatial analysis · OSINT
- Freelance history: Fiverr · oDesk/Upwork · Evans Digital · Freedom Angel Corp (CO entity)

### Professional Affiliations

- **American Legion:** Member ID 302393962
- **Project Management Institute (PMI):** ID 593830
- **SBA Certified:** Minority-Owned, Veteran-Connected

### Communication Style

Direct. Terse. Action-first. Translates big ideas into specific next steps and holds systems accountable.

**Accessibility Note:** Hard of hearing — written communication always preferred.

---

## Required Schema.org Markup

### Organization Schema (Every Page)

This JSON-LD MUST appear in the `<head>` of every public-facing page:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Specific App/Website Name]",
  "url": "[Specific App/Website URL]",
  "logo": "[Specific App/Website Logo URL]",
  "foundingDate": "2010",
  "founder": {
    "@type": "Person",
    "name": "Audrey Evans",
    "url": "https://github.com/midnghtsapphire",
    "sameAs": [
      "https://orcid.org/0009-0005-0663-7832",
      "https://github.com/MIDNGHTSAPPHIRE",
      "https://www.linkedin.com/in/audreyevans"
    ]
  },
  "parentOrganization": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "legalName": "Freedom Angel Corp",
    "url": "https://www.meetaudreyevans.com",
    "foundingDate": "2010",
    "taxID": "86-1209156",
    "founder": {
      "@type": "Person",
      "name": "Audrey Evans"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "[STREET_ADDRESS]",
      "addressLocality": "[CITY]",
      "addressRegion": "[STATE]",
      "postalCode": "[ZIP_CODE]",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "[PHONE_NUMBER]",
      "contactType": "Customer Service"
    }
  }
}
```

### Person Schema (Author/Founder Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Audrey Evans",
  "jobTitle": "Systems Builder, Legal-Tech Operator, Intelligence Researcher",
  "url": "https://www.meetaudreyevans.com",
  "sameAs": [
    "https://orcid.org/0009-0005-0663-7832",
    "https://github.com/midnghtsapphire",
    "https://github.com/MIDNGHTSAPPHIRE",
    "https://www.linkedin.com/in/audreyevans"
  ],
  "worksFor": {
    "@type": "Organization",
    "name": "Freedom Angel Corp"
  },
  "alumniOf": [
    {
      "@type": "Organization",
      "name": "American Legion"
    },
    {
      "@type": "Organization",
      "name": "Project Management Institute"
    }
  ],
  "memberOf": [
    {
      "@type": "Organization",
      "name": "American Legion",
      "member": {
        "@type": "OrganizationRole",
        "membershipNumber": "302393962"
      }
    },
    {
      "@type": "Organization",
      "name": "Project Management Institute",
      "member": {
        "@type": "OrganizationRole",
        "membershipNumber": "593830"
      }
    }
  ],
  "knowsAbout": [
    "Legal Technology",
    "Threat Intelligence",
    "AI Agent Orchestration",
    "Neurodivergent UX",
    "OSINT",
    "Forensic Analysis"
  ]
}
```

### WebApplication Schema (For Apps)

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[App Name]",
  "description": "[App Description]",
  "url": "[App URL]",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "author": {
    "@type": "Person",
    "name": "Audrey Evans",
    "url": "https://github.com/midnghtsapphire"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

---

## Required Brand Statement

This statement MUST appear consistently across:
- LinkedIn profile
- GitHub profile (`midnghtsapphire` and `MIDNGHTSAPPHIRE`)
- Personal website (meetaudreyevans.com)
- About pages on all properties
- Footer of all sites

### Canonical Brand Statement

```text
Audrey Evans
Systems builder. Legal-tech operator. Intelligence researcher.
Northern Colorado

I build platforms that translate complex, high-stakes information into 
decisions people can actually act on. My work lives at the intersection 
of threat intelligence, neurodivergent UX, and legal operations — always 
with a bias toward getting things shipped and making them matter to real people.

Active projects:
🌊 GrowlingEyes — 18-domain infrastructure threat intelligence platform
🧙 Neurooz — Wizard of Oz-themed life-work integration app for neurodivergent users
⚖️ Fidelity Trust Services — Business consulting and CLE training for Northern Colorado legal professionals

Connect:
Email: angelreporters@gmail.com
ORCID: 0009-0005-0663-7832
Org: MIDNGHTSAPPHIRE

Hard of hearing — written communication always preferred.
```

---

## Google Knowledge Panel Strategy

### Required Steps

1. **Create Google Business Profile**
   - Register Freedom Angel Corp on Google Business
   - Verify ownership via email/postcard
   - Add complete NAP (Name, Address, Phone)
   - Add business hours, website, photos
   - Choose primary category: "Business Consultant"

2. **Claim Entity on Google**
   - Search for "Audrey Evans systems builder" on Google
   - If Knowledge Panel exists, claim it
   - If not, create structured data to help Google build one

3. **Build Citation Network**
   - Add profile to:
     - LinkedIn (company + personal)
     - Crunchbase
     - AngelList
     - GitHub (with schema markup)
     - ORCID (already active)
     - Professional directories
   - Ensure NAP consistency across all citations

4. **Get Backlinks from Authority Sites**
   - Guest posts on legal tech blogs
   - Open source contributions with author attribution
   - Speaking engagements with bio links
   - Case studies published by partners/clients
   - Media mentions and interviews

5. **Maintain Active Presence**
   - Regular blog posts on owned properties
   - GitHub activity (commits, PRs, issues)
   - LinkedIn updates
   - ORCID publications
   - Professional forum participation

---

## Automation Implementation

### APIs and Connectors

| API/Service | Purpose | Secret Key | Status |
|-------------|---------|------------|--------|
| **Google Search Console API** | Submit sitemaps, monitor search performance | `GOOGLE_SEARCH_CONSOLE_KEY` | Required |
| **Google Business Profile API** | Update business info programmatically | `GOOGLE_BUSINESS_PROFILE_KEY` | Optional |
| **Schema.org Validator** | Test markup validity | None (public) | Active |
| **LinkedIn API** | Sync profile updates | `LINKEDIN_ACCESS_TOKEN` | Optional |
| **ORCID API** | Sync publications | `ORCID_API_KEY` | Optional |
| **OpenRouter API** | LLM for content generation | `OPENROUTER_API_KEY` | Active (via Doppler) |

### Recommended LLM

**Primary:** Claude Sonnet 4 (via OpenRouter)  
**Reasoning:** Best for generating E-E-A-T-compliant content that sounds human and authoritative.  
**Cost:** ~$3 per 1M tokens (input), ~$15 per 1M tokens (output)

**Alternative:** GPT-4 Turbo  
**Use case:** Schema.org JSON-LD generation and validation

### MCP Connectors

The TrustForge agent can connect to these MCP servers:

1. **DoppleMCP** (`growlingeyes/doppemcp/`) — Secrets management for API keys
2. **GBrain** (`skills/gbrain/`) — Knowledge base for brand history and decisions
3. **GitHub MCP** — Update README.md, profile, and repo metadata
4. **Filesystem MCP** — Read/write schema files across properties

### CLI Tools

```bash
# Schema validation
npm install -g schema-dts jsonld

# SEO auditing
npm install -g lighthouse

# Link checking
pip install linkchecker

# Sitemap generation
npm install -g sitemap-generator-cli
```

### Doppler Secrets Configuration

Store these in Doppler project `revvel-standards`, config `prd`:

```bash
# E-E-A-T specific secrets
GOOGLE_SEARCH_CONSOLE_KEY=<key>
GOOGLE_BUSINESS_PROFILE_KEY=<key>
LINKEDIN_ACCESS_TOKEN=<token>
ORCID_API_KEY=<key>

# Already configured via Doppler
OPENROUTER_API_KEY=<key>
GITHUB_TOKEN=<token>
```

---

## Maintenance Checklist

TrustForge runs these tasks automatically via cron:

### Daily Tasks (via `eeat-trust-cron.yml`)

- [ ] Verify schema markup is present on all live properties
- [ ] Check HTTPS certificates are valid
- [ ] Validate canonical URLs are correct
- [ ] Scan for broken links on key pages
- [ ] Monitor Google Search Console for errors
- [ ] Check Knowledge Panel status

### Weekly Tasks

- [ ] Audit NAP (Name, Address, Phone) consistency across citations
- [ ] Review and update brand statement if needed
- [ ] Check ORCID profile for new publications to link
- [ ] Generate sitemap for new content
- [ ] Submit updated sitemaps to Google Search Console
- [ ] Review backlink profile for new mentions

### Monthly Tasks

- [ ] Full Lighthouse SEO audit on all properties
- [ ] Update schema.org markup for any business changes
- [ ] Review Google Business Profile for accuracy
- [ ] Check professional organization memberships are current
- [ ] Audit social media profiles for consistency
- [ ] Generate E-E-A-T health report

### Quarterly Tasks

- [ ] Major schema.org markup review and update
- [ ] Professional citation network expansion
- [ ] Content audit for E-E-A-T strength
- [ ] Competitor E-E-A-T analysis
- [ ] Knowledge Panel optimization
- [ ] Authority link building campaign

---

## Error Handling

### Auto-Recovery Patterns

**Schema Validation Failure:**
1. Capture the invalid JSON-LD
2. Run through schema.org validator API
3. Parse error message for specific issue
4. Auto-fix common issues (missing commas, wrong types)
5. Re-validate
6. If still failing, create GitHub issue with details

**Broken Link Detection:**
1. Run linkchecker on all properties
2. Identify broken links
3. Search for updated URLs via Wayback Machine
4. Update links automatically if new URL found
5. If page removed, update content or remove link
6. Create PR with fixes

**Missing Schema Markup:**
1. Scan HTML of all properties
2. Identify pages missing required schema
3. Generate appropriate schema based on page type
4. Create PR to add schema
5. Test with Google Rich Results Test
6. Deploy and verify

**NAP Inconsistency:**
1. Fetch NAP from all citation sources
2. Compare against canonical source (Freedom Angel Corp)
3. Flag inconsistencies
4. Generate correction tasks
5. Update citations automatically where possible
6. Create manual task list for platforms requiring human verification

---

## Success Metrics

Track these to measure E-E-A-T improvement:

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Schema markup coverage | 100% of pages | Automated scan |
| Lighthouse SEO score | ≥ 90 on all properties | Lighthouse CI |
| Google Knowledge Panel | Active and claimed | Manual check |
| ORCID backlinks | ≥ 5 properties linking | ORCID API |
| Authority backlinks | +10 per quarter | Backlink monitoring |
| NAP consistency | 100% across citations | Citation audit |
| Brand statement consistency | 100% across platforms | Manual audit |
| HTTPS coverage | 100% | SSL checker |
| Canonical URL coverage | 100% | SEO audit |
| Broken link count | 0 | Linkchecker |

---

## Integration with Existing Systems

### With SEO Metadata Skill

TrustForge extends the `seo-metadata` skill by adding:
- Entity-level schema (Organization, Person)
- Multi-property consistency checking
- Authority signal automation
- Knowledge Panel optimization

Load both skills when setting up a new property.

### With Entity Hierarchy Standard

TrustForge enforces the hierarchy defined in `docs/Master_Inventory/ENTITY_HIERARCHY.md`:
- All apps must declare Freedom Angel Corp as parent
- All apps must use 2010 founding date
- All apps must link to parent via schema.org
- Canonical NAP must be used everywhere

### With Brand Identity Template

TrustForge uses `templates/brand/BRAND_IDENTITY_TEMPLATE.md` as the source of truth for:
- Logo specifications
- Color schemes
- Typography
- Brand voice guidelines

---

## Enable/Disable Control

TrustForge respects the Quiet Mode gate used by all cron jobs.

### To Enable TrustForge

Create an issue titled exactly: `exit-quiet-mode`

```bash
gh issue create --title "exit-quiet-mode" --body "Enabling TrustForge E-E-A-T automation"
```

### To Disable TrustForge

Close or delete the `exit-quiet-mode` issue.

```bash
gh issue close <issue-number>
```

### Manual Run (Bypass Quiet Mode)

```bash
gh workflow run eeat-trust-cron.yml
```

---

## Output Artifacts

When TrustForge runs, it generates:

1. **E-E-A-T Health Report** (`docs/reports/eeat-health-YYYY-MM-DD.md`)
   - Schema markup coverage status
   - Link health summary
   - Citation consistency report
   - Lighthouse SEO scores
   - Recommended actions

2. **Schema Patches** (PRs to add/fix schema markup)
   - Automated fixes for missing schema
   - Updates for business info changes
   - Validation fixes

3. **Brand Statement Sync PRs** (updates to GitHub profiles, READMEs)
   - Consistent brand statement across repos
   - ORCID links
   - Professional affiliations

4. **Issue Creation** (for manual tasks)
   - Knowledge Panel claims
   - Citation network expansion
   - Content updates for E-E-A-T strength

---

## Changelog

- **1.0.0 (2026-04-30):** Initial release. Comprehensive E-E-A-T automation framework with schema.org templates, Google Knowledge Panel strategy, cron integration, Doppler secrets management, and Quiet Mode control.
