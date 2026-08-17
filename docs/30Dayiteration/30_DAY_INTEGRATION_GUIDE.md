# Autonomous 30-Day Product Launch Integration Guide

**Version:** 1.0.0  
**Date:** 2026-05-02  
**Status:** ACTIVE  

---

## Overview

This guide explains how the 30-Day Autonomous Product Launch framework integrates with the existing revvel-standards infrastructure.

## Integration Points

### 1. Automated Product Pipeline

The 30-day blueprint is a **fast-track variant** of the full `AUTOMATED_PRODUCT_PIPELINE.md`:

| Feature | Full Pipeline | 30-Day Blueprint |
|---------|--------------|------------------|
| **Duration** | Ongoing (daily cron) | 30 days (one-shot) |
| **Research** | Automated social listening | Manual + quick validation |
| **ROI Gate** | Automated with human override | Implicit in MVP choice |
| **Build** | Agent-generated per shape | Template-based MVP |
| **Deploy** | Multiple marketplaces | Single platform first |
| **Marketing** | Full SEO/SEM/ads pipeline | Community-first launch |
| **Metrics** | Comprehensive tracking | Essential metrics only |

**Use the 30-day blueprint when:**
- Validating a new product idea quickly
- Testing market demand before full automation
- Learning what works before scaling

**Use the full pipeline when:**
- Scaling validated products
- Running multiple products simultaneously
- Automating long-term operations

### 2. Product Shapes

Both systems use the same product shapes:
- PDF / Booklet
- CLI Tool
- MCP Server
- Web App
- API
- Skill
- Extension
- Excel / Spreadsheet
- Token / Credits

The 30-day blueprint adds simplified build templates for each shape.

### 3. BOM Gatekeeper

Both systems use the same BOM (Bill of Materials) validation:
- Same `BOM.md` format
- Same credential provisioning
- Same Doppler/secrets integration
- Same rotation scheduling

**30-day difference:** Manual BOM resolution encouraged for first launch to understand dependencies.

### 4. Metrics & Analytics

The 30-day blueprint uses a **simplified metrics subset**:

**Primary (30-day):**
- Signups
- Conversions
- Revenue
- Active Users
- Refund Rate

**Full Pipeline (additional):**
- SEO rankings
- Ad performance (by channel/creative)
- LTV cohorts
- Feature usage heatmaps
- Competitor monitoring

### 5. Payment Integration

Same platforms supported:
- LemonSqueezy
- Gumroad
- Stripe

**30-day difference:** Choose one platform first, expand later if validated.

### 6. Deployment

Both use existing deploy workflows:
- GitHub Actions for CI/CD
- Vercel for web apps
- DigitalOcean for APIs
- npm/Homebrew for CLIs

**30-day difference:** Single deployment target first, add redundancy after validation.

## Folder Structure Compatibility

```text
projects/agent-generated/<product-slug>/
  ├── BOM.md                    # ✅ Same in both
  ├── state.json                # ✅ Same in both
  ├── research/                 # ✅ Same in both
  │   └── brief.md              # Generated with research template
  ├── build/                    # ✅ Same in both
  │   ├── <shape>/              # Per-shape build folders
  │   └── .gitkeep files
  ├── certify/                  # ✅ Same in both
  ├── deploy/                   # ✅ Same in both
  ├── monetize/                 # ✅ Same in both
  ├── market/                   # ✅ Same in both
  ├── sales/                    # ✅ Same in both
  ├── launch/                   # ⭐ 30-day specific
  │   └── 30-day-plan.md
  ├── metrics/                  # ⭐ 30-day specific
  │   └── config.json
  ├── automation/               # ⭐ 30-day specific
  │   └── README.md
  ├── learnings/                # ⭐ 30-day specific
  └── NEXT_STEPS.md             # ⭐ 30-day specific
```

**Migration path:** After 30-day validation, products can graduate to the full pipeline by adding the missing components (ROI automation, multi-platform deploy, full metrics).

## Skill Integration

### Planned Skill: `product-launch-30day`

**Path:** `skills/product-launch-30day/` (planned for future release)

**Trigger keywords:**
- "30 day launch"
- "quick product launch"
- "MVP launch"
- "validate product idea"
- "rapid product ship"

**What it will provide:**
- 30-day timeline execution
- MVP validation checklist
- Simplified metrics tracking
- Community launch playbook

**Status:** Not yet implemented. For now, use the script directly: `./scripts/autonomous-product-launcher.sh`

## Workflow Integration

### Existing Workflows (Used)
- `.github/workflows/credential-gatekeeper.yml` — BOM validation
- `.github/workflows/deploy-*.yml` — Deployment per shape (if available)
- CI/CD testing — Use existing test workflows in the repository

### Planned Workflows (30-Day Specific)
The following workflows are planned for future releases:
- `30day-metrics.yml` — Daily metrics collection (planned)
- `30day-reminder.yml` — Timeline milestone alerts (planned)

For now, metrics tracking and reminders are manual processes.

## Script Integration

### New Scripts
- `scripts/autonomous-product-launcher.sh` — Main launcher
- Future planned:
  - `research-automation.sh` — Automated research (planned)
  - `metrics-dashboard.sh` — Generate metrics dashboard (planned)

### Existing Scripts (Used)
- `scripts/init-product.sh` — Product scaffolding (called by launcher)

## Standards Integration

### Existing Standards (Applied)
- `AUTOMATED_PRODUCT_PIPELINE.md` — Full pipeline reference
- `SAAS_PRODUCTS.md` — SaaS-specific guidance
- `PRICING.md` — Pricing strategies
- `GATEKEEPER.md` — BOM validation
- `OAUDREY_DEPLOYMENT_STANDARD.md` — Deployment

### New Standards
- `docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md` — This blueprint

## Agent Instructions Integration

### AGENTS.md Updates

Add to the "Your Mission" section:

```markdown
### Quick Product Launch (30 Days)

When asked to "launch a new product" or "validate an idea":
1. Load skill: `product-launch-30day`
2. Run: `scripts/autonomous-product-launcher.sh <name> --shape <type>`
3. Follow: `docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md`
4. Track: Daily metrics against 30-day targets
5. Ship: MVP by day 22, full launch by day 27
```

### GOAP Integration

The 30-day blueprint complements GOAP (Goal-Oriented Action Planning):
- **GOAP handles:** Long-term goal decomposition, multi-project orchestration
- **30-day handles:** Single-product focused execution, rapid iteration

## Revenue Integration

### GOAL.md Alignment

The 30-day blueprint directly supports GOAL.md targets:

**Month 1 Goal:** $0 → $3,000
- Week 1: Deploy Reese-Reviews dashboard → $500
- Week 2: Finish video pipeline → $500
- Week 3: Launch PDF guides (5 × $100) → $500
- Week 4: Upsell 2 clients at $750 → $1,500

**30-day blueprint enables:** Each of these can be a 30-day product launch.

### Projects to Ship Integration

The blueprint aligns with `docs/PROJECTS_TO_SHIP.md`:

**Priority 1 (Next 30 Days):**
- Vine review optimization → Use 30-day blueprint for dashboard
- Product rental → Use 30-day blueprint for booking system
- Overflow sales → Use 30-day blueprint for marketplace
- Consulting → Use 30-day blueprint for service landing page

## Migration Path

### From 30-Day to Full Pipeline

After validation (30 days):
1. **Metrics validated?** → Keep running, add full pipeline automation
2. **ROI positive?** → Graduate to multi-platform deployment
3. **Scaling needed?** → Add full marketing automation
4. **Need optimization?** → Add A/B testing, advanced analytics

### From Full Pipeline to 30-Day

For new product ideas:
1. Use 30-day blueprint first (validate demand)
2. If validated, add to full pipeline (automate operations)

## Testing & Validation

### Test the Integration

```bash
# 1. Test script (dry run)
./scripts/autonomous-product-launcher.sh "test-idea" --shape pdf --dry-run

# 2. Create real test product
./scripts/autonomous-product-launcher.sh "test-mvp" --shape app --days 30

# 3. Verify folder structure
tree projects/agent-generated/test-mvp

# 4. Check BOM integration
cat projects/agent-generated/test-mvp/BOM.md

# 5. Test metrics config
cat projects/agent-generated/test-mvp/metrics/config.json
```

### Validation Checklist

- [ ] Script creates proper folder structure
- [ ] BOM.md format matches gatekeeper expectations
- [ ] state.json compatible with existing tools
- [ ] Metrics config includes all required fields
- [ ] Launch plan has 30-day timeline
- [ ] Next steps guide is clear and actionable

## Success Metrics

### Integration Success
- 30-day products can graduate to full pipeline seamlessly
- No duplicate work between systems
- Consistent metrics across both
- Agents understand when to use each

### Product Success (via 30-Day)
- MVP validated within 30 days
- First paying customer by day 22
- $500+ revenue or clear pivot signal by day 30
- Clear path to scale if validated

## Troubleshooting

### Script Errors
**Problem:** Script fails with "command not found"  
**Solution:** Check dependencies: `git`, `jq`, `python3`, `curl`

**Problem:** Project folder already exists  
**Solution:** Choose different name or delete existing folder

### Integration Issues
**Problem:** BOM validation fails  
**Solution:** Ensure BOM.md format matches `standards/GATEKEEPER.md`

**Problem:** Metrics not tracking  
**Solution:** Verify analytics integration in `metrics/config.json`

### Agent Confusion
**Problem:** Agent uses full pipeline when 30-day is better  
**Solution:** Clarify in prompt: "quick validation" or "30-day launch"

**Problem:** Agent uses 30-day when full pipeline is better  
**Solution:** Clarify: "scale existing product" or "automate operations"

## Roadmap

### Phase 1: Core Framework (Current)
- [x] Blueprint document
- [x] Launcher script
- [x] Integration guide
- [x] Example projects

### Phase 2: Automation (Next)
- [ ] Automated research script
- [ ] Metrics dashboard generator
- [ ] GitHub Actions workflows
- [ ] Email automation templates

### Phase 3: Advanced Features
- [ ] A/B testing framework
- [ ] Multi-variant launches
- [ ] Cohort analysis
- [ ] Automated pivots

## Resources

- **Blueprint:** `docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md`
- **Full Pipeline:** `standards/AUTOMATED_PRODUCT_PIPELINE.md`
- **Launcher Script:** `scripts/autonomous-product-launcher.sh`
- **Examples:** `projects/agent-generated/_examples/`
- **Skills:** `skills/product-launch-30day/` (planned for future release)

---

## Quick Reference

```bash
# Create new 30-day product
./scripts/autonomous-product-launcher.sh "name" --shape app

# Test integration
./scripts/autonomous-product-launcher.sh "test" --dry-run

# View structure
tree projects/agent-generated/<slug>

# Check metrics
cat projects/agent-generated/<slug>/metrics/config.json

# View launch plan
cat projects/agent-generated/<slug>/launch/30-day-plan.md
```

---

*Integration guide for the 30-Day Autonomous Product Launch framework*  
*Part of the revvel-standards ecosystem*  
*Version 1.0.0 — 2026-05-02*
