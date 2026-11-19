#!/usr/bin/env bash
# Doppler fan-out. CircleCI is the runner. Dry-run unless SECRETS_APPLY=1.
# Prints names and decisions only. Never prints a secret value.
set -euo pipefail

python3 -m pip install --user --disable-pip-version-check --quiet pynacl pytest
export PATH="${HOME}/.local/bin:${PATH}"
python3 -m pytest tests/test_zero_touch_secrets.py -q

if [[ -z "${DOPPLER_TOKEN:-}" || -z "${CIRCLE_TOKEN:-}" ]]; then
  echo "SKIPPED — set DOPPLER_TOKEN and CIRCLE_TOKEN on the CircleCI project."
  echo "Sync stays a dry-run until SECRETS_APPLY=1."
  exit 0
fi

python3 scripts/zero_touch_secrets.py sync
python3 scripts/zero_touch_secrets.py rotate
if [[ "${SECRETS_APPLY:-}" == "1" ]]; then
  python3 scripts/zero_touch_secrets.py sync --apply
  python3 scripts/zero_touch_secrets.py rotate --apply
fi
