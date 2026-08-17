#!/bin/bash
# ============================================================
# REVVEL REPO BOOTSTRAP SCRIPT
# ============================================================
# Applies ALL Revvel standards to a new or existing repository
# in one shot. Run this from the root of your app repo.
#
# Usage:
#   bash <(curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/bootstrap-repo.sh) \
#     --app-name growlingeyes \
#     --droplet-ip 164.90.148.7 \
#     --app-dir growlingeyes \
#     --domain growlingeyes.com
#
# Or with a local clone of revvel-standards:
#   bash /path/to/revvel-standards/scripts/bootstrap-repo.sh \
#     --app-name myapp \
#     --droplet-ip 1.2.3.4 \
#     --app-dir myapp \
#     --domain myapp.com
# ============================================================

set -e

STANDARDS_REPO="https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main"
APP_NAME=""
DROPLET_IP=""
APP_DIR=""
APP_DOMAIN=""

# ─── Argument Parsing ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name) APP_NAME="$2"; shift 2 ;;
    --droplet-ip) DROPLET_IP="$2"; shift 2 ;;
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --domain) APP_DOMAIN="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [ -z "$APP_NAME" ] || [ -z "$DROPLET_IP" ] || [ -z "$APP_DIR" ]; then
  echo "Usage: bootstrap-repo.sh --app-name <name> --droplet-ip <ip> --app-dir <dir> [--domain <domain>]"
  echo "Example: bootstrap-repo.sh --app-name growlingeyes --droplet-ip 164.90.148.7 --app-dir growlingeyes --domain growlingeyes.com"
  exit 1
fi

# Default domain if not provided
if [ -z "$APP_DOMAIN" ]; then
  APP_DOMAIN="https://$APP_NAME.com"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        REVVEL REPO BOOTSTRAP v1.0.0                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  App Name:   $APP_NAME"
echo "  Droplet IP: $DROPLET_IP"
echo "  App Dir:    /var/www/$APP_DIR"
echo "  Domain:     $APP_DOMAIN"
echo ""

# ─── Step 1: Required Files ───────────────────────────────
echo "📁 Step 1: Ensuring required directory structure..."

mkdir -p .github/workflows
mkdir -p docs/adr
mkdir -p docs/runbooks
mkdir -p docs/specs
mkdir -p docs/api
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p "tests/e2e"
mkdir -p tests/mocks

echo "  ✅ Directory structure created"

# ─── Step 2: AGENTS.md ────────────────────────────────────
echo ""
echo "🤖 Step 2: Downloading AGENTS.md (universal AI agent instructions)..."

if [ ! -f "AGENTS.md" ]; then
  curl -sL "$STANDARDS_REPO/docs/AGENTS.md" > AGENTS.md
  echo "  ✅ AGENTS.md created"
else
  echo "  ⏭️  AGENTS.md already exists, skipping"
fi

# Create symlinks for AI agent tools
ln -sf AGENTS.md CLAUDE.md 2>/dev/null || true
ln -sf AGENTS.md .cursorrules 2>/dev/null || true
ln -sf AGENTS.md .windsurfrules 2>/dev/null || true
ln -sf AGENTS.md .clinerules 2>/dev/null || true
mkdir -p .github
ln -sf ../AGENTS.md .github/copilot-instructions.md 2>/dev/null || true
echo "  ✅ AI agent symlinks created (CLAUDE.md, .cursorrules, .windsurfrules, .clinerules)"

# ─── Step 3: CI/CD Pipeline ───────────────────────────────
echo ""
echo "⚙️  Step 3: Setting up CI/CD pipeline..."

if [ ! -f ".github/workflows/deploy.yml" ]; then
  curl -sL "$STANDARDS_REPO/templates/cicd/deploy.yml" > .github/workflows/deploy.yml
  # Substitute placeholders
  sed -i.bak "s/YOUR_APP_NAME/$APP_NAME/g" .github/workflows/deploy.yml
  sed -i.bak "s/YOUR_DROPLET_IP/$DROPLET_IP/g" .github/workflows/deploy.yml
  sed -i.bak "s/YOUR_APP_DIR/$APP_DIR/g" .github/workflows/deploy.yml
  sed -i.bak "s|YOUR_DOMAIN|$APP_DOMAIN|g" .github/workflows/deploy.yml
  rm -f .github/workflows/deploy.yml.bak
  echo "  ✅ .github/workflows/deploy.yml created (with DeployBot tracking)"
else
  echo "  ⏭️  deploy.yml already exists, skipping"
fi

if [ ! -f ".github/workflows/compliance-check.yml" ]; then
  curl -sL "$STANDARDS_REPO/templates/cicd/compliance-check.yml" > .github/workflows/compliance-check.yml
  echo "  ✅ .github/workflows/compliance-check.yml created"
else
  echo "  ⏭️  compliance-check.yml already exists, skipping"
fi

if [ ! -f ".github/workflows/syntax-check.yml" ]; then
  curl -sL "$STANDARDS_REPO/templates/cicd/syntax-check.yml" > .github/workflows/syntax-check.yml
  echo "  ✅ .github/workflows/syntax-check.yml created"
else
  echo "  ⏭️  syntax-check.yml already exists, skipping"
fi

# ─── Step 4: Vitest Config ────────────────────────────────
echo ""
echo "🧪 Step 4: Setting up test configuration..."

if [ ! -f "vitest.config.ts" ]; then
  curl -sL "$STANDARDS_REPO/templates/cicd/vitest.config.ts" > vitest.config.ts
  echo "  ✅ vitest.config.ts created with coverage thresholds"
else
  echo "  ⏭️  vitest.config.ts already exists, skipping"
fi

if [ ! -f "playwright.config.ts" ]; then
  curl -sL "$STANDARDS_REPO/templates/cicd/playwright.config.ts" > playwright.config.ts
  echo "  ✅ playwright.config.ts created"
else
  echo "  ⏭️  playwright.config.ts already exists, skipping"
fi

# Create mock setup file
if [ ! -f "tests/mocks/setup.ts" ]; then
  cat > tests/mocks/setup.ts << 'EOF'
// tests/mocks/setup.ts
// MSW (Mock Service Worker) global test setup
// See: https://mswjs.io/docs/getting-started

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
EOF
  echo "  ✅ tests/mocks/setup.ts created"
fi

if [ ! -f "tests/mocks/handlers.ts" ]; then
  cat > tests/mocks/handlers.ts << 'EOF'
// tests/mocks/handlers.ts
// Add MSW request handlers here to mock external API calls in tests
// See: https://mswjs.io/docs/concepts/request-handler

import { http, HttpResponse } from 'msw';

export const handlers = [
  // Example:
  // http.get('/api/user', () => {
  //   return HttpResponse.json({ id: '1', name: 'Test User' });
  // }),
];
EOF
  echo "  ✅ tests/mocks/handlers.ts created"
fi

# ─── Step 5: Pre-commit Hooks ─────────────────────────────
echo ""
echo "🔒 Step 5: Setting up pre-commit hooks (Husky + lint-staged)..."

if command -v npm &>/dev/null && [ -f "package.json" ]; then
  if ! grep -q '"husky"' package.json 2>/dev/null; then
    npm install --save-dev husky lint-staged 2>/dev/null
    npx husky init 2>/dev/null || true
    # Pre-commit hook — runs lint-staged AND TypeScript check
    cat > .husky/pre-commit << 'EOF'
#!/bin/sh
# Revvel pre-commit hook: lint-staged + TypeScript syntax check
npx lint-staged
# TypeScript check (runs only if tsconfig.json exists)
if [ -f "tsconfig.json" ]; then
  npx tsc --noEmit --skipLibCheck
fi
EOF
    chmod +x .husky/pre-commit
    echo "  ✅ Husky pre-commit hook installed (lint-staged + tsc)"
  else
    echo "  ⏭️  Husky already configured, skipping"
  fi
else
  echo "  ⚠️  No package.json found — skipping Husky setup. Run manually after init."
fi

# ─── Step 5b: Native pre-commit hook (git/hooks) ──────────
echo ""
echo "🔒 Step 5b: Installing native git pre-commit hook..."

if [ ! -f ".git/hooks/pre-commit" ]; then
  mkdir -p .git/hooks
  curl -sL "$STANDARDS_REPO/templates/hooks/pre-commit" > .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "  ✅ Native git pre-commit hook installed"
else
  echo "  ⏭️  .git/hooks/pre-commit already exists, skipping"
fi

# ─── Step 5c: pre-commit framework config ─────────────────
echo ""
echo "🔒 Step 5c: Setting up .pre-commit-config.yaml..."

if [ ! -f ".pre-commit-config.yaml" ]; then
  curl -sL "$STANDARDS_REPO/templates/hooks/.pre-commit-config.yaml" > .pre-commit-config.yaml
  echo "  ✅ .pre-commit-config.yaml created"
  if command -v pre-commit &>/dev/null; then
    pre-commit install 2>/dev/null || true
    echo "  ✅ pre-commit framework installed"
  else
    echo "  ℹ️  pre-commit framework not found. Install with: pip install pre-commit && pre-commit install"
  fi
else
  echo "  ⏭️  .pre-commit-config.yaml already exists, skipping"
fi

# ─── Step 6: .env.example ─────────────────────────────────
echo ""
echo "🔑 Step 6: Creating .env.example..."

if [ ! -f ".env.example" ]; then
  cat > .env.example << 'EOF'
# ── App ───────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# ── Authentication ────────────────────────────────────────
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
# OR for custom JWT:
# JWT_SECRET=your-32-character-secret-here
# SESSION_SECRET=your-32-character-session-secret

# ── Payments ──────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Add app-specific variables below ──────────────────────
EOF
  echo "  ✅ .env.example created"
else
  echo "  ⏭️  .env.example already exists, skipping"
fi

# ─── Step 7: CHANGELOG.md ─────────────────────────────────
echo ""
echo "📋 Step 7: Creating CHANGELOG.md..."

if [ ! -f "CHANGELOG.md" ]; then
  TODAY=$(date +%Y-%m-%d)
  cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.1.0] — $TODAY

### Added
- Initial project bootstrap via Revvel standards bootstrap script
EOF
  echo "  ✅ CHANGELOG.md created"
else
  echo "  ⏭️  CHANGELOG.md already exists, skipping"
fi

# ─── Step 8: .gitignore ───────────────────────────────────
echo ""
echo "🚫 Step 8: Checking .gitignore..."

GITIGNORE_ENTRIES=("node_modules" ".env" "dist" ".next" "build" "coverage" "*.local" ".DS_Store" "*.log")
GITIGNORE_MISSING=()

for entry in "${GITIGNORE_ENTRIES[@]}"; do
  if [ ! -f ".gitignore" ] || ! grep -q "$entry" .gitignore 2>/dev/null; then
    GITIGNORE_MISSING+=("$entry")
  fi
done

if [ ${#GITIGNORE_MISSING[@]} -gt 0 ]; then
  printf '%s\n' "${GITIGNORE_MISSING[@]}" >> .gitignore
  echo "  ✅ Added missing entries to .gitignore: ${GITIGNORE_MISSING[*]}"
else
  echo "  ✅ .gitignore already has all required entries"
fi

# ─── Step 9: ADR Template ─────────────────────────────────
echo ""
echo "📝 Step 9: Creating ADR template..."

if [ ! -f "docs/adr/README.md" ]; then
  cat > docs/adr/README.md << 'EOF'
# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for this project.

ADRs document *why* key technical decisions were made, not just *what* was decided.

## Creating a New ADR

Copy `template.md` and name it: `ADR-NNNN-short-title.md`

Example: `ADR-0001-use-postgresql.md`

## Index

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](./ADR-0001-example.md) | Example: Why we chose PostgreSQL | Accepted | YYYY-MM-DD |
EOF

  cat > docs/adr/template.md << 'EOF'
# ADR-NNNN: [Short Title]

**Date:** YYYY-MM-DD  
**Status:** Draft | Proposed | Accepted | Deprecated | Superseded by ADR-XXXX  
**Deciders:** [Names or agent IDs involved in the decision]

---

## Context

[What situation or problem forced this decision? What constraints existed?]

## Decision

[What was decided? Be direct and specific.]

## Consequences

**Positive:**
- [What good outcomes result from this decision?]

**Negative / Trade-offs:**
- [What do we give up or accept as a result?]

**Risks:**
- [What could go wrong?]

## Alternatives Considered

| Option | Why Rejected |
|---|---|
| [Alternative 1] | [Reason] |
| [Alternative 2] | [Reason] |
EOF
  echo "  ✅ docs/adr/README.md and template.md created"
else
  echo "  ⏭️  docs/adr/ already initialized, skipping"
fi

# ─── Step 10: Branch Protection ───────────────────────────
echo ""
echo "🔐 Step 10: Branch protection setup..."
echo "  ℹ️  Run this command to apply branch protection to the main branch:"
echo ""
echo "  gh api repos/midnghtsapphire/$APP_NAME/branches/main/protection \\"
echo "    --method PUT \\"
echo "    --input /path/to/revvel-standards/templates/cicd/branch-protection.json"
echo ""
echo "  Or download and apply the JSON directly:"
echo "  curl -sL $STANDARDS_REPO/templates/cicd/branch-protection.json | \\"
echo "    gh api repos/midnghtsapphire/$APP_NAME/branches/main/protection --method PUT --input -"

# ─── Step 11: Run Compliance Check ────────────────────────
echo ""
echo "📊 Step 11: Running compliance check..."
echo ""

if command -v node &>/dev/null; then
  curl -sL "$STANDARDS_REPO/scripts/check-compliance.js" | node - . || true
else
  echo "  ⚠️  Node.js not found — skipping compliance check"
fi

# ─── Done ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Bootstrap complete for: $APP_NAME"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "NEXT STEPS:"
echo "  1. Add secrets to GitHub: gh secret set SSH_PRIVATE_KEY --repo midnghtsapphire/$APP_NAME < ~/.ssh/deploy_key"
echo "  2. Apply branch protection: see Step 10 output above"
echo "  3. Install dependencies and run tests: pnpm install && npx vitest run"
echo "  4. Ensure deploybot-app is installed on the org (one-time only):"
echo "     https://github.com/apps/deploybot-app → Install → midnghtsapphire (All repositories)"
echo "  5. Commit the bootstrap files: git add . && git commit -m 'chore: apply Revvel standards bootstrap'"
echo "  6. Push to trigger first CI run: git push origin main"
echo ""
