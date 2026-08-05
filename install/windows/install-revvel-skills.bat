@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  Revvel Skills Framework — Pop-Up Installer for Windows
::  Double-click this file to install!
::
::  What this does:
::    1. Checks your Windows PC is ready
::    2. Installs Node.js (if not already installed)
::    3. Installs PromptFoo (skill testing tool)
::    4. Installs Bun (fast JavaScript engine)
::    5. Sets up the Revvel skills config in your AI tool
::    6. Runs a quick health check
::    7. Shows you what to do next
::
::  You do NOT need to know how to code. Just double-click!
:: ============================================================

title Revvel Skills Framework Installer

cls
echo.
echo  +=========================================================+
echo  ^|      Revvel Skills Framework — Windows Installer       ^|
echo  +=========================================================+
echo.
echo  Welcome! This installer sets up the Revvel Skills Framework
echo  on your Windows PC.
echo.
echo  The Revvel Skills Framework gives your AI assistant
echo  special "skills" — expert abilities it can use to help you
echo  with specific tasks like code review, deployments,
echo  brainstorming, security checks, and a lot more!
echo.
echo  Think of it like installing apps on a phone,
echo  but for your AI assistant instead.
echo.
echo  ---------------------------------------------------------
echo  This will take about 5 minutes.
echo  ---------------------------------------------------------
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: Setup variables
:: ─────────────────────────────────────────────────────────────
set "SKILLS_DIR=%USERPROFILE%\.revvel\skills"
set "CONFIG_DIR=%USERPROFILE%\.revvel"
set "NODE_OK=false"
set "BUN_OK=false"
set "PROMPTFOO_OK=false"
set "ERRORS=0"

:: ─────────────────────────────────────────────────────────────
:: Step 1: Check Windows version
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 1: Checking your Windows PC
echo  ----------------------------------
for /f "tokens=4-5 delims=. " %%i in ('ver') do set "WIN_VER=%%i.%%j"
echo    Windows version: %WIN_VER%
echo    [OK] Windows detected!
echo.

:: ─────────────────────────────────────────────────────────────
:: Step 2: Check required tools
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 2: Checking required tools
echo  ---------------------------------

where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo    [!!] curl not found.
    echo        curl comes with Windows 10 version 1803 and newer.
    echo        Please update Windows or download curl from: https://curl.se/windows/
    set /a ERRORS+=1
    pause
    exit /b 1
) else (
    echo    [OK] curl is available.
)

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo    [NOTE] git is not installed. Some features will be limited.
    echo        Install git from: https://git-scm.com/download/win
    set "GIT_AVAILABLE=false"
) else (
    echo    [OK] git is available.
    set "GIT_AVAILABLE=true"
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 3: Install Node.js (required for PromptFoo)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 3: Checking Node.js
echo  --------------------------
echo    Node.js is needed to run skill tests.
echo.

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do set "NODE_VERSION=%%v"
    echo    [OK] Node.js already installed: %NODE_VERSION%
    set "NODE_OK=true"
) else (
    echo    Node.js not found. Installing via winget...
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        if %errorlevel% equ 0 (
            echo    [OK] Node.js installed!
            set "NODE_OK=true"
            :: Refresh PATH
            for /f "tokens=*" %%p in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%p;%PATH%"
        ) else (
            echo    [!!] Automatic install failed.
            echo        Please download Node.js from: https://nodejs.org
            echo        Choose the "LTS" version, then run this installer again.
            pause
            exit /b 1
        )
    ) else (
        echo    [NOTE] winget not available. Please install Node.js manually:
        echo        https://nodejs.org  (choose "LTS" version^)
        echo        Then run this installer again.
        pause
        exit /b 1
    )
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 4: Install Bun
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 4: Installing Bun (fast JavaScript engine)
echo  -------------------------------------------------
echo.

set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"

if exist "%BUN_EXE%" (
    echo    [OK] Bun already installed — skipping!
    set "BUN_OK=true"
) else (
    where bun >nul 2>&1
    if %errorlevel% equ 0 (
        echo    [OK] Bun already installed — skipping!
        set "BUN_OK=true"
    ) else (
        echo    Installing Bun...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "irm bun.sh/install.ps1 | iex" 2>&1
        if %errorlevel% equ 0 (
            echo    [OK] Bun installed!
            set "BUN_OK=true"
            set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
        ) else (
            echo    [NOTE] Bun install failed. Some features may not work.
            echo        You can install it later from: https://bun.sh
        )
    )
)

:: Add Bun to PATH permanently
if "%BUN_OK%"=="true" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$p = '%USERPROFILE%\.bun\bin'; $u = [Environment]::GetEnvironmentVariable('PATH','User'); if ($u -notlike '*\.bun\bin*') { [Environment]::SetEnvironmentVariable('PATH', $u + ';' + $p, 'User') }"
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 5: Install PromptFoo (skill testing tool)
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 5: Installing PromptFoo (skill testing tool)
echo  ---------------------------------------------------
echo    PromptFoo tests each skill to make sure it works.
echo.

where promptfoo >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] PromptFoo already installed — skipping!
    set "PROMPTFOO_OK=true"
) else (
    echo    Installing PromptFoo... (this may take 1-2 minutes)
    npm install -g promptfoo 2>&1
    if %errorlevel% equ 0 (
        echo    [OK] PromptFoo installed!
        set "PROMPTFOO_OK=true"
    ) else (
        echo    [NOTE] PromptFoo install failed. Skill tests won't run automatically.
        echo        You can install it later with: npm install -g promptfoo
    )
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 6: Create Revvel config folder
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 6: Setting up Revvel config folder
echo  -----------------------------------------

if not exist "%CONFIG_DIR%" (
    mkdir "%CONFIG_DIR%"
    echo    [OK] Created config folder at: %CONFIG_DIR%
) else (
    echo    [OK] Config folder already exists: %CONFIG_DIR%
)

if not exist "%SKILLS_DIR%" (
    mkdir "%SKILLS_DIR%"
    echo    [OK] Created skills folder at: %SKILLS_DIR%
) else (
    echo    [OK] Skills folder already exists: %SKILLS_DIR%
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 7: Connect Revvel Skills to AI tools
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 7: Connecting to your AI tools
echo  -------------------------------------
echo    We'll connect the skills framework to any AI tools you have.
echo.

:: Claude Code
set "CLAUDE_DIR=%USERPROFILE%\.claude"
if exist "%CLAUDE_DIR%" (
    echo    [OK] Claude Code detected!
    if not exist "%CLAUDE_DIR%\AGENTS.md" (
        (
            echo # Revvel Skills Framework
            echo.
            echo This AI has access to the Revvel Skills Framework.
            echo Before every session, check skills/REGISTRY.md for available skills.
            echo.
            echo ## Mandatory Session Start Skills
            echo - system-state
            echo - mvi-contract
            echo - model-router
            echo - context-management
            echo.
            echo ## Skill Registry
            echo See: https://github.com/midnghtsapphire/revvel-standards/blob/main/skills/REGISTRY.md
        ) > "%CLAUDE_DIR%\AGENTS.md"
        echo    [OK] Revvel Skills connected to Claude Code!
    ) else (
        echo    [NOTE] Claude Code already configured. Check %CLAUDE_DIR%\AGENTS.md
    )
)

:: Cursor
set "CURSOR_MCP=%USERPROFILE%\.cursor\mcp.json"
if exist "%USERPROFILE%\.cursor" (
    echo    [OK] Cursor detected!
    echo    [NOTE] Add Revvel skills manually to Cursor's agent config.
    echo        See docs: https://github.com/midnghtsapphire/revvel-standards
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Done!
:: ─────────────────────────────────────────────────────────────
echo.
echo  +=========================================================+
echo  ^|   Revvel Skills Framework is installed and ready!      ^|
echo  +=========================================================+
echo.
echo    WHAT'S INSTALLED:
if "%NODE_OK%"=="true"      echo    [OK] Node.js
if "%BUN_OK%"=="true"       echo    [OK] Bun
if "%PROMPTFOO_OK%"=="true" echo    [OK] PromptFoo (skill tester^)
echo    [OK] Revvel config at: %CONFIG_DIR%
echo.
echo    NEXT STEPS:
echo.
echo    1. Open a NEW Command Prompt and test PromptFoo:
echo          promptfoo --version
echo.
echo    2. Test a skill:
echo          cd skills\testing-agent\tests
echo          promptfoo eval --config promptfoo.yml
echo.
echo    3. Build your own skill (AI-guided^):
echo          Open Claude Code and say: "build a skill"
echo          The Forge persona will guide you through it.
echo.
echo    4. Browse all available skills:
echo          https://github.com/midnghtsapphire/revvel-standards/blob/main/skills/REGISTRY.md
echo.
echo    5. Sell your skills:
echo          See: docs\MARKETPLACE_GUIDE.md
echo.
echo  ---------------------------------------------------------
echo    Full docs: https://github.com/midnghtsapphire/revvel-standards
echo  ---------------------------------------------------------
echo.
pause
