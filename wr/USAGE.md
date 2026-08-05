# WR Repository Review System - Usage Guide

This guide explains how to use the Weekly Research (WR) system for reviewing all repositories in the midnghtsapphire organization.

## Quick Start

### 1. Generate WR for a Single Repository

**Via Script:**
```bash
cd wr/scripts
./generate-wr.sh neurooz
```

**Via GitHub Issue:**
Create an issue with title: `[WR] Repository Review - [neurooz]`  
The `weekly-research.yml` workflow will automatically detect and process it.

### 2. Generate WRs for Priority Repositories

**P0 (Highest Priority):**
```bash
cd wr/scripts
./batch-generate-wrs.sh p0
```

**P1 (High Priority):**
```bash
cd wr/scripts
./batch-generate-wrs.sh p1
```
```text

**P1 (High Priority):**
```bash
./batch-generate-wrs.sh p1
```

### 3. Create WR via Issue

Create an issue with title format:
```text
[WR] Repository Review - [repository-name]
```

Example:
```text
[WR] Repository Review - [neurooz]
```

The automation will:
1. Detect the `[WR]` prefix
2. Label the issue with `weekly-research`, `wr:in-progress`
3. Generate the WR document
4. Create a PR with findings
5. Update the issue with completion status

---

## Directory Structure

```text
wr/
├── README.md                    # System overview
├── WR_TEMPLATE.md              # Standard template
├── WR_TRACKER.md               # Master tracker
├── USAGE.md                    # This file
├── scripts/
│   ├── generate-wr.sh          # Generate single WR
│   ├── batch-generate-wrs.sh  # Generate multiple WRs
│   └── update-tracker.sh       # Update tracker
└── repos/
    ├── neurooz.md              # Generated WR
    └── ...                      # More WRs
```

---

## Workflow Integration

### With GitHub Actions

The WR system integrates with `.github/workflows/wr-repository-review.yml`:

**Triggers:**
1. **Issue opened** with `[WR]` prefix in title
2. **Manual workflow dispatch** via GitHub Actions UI
3. **Scheduled** (can be configured)

**Actions Taken:**
1. Label issue with `weekly-research`, `wr:in-progress`, `deep-research`
2. Generate WR document(s)
3. Update WR_TRACKER.md
4. Create PR with findings
5. Update issue with `wr:complete` label

### With Weekly Research Process

The WR repository review system follows the standard Weekly Research process defined in `/docs/WEEKLY_RESEARCH_PROCESS.md`:

1. **Detection** - Issue or manual trigger
2. **Generation** - WR document created from template
3. **Research** - Manual or automated research fills in sections
4. **Review** - PR review process
5. **Implementation** - Tasks created from recommendations
6. **Tracking** - Status updated in WR_TRACKER.md

---

## WR Template Sections

Each WR includes:

### Step 1: Repository Discovery
- Repository metadata
- Current status (commits, issues, PRs)
- Technology stack
- Deployment status

### Step 2: Deep Web Research
- Market opportunity analysis
- Competitor research
- Gap identification
- Monetization opportunities
- Technology stack audit
- SEO & content research

### Step 3: revvel-standards Requirements
- Prime Directive alignment (10M by 2030, $2000+/month)
- Driven autonomy assessment
- Self-healing capabilities
- Ship-to-market status

### Step 4: Redevelopment & Redesign
- Error fixes (tests, linting, security, deployment)
- Feature enhancements
- UX/UI improvements
- Accessibility features
- Performance optimization
- Monetization integration

### Step 5: Deployment Verification
- Vercel deployment setup
- UI verification checklist
- Screenshots/testing

### Step 6: Documentation Requirements
- TEST section in README
- Deployment section in README
- Additional documentation

### Step 7: Findings & Recommendations
- Immediate actions (P0)
- Short-term actions (P1)
- Long-term actions (P2)
- Risks & considerations
- Alternatives considered

---

## Examples

### Example 1: Single Repository WR

**Command:**
```bash
cd wr/scripts
./generate-wr.sh neurooz
```

**Result:**
- Creates `/wr/repos/neurooz.md`
- Populated with repository metadata
- Ready for research completion

**Next Steps:**
1. Review generated WR
2. Complete research sections
3. Add recommendations
4. Create implementation issues

### Example 2: Batch P0 Generation

**Command:**
```bash
cd wr/scripts
./batch-generate-wrs.sh p0
```

**Repositories Processed:**
- neurooz
- affiliate-marketing-system
- WEBSITE-FACTORY-API
- WEBSITE-FACTORY-GENERATOR
- premolt

**Result:**
- 5 WR files created in `/wr/repos/`
- WR_TRACKER.md updated with statistics
- Ready for research completion

### Example 3: Via GitHub Issue

**Issue Title:**
```text
[WR] Repository Review - [neurooz]
```

**Issue Body:**
```markdown
## Repository to Review

Repository: midnghtsapphire/neurooz

## Review Scope

- Full market analysis
- Technology stack audit
- Security vulnerabilities
- Deployment readiness
- Monetization strategies
- Ship-to-market recommendations

## Priority

P0 - Immediate revenue potential
```

**Automation Actions:**
1. Issue labeled with `weekly-research`, `wr:in-progress`
2. WR generated in background
3. PR created with WR document
4. Issue updated with `wr:complete` and PR link

---

## Customization

### Adding Priority Repositories

Edit `/wr/scripts/batch-generate-wrs.sh`:

```bash
# Define P0 repositories (highest priority)
P0_REPOS=(
    "neurooz"
    "affiliate-marketing-system"
    "your-new-repo"  # Add here
)
```

### Modifying WR Template

Edit `/wr/WR_TEMPLATE.md` to change the structure or add sections.

### Customizing Workflow

Edit `/.github/workflows/wr-repository-review.yml` to change triggers or actions.

---

## Best Practices

### 1. Start with P0 Repositories
Focus on high-revenue-potential repositories first:
```bash
./batch-generate-wrs.sh p0
```

### 2. Complete Research Promptly
- Generate WR
- Complete research within 24-48 hours
- Create implementation issues immediately for P0 actions

### 3. Update Tracker Regularly
```bash
cd wr/scripts
./update-tracker.sh
```

### 4. Link to Issues
When creating implementation issues, reference the WR:
```markdown
**Based on WR:** [neurooz WR](/wr/repos/neurooz.md)
**Priority:** P0
**Revenue Impact:** $5K-10K/month
```

### 5. Track Revenue Impact
In each WR, include:
- Conservative revenue estimate
- Moderate revenue estimate
- Aggressive revenue estimate

### 6. Ship-to-Market Focus
Every WR should include:
- Deployment status
- Blocker identification
- Clear path to Vercel deployment
- Monetization integration plan

---

## Troubleshooting

### Issue: WR Not Generated

**Check:**
1. Is the repository name correct?
2. Does the repository exist in midnghtsapphire org?
3. Are scripts executable? (`chmod +x scripts/*.sh`)

**Solution:**
```bash
# Make scripts executable
chmod +x wr/scripts/*.sh

# Try again
cd wr/scripts
./generate-wr.sh <repo-name>
```

### Issue: Template Placeholders Not Replaced

**Check:**
1. Is `gh` CLI authenticated?
2. Does the script have internet access?

**Solution:**
If placeholders remain, manually edit the WR file:
```bash
vim wr/repos/<repo-name>.md
```

Replace `{REPO_NAME}`, `{REPO_URL}`, etc. with actual values.

### Issue: Workflow Not Triggering

**Check:**
1. Is the issue title format correct? Must start with `[WR]`
2. Are workflow permissions set? Check `.github/workflows/wr-repository-review.yml`

**Solution:**
Manually trigger workflow:
```bash
gh workflow run wr-repository-review.yml -f repository=<repo-name> -f mode=single
```

---

## Integration with Other Systems

### With OpenRouter Swarms

WRs can be enhanced with OpenRouter swarms for parallel research:

```yaml
# In issue body
agents:
  - scout-1: Repository analysis
  - scout-2: Market research
  - scout-3: Technology stack audit
  - consolidator: Findings summary
```

### With 49Agents

Visual coordination via 49Agents canvas:

```bash
# Set AGENT_HQ_TOKEN environment variable
export AGENT_HQ_TOKEN="your-token"

# Workflow will automatically use 49Agents for parallel research
```

### With Vercel Deployment Checker

Automated deployment verification:

```bash
cd wr/scripts
./check-deployment.sh <repo-name>
```

---

## Metrics & Tracking

### WR Tracker Dashboard

View `/wr/WR_TRACKER.md` for:
- Total repositories (140)
- WRs created
- WRs in progress
- WRs completed
- Ship-to-market ready
- Revenue projections

### Update Statistics

```bash
cd wr/scripts
./update-tracker.sh
```

---

## Prime Directive Alignment

Every WR must contribute to:

### 10M by 2030 Goal
- Identify revenue potential
- Suggest monetization strategies
- Prioritize high-impact repositories

### $2000+/month Target (Start: May 1, 2026)
- **URGENT:** Already past start date
- Focus on immediate revenue opportunities
- Ship-to-market in days, not weeks

### Ship Working Code
- Not plans or proposals
- Actual deployment to Vercel
- Working, tested code
- TEST section in README

---

## Support

For issues or questions:

1. **Check documentation:**
   - `/docs/WEEKLY_RESEARCH_PROCESS.md`
   - `/docs/AGENTS.md`
   - `/promptforproject.md`

2. **Review examples:**
   - `/wr/repos/neurooz.md` - Complete example WR

3. **Create an issue:**
   - Use template: `[WR] Support Request - [description]`

---

**Last Updated:** 2026-05-02  
**Maintained by:** Copilot Coding Agent  
**Version:** 1.0.0
