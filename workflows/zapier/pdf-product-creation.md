# Zapier Workflow: PDF Product Creation Pipeline

This document describes how to set up the PDF Product Creation Pipeline in Zapier.

## Overview

This Zap automates the 6-step process for creating and marketing PDF products:
1. Identify profitable emotional problems
2. Generate catchy titles with AI
3. Create PDF content with AI
4. Design the guide in Canva
5. Set up Shopify product
6. Prepare YouTube influencer marketing campaign

## Setup Instructions

### Prerequisites

- Zapier account (Professional or Team plan recommended for multi-step Zaps)
- Claude AI API access (via OpenRouter or direct Anthropic API)
- Canva account with API access
- Shopify store
- Webhooks by Zapier (included)

### Zap Configuration

#### Trigger: Webhooks by Zapier
- **Event**: Catch Hook
- **Webhook URL**: (Zapier will provide this - use it to trigger the workflow)
- **Expected Data**:
  ```json
  {
    "niche": "parenting",
    "keywords": ["sleep training", "toddler tantrums", "picky eating"]
  }
  ```

#### Step 1: Code by Zapier - Identify Problem
- **Action**: Run Python
- **Code**:
  ```python
  from datetime import datetime
  
  # Prepare research data
  niche = input_data.get('niche', 'parenting')
  keywords = input_data.get('keywords', [])
  
  output = {
      'niche': niche,
      'keywords': keywords,
      'timestamp': datetime.now().isoformat(),
      'step': 'trend_research'
  }
  ```

#### Step 2: OpenAI / Claude - Generate Title
- **Action**: Send Prompt (via Anthropic or OpenRouter integration)
- **Model**: claude-sonnet-4
- **Prompt**:
  ```text
  You are a product title expert. Based on the niche "{{Step 1: niche}}" and search trends, create a catchy, emotional title and subtitle for a PDF guide.

  The title should:
  - Be emotionally compelling
  - Address a specific pain point
  - Be under 10 words
  - Create urgency or relate to a common struggle

  Format your response as JSON:
  {
    "title": "Your catchy title here",
    "subtitle": "Your compelling subtitle that explains the solution",
    "target_audience": "Who this is for"
  }
  ```
- **Output**: Parse JSON response

#### Step 3: Code by Zapier - Parse Title JSON
- **Action**: Run Python
- **Code**:
  ```python
  import json
  
  response = input_data.get('response', '{}')
  
  # Clean up potential markdown code fences from Claude
  response = response.replace('```json', '').replace('```', '').strip()
  
  try:
      parsed = json.loads(response)
      output = {
          'title': parsed.get('title'),
          'subtitle': parsed.get('subtitle'),
          'target_audience': parsed.get('target_audience')
      }
  except json.JSONDecodeError as e:
      # Raise so Zapier marks the step as failed with a clear, actionable error.
      # We do not assign `output` here because Zapier ignores it once an
      # exception is raised — failed steps return only the exception message.
      raise Exception(f'Failed to parse Claude response as JSON. Error: {str(e)}. Response preview: {response[:200]}')
  ```

#### Step 4: OpenAI / Claude - Generate PDF Content
- **Action**: Send Prompt
- **Model**: claude-sonnet-4
- **Prompt**:
  ```text
  Create a comprehensive PDF guide with the following details:

  Title: {{Step 3: title}}
  Subtitle: {{Step 3: subtitle}}
  Target Audience: {{Step 3: target_audience}}

  Write a complete, actionable guide with:

  1. Introduction (addressing the pain point)
  2. Understanding the Problem (why this matters)
  3. The Solution Framework (3-5 main strategies)
  4. Step-by-step implementation for each strategy
  5. Common mistakes to avoid
  6. Quick wins (immediate actions readers can take)
  7. Long-term success tips
  8. Conclusion with encouragement

  Make it:
  - Practical and actionable
  - Empathetic and understanding
  - 15-20 pages worth of content
  - Written in a conversational, supportive tone
  - Include specific examples

  Format as markdown with clear headings.
  ```

#### Step 5: Canva - Create Design
- **Action**: Create Design (if Canva integration available)
- **Alternative**: Webhooks by Zapier - POST to Canva API
  - **URL**: `https://api.canva.com/v1/designs`
  - **Method**: POST
  - **Headers**:
    - `Authorization: Bearer YOUR_CANVA_API_KEY`
    - `Content-Type: application/json`
  - **Body**:
    ```json
    {
      "design_type": {
        "type": "preset",
        "name": "presentation"
      },
      "title": "{{Step 3: title}}"
    }
    ```

#### Step 6: Shopify - Create Product
- **Action**: Create Product
- **Product Details**:
  - **Title**: `{{Step 3: title}}`
  - **Description**: `{{Step 3: subtitle}}`
  - **Vendor**: Freedom Angel Corp
  - **Product Type**: Digital Download
  - **Tags**: `pdf,guide,{{Step 1: niche}}`
  - **Price**: 29.00
  - **SKU**: `PDF-{{zap_meta_timestamp}}`

#### Step 7: Code by Zapier - Prepare Influencer Campaign
- **Action**: Run Python
- **Code**:
  ```python
  output = {
      'campaign_niche': input_data.get('niche'),
      'product_title': input_data.get('title'),
      'product_url': input_data.get('shopify_product_url'),
      'offer_high_commission': '50% commission',
      'offer_flat_plus_commission': '$700 upfront + 15% ongoing',
      'video_duration': '30-60 seconds',
      'min_subscribers': 10000,
      'target_platform': 'YouTube'
  }
  ```

#### Step 8: Webhook by Zapier - Log Completion
- **Action**: POST (to your tracking system)
- **URL**: Your analytics/tracking endpoint
- **Body**: All data from previous steps

## Usage

### Trigger the Workflow

Send a POST request to your Zapier webhook URL:

```bash
curl -X POST https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/ \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "parenting",
    "keywords": ["sleep training", "newborn care", "bedtime routine"]
  }'
```

### Expected Output

The workflow will:
1. ✅ Research and validate the niche
2. ✅ Generate an emotional, compelling title
3. ✅ Create 15-20 pages of actionable content
4. ✅ Initiate Canva design creation
5. ✅ List the product on Shopify at $29
6. ✅ Prepare influencer outreach campaign data

### Next Manual Steps

After the Zap completes:
1. **Review the AI-generated content** - Ensure it flows well and makes sense
2. **Complete the Canva design** - Format text, add images from Unsplash, create cover
3. **Export PDF from Canva** - Upload to Shopify as digital download
4. **Execute influencer outreach** - Use the prepared campaign data to contact YouTubers
5. **Track performance** - Monitor Shopify analytics and sales

## Cost Estimate

Per workflow execution:
- Claude AI API calls: ~$0.20 (2 calls with Sonnet)
- Canva API: Free (design creation)
- Shopify API: Free (included in plan)
- Zapier: 1 task = 8 steps (counts as 8 tasks toward your plan limit)

## Troubleshooting

### Common Issues

1. **JSON parsing errors in Step 3**
   - Ensure Claude's response is valid JSON
   - Add error handling in the Python code
   - Use "Code by Zapier" to clean/validate the response

2. **Canva API 401 Unauthorized**
   - Verify your API key is correct
   - Check that your Canva account has API access enabled

3. **Shopify product creation fails**
   - Ensure your Shopify connection is active
   - Verify you have permission to create products
   - Check that required fields (title, price) are populated

## Alternative: Zapier Tables for Tracking

Consider adding Zapier Tables to track all products created:

- **Table Name**: `pdf_products`
- **Columns**:
  - `created_at` (Date)
  - `niche` (Text)
  - `title` (Text)
  - `shopify_product_id` (Text)
  - `status` (Single Select: Draft, Active, Marketed)
  - `sales_count` (Number)

## Advanced: Add Gumroad as Alternative Store

Add a parallel path after Step 4 to also list on Gumroad:

**Step 6b: HTTP Request - Create Gumroad Product**
- **URL**: `https://api.gumroad.com/v2/products`
- **Method**: POST
- **Body**:
  ```text
  access_token=YOUR_GUMROAD_TOKEN
  &name={{Step 3: title}}
  &price=2900
  &description={{Step 3: subtitle}}
  ```

## Notes

- This workflow assumes you have the necessary API keys and integrations set up
- Review and edit AI-generated content before publishing
- Adjust pricing based on your research and market positioning
- Consider A/B testing different titles and prices
