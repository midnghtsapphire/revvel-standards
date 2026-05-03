#!/bin/bash
# PDF Product Automation - Quick Setup Script
# Usage: ./setup-pdf-automation.sh [n8n|make|zapier|gumloop]

set -e

PLATFORM="${1:-n8n}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKFLOWS_DIR="$SCRIPT_DIR"

echo "🚀 PDF Product Automation Setup"
echo "================================"
echo ""
echo "Platform: $PLATFORM"
echo "Repository: $REPO_ROOT"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check if workflows directory exists
if [ ! -d "$WORKFLOWS_DIR" ]; then
    print_error "Workflows directory not found: $WORKFLOWS_DIR"
    exit 1
fi
print_success "Workflows directory found"

# Check for required workflow files
case $PLATFORM in
    n8n)
        WORKFLOW_FILE="$WORKFLOWS_DIR/n8n/pdf-product-creation.json"
        ;;
    make)
        WORKFLOW_FILE="$WORKFLOWS_DIR/make/pdf-product-creation.json"
        ;;
    zapier)
        WORKFLOW_FILE="$WORKFLOWS_DIR/zapier/pdf-product-creation.md"
        ;;
    gumloop)
        WORKFLOW_FILE="$WORKFLOWS_DIR/gumloop/pdf-product-creation.md"
        ;;
    *)
        print_error "Unknown platform: $PLATFORM"
        echo "Supported platforms: n8n, make, zapier, gumloop"
        exit 1
        ;;
esac

if [ ! -f "$WORKFLOW_FILE" ]; then
    print_error "Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi
print_success "Workflow file found: $(basename $WORKFLOW_FILE)"

echo ""
echo "🔐 Checking for required API keys..."
echo ""

# Check for environment variables (API keys)
MISSING_KEYS=()

if [ -z "$CLAUDE_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    MISSING_KEYS+=("CLAUDE_API_KEY or ANTHROPIC_API_KEY")
fi

if [ -z "$CANVA_API_KEY" ]; then
    MISSING_KEYS+=("CANVA_API_KEY")
fi

if [ -z "$SHOPIFY_ACCESS_TOKEN" ]; then
    MISSING_KEYS+=("SHOPIFY_ACCESS_TOKEN")
fi

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
    print_warning "Missing API keys:"
    for key in "${MISSING_KEYS[@]}"; do
        echo "  - $key"
    done
    echo ""
    echo "Please set these environment variables before running the workflow."
    echo "You can continue setup, but the workflow won't work without them."
    echo ""
    # In non-interactive contexts (CI, piped input) `read` would either hang or
    # return empty, exiting the script. Auto-continue when no TTY is attached
    # or when AUTO_YES=1 is set, and only prompt for human confirmation when
    # we have an interactive terminal.
    if [ "${AUTO_YES:-0}" = "1" ]; then
        print_warning "AUTO_YES=1 detected — continuing without prompt."
    elif [ ! -t 0 ]; then
        print_warning "Non-interactive run detected — continuing without prompt."
    else
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_success "All required API keys found"
fi

echo ""
echo "📦 Setting up $PLATFORM workflow..."
echo ""

# Platform-specific setup
case $PLATFORM in
    n8n)
        echo "n8n Setup Instructions:"
        echo "======================="
        echo ""
        echo "1. Install n8n (if not already installed):"
        echo "   Docker:  docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n"
        echo "   NPM:     npm install n8n -g && n8n start"
        echo ""
        echo "2. Open n8n at http://localhost:5678"
        echo ""
        echo "3. Import the workflow:"
        echo "   - Click 'Workflows' → 'Import from File'"
        echo "   - Select: $WORKFLOW_FILE"
        echo ""
        echo "4. Configure credentials:"
        echo "   - Claude AI: Add Anthropic API credentials"
        echo "   - Canva: Add HTTP Header Auth with your API key"
        echo "   - Shopify: Add Shopify API credentials"
        echo ""
        echo "5. Activate the workflow"
        echo ""
        echo "6. Get webhook URL and test with:"
        echo '   curl -X POST <webhook-url> \'
        echo '     -H "Content-Type: application/json" \'
        echo '     -d '\''{"niche": "parenting", "keywords": ["sleep training"]}'\'''
        echo ""
        ;;
        
    make)
        echo "Make.com Setup Instructions:"
        echo "============================"
        echo ""
        echo "1. Log in to Make.com (https://make.com)"
        echo ""
        echo "2. Create New Scenario"
        echo ""
        echo "3. Import blueprint:"
        echo "   - Click three dots → 'Import Blueprint'"
        echo "   - Upload: $WORKFLOW_FILE"
        echo ""
        echo "4. Connect accounts:"
        echo "   - Anthropic (for Claude AI)"
        echo "   - Canva"
        echo "   - Shopify"
        echo ""
        echo "5. Activate the scenario"
        echo ""
        echo "6. Test with the webhook URL provided"
        echo ""
        ;;
        
    zapier)
        echo "Zapier Setup Instructions:"
        echo "=========================="
        echo ""
        echo "1. Log in to Zapier (https://zapier.com)"
        echo ""
        echo "2. Create New Zap"
        echo ""
        echo "3. Follow the step-by-step guide:"
        echo "   Open: $WORKFLOW_FILE"
        echo ""
        echo "4. Configure each step as documented in the guide"
        echo ""
        echo "5. Connect your accounts (Claude, Canva, Shopify)"
        echo ""
        echo "6. Test each step individually"
        echo ""
        echo "7. Turn on the Zap"
        echo ""
        ;;
        
    gumloop)
        echo "Gumloop Setup Instructions:"
        echo "==========================="
        echo ""
        echo "1. Log in to Gumloop (https://gumloop.com)"
        echo ""
        echo "2. Create New Flow"
        echo ""
        echo "3. Follow the node-by-node configuration:"
        echo "   Open: $WORKFLOW_FILE"
        echo ""
        echo "4. Set environment variables in Gumloop:"
        echo "   - CANVA_API_KEY"
        echo "   - SHOPIFY_DOMAIN"
        echo "   - SHOPIFY_ACCESS_TOKEN"
        echo ""
        echo "5. Test the flow"
        echo ""
        echo "6. Publish and get webhook URL"
        echo ""
        ;;
esac

echo ""
echo "📚 Additional Resources:"
echo "======================="
echo ""
echo "- Complete Guide: $WORKFLOWS_DIR/PDF_AUTOMATION_GUIDE.md"
echo "- Platform Workflow: $WORKFLOW_FILE"
echo "- Product Pipeline: $REPO_ROOT/standards/AUTOMATED_PRODUCT_PIPELINE.md"
echo "- PDF Shape Standard: $REPO_ROOT/standards/shapes/PDF.md"
echo ""

# Note: test-payload.json and test-workflow.sh are already tracked in the repo
# Don't overwrite them - just reference the existing files
if [ ! -f "$WORKFLOWS_DIR/test-payload.json" ]; then
    print_warning "test-payload.json not found (should be tracked in repo)"
fi

if [ ! -f "$WORKFLOWS_DIR/test-workflow.sh" ]; then
    print_warning "test-workflow.sh not found (should be tracked in repo)"
fi

print_success "Setup script complete - using tracked test files from repo"

echo ""
echo "🎯 Next Steps:"
echo "============="
echo ""
echo "1. Complete the platform-specific setup above"
echo "2. Get your webhook URL from the platform"
echo "3. Test the workflow:"
echo "   cd $WORKFLOWS_DIR"
echo "   ./test-workflow.sh <your-webhook-url>"
echo ""
echo "4. Review the generated content"
echo "5. Complete manual steps (Canva design, PDF export)"
echo "6. Publish your first product!"
echo ""

print_success "Setup script complete!"
echo ""
echo "💡 Tip: Read $WORKFLOWS_DIR/PDF_AUTOMATION_GUIDE.md for detailed instructions"
echo ""
