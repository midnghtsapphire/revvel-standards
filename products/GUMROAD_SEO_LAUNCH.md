# Gumroad SEO + Launch Playbook — Revvel Skills Vault & Packs

**Date:** 2026-08-05  
**Governance:** midnghtsapphire/revvel-standards · REVENUE_GATE  
**Status:** Active for Finisher-2 close-loop

This is the SSOT for optimizing and launching the Revvel AI Skills products on Gumroad.

---

## 1. Live product drafts (angelreporter.gumroad.com)

| Product                          | Price | Draft URL                                  | Cover file                      |
| -------------------------------- | ----- | ------------------------------------------ | ------------------------------- |
| **The Revvel AI Skills Vault**   | $99   | <https://angelreporter.gumroad.com/l/oefmwi> | covers/cover-vault.jpg          |
| AI Agent Operations Pack         | $29   | <https://angelreporter.gumroad.com/l/treilq> | covers/cover-agent-ops.jpg      |
| Developer Workflow Pack          | $29   | <https://angelreporter.gumroad.com/l/kohdkz> | covers/cover-dev-workflow.jpg   |
| Code Review & Testing Pack       | $29   | <https://angelreporter.gumroad.com/l/harmm>  | covers/cover-review-testing.jpg |
| DevOps & Automation Pack         | $29   | <https://angelreporter.gumroad.com/l/pkdjmy> | covers/cover-devops.jpg         |
| Security & Compliance Pack       | $29   | <https://angelreporter.gumroad.com/l/lmesfo> | covers/cover-security.jpg       |
| Growth, Content & Analytics Pack | $29   | <https://angelreporter.gumroad.com/l/gccegs> | covers/cover-growth.jpg         |
| Founder Ops Pack                 | $29   | _(create tomorrow — daily limit)_          | covers/cover-founder.jpg        |

PDFs live in private sellables / CI artifacts (never public raw).  
Covers live in private artifacts during build; attach via dashboard.

---

## 2. Gumroad SEO checklist (2026)

### Title formula

`Primary keyword + outcome + audience`

Examples:

- Vault: `AI Agent Skills Vault for Claude Code & Cursor — 49 Production Playbooks`
- Pack: `Claude Code Agent Ops Pack — 11 Multi-Agent Playbooks`

Put the keyword in the first 50 characters. Under ~70 chars total.

### Custom permalink (slug)

Keyword-rich when available:

- `/l/ai-skills-vault`
- `/l/claude-agent-ops`
- `/l/dev-workflow-skills`

### Description structure (300–1500+ words; longer converts ~20×)

1. **Lead (first 2 sentences)** — primary keyword + problem + outcome
2. **What you get** — bulleted, specific counts and file types
3. **Who it is for** — Claude Code / Cursor / Windsurf / Cline users, solo founders
4. **How to use** — 3–4 step install
5. **Works with** — list tools
6. **FAQ** (4–8 Qs) — seeds FAQ schema and handles objections
7. **Guarantee** — 30-day refund removes friction

Use Markdown: headers, bold, bullets. Keyword in first paragraph naturally.

### Tags (use all available slots — typically 5)

Mix:

1. Broad category: `ai agents` or `developer tools`
   2–3. Specific topic: `claude code`, `cursor`, `prompt engineering`
2. Format: `playbook` or `digital download`
3. Audience: `solo founders` or `ai coding`

Sweet spot: tags that already have 50–500 products (enough traffic, not buried).

**Recommended tag sets**

| Product          | Tags                                                                |
| ---------------- | ------------------------------------------------------------------- |
| Vault            | ai agents, claude code, cursor, prompt engineering, developer tools |
| Agent Ops        | ai agents, multi-agent, claude code, cursor, automation             |
| Dev Workflow     | developer tools, claude code, cursor, git, testing                  |
| Review & Testing | code review, testing, claude code, cursor, automation               |
| DevOps           | devops, deployment, claude code, automation, cicd                   |
| Security         | security, compliance, ada, claude code, developer tools             |
| Growth           | seo, content marketing, analytics, claude code, growth              |
| Founder Ops      | founders, product ops, tax, claude code, solo founders              |

### Covers & previews

- 2–3 images minimum (products with 2–3 covers earn ~15× more revenue)
- Page-1 of the catalogue PDF + branded mockup
- Minimum ~1280×720; portrait catalogue pages (1275×1650) also work
- Must read at thumbnail size

### Discover & velocity

- Enable product for Discover / recommendations
- Optional: temporary commission boost (20–30%) for first 30 days to buy ranking velocity
- Early sales + ratings are the strongest ranking signals
- Ask first 5 buyers for a short review

### Pricing psychology

- Vault $99 = anchor / best-value bundle
- Packs $29 = middle tier (sweet spot for impulse)
- Do **not** discount at launch; raise later if demand is strong
- Consider a “Starter” free teaser skill later to feed the funnel

---

## 3. Launch sequence (commerce-first)

1. [ ] Attach matching PDF + cover to each draft
2. [ ] Paste optimized title, description, tags from this doc + GUMROAD-LISTING.md / GUMROAD-PACKS.md
3. [ ] Set custom permalink if available
4. [ ] Enable Discover
5. [ ] Publish Vault first (anchor), then packs
6. [ ] Soft share to own channels (X, email, hub CTAs)
7. [ ] Collect first 3–5 reviews
8. [ ] Turn on affiliates (Finisher-5) after ≥1 paid sale
9. [ ] Wire hub / landing CTAs to live Gumroad URLs (Finisher-4)

---

## 4. Wiring into revvel-standards (SSOT)

| Artifact               | Location                                           | Status                            |
| ---------------------- | -------------------------------------------------- | --------------------------------- |
| Listing copy           | `products/GUMROAD-LISTING.md`                      | Exists — keep in sync with live   |
| Pack copy              | `products/GUMROAD-PACKS.md`                        | Exists — keep in sync             |
| Builders               | `products/build_skills_vault.py`, `build_packs.py` | Exists                            |
| R&D fleet listing      | `products/rnd-research-fleet/GUMROAD_LISTING.md`   | Exists (defer until vault sells)  |
| Marketplace guide      | `docs/MARKETPLACE_GUIDE.md`                        | Exists — references Gumroad       |
| Product pipeline skill | `skills/product-pipeline/`                         | Exists — includes gumroad publish |
| SEO metadata skill     | `skills/seo-metadata/`                             | Exists                            |
| This SEO playbook      | `products/GUMROAD_SEO_LAUNCH.md`                   | **This file**                     |
| Covers                 | private artifacts / Release assets                 | Not public raw                    |
| Live URLs              | recorded above                                     | Update after publish              |

**Rules**

- Never put paid PDF contents on public GitHub raw
- Store sellables as CI artifacts or private Release assets
- After first sale → enable affiliates only (REVENUE_GATE)
- Hub CTAs point to Gumroad, not free GitHub downloads of paid packs

---

## 5. Optimized title + one-liner set (ready to paste)

**Vault**

- Title: `AI Agent Skills Vault for Claude Code & Cursor — 49 Production Playbooks`
- Summary: `49 copy-paste skills that turn Claude Code, Cursor, Windsurf & Cline into domain experts. One download.`

**AI Agent Operations**

- Title: `Claude Code Multi-Agent Ops Pack — 11 Production Playbooks`
- Summary: `Routing, memory, handoffs, fallbacks & self-eval for reliable multi-agent stacks.`

**Developer Workflow**

- Title: `AI Coding Agent Workflow Pack — 15 Playbooks for Claude Code & Cursor`
- Summary: `Day-to-day playbooks that make an AI coding agent actually ship.`

**Code Review & Testing**

- Title: `Autonomous Code Review & Testing Pack — Claude Code Playbooks`
- Summary: `Agentic review, bug detection & test coverage on autopilot.`

**DevOps & Automation**

- Title: `DevOps & Automation Skill Pack for AI Coding Agents`
- Summary: `Deploy, self-heal, bots & finance flows without babysitting.`

**Security & Compliance**

- Title: `Security & ADA Compliance Skill Pack for Claude Code`
- Summary: `Credential hygiene, GRC, accessibility — keep agents safe and compliant.`

**Growth, Content & Analytics**

- Title: `Growth Content & Analytics Skill Pack for AI Agents`
- Summary: `SEO, E-E-A-T content, marketing ops & product analytics — agent-driven.`

**Founder Ops**

- Title: `Founder Ops Skill Pack — Product Pipeline, Finance & Tax`
- Summary: `Product, UI, USDA loan packaging & multi-entity tax playbooks for solo founders.`

---

_See also: `products/GUMROAD-LISTING.md`, `products/GUMROAD-PACKS.md`, `docs/MARKETPLACE_GUIDE.md`, `REVENUE_GATE.md`._
