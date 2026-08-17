#!/usr/bin/env bash
# Manual test script - Quick validation of the system

set -euo pipefail

echo "🧪 Revvel Rosette - Manual Test"
echo "================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Test 1: Check configuration files
echo "Test 1: Configuration files"
for config in config/*.yaml config/*.json; do
    if [ -f "$config" ]; then
        echo "  ✓ $(basename "$config") exists"
    fi
done
echo ""

# Test 2: Check Python modules
echo "Test 2: Python modules"
for module in src/*.py; do
    if python3 -m py_compile "$module" 2>/dev/null; then
        echo "  ✓ $(basename "$module") syntax OK"
    else
        echo "  ✗ $(basename "$module") has syntax errors"
    fi
done
echo ""

# Test 3: Run orchestrator status
echo "Test 3: Orchestrator status"
if python3 src/orchestrator.py --status; then
    echo "  ✓ Orchestrator works"
else
    echo "  ✗ Orchestrator failed"
fi
echo ""

# Test 4: Run scheduler list
echo "Test 4: Scheduler"
if python3 src/scheduler.py --list; then
    echo "  ✓ Scheduler works"
else
    echo "  ✗ Scheduler failed"
fi
echo ""

# Test 5: Run gatekeeper health check
echo "Test 5: Gatekeeper"
if python3 src/gatekeeper.py --health-check; then
    echo "  ✓ Gatekeeper works"
else
    echo "  ✗ Gatekeeper failed"
fi
echo ""

# Test 6: Environment variables
echo "Test 6: Environment variables"
REQUIRED_VARS=(
    "DOPPLER_TOKEN"
    "GITHUB_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
        echo "  ✓ $var is set"
    else
        echo "  ⚠️  $var is NOT set"
    fi
done
echo ""

echo "✅ Manual test complete"
echo ""
echo "To run full automation:"
echo "  python3 src/orchestrator.py --run-all"
