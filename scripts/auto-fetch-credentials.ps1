# auto-fetch-credentials.ps1 - Autonomous credential fetcher for Windows
# Opens browser to each service, saves API keys locally + syncs to GitHub

param(
    [string]$Action = "help"
)

$CREDS_DIR = "$env:USERPROFILE\.local\revvel-agent\credentials"
$REPO = "midnghtsapphire/revvel-standards"

# Services to fetch
$SERVICES = @(
    @{ Name = "BITO_API_KEY"; URL = "https://bito.ai/settings"; Desc = "Bito AI" },
    @{ Name = "JULES_API_KEY"; URL = "https://jules.google.com/settings"; Desc = "Google Jules" },
    @{ Name = "NOIMOSAI_API_KEY"; URL = "https://noimosai.com/settings"; Desc = "NoimosAI" },
    @{ Name = "TAVILY_API_KEY"; URL = "https://app.tavily.com/settings"; Desc = "Tavily" },
    @{ Name = "OPENAI_API_KEY"; URL = "https://platform.openai.com/api-keys"; Desc = "OpenAI" }
)

function Show-Help {
    @"
🤖 Auto Credential Fetcher - Windows

Usage: .\auto-fetch-credentials.ps1 <command>

Commands:
  list      - Show all required credentials
  status    - Show current credential status
  add       - Add a credential manually
  sync      - Sync all credentials to GitHub
  open      - Open browser to all service URLs
  fetch     - Try to auto-fetch (limited)
  help      - Show this help

Examples:
  .\auto-fetch-credentials.ps1 add BITO_API_KEY sk_live_xxxxx
  .\auto-fetch-credentials.ps1 sync
  .\auto-fetch-credentials.ps1 open
  .\auto-fetch-credentials.ps1 status

"@
}

function Show-List {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗"
    Write-Host "║           🔑 Required API Credentials                   ║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    foreach ($svc in $SERVICES) {
        Write-Host "║  $($svc.Name.PadRight(20)) │ $($svc.Desc.PadRight(40))║"
    }
    Write-Host "╚══════════════════════════════════════════════════════════╝"
    Write-Host ""
}

function Show-Status {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗"
    Write-Host "║           📋 Current Credentials Status                  ║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    
    if (-not (Test-Path $CREDS_DIR)) {
        Write-Host "║  No credentials directory found                          ║"
    } else {
        $count = 0
        Get-ChildItem $CREDS_DIR -File | ForEach-Object {
            $size = (Get-Content $_.FullName -Raw).Length
            if ($size -gt 10) {
                Write-Host "║  ✅ $($_.Name.PadRight(50))║"
                $count++
            } else {
                Write-Host "║  ⚠️  $($_.Name.PadRight(50))║"
            }
        }
        if ($count -eq 0) {
            Write-Host "║  No credentials found                                   ║"
        }
    }
    
    Write-Host "╚══════════════════════════════════════════════════════════╝"
    Write-Host ""
    Write-Host "📁 Location: $CREDS_DIR"
    Write-Host ""
}

function Add-Credential {
    param($Name, $Value)
    
    if (-not $Value) {
        Write-Host "Usage: .\auto-fetch-credentials.ps1 add <NAME> <VALUE>"
        exit 1
    }
    
    if (-not (Test-Path $CREDS_DIR)) {
        New-Item -ItemType Directory -Force -Path $CREDS_DIR | Out-Null
    }
    
    $Value | Out-File -FilePath "$CREDS_DIR\$Name" -Encoding UTF8
    Write-Host "✅ Saved to: $CREDS_DIR\$Name"
    
    # Try to sync
    Write-Host "🔄 Syncing to GitHub..."
    try {
        $body = @{ secret_value = $Value } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/actions/secrets/$Name" `
            -Method PUT `
            -Headers @{ Authorization = "token $env:GITHUB_TOKEN" } `
            -Body $body `
            -ContentType "application/json" 2>$null
        
        Write-Host "✅ Synced to GitHub: $Name"
    } catch {
        Write-Host "⚠️  GitHub sync skipped (run 'sync' command later)"
    }
}

function Sync-All {
    Write-Host "🔄 Syncing all credentials to GitHub..."
    
    $synced = 0
    $failed = 0
    
    Get-ChildItem $CREDS_DIR -File | ForEach-Object {
        $name = $_.Name
        $value = Get-Content $_.FullName -Raw
        
        try {
            $body = @{ secret_value = $value } | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/actions/secrets/$name" `
                -Method PUT `
                -Headers @{ Authorization = "token $env:GITHUB_TOKEN" } `
                -Body $body `
                -ContentType "application/json" -ErrorAction Stop
            
            Write-Host "  ✅ Synced: $name"
            $synced++
        } catch {
            Write-Host "  ⚠️  Failed: $name"
            $failed++
        }
    }
    
    Write-Host ""
    Write-Host "📊 Sync complete: $synced synced, $failed failed"
}

function Open-Services {
    Write-Host ""
    Write-Host "🌐 Opening browser to all service URLs..."
    Write-Host ""
    Write-Host "📋 Steps:"
    Write-Host "   1. Each service will open in your browser"
    Write-Host "   2. Log in if needed"
    Write-Host "   3. Find the API key section"
    Write-Host "   4. Copy the key"
    Write-Host "   5. Run: .\auto-fetch-credentials.ps1 add SERVICE_NAME YOUR_KEY"
    Write-Host ""
    Write-Host "Press Enter to open services..."
    Read-Host
    
    foreach ($svc in $SERVICES) {
        Write-Host "Opening: $($svc.Desc)"
        Start-Process $svc.URL
        Start-Sleep -Seconds 2
    }
}

# Main
switch ($Action.ToLower()) {
    "list" { Show-List }
    "status" { Show-Status }
    "add" { Add-Credential $Args[0] $Args[1] }
    "sync" { Sync-All }
    "open" { Open-Services }
    "fetch" { 
        Write-Host "⚠️  Auto-fetch requires browser automation."
        Write-Host "   Use 'open' to open services, then add manually."
        Write-Host ""
        Open-Services
    }
    "help" { Show-Help }
    default { 
        Show-Help
        Show-Status
    }
}
