# Video Production Artifact Generator System

This system generates ALL artifacts from video production: website, CLI, MCP, API, booklets, Chrome extension, PDF, and merchandise.

## Overview

```text
Input (Video/Content)
       │
       ▼
┌─────────────────────────────────────────────────────┐
│           ARTIFACT GENERATOR ENGINE                 │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │Website  │ │CLI Tool │ │MCP      │ │API       │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │Booklets │ │Chrome   │ │PDF      │ │Merch     │ │
│  │         │ │Extension│ │         │ │Store     │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
└─────────────────────────────────────────────────────┘
       │
       ▼
Output Artifacts + Distribution + Monetization
```

## Artifact Types

### 1. Website
- Landing page for the content
- Video hosting integration
- Lead capture forms
- Sales pages
- Portfolio展示

**Output:** `artifacts/output/website/`

### 2. CLI Tool
- Command-line interface for content generation
- Script generation
- Batch processing
- Automation scripts

**Output:** `artifacts/output/cli/`

### 3. MCP Server
- Model Context Protocol integration
- AI agent tool access
- Content generation via AI
- Workflow automation

**Output:** `artifacts/output/mcp/`

### 4. API
- REST API for content generation
- Webhook integrations
- Third-party integrations
- Developer access

**Output:** `artifacts/output/api/`

### 5. Booklets
- PDF booklets generated from content
- Study guides
- Quick reference cards
- Workbooks

**Output:** `artifacts/output/booklets/`

### 6. Chrome Extension
- Browser extension for content
- Quick access tools
- Productivity features
- Content sharing

**Output:** `artifacts/output/chrome-extension/`

### 7. PDF
- Formatted documents
- Reports
- Guides
- Presentations

**Output:** `artifacts/output/pdf/`

### 8. Merchandise
- T-shirts, mugs, etc.
- Print-on-demand integration
- Custom designs

**Output:** `artifacts/output/merchandise/`

## Workflow

```text
1. INPUT
   - Video file
   - Script/transcript
   - Assets (avatars, voices)

2. PROCESSING
   - Extract content/insights
   - Generate variations
   - Create platform-specific versions

3. GENERATION
   - Generate all artifacts in parallel
   - Quality check each output
   - Format optimization

4. DISTRIBUTION
   - Upload to platforms
   - Email notification
   - Google Drive backup
   - Repository documentation

5. MONETIZATION
   - Sales page activation
   - Affiliate links
   - Ad integration
```

## API Keys Required

See `docs/bom/SECRETS_BOM.md` for full list of required secrets.

## Quick Start

```bash
# Run artifact generator
./scripts/video-production/generate-artifacts.sh --input video.mp4 --type linkedin

# Generate specific artifact
./scripts/video-production/generate-artifacts.sh --input video.mp4 --artifact website

# Generate all artifacts
./scripts/video-production/generate-artifacts.sh --input video.mp4 --all
```

## Configuration

Edit `scripts/video-production/config.sh` to configure:
- Output directories
- API keys (from environment)
- Platform-specific settings
- Notification preferences
