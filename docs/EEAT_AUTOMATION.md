# E-E-A-T Automation — TrustForge Agent

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Status:** Active

---

## Overview

This document describes the **TrustForge** agent — the automated E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) management system for all MIDNGHTSAPPHIRE properties.

**What is E-E-A-T?**

E-E-A-T is Google's framework for evaluating content quality. It stands for:
- **Experience** — First-hand, real-world experience with the topic
- **Expertise** — Recognized knowledge and skill in the domain
- **Authoritativeness** — Recognition as a go-to source by others
- **Trustworthiness** — Accuracy, honesty, and safety of the site/content

Strong E-E-A-T signals lead to:
- ✅ Higher search rankings
- ✅ Better Google Knowledge Panel presence
- ✅ Increased user trust
- ✅ Authority transfer from parent entities to new properties

---

## TrustForge Agent

**Agent Name:** TrustForge — E-E-A-T Authority Builder  
**Skill Path:** `skills/eeat-trust-authority/`  
**Workflow:** `.github/workflows/eeat-trust-cron.yml`  
**Frequency:** Daily at 2 AM UTC (configurable)  
**Control:** Quiet Mode gate (enable/disable via GitHub issue)

### Agent Responsibilities

TrustForge is always working on trust signals:

1. **Schema.org Markup Management**
   - Generate Organization schema for all properties
   - Generate Person schema for author/founder pages
   - Generate WebApplication schema for apps
   - Validate schema with Google Rich Results Test
   - Enforce entity hierarchy (Freedom Angel Corp → child properties)

2. **Brand Statement Consistency**
   - Maintain canonical brand statement across all platforms
   - Sync to GitHub profiles (midnghtsapphire, MIDNGHTSAPPHIRE)
   - Update LinkedIn, personal websites, app footers
   - Include ORCID link, professional affiliations

3. **Google Knowledge Panel Optimization**
   - Monitor Knowledge Panel presence and accuracy
   - Ensure NAP (Name, Address, Phone) consistency across citations
   - Build citation network (LinkedIn, Crunchbase, AngelList, ORCID)
   - Track backlinks from authority sites

4. **Technical Trust Signals**
   - Verify HTTPS certificates on all properties
   - Validate canonical URLs
   - Scan for broken links
   - Monitor Google Search Console for errors
   - Generate and submit sitemaps

5. **Professional Identity Integration**
   - Link ORCID profile (0009-0005-0663-7832)
   - Reference American Legion membership (ID 302393962)
   - Reference PMI membership (ID 593830)
   - Highlight SBA certification (Minority-Owned, Veteran-Connected)
   - Include Freedom Angel Corp EIN (86-1209156)

---

## How Doppler Addresses E-E-A-T

The user asked if the Doppler solution addresses E-E-A-T needs. Here's the answer:

**Doppler handles:** Secret management for E-E-A-T automation  
**Doppler does NOT handle:** E-E-A-T strategy, schema markup, brand consistency, Knowledge Panel optimization

### Doppler's Role in E-E-A-T

Doppler (`growlingeyes/doppemcp/`) provides the secrets management infrastructure for TrustForge:

| Secret | Purpose | Managed by Doppler? |
|--------|---------|---------------------|
| `OPENROUTER_API_KEY` | LLM for content generation | ✅ Yes |
| `GITHUB_TOKEN` | Update repos and profiles | ✅ Yes |
| `GOOGLE_SEARCH_CONSOLE_KEY` | Submit sitemaps, monitor search | ⚠️ Add to Doppler |
| `GOOGLE_BUSINESS_PROFILE_KEY` | Update business info | ⚠️ Add to Doppler |
| `LINKEDIN_ACCESS_TOKEN` | Sync profile updates | ⚠️ Optional, add if needed |
| `ORCID_API_KEY` | Sync publications | ⚠️ Optional, add if needed |

**Conclusion:** Doppler provides the infrastructure, but TrustForge implements the E-E-A-T strategy. Both are needed.

---

## Getting Started

### 1. Load the TrustForge Skill

When working on E-E-A-T tasks, load the skill:

```bash
# Read the skill documentation
cat skills/eeat-trust-authority/SKILL.md

# Or load programmatically in your AI agent
skill_path="skills/eeat-trust-authority/SKILL.md"
```

### 2. Add Required Secrets to Doppler

```bash
# Use DoppleMCP to add E-E-A-T secrets
doppler secrets set GOOGLE_SEARCH_CONSOLE_KEY=<your-key> \
  --project revvel-standards --config prd

doppler secrets set GOOGLE_BUSINESS_PROFILE_KEY=<your-key> \
  --project revvel-standards --config prd
```

Or use the Doppler dashboard at [dashboard.doppler.com](https://dashboard.doppler.com).

### 3. Enable TrustForge

TrustForge respects Quiet Mode. To enable it:

```bash
gh issue create --title "exit-quiet-mode" \
  --body "Enabling TrustForge E-E-A-T automation"
```

### 4. Run TrustForge Manually (Optional)

```bash
# Dry run (report only, no changes)
gh workflow run eeat-trust-cron.yml -f dry_run=true

# Full run (creates PR with health report)
gh workflow run eeat-trust-cron.yml
```

### 5. Monitor TrustForge

TrustForge runs daily at 2 AM UTC and creates a PR with a health report.

Check recent runs:
```bash
gh run list --workflow=eeat-trust-cron.yml --limit 10
```

View latest report:
```bash
ls -lt docs/reports/eeat-health-*.md | head -1
```

---

## Master Identity Profile

This canonical identity MUST be used consistently across all properties:

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

### Professional Affiliations

- **American Legion:** Member ID 302393962
- **Project Management Institute (PMI):** ID 593830
- **SBA Certified:** Minority-Owned, Veteran-Connected

---

## Required Schema.org Markup

### Every Page Must Include

This Organization schema MUST appear in the `<head>` of every public-facing page:

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

**Why this matters:**
- Links every app to Freedom Angel Corp (founded 2010)
- Transfers authority and trust from parent to child
- Helps Google understand the entity hierarchy
- Improves search rankings for new properties

---

## Maintenance Schedule

TrustForge runs these tasks automatically:

### Daily (Automated via Cron)
- ✅ Verify schema markup presence
- ✅ Check HTTPS certificates
- ✅ Validate canonical URLs
- ✅ Scan for broken links
- ✅ Monitor Google Search Console
- ✅ Generate health report

### Weekly
- Audit NAP consistency across citations
- Review and update brand statement if needed
- Check ORCID profile for new publications
- Generate sitemaps for new content
- Review backlink profile

### Monthly
- Full Lighthouse SEO audit
- Update schema.org markup for business changes
- Review Google Business Profile
- Audit social media profiles for consistency
- Generate E-E-A-T health report

### Quarterly
- Major schema.org markup review
- Professional citation network expansion
- Content audit for E-E-A-T strength
- Knowledge Panel optimization
- Authority link building campaign

---

## Enable/Disable Control

### To Enable TrustForge

Create an issue titled exactly: `exit-quiet-mode`

```bash
gh issue create --title "exit-quiet-mode" \
  --body "Enabling TrustForge E-E-A-T automation"
```

### To Disable TrustForge

Close or delete the `exit-quiet-mode` issue:

```bash
gh issue close <issue-number>
```

### Check TrustForge Status

```bash
# Check for exit-quiet-mode issue
gh issue list --search "exit-quiet-mode in:title" --state open

# If issue exists → TrustForge is ENABLED
# If no issue → TrustForge is DISABLED (Quiet Mode)
```

---

## Success Metrics

Track these to measure E-E-A-T improvement:

| Metric | Target | How to Check |
|--------|--------|-------------|
| Schema markup coverage | 100% of pages | TrustForge health report |
| Lighthouse SEO score | ≥ 90 on all properties | `npx lighthouse <url> --only-categories=seo` |
| Google Knowledge Panel | Active and claimed | Search "Audrey Evans systems builder" |
| ORCID backlinks | ≥ 5 properties | Check ORCID profile |
| Authority backlinks | +10 per quarter | Google Search Console |
| NAP consistency | 100% across citations | Manual citation audit |
| HTTPS coverage | 100% | TrustForge health report |
| Broken link count | 0 | TrustForge health report |

---

## Troubleshooting

### TrustForge is Not Running

**Check Quiet Mode status:**
```bash
gh issue list --search "exit-quiet-mode in:title" --state open
```

If no issue exists, create one:
```bash
gh issue create --title "exit-quiet-mode"
```

### Health Report Not Generated

**Check workflow runs:**
```bash
gh run list --workflow=eeat-trust-cron.yml --limit 5
```

**View failed run logs:**
```bash
gh run view <run-id> --log-failed
```

### Schema Markup Not Validating

**Test with Google Rich Results Test:**
```bash
# Visit in browser:
https://search.google.com/test/rich-results?url=<your-url>
```

**Or use schema.org validator:**
```bash
npm install -g jsonld
jsonld validate your-schema.json
```

### Missing Secrets

**Check Doppler:**
```bash
# List all secrets in project
doppler secrets --project revvel-standards --config prd
```

**Add missing secret:**
```bash
doppler secrets set SECRET_NAME=value --project revvel-standards --config prd
```

---

## Integration with Existing Standards

TrustForge integrates with:

1. **SEO Metadata Skill** (`skills/seo-metadata/`)
   - Load both skills when setting up a new property
   - TrustForge adds entity-level schema
   - seo-metadata adds page-level meta tags

2. **Entity Hierarchy Standard** (`docs/Master_Inventory/ENTITY_HIERARCHY.md`)
   - TrustForge enforces the hierarchy
   - All apps declare Freedom Angel Corp as parent
   - All apps use 2010 founding date

3. **Brand Identity Template** (`templates/brand/BRAND_IDENTITY_TEMPLATE.md`)
   - TrustForge uses this as source of truth
   - Enforces consistent logos, colors, typography

4. **Doppler Secrets Management** (`docs/SECRETS_MANAGEMENT.md`)
   - TrustForge fetches API keys from Doppler
   - All E-E-A-T secrets stored in Doppler

---

## Next Steps

1. ✅ TrustForge skill created
2. ✅ Cron workflow deployed
3. ⚠️ Add E-E-A-T secrets to Doppler (GOOGLE_SEARCH_CONSOLE_KEY, etc.)
4. ⚠️ Enable TrustForge by creating exit-quiet-mode issue
5. ⚠️ Update GitHub profiles with canonical brand statement
6. ⚠️ Add schema.org markup to existing properties
7. ⚠️ Claim Google Business Profile for Freedom Angel Corp
8. ⚠️ Monitor TrustForge health reports and address recommendations

---

## References

- **Skill Documentation:** `skills/eeat-trust-authority/SKILL.md`
- **Workflow:** `.github/workflows/eeat-trust-cron.yml`
- **Entity Hierarchy:** `docs/Master_Inventory/ENTITY_HIERARCHY.md`
- **SEO Metadata:** `docs/Master_Inventory/SEO_METADATA_STANDARD.md`
- **Brand Identity:** `templates/brand/BRAND_IDENTITY_TEMPLATE.md`
- **Google E-E-A-T Guide:** [Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- **Schema.org Docs:** [schema.org](https://schema.org/)
- **ORCID Profile:** [orcid.org/0009-0005-0663-7832](https://orcid.org/0009-0005-0663-7832)

---

*Last Updated: April 30, 2026*  
*Agent: TrustForge v1.0.0*
