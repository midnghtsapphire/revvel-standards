# TrustForge — E-E-A-T Trust Authority Skill

**Agent Name:** TrustForge  
**Version:** 1.0.0  
**Status:** Active

---

## Quick Start

### Load This Skill

When working on E-E-A-T tasks, read the skill documentation:

```bash
cat skills/eeat-trust-authority/SKILL.md
```

### Enable TrustForge Automation

```bash
# Enable daily E-E-A-T automation
gh issue create --title "exit-quiet-mode" \
  --body "Enabling TrustForge E-E-A-T automation"

# Check if enabled
gh issue list --search "exit-quiet-mode in:title" --state open
```

### Run Manually

```bash
# Dry run (report only)
gh workflow run eeat-trust-cron.yml -f dry_run=true

# Full run (creates PR)
gh workflow run eeat-trust-cron.yml
```

---

## What Is E-E-A-T

Google's quality framework:
- **E**xperience — First-hand experience with the topic
- **E**xpertise — Recognized knowledge and skill
- **A**uthoritativeness — Recognition by others
- **T**rustworthiness — Accuracy, honesty, safety

---

## What TrustForge Does

1. **Generates schema.org markup** (Organization, Person, WebApplication)
2. **Maintains brand statement consistency** across platforms
3. **Monitors Google Knowledge Panel** presence
4. **Validates trust signals** (HTTPS, canonical URLs, broken links)
5. **Enforces entity hierarchy** (Freedom Angel Corp → child properties)
6. **Integrates ORCID** and professional affiliations
7. **Generates daily health reports**

---

## Files

- `SKILL.md` — Complete skill documentation
- `eeat-trust-authority.skill.yml` — Skill configuration
- `README.md` — This file

---

## Related

- **Workflow:** `.github/workflows/eeat-trust-cron.yml`
- **Documentation:** `docs/EEAT_AUTOMATION.md`
- **Entity Hierarchy:** `docs/Master_Inventory/ENTITY_HIERARCHY.md`
- **SEO Metadata:** `skills/seo-metadata/`

---

## Maintenance Schedule

- **Daily:** Schema validation, HTTPS check, link scan
- **Weekly:** NAP consistency, sitemap generation
- **Monthly:** Lighthouse audit, schema review
- **Quarterly:** Citation network expansion, Knowledge Panel optimization

---

## Enable/Disable

**Enable:**
```bash
gh issue create --title "exit-quiet-mode"
```

**Disable:**
```bash
gh issue close <exit-quiet-mode issue number>
```

---

*Agent: TrustForge v1.0.0*  
*Skill Path: `skills/eeat-trust-authority/`*
