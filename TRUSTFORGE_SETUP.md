# TrustForge E-E-A-T Agent — Setup Guide

**Created:** April 30, 2026  
**Status:** Ready to use  
**Agent:** TrustForge v1.0.0

---

## What Was Built

A complete E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) automation system with:

✅ **Dedicated Agent:** TrustForge — E-E-A-T Authority Builder  
✅ **Clear Responsibility:** Google trust signals, Knowledge Panel, schema.org markup  
✅ **Detailed Configuration:** LLM (Claude Sonnet 4), APIs, MCP connectors, CLI tools  
✅ **Always Working:** Runs daily at 2 AM UTC  
✅ **On/Off Control:** Enable/disable via "exit-quiet-mode" issue  
✅ **Addresses Doppler Question:** Doppler = infrastructure, TrustForge = strategy

---

## Files Created (8 files, 52 KB)

### Core Skill
- `skills/eeat-trust-authority/SKILL.md` (17.7 KB)
- `skills/eeat-trust-authority/eeat-trust-authority.skill.yml` (3.2 KB)
- `skills/eeat-trust-authority/README.md` (2.3 KB)
- `skills/eeat-trust-authority/QUICK_REFERENCE.md` (1.8 KB)

### Automation
- `.github/workflows/eeat-trust-cron.yml` (11.4 KB)

### Documentation
- `docs/EEAT_AUTOMATION.md` (12.9 KB)

### Templates
- `templates/brand/BRAND_STATEMENT_AUDREY_EVANS.md` (3.5 KB)

### Registry
- `skills/REGISTRY.md` (updated)

---

## Quick Start (3 Commands)

### 1. Add Secrets to Doppler

```bash
# Required for full functionality
doppler secrets set GOOGLE_SEARCH_CONSOLE_KEY=<your-key> \
  --project revvel-standards --config prd

# Optional (adds more features)
doppler secrets set GOOGLE_BUSINESS_PROFILE_KEY=<your-key> \
  --project revvel-standards --config prd
```

### 2. Enable TrustForge

```bash
gh issue create --title "exit-quiet-mode" \
  --body "Enabling TrustForge E-E-A-T automation"
```

### 3. Monitor

```bash
# TrustForge runs daily at 2 AM UTC
# Check recent runs:
gh run list --workflow=eeat-trust-cron.yml --limit 5

# View latest health report:
ls -lt docs/reports/eeat-health-*.md | head -1
```

---

## What TrustForge Does

### Daily Tasks (Automated)
- ✅ Verify schema markup on all properties
- ✅ Check HTTPS certificates
- ✅ Validate canonical URLs
- ✅ Scan for broken links
- ✅ Monitor Google Search Console
- ✅ Generate health report

### Weekly Tasks
- Audit NAP (Name, Address, Phone) consistency
- Review brand statement
- Check ORCID for new publications
- Generate sitemaps
- Review backlink profile

### Monthly Tasks
- Full Lighthouse SEO audit
- Update schema.org markup
- Review Google Business Profile
- Audit social media consistency

### Quarterly Tasks
- Citation network expansion
- Knowledge Panel optimization
- Content E-E-A-T audit
- Authority link building

---

## Master Identity (Use Everywhere)

**Name:** Audrey Evans  
**Email:** <angelreporters@gmail.com>  
**ORCID:** 0009-0005-0663-7832  
**Entity:** Freedom Angel Corp (Founded 2010, EIN: 86-1209156)  
**Location:** Northern Colorado

**Properties:**
1. [GrowlingEyes](https://growlingeyes.com/) — Threat intelligence
2. [Neurooz](https://neurooz.com/) — Neurodivergent UX app
3. [Fidelity Trust Services](https://fidelitytrustservices.com/) — Legal consulting

**Professional Affiliations:**
- American Legion: Member ID 302393962
- PMI: ID 593830
- SBA Certified: Minority-Owned, Veteran-Connected

---

## Required Schema.org Markup

Add this to every page `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Your App Name]",
  "url": "[Your App URL]",
  "logo": "[Your Logo URL]",
  "foundingDate": "2010",
  "founder": {
    "@type": "Person",
    "name": "Audrey Evans",
    "sameAs": [
      "https://orcid.org/0009-0005-0663-7832",
      "https://github.com/midnghtsapphire",
      "https://github.com/MIDNGHTSAPPHIRE"
    ]
  },
  "parentOrganization": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "foundingDate": "2010",
    "taxID": "86-1209156"
  }
}
</script>
```

---

## Enable/Disable Control

### Enable
```bash
gh issue create --title "exit-quiet-mode"
```

### Disable
```bash
# Find the issue number
gh issue list --search "exit-quiet-mode in:title" --state open

# Close it
gh issue close <issue-number>
```

### Manual Run (Bypass Quiet Mode)
```bash
# Dry run (report only)
gh workflow run eeat-trust-cron.yml -f dry_run=true

# Full run (creates PR)
gh workflow run eeat-trust-cron.yml
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Schema markup coverage | 100% |
| Lighthouse SEO score | ≥ 90 |
| Google Knowledge Panel | Active |
| ORCID backlinks | ≥ 5 |
| Authority backlinks | +10/quarter |
| NAP consistency | 100% |
| HTTPS coverage | 100% |
| Broken links | 0 |

---

## Next Steps

1. ✅ TrustForge created and documented
2. ⚠️ Add secrets to Doppler
3. ⚠️ Enable TrustForge (create exit-quiet-mode issue)
4. ⚠️ Update GitHub profiles with brand statement
5. ⚠️ Add schema.org markup to existing properties
6. ⚠️ Claim Google Business Profile
7. ⚠️ Monitor health reports

---

## Doppler Integration

**Question:** Has Doppler cleared this up?  
**Answer:** Doppler provides secrets management. TrustForge implements E-E-A-T strategy. Both are needed.

**Doppler manages:**
- ✅ OPENROUTER_API_KEY (already configured)
- ✅ GITHUB_TOKEN (already configured)
- ⚠️ GOOGLE_SEARCH_CONSOLE_KEY (add this)
- ⚠️ GOOGLE_BUSINESS_PROFILE_KEY (add this)

**TrustForge manages:**
- ✅ E-E-A-T strategy
- ✅ Schema.org markup
- ✅ Brand consistency
- ✅ Knowledge Panel optimization
- ✅ Trust signal monitoring

---

## Documentation

- **Full Skill:** `skills/eeat-trust-authority/SKILL.md`
- **Quick Start:** `skills/eeat-trust-authority/README.md`
- **Quick Reference:** `skills/eeat-trust-authority/QUICK_REFERENCE.md`
- **Comprehensive:** `docs/EEAT_AUTOMATION.md`
- **Brand Statement:** `templates/brand/BRAND_STATEMENT_AUDREY_EVANS.md`
- **Workflow:** `.github/workflows/eeat-trust-cron.yml`

---

## Support

For questions about TrustForge:
1. Read `skills/eeat-trust-authority/SKILL.md` (complete documentation)
2. Check `QUICK_REFERENCE.md` (one-page reference)
3. Review health reports in `docs/reports/eeat-health-*.md`
4. Check workflow runs: `gh run list --workflow=eeat-trust-cron.yml`

---

*TrustForge v1.0.0 — E-E-A-T Trust Authority Agent*  
*Created: April 30, 2026*  
*Status: Ready to use*
