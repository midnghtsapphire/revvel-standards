#!/usr/bin/env bash
# eco-ci-run.sh - CI-agnostic energy estimate for this repo (runs on CircleCI,
# on Audrey's own machine, or in any bash shell). Replaces the billing-locked
# `run-tests` job of .github/workflows/eco-github-extensions.yml, which used
# green-coding-solutions/eco-ci-energy-estimation as a GitHub Action.
#
# WHAT IT DOES
#   1. fetches Eco CI at an exact commit (v5.3.0 = 782dd4a3...), verifies the SHA;
#   2. starts the CPU-utilisation sampler;
#   3. runs two laps of real work and records an energy figure for each:
#        lap 1  npm ci with the sustainable-npm settings
#        lap 2  the full `npm test` suite (exit code recorded, not enforced:
#               lint-and-test is the gate; this job prices the run)
#   4. writes eco-summary.json, eco-ci-output.txt, lap-data.json to $ECO_OUT_DIR.
#
# WHAT THE NUMBER IS (do not call it a measurement of watts)
#   Eco CI does not read a power meter. It samples CPU utilisation once a second
#   and maps it through a pre-computed power curve (Cloud Energy, trained on
#   SPECpower data). On a CPU it has no curve for it falls back to `default.sh`,
#   which its own README says "will likely produce very inaccurate results".
#   summary.json says so in `estimate_kind` and `caveats`; keep that wording
#   wherever the figure is quoted. Use it to compare runs of the SAME runner
#   class over time, not as an absolute energy claim.
#
# PRIVACY: send-data is hard-wired to false. The upstream GitHub Action
# defaults to true, which posts repo name, branch, commit and CPU model to
# metrics.green-coding.io. Nothing leaves the machine here.
#
# FALLBACK / WHAT TO CHECK IF IT FAILS
#   - "Date ... not accurate to microseconds": GNU coreutils `date` is missing.
#   - "cannot fetch Eco CI": no route to github.com; set ECO_CI_DIR to an
#     existing checkout of the pinned commit.
#   - No Node >= 22: the script tries nvm; otherwise install Node 22.
#   - Linux only (upstream limitation). On Windows (runner CARESSE) run it in WSL2.
set -euo pipefail

ECO_CI_REF="782dd4a31bc426a6ae26a7b08d89af454b10ffc0"   # v5.3.0
ECO_CI_REPO_URL="https://github.com/green-coding-solutions/eco-ci-energy-estimation"
ECO_CI_DIR="${ECO_CI_DIR:-/tmp/eco-ci-repo}"
ECO_OUT_DIR="${ECO_OUT_DIR:-eco-out}"
# 472 gCO2e/kWh is Eco CI's own default (world average, Ember via the Green Web
# Foundation's co2.js). Override with the real grid for the runner's region.
ECO_GRID_G_PER_KWH="${ECO_GRID_G_PER_KWH:-472}"

die() { echo "eco-ci-run: $*" >&2; exit 1; }

[[ "$(uname -s)" == "Linux" ]] || die "Linux only (Eco CI limitation); use WSL2 on Windows"
for t in git curl jq awk date; do command -v "$t" >/dev/null || die "missing tool: $t"; done

ensure_node() {
  local major=0
  if command -v node >/dev/null 2>&1; then major="$(node -p 'process.versions.node.split(".")[0]')"; fi
  if (( major >= 22 && major < 25 )); then return 0; fi
  # shellcheck disable=SC1091
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    source "$HOME/.nvm/nvm.sh"; nvm install 22 >/dev/null; nvm use 22 >/dev/null
    major="$(node -p 'process.versions.node.split(".")[0]')"
    (( major >= 22 && major < 25 )) && return 0
  fi
  die "need Node >=22 <25 (package.json engines); found major=$major"
}

fetch_eco_ci() {
  if [[ -d "$ECO_CI_DIR/.git" ]]; then
    :
  else
    rm -rf "$ECO_CI_DIR"; mkdir -p "$ECO_CI_DIR"
    git -C "$ECO_CI_DIR" init -q
    git -C "$ECO_CI_DIR" remote add origin "$ECO_CI_REPO_URL"
    timeout 120 git -C "$ECO_CI_DIR" fetch -q --depth 1 origin "$ECO_CI_REF" || die "cannot fetch Eco CI $ECO_CI_REF"
    git -C "$ECO_CI_DIR" checkout -q FETCH_HEAD
  fi
  local got; got="$(git -C "$ECO_CI_DIR" rev-parse HEAD)"
  [[ "$got" == "$ECO_CI_REF" ]] || die "Eco CI checkout is $got, expected pinned $ECO_CI_REF"
}

ensure_node
fetch_eco_ci
mkdir -p "$ECO_OUT_DIR"
ECO_OUT_DIR="$(cd "$ECO_OUT_DIR" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

RUN_ID="${CIRCLE_WORKFLOW_ID:-${ECO_RUN_ID:-local}}"
BRANCH="${CIRCLE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
SHA="${CIRCLE_SHA1:-$(git rev-parse HEAD)}"
JOB_ID="${CIRCLE_BUILD_NUM:-local}"

# Start. Args are the 22 positional values Eco CI's setup.sh expects. The API
# endpoint slots are inert placeholders because send-data=false.
# Its cpu_vars() dumps full /proc/cpuinfo + /proc/meminfo; keep that in a file,
# not the CI log.
bash "$ECO_CI_DIR/scripts/setup.sh" start_measurement \
  "default.sh" "$RUN_ID" "$BRANCH" "midnghtsapphire/revvel-standards" "eco-run" "eco-ci-run.sh" "$SHA" \
  "local" "false" "machine.ci" "CI/CD" "${ECO_MACHINE_LABEL:-unlabelled-runner}" "" \
  "constant" "$ECO_GRID_G_PER_KWH" "" "" "true" \
  "unused" "unused" "unused" "$JOB_ID" > "$ECO_OUT_DIR/eco-ci-start.log" 2>&1 \
  || { cat "$ECO_OUT_DIR/eco-ci-start.log" >&2; die "Eco CI start_measurement failed"; }

SKIPPED_LAPS=()
lap() { # $1 = label
  local before after
  before="$(jq '.steps | length' /tmp/eco-ci/lap-data.json 2>/dev/null || echo 0)"
  bash "$ECO_CI_DIR/scripts/make_measurement.sh" make_measurement "$1" >> "$ECO_OUT_DIR/eco-ci-laps.log" 2>&1 \
    || { tail -n 30 "$ECO_OUT_DIR/eco-ci-laps.log" >&2; die "Eco CI lap '$1' failed"; }
  after="$(jq '.steps | length' /tmp/eco-ci/lap-data.json 2>/dev/null || echo 0)"
  # The sampler writes one line per second; a lap shorter than that has no data
  # and Eco CI silently skips it. Say so instead of dropping it.
  if [[ "$after" == "$before" ]]; then SKIPPED_LAPS+=("$1"); echo "eco-ci-run: lap '$1' was too short to sample (<1 s); no figure recorded" >&2; fi
}

# ---- lap 1: npm ci with the sustainable-npm settings (lowlydba/sustainable-npm
# v4.0.0 only *sets* these npm configs; the old workflow never ran an install,
# so it measured nothing). Passed as env, so ~/.npmrc is not modified.
export npm_config_audit=false npm_config_fund=false npm_config_progress=false \
       npm_config_update_notifier=false npm_config_prefer_offline=true \
       npm_config_loglevel=error npm_config_ignore_scripts=true
npm ci
lap "npm ci (sustainable-npm settings)"

# ---- lap 2: the whole test suite. Its exit code is recorded in the summary but
# does not fail this job: tests/known-red failures on main are pre-existing and
# `lint-and-test` is the job that gates them. This lap prices a test run.
TEST_EXIT=0
npm test > "$ECO_OUT_DIR/npm-test.log" 2>&1 || TEST_EXIT=$?
lap "npm test (full suite)"

bash "$ECO_CI_DIR/scripts/display_results.sh" display_results "true" "false" > "$ECO_OUT_DIR/eco-ci-display.log" 2>&1 \
  || { cat "$ECO_OUT_DIR/eco-ci-display.log" >&2; die "Eco CI display_results failed"; }
cp /tmp/eco-ci/output.txt "$ECO_OUT_DIR/eco-ci-output.txt"
cp /tmp/eco-ci/lap-data.json "$ECO_OUT_DIR/lap-data.json"
bash "$ECO_CI_DIR/scripts/setup.sh" end_measurement >/dev/null 2>&1 || true

cat "$ECO_OUT_DIR/eco-ci-output.txt"

# Summary. Energy is summed from the per-lap values Eco CI recorded.
# Figures Eco CI itself prints (CO2 from energy, embodied share, SCI per run).
co2_energy_g="$(awk -F': ' '/CO₂ from energy is/ {gsub(/ g/,"",$2); print $2; exit}' "$ECO_OUT_DIR/eco-ci-output.txt")"
co2_embodied_g="$(awk -F': ' '/embodied carbon\) is/ {gsub(/ g/,"",$2); print $2; exit}' "$ECO_OUT_DIR/eco-ci-output.txt")"
sci_g="$(sed -n 's/.*SCI<\/a>: <b>\([0-9.]*\) gCO.*/\1/p' "$ECO_OUT_DIR/eco-ci-output.txt" | head -n 1)"
cpu_model="$(awk -F': ' '/model name/ {print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
jq -n \
  --slurpfile laps "$ECO_OUT_DIR/lap-data.json" \
  --arg ref "$ECO_CI_REF" --arg cpu "${cpu_model:-unknown}" --arg sha "$SHA" --arg branch "$BRANCH" \
  --arg ce "${co2_energy_g:-}" --arg cm "${co2_embodied_g:-}" --arg sci "${sci_g:-}" \
  --argjson test_exit "$TEST_EXIT" --arg skipped "$(printf '%s\n' "${SKIPPED_LAPS[@]:-}")" \
  --arg grid "$ECO_GRID_G_PER_KWH" --arg node "$(node -v)" --arg label "${ECO_MACHINE_LABEL:-unlabelled-runner}" \
  '($laps[0].steps | map({label, energy_joules: (.energy_joules|tonumber), cpu_avg_percent: (.cpu_avg_percent|tonumber), time_s: (.time|tonumber)})) as $s
   | ($s | map(.energy_joules) | add) as $j
   | {
      schema: "revvel-eco-run/1",
      estimate_kind: "model-estimate from CPU utilisation (Cloud Energy power curve), NOT a power-meter reading",
      power_profile: "default.sh (generic fallback; no curve for this CPU)",
      eco_ci: {version: "v5.3.0", commit: $ref, send_data: false},
      runner: {label: $label, cpu_model: $cpu, node: $node},
      commit: $sha, branch: $branch,
      laps: $s,
      total_energy_joules: $j,
      total_energy_mwh: ($j / 3.6),
      grid_intensity_g_per_kwh: ($grid|tonumber),
      operational_co2e_mg_estimate: ($j / 3600000 * ($grid|tonumber) * 1000),
      eco_ci_reported: {
        co2_from_energy_g: (if $ce == "" then null else ($ce|tonumber) end),
        co2_embodied_share_g: (if $cm == "" then null else ($cm|tonumber) end),
        sci_gco2e_per_run: (if $sci == "" then null else ($sci|tonumber) end),
        sci_note: "SCI = ((E x I) + M) per run, Green Software Foundation spec (ISO/IEC 21031:2024); M here is the generic Eco CI 800.3 kg server profile pro rata, an assumption"
      },
      embodied_carbon_in_operational_figure: false,
      workload_exit_code_npm_test: $test_exit,
      laps_too_short_to_sample: ($skipped | split("\n") | map(select(. != ""))),
      caveats: [
        "Utilisation-based estimate; compare runs on the same runner class, do not quote as absolute energy.",
        "Operational figure excludes network transfer, idle neighbours on shared hosts and embodied hardware carbon (eco_ci_reported has the Eco CI pro-rata embodied share).",
        "Grid intensity is a constant, not the live grid at the runner location."
      ]
    }' > "$ECO_OUT_DIR/eco-summary.json"
echo "wrote $ECO_OUT_DIR/eco-summary.json"
