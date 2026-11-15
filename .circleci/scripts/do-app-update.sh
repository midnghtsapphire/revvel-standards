#!/usr/bin/env bash
# Update the DigitalOcean App Platform app for one product.
# DRAFT ONLY. Audrey must approve this before it merges. A merge of this
# file can create or update an App Platform app when DIGITALOCEAN_ACCESS_TOKEN
# is set in CircleCI project environment variables.
# If the token is unset, the script exits 0 and does not call doctl.
# That green skip is not a live site.
# Added 2026-11-11 by MarketShipper. Moved off #18366 so that PR cannot deploy.
set -euo pipefail

PRODUCT="${1:?product name required}"
if [[ ! "$PRODUCT" =~ ^[a-z0-9-]+$ ]]; then
  echo "invalid product name" >&2
  exit 1
fi

decision="$(bash .circleci/scripts/product-diff.sh "$PRODUCT")"
if [[ "$decision" == "skip" ]]; then
  echo "No ${PRODUCT} deploy inputs in this diff. App Platform was not called."
  exit 0
fi

if [[ -z "${DIGITALOCEAN_ACCESS_TOKEN:-}" ]]; then
  echo "SKIPPED — DIGITALOCEAN_ACCESS_TOKEN is not set."
  echo "Set it in CircleCI → Project Settings → Environment Variables."
  echo "The token needs App Platform write access."
  echo "No app was created or updated. ${PRODUCT}.revvel.co was not deployed."
  exit 0
fi

SPEC="${DO_APP_SPEC:-products/${PRODUCT}/.do/app.yaml}"
if [[ ! -f "$SPEC" ]]; then
  echo "Missing ${SPEC}" >&2
  exit 1
fi
if ! grep -q "^name: ${PRODUCT}$" "$SPEC"; then
  echo "${SPEC} name does not match ${PRODUCT}" >&2
  exit 1
fi

DOCTL_VERSION="${DOCTL_VERSION:-1.131.0}"
tmpdir="$(mktemp -d)"
# --proto '=https' refuses an http redirect. Sonar shell:S6506.
curl --proto '=https' --tlsv1.2 -fsSL -o "${tmpdir}/doctl.tar.gz" \
  "https://github.com/digitalocean/doctl/releases/download/v${DOCTL_VERSION}/doctl-${DOCTL_VERSION}-linux-amd64.tar.gz"
tar -xzf "${tmpdir}/doctl.tar.gz" -C "$tmpdir"
DOCTL="${tmpdir}/doctl"
"$DOCTL" version

list="$("$DOCTL" apps list -o json)"
set +e
selected="$(printf '%s' "$list" | node .circleci/scripts/select-do-app.mjs "$PRODUCT")"
code=$?
set -e
if [[ "$code" -ne 0 ]]; then
  echo "Refusing to deploy ${PRODUCT}: ${selected}" >&2
  exit 1
fi

action="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).action)' "$selected")"
if [[ "$action" == "create" ]]; then
  echo "Creating DigitalOcean app ${PRODUCT}"
  "$DOCTL" apps create --spec "$SPEC" --wait=false
elif [[ "$action" == "update" ]]; then
  app_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$selected")"
  echo "Updating DigitalOcean app ${app_id}"
  "$DOCTL" apps update "$app_id" --spec "$SPEC" --wait=false
else
  echo "Unexpected decision ${selected}" >&2
  exit 1
fi

echo "doctl accepted the spec. This script does not prove DNS or a paid checkout."
