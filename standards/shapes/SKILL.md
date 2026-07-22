# Agent Skill Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `skill`
**Template:** `templates/agent-generated-product/build/skill/`

---

## When to Use This Shape

- The deliverable teaches an AI agent how to do something new
- ClawBot, OpenHands, Claude Code, Cursor, or other agents need reusable procedures
- Problem is a repeatable workflow that agents execute autonomously
- Low build cost — skills are primarily documentation + tested procedures
- Can be bundled with MCP servers, CLIs, or APIs as the "how-to" layer

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate agent workflow gap | Agent forums, Discord, GitHub discussions | Confirmed gap — agents struggle with this task |
| Audit existing skills/playbooks | OpenHands skills, Claude projects, Cursor rules | `research/competitors.md` — what exists |
| Identify target agents | Which platforms support skill files | `research/audience.md` — OpenHands (.agents/), Claude (.claude/), Cursor (.cursor/) |
| Define skill scope | What the skill teaches vs. what it doesn't | `research/scope.md` — boundaries |
| Determine pricing | Free / paid / bundled | `decision/pricing.json` |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Project Structure

```text
build/skill/
  skill/
    SKILL.md              # The main skill document (agent-readable)
    steps/                # Optional: complex multi-step procedures
      01-setup.md
      02-execute.md
      03-verify.md
    templates/            # Code/config templates the skill uses
    tests/                # Verification scripts
      test-skill.sh       # Automated skill validation
  adapters/               # Platform-specific wrappers
    OpenHands/
      SKILL.md            # OpenHands-format skill
    claude/
      CLAUDE.md           # Claude project instructions
    cursor/
      .cursorrules        # Cursor rules format
  README.md
  package.json            # If the skill includes tooling
```

### Skill Document Format

Every skill MUST follow this structure:

```markdown
# Skill: <Name>

## Purpose
One sentence: what this skill enables an agent to do.

## Prerequisites
- Required tools (installed or installable)
- Required credentials (with Doppler paths)
- Required repo state

## Steps
1. **Step Name** — Description
   ```bash
   command to run
   ```
   Expected output: ...

1. **Step Name** — Description
   ...

## Verification
How to confirm the skill executed correctly:
- [ ] Check 1
- [ ] Check 2

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Error X | Missing Y | Run Z |

## Connections
| Service | Purpose | Credential path |
|---------|---------|-----------------|
| ... | ... | Doppler `project/config/KEY` |
```text

### Quality Gates

- [ ] Skill executes successfully on a fresh environment
- [ ] All steps have expected outputs documented
- [ ] Verification checklist can be automated
- [ ] Troubleshooting covers top 5 failure modes
- [ ] No secrets hardcoded — all credentials reference Doppler paths
- [ ] Platform adapters exist for at least 2 agent platforms
- [ ] Automated test script (`test-skill.sh`) passes

---

## 3. Design Phase

Skills are text-based but still need:

| Asset | Purpose | Tool |
|-------|---------|------|
| Flowchart | Visual representation of skill steps | Mermaid or Figma |
| Landing page | SEO + install instructions | Figma → HTML |
| OG image | Social sharing (1200×630) | Figma |
| Demo video | Agent executing the skill | Screen recording |

---

## 4. Publish Phase

### Distribution Channels

| Channel | Format | How |
|---------|--------|-----|
| **GitHub repo** | `.agents/skills/<name>/SKILL.md` | PR to target repos |
| **OpenHands marketplace** | OpenHands skill format | Submit via OpenHands MCP |
| **npm** | Installable skill package | `npm publish` → `npx install-skill <name>` |
| **Gumroad** | Premium skill pack (zip) | Upload zip with all platform adapters |
| **Own site** | Landing page + download | Stripe Payment Link |

### Skill Installation Script

For easy adoption, provide an install script:

```bash
#!/bin/bash
# install-skill.sh — installs <skill-name> into the current repo
SKILL_DIR=".agents/skills/<skill-name>"
mkdir -p "$SKILL_DIR"
curl -sL https://revvel.io/skills/<skill-name>/SKILL.md > "$SKILL_DIR/SKILL.md"
echo "Skill installed to $SKILL_DIR/SKILL.md"
```

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **GitHub token** | PR skills into repos | Already available via Git auth |
| **npm token** | Publish skill package | Doppler `revvel-standards/prd/NPM_TOKEN` |
| **Stripe API key** | Premium skill sales | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **Skill-specific APIs** | Whatever the skill automates | Doppler (per-skill) |

---

## Monetization Models

| Model | How | Example |
|-------|-----|---------|
| **Free (lead gen)** | Skill is free, sells related MCP/API/CLI | Most common |
| **Premium skill pack** | Bundle of 5-10 related skills | Gumroad / Stripe ($19-49) |
| **Enterprise** | Custom skills for a company's workflow | Direct sales |
| **Subscription** | Monthly skill updates + new skills | Stripe recurring |

---

## Acceptance Criteria

- [ ] Skill executes on a clean environment without errors
- [ ] Adapters exist for OpenHands + at least one other platform
- [ ] Automated test script passes
- [ ] Published to at least one distribution channel
- [ ] README has installation instructions for each platform
- [ ] Landing page deployed (if selling)
- [ ] Stripe Product created (even if free)
- [ ] `state.json` step = `deployed`, `certified = true`
