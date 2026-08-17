# 🧠 GBrain Easy Install

> **Give your AI a permanent memory in 30 minutes.**
> No coding required. Just double-click and follow the instructions.

---

## 🤔 What Is GBrain

Imagine you had an assistant who forgot everything you told them at the end of every day. Every morning you'd have to remind them: who your clients are, what projects are happening, what you talked about last week. Exhausting, right?

That's what AI tools like Claude, Cursor, and Copilot do right now — every conversation starts from zero.

**GBrain fixes that.**

GBrain gives your AI a notebook. Your AI reads it before every answer. Your AI writes new things it learns back to it after every conversation. After a week, your AI knows:

- 👤 Who your clients and contacts are
- 💼 What projects you're working on
- 📅 What happened in recent meetings
- 💡 Your ideas and how your thinking has evolved
- 🏢 The companies you work with

The more you use it, the smarter your AI gets. This is called the **compounding brain effect** — and it's what makes GBrain special.

---

## 📦 What Gets Installed

| Component | What It Is | Required? |
|---|---|---|
| **Bun** | Fast JavaScript engine (like Node.js, but better) | ✅ Yes |
| **GBrain CLI** | The brain tool (`gbrain` command) | ✅ Yes |
| **~/brain folder** | Your personal brain (plain text markdown files) | ✅ Yes |
| **Local database** | Fast search engine (lives on your computer, no cloud) | ✅ Yes |
| **AI tool config** | Connects brain to Claude Code / Cursor | Auto-detected |

**What it does NOT install:** nothing runs in the background. GBrain only activates when your AI tool needs it. No subscriptions. No data sent to servers (unless you add optional API keys).

---

## 🍎 Mac Installation (super easy!)

### Step 1 — Download the installer
The file you need is: **`install/mac/install-gbrain.command`**

### Step 2 — Allow Mac to run it
Mac might block the file the first time. Here's how to fix that:

1. Right-click (or Control+click) on `install-gbrain.command`
2. Click **"Open"**
3. A popup appears saying "This file is from the internet" — click **"Open"** again
4. Terminal opens and the installer starts!

> 💡 **Why does Mac block it?** Apple checks if apps are from "verified developers." Our installer is a script, not a Mac app, so Apple hasn't verified it. It's safe — it just installs Bun and GBrain from their official websites.

### Step 3 — Follow the prompts
The installer walks you through everything. When it asks a question, type **y** for yes or **n** for no, then press **Enter**.

### Step 4 — Done
Open a new Terminal window and test it:
```text
gbrain --version
```

---

## 🪟 Windows Installation (super easy!)

### Step 1 — Download the installer
The file you need is: **`install/windows/install-gbrain.bat`**

### Step 2 — Allow Windows to run it
Windows Defender SmartScreen might pop up. Here's what to do:

1. Double-click `install-gbrain.bat`
2. If a blue popup appears saying "Windows protected your PC":
   - Click **"More info"**
   - Click **"Run anyway"**
3. A Command Prompt window opens and the installer starts!

> 💡 **Why does Windows block it?** Windows checks if apps are from known publishers. Our installer is a batch script, not a signed program, so Windows hasn't verified it. It's safe — it just installs Bun and GBrain from their official websites.

### Step 3 — Follow the prompts
The installer walks you through everything. When it asks a question, type **y** or **n** and press **Enter**.

### Step 4 — Done
Open a new Command Prompt and test it:
```text
gbrain --version
```

---

## 🔑 Optional: Add API Keys for Smarter Search

GBrain works WITHOUT any API keys — keyword search works right away. But if you add an OpenAI API key, GBrain also gets **AI-powered vector search** that understands meaning, not just words.

| Key | What It Unlocks | Cost |
|---|---|---|
| OpenAI API Key | AI-powered search (semantic/vector search) | ~$0.0001 per search |
| Anthropic API Key | Even smarter multi-query search | ~$0.0001 per search |

**How to add (Mac):**
```bash
echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
source ~/.zshrc
gbrain embed --stale   # re-index with AI embeddings
```

**How to add (Windows):**
```cmd
setx OPENAI_API_KEY "sk-..."
:: Open a new Command Prompt, then:
gbrain embed --stale
```

Get an OpenAI key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 📁 Your Brain Folder

After installation, your brain lives at:

- **Mac:** `~/brain/` (same as `/Users/yourname/brain/`)
- **Windows:** `%USERPROFILE%\brain\` (same as `C:\Users\yourname\brain\`)

It's organized like this:
```text
brain/
├── people/       ← One file per person (e.g., people/sarah-johnson.md)
├── companies/    ← One file per company
├── concepts/     ← Your ideas, frameworks, mental models
├── projects/     ← Current and past projects
├── meetings/     ← Meeting notes and transcripts
├── media/        ← Books, articles, podcasts you've captured
└── daily/        ← Daily notes and journal entries
```

These are just regular **text files** that you can open in any text editor. Your AI reads and writes them. You can edit them too — your edits sync automatically.

---

## 🤖 Connecting to Your AI Tool

GBrain connects to your AI tool using something called **MCP** (Model Context Protocol). This is how GBrain and your AI tool talk to each other.

The installer tries to do this automatically. If it didn't work (or you're setting it up manually), here's what to add:

### Claude Code
Add to `~/.claude/server.json`:
```json
{
  "mcpServers": {
    "gbrain": {
      "command": "gbrain",
      "args": ["serve"]
    }
  }
}
```

### Cursor
Settings → MCP Servers → Add:
```json
{
  "gbrain": {
    "command": "gbrain",
    "args": ["serve"]
  }
}
```

### Windsurf
Settings → MCP Servers → Refresh after adding the same config as Cursor.

---

## 🔧 Useful Commands

Once GBrain is installed, here are the most useful things you can type in Terminal/Command Prompt:

| Command | What It Does |
|---|---|
| `gbrain --version` | Check it's working |
| `gbrain import ~/brain/` | Index your brain files for search |
| `gbrain embed --stale` | Add AI-powered search (needs OpenAI key) |
| `gbrain search "Sarah"` | Search your brain |
| `gbrain query "who should I invite to dinner?"` | Ask a smart question |
| `gbrain sync --repo ~/brain` | Sync latest changes |
| `gbrain doctor` | Check everything is healthy |
| `gbrain serve` | Start the AI tool connection (MCP server) |

---

## ❓ Troubleshooting

### "gbrain: command not found
Open a new Terminal/Command Prompt window. The PATH was updated during install but old windows don't see it yet.

### "Permission denied" on Mac
Run this in Terminal:
```bash
chmod +x ~/path/to/install-gbrain.command
```

### Bun install fails
Make sure you have internet access. Then try manually:
- **Mac:** `curl -fsSL https://bun.sh/install | bash`
- **Windows (PowerShell):** `irm bun.sh/install.ps1 | iex`

### GBrain install fails
Try: `bun add -g github:garrytan/gbrain`

### AI tool doesn't see gbrain
Restart the AI tool completely after installing. GBrain runs as a background service when the AI tool starts.

---

## 📖 More Documentation

- **Full GBrain docs:** [github.com/garrytan/gbrain](https://github.com/garrytan/gbrain)
- **Agent playbook:** `~/gbrain/docs/GBRAIN_SKILLPACK.md` (after install)
- **Revvel skill docs:** `skills/gbrain/SKILL.md` in this repo
- **Overview doc:** `docs/GBRAIN_SKILL_OVERVIEW.md` in this repo

---

## 🔄 Upgrading GBrain

To upgrade to the latest version:
```bash
# Mac / Linux
cd ~/gbrain && git pull origin main && bun install

# Windows
cd %USERPROFILE%\gbrain && git pull origin main && bun install
```

Or just re-run the installer — it will update automatically.

---

*GBrain is derived from [garrytan/gbrain](https://github.com/garrytan/gbrain) and packaged for easy installation as part of [Revvel Standards](https://github.com/midnghtsapphire/revvel-standards).*
