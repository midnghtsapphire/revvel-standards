# n8n Workflow Templates

This directory contains n8n workflow templates for automation.

## Available Workflows

### 1. PDF Product Creation Pipeline ✨ NEW

**File**: `pdf-product-creation.json`

**Purpose**: Automate the complete 6-step process for creating and marketing PDF products:
1. Identify profitable emotional problems
2. Generate catchy titles with Claude AI
3. Create PDF content with Claude AI
4. Design guide with Canva API
5. Create Shopify product listing
6. Prepare YouTube influencer marketing campaign

**Import Instructions**:
1. Install n8n (Docker or npm)
2. Open n8n at <http://localhost:5678>
3. Go to Workflows → Import from File
4. Select `pdf-product-creation.json`
5. Configure credentials (Claude AI, Canva, Shopify)
6. Activate workflow
7. Test with webhook

**Documentation**: See `../PDF_AUTOMATION_GUIDE.md` for complete setup guide.

**Quick Test**:
```bash
curl -X POST <your-webhook-url> \
  -H "Content-Type: application/json" \
  -d '{"niche": "parenting", "keywords": ["sleep training"]}'
```

---

### 2. Secret Management (Gatekeeper)

The following workflows are documented in `/docs/SELF_HEALING_SECRET_ROTATION.md`:

1. **secret-request-webhook** - Webhook for agent secret requests
2. **secret-rotation-monitor** - Scheduled secret age monitoring
3. **issue-to-secret-provisioning** - GitHub issue-triggered provisioning

These will be implemented once the n8n instance is configured for secret management.

---

## Installation

### Option 1: Docker (Recommended)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Option 2: NPM

```bash
npm install n8n -g
n8n start
```

Access n8n at <http://localhost:5678>

---

## Required Credentials

For the PDF Product Creation workflow, you'll need:

- **Claude AI** (Anthropic API)
  - Type: HTTP Header Auth
  - Header: `x-api-key`
  - Value: Your Anthropic API key

- **Canva API**
  - Type: HTTP Header Auth
  - Header: `Authorization`
  - Value: `Bearer YOUR_CANVA_API_KEY`

- **Shopify**
  - Type: Shopify API
  - Domain: Your store domain
  - Access Token: Your Shopify Admin API token

---

## Support

For detailed setup instructions, troubleshooting, and advanced features:
- **PDF Automation**: `../PDF_AUTOMATION_GUIDE.md`
- **Setup Script**: `../setup-pdf-automation.sh n8n`
- **Test Script**: `../test-workflow.sh <webhook-url>`
