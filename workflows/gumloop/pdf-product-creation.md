# Gumloop Workflow: PDF Product Creation Pipeline

This document describes how to set up the PDF Product Creation Pipeline in Gumloop.

## Overview

Gumloop is a no-code AI automation platform that excels at chaining AI operations together. This workflow automates the complete PDF product creation and marketing process.

## Features

- Visual workflow builder
- Built-in Claude AI integration
- API calling capabilities
- Data transformation nodes
- Conditional logic support
- Webhook triggers and outputs

## Workflow Structure

### Flow Design

```text
[Webhook Trigger]
    ↓
[Step 1: Research Node - Validate Niche]
    ↓
[Step 2: AI Node - Generate Title (Claude)]
    ↓
[Transform Node - Parse JSON]
    ↓
[Step 3: AI Node - Generate Content (Claude)]
    ↓
[Step 4: API Node - Create Canva Design]
    ↓
[Step 5: API Node - Create Shopify Product]
    ↓
[Step 6: Transform Node - Prepare Campaign]
    ↓
[Webhook Response]
```

## Node Configuration

### 1. Webhook Trigger Node

**Configuration:**
- **Node Type**: Webhook Input
- **Method**: POST
- **Authentication**: None (or API Key if desired)
- **Expected Schema**:
  ```json
  {
    "niche": "string",
    "keywords": ["array", "of", "strings"]
  }
  ```

### 2. Research Node - Validate Niche

**Configuration:**
- **Node Type**: Code/Transform
- **Purpose**: Prepare research data structure
- **Code**:
  ```javascript
  const niche = input.niche || 'parenting';
  const keywords = input.keywords || [];
  
  return {
    niche: niche,
    keywords: keywords,
    timestamp: new Date().toISOString(),
    step: 'trend_research',
    ready_for_ai: true
  };
  ```

### 3. AI Node - Generate Title

**Configuration:**
- **Node Type**: AI - Claude Sonnet
- **Model**: claude-sonnet-4
- **Temperature**: 0.7
- **Max Tokens**: 500
- **System Prompt**:
  ```text
  You are a product title expert specializing in emotional, compelling copy for digital products.
  ```
- **User Prompt**:
  ```text
  Based on the niche "{{niche}}" and search trends, create a catchy, emotional title and subtitle for a PDF guide.

  The title should:
  - Be emotionally compelling
  - Address a specific pain point
  - Be under 10 words
  - Create urgency or relate to a common struggle

  Format your response as valid JSON only (no markdown, no code blocks):
  {
    "title": "Your catchy title here",
    "subtitle": "Your compelling subtitle that explains the solution",
    "target_audience": "Who this is for"
  }
  ```
- **Output Variable**: `title_response`

### 4. Transform Node - Parse JSON

**Configuration:**
- **Node Type**: JSON Parser
- **Input**: `{{title_response}}`
- **Output Variables**:
  - `title`
  - `subtitle`
  - `target_audience`

### 5. AI Node - Generate Content

**Configuration:**
- **Node Type**: AI - Claude Sonnet
- **Model**: claude-sonnet-4
- **Temperature**: 0.8
- **Max Tokens**: 8000
- **System Prompt**:
  ```text
  You are an expert content writer specializing in practical, actionable guides that help people solve real problems.
  ```
- **User Prompt**:
  ```text
  Create a comprehensive PDF guide with the following details:

  Title: {{title}}
  Subtitle: {{subtitle}}
  Target Audience: {{target_audience}}

  Write a complete, actionable guide with:

  1. Introduction (addressing the pain point)
  2. Understanding the Problem (why this matters)
  3. The Solution Framework (3-5 main strategies)
  4. Step-by-step implementation for each strategy
  5. Common mistakes to avoid
  6. Quick wins (immediate actions readers can take)
  7. Long-term success tips
  8. Conclusion with encouragement

  Requirements:
  - Practical and actionable advice
  - Empathetic and understanding tone
  - 15-20 pages worth of content
  - Conversational, supportive voice
  - Include specific examples and scenarios
  - Use markdown formatting with clear headings

  Format the entire guide as clean markdown.
  ```
- **Output Variable**: `pdf_content`

### 6. API Node - Create Canva Design

**Configuration:**
- **Node Type**: HTTP Request
- **Method**: POST
- **URL**: `https://api.canva.com/v1/designs`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer {{env.CANVA_API_KEY}}",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "design_type": {
      "type": "preset",
      "name": "presentation"
    },
    "title": "{{title}}"
  }
  ```

  > **Note:** Canva accepts either `{"type": "preset", "name": "<preset>"}`
  > (e.g., `presentation`, `doc`, `instagram-post`) **or**
  > `{"type": "custom", "width": <px>, "height": <px>}`. Mixing a preset
  > with root-level `width`/`height` violates the schema and returns 400.
- **Success Condition**: Status code 200-299
- **Output Variable**: `canva_design`

### 7. API Node - Create Shopify Product

**Configuration:**
- **Node Type**: HTTP Request
- **Method**: POST
- **URL**: `https://{{env.SHOPIFY_DOMAIN}}/admin/api/2024-01/products.json`
- **Headers**:
  ```json
  {
    "X-Shopify-Access-Token": "{{env.SHOPIFY_ACCESS_TOKEN}}",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "product": {
      "title": "{{title}}",
      "body_html": "<h2>{{subtitle}}</h2><p>A comprehensive guide for {{target_audience}}</p>",
      "vendor": "Freedom Angel Corp",
      "product_type": "Digital Download",
      "tags": "pdf,guide,{{niche}}",
      "status": "draft",
      "variants": [
        {
          "price": "29.00",
          "sku": "PDF-{{timestamp}}",
          "inventory_management": null,
          "fulfillment_service": "manual"
        }
      ]
    }
  }
  ```
- **Success Condition**: Status code 200-299
- **Output Variable**: `shopify_product`

### 8. Transform Node - Prepare Campaign

**Configuration:**
- **Node Type**: Code/Transform
- **Purpose**: Structure influencer outreach data
- **Code**:
  ```javascript
  return {
    outreach_campaign: {
      niche: input.niche,
      product_title: input.title,
      product_url: input.shopify_product?.product?.admin_graphql_api_id || 'pending',
      shopify_product_id: input.shopify_product?.product?.id,
      canva_design_id: input.canva_design?.design?.id,
      target_platforms: ['youtube'],
      offer_structure: {
        option_a: {
          type: 'high_commission',
          rate: '50%',
          description: 'Earn 50% commission on every sale'
        },
        option_b: {
          type: 'flat_fee_plus_commission',
          flat_fee: '$700',
          commission: '15%',
          description: '$700 upfront + 15% ongoing commission'
        }
      },
      video_requirements: {
        duration: '30-60 seconds',
        integration_type: 'sponsored_segment',
        talking_points: [
          'Authentic problem-solution story',
          'Personal connection to the struggle',
          'Clear call-to-action with discount code'
        ]
      },
      influencer_criteria: {
        min_subscribers: 10000,
        niche_match: input.niche,
        engagement_rate: '>3%',
        audience_demographics: 'parents, caregivers'
      }
    },
    status: 'pipeline_complete',
    created_at: new Date().toISOString(),
    next_steps: [
      'Review AI-generated content',
      'Complete Canva design',
      'Upload PDF to Shopify',
      'Execute influencer outreach'
    ]
  };
  ```

### 9. Webhook Response Node

**Configuration:**
- **Node Type**: Webhook Output
- **Status Code**: 200
- **Response Body**:
  ```json
  {
    "success": true,
    "product_title": "{{title}}",
    "shopify_product_id": "{{shopify_product.product.id}}",
    "canva_design_id": "{{canva_design.design.id}}",
    "status": "{{status}}",
    "next_steps": "{{next_steps}}"
  }
  ```

## Environment Variables

Set these in Gumloop's environment settings:

- `CANVA_API_KEY` - Your Canva API access token
- `SHOPIFY_DOMAIN` - Your Shopify store domain (e.g., `yourstore.myshopify.com`)
- `SHOPIFY_ACCESS_TOKEN` - Your Shopify Admin API access token
- `CLAUDE_API_KEY` - Anthropic Claude API key (if not using built-in integration)

## Testing the Workflow

### 1. Test Input

Use Gumloop's test feature with this payload:

```json
{
  "niche": "parenting",
  "keywords": [
    "sleep training",
    "toddler tantrums",
    "picky eating"
  ]
}
```

### 2. Expected Output

```json
{
  "success": true,
  "product_title": "Parents Hate Choppy Sleep: Fix It For Good",
  "shopify_product_id": "8234567890",
  "canva_design_id": "DAF1234567",
  "status": "pipeline_complete",
  "next_steps": [
    "Review AI-generated content",
    "Complete Canva design",
    "Upload PDF to Shopify",
    "Execute influencer outreach"
  ]
}
```

### 3. Validation Steps

After running the workflow:

1. ✅ Check that title is emotional and under 10 words
2. ✅ Verify content is 15-20 pages of markdown
3. ✅ Confirm Canva design was created (check Canva dashboard)
4. ✅ Verify Shopify product exists in draft status
5. ✅ Review campaign data structure is complete

## Error Handling

### Retry Configuration

For each API node:
- **Retry Count**: 3
- **Retry Delay**: 2 seconds
- **Exponential Backoff**: Enabled

### Error Notifications

Configure error webhooks to notify when:
- Claude AI fails to generate valid JSON
- Canva API returns 401/403
- Shopify API fails to create product
- Any node times out (>30 seconds)

## Optimization Tips

### 1. Parallel Execution

Gumloop supports parallel branches. After Step 3 (content generation), you can run Steps 4 and 5 in parallel:

```text
[Step 3: Generate Content]
    ├─→ [Step 4: Canva Design]
    └─→ [Step 5: Shopify Product]
         ↓
    [Step 6: Merge Results]
```

### 2. Caching

Enable caching for the AI nodes to avoid redundant API calls during testing:
- Cache key: `{{niche}}-{{keywords}}`
- Cache duration: 1 hour

### 3. Cost Optimization

- Use Claude Haiku for title generation (cheaper, faster)
- Use Claude Sonnet only for content generation
- Implement rate limiting: max 10 executions per hour

## Deployment

### 1. Publish Workflow

1. Click "Publish" in Gumloop
2. Copy the webhook URL
3. Document the URL in your project's `.env` file

### 2. Schedule (Optional)

If you want to run this on a schedule instead of webhook:
- Set up a "Schedule" trigger
- Configure daily execution at off-peak hours
- Pull niche ideas from a Google Sheet or database

### 3. Monitoring

Gumloop provides built-in monitoring:
- Execution history
- Success/failure rates
- Average execution time
- Cost per execution

## Integration with Revvel Standards

### Link to Product Pipeline

This Gumloop workflow implements Steps 2-6 of the `AUTOMATED_PRODUCT_PIPELINE.md`:
- Step 2: Create Punchy Title ✅
- Step 3: Generate PDF Content ✅
- Step 4: Design Guide ✅
- Step 5: Build Store ✅
- Step 6: Market Through Influencers ✅ (prep)

### BOM Gate Integration

Before running this workflow:
1. Ensure BOM gate has provisioned all required API keys
2. Verify connections are active in Gumloop
3. Test each API endpoint individually

## Cost Estimate

Per execution:
- Claude API: ~$0.25 (title + content generation)
- Canva API: Free
- Shopify API: Free
- Gumloop: Included in plan (no per-execution fee)

**Total per product**: ~$0.25 + your time reviewing

## Next Steps After Workflow Completes

1. **Review Content** - Open the generated markdown in VS Code
2. **Design in Canva** - Use the created design ID to finish layout
3. **Export PDF** - Download from Canva at 300 DPI
4. **Upload to Shopify** - Attach PDF as digital download
5. **Publish Product** - Change status from draft to active
6. **Start Outreach** - Use campaign data to contact influencers

## Alternative: Gumloop + Airtable

For better tracking, add an Airtable node after Step 8:

**Airtable Node Configuration:**
- **Base**: PDF Products
- **Table**: Products
- **Action**: Create Record
- **Fields**:
  - Title: `{{title}}`
  - Niche: `{{niche}}`
  - Shopify ID: `{{shopify_product.product.id}}`
  - Status: Draft
  - Created: `{{timestamp}}`
  - Campaign Ready: Yes

This gives you a centralized dashboard to track all products created by the automation.

---

## Executable Implementation (in-repo, WR #14451)

The no-code Gumloop flow above has a runnable, in-repo equivalent so the same
pipeline can run in CI without the Gumloop platform:

- **Script:** [`scripts/gumloop_pdf_pipeline.py`](../../scripts/gumloop_pdf_pipeline.py)
  — Research → AI title → AI content → PDF (reportlab) → product/campaign
  manifest. Uses `OPENROUTER_API_KEY` for the AI steps (mirrors
  `scripts/openrouter-routing.js`) and falls back to deterministic copy when no
  key is set, so it always produces an artifact.
- **Workflow:** [`.github/workflows/gumloop-pdf-pipeline.yml`](../../.github/workflows/gumloop-pdf-pipeline.yml)
  — `workflow_dispatch` with `niche` / `keywords` / `output_name` inputs;
  uploads the `.pdf` and `.manifest.json` as run artifacts.

Run locally:

```bash
python scripts/gumloop_pdf_pipeline.py --niche "ADHD productivity" \
  --keywords "focus,planner,dopamine" --out artifacts/pdf
```

The emitted `*.manifest.json` carries the product price/description plus
declarative `channels` (Gumroad/Canva/Shopify) and `campaign` metadata, so it
can drive the same downstream nodes the Gumloop flow targets — i.e. it wires
into the existing PDF product processes (`standards/shapes/PDF.md`,
`standards/AUTOMATED_PRODUCT_PIPELINE.md`) rather than replacing them.
