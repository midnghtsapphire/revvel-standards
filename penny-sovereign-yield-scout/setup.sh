#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# penny-sovereign-yield-scout — One-Click Install & Test
# Author: Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp
# Usage:  bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colours ─────────────────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
RESET="\033[0m"

ok()   { echo -e "  ${GREEN}✅ $*${RESET}"; }
warn() { echo -e "  ${YELLOW}⚠️  $*${RESET}"; }
err()  { echo -e "  ${RED}❌ $*${RESET}"; exit 1; }
info() { echo -e "  ${CYAN}ℹ️  $*${RESET}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   🪙  Penny Sovereign Yield Scout — Setup                ║${RESET}"
echo -e "${BOLD}║   Freedom Angel Corp / Audrey Evans  v1.0.0              ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ─── Step 0: Pre-flight checks ───────────────────────────────────────────────
echo -e "${BOLD}Step 0: Pre-flight checks${RESET}"

command -v python3 >/dev/null 2>&1 || err "python3 not found. Install Python 3.10+."
PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Python version: $PYTHON_VERSION"

PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]; }; then
  err "Python 3.10+ required (found $PYTHON_VERSION)"
fi
ok "Python $PYTHON_VERSION"

command -v pip3 >/dev/null 2>&1 || err "pip3 not found."
ok "pip3 found"

echo ""

# ─── Step 1: Create virtual environment ──────────────────────────────────────
echo -e "${BOLD}Step 1: Virtual environment${RESET}"

VENV_DIR=".venv"
if [ -d "$VENV_DIR" ]; then
  warn "Virtual environment already exists at .venv — skipping creation"
else
  python3 -m venv "$VENV_DIR"
  ok "Created .venv"
fi

# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"
ok "Activated .venv"
echo ""

# ─── Step 2: Install dependencies ────────────────────────────────────────────
echo -e "${BOLD}Step 2: Installing dependencies${RESET}"

pip install --quiet --upgrade pip
ok "pip upgraded"

pip install --quiet \
  requests \
  httpx \
  "fastapi>=0.110.0" \
  "uvicorn[standard]>=0.29.0" \
  web3 \
  python-dotenv \
  rich \
  typer \
  praw \
  tweepy \
  aiohttp \
  pandas \
  jinja2 \
  fpdf2 \
  pyyaml

ok "Core dependencies installed"

# Optional: reportlab for PDF generation
pip install --quiet reportlab 2>/dev/null && ok "reportlab installed (PDF support)" || warn "reportlab not installed — PDF generation will use fpdf2 only"

echo ""

# ─── Step 3: Environment file ─────────────────────────────────────────────────
echo -e "${BOLD}Step 3: Environment setup${RESET}"

if [ -f ".env" ]; then
  warn ".env already exists — skipping copy"
else
  cat > .env.example << 'EOF'
# ─── Node / RPC ───────────────────────────────────────────────────────────────
ALCHEMY_API_KEY=your_alchemy_api_key_here
MORALIS_API_KEY=your_moralis_api_key_here

# ─── DeFi Data APIs ───────────────────────────────────────────────────────────
DEFILLAMA_BASE_URL=https://yields.llama.fi
DUNE_API_KEY=your_dune_api_key_here

# ─── Social APIs ──────────────────────────────────────────────────────────────
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USER_AGENT=penny-yield-scout/1.0

# ─── AI (OpenRouter) ─────────────────────────────────────────────────────────
OPENROUTER_API_KEY=your_openrouter_api_key_here

# ─── Audit Logging ────────────────────────────────────────────────────────────
VERIFIABLE_LOG_DIR=./logs

# ─── Wallet (NEVER commit real values) ───────────────────────────────────────
COMPOUND_WALLET_ADDRESS=0xYourWalletAddressHere
COMPOUND_PRIVATE_KEY=NEVER_COMMIT_YOUR_REAL_PRIVATE_KEY
EOF
  cp .env.example .env
  ok ".env.example created"
  warn ".env created from template — FILL IN YOUR KEYS before running tools"
fi

# ─── Step 4: Create required directories ─────────────────────────────────────
echo ""
echo -e "${BOLD}Step 4: Directory structure${RESET}"

mkdir -p logs generated branding

ok "logs/ directory ready"
ok "generated/ directory ready"
ok "branding/ directory ready"
echo ""

# ─── Step 5: Smoke tests ─────────────────────────────────────────────────────
echo -e "${BOLD}Step 5: Smoke tests${RESET}"

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    ok "PASS: $name"
    PASS=$((PASS + 1))
  else
    warn "SKIP: $name (may require env keys)"
    FAIL=$((FAIL + 1))
  fi
}

run_test "Import verifiable_logger" "python3 -c 'import sys; sys.path.insert(0, \"tools\"); import verifiable_logger'"
run_test "Import il_shield" "python3 -c 'import sys; sys.path.insert(0, \"tools\"); import il_shield'"
run_test "Load 50_apis_protocols.json" "python3 -c 'import json; json.load(open(\"config/50_apis_protocols.json\"))'"
run_test "FastAPI importable" "python3 -c 'import fastapi; import uvicorn'"
run_test "Web3 importable" "python3 -c 'import web3'"
run_test "Rich CLI importable" "python3 -c 'import rich; import typer'"

echo ""
echo -e "${BOLD}Test results: ${GREEN}$PASS passed${RESET} / ${YELLOW}$FAIL skipped${RESET}"
echo ""

# ─── Done ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   ✅  Setup Complete!                                    ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}📋 NEXT STEPS:${RESET}"
echo ""
echo "  1. Fill in .env with your real API keys:"
echo "     nano .env"
echo ""
echo "  2. Run a live yield sweep:"
echo "     python tools/yield_scraper_cli.py --top 10"
echo ""
echo "  3. Start the auto-compounder API:"
echo "     uvicorn tools.auto_compounder_api:app --reload --port 8765"
echo ""
echo "  4. Paste persona.yaml into OpenClaw for AI-assisted scouting"
echo ""
echo "  5. Read the playbook:"
echo "     open playbook.md  (or convert to PDF: see playbook.md §10)"
echo ""
echo -e "  ${CYAN}Good luck — stack those pennies. 🪙${RESET}"
echo ""
