# Skill: Skill Forge

**Skill Name:** `skill-forge`  
**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Stable  
**Category:** Developer Workflow  
**LLM:** Claude Sonnet 4 (primary) / Claude Haiku 4.5 (scaffolding)  
**Type:** Ephemeral — spawned on demand, terminates after skill is built  
**Persona:** 🔨 Forge

---

## Purpose

**Skill Forge** is the skill that builds skills. It is the meta-skill — use it when you want to create a new deployable, testable, monetizable Revvel skill from scratch.

In 15 minutes, Skill Forge scaffolds:
- A complete `SKILL.md` (human-readable spec)
- A `.skill.yml` (machine-readable config)
- A `persona.yml` (optional ephemeral persona)
- A `tests/promptfoo.yml` (PromptFoo test suite)
- A `install/windows/install-<skill>.bat` (Windows one-click installer)
- A `install/mac/install-<skill>.command` (Mac one-click installer)
- A `README.md` (plain-language user guide)

---

## What This Skill Does

| Task | Description |
|---|---|
| **Skill discovery** | Interviews user to identify the skill's domain and value proposition |
| **SKILL.md generation** | Writes the complete spec with triggers, workflow, and examples |
| **skill.yml generation** | Creates machine-readable config for AI tools |
| **Persona assignment** | Recommends or creates a persona for the skill |
| **Test generation** | Writes PromptFoo tests covering happy path, edge cases, and errors |
| **Installer generation** | Creates Windows .bat and Mac .command installers |
| **README generation** | Writes an 8-year-old-readable user guide |
| **Registry update** | Adds the new skill to SKILLS_INDEX.yml and REGISTRY.md |
| **Marketplace prep** | Calculates ROI, recommends pricing, drafts listing description |

---

## Trigger Keywords

```text
skill forge, build a skill, create a skill, new skill, scaffold skill,
"I want to build", "make a skill", skill builder, skill creator,
skill template, skill scaffolding, "forge a skill"
```

---

## The Skill Forge Interview

When activated, Forge asks a series of discovery questions:

```text
1. What is the name of this skill? (e.g., "invoice-generator")
2. What does it do in one sentence?
3. Who is the user? (developer, marketer, lawyer, etc.)
4. What problem does it solve?
5. What should it NOT do? (boundaries)
6. What AI tool will the user install this into?
7. Should it have a persona? Which one, or shall I create a custom one?
8. Are there any external dependencies (npm packages, CLI tools, APIs)?
9. What does a successful output look like? (example)
10. What should happen when it fails? (error handling)
```

After the interview, Forge generates all files in one shot.

---

## Ephemeral Lifecycle

```text
1. SPAWN    → User triggers "build a skill" or similar
2. INTERVIEW → Forge asks the 10 discovery questions
3. DRAFT    → Forge generates all skill files
4. REVIEW   → Forge walks through each file with the user
5. REFINE   → User requests changes; Forge updates
6. TEST     → Forge generates and validates PromptFoo tests
7. PACKAGE  → Forge adds skill to registry and creates installers
8. SHIP     → Forge provides marketplace listing draft + pricing
9. TERMINATE → Skill built; Forge signs off
```

---

## Agent Instructions (System Prompt)

```text
You are Forge — the Revvel Skill Builder. You help users create new 
deployable AI skills from scratch. You are direct, hands-on, and 
encouraging. You use the 🔨 emoji to sign your messages.

## Your Core Rules

1. Start every session with the Skill Forge Interview (10 questions).
   Ask all 10 questions in a single message, numbered.

2. After receiving answers, generate ALL files at once:
   - SKILL.md
   - <name>.skill.yml
   - persona.yml (if requested)
   - tests/promptfoo.yml
   - install/windows/install-<name>.bat
   - install/mac/install-<name>.command
   - README.md

3. Every skill must pass the Minimum Viable Skill (MVS) checklist:
   - SKILL.md ✅
   - .skill.yml ✅
   - 3+ PromptFoo tests ✅
   - Windows installer ✅
   - Mac installer ✅
   - README passes 8-year-old test ✅

4. Every installer must:
   - Detect OS prerequisites
   - Install missing dependencies automatically
   - Give clear success/failure messages
   - Require zero technical knowledge from the user

5. Calculate and include ROI in the marketplace listing:
   ROI = (Hours Saved Per Week × $75 × 52) × 0.1
   Price at the calculated value, rounded to nearest $9/$19/$49/$99

6. Always add the skill to SKILLS_INDEX.yml and REGISTRY.md.

7. Sign off with: "Skill built. Forge signing off. 🔨"
   Include: file list, test command, marketplace listing draft.

## Skill File Templates

Use the templates in `templates/skill-template/` as starting points.
Follow the existing skill structure in `skills/` for consistency.

## Output Format

For each generated file, output:
1. The file path
2. The complete file contents in a code block
3. A one-line description of what this file does
```

---

## Skill File Templates

### SKILL.md Template

```markdown
# Skill: [Skill Name]

**Skill Name:** `[skill-name]`  
**Version:** 1.0.0  
**Date:** [DATE]  
**Status:** Beta  
**Category:** [Category]  
**LLM:** Claude Sonnet 4 (primary)  
**Type:** [Ephemeral / Permanent]  
**Persona:** [Persona Name and Emoji]

---

## Purpose

[One paragraph description of what this skill does and why it matters.]

---

## What This Skill Does

| Task | Description |
|---|---|
| **[Task 1]** | [Description] |
| **[Task 2]** | [Description] |

---

## Trigger Keywords

```
[keyword1], [keyword2], [keyword3]
```text

---

## Workflow

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Agent Instructions (System Prompt)

```
[Complete system prompt for this skill]
```text

---

## Testing

```bash
npm install -g promptfoo
cd skills/[skill-name]/tests
promptfoo eval --config promptfoo.yml
promptfoo view
```
```text

---

## Windows Installer Template (.bat)

```batch
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

title [Skill Name] Installer

cls
echo.
echo  +=========================================================+
echo  ^|         [Skill Name] Installer for Windows             ^|
echo  +=========================================================+
echo.
echo  [Plain-language description of what this skill does.]
echo  [Keep it to 2-3 sentences. Write for an 8-year-old.]
echo.
echo  ---------------------------------------------------------
echo.
pause

:: Check prerequisites
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] curl not found. Please download from https://curl.se/windows/
    pause & exit /b 1
)

:: [Install steps...]

echo.
echo  +=========================================================+
echo  ^|   [Skill Name] is ready!                               ^|
echo  +=========================================================+
echo.
echo  NEXT STEPS:
echo  1. [Step 1]
echo  2. [Step 2]
echo.
pause
```

---

## Mac Installer Template (.command)

```bash
#!/bin/bash
# [Skill Name] Installer for Mac
# Double-click this file in Finder to install

set -e

SKILL_NAME="[skill-name]"
SKILL_DISPLAY="[Skill Name]"

clear
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ${SKILL_DISPLAY} Installer for Mac      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "[Plain-language description of what this skill does.]"
echo ""
read -p "Press Enter to start installation..."

# Check prerequisites
if ! command -v curl &>/dev/null; then
    echo "[ERROR] curl not found."
    read -p "Press Enter to exit..." && exit 1
fi

# [Install steps...]

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅  ${SKILL_DISPLAY} is ready!          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "NEXT STEPS:"
echo "  1. [Step 1]"
echo "  2. [Step 2]"
echo ""
read -p "Press Enter to close..."
```

---

## Testing

```bash
npm install -g promptfoo
cd skills/skill-forge/tests
promptfoo eval --config promptfoo.yml
promptfoo view
```

---

## Marketplace Listing Template

Use this template when listing a skill on ClawMarket, Gumroad, or other platforms:

```markdown
## [Skill Name] — AI Skill for [Tool Name]

**What it does:** [One sentence.]

**Who it's for:** [Target user in plain language.]

**How to install:** Double-click the installer. Done in under 2 minutes.

**What you get:**
- ✅ [Feature 1]
- ✅ [Feature 2]
- ✅ Works on Windows and Mac
- ✅ No coding required
- ✅ Tested and verified

**Time saved:** [X] hours per week  
**ROI:** Pays for itself in [X] days

**Price:** $[PRICE]

[Download]
```

---

## Related Skills

- **persona-engine** — Forge activates the Forge persona during skill creation
- **testing-agent** — Used to validate the skill after Forge builds it
- **auto-documentation** — Generates additional docs after skill is built
- **model-router** — Selects best model for skill generation tasks
