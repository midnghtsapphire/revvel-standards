#!/usr/bin/env bash
# autonomous-product-launcher.sh — Launch a new product using the autonomous framework
#
# DEPRECATED 2026-06-13: the "30-day" timeline framing is superseded by the
# one-iteration ship-to-market standard (docs/DEFINITION_OF_DONE.md). The legacy
# blueprint it references is archived under docs/30Dayiteration/. The script is
# kept (not deleted) in case the staged framework is wanted again.
#
# This script orchestrates the product launch pipeline based on the archived
# docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md
#
# Usage:
#   ./scripts/autonomous-product-launcher.sh <product-name> [OPTIONS]
#
# Options:
#   --days N              Duration in days (default: 30)
#   --shape SHAPE         Product shape (pdf|app|cli|mcp|api|skill|extension|booklet|full-app|excel|token)
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
BLUEPRINT="$REPO_ROOT/docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md"  # archived 2026-06-13

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
  local deps=(git python3 curl)
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
      error "Required dependency '$dep' not found. Please install it first."
    fi
  done
}

# Convert input to lowercase kebab-case slug accepted by init-product.sh.
# Strips leading/trailing dashes and collapses runs of dashes so inputs like
# " My Product! " don't produce slugs like '-my-product-' that init-product.sh
# rejects.
slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | tr ' ' '-' \
    | tr -cd '[:alnum:]-' \
    | sed -E 's/-+/-/g; s/^-+//; s/-+$//'
}

# Require a value for an option flag. Errors out with a clear message when
# the user passes a value-taking flag without a value (e.g. `--days` with no
# argument). Without this guard, `shift 2` would silently abort under set -e.
require_value() {
  local flag="$1"
  local remaining="$2"
  if [ "$remaining" -lt 2 ]; then
    error "$flag requires a value"
  fi
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
      require_value "--days" "$#"
      DAYS="$2"
      shift 2
      ;;
    --shape)
      require_value "--shape" "$#"
      SHAPE="$2"
      shift 2
      ;;
    --auto-research)
      AUTO_RESEARCH=true
      shift
      ;;
    --payment)
      require_value "--payment" "$#"
      PAYMENT_PLATFORM="$2"
      shift 2
      ;;
    --launch-date)
      require_value "--launch-date" "$#"
      LAUNCH_DATE="$2"
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

# Shape list must stay in sync with scripts/init-product.sh:64.
case "$SHAPE" in
  pdf|app|cli|mcp|api|skill|extension|booklet|full-app|excel|token) ;;
  *)
    error "Invalid shape '$SHAPE' (expected: pdf, app, cli, mcp, api, skill, extension, booklet, full-app, excel, token)"
    ;;
esac

case "$PAYMENT_PLATFORM" in
  lemonsqueezy|gumroad|stripe) ;;
  *)
    error "Invalid payment platform '$PAYMENT_PLATFORM' (expected: lemonsqueezy, gumroad, stripe)"
    ;;
esac

# Pre-flight check now that arguments have validated. Doing this after
# validation gives a clearer error for typos (e.g. `--shape ap`) before
# complaining about missing tools.
check_dependencies

# ============================================================================
# Setup
# ============================================================================

PRODUCT_SLUG=$(slugify "$PRODUCT_NAME")
if [ -z "$PRODUCT_SLUG" ]; then
  error "Product name '$PRODUCT_NAME' produced an empty slug after sanitization"
fi
PROJECT_DIR="$REPO_ROOT/projects/agent-generated/$PRODUCT_SLUG"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Compute proportional week boundaries so generated plans match --days.
# For DAYS=30 this reproduces the canonical 1-7 / 8-14 / 15-21 / 22-30 split.
WEEK1_END=$(( DAYS / 4 ))
if [ "$WEEK1_END" -lt 1 ]; then WEEK1_END=1; fi
WEEK2_END=$(( DAYS / 2 ))
if [ "$WEEK2_END" -le "$WEEK1_END" ]; then WEEK2_END=$(( WEEK1_END + 1 )); fi
WEEK3_END=$(( DAYS * 3 / 4 ))
if [ "$WEEK3_END" -le "$WEEK2_END" ]; then WEEK3_END=$(( WEEK2_END + 1 )); fi
if [ "$WEEK3_END" -ge "$DAYS" ]; then WEEK3_END=$(( DAYS - 1 )); fi
WEEK1_START=1
WEEK2_START=$(( WEEK1_END + 1 ))
WEEK3_START=$(( WEEK2_END + 1 ))
WEEK4_START=$(( WEEK3_END + 1 ))

if [ -z "$LAUNCH_DATE" ]; then
  # Portable date calculation (works on GNU and BSD/macOS)
  if date -v+1d > /dev/null 2>&1; then
    # BSD/macOS date
    LAUNCH_DATE=$(date -u -v+${DAYS}d +%Y-%m-%d)
  else
    # GNU date
    LAUNCH_DATE=$(date -u -d "+${DAYS} days" +%Y-%m-%d)
  fi
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
  if [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Project directory already exists: $PROJECT_DIR (would refuse in real run)"
  else
    error "Project directory already exists: $PROJECT_DIR"
  fi
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

### Week 1: Foundation & Validation (Days $WEEK1_START-$WEEK1_END)
- [ ] Problem discovery & validation
- [ ] MVP specification
- [ ] Landing page & waitlist setup

### Week 2: Build & Automate (Days $WEEK2_START-$WEEK2_END)
- [ ] MVP development
- [ ] Payment integration ($PAYMENT_PLATFORM)
- [ ] Analytics & monitoring

### Week 3: Test & Iterate (Days $WEEK3_START-$WEEK3_END)
- [ ] Closed beta launch
- [ ] Iterate based on data
- [ ] Final polish

### Week 4: Launch & Scale (Days $WEEK4_START-$DAYS)
- [ ] Soft launch
- [ ] Full launch (Product Hunt)
- [ ] Measure & plan next iteration

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

- Blueprint: [\`docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md\`](../../../../docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md)
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
  # Use Python to generate JSON safely (avoids injection issues)
  python3 - "$METRICS_CONFIG" "$PRODUCT_SLUG" "$PRODUCT_NAME" "$SHAPE" "$PAYMENT_PLATFORM" "$LAUNCH_DATE" "$NOW" <<'PY'
import json, sys
path, slug, name, shape, payment, launch, created = sys.argv[1:8]
config = {
  "product_slug": slug,
  "product_name": name,
  "shape": shape,
  "payment_platform": payment,
  "launch_date": launch,
  "created_at": created,
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
      "prototype_ready": True,
      "payment_tested": True
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
with open(path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2)
    f.write("\n")
PY
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

**Status:** 🔴 Not Started
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

*Note: Automated research tools are in development. For now, manually research the above.*
EOF
    log "Created: $RESEARCH_BRIEF (requires manual research)"
  else
    log "[DRY RUN] Would create: $RESEARCH_BRIEF"
  fi
else
  # Create research directory with brief template even without --auto-research
  RESEARCH_DIR="$PROJECT_DIR/research"
  RESEARCH_BRIEF="$RESEARCH_DIR/brief.md"
  
  if [ "$DRY_RUN" = false ]; then
    cat > "$RESEARCH_BRIEF" <<EOF
# Research Brief: $PRODUCT_NAME

**Status:** 🔴 Not Started
**Created:** $NOW

## Pain Points

Identify pain points by:
- Searching Reddit, Twitter/X, forums for complaints
- Analyzing competitor reviews
- Interviewing potential users
- Monitoring social media conversations

Target: 50+ mentions of the problem in the last 30 days

## Competitor Analysis

Research top 10 competitors:
- Pricing and business models
- Feature comparison
- Customer reviews (what they love/hate)
- SEO keywords they rank for
- Market gaps and opportunities

## Target Audience

Define your primary audience:
- Demographics (age, location, profession)
- Use cases and pain points
- Current solutions they use
- Willingness to pay
- Where they hang out online

## MVP Definition

Based on research, define:
- **Core problem:** One sentence description
- **Solution:** How your product solves it
- **Minimum feature set:** The absolute minimum to provide value
- **Differentiation:** Why you vs. competitors

## Market Size

Estimate the addressable market:
- Total potential users/customers
- Realistic market capture rate (be conservative)
- Revenue potential at different price points
- Growth trajectory

---

*Fill this out before proceeding to Week 2 of your launch plan*
EOF
    log "Created: $RESEARCH_BRIEF"
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

- **Blueprint:** [\`docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md\`](../../../docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md)
- **Pipeline:** [\`standards/AUTOMATED_PRODUCT_PIPELINE.md\`](../../../standards/AUTOMATED_PRODUCT_PIPELINE.md)
- **Pricing:** [\`standards/PRICING.md\`](../../../standards/PRICING.md)

## Quick Commands

\`\`\`bash
# View project structure
tree projects/agent-generated/$PRODUCT_SLUG

# Start development
cd projects/agent-generated/$PRODUCT_SLUG/build

# Check launch status
cat ../launch/30-day-plan.md

# View metrics targets (config only — collection is documented in automation/README.md)
cat ../metrics/config.json
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
log "   - Blueprint: docs/30Dayiteration/30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md"
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
