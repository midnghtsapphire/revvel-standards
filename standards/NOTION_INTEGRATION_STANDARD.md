# Notion Integration Standard

**Purpose:** Notion as documentation, templates, and knowledge base hub
**Status:** Active - Amplitude → Notion sync configured, templates available
**Updated:** 2026-06-15

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     NOTION (Documentation & Templates)           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ WR Templates│  │ Team Wiki   │  │ Project DB  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
        │                 │                  │
        ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LOVABLE (UI Builder)                         │
│  Read Notion docs → Generate UI → Sync to GitHub                 │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LINEAR (Project Tracking)                    │
│  Issues created → Status updates → Completion                    │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     JULES (Code Generation)                      │
│  PRs created → Reviews → Merges                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notion + Lovable Integration

### Connect Notion to Lovable
1. Go to **Lovable → Connectors → Chat connectors**
2. Click **Notion**
3. Authorize with Notion
4. Now Lovable can read your Notion workspace!

### Build from Notion Docs
```text
Notion PRD page
  ↓ (Lovable reads)
Lovable generates code
  ↓
GitHub PR created
  ↓
Jules reviews + refines
```

### Example Prompt
```text
Build a dashboard based on the requirements in our Notion workspace:
- PRDs are in /Projects/CL4R1T4S Dashboard
- Use the design system from /Design System
- Follow the templates in /Templates
```

---

## Notion Templates for WR Processing

### 1. Work Request Template
```notion
┌─────────────────────────────────────────┐
│ Work Request                            │
├─────────────────────────────────────────┤
│ Title: [WR] CL4R1T4S Dashboard          │
│ Status: Backlog → In Progress → Done    │
│ Type: production-app                    │
│ Priority: High                          │
│ Area: UI                                │
├─────────────────────────────────────────┤
│ Requirements:                           │
│ - Real-time data display                │
│ - Interactive charts                    │
│ - Mobile responsive                     │
├─────────────────────────────────────────┤
│ Linked Notion Pages:                    │
│ - Design specs                          │
│ - User research                         │
│ - Technical notes                       │
└─────────────────────────────────────────┘
```

### 2. Project Wiki Template
```notion
┌─────────────────────────────────────────┐
│ Project: [Name]                         │
├─────────────────────────────────────────┤
│ Overview                                │
│ - Problem statement                     │
│ - Solution                              │
│ - Success metrics                       │
├─────────────────────────────────────────┤
│ Requirements                            │
│ - Must have                             │
│ - Should have                           │
│ - Nice to have                          │
├─────────────────────────────────────────┤
│ Design                                  │
│ - Figma links                           │
│ - Component specs                       │
│ - Color palette                         │
├─────────────────────────────────────────┤
│ Development                             │
│ - Tech stack                            │
│ - API docs                              │
│ - Deployment notes                      │
└─────────────────────────────────────────┘
```

### 3. Sprint Retrospective Template
```notion
┌─────────────────────────────────────────┐
│ Sprint Retrospective - [Date]           │
├─────────────────────────────────────────┤
│ What went well:                         │
│ - Item 1                                │
│ - Item 2                                │
├─────────────────────────────────────────┤
│ What could improve:                     │
│ - Item 1                                │
│ - Item 2                                │
├─────────────────────────────────────────┤
│ Action items:                           │
│ - [ ] Task 1 → Owner                   │
│ - [ ] Task 2 → Owner                   │
└─────────────────────────────────────────┘
```

---

## Notion Database for WR Tracking

### Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | Title | WR name |
| Status | Select | Backlog, Todo, In Progress, Review, Done |
| Type | Select | production-app, feature, fix, research |
| Priority | Select | Urgent, High, Medium, Low |
| Area | Multi-select | UI, Backend, API, Docs |
| GitHub Issue | URL | Link to GitHub issue |
| Linear Issue | URL | Link to Linear issue |
| Assignee | Person | Owner |
| Due Date | Date | Target date |
| Tags | Multi-select | Various tags |

### Views
- **Board**: Kanban by Status
- **Table**: Full list with all properties
- **Calendar**: By Due Date
- **Gallery**: By Type

---

## Workflow: Notion → Lovable → GitHub → Linear

### Step 1: Create WR in Notion
```text
Notion database → New entry
  ↓
Fill template (title, requirements, design links)
  ↓
GitHub Actions detects new entry
```

### Step 2: Trigger Lovable Build
```yaml
# .github/workflows/notion-to-lovable.yml
name: Notion → Lovable
on:
  schedule:
    - cron: '*/15 * * * *'  # Check every 15 min
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    env:
      NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
      LOVABLE_API_KEY: ${{ secrets.LOVABLE_API_KEY }}
    steps:
      - name: Query Notion for pending WRs
        id: query
        run: |
          # Get WRs with status "Ready for Build"
          curl -s -X POST "https://api.notion.com/v1/databases/{DATABASE_ID}/query" \
            -H "Authorization: Bearer $NOTION_API_KEY" \
            -H "Notion-Version: 2022-06-28" \
            -d '{"filter": {"property": "Status", "select": {"equals": "Ready for Build"}}}' | \
            jq '.results[] | {id, title: .properties.Name.title[0].text.content}'

      - name: Trigger Lovable build
        for each WR:
          curl -X POST "https://api.lovable.dev/v1/projects" \
            -H "Authorization: Bearer $LOVABLE_API_KEY" \
            -d '{"name": "WR - ${{ title }}", "prompt": "${{ requirements }}"}'

      - name: Update Notion status
        run: |
          # Mark WR as "Building"
          curl -X PATCH "https://api.notion.com/v1/pages/{PAGE_ID}" \
            -H "Authorization: Bearer $NOTION_API_KEY" \
            -d '{"properties": {"Status": {"select": {"name": "Building"}}}}'
```

### Step 3: Lovable Generates Code
```text
Lovable reads Notion requirements
  ↓
Generates code
  ↓
Syncs to GitHub branch
  ↓
Opens PR
```

### Step 4: Jules Reviews
```text
PR opened
  ↓
Jules reviews code
  ↓
BITO AI reviews
  ↓
Human approves
```

### Step 5: Merge → Update Linear + Notion
```text
PR merged
  ↓
GitHub Actions:
  - Updates Linear issue to Done
  - Updates Notion WR to Done
  - Posts completion notes
```

---

## Notion + Amplitude Integration (Active)

Already configured in `.github/workflows/amplitude-to-notion.yml`:
```yaml
# Daily sync at 13:07 UTC
schedule:
  - cron: 7 13 * * *
```

Syncs:
- Product analytics from Amplitude
- To Notion database for tracking
- Dashboard metrics

---

## Getting Started with Notion

### 1. Create Notion Integration
1. Go to <https://www.notion.so/my-integrations>
2. Click **New integration**
3. Name it (e.g., "Revvel Standards")
4. Select workspace
5. Copy the integration token

### 2. Add to GitHub Secrets
```text
NOTION_API_KEY = ntn_xxxxxxxxxxxxxxxxxxxx
```

### 3. Share Notion Pages
1. Open the page/database in Notion
2. Click **...** menu → **Add connections**
3. Select your integration

### 4. Get Database ID
```text
Notion database URL: https://notion.so/workspace/DATABASE_ID?v=...
Database ID: DATABASE_ID (32 chars, with hyphens)
```

---

## Related Files

- `.github/workflows/amplitude-to-notion.yml` - Amplitude sync
- `standards/LINEAR_JULES_LOVABLE_INTEGRATION.md` - Full workflow
- `standards/LOVABLE_INTEGRATION_STANDARD.md` - Lovable docs
- [Notion API Docs](https://developers.notion.com/reference/intro)

---

## Notion + Lovable Best Practices

1. **Keep PRDs in Notion** - Lovable can read them directly
2. **Use templates** - Consistent structure across WRs
3. **Link designs** - Include Figma/Notion design links
4. **Track metrics** - Amplitude → Notion → Dashboard

---

**Last Updated:** 2026-06-15
