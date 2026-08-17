# Revvel Skills Marketplace Guide

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Active  
**Purpose:** How to list, price, and sell Revvel skills on digital marketplaces

---

## Table of Contents

1. [Overview: Selling AI Skills](#1-overview-selling-ai-skills)
2. [Where to List Your Skills](#2-where-to-list-your-skills)
3. [Pricing Strategy](#3-pricing-strategy)
4. [Writing a Marketplace Listing](#4-writing-a-marketplace-listing)
5. [Platform Setup Guides](#5-platform-setup-guides)
6. [Value Metrics That Sell](#6-value-metrics-that-sell)
7. [Skill Tiers & Bundles](#7-skill-tiers--bundles)
8. [Protecting Your Work](#8-protecting-your-work)
9. [Growing Your Catalog](#9-growing-your-catalog)
10. [Revenue Projections](#10-revenue-projections)

---

## 1. Overview: Selling AI Skills

A Revvel skill is a **deployable behavioral instruction set** for AI tools. You've done the hard work of:
- Researching the domain
- Writing the system prompt
- Testing with PromptFoo
- Building the one-click installer
- Writing easy-to-follow documentation

Now you can sell this value. You're not selling code — you're selling **time savings, expertise, and instant capability**.

### Why People Pay for AI Skills

| What They're Really Buying | Your Value Proposition |
|---|---|
| Hours of their time back | "This saves me 3 hours/week" |
| Expertise they don't have | "This gives me a senior dev on demand" |
| Consistency & reliability | "This never forgets to check for security issues" |
| Easy setup | "Double-click and it just works" |

---

## 2. Where to List Your Skills

### Primary Marketplaces

#### 🦞 ClawMarket (`clawmarket.io`)
**Best for:** Claude-native skills and AI tools  
**Audience:** Claude/Anthropic ecosystem users  
**Revenue share:** ~20–30%  
**Price range:** $9–$99  
**Listing type:** One-time purchase or subscription  
**Notes:** The most targeted platform for Revvel-style skills. Audience already uses Claude.

#### 💰 Gumroad (`gumroad.com`)
**Best for:** Simple one-time purchases, creative/niche skills  
**Audience:** General digital product buyers  
**Revenue share:** 10% flat fee  
**Price range:** $5–$49  
**Listing type:** One-time purchase, bundle, or membership  
**Notes:** Zero monthly fee. Best for launching fast. Accepts Stripe payments.

#### 🛒 GitHub Marketplace (`github.com/marketplace`)
**Best for:** Developer workflow skills, GitHub Actions, CLI tools  
**Audience:** Developers  
**Revenue share:** 25% (GitHub Apps) / Free listing (Actions)  
**Price range:** Free–$29/month  
**Notes:** Free Actions listing has huge discoverability. Consider open-source + paid support model.

#### 🤗 Hugging Face (`huggingface.co/spaces`)
**Best for:** ML-adjacent skills, research tools, open models  
**Audience:** AI/ML researchers and practitioners  
**Revenue share:** Free hosting (Spaces) / donation model  
**Price range:** Free–donation  
**Notes:** Best for FOSS skills. Use HF Spaces as demo, Gumroad for paid version.

#### 🎮 Itch.io (`itch.io`)
**Best for:** Creative, experimental, and indie AI tools  
**Audience:** Creative technologists, indie developers  
**Revenue share:** You set it (0–30%)  
**Price range:** $1–$20  
**Notes:** "Name your price" model works well here. Experimental skills find audiences.

#### 🚀 Product Hunt (`producthunt.com`)
**Best for:** Launch visibility, not ongoing sales  
**Revenue share:** Free  
**Notes:** Use for launch day only. Drive traffic from PH to Gumroad or ClawMarket.

### Secondary Platforms

| Platform | Best For | Notes |
|---|---|---|
| **LemonSqueezy** | SaaS pricing, subscriptions | Stripe alternative, good for subscriptions |
| **Payhip** | EU-friendly, simple | Good alternative to Gumroad |
| **Ko-fi** | Supporter/donation model | Good for open source with premium tier |
| **Whop** | Community + product bundles | Growing marketplace for digital tools |
| **Maven** | Courses + skills bundle | If adding training component |
| **Notion Template Gallery** | If skill uses Notion | Niche but targeted |
| **FlowGPT** | GPT/prompt marketplace | Alternative audience |
| **PromptBase** | Prompt/agent marketplace | Direct prompt sales |

---

## 3. Pricing Strategy

### The ROI Formula

Your price should reflect the value the skill delivers:

```text
Skill Value = (Hours Saved Per Week × Developer Hourly Rate × 52 weeks) × 0.10
```

The `0.10` factor means: price the skill at 10% of the annual value it delivers.

**Examples:**

| Skill | Hours Saved/Week | Rate | Annual Value | Recommended Price |
|---|---|---|---|---|
| Session startup | 0.5 hrs | $75 | $1,950 | $9–$19 |
| Code review | 2 hrs | $75 | $7,800 | $49 |
| Security audit | 3 hrs | $75 | $11,700 | $79 |
| Full methodology | 5 hrs | $75 | $19,500 | $199 |
| Custom skill | Variable | $75+ | Client-specific | $500+ |

### Price Tiers

| Tier | Price | Contents |
|---|---|---|
| **Free** | $0 | Skill SKILL.md only, manual setup, no installer |
| **Starter** | $9 | Skill + Windows installer |
| **Standard** | $19 | Skill + both installers + PromptFoo tests |
| **Pro** | $49 | Skill + installers + tests + persona + full docs |
| **Bundle (3 skills)** | $59 | Three Standard skills together |
| **Bundle (5 skills)** | $99 | Five Standard skills together |
| **Methodology Pack** | $199 | Full framework + 10+ skills + training guide |
| **Custom skill** | $500–$2,000 | Custom-built skill for client's specific workflow |
| **Enterprise license** | $299/seat | White-label rights + unlimited team installs |

### Free Tier Strategy

Always offer a free tier. This builds trust and drives upgrades:
- **Free:** Just the SKILL.md — they have to set it up manually
- **Paid:** Everything works with one double-click

The conversion from "this is hard" to "this just works" is your value.

---

## 4. Writing a Marketplace Listing

### Template

```markdown
## [Skill Name] — AI Skill for [Claude Code / Cursor / Copilot]

**What it does in one sentence:**
[Clear, outcome-focused description. "Automatically reviews your code 
for security issues before every commit."]

**Who it's for:**
[Specific user. "Freelance developers who want expert code review 
without hiring a senior developer."]

**Time saved:** [X] hours per week  
**ROI:** Pays for itself in [X] days at [$PRICE]

---

### How to install (it takes 2 minutes)

1. Download the installer
2. Double-click the file
3. Follow the on-screen steps
4. Open [AI tool] — the skill is already active

That's it. No terminal. No commands. No config files.

---

### What you get

✅ [Feature 1 — outcome-focused]  
✅ [Feature 2 — outcome-focused]  
✅ [Feature 3 — outcome-focused]  
✅ Works on Windows 10/11 and macOS 12+  
✅ No coding required  
✅ Tested and verified  
✅ Free updates  

---

### What others are saying

[Testimonial placeholder — add real testimonials as you get them]

---

### Frequently asked questions

**Do I need any technical knowledge?**  
No. If you can double-click a file, you can install this skill.

**Does it work with [AI tool]?**  
Yes, [list compatible tools].

**What if it doesn't work?**  
Email [your email] for a full refund, no questions asked.

---

**Price: $[PRICE]**

[Download button]
```

### Listing Best Practices

1. **Lead with outcome, not features** — "Saves 3 hours/week" beats "Includes PromptFoo tests"
2. **Use specifics** — "3 hours/week" beats "saves time"
3. **Show the simplicity** — "2-minute install" beats "easy to install"
4. **Add a guarantee** — Full refund policy removes purchase anxiety
5. **Use before/after** — Table showing "Before this skill" vs "After this skill"
6. **Screenshot the installer** — Visual proof that it's really just double-click
7. **List compatible tools** — Claude Code, Cursor, Copilot, Windsurf, Cline

---

## 5. Platform Setup Guides

### Gumroad Setup (Fastest Path to Sales)

1. Create account at gumroad.com
2. Click "New Product" → "Digital product"
3. Upload a ZIP file containing:
   - `install/windows/install-[skill].bat`
   - `install/mac/install-[skill].command`
   - `skills/[skill]/SKILL.md`
   - `skills/[skill]/[skill].skill.yml`
   - `README.md`
4. Set price, write description using the template above
5. Enable "Pay what you want" with your recommended price as minimum
6. Add preview image (screenshot of installer or skill in action)
7. Publish

### GitHub Marketplace (Developer Audience)

1. Create a GitHub repository for the skill
2. Add a `marketplace.yml` manifest
3. Submit for GitHub Marketplace review
4. For GitHub Actions: add to `.github/workflows/` with marketplace metadata
5. Free listings get significant discoverability

### ClawMarket (Highest-Intent Buyers)

Follow the ClawMarket submission process at clawmarket.io/developers.  
These buyers are specifically looking for Claude-compatible skills.

---

## 6. Value Metrics That Sell

When writing listings, use these proven value metrics:

### Time Metrics
- Hours saved per week / month / year
- Minutes to install vs. hours to do manually
- "Setup in under 2 minutes"

### Quality Metrics
- "Never misses a security issue"
- "Catches X% more bugs than manual review"
- "Consistent results every time"

### Money Metrics
- "Pays for itself in [X] days"
- "Replaces a $75/hr consultant for this task"
- "ROI of [X]% in first month"

### Simplicity Metrics
- "Double-click to install"
- "No coding required"
- "Works immediately, no configuration"

---

## 7. Skill Tiers & Bundles

### Single Skills

Price individual skills based on their ROI value. Keep most under $49 for impulse purchases.

### Bundles That Work

| Bundle Name | Skills Included | Price | Why It Sells |
|---|---|---|---|
| **Developer Starter Pack** | code-review + security + testing | $59 | Covers the three most common dev needs |
| **Session Management Pack** | system-state + mvi-contract + context-management + wrap-up | $39 | Complete session workflow |
| **Deploy & Monitor Pack** | deployment + error-reporting + security | $69 | Full production ops |
| **Content Creator Pack** | brainstorming + auto-documentation + seo-metadata | $49 | Writer's toolkit |
| **Full Revvel Framework** | All 25+ skills | $199 | Best value, clearest offer |

### Subscription Model

Consider a subscription for regular skill updates:
- **$9/month** — Access to all skills + monthly updates
- **$19/month** — All skills + priority support + early access to new skills
- **$99/year** — Annual discount + everything in Pro

---

## 8. Protecting Your Work

### Licensing Options

| License | What It Allows | When to Use |
|---|---|---|
| **Personal license** | One person, one machine | Default for $9–$49 products |
| **Team license** | Up to 5 people | $99–$199 products |
| **Organization license** | Unlimited employees | $299–$999 products |
| **White-label** | Resell under your brand | $500–$2,000 custom deals |

### What to Put in Your License

```text
This skill is licensed for personal use by a single individual.
You may not redistribute, resell, or share this skill without 
a commercial license. For team or commercial licensing, 
contact [your email].
```

### Open Source vs. Paid

Consider making the SKILL.md open source (MIT) while charging for:
- The one-click installer
- Pre-configured persona
- PromptFoo test suite
- Video tutorial
- Support access

This builds trust (open source) while capturing value (paid tooling).

---

## 9. Growing Your Catalog

### The Compound Strategy

Each skill you build makes the next one easier and more valuable:

1. **Build core skills first** — The ones that work across all projects
2. **Add specialty skills** — Domain-specific skills for niche markets
3. **Create bundles** — Bundle related skills at a discount
4. **Build the framework skill** — A skill that installs ALL your other skills at once
5. **White-label for enterprises** — Custom versions of your skills for companies

### Skill Idea Backlog

Keep a running list. Every time you do a repetitive AI task, ask:
*"Could this be a skill?"*

Common high-value opportunities:
- Industry-specific compliance checks (HIPAA, SOC2, PCI-DSS)
- Niche code review (React, Django, Rails)
- Domain-specific writing (legal, medical, finance)
- Workflow automation for specific tools (Notion, Jira, Salesforce)
- Custom personas for specific job roles

### Launch Sequence

1. **Week 1:** Build and test the skill
2. **Week 2:** Write listing, take screenshots, record 60-second demo video
3. **Week 3:** List on Gumroad (fast) + submit to ClawMarket
4. **Week 4:** Post to Product Hunt, share in developer communities
5. **Month 2:** First reviews in → refine based on feedback
6. **Month 3:** Build bundle with 2-3 related skills

---

## 10. Revenue Projections

### Conservative Scenario (Solo Developer, Part-time)

| Month | Skills Listed | Avg Price | Sales/Month | Revenue |
|---|---|---|---|---|
| 1 | 2 | $19 | 5 | $95 |
| 3 | 5 | $29 | 15 | $435 |
| 6 | 10 | $39 | 30 | $1,170 |
| 12 | 15 + bundles | $49 avg | 60 | $2,940 |

### Growth Scenario (Active Catalog Building)

| Month | Active Products | Avg Price | Sales/Month | Revenue |
|---|---|---|---|---|
| 3 | 10 | $39 | 40 | $1,560 |
| 6 | 20 | $49 | 80 | $3,920 |
| 12 | 30 + 3 bundles | $59 avg | 150 | $8,850 |
| 24 | 50 + enterprise | $99 avg | 200+ | $19,800+ |

### Key Leverage Points

- **Bundles** triple revenue per customer without tripling work
- **Enterprise licensing** ($299–$999/seat) can be 10x a single sale
- **Subscriptions** create predictable monthly revenue
- **Referral program** — offer affiliates 20–30% for driving sales

---

*See also: [AGENTIC_METHODOLOGY_STANDARD.md](Master_Inventory/AGENTIC_METHODOLOGY_STANDARD.md) for skill building methodology.*  
*See also: [SKILL_CREATION_GUIDE.md](SKILL_CREATION_GUIDE.md) for step-by-step skill creation.*
