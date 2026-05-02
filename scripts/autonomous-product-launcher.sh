#!/usr/bin/env bash
# autonomous-product-launcher.sh — Launch a new product using the 30-day autonomous framework
#
# This script orchestrates the entire 30-day product launch pipeline based on
# docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md
#
# Usage:
#   ./scripts/autonomous-product-launcher.sh <product-name> [OPTIONS]
#
# Options:
#   --days N              Duration in days (default: 30)
#   --shape SHAPE         Product shape (pdf|app|cli|mcp|api)
#   --auto-research       Run automated research phase
#   --payment PLATFORM    Payment platform (lemonsqueezy|gumroad|stripe)
#   --launch-date DATE    Target launch date (YYYY-MM-DD)
#   --dry-run             Show plan without executing
#
# Examples:
#   ./scripts/autonomous-product-launcher.sh "task-timer-pro" --shape app --days 30
#   ./scripts/autonomous-product-launcher.sh "cpap-guide" --shape pdf --payment gumroad

set -euo pipefail

# ============================================================================
# Configuration & Defaults
# ============================================================================

PRODUCT_NAME=""
DAYS=30
SHAPE="app"
AUTO_RESEARCH=false
PAYMENT_PLATFORM="lemonsqueezy"
LAUNCH_DATE=""
DRY_RUN=false

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$REPO_ROOT/scripts"
BLUEPRINT="$REPO_ROOT/docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md"

# ============================================================================
# Helper Functions
# ============================================================================

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-1}"
}

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "[ERROR] $*" >&2
  exit 1
}

check_dependencies() {
  local deps=(git jq python3 curl)
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
      error "Required dependency '$dep' not found. Please install it first."
    fi
  done
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-'
}

# ============================================================================
# Argument Parsing
# ============================================================================

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage 0
      ;;
    --days)
      DAYS="${2:-}"
      shift 2
      ;;
    --shape)
      SHAPE="${2:-}"
      shift 2
      ;;
    --auto-research)
      AUTO_RESEARCH=true
      shift
      ;;
    --payment)
      PAYMENT_PLATFORM="${2:-}"
      shift 2
      ;;
    --launch-date)
      LAUNCH_DATE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -*)
      error "Unknown flag: $1"
      ;;
    *)
      if [ -z "$PRODUCT_NAME" ]; then
        PRODUCT_NAME="$1"
      else
        error "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

# ============================================================================
# Validation
# ============================================================================

if [ -z "$PRODUCT_NAME" ]; then
  error "Product name is required"
fi

if ! [[ "$DAYS" =~ ^[0-9]+$ ]] || [ "$DAYS" -lt 7 ] || [ "$DAYS" -gt 90 ]; then
  error "Days must be between 7 and 90"
fi

case "$SHAPE" in
  pdf|app|cli|mcp|api|skill|extension|booklet|excel|token) ;;
  *)
    error "Invalid shape '$SHAPE' (expected: pdf, app, cli, mcp, api, skill, extension, booklet, excel, token)"
    ;;
esac

case "$PAYMENT_PLATFORM" in
  lemonsqueezy|gumroad|stripe) ;;
  *)
    error "Invalid payment platform '$PAYMENT_PLATFORM' (expected: lemonsqueezy, gumroad, stripe)"
    ;;
esac

# ============================================================================
# Setup
# ============================================================================

PRODUCT_SLUG=$(slugify "$PRODUCT_NAME")
PROJECT_DIR="$REPO_ROOT/projects/agent-generated/$PRODUCT_SLUG"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -z "$LAUNCH_DATE" ]; then
  LAUNCH_DATE=$(date -u -d "+${DAYS} days" +%Y-%m-%d)
fi

log "==================================================================="
log "  Autonomous Product Launcher - 30-Day Blueprint"
log "==================================================================="
log ""
log "Product Name:     $PRODUCT_NAME"
log "Product Slug:     $PRODUCT_SLUG"
log "Product Shape:    $SHAPE"
log "Duration:         $DAYS days"
log "Payment Platform: $PAYMENT_PLATFORM"
log "Launch Date:      $LAUNCH_DATE"
log "Project Dir:      $PROJECT_DIR"
log "Dry Run:          $DRY_RUN"
log ""

if [ "$DRY_RUN" = true ]; then
  log "DRY RUN MODE - No changes will be made"
  log ""
fi

# ============================================================================
# Phase 1: Project Initialization
# ============================================================================

log "Phase 1: Initializing project structure..."

if [ -d "$PROJECT_DIR" ]; then
  error "Project directory already exists: $PROJECT_DIR"
fi

if [ "$DRY_RUN" = false ]; then
  # Use existing init-product.sh script
  log "Running: $SCRIPT_DIR/init-product.sh $PRODUCT_SLUG --shape $SHAPE"
  "$SCRIPT_DIR/init-product.sh" "$PRODUCT_SLUG" --shape "$SHAPE"
  
  # Create additional 30-day specific files
  mkdir -p "$PROJECT_DIR/launch"
  mkdir -p "$PROJECT_DIR/metrics"
  mkdir -p "$PROJECT_DIR/automation"
  mkdir -p "$PROJECT_DIR/learnings"
else
  log "[DRY RUN] Would create: $PROJECT_DIR"
fi

# ============================================================================
# Phase 2: Create Launch Plan
# ============================================================================

log "Phase 2: Creating launch plan..."

LAUNCH_PLAN="$PROJECT_DIR/launch/30-day-plan.md"

if [ "$DRY_RUN" = false ]; then
  cat > "$LAUNCH_PLAN" <<EOF
# 30-Day Launch Plan: $PRODUCT_NAME

**Created:** $NOW  
**Launch Date:** $LAUNCH_DATE  
**Shape:** $SHAPE  
**Payment:** $PAYMENT_PLATFORM  

---

## Timeline

### Week 1: Foundation & Validation (Days 1-7)
- [ ] Day 1-2: Problem discovery & validation
- [ ] Day 3-4: MVP specification
- [ ] Day 5-7: Landing page & waitlist setup

### Week 2: Build & Automate (Days 8-14)
- [ ] Day 8-10: MVP development
- [ ] Day 11-12: Payment integration ($PAYMENT_PLATFORM)
- [ ] Day 13-14: Analytics & monitoring

### Week 3: Test & Iterate (Days 15-21)
- [ ] Day 15-17: Closed beta launch
- [ ] Day 18-19: Iterate based on data
- [ ] Day 20-21: Final polish

### Week 4: Launch & Scale (Days 22-30)
- [ ] Day 22-24: Soft launch
- [ ] Day 25-27: Full launch (Product Hunt)
- [ ] Day 28-30: Measure & plan next iteration

---

## Key Metrics

### Week 1 Targets
- 50+ validated pain point mentions
- 30-50 waitlist signups
- Complete spec document

### Week 2 Targets
- Working prototype
- Payment integration tested
- Metrics dashboard live

### Week 3 Targets
- 10+ active beta users
- 20%+ improvement in key metric
- All systems green

### Week 4 Targets
- 100+ signups
- 25+ paying customers
- \$500+ revenue
- <5% refund rate

---

## Success Criteria

- [ ] Working product deployed
- [ ] Payment processing live
- [ ] Analytics tracking all events
- [ ] First paying customer by Day 22
- [ ] \$1,000+ revenue or pivot decision by Day 30

---

## Resources

- Blueprint: [\`docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md\`](../../docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md)
- Project folder: \`projects/agent-generated/$PRODUCT_SLUG/\`
- Research: \`research/\`
- Build: \`build/\`
- Metrics: \`metrics/\`

---

*Generated by autonomous-product-launcher.sh on $NOW*
EOF
  log "Created: $LAUNCH_PLAN"
else
  log "[DRY RUN] Would create: $LAUNCH_PLAN"
fi

# ============================================================================
# Phase 3: Setup Metrics Tracking
# ============================================================================

log "Phase 3: Setting up metrics tracking..."

METRICS_CONFIG="$PROJECT_DIR/metrics/config.json"

if [ "$DRY_RUN" = false ]; then
  cat > "$METRICS_CONFIG" <<EOF
{
  "product_slug": "$PRODUCT_SLUG",
  "product_name": "$PRODUCT_NAME",
  "shape": "$SHAPE",
  "payment_platform": "$PAYMENT_PLATFORM",
  "launch_date": "$LAUNCH_DATE",
  "created_at": "$NOW",
  "metrics": {
    "primary": [
      "signups",
      "conversions",
      "first_sale_time",
      "revenue",
      "active_users"
    ],
    "secondary": [
      "checkout_conversion",
      "refund_rate",
      "retention_7d",
      "retention_30d",
      "cac",
      "ltv"
    ],
    "health": [
      "uptime",
      "error_rate",
      "response_time_p95",
      "support_tickets"
    ]
  },
  "targets": {
    "week1": {
      "pain_point_mentions": 50,
      "waitlist_signups": 30
    },
    "week2": {
      "prototype_ready": true,
      "payment_tested": true
    },
    "week3": {
      "beta_users": 10,
      "improvement_pct": 20
    },
    "week4": {
      "signups": 100,
      "paying_customers": 25,
      "revenue": 500,
      "refund_rate_max": 0.05
    },
    "day30": {
      "revenue_target": 1000
    }
  }
}
EOF
  log "Created: $METRICS_CONFIG"
else
  log "[DRY RUN] Would create: $METRICS_CONFIG"
fi

# ============================================================================
# Phase 4: Automation Setup
# ============================================================================

log "Phase 4: Setting up automation..."

AUTOMATION_README="$PROJECT_DIR/automation/README.md"

if [ "$DRY_RUN" = false ]; then
  cat > "$AUTOMATION_README" <<EOF
# Automation Setup

This directory contains automation scripts and configurations for the 30-day product launch.

## Automated Tasks

### Daily Tasks
- Metrics collection and dashboard update
- Error monitoring and alerts
- Support queue check
- Social media monitoring

### Weekly Tasks
- Progress report generation
- Metrics analysis
- Feedback collection and analysis
- Competitor monitoring

### Event-Driven Tasks
- Payment processing (webhooks)
- User onboarding (email sequences)
- Error alerts (immediate)
- Sales notifications (immediate)

## Tools Used

- **Email:** ConvertKit / Mailerlite
- **Analytics:** Plausible / PostHog
- **Monitoring:** UptimeRobot / Better Stack
- **Alerts:** Slack / Email
- **CI/CD:** GitHub Actions

## Setup Instructions

1. Configure webhook endpoints for payment platform
2. Setup email automation sequences
3. Connect analytics to dashboard
4. Configure alert channels
5. Test all automations end-to-end

## Webhook Endpoints

- \`/webhooks/$PAYMENT_PLATFORM\` - Payment events
- \`/webhooks/analytics\` - Analytics events
- \`/webhooks/support\` - Support events

---

*See also: \`../launch/30-day-plan.md\`*
EOF
  log "Created: $AUTOMATION_README"
else
  log "[DRY RUN] Would create: $AUTOMATION_README"
fi

# ============================================================================
# Phase 5: Research (if enabled)
# ============================================================================

if [ "$AUTO_RESEARCH" = true ]; then
  log "Phase 5: Running automated research..."
  
  RESEARCH_DIR="$PROJECT_DIR/research"
  RESEARCH_BRIEF="$RESEARCH_DIR/brief.md"
  
  if [ "$DRY_RUN" = false ]; then
    cat > "$RESEARCH_BRIEF" <<EOF
# Research Brief: $PRODUCT_NAME

**Status:** TODO - Run automated research
**Created:** $NOW

## Pain Points

TODO: Run Tavily/Perplexity search to identify top pain points

## Competitor Analysis

TODO: Identify top 10 competitors and analyze:
- Pricing
- Features
- Reviews (positive/negative)
- SEO keywords
- Market gaps

## Target Audience

TODO: Define primary audience segments:
- Demographics
- Use cases
- Pain points
- Willingness to pay

## MVP Definition

TODO: Based on research, define:
- Core problem solved
- Minimum feature set
- Differentiation from competitors

## Market Size

TODO: Estimate addressable market:
- Total potential users
- Realistic capture rate
- Revenue potential

---

*Run: \`./scripts/research-automation.sh $PRODUCT_SLUG\` to populate this automatically*
EOF
    log "Created: $RESEARCH_BRIEF (requires manual research or automation)"
  else
    log "[DRY RUN] Would create: $RESEARCH_BRIEF"
  fi
fi

# ============================================================================
# Phase 6: Create Next Steps Guide
# ============================================================================

log "Phase 6: Creating next steps guide..."

NEXT_STEPS="$PROJECT_DIR/NEXT_STEPS.md"

if [ "$DRY_RUN" = false ]; then
  cat > "$NEXT_STEPS" <<EOF
# Next Steps: $PRODUCT_NAME

Your autonomous 30-day product launch has been initialized! 🚀

## Immediate Actions (Today)

1. **Review the launch plan:**
   - Read: \`launch/30-day-plan.md\`
   - Understand the timeline and milestones

2. **Complete research:**
   - Fill out: \`research/brief.md\`
   - Identify pain points, competitors, and market
   - Define MVP feature set

3. **Setup payment platform:**
   - Create $PAYMENT_PLATFORM account
   - Add credentials to Doppler/secrets
   - Test payment flow

4. **Build landing page:**
   - Use Carrd, Webflow, or custom
   - Setup waitlist form
   - Launch pre-signup campaign

## Week 1 Goals

- [ ] 50+ validated pain point mentions
- [ ] Complete MVP specification
- [ ] 30-50 waitlist signups
- [ ] Landing page live

## Key Resources

- **Blueprint:** [\`docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md\`](../../docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md)
- **Pipeline:** [\`standards/AUTOMATED_PRODUCT_PIPELINE.md\`](../../standards/AUTOMATED_PRODUCT_PIPELINE.md)
- **Pricing:** [\`standards/PRICING.md\`](../../standards/PRICING.md)

## Quick Commands

\`\`\`bash
# View project structure
tree projects/agent-generated/$PRODUCT_SLUG

# Start development
cd projects/agent-generated/$PRODUCT_SLUG/build

# Run metrics collection
./metrics/collect.sh

# Check launch status
cat launch/30-day-plan.md
\`\`\`

## Support

- Create issues for blockers: [midnghtsapphire/revvel-standards/issues](https://github.com/midnghtsapphire/revvel-standards/issues)
- Review learnings from previous launches: \`learnings/\`
- Check metrics: \`metrics/config.json\`

## Success Metrics

Track these daily in \`metrics/\`:
- Signups
- Conversions
- Revenue
- Active Users
- Refund Rate

---

**Launch Date:** $LAUNCH_DATE  
**Days Remaining:** $DAYS  

Let's ship this! 🚢

---

*Generated on $NOW by autonomous-product-launcher.sh*
EOF
  log "Created: $NEXT_STEPS"
else
  log "[DRY RUN] Would create: $NEXT_STEPS"
fi

# ============================================================================
# Phase 7: Summary & Output
# ============================================================================

log ""
log "==================================================================="
log "  ✅ Project Initialized Successfully!"
log "==================================================================="
log ""
log "Product: $PRODUCT_NAME ($PRODUCT_SLUG)"
log "Shape: $SHAPE"
log "Launch: $LAUNCH_DATE ($DAYS days)"
log ""
log "📁 Project Location:"
log "   $PROJECT_DIR"
log ""
log "📋 Next Steps:"
log "   1. cd $PROJECT_DIR"
log "   2. cat NEXT_STEPS.md"
log "   3. Review launch/30-day-plan.md"
log "   4. Start with research/brief.md"
log ""
log "📊 Track Progress:"
log "   - Daily: Check metrics/config.json targets"
log "   - Weekly: Update launch/30-day-plan.md"
log "   - Launch: $LAUNCH_DATE"
log ""
log "📚 Resources:"
log "   - Blueprint: docs/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md"
log "   - Pipeline: standards/AUTOMATED_PRODUCT_PIPELINE.md"
log ""

if [ "$DRY_RUN" = false ]; then
  log "✨ Ready to ship! Follow the 30-day plan and let's hit $LAUNCH_DATE!"
else
  log "🔍 DRY RUN COMPLETE - Run without --dry-run to create project"
fi

log ""
log "==================================================================="

exit 0
