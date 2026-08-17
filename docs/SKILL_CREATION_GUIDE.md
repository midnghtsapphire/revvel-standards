# How to Create a Revvel Skill

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Reading Level:** Anyone (no coding required for steps 1–5)

---

## What Is a Skill

Imagine you had a friend who is an expert at something — like a really amazing code reviewer, or a security expert, or a writing coach. Every time you needed help with that thing, you could just ask your friend.

A **Revvel Skill** is like that friend, but for your AI assistant.

It's a set of instructions that tells your AI: "When you're in this skill, be THIS kind of expert."

When you install a skill, your AI gets smarter at that specific thing — automatically, without you having to explain it every time.

---

## The Easiest Way: Use Skill Forge

The fastest way to create a skill is to let **Skill Forge** do it for you.

Skill Forge is a skill that builds other skills. It's like a machine that makes machines.

### How to use Skill Forge

1. Open your AI tool (Claude Code, Cursor, etc.)
2. Type: **"build a skill"** or **"skill forge"**
3. A character named **Forge** will introduce himself and ask you 10 questions
4. Answer the questions (no technical knowledge needed!)
5. Forge will generate all the files you need
6. Done! Your skill is ready to test and sell.

**That's the fast path.** Everything below is for people who want to understand how it works or do it manually.

---

## The Manual Way (5 Simple Steps)

### Step 1: Pick What Your Skill Does 🎯

First, decide:
- **What is the skill for?** (Examples: reviewing code, writing emails, checking security, brainstorming ideas)
- **Who will use it?** (You? Other developers? Writers? Business owners?)
- **What problem does it solve?** (What's slow, annoying, or hard that the skill will fix?)

Write these down. You'll need them in the next steps.

**Example:**
> - What it does: Reviews code for security problems
> - Who uses it: Developers building web apps
> - Problem it solves: Security checks are slow and easy to forget

---

### Step 2: Create the Skill Folder 📁

Create a new folder in the `skills/` directory with your skill's name.
Use lowercase letters and dashes (no spaces).

```text
skills/
└── my-skill-name/     ← Create this folder
    ├── SKILL.md       ← You'll create this in Step 3
    ├── my-skill.yml   ← You'll create this in Step 4
    └── tests/
        └── promptfoo.yml  ← You'll create this in Step 5
```

**Example:** If you're building a security review skill, the folder would be:
```text
skills/security-review/
```

---

### Step 3: Write SKILL.md (The Instructions) 📄

`SKILL.md` is the main file. It tells the AI everything it needs to know about this skill.

Copy the template from `templates/skill-template/SKILL.md` and fill in the blanks.

Here's the important parts you need to fill in:

#### The Purpose section
Write 1-2 sentences explaining what the skill does. Write like you're explaining it to a 10-year-old.

**Example:**
```text
This skill reviews your code for security problems before you publish it.
It checks for common mistakes that hackers use to break into apps.
```

#### The Trigger Keywords section
These are the words that turn the skill on. When someone types one of these words, the skill activates.

**Example:**
```text
security review, check for vulnerabilities, scan my code, security check,
OWASP, is my code safe, security audit
```

#### The System Prompt section
This is what the AI reads before every conversation when the skill is active. Write it like you're giving instructions to a very smart assistant.

**Example:**
```text
You are a security expert reviewing code for vulnerabilities.
When given code, check for:
- SQL injection
- Cross-site scripting (XSS)
- Authentication problems
- Hardcoded secrets

Report each issue with: what it is, why it's dangerous, how to fix it.
Be specific. Show the exact lines that have problems.
```

---

### Step 4: Write the Skill Config (.yml) ⚙️

The `.yml` file is a settings file that AI tools read. It's like the skill's ID card.

Copy `templates/skill-template/skill.yml` and fill in the blanks.

The important parts:
- `skill:` — your skill's name (lowercase-with-dashes)
- `title:` — your skill's display name
- `description:` — what it does (1-2 sentences)
- `triggers:` — same keywords as SKILL.md
- `system_prompt:` — same prompt as SKILL.md

---

### Step 5: Write Tests 🧪

Every skill needs tests to prove it works. Tests are like a checklist that runs automatically to make sure the skill does what it's supposed to do.

Copy `templates/skill-template/tests/promptfoo.yml` and customize it.

You need at least 3 tests:

1. **Happy path test**: Does it work when everything is normal?
2. **Edge case test**: Does it handle weird or empty input without breaking?
3. **Error test**: Does it give a helpful response when something goes wrong?

You don't need to know how to code to write tests. Just fill in what you EXPECT the skill to say.

**Example test:**
```yaml
- description: "Should flag SQL injection vulnerability"
  vars:
    user_message: "Review this: SELECT * FROM users WHERE id = " + userId
  assert:
    - type: contains
      value: "SQL injection"
```

This says: "When I give the skill this code with a SQL injection problem, it should mention SQL injection in its response."

---

### Step 6: Create Installers 🔧

Now make it easy for people to install your skill.

#### For Windows (.bat file)
Copy `templates/skill-template/install/windows/install.bat`  
Replace all the `[BRACKETS]` with your skill's information.

#### For Mac (.command file)
Copy `templates/skill-template/install/mac/install.command`  
Replace all the `[BRACKETS]` with your skill's information.

Both files should:
- Check that the computer has the tools it needs
- Install anything that's missing (automatically!)
- Show clear messages about what's happening
- End with a "Success!" screen and next steps

---

### Step 7: Add a Persona (Optional but Recommended) 🎭

A persona is a character that "wears" your skill. When the skill is active, the AI introduces itself as this character and guides the user through the workflow.

Copy `templates/skill-template/persona.yml` and fill it in.

**Example:**
```yaml
name: "Shield"
role: "Security Specialist"
emoji: "🛡️"
greeting: "Shield here. I'm your security expert. Paste some code and I'll check it for vulnerabilities."
farewell: "Security review complete. Shield signing off. 🛡️"
```

---

### Step 8: Add to the Registry 📋

So others (and AI tools) can find your skill, add it to the Skills Index.

1. Open `skills/SKILLS_INDEX.yml`
2. Find the right category section
3. Add your skill following the same format as the others

**Example entry:**
```yaml
- name: security_review
  title: "Security Review"
  version: "1.0.0"
  path: "skills/security-review/"
  skill_file: "skills/security-review/security-review.skill.yml"
  category: "Security & Compliance"
  access: all
  triggers:
    - "security review"
    - "vulnerability check"
    - "is my code safe"
```

Also add an entry to `skills/REGISTRY.md` following the same format as the other skills listed there.

---

### Step 9: Test It! ✅

Before you ship, make sure it works.

#### Run the tests
```bash
# Install PromptFoo (only needed once)
npm install -g promptfoo

# Run your skill's tests
cd skills/your-skill-name/tests
promptfoo eval --config promptfoo.yml

# See results in your browser
promptfoo view
```

#### Do the 8-year-old test
Read your README out loud as if you're explaining it to an 8-year-old.
- Can they understand what it does?
- Would they know what to do first?
- Does it sound confusing or simple?

If it's confusing, simplify it.

#### Test the installer
- On Windows: double-click the `.bat` file. Does it install cleanly?
- On Mac: double-click the `.command` file. Does it install cleanly?

Both should finish with a clear success message and next steps.

---

### Step 10: Ship It! 🚀

Your skill is ready! Now you can:

1. **Use it yourself** — The skill is in your skills registry and will be loaded by your AI tools
2. **Share it for free** — Push to GitHub and link people to the installer files
3. **Sell it** — See `docs/MARKETPLACE_GUIDE.md` for how to list it on ClawMarket, Gumroad, and other platforms

---

## Checklist: Is Your Skill Ready

Before publishing, go through this checklist:

- [ ] `SKILL.md` written (purpose, triggers, workflow, system prompt, examples)
- [ ] `.skill.yml` created (matches SKILL.md)
- [ ] `persona.yml` created (optional but recommended)
- [ ] `tests/promptfoo.yml` with 3+ tests (happy path, edge case, error)
- [ ] All PromptFoo tests pass ✅
- [ ] Windows installer tested on Windows
- [ ] Mac installer tested on Mac
- [ ] README passes the 8-year-old test
- [ ] Added to `SKILLS_INDEX.yml`
- [ ] Added to `REGISTRY.md`
- [ ] (Optional) Pricing calculated, marketplace listing drafted

---

## Quick Reference: Skill File Structure

```text
skills/
└── your-skill-name/
    ├── SKILL.md                          ← Main spec (human-readable)
    ├── your-skill-name.skill.yml         ← Config (machine-readable)
    ├── persona.yml                       ← Optional: character/persona
    ├── README.md                         ← User guide (plain language)
    └── tests/
        └── promptfoo.yml                 ← Automated tests

install/
├── windows/
│   └── install-your-skill-name.bat      ← Windows installer
└── mac/
    └── install-your-skill-name.command  ← Mac installer
```

---

## Getting Help

- **Use Skill Forge** — Open your AI tool and say "build a skill". The Forge persona will guide you.
- **Look at existing skills** — Check `skills/code-review/` or `skills/gbrain/` for complete examples.
- **Read the standard** — `AGENTIC_METHODOLOGY_STANDARD.md` has detailed guidance on every aspect of skill building.
- **Test with PromptFoo** — Run tests early and often. They tell you exactly what's working and what isn't.

---

*Built with the Revvel Agentic Skills Framework. See [AGENTIC_METHODOLOGY_STANDARD.md](Master_Inventory/AGENTIC_METHODOLOGY_STANDARD.md) for the full methodology.*
