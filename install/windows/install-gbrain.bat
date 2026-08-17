@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  GBrain Easy Installer for Windows
::  Double-click this file to install GBrain!
::
::  What this does:
::    1. Installs Bun (the fast JavaScript engine GBrain needs)
::    2. Installs GBrain itself
::    3. Creates your personal brain folder
::    4. Sets up GBrain's database on your computer
::    5. Adds GBrain to your AI tools (Claude Code / Cursor)
::
::  You do NOT need to know how to code. Just double-click!
:: ============================================================

title GBrain Installer for Windows

cls
echo.
echo  +=========================================================+
echo  ^|         GBrain Installer for Windows                   ^|
echo  ^|                                                         ^|
echo  ^|   Your AI is about to get a PERMANENT memory!          ^|
echo  +=========================================================+
echo.
echo  Hi! This installer will set up GBrain on your Windows PC.
echo  GBrain gives your AI a long-term memory so it remembers
echo  everything you've told it -- even days or weeks later!
echo.
echo  Think of it like giving your AI assistant a notebook
echo  that it reads before EVERY answer and writes to AFTER
echo  EVERY conversation. The more you use it, the smarter
echo  your AI gets!
echo.
echo  ---------------------------------------------------------
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: Helper variables
:: ─────────────────────────────────────────────────────────────
set "BRAIN_DIR=%USERPROFILE%\brain"
set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"
set "GBRAIN_OK=false"
set "BUN_OK=false"

:: ─────────────────────────────────────────────────────────────
:: Step 1: Check Windows version
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 1: Checking your Windows PC
echo  ----------------------------------
for /f "tokens=4-5 delims=. " %%i in ('ver') do set "WIN_VER=%%i.%%j"
echo    Windows version: %WIN_VER%
echo    [OK] Windows detected -- we're good to go!
echo.

:: ─────────────────────────────────────────────────────────────
:: Step 2: Check for required tools (curl, git)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 2: Checking required tools
echo  ---------------------------------

where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo    [!!] curl not found.
    echo        curl comes built into Windows 10 version 1803 and newer.
    echo        If you're on an older Windows, download curl from: https://curl.se/windows/
    pause
    exit /b 1
) else (
    echo    [OK] curl is available.
)

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo    [NOTE] git is not installed. We'll skip git init for the brain folder.
    echo        To install git later: https://git-scm.com/download/win
    set "GIT_AVAILABLE=false"
) else (
    echo    [OK] git is available.
    set "GIT_AVAILABLE=true"
)

:: Check for Windows Package Manager (winget) -- optional
where winget >nul 2>&1
if %errorlevel% equ 0 (
    set "WINGET_AVAILABLE=true"
    echo    [OK] winget is available (Windows Package Manager).
) else (
    set "WINGET_AVAILABLE=false"
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 3: Install Bun
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 3: Installing Bun (GBrain's engine)
echo  ------------------------------------------
echo    Bun is a fast, modern JavaScript engine.
echo    GBrain uses it to run. It's free!
echo.

if exist "%BUN_EXE%" (
    echo    [OK] Bun is already installed -- skipping!
    set "BUN_OK=true"
) else (
    where bun >nul 2>&1
    if %errorlevel% equ 0 (
        echo    [OK] Bun is already installed -- skipping!
        set "BUN_OK=true"
    ) else (
        echo    Downloading and installing Bun...
        echo    (This will open PowerShell for a moment -- that is normal!)
        echo.

        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "irm bun.sh/install.ps1 | iex" 2>&1
        if %errorlevel% equ 0 (
            echo    [OK] Bun installed!
            set "BUN_OK=true"
        ) else (
            echo    [!!] Bun installation failed.
            echo.
            echo    Try manually: Open PowerShell and run:
            echo       irm bun.sh/install.ps1 ^| iex
            echo.
            pause
            exit /b 1
        )
    )
)

:: Add Bun to PATH for this session
if exist "%USERPROFILE%\.bun\bin" (
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

:: ─────────────────────────────────────────────────────────────
:: Step 4: Add Bun to PATH permanently (user environment)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 4: Making Bun available in all future Command Prompts
echo  -----------------------------------------------------------

set "BUN_BIN_PATH=%USERPROFILE%\.bun\bin"
:: Use PowerShell to add to user PATH permanently
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$bunPath = '%BUN_BIN_PATH%'; $userPath = [Environment]::GetEnvironmentVariable('PATH', 'User'); if ($userPath -notlike '*\.bun\bin*') { [Environment]::SetEnvironmentVariable('PATH', $userPath + ';' + $bunPath, 'User'); Write-Host '   [OK] Added Bun to user PATH.'; } else { Write-Host '   [OK] Bun PATH already set.'; }"

:: ─────────────────────────────────────────────────────────────
:: Step 5: Install GBrain
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 5: Installing GBrain
echo  --------------------------
echo    GBrain is the tool that gives your AI its memory.
echo    Installing from: github.com/garrytan/gbrain
echo.

where gbrain >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] GBrain is already installed. Updating to latest version...
    bun add -g github:garrytan/gbrain
) else (
    echo    Installing GBrain... (this may take 1-2 minutes)
    bun add -g github:garrytan/gbrain
    if %errorlevel% equ 0 (
        echo    [OK] GBrain installed!
        set "GBRAIN_OK=true"
    ) else (
        echo    [!!] GBrain installation failed.
        echo.
        echo    Please check your internet connection and try again.
        echo    If the problem continues: https://github.com/garrytan/gbrain
        pause
        exit /b 1
    )
)

:: Refresh PATH to include bun bin
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

:: ─────────────────────────────────────────────────────────────
:: Step 6: Create your Brain folder
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 6: Creating your Brain folder
echo  ------------------------------------

if exist "%BRAIN_DIR%" (
    echo    [OK] Brain folder already exists at: %BRAIN_DIR%
) else (
    mkdir "%BRAIN_DIR%\people" 2>nul
    mkdir "%BRAIN_DIR%\companies" 2>nul
    mkdir "%BRAIN_DIR%\concepts" 2>nul
    mkdir "%BRAIN_DIR%\projects" 2>nul
    mkdir "%BRAIN_DIR%\meetings" 2>nul
    mkdir "%BRAIN_DIR%\media" 2>nul
    mkdir "%BRAIN_DIR%\daily" 2>nul
    echo    [OK] Created brain folder at: %BRAIN_DIR%
    echo    Subfolders:
    echo       people\    -- one file per person you know
    echo       companies\ -- one file per company
    echo       concepts\  -- your ideas and mental models
    echo       projects\  -- your current and past projects
    echo       meetings\  -- meeting notes and transcripts
    echo       media\     -- books, articles, podcasts
    echo       daily\     -- daily notes and journal
    echo.
    if "%GIT_AVAILABLE%"=="true" (
        cd /d "%BRAIN_DIR%"
        git init -q
        echo    [OK] Initialized git repository for brain tracking.
    )
)

:: ─────────────────────────────────────────────────────────────
:: Step 7: Initialize the GBrain database
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 7: Setting up the GBrain database
echo  ----------------------------------------
echo    GBrain stores your brain in a fast local database.
echo    No internet needed. No subscription. Lives on YOUR PC.
echo.

cd /d "%USERPROFILE%"
echo    Running: gbrain init
gbrain init
if %errorlevel% equ 0 (
    echo    [OK] Database ready!
) else (
    echo    [NOTE] gbrain init may have reported a warning (it might already be initialized).
    echo    Continuing...
)

echo.
echo    Running health check...
gbrain doctor
echo    [OK] Health check complete.

:: ─────────────────────────────────────────────────────────────
:: Step 8: Import notes (optional)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 8: Importing your notes (optional)
echo  -----------------------------------------
echo    Do you have markdown (.md) files in %BRAIN_DIR% to import?
echo    (If you use Obsidian, Notion exports, or other notes -- say Y)
echo.
set /p "IMPORT_NOW=   Import notes now? (y/n): "

if /i "%IMPORT_NOW%"=="y" (
    echo    Importing markdown files...
    gbrain import "%BRAIN_DIR%" --no-embed
    echo    [OK] Import complete!
    echo    Tip: Add an OpenAI API key later for AI-powered search.
) else (
    echo    Skipped -- you can import later with: gbrain import %BRAIN_DIR%
)

:: ─────────────────────────────────────────────────────────────
:: Step 9: Connect to AI tools (MCP)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 9: Connecting GBrain to your AI tools
echo  --------------------------------------------
echo    GBrain works with Claude Code, Cursor, and Windsurf.
echo    We'll add the connection to whichever you have installed.
echo.

:: Claude Code
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "CLAUDE_CONFIG=%CLAUDE_DIR%\server.json"
if exist "%CLAUDE_DIR%" (
    echo    [OK] Claude Code detected!
    if exist "%CLAUDE_CONFIG%" (
        findstr /c:"gbrain" "%CLAUDE_CONFIG%" >nul 2>&1
        if %errorlevel% equ 0 (
            echo    [OK] GBrain already connected to Claude Code.
        ) else (
            echo    [NOTE] Claude Code config found but gbrain not added.
            echo           Please add manually -- see instructions below.
        )
    ) else (
        (
            echo {
            echo   "mcpServers": {
            echo     "gbrain": {
            echo       "command": "gbrain",
            echo       "args": ["serve"]
            echo     }
            echo   }
            echo }
        ) > "%CLAUDE_CONFIG%"
        echo    [OK] GBrain connected to Claude Code!
    )
)

:: Cursor
set "CURSOR_DIR=%USERPROFILE%\.cursor"
set "CURSOR_MCP=%CURSOR_DIR%\mcp.json"
if exist "%CURSOR_DIR%" (
    echo    [OK] Cursor detected!
    if exist "%CURSOR_MCP%" (
        findstr /c:"gbrain" "%CURSOR_MCP%" >nul 2>&1
        if %errorlevel% equ 0 (
            echo    [OK] GBrain already connected to Cursor.
        ) else (
            echo    [NOTE] Cursor config found but gbrain not added.
            echo           Please add manually -- see instructions below.
        )
    ) else (
        (
            echo {
            echo   "gbrain": {
            echo     "command": "gbrain",
            echo     "args": ["serve"]
            echo   }
            echo }
        ) > "%CURSOR_MCP%"
        echo    [OK] GBrain connected to Cursor!
    )
)

:: ─────────────────────────────────────────────────────────────
:: Done!
:: ─────────────────────────────────────────────────────────────
echo.
echo  +=========================================================+
echo  ^|   GBrain is installed and ready!                       ^|
echo  +=========================================================+
echo.
echo    Your brain lives at: %BRAIN_DIR%
echo.
echo    NEXT STEPS:
echo.
echo    1. Open a NEW Command Prompt and test GBrain:
echo          gbrain --version
echo          gbrain search "hello"
echo.
echo    2. (Optional) Add API keys for smarter AI search:
echo          setx OPENAI_API_KEY "sk-..."
echo          setx ANTHROPIC_API_KEY "sk-ant-..."
echo       Then re-open Command Prompt and run:
echo          gbrain embed --stale
echo.
echo    3. Restart your AI tool (Claude Code, Cursor) to activate
echo       the GBrain memory connection.
echo.
echo    4. To manually add GBrain to Claude Code, add to
echo       %%USERPROFILE%%\.claude\server.json:
echo.
echo          "gbrain": {
echo            "command": "gbrain",
echo            "args": ["serve"]
echo          }
echo.
echo    5. Tell your AI: "You now have a brain at %BRAIN_DIR%.
echo       Use gbrain search before every response."
echo.
echo    Full docs: https://github.com/garrytan/gbrain
echo.
echo  ---------------------------------------------------------
echo.
pause
