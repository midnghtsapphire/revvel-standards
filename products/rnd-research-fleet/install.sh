#!/bin/bash
# R&D Research Fleet - Auto Installer
# Version: 1.0.0 (2026-06-23)

set -e

echo "🚀 R&D Research Fleet Installer"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking requirements..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Please install from https://git-scm.com${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git $(git --version | cut -d' ' -f3)${NC}"

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p scripts
mkdir -p workflows
mkdir -p skills/RESEARCH_PROMPTS
mkdir -p templates
mkdir -p node_modules

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

if [ -f package.json ]; then
    npm install 2>/dev/null || npm install --legacy-peer-deps
else
    echo '{"name": "rnd-research-fleet", "version": "1.0.0"}' > package.json
    npm install
fi

# Set permissions
echo ""
echo "🔐 Setting permissions..."
chmod +x install.sh
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.js 2>/dev/null || true

# Check for Perplexity bridge
echo ""
echo "🔍 Checking Perplexity no-key bridge..."
if python3 -c "import perplexity_api" 2>/dev/null; then
    echo -e "${GREEN}✅ Perplexity bridge installed${NC}"
else
    echo "📥 Installing Perplexity no-key bridge..."
    pip3 install --user "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main" 2>/dev/null || \
    python3 -m pip install --user "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"
    echo -e "${GREEN}✅ Perplexity bridge installed${NC}"
fi

# Create .env.example
echo ""
echo "📝 Creating .env configuration..."
if [ ! -f .env ]; then
    cat > .env.example << 'EOF'
# R&D Research Fleet Configuration
# Copy to .env and fill in your values

# OpenRouter API Key (optional - uses free Perplexity by default)
OPENROUTER_API_KEY=

# GitHub Token (for auto-fork feature)
GITHUB_TOKEN=

# Research settings
RESEARCH_DEPTH=deep_search
MAX_TOKENS=8000
TEMPERATURE=0.7

# Model routing
PRIMARY_MODEL=anthropic/claude-3.5-sonnet
FALLBACK_MODEL=openrouter/fusion
EOF
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created .env - edit with your API keys${NC}"
fi

# Initialize Git repo if not already
if [ ! -d .git ]; then
    echo ""
    echo "🔄 Initializing Git repository..."
    git init
    echo -e "${YELLOW}⚠️  Run 'node scripts/auto-github-join.js' to connect to GitHub${NC}"
fi

# Create startup script
cat > start-research.sh << 'EOF'
#!/bin/bash
echo "🔬 R&D Research Fleet"
echo "===================="
echo ""
echo "Starting research..."
echo ""
echo "Commands:"
echo "  node perplexity-research.js \"your question\""
echo "  node deep-search-router.js \"your question\""
echo "  node persona-loader.js market-researcher \"your question\""
echo ""
bash
EOF
chmod +x start-research.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Installation complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys (optional)"
echo "2. Run: node scripts/auto-github-join.js"
echo "3. Start researching: node perplexity-research.js \"your idea\""
echo ""
echo "📚 Documentation: See MASTER_PROMPT.md"
echo "💰 Get support: support@freedomangelcorp.com"
echo ""
