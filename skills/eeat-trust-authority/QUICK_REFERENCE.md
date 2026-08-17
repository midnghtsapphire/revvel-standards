# TrustForge Quick Reference

## Enable TrustForge

```bash
gh issue create --title "exit-quiet-mode" --body "Enabling TrustForge"
```

## Disable TrustForge

```bash
gh issue close <exit-quiet-mode issue number>
```

## Run Manually

```bash
# Dry run
gh workflow run eeat-trust-cron.yml -f dry_run=true

# Full run
gh workflow run eeat-trust-cron.yml
```

## Check Status

```bash
# Check if enabled
gh issue list --search "exit-quiet-mode in:title" --state open

# View recent runs
gh run list --workflow=eeat-trust-cron.yml --limit 5

# View latest health report
ls -lt docs/reports/eeat-health-*.md | head -1
```

## Master Identity

**Name:** Audrey Evans  
**Email:** <angelreporters@gmail.com>  
**ORCID:** [0009-0005-0663-7832](https://orcid.org/0009-0005-0663-7832)  
**Entity:** Freedom Angel Corp (Founded 2010, EIN: 86-1209156)  
**Location:** Northern Colorado  

## Properties

1. [GrowlingEyes](https://growlingeyes.com/) — Threat intelligence
2. [Neurooz](https://neurooz.com/) — Neurodivergent UX app
3. [Fidelity Trust Services](https://fidelitytrustservices.com/) — Legal consulting

## Required Schema (Every Page)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[App Name]",
  "url": "[App URL]",
  "logo": "[Logo URL]",
  "foundingDate": "2010",
  "founder": {
    "@type": "Person",
    "name": "Audrey Evans",
    "sameAs": [
      "https://orcid.org/0009-0005-0663-7832",
      "https://github.com/midnghtsapphire"
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

## Secrets to Add in Doppler

```bash
GOOGLE_SEARCH_CONSOLE_KEY=<key>
GOOGLE_BUSINESS_PROFILE_KEY=<key>
LINKEDIN_ACCESS_TOKEN=<token>  # Optional
ORCID_API_KEY=<key>             # Optional
```

## Tasks Schedule

- **Daily:** Schema validation, HTTPS check, link scan
- **Weekly:** NAP consistency, sitemap generation
- **Monthly:** Lighthouse audit, schema review
- **Quarterly:** Citation expansion, Knowledge Panel optimization

## Success Metrics

| Metric | Target |
|--------|--------|
| Schema coverage | 100% |
| Lighthouse SEO | ≥ 90 |
| Knowledge Panel | Active |
| HTTPS coverage | 100% |
| Broken links | 0 |

## Files

- `SKILL.md` — Full documentation
- `eeat-trust-authority.skill.yml` — Configuration
- `README.md` — Quick start
- `QUICK_REFERENCE.md` — This file

---

*TrustForge v1.0.0 — E-E-A-T Trust Authority Agent*
