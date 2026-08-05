#!/bin/bash
# Bootstrap a new Revvel project from the revvel-standards templates
# Usage: ./scripts/bootstrap-new-project.sh <app_name> <droplet_ip> <production_url>
# Example: ./scripts/bootstrap-new-project.sh neurooz 164.90.148.7 neurooz.com
#
# This script must be run from the ROOT of the NEW APP REPO (not from revvel-standards).
# It reads templates from a local clone of revvel-standards.
#
# Prerequisites:
#   - Revvel standards repo cloned at ../revvel-standards (or set REVVEL_STANDARDS_PATH)
#   - Script will warn and attempt a fast-forward update if the clone is behind origin/main
#   - bash 4+
#   - sed

set -euo pipefail

# -------------------------------------------------------------------------
# Arguments
# -------------------------------------------------------------------------
APP_NAME="${1:-}"
DROPLET_IP="${2:-}"
PRODUCTION_URL="${3:-}"

if [ -z "$APP_NAME" ] || [ -z "$DROPLET_IP" ] || [ -z "$PRODUCTION_URL" ]; then
  echo "Usage: $0 <app_name> <droplet_ip> <production_url>"
  echo "Example: $0 neurooz 164.90.148.7 neurooz.com"
  exit 1
fi

# -------------------------------------------------------------------------
# Paths
# -------------------------------------------------------------------------
REVVEL_STANDARDS_PATH="${REVVEL_STANDARDS_PATH:-$(dirname "$0")/..}"
TEMPLATES_DIR="$REVVEL_STANDARDS_PATH/templates"
DEST_DIR="$(pwd)"

echo "======================================"
echo "  Revvel Bootstrap — $APP_NAME"
echo "======================================"
echo "  App name:       $APP_NAME"
echo "  Droplet IP:     $DROPLET_IP"
echo "  Production URL: $PRODUCTION_URL"
echo "  Source:         $TEMPLATES_DIR"
echo "  Destination:    $DEST_DIR"
echo ""

# -------------------------------------------------------------------------
# Step 0: Verify Revvel standards clone freshness (if it is a git repo)
# -------------------------------------------------------------------------
# Guard: git available, standards path set, repo is a git clone, templates dir exists
if command -v git &>/dev/null && [ -n "$REVVEL_STANDARDS_PATH" ] && [ -d "$REVVEL_STANDARDS_PATH/.git" ] && [ -d "$TEMPLATES_DIR" ]; then
  echo "🔍 Checking Revvel standards for updates..."

  if git -C "$REVVEL_STANDARDS_PATH" remote get-url origin >/dev/null 2>&1; then
    if git -C "$REVVEL_STANDARDS_PATH" fetch --quiet origin main; then
      if git -C "$REVVEL_STANDARDS_PATH" show-ref --verify --quiet refs/remotes/origin/main; then
        BEHIND_COUNT=$(git -C "$REVVEL_STANDARDS_PATH" rev-list --count HEAD..origin/main)
        AHEAD_COUNT=$(git -C "$REVVEL_STANDARDS_PATH" rev-list --count origin/main..HEAD)

        if [ "$BEHIND_COUNT" -gt 0 ] && [ "$AHEAD_COUNT" -gt 0 ]; then
          echo "  ⚠️  Revvel standards has diverged from origin/main."
          echo "     Ahead: ${AHEAD_COUNT} commits, Behind: ${BEHIND_COUNT} commits."
          echo "     Resolve manually: git -C \"$REVVEL_STANDARDS_PATH\" pull --rebase"
        elif [ "$BEHIND_COUNT" -gt 0 ]; then
          echo "  ⚠️  Revvel standards is ${BEHIND_COUNT} commits behind origin/main."

          if [ -z "$(git -C "$REVVEL_STANDARDS_PATH" status --porcelain)" ]; then
            echo "  ⬆️  Fast-forwarding to latest standards..."
            if git -C "$REVVEL_STANDARDS_PATH" merge --ff-only origin/main; then
              echo "  ✅ Revvel standards updated."
            else
              echo "  ⚠️  Fast-forward failed — please update manually:"
              echo "     git -C \"$REVVEL_STANDARDS_PATH\" pull --ff-only"
            fi
          else
            echo "  ⚠️  Local changes detected — skipping auto-update."
            echo "     Run: git -C \"$REVVEL_STANDARDS_PATH\" pull --ff-only"
          fi
        elif [ "$AHEAD_COUNT" -gt 0 ]; then
          echo "  ℹ️  Revvel standards is ahead of origin/main by ${AHEAD_COUNT} commits."
        else
          echo "  ✅ Revvel standards is up to date."
        fi
      else
        echo "  ⚠️  origin/main not found — using local templates."
      fi
    else
      echo "  ⚠️  Unable to fetch origin/main — using local templates."
    fi
  else
    echo "  ⚠️  No git remote configured — using local templates."
  fi

  echo ""
fi

# -------------------------------------------------------------------------
# Helper: copy + substitute
# Cross-platform sed: BSD (macOS) requires a backup extension with -i,
# GNU (Linux) accepts -i ''. Use -i.bak and clean up to support both.
# -------------------------------------------------------------------------
copy_and_substitute() {
  local src="$1"
  local dest="$2"

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"

  # Substitute all template markers (cross-platform: works on macOS and Linux)
  sed -i.bak \
    -e "s/\[APP_NAME\]/$APP_NAME/g" \
    -e "s/\[DROPLET_IP\]/$DROPLET_IP/g" \
    -e "s/\[PRODUCTION_URL\]/$PRODUCTION_URL/g" \
    "$dest"
  rm -f "${dest}.bak"

  echo "  ✅ $dest"
}

# -------------------------------------------------------------------------
# Step 1: Create standards/ folder with all three template files
# -------------------------------------------------------------------------
echo "📋 Step 1: Creating standards/ folder..."
copy_and_substitute "$TEMPLATES_DIR/standards/01_SYSTEM_STATE.md" "SYSTEM_STATE.md"
copy_and_substitute "$TEMPLATES_DIR/standards/03_CONTEXT_PRIMER.md" "CONTEXT_PRIMER.md"
# MVI Contract template goes to docs/ (session reference, not committed to repo)
mkdir -p docs
copy_and_substitute "$TEMPLATES_DIR/standards/02_MVI_CONTRACT_TEMPLATE.md" "docs/MVI_CONTRACT_TEMPLATE.md"
echo ""

# -------------------------------------------------------------------------
# Step 2: Create .github/workflows/ with all CI/CD workflow files
# -------------------------------------------------------------------------
echo "🔧 Step 2: Creating .github/workflows/..."
mkdir -p .github/workflows

copy_and_substitute "$TEMPLATES_DIR/cicd/ci.yml"             ".github/workflows/ci.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/auto-fix.yml"       ".github/workflows/auto-fix.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/security.yml"       ".github/workflows/security.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/deploy.yml"         ".github/workflows/deploy.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/syntax-check.yml"   ".github/workflows/syntax-check.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/deploy-android.yml" ".github/workflows/deploy-android.yml"
copy_and_substitute "$TEMPLATES_DIR/cicd/deploy-ios.yml"     ".github/workflows/deploy-ios.yml"
echo ""

# -------------------------------------------------------------------------
# Step 3: Create scripts/pwa-audit.sh
# -------------------------------------------------------------------------
echo "📱 Step 3: Creating scripts/pwa-audit.sh..."
mkdir -p scripts
copy_and_substitute "$TEMPLATES_DIR/mobile/pwa-audit.sh" "scripts/pwa-audit.sh"
chmod +x "scripts/pwa-audit.sh"
echo ""

# -------------------------------------------------------------------------
# Step 4: Create docs/ with MOBILE_DEPLOYMENT.md
# -------------------------------------------------------------------------
echo "📚 Step 4: Creating docs/MOBILE_DEPLOYMENT.md..."
copy_and_substitute "$TEMPLATES_DIR/mobile/MOBILE_DEPLOYMENT.md" "docs/MOBILE_DEPLOYMENT.md"
echo ""

# -------------------------------------------------------------------------
# Step 5: Create fastlane/ scaffold
# -------------------------------------------------------------------------
echo "🚀 Step 5: Creating fastlane/ scaffold..."
mkdir -p fastlane
copy_and_substitute "$TEMPLATES_DIR/mobile/fastlane/Fastfile" "fastlane/Fastfile"
copy_and_substitute "$TEMPLATES_DIR/mobile/fastlane/Appfile"  "fastlane/Appfile"
echo ""

# -------------------------------------------------------------------------
# Step 6: Copy testing templates
# -------------------------------------------------------------------------
echo "🧪 Step 6: Creating testing templates..."
mkdir -p tests/unit tests/integration tests/e2e
copy_and_substitute "$TEMPLATES_DIR/testing/field-validation.test.ts" "tests/unit/field-validation.test.ts"
copy_and_substitute "$TEMPLATES_DIR/testing/ui-db-map.test.ts"        "tests/integration/ui-db-map.test.ts"
copy_and_substitute "$TEMPLATES_DIR/testing/panel-data-void.spec.ts"  "tests/e2e/panel-data-void.spec.ts"
echo ""

# -------------------------------------------------------------------------
# Step 7: Copy pre-commit framework config
# -------------------------------------------------------------------------
echo "🔒 Step 7: Creating .pre-commit-config.yaml..."
cp "$TEMPLATES_DIR/hooks/.pre-commit-config.yaml" ".pre-commit-config.yaml"
echo "  ✅ .pre-commit-config.yaml"
echo ""

# -------------------------------------------------------------------------
# Next Steps Checklist
# -------------------------------------------------------------------------
echo "======================================"
echo "  ✅ Bootstrap Complete!"
echo "======================================"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Fill in SYSTEM_STATE.md"
echo "   - Replace all [PLACEHOLDER] values with real system info"
echo ""
echo "2. Fill in CONTEXT_PRIMER.md"
echo "   - Add your tech stack, key files, naming conventions"
echo ""
echo "3. Set up GitHub Secrets"
echo "   - SSH_PRIVATE_KEY (deploy key for $DROPLET_IP)"
echo "   - JWT_SECRET (min 32 chars)"
echo "   - DATABASE_URL, STRIPE_SECRET_KEY, etc."
echo "   See: templates/cicd/README.md for full secret list"
echo ""
echo "4. Update auto-fix.yml"
echo "   - Replace OWNER_USERNAME with your GitHub username"
echo "   - File: .github/workflows/auto-fix.yml"
echo ""
echo "5. Update deploy.yml"
echo "   - Verify APP_DIR and APP_NAME are correct"
echo "   - File: .github/workflows/deploy.yml"
echo ""
echo "6. Create GitHub Labels"
echo "   - Run label setup commands from docs/GITHUB_PROJECTS_SETUP.md"
echo "   - Don't forget the \${APP_NAME}/error label"
echo ""
echo "7. Run PWA audit"
echo "   - bash scripts/pwa-audit.sh"
echo ""
echo "8. Fill in fastlane/Appfile when developer accounts are ready"
echo "   - See: docs/MOBILE_DEPLOYMENT.md"
echo ""
echo "9. Brand setup"
echo "   - Fill in templates/brand/BRAND_IDENTITY_TEMPLATE.md"
echo "   - See: templates/brand/REVVEL_EMBLEM_STANDARD.md"
echo ""
echo "10. Set up MCP servers"
echo "    - Copy the right .mcp.json for your project type:"
echo "      cp $REVVEL_STANDARDS_PATH/templates/mcp/mcp.web.json .mcp.json"
echo "    - Merge custom Revvel servers:"
echo "      # Add entries from $REVVEL_STANDARDS_PATH/templates/mcp/mcp.revvel-custom.json"
echo "    - Copy env var template:"
echo "      cp $REVVEL_STANDARDS_PATH/templates/mcp/.env.mcp.example .env.mcp.example"
echo "    - Clone and build code-review-mcp-server (required):"
echo "      git clone https://github.com/midnghtsapphire/code-review-mcp-server ~/mct/code-review"
echo "      cd ~/mct/code-review && npm install && npm run build"
echo "    - Set CODE_REVIEW_MCP_PATH=~/mct/code-review in .env"
echo "    - See: $REVVEL_STANDARDS_PATH/MCP_STANDARD.md"
echo ""
echo "Good luck! 🚀"
