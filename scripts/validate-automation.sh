#!/bin/bash
# Quick validation script for new automation workflows

set -e

echo "🔍 Validating Secret Persistence & Label Automation..."
echo ""

# Check YAML syntax
echo "1️⃣ Checking YAML syntax..."
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/secret-persistence-guard.yml'))" && \
  echo "  ✅ secret-persistence-guard.yml is valid"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/stuck-label-automation.yml'))" && \
  echo "  ✅ stuck-label-automation.yml is valid"
python3 -c "import yaml; yaml.safe_load(open('.github/labels.yml'))" && \
  echo "  ✅ labels.yml is valid"

echo ""
echo "2️⃣ Checking workflow structure..."

# Check secret-persistence-guard has required jobs
if grep -q "protect-critical-secrets:" .github/workflows/secret-persistence-guard.yml && \
   grep -q "monitor-secret-health:" .github/workflows/secret-persistence-guard.yml && \
   grep -q "auto-recover:" .github/workflows/secret-persistence-guard.yml && \
   grep -q "escalate:" .github/workflows/secret-persistence-guard.yml; then
  echo "  ✅ Secret Persistence Guard: All 4 jobs present"
else
  echo "  ❌ Secret Persistence Guard: Missing required jobs"
  exit 1
fi

# Check stuck-label-automation has required jobs
if grep -q "detect-stuck:" .github/workflows/stuck-label-automation.yml && \
   grep -q "auto-progress:" .github/workflows/stuck-label-automation.yml && \
   grep -q "report:" .github/workflows/stuck-label-automation.yml; then
  echo "  ✅ Stuck Label Automation: All 3 jobs present"
else
  echo "  ❌ Stuck Label Automation: Missing required jobs"
  exit 1
fi

echo ""
echo "3️⃣ Checking protected secrets list..."

PROTECTED_COUNT=$(grep -A 10 "PROTECTED_SECRETS=(" .github/workflows/secret-persistence-guard.yml | grep '"' | wc -l)
if [ "$PROTECTED_COUNT" -ge 4 ]; then
  echo "  ✅ Found $PROTECTED_COUNT protected secrets"
else
  echo "  ⚠️ Only $PROTECTED_COUNT protected secrets (expected at least 4)"
fi

echo ""
echo "4️⃣ Checking stuck label patterns..."

if grep -q "triage:in-progress" .github/workflows/stuck-label-automation.yml && \
   grep -q "wr:in-progress" .github/workflows/stuck-label-automation.yml && \
   grep -q "credentials-missing" .github/workflows/stuck-label-automation.yml && \
   grep -q "openrouter:instantiating" .github/workflows/stuck-label-automation.yml && \
   grep -q "awaiting-approval" .github/workflows/stuck-label-automation.yml && \
   grep -q "blocked" .github/workflows/stuck-label-automation.yml; then
  echo "  ✅ All 6 stuck label patterns configured"
else
  echo "  ❌ Missing some stuck label patterns"
  exit 1
fi

echo ""
echo "5️⃣ Checking new labels..."

if grep -q "auto-error" .github/labels.yml && \
   grep -q "needs-fix" .github/labels.yml && \
   grep -q "goap-escalation" .github/labels.yml && \
   grep -q "credentials-missing" .github/labels.yml && \
   grep -q "credentials-ready" .github/labels.yml && \
   grep -q "ready-to-implement" .github/labels.yml; then
  echo "  ✅ All new labels present in labels.yml"
else
  echo "  ⚠️ Some new labels may be missing"
fi

echo ""
echo "6️⃣ Checking documentation..."

if [ -f "docs/SECRET_PERSISTENCE_AND_LABEL_AUTOMATION.md" ]; then
  echo "  ✅ Main documentation exists"
else
  echo "  ❌ Main documentation missing"
  exit 1
fi

if grep -q "Secret Persistence Guard" docs/SECRETS_MANAGEMENT.md; then
  echo "  ✅ SECRETS_MANAGEMENT.md updated with reference"
else
  echo "  ⚠️ SECRETS_MANAGEMENT.md may need update"
fi

echo ""
echo "7️⃣ Checking schedule configurations..."

if grep -q 'cron: "0 \* \* \* \*"' .github/workflows/secret-persistence-guard.yml; then
  echo "  ✅ Secret monitoring runs hourly"
else
  echo "  ⚠️ Secret monitoring schedule may be misconfigured"
fi

if grep -q 'cron: "0 \*/6 \* \* \*"' .github/workflows/stuck-label-automation.yml; then
  echo "  ✅ Label automation runs every 6 hours"
else
  echo "  ⚠️ Label automation schedule may be misconfigured"
fi

echo ""
echo "✅ All validations passed!"
echo ""
echo "Next steps:"
echo "  1. Push to GitHub"
echo "  2. Verify workflows appear in Actions tab"
echo "  3. Test manually: gh workflow run secret-persistence-guard.yml"
echo "  4. Test manually: gh workflow run stuck-label-automation.yml -f dry_run=true"
echo "  5. Monitor first automated runs"
echo ""
