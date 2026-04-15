@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  [Skill Name] — Pop-Up Installer for Windows
::  Double-click this file to install!
::
::  What this does:
::    1. Checks your PC is ready
::    2. Installs any tools this skill needs
::    3. Connects the skill to your AI tool
::    4. Tests that everything works
::
::  You do NOT need to know how to code. Just double-click!
:: ============================================================

title [Skill Name] Installer

cls
echo.
echo  +=========================================================+
echo  ^|         [Skill Name] Installer for Windows             ^|
echo  +=========================================================+
echo.
echo  [Plain-language description of what this skill does.]
echo  [2-3 sentences maximum. Write for an 8-year-old.]
echo.
echo  ---------------------------------------------------------
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: Step 1: Check prerequisites
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 1: Checking required tools
echo  ---------------------------------

where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo    [!!] curl not found. Please download from https://curl.se/windows/
    pause & exit /b 1
) else (
    echo    [OK] curl is available.
)

:: Add more prerequisite checks here as needed...

echo.

:: ─────────────────────────────────────────────────────────────
:: Step 2: [Install skill-specific dependencies]
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 2: [Installing skill dependencies]
echo  -----------------------------------------
echo.

:: Add dependency installation steps here...

echo    [OK] Dependencies ready.
echo.

:: ─────────────────────────────────────────────────────────────
:: Step 3: Connect skill to AI tool
:: ─────────────────────────────────────────────────────────────
echo.
echo  STEP 3: Connecting [Skill Name] to your AI tool
echo  -------------------------------------------------

set "CLAUDE_DIR=%USERPROFILE%\.claude"
if exist "%CLAUDE_DIR%" (
    echo    [OK] Claude Code detected!
    echo    [Skill Name] connected!
)

echo.

:: ─────────────────────────────────────────────────────────────
:: Done!
:: ─────────────────────────────────────────────────────────────
echo.
echo  +=========================================================+
echo  ^|   [Skill Name] is installed and ready!                 ^|
echo  +=========================================================+
echo.
echo    NEXT STEPS:
echo.
echo    1. [First step for using the skill]
echo    2. [Second step]
echo    3. [Third step]
echo.
pause
