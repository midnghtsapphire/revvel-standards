#!/bin/bash
# Workflow Concurrency Audit Script
#
# Identifies workflows without concurrency controls and recommends fixes

set -euo pipefail

WORKFLOWS_DIR=".github/workflows"
OUTPUT_FILE="docs/WORKFLOW_CONCURRENCY_AUDIT.md"

echo "🔍 Auditing workflow concurrency controls..."
echo ""

# Create report header
cat > "$OUTPUT_FILE" << EOF
# Workflow Concurrency Audit

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Purpose:** Identify workflows missing concurrency controls to prevent workflow stampedes

---

## Summary

EOF

# Count workflows
TOTAL_WORKFLOWS=$(find "$WORKFLOWS_DIR" -name "*.yml" -o -name "*.yaml" | wc -l)
WITH_CONCURRENCY=$(grep -l "^concurrency:" "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l || echo 0)
WITHOUT_CONCURRENCY=$((TOTAL_WORKFLOWS - WITH_CONCURRENCY))

cat >> "$OUTPUT_FILE" << EOF
- **Total workflows:** $TOTAL_WORKFLOWS
- **With concurrency control:** $WITH_CONCURRENCY
- **Missing concurrency control:** $WITHOUT_CONCURRENCY
- **Coverage:** $((WITH_CONCURRENCY * 100 / TOTAL_WORKFLOWS))%

---

## Workflows WITHOUT Concurrency Control

EOF

# List workflows without concurrency
echo "Workflows missing concurrency controls:"
echo ""

MISSING=()
for workflow in "$WORKFLOWS_DIR"/*.yml; do
  if ! grep -q "^concurrency:" "$workflow"; then
    MISSING+=("$(basename "$workflow")")
    
    # Get workflow name from file
    WORKFLOW_NAME=$(grep "^name:" "$workflow" | head -1 | sed 's/name: *//' | tr -d '"' || echo "Unknown")
    
    # Get triggers
    TRIGGERS=$(awk '/^on:/{flag=1; next} /^[a-z]/{flag=0} flag && /^  [a-z]/' "$workflow" | sed 's/^  //' | sed 's/:.*$//' | tr '\n' ', ' | sed 's/,$//')
    
    # Determine if PR-triggered
    IS_PR_TRIGGERED="No"
    if echo "$TRIGGERS" | grep -qE "pull_request|pull_request_target|pull_request_review"; then
      IS_PR_TRIGGERED="Yes"
    fi
    
    # Determine priority
    PRIORITY="P2"
    if echo "$TRIGGERS" | grep -qE "pull_request|issues"; then
      if echo "$WORKFLOW_NAME" | grep -qiE "security|credential|secret|compliance|review.*status"; then
        PRIORITY="P0"
      elif echo "$WORKFLOW_NAME" | grep -qiE "review|ai|label|triage"; then
        PRIORITY="P1"
      fi
    fi
    
    echo "  ❌ $(basename "$workflow")"
    echo "     Name: $WORKFLOW_NAME"
    echo "     Triggers: $TRIGGERS"
    echo "     PR-triggered: $IS_PR_TRIGGERED"
    echo "     Recommended Priority: $PRIORITY"
    echo ""
    
    cat >> "$OUTPUT_FILE" << EOF
### \`$(basename "$workflow")\`

**Name:** $WORKFLOW_NAME  
**Triggers:** $TRIGGERS  
**PR-triggered:** $IS_PR_TRIGGERED  
**Recommended Priority:** $PRIORITY

**Recommended Fix:**
\`\`\`yaml
concurrency:
  group: \${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
\`\`\`

---

EOF
  fi
done

# Add workflows WITH concurrency
cat >> "$OUTPUT_FILE" << 'EOF'

## Workflows WITH Concurrency Control ✅

EOF

for workflow in "$WORKFLOWS_DIR"/*.yml; do
  if grep -q "^concurrency:" "$workflow"; then
    WORKFLOW_NAME=$(grep "^name:" "$workflow" | head -1 | sed 's/name: *//' | tr -d '"' || echo "Unknown")
    CONCURRENCY_GROUP=$(grep -A1 "^concurrency:" "$workflow" | grep "group:" | sed 's/.*group: *//' || echo "N/A")
    CANCEL_IN_PROGRESS=$(grep -A2 "^concurrency:" "$workflow" | grep "cancel-in-progress:" | sed 's/.*cancel-in-progress: *//' || echo "N/A")
    
    cat >> "$OUTPUT_FILE" << EOF
### \`$(basename "$workflow")\`

**Name:** $WORKFLOW_NAME  
**Concurrency Group:** \`$CONCURRENCY_GROUP\`  
**Cancel in Progress:** $CANCEL_IN_PROGRESS

---

EOF
  fi
done

# Add recommendations
cat >> "$OUTPUT_FILE" << 'EOF'

## Recommendations

### 1. Add Concurrency to PR-Triggered Workflows (High Priority)

All workflows triggered by PR events should have concurrency controls to prevent:
- Multiple runs for the same PR (e.g., rapid commits)
- Resource exhaustion
- API rate limiting

**Standard pattern for PR workflows:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### 2. Priority-Based Concurrency Strategy

#### P0 Workflows (Critical - Must Complete)
- **cancel-in-progress: false** (let existing run finish)
- Security checks, credential validation, compliance
- Examples: `credential-gatekeeper.yml`, `secret-persistence-guard.yml`

#### P1 Workflows (Important - Can Cancel)
- **cancel-in-progress: true** (cancel old, run new)
- AI reviews, label management, triage
- Examples: `ai-pr-review-openrouter.yml`, `bito-ai.yml`

#### P2 Workflows (Optional - Async)
- **cancel-in-progress: true** (always use latest)
- Analytics, reporting, monitoring
- Examples: `amplitude-events.yml`, `panda-ops.yml`

### 3. Scheduled Workflows

For cron-triggered workflows:
```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: false  # let runs complete
```

### 4. Singleton Workflows

For workflows that should only have one instance running at a time:
```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: true  # ensure only latest runs
```

---

## Implementation Plan

1. **Phase 1 (Week 1):** Add concurrency to all PR-triggered workflows
2. **Phase 2 (Week 2):** Add concurrency to scheduled workflows
3. **Phase 3 (Week 3):** Review and optimize concurrency groups
4. **Phase 4 (Week 4):** Monitor and adjust based on metrics

---

**Generated by:** `scripts/audit-workflow-concurrency.sh`  
**Report Location:** `docs/WORKFLOW_CONCURRENCY_AUDIT.md`
EOF

echo "✅ Audit complete!"
echo "📄 Report saved to: $OUTPUT_FILE"
echo ""
echo "Summary:"
echo "  Total workflows: $TOTAL_WORKFLOWS"
echo "  With concurrency: $WITH_CONCURRENCY"
echo "  Missing concurrency: $WITHOUT_CONCURRENCY"
echo "  Coverage: $((WITH_CONCURRENCY * 100 / TOTAL_WORKFLOWS))%"
