#!/usr/bin/env bash
# Bootstrap script for Revvel Rosette Automation
# Sets up the environment and installs dependencies

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Revvel Rosette Automation - Bootstrap"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found - some features may not work"
fi

echo "✓ Prerequisites OK"
echo ""

# Install Node dependencies
echo "Installing Node.js dependencies..."
cd "$PROJECT_ROOT"
npm install

echo "✓ Node dependencies installed"
echo ""

# Install Python dependencies
echo "Installing Python dependencies..."

if command -v uv &> /dev/null; then
    echo "Using uv for Python package management..."
    uv pip install -e .
elif [ -f "requirements.txt" ]; then
    echo "Using pip..."
    pip3 install -r requirements.txt
else
    echo "Using pyproject.toml..."
    pip3 install -e .
fi

echo "✓ Python dependencies installed"
echo ""

# Create required directories
echo "Creating required directories..."
mkdir -p logs data backups queue
echo "✓ Directories created"
echo ""

# Set up config files if they don't exist
echo "Setting up configuration..."

if [ ! -f "config/59-config.yaml" ]; then
    if [ -f "config/59-config.example.yaml" ]; then
        cp config/59-config.example.yaml config/59-config.yaml
        echo "✓ Created config/59-config.yaml from example"
    else
        echo "⚠️  No example config found - you'll need to create config/59-config.yaml manually"
    fi
fi

echo ""

# Make scripts executable
echo "Making scripts executable..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x src/*.py 2>/dev/null || true
echo "✓ Scripts are executable"
echo ""

# Initialize queue file
if [ ! -f "queue.txt" ]; then
    touch queue.txt
    echo "✓ Created queue.txt"
fi

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Set environment variables (export DOPPLER_TOKEN=... GITHUB_TOKEN=... in your shell or .env)"
echo "  2. Verify: npm test"
echo "  3. Smoke test: ./scripts/manual-test.sh"
echo "  4. Run a daily pass: python3 src/orchestrator.py --run-all"
echo ""
