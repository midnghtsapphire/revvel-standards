#!/usr/bin/env bash
# audit-404s.sh — script-first probe for shipped-vs-live product URLs.
# Exit 0 only when every URL returns a non-404 status (true postcondition).
# Usage:
#   ./scripts/audit-404s.sh
#   ./scripts/audit-404s.sh urls.txt
#   AUDIT_URLS="https://example.com https://other.example" ./scripts/audit-404s.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL_FILE="${1:-}"
FAILURES=0
CHECKED=0
URLS=()

collect_urls() {
  if [[ -n "${AUDIT_URLS:-}" ]]; then
    # shellcheck disable=SC2206
    URLS=(${AUDIT_URLS})
    return
  fi
  if [[ -n "${URL_FILE}" && -f "${URL_FILE}" ]]; then
    mapfile -t URLS < <(grep -E '^https?://' "${URL_FILE}" || true)
    return
  fi
  URLS=(
    "https://midnghtsapphire.github.io/revvel-standards/"
  )
  local defaults="${ROOT}/scripts/default-urls.txt"
  if [[ -f "${defaults}" ]]; then
    mapfile -t extra < <(grep -E '^https?://' "${defaults}" || true)
    if [[ ${#extra[@]} -gt 0 ]]; then
      URLS+=("${extra[@]}")
    fi
  fi
}

collect_urls

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "audit-404s: no URLs to check" >&2
  exit 2
fi

echo "audit-404s: checking ${#URLS[@]} URL(s)"

for url in "${URLS[@]}"; do
  [[ -z "${url// /}" ]] && continue
  CHECKED=$((CHECKED + 1))
  code="$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 20 "${url}" || echo 000)"
  if [[ "${code}" == "404" || "${code}" == "000" ]]; then
    echo "FAIL ${code} ${url}"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK   ${code} ${url}"
  fi
done

echo "audit-404s: checked=${CHECKED} failures=${FAILURES}"
if [[ "${FAILURES}" -gt 0 ]]; then
  exit 1
fi
exit 0
