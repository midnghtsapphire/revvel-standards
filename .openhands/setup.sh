#!/bin/bash
# OpenHands Setup Script - Runs when OpenHands begins working with revvel-standards
# This script installs dependencies and sets up the environment

set -e

echo "🚀 Running revvel-standards setup..."

# Install npm dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm install --legacy-peer-deps
fi

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Install Go dependencies if go.mod exists
if [ -f "go.mod" ]; then
    echo "🐹 Installing Go dependencies..."
    go mod download
fi

# Install Rust dependencies if Cargo.toml exists
if [ -f "Cargo.toml" ]; then
    echo "🦀 Installing Rust dependencies..."
    cargo fetch
fi

# Check for .env.example and create .env if it doesn't exist
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "🔐 Copying .env.example to .env..."
    cp .env.example .env
fi

# Run pre-flight checks
echo "✅ Running pre-flight checks..."

# Verify tests exist and pass
if [ -f "package.json" ]; then
    npm test || echo "⚠️ Tests failed - see output above"
fi

echo "✅ Setup complete!"