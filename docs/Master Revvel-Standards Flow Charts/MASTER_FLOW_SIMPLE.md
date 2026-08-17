# The Revvel Master Flow — Simple Version

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Auto-Maintained
**Reading Level:** Everyone (8 years old and up)
**Maintained by:** `scripts/sync-flow-charts.js`

---

> **The Big Picture in One Sentence:**
> Every time we want to build something new, we follow the same road: Read the rules → Research it → Write it down → Make a ticket → Do the work → Check it → Ship it.

---

## THE REVVEL ROAD — From Idea to Done

---

### 🗺️ STEP 1 — Read the Rules Book

**What you do:** Open the big rules document and understand what Revvel expects.

**The document:** `REVVEL_MASTER_STANDARDS.md` (this is the Bible — the Single Source of Truth)

**Where it lives:** `revvel-standards/` at the root

**Why:** Every project must follow the same standards. If you don't read the rules first, you'll build it wrong.

**Tools used:**
- Your browser or code editor (VS Code, Cursor)
- GitHub.com (to read the file online)

---

### 🔬 STEP 2 — Deep Research the Topic

**What you do:** Ask the AI Research Module to investigate your question. It runs 5 AI assistants at the same time to get the best answer possible.

**How to start it:**
1. Go to GitHub → Actions tab
2. Click "AI Research Module"
3. Type your question
4. Pick where to save the answer
5. Click "Run workflow"

**What happens automatically:**
- **Agent 1 (Spec)** reads official docs and specs → powered by Claude Sonnet
- **Agent 2 (Competitive)** compares options → powered by GPT-4.1
- **Agent 3 (Security)** checks for risks → powered by Claude Opus
- **Agent 4 (Cost)** estimates money and effort → powered by GPT-4o-mini
- **Agent 5 (Community)** finds what real developers say → powered by Gemini 2.5 Pro
- A **Synthesizer** (Claude Opus) reads all 5 reports and writes one final document

**Output:** A new `.md` file saved automatically in `docs/`

**Tools used:**
- GitHub Actions (the automation runner)
- OpenRouter API (connects to all AI models)
- `scripts/research-module.js` (the Node.js script that runs everything)

---

### 📝 STEP 3 — Create All the Documentation

**What you do:** Turn the research into proper Revvel-standard documents.

**Every project needs these files (MANDATORY):**

| Document | What It Is |
|---|---|
| `README.md` | What the project is and how to use it |
| `BLUEPRINT.md` | How it's built (technical architecture) |
| `ROADMAP.md` | 12-month plan |
| `KANBAN_CARDS.md` | The first list of tasks |
| `CHANGELOG.md` | Auto-updated list of every change |
| `INFRASTRUCTURE_MAP.md` | All servers, domains, ports |

**How it's automated:**
- `scripts/bootstrap-new-project.sh` creates the starter documents from templates
- Templates live in `revvel-standards/templates/`

**Tools used:**
- GitHub Copilot / Claude Code (AI writes the docs)
- `scripts/bootstrap-new-project.sh` (shell script)
- Templates folder (`revvel-standards/templates/`)

---

### 🎫 STEP 4 — Create a GitHub Issue

**What you do:** Open a ticket in GitHub Issues so everyone knows what needs to be done.

**What the issue should have:**
- A clear title ("Build the login screen for NeuroOz")
- Labels (like `New Project`, `bug`, `enhancement`)
- Description with what needs to happen
- Link to the research document

**How it's automated:**
- The research workflow (`research-module.yml`) creates an issue automatically when it finishes
- The issue includes a link to the research doc

**Manually:** (avoid the wrong repo default by pinning the repo)
```bash
gh issue create \
  --repo midnghtsapphire/revvel-standards \
  --title "Your task name" \
  --label "New Project" \
  --body "What needs to be done and why"
```

**Tools used:**
- GitHub Issues (the ticket system)
- GitHub CLI (`gh`) — the command-line tool for GitHub
- `research-module.yml` workflow (auto-creates after research)

---

### 💻 STEP 5 — Do the Work (Code, Build, Test)

**What you do:** Create your own branch, make the changes, and run checks.

**Step by step:**
1. Create a branch (`git checkout -b feature/my-thing`)
2. Make your changes
3. Run linters and tests locally
4. Push your branch (`git push`)
5. Open a Pull Request (PR)

**What happens automatically when you push:**
- GitHub Actions runs the CI (Continuous Integration) checks
- Code is linted (checked for style errors)
- Tests run automatically
- Security scans run (checks for secrets accidentally committed)
- Dependabot checks for outdated dependencies

**Tools used:**
- Git (version control)
- GitHub Actions (automation)
- Node.js / npm (JavaScript runtime)
- Vitest (testing)
- Dependabot (dependency updates)
- `scripts/check-compliance.js` (Revvel compliance checker)

---

### 🔁 STEP 6 — Review & Auto-Fix

**What you do:** Wait for checks to pass. If they fail, the system tries to fix itself.

**The Ralph Loop (Self-Healing CI):**
1. If CI fails → Ralph Loop fires automatically
2. Ralph posts a comment tagging `@copilot` with the error
3. Copilot reads the error and makes a fix
4. CI runs again
5. If it fails again → repeats up to 5 times
6. After 5 fails → escalates to a human (`@midnghtsapphire`)

**Code Review:**
- Copilot reviews the PR automatically
- You can also ask Claude Code or Venice AI to review

**Tools used:**
- `.github/workflows/ralph-loop.yml` (the self-healing workflow)
- GitHub Copilot (AI code reviewer and fixer)
- Claude Code (AI coding agent)
- `@actions/github-script` (GitHub automation library)

---

### 🚀 STEP 7 — Merge & Deploy

**What you do:** Approve and merge the PR. Everything else is automatic.

**What happens automatically when you merge:**
1. `CHANGELOG.md` updates itself with what changed
2. GitHub Actions deploys to the server
3. For mobile apps: Fastlane submits to App Store / Play Store
4. For desktop apps: Electron Builder packages the app
5. `INFRASTRUCTURE_MAP.md` updates if servers changed

**Deployment targets:**
- Web apps → DigitalOcean Droplet via SSH
- Mobile → App Store (iOS) and Google Play (Android) via Fastlane
- Desktop → Windows `.exe`, Mac `.dmg`, Linux `.AppImage`
- Docs/Portfolio → GitHub Pages

**Tools used:**
- GitHub Actions (the deployer)
- SSH (secure server connection)
- Fastlane (mobile app store submission)
- Electron Builder (desktop app packaging)
- GitHub Pages (static site hosting)

---

## The Full Loop at a Glance

```text
📖 READ RULES           → REVVEL_MASTER_STANDARDS.md
        ↓
🔬 DEEP RESEARCH        → AI Research Module (5 agents via OpenRouter)
        ↓
📝 CREATE DOCS          → bootstrap-new-project.sh + AI writing
        ↓
🎫 CREATE ISSUE         → gh issue create / research workflow auto-creates
        ↓
💻 DO THE WORK          → git branch + code + git push
        ↓
🔁 REVIEW & FIX         → Ralph Loop + Copilot + CI
        ↓
🚀 MERGE & DEPLOY       → GitHub Actions → Server / Store / Pages
        ↓
🔄 LOOP BACK TO STEP 1  → Every change follows the same road
```

---

## Rules to Remember

1. **Never skip the rules** — always start with `REVVEL_MASTER_STANDARDS.md`
2. **Never skip documentation** — if it's not documented, it doesn't exist
3. **Never push directly to `main`** — always use a branch and PR
4. **Let the robots work** — if CI fails, Ralph Loop tries to fix it first
5. **Trust the changelogs** — `CHANGELOG.md` is your history book, never delete it

---

*This document is automatically kept up-to-date by `scripts/sync-flow-charts.js`.*
*Last auto-sync: 2026-05-05*
