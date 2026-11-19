#!/usr/bin/env bash
# Doppler fan-out. CircleCI is the runner. Dry-run unless SECRETS_APPLY=1.
# Prints names and decisions only. Never prints a secret value.
set -euo pipefail

python3 -m pip install --user --disable-pip-version-check --quiet pynacl pytest
export PATH="${HOME}/.local/bin:${PATH}"
python3 -m pytest tests/test_zero_touch_secrets.py -q

if [[ -z "${DOPPLER_TOKEN:-}" || -z "${CIRCLE_TOKEN:-}" ]]; then
  echo "DOPPLER_TOKEN and CIRCLE_TOKEN must both be set on the CircleCI project."
  echo "The weekly job does not report success until those tokens exist."
  exit 2
fi

python3 scripts/zero_touch_secrets.py sync
python3 scripts/zero_touch_secrets.py rotate
if [[ "${SECRETS_APPLY:-}" == "1" ]]; then
  python3 scripts/zero_touch_secrets.py sync --apply
  python3 scripts/zero_touch_secrets.py rotate --apply
fi
