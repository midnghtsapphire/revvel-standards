# 💥 Self-Exploding Fleet — Setup & Explode Guide

**Version:** 1.0.0  
**Product:** R&D Research Fleet — Self-Exploding Fleet ($399)  
**File:** `rnd-research-fleet-v1.0.0.tar.gz`

---

## What "Self-Exploding" Means

When you run the installer, the fleet **explodes** itself into a live,
multi-agent research environment:

- Installs all agent dependencies automatically
- Forks the revvel-standards research repo to your GitHub account
- Boots the Perplexity no-key research bridge (zero API cost)
- Activates 6 research personas with modular skill overlays
- Wires up the Deep Search Router (Sonnet 3.5 + OpenRouter Fusion)

No manual configuration required — one command and the fleet is live.

---

## Step 1 — Download the File

**Direct download link (copy and paste into your browser):**

```text
https://github.com/midnghtsapphire/revvel-standards/raw/main/products/rnd-research-fleet-v1.0.0.tar.gz
```

Or with `curl`:

```bash
curl -L -o rnd-research-fleet-v1.0.0.tar.gz \
  "https://github.com/midnghtsapphire/revvel-standards/raw/main/products/rnd-research-fleet-v1.0.0.tar.gz"
```

**File size:** ~22 KB compressed.

---

## Step 2 — Where to Put the File

Put the file **anywhere you want to work from.** Recommended locations:

| Platform | Recommended path |
|---|---|
| **macOS / Linux** | `~/projects/rnd-research-fleet-v1.0.0.tar.gz` |
| **Windows (WSL)** | `/mnt/c/Users/<YourName>/projects/rnd-research-fleet-v1.0.0.tar.gz` |
| **Windows (native)** | `C:\Users\<YourName>\projects\rnd-research-fleet-v1.0.0.tar.gz` |
| **Server / VPS** | `/opt/rnd-research-fleet-v1.0.0.tar.gz` |

The installer creates a `rnd-research-fleet/` subfolder in the same
directory you run the extract command from.

---

## Step 3 — Extract (Explode) the Fleet

### macOS / Linux / WSL

```bash
# Navigate to where you saved the file
cd ~/projects

# Extract (explode)
tar -xzf rnd-research-fleet-v1.0.0.tar.gz

# Enter the fleet
cd rnd-research-fleet
```

### Windows (native — PowerShell)

```powershell
# Navigate to where you saved the file
cd C:\Users\<YourName>\projects

# Extract
tar -xzf rnd-research-fleet-v1.0.0.tar.gz

# Enter the fleet
cd rnd-research-fleet
```

After extraction you'll see:

```text
rnd-research-fleet/
├── EXPLODE_GUIDE.md          ← you are here
├── README.md
├── MASTER_PROMPT.md          ← the core R&D prompt (use in any LLM)
├── install.sh                ← one-command installer
├── auto-github-join.js       ← creates your branded fork
├── perplexity-research.js    ← no-API Perplexity research
├── deep-search-router.js     ← Sonnet 3.5 + OpenRouter Fusion
├── persona-loader.js         ← switch between research modes
├── personas/                 ← 6 research personas
├── skills/RESEARCH_PROMPTS/  ← DOE / TRIZ / MEErP / LCA / BNAT prompts
├── workflows/                ← GitHub Actions for automated research
└── templates/                ← report templates
```

---

## Step 4 — Run the Installer (Explode the Agents)

```bash
chmod +x install.sh && ./install.sh
```

The installer will:

1. ✅ Verify Node.js 18+ and Git are present
2. ✅ Install npm dependencies
3. ✅ Install the Perplexity no-key bridge (free research, no API needed)
4. ✅ Create `.env` with all config options pre-filled
5. ✅ Initialize a local Git repository
6. ✅ Create `start-research.sh` shortcut

**Expected output:**

```text
🚀 R&D Research Fleet Installer
==============================
✅ Node.js v20.x.x
✅ Git 2.x.x
📁 Creating directories...
📦 Installing dependencies...
✅ Perplexity bridge installed
📝 Creating .env configuration...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Installation complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5 — Connect to GitHub (Pop Up Agents with Extra Features)

Run the auto-fork agent to get your own branded fork with all extra
features (GitHub Actions research workflows, team access, upstream
sync):

```bash
node auto-github-join.js
```

You will need:
- A **free GitHub account** — create one at <https://github.com/join>
- A **GitHub personal access token** (classic) with the `repo` and
  `workflow` scopes (add `admin:org` only if you fork into an
  organization rather than your personal account):
  1. Go to <https://github.com/settings/tokens/new>
  2. Note: any name (e.g. `rnd-fleet`)
  3. Scopes: check `repo` and `workflow` (and `admin:org` for org forks)
  4. Click **Generate token** and copy it

When prompted, paste your token. The agent will:

1. Fork the research repo to `github.com/<YourUsername>/rnd-research-fleet`
2. Clone the fork locally
3. Wire up the remote so you get upstream updates automatically
4. Enable the GitHub Actions research workflows

---

## Step 6 — Start Researching

### Option A — Perplexity (no API key, free)

```bash
node perplexity-research.js "Is there a patent on self-healing concrete?"
```

### Option B — Deep Search Router (OpenRouter + Fusion)

```bash
# Optional: add your OpenRouter key to .env first
# OPENROUTER_API_KEY=sk-or-v1-...

node deep-search-router.js "Evaluate this startup idea: AI-powered HVAC optimization"
```

### Option C — Persona Mode (pick your analyst)

```bash
# Available personas: doe-screener, triz-specialist, bnat-hunter,
#                     market-researcher, lead-search, freestyle

node persona-loader.js triz-specialist "How do I solve this contradiction: lighter AND stronger?"
node persona-loader.js bnat-hunter "What lab research exists on room-temperature superconductors?"
node persona-loader.js doe-screener "Screen this idea: biodegradable circuit boards"
```

### Option D — Master Prompt (copy-paste into any LLM)

Open `MASTER_PROMPT.md` and paste the full prompt into ChatGPT, Claude,
or any LLM. The prompt forces the model to apply DOE + TRIZ + MEErP +
LCA + BNAT frameworks before giving you an answer.

---

## Troubleshooting

### "Node.js not found

Install Node.js 18+ from <https://nodejs.org> (choose **LTS**).

### "Permission denied

```bash
chmod +x install.sh
```

### Perplexity bridge install fails

```bash
pip3 install --user "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"
```

Then re-run `./install.sh`.

### Deep Search Router returns "API key missing

The router falls back to the free Perplexity lane automatically. To
unlock the full Sonnet 3.5 + Fusion chain, add your OpenRouter key:

```bash
echo "OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE" >> .env
```

Get a key (free tier available) at <https://openrouter.ai/keys>.

---

## Requirements

| Tool | Minimum version | Where to get it |
|---|---|---|
| Node.js | 18.x LTS | <https://nodejs.org> |
| Git | 2.x | <https://git-scm.com> |
| Python 3 | 3.8+ | <https://python.org> (for Perplexity bridge) |
| GitHub account | — | <https://github.com/join> (free) |
| OpenRouter key | — | <https://openrouter.ai/keys> (optional) |

---

## What Gets Activated After Explode

| Feature | Status after `install.sh` | Status after `auto-github-join.js` |
|---|---|---|
| Master Prompt (copy-paste) | ✅ Ready | ✅ Ready |
| Perplexity Research (free) | ✅ Ready | ✅ Ready |
| Deep Search Router | ✅ Ready (free lane) | ✅ Ready + Sonnet 3.5 with key |
| 6 Research Personas | ✅ Ready | ✅ Ready |
| GitHub Actions Workflows | ❌ | ✅ Activated in your fork |
| Upstream Sync | ❌ | ✅ Auto-syncs on push |
| Team Access (share fork) | ❌ | ✅ Invite collaborators |

---

## Support

- Email: <support@freedomangelcorp.com>  
- GitHub: <https://github.com/midnghtsapphire/revvel-standards/discussions>

**Built by Audrey Evans / MIDNGHTSAPPHIRE**
