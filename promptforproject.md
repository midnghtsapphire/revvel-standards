# Prompt for Project Research, Redevelopment & Ship-to-Market

> This prompt is used to run repositories through revvel-standards for deep web research, opportunity identification, and redeployment with improvements.

## Overview

Execute the following workflow for each repository in the midnghtsapphire organization:

---

## Step 0: Route the request before doing any work

Read these required fields from the work request:
- OUTPUT_TYPE
- RESEARCH_MODE
- DELIVERY_MODE
- ITERATION_MODE
- LIFECYCLE_MODE
- COMMERCIAL_MODE
- DEPLOYMENT_TARGET

Rules:
- RESEARCH_MODE controls research depth only. It does not change the deliverable.
- OUTPUT_TYPE is the hard constraint on the deliverable.
- Every request must pass viability scoring before implementation.
- If score is 24–30, Decision=BUILD.
- If score is 16–23, Decision=HOLD unless explicitly overridden.
- If score is below 16, Decision=ARCHIVE unless explicitly overridden.
- If DELIVERY_MODE=proposal-first, stop after proposal.
- If DELIVERY_MODE=build-with-brief-options, provide 1–2 concise options, then implement.
- If DELIVERY_MODE=build-direct, implement immediately after viability passes.
- If ITERATION_MODE=single-pass, do not expand into multi-phase app roadmaps unless blocked.
- If LIFECYCLE_MODE=refresh-existing, audit the current repo/assets first before proposing rebuilds.
- If OUTPUT_TYPE=cli-product, do not default to a web app.
- If OUTPUT_TYPE=mcp-product, optimize for tool definitions, schema quality, packaging, docs, and selective tool exposure.
- If OUTPUT_TYPE=api-product, optimize for endpoint design, auth, schema, docs, pricing model, and hosting readiness.
- If OUTPUT_TYPE=sellable-pdf, optimize for document quality and monetizable packaging; do not create an app unless explicitly requested.
- If OUTPUT_TYPE=invention-flow, follow invention evaluation before any build recommendation.

## Step 1: Repository Discovery

```bash
# Find all repositories in the midnghtsapphire organization
# Check each repo for:
# - Active development status
# - Last commit date
# - Open issues and PRs
# - Deployment status
```

---

## Step 2: Deep Web Research

For each repository identified, perform deep web research:

1. **Market Opportunity Analysis**
   - Research current market trends for the project's domain
   - Identify competitors and alternatives
   - Find gaps in existing solutions
   - Research monetization opportunities

2. **Technology Stack Research**
   - Research latest versions of dependencies
   - Identify security vulnerabilities
   - Find performance optimization opportunities
   - Research FOSS alternatives to paid dependencies

3. **SEO & Content Research**
   - Research relevant keywords
   - Analyze competitor content strategies
   - Identify partnership opportunities
   - Research affiliate programs

---

## Step 3: Requirements from revvel-standards

Follow ALL requirements in `revvel-standards/docs/AGENTS.md`:

1. **Prime Directive** - 10M by 2030, $2000+/month
2. **Driven Autonomy** - Never stop at blockers
3. **Self-Healing** - Fix errors autonomously
4. **Ship to Market** - Working code, not plans

---

## Step 4: Redevelopment & Redesign

If improvements are needed:

1. **Fix All Errors**
   - Run tests and fix failures
   - Fix all linting errors
   - Fix security vulnerabilities
   - Fix deployment issues

2. **Enhance Features**
   - Add missing features from research
   - Improve UX/UI per frontend-design skill
   - Add accessibility features
   - Optimize performance

3. **Add Monetization**
   - Add affiliate links per rvvel-affiliate-links MCP
   - Add Gumroad/LemonSqueezy integration
   - Add tracking and analytics

---

## Step 5: Deployment Verification

EVERY project MUST have:

1. **Vercel Deployment**
   - Deploy to Vercel with proper configuration
   - Ensure deployment protection is configured
   - Get preview and production URLs

2. **UI Verification**
   - Test all pages render correctly
   - Test all forms work
   - Test mobile responsiveness
   - Verify no console errors

---

## Step 6: Documentation Requirements

ALL projects MUST have in README.md:

### Test Section
```text
## Test

| Feature | Status | URL |
|--------|--------|-----|
| Homepage | ✅ Working | https://your-project.vercel.app |
| Dashboard | ✅ Working | https://your-project.vercel.app/dashboard |
| API | ✅ Working | https://your-project.vercel.app/api/health |
```

### Deployment Section
```text
## Deployment

**Production:** [Vercel Production URL]
**Preview:** [Vercel Preview URL]
**Status:** ![Deployment Status](badge-url)
```

---

## Step 7: Save This Prompt

Save this prompt to:
1. `/workspace/project/promptforproject.md` (local)
2. Push to the prompts repository in midnghtsapphire org

---

## Example Usage

```text
Run each repository one at a time through revvel-standards deep web research best app opportunities and redevelop, redesign if necessary. Follow all requirements in revvel-standards. All docs must have a URL in Vercel to test the app in the TEST section of the README file.
```

---

## Setup Script (Optional)

Add `.openhands/setup.sh` to run automatically when OpenHands begins:

```bash
#!/bin/bash
export MY_ENV_VAR="my value"
sudo apt-get update
sudo apt-get install -y lsof
cd frontend && npm install ; cd ..
```

---

## Success Criteria

- [ ] All repositories identified and researched
- [ ] Market opportunities documented
- [ ] Errors fixed in all repos
- [ ] Improvements implemented where needed
- [ ] Vercel deployment URL for each project
- [ ] TEST section in README with working URLs
- [ ] Working code pushed to repository
- [ ] Self-healing entry added to learnings.md
