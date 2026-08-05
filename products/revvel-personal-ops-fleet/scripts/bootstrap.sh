#!/usr/bin/env bash
# Local setup. Installs runtime + dev dependencies into the active environment.
set -euo pipefail
cd "$(dirname "$0")/.."
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
mkdir -p var/audit var/plans var/inventory
cp -n config/policy.example.yaml config/policy.yaml 2>/dev/null || true
cp -n config/identities.example.yaml config/identities.yaml 2>/dev/null || true
cp -n config/storage.example.yaml config/storage.yaml 2>/dev/null || true
echo "bootstrap complete. Review config/*.yaml before running anything."
