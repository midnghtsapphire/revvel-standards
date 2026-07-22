# OpenHands Desktop Agent - 24/7 Autonomous Setup

**Your local desktop agent that runs 24/7, manages credentials, and handles everything automatically.**

---

## What It Does

```text
┌─────────────────────────────────────────────────────────────┐
│                    YOUR DESKTOP                              │
│                                                              │
│  ┌─────────────────────────┐                              │
│  │   OpenHands Agent        │ ◄──── 24/7 running          │
│  │   (Always On)            │                              │
│  └──────────┬──────────────┘                              │
│             │                                               │
│  ┌──────────▼──────────────┐                              │
│  │  Browser Access         │ ◄──── Chrome/Edge           │
│  │  (Claude Code, Gumloop) │                              │
│  └──────────┬──────────────┘                              │
│             │                                               │
│  ┌──────────▼──────────────┐                              │
│  │  Credentials Manager    │ ◄──── Auto-save & sync       │
│  │  (GitHub Secrets)      │                              │
│  └──────────┬──────────────┘                              │
│             │                                               │
│  ┌──────────▼──────────────┐                              │
│  │  Task Automation       │ ◄──── WRs, PRs, Issues       │
│  │  (Full autonomy)       │                              │
│  └─────────────────────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Setup (Windows)

### 1. Install OpenHands

```powershell
# Install Python (if not installed)
# Download from: https://www.python.org/downloads/

# Install OpenHands
pip install openhands

# Or using winget
winget install OpenHands
```

### 2. Create the Agent Config

Create a file called `openhands-agent.sh` (or `.bat` for Windows):

```bash
#!/bin/bash
# openhands-agent.sh - 24/7 OpenHands Desktop Agent

set -e

AGENT_DIR="$HOME/.local/openhands-agent"
LOG_DIR="$AGENT_DIR/logs"
CREDS_DIR="$AGENT_DIR/credentials"

mkdir -p "$AGENT_DIR" "$LOG_DIR" "$CREDS_DIR"

LOG_FILE="$LOG_DIR/agent-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════"
log "🤖 OpenHands Desktop Agent Starting"
log "═══════════════════════════════════════════════"

# Start the agent
openhands \
  --headless \
  --use昀browser \
  --provider local \
  --workspace "$AGENT_DIR" \
  --task "You are a credential and task management agent. Your job is to:
1. Monitor ~/.local/revvel-agent/credentials/ for new API keys
2. Sync all credentials to GitHub Secrets (midnghtsapphire/revvel-standards)
3. Run every 4 hours: check for new credentials and sync them
4. Browse to service websites (bito.ai, jules.google, noimosai.com) when new credentials are needed
5. Keep credentials backed up locally and in GitHub
6. Run the self-heal-repo script to clean up old issues
7. Report status to logs/agent.log

Always ensure all credentials are synced to GitHub." \
  2>&1 | tee -a "$LOG_FILE"

log "Agent stopped. Restarting in 60 seconds..."
sleep 60
```

### 3. Set Up Auto-Start (Windows Task Scheduler)

```powershell
# Create a scheduled task that starts OpenHands on login
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c C:\path\to\openhands-agent.bat"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "OpenHandsAgent" -Action $action -Trigger $trigger -Settings $settings -Description "OpenHands 24/7 Agent"
```

### 4. Start the Agent

```powershell
.\openhands-agent.bat
```

---

## The Agent's Memory

Create `~/.local/openhands-agent/memory.md`:

```markdown
# OpenHands Desktop Agent Memory

## Mission
Manage credentials and automation for midnghtsapphire/revvel-standards

## Credentials Location
~/.local/revvel-agent/credentials/

## GitHub Repo
midnghtsapphire/revvel-standards

## Required Credentials
- OPENROUTER_API_KEY ✅
- CLAUDE_API_KEY ✅  
- LINEAR_API_KEY ✅
- BITO_API_KEY ❌ (need)
- JULES_API_KEY ❌ (need)
- NOIMOSAI_API_KEY ❌ (need)

## Daily Tasks
1. Check ~/.local/revvel-agent/credentials/
2. Sync new credentials to GitHub
3. Run self-heal-repo if exists
4. Check for new WRs and PRs

## Services to Monitor
- bito.ai/settings (Bito API)
- jules.google.com/settings (Jules API)
- noimosai.com/settings (NoimosAI API)
- app.tavily.com/settings (Tavily API)
```

---

## Agent Commands

When running interactively, tell the agent:

```text
"Check my credentials folder for any new API keys. 
Sync them to GitHub Secrets for midnghtsapphire/revvel-standards.
Browse to bito.ai and extract my API key if I'm logged in.
Do the same for jules.google.com and noimosai.com.
Save everything locally and to GitHub."
```

---

## Startup Script (Windows .bat)

Save as `openhands-agent.bat`:

```batch
@echo off
title OpenHands Desktop Agent
cd /d %USERPROFILE%\.local\openhands-agent

echo Starting OpenHands Agent...
echo Log file: %USERPROFILE%\.local\openhands-agent\logs\agent-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log

:loop
openhands --headless --browser --provider local
echo Agent stopped. Restarting in 30 seconds...
timeout /t 30 /nobreak
goto loop
```

---

## Startup Script (Windows .ps1)

Save as `openhands-agent.ps1`:

```powershell
$AGENT_DIR = "$env:USERPROFILE\.local\openhands-agent"
$LOG_DIR = "$AGENT_DIR\logs"

New-Item -ItemType Directory -Force -Path $AGENT_DIR, $LOG_DIR | Out-Null

$LOG_FILE = "$LOG_DIR\agent-$(Get-Date -Format 'yyyyMMdd').log"

Write-Host "═══════════════════════════════════════════════"
Write-Host "🤖 OpenHands Desktop Agent Starting"
Write-Host "═══════════════════════════════════════════════"
Write-Host "Log: $LOG_FILE"
Write-Host ""

while ($true) {
    try {
        Write-Host "[$(Get-Date)] Starting OpenHands..." | Tee-Object -FilePath $LOG_FILE -Append
        & openhands --headless --browser --provider local 2>&1 | Tee-Object -FilePath $LOG_FILE -Append
    } catch {
        Write-Host "[$(Get-Date)] Error: $_" | Tee-Object -FilePath $LOG_FILE -Append
    }
    
    Write-Host "[$(Get-Date)] Restarting in 30 seconds..." | Tee-Object -FilePath $LOG_FILE -Append
    Start-Sleep -Seconds 30
}
```

---

## System Tray Option (Windows)

To run in system tray (optional):

```powershell
# Install system tray helper
pip install pystray pillow

# Or use a simple batch-to-VBS converter
# Save as OpenHands.vbs for silent background running:

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """%USERPROFILE%\.local\openhands-agent\openhands-agent.bat""", 0, False
```

---

## Verification

Check if agent is running:

```powershell
Get-Process | Where-Object { $_.Name -like "*openhands*" }
```

Check logs:

```powershell
Get-Content "$env:USERPROFILE\.local\openhands-agent\logs\agent-$(Get-Date -Format 'yyyyMMdd').log" -Tail 20
```

---

## Troubleshooting

### "openhands not found
```powershell
pip install openhands
```

### Browser not opening
```powershell
# Make sure Chrome/Edge is installed
# Try with explicit browser:
openhands --browser chrome
```

### Permission errors
```powershell
# Run PowerShell as Administrator
```

---

## Related

- [Local Credential Agent](../scripts/auto-fetch-credentials.sh)
- [Repo Self-Healer](../scripts/self-heal-repo.js)
- [GitHub Credential Gatekeeper](../.github/workflows/credential-gatekeeper.yml)
