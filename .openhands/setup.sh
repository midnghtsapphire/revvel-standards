#!/bin/bash
# OpenHands Setup Script - Runs when OpenHands begins working with revvel-standards
# This script installs dependencies and sets up the environment
#
# No `set -e`. It used to be here, above `npm install --legacy-peer-deps`, so a
# peer-dependency resolution failure -- the exact failure --legacy-peer-deps is
# there to paper over -- killed the script before the .env copy and before
# `npm test` ever ran. The agent then started work in a half-prepared
# environment with no record of which step stopped it. Every step below now
# records its exit code and the script keeps going; the summary at the end is
# the list of what actually failed.

echo "🚀 Running revvel-standards setup..."

FAILED=""

# $1 = label, rest = command. Prints the exit code either way and never aborts.
run_step() {
    local label="$1"; shift
    echo "--- ${label}"
    "$@"
    local code=$?
    echo "--- ${label}: exit ${code}"
    if [ ${code} -ne 0 ]; then
        FAILED="${FAILED}  ${label} (exit ${code})
"
    fi
    return 0
}

# Install npm dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    run_step "npm install" npm install --legacy-peer-deps
fi

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    run_step "pip install" pip install -r requirements.txt
fi

# Install Go dependencies if go.mod exists
if [ -f "go.mod" ]; then
    echo "🐹 Installing Go dependencies..."
    run_step "go mod download" go mod download
fi

# Install Rust dependencies if Cargo.toml exists
if [ -f "Cargo.toml" ]; then
    echo "🦀 Installing Rust dependencies..."
    run_step "cargo fetch" cargo fetch
fi

# Check for .env.example and create .env if it doesn't exist
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "🔐 Copying .env.example to .env..."
    run_step "cp .env.example .env" cp .env.example .env
fi

# Run pre-flight checks
echo "✅ Running pre-flight checks..."

# Verify tests exist and pass. repo.md lists what else is runnable here
# (npm run lint, typecheck, verify, llm:doctor); this runs the suite only.
if [ -f "package.json" ]; then
    run_step "npm test" npm test
fi

if [ -n "${FAILED}" ]; then
    echo "⚠️  Setup finished with failures:"
    printf '%s' "${FAILED}"
else
    echo "✅ Setup complete, every step exit 0"
fi
