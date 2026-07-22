# MCP Server Integration Standard

**Version:** 1.0.0  
**Date:** April 12, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Model Context Protocol (MCP) is the universal open standard for connecting AI models to external tools, data sources, and services. Every Revvel and MIDNGHTSAPPHIRE project **must** configure MCP servers to unlock full AI coding agent capabilities across databases, search, finance, communication, memory, productivity, filesystem, code execution, and creative design.

MCP servers are configured at the project root in `.mcp.json` and consumed automatically by Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, and all other AI coding agents.

---

## 2. Quick Start

```bash
# From your project root, run the Revvel MCP setup script
bash ../revvel-standards/scripts/setup-mcp.sh <project-type>
# project-type: minimal | web | mobile | full
# Example:
bash ../revvel-standards/scripts/setup-mcp.sh web
```

This copies the correct `.mcp.json` template and `.env.mcp.example` into your project. Fill in the secrets in `.env` and you are live.

---

## 3. Configuration Files

Templates are stored in `revvel-standards/templates/mcp/`. Copy the appropriate one to your project root as `.mcp.json`.

| Template | Servers Included | Use Case |
|---|---|---|
| `mcp.full.json` | All 33 servers | Maximum capability — use for full-stack projects |
| `mcp.web.json` | 19 servers | Web apps — DB, search, memory, productivity, filesystem, coding, creative |
| `mcp.mobile.json` | 15 servers | Mobile/Expo apps — DB, search, memory, communication, filesystem, creative |
| `mcp.minimal.json` | 8 servers | Lightweight — DB, search, memory, filesystem only |

---

## 4. The 33 Standard MCP Servers

### 4.1. Database Servers

These servers provide AI models with direct read/write access to databases. Use them for natural-language SQL queries, schema inspection, data analysis, and migrations.

#### 1. Postgres MCP Server

- **Repository:** `servers/src/postgres` ([@modelcontextprotocol/server-postgres](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-postgres`
- **Required Env:** `DATABASE_URL` (PostgreSQL connection string)
- **Use Case:** Primary Revvel database. All apps using PostgreSQL must enable this.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
  }
  ```

#### 2. SQLite MCP Server

- **Repository:** `servers/src/sqlite` ([@modelcontextprotocol/server-sqlite](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-sqlite`
- **Required Env:** `SQLITE_DB_PATH` (path to `.db` file)
- **Use Case:** Lightweight, single-tenant tools, local dev, CLI tools.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "${SQLITE_DB_PATH}"]
  }
  ```

#### 3. MongoDB MCP Server

- **Repository:** [kiliczsh/mcp-mongo-server](https://github.com/kiliczsh/mcp-mongo-server)
- **Package:** `mcp-mongo-server`
- **Required Env:** `MONGODB_URI`
- **Use Case:** NoSQL document stores, event logs, unstructured data.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "mcp-mongo-server", "${MONGODB_URI}"]
  }
  ```

#### 4. ClickHouse MCP Server

- **Repository:** [ClickHouse/mcp-clickhouse](https://github.com/ClickHouse/mcp-clickhouse)
- **Package:** `mcp-clickhouse` (Python/uvx)
- **Required Env:** `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE`
- **Use Case:** High-performance analytics, time-series data, large-scale reporting.
- **Command:**

  ```json
  {
    "command": "uvx",
    "args": ["mcp-clickhouse"],
    "env": {
      "CLICKHOUSE_HOST": "${CLICKHOUSE_HOST}",
      "CLICKHOUSE_PORT": "${CLICKHOUSE_PORT}",
      "CLICKHOUSE_USER": "${CLICKHOUSE_USER}",
      "CLICKHOUSE_PASSWORD": "${CLICKHOUSE_PASSWORD}",
      "CLICKHOUSE_DATABASE": "${CLICKHOUSE_DATABASE}"
    }
  }
  ```

---

### 4.2. Search Servers

Give AI agents live internet access to defeat knowledge cutoffs and hallucination.

#### 5. DuckDuckGo MCP Server

- **Repository:** [nickclyde/duckduckgo-mcp-server](https://github.com/nickclyde/duckduckgo-mcp-server)
- **Package:** `duckduckgo-mcp-server`
- **Required Env:** None (no API key required)
- **Use Case:** Privacy-first web search, no API key needed. Default search server.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "duckduckgo-mcp-server"]
  }
  ```

#### 6. Tavily MCP

- **Repository:** [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp)
- **Package:** `@tavily/mcp`
- **Required Env:** `TAVILY_API_KEY`
- **Use Case:** Fast, structured JSON search results optimized for AI agents. Use when DuckDuckGo results are insufficient.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@tavily/mcp"],
    "env": { "TAVILY_API_KEY": "${TAVILY_API_KEY}" }
  }
  ```

#### 7. Google News MCP Server

- **Repository:** [ChanMeng666/server-google-news](https://github.com/ChanMeng666/server-google-news)
- **Package:** `server-google-news`
- **Required Env:** None
- **Use Case:** News headlines, article research, trend monitoring, marketing content ideas.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "server-google-news"]
  }
  ```

#### 8. Brave Search MCP Server

- **Repository:** `servers/src/brave-search` ([@modelcontextprotocol/server-brave-search](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-brave-search`
- **Required Env:** `BRAVE_API_KEY`
- **Use Case:** Privacy-respecting web search with images, news, and video support.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" }
  }
  ```

#### 9. MeiliSearch MCP Server

- **Repository:** `mcp-servers/meilisearch-mcp` (revvel-standards/mcp-servers/meilisearch-mcp)
- **Package:** `meilisearch-mcp` (Python)
- **Required Env:** `MEILI_HOST`, `MEILI_KEY`
- **Use Case:** **HIGH PRIORITY** — Product/user-facing search with instant results, typo tolerance, and relevance tuning. Revenue blocker (search affects conversions).
- **Tools Available:**
  - `meili_index_create` — Create a search index
  - `meili_index_list` — List all indexes
  - `meili_index_delete` — Delete an index
  - `meili_documents_add` — Add/update documents in bulk
  - `meili_documents_search` — Search with filters and ranking
  - `meili_documents_get` — Retrieve a document by ID
  - `meili_settings_update` — Configure search relevance, typo tolerance, ranking rules
  - `meili_health` — Check MeiliSearch instance health
- **Setup:**
  1. **Self-hosted:** Install MeiliSearch locally or on DigitalOcean: <https://www.meilisearch.com/docs/learn/getting_started/quick_start>
  2. **MeiliCloud:** Sign up at <https://www.meilisearch.com/cloud> (free tier available)
  3. Install the MCP server:

     ```bash
     cd mcp-servers/meilisearch-mcp
     pip install -e .
     ```

  4. Set environment variables in `.env`:

     ```bash
     MEILI_HOST=http://localhost:7700  # or your MeiliCloud URL
     MEILI_KEY=yourMasterKey
     ```

- **Command:**

  ```json
  {
    "command": "python",
    "args": ["-m", "meilisearch_mcp.server"],
    "env": {
      "MEILI_HOST": "${MEILI_HOST}",
      "MEILI_KEY": "${MEILI_KEY}"
    }
  }
  ```

- **Integration Example:**

  ```python
  # Sync product data to MeiliSearch
  import meilisearch
  client = meilisearch.Client('http://localhost:7700', 'masterKey')
  index = client.index('products')
  
  # Add products
  products = [
    {'id': 1, 'name': 'Soul Bowl', 'category': 'entree', 'price': 1295},
    {'id': 2, 'name': 'Fried Rice', 'category': 'side', 'price': 595}
  ]
  index.add_documents(products)
  
  # Configure search settings
  index.update_settings({
    'searchableAttributes': ['name', 'category', 'description'],
    'filterableAttributes': ['category', 'price'],
    'sortableAttributes': ['price', 'name']
  })
  
  # Search (instant results, typo tolerant)
  results = index.search('soul bowls')  # finds "Soul Bowl" even with typo
  ```

---

### 4.3. Finance Servers

For Revvel's investment tools, crypto features, Penny Sovereign Yield Scout, and any financial app.

#### 9. Investor Agent MCP Server

- **Repository:** [ferdousbhai/investor-agent](https://github.com/ferdousbhai/investor-agent)
- **Package:** `investor-agent` (Python/uvx)
- **Required Env:** None (uses free public data sources)
- **Use Case:** Stock analysis, financial insights, investment research, portfolio suggestions.
- **Command:**

  ```json
  {
    "command": "uvx",
    "args": ["investor-agent"]
  }
  ```

#### 10. Coincap MCP Server

- **Repository:** [QuantGeekDev/coincap-mcp](https://github.com/QuantGeekDev/coincap-mcp)
- **Package:** `coincap-mcp`
- **Required Env:** None (free public API)
- **Use Case:** Real-time cryptocurrency prices, market cap, volume data.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "coincap-mcp"]
  }
  ```

#### 11. CoinMarketCap MCP Server

- **Repository:** [anjor/coinmarket-mcp-server](https://github.com/anjor/coinmarket-mcp-server)
- **Package:** `coinmarket-mcp-server`
- **Required Env:** `COINMARKETCAP_API_KEY`
- **Use Case:** Professional-grade crypto market data — prices, rankings, historical data.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "coinmarket-mcp-server"],
    "env": { "COINMARKETCAP_API_KEY": "${COINMARKETCAP_API_KEY}" }
  }
  ```

#### 12. Alpha Vantage MCP Server

- **Repository:** [berlinbra/alpha-vantage-mcp](https://github.com/berlinbra/alpha-vantage-mcp)
- **Package:** `alpha-vantage-mcp`
- **Required Env:** `ALPHA_VANTAGE_API_KEY` (free tier available)
- **Use Case:** Stocks, forex, commodities, economic indicators — the backbone for Penny Sovereign Yield Scout.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "alpha-vantage-mcp"],
    "env": { "ALPHA_VANTAGE_API_KEY": "${ALPHA_VANTAGE_API_KEY}" }
  }
  ```

---

### 4.4. Communication Servers

Automate messaging, manage conversations, and integrate team communication tools.

#### 13. Slack MCP Server

- **Repository:** `servers/src/slack` ([@modelcontextprotocol/server-slack](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-slack`
- **Required Env:** `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`
- **Use Case:** Post alerts, read channels, manage workspace communication.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-slack"],
    "env": {
      "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
      "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
    }
  }
  ```

#### 14. Telegram MCP Server

- **Repository:** [chaindead/telegram-mcp](https://github.com/chaindead/telegram-mcp)
- **Package:** Go binary (`telegram-mcp`)
- **Required Env:** `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_PHONE`
- **Use Case:** Telegram bot management, message automation, chat monitoring.
- **Command:**

  ```json
  {
    "command": "telegram-mcp",
    "env": {
      "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
      "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}",
      "TELEGRAM_PHONE": "${TELEGRAM_PHONE}"
    }
  }
  ```

#### 15. Google GSuite MCP Server

- **Repository:** [MarkusPfundstein/mcp-gsuite](https://github.com/MarkusPfundstein/mcp-gsuite)
- **Package:** `mcp-gsuite` (Python/uvx)
- **Required Env:** `GSUITE_CLIENT_ID`, `GSUITE_CLIENT_SECRET`, `GSUITE_REFRESH_TOKEN`
- **Use Case:** Gmail, Calendar, Drive integration — read/write email, manage calendar events, access files.
- **Command:**

  ```json
  {
    "command": "uvx",
    "args": ["mcp-gsuite"],
    "env": {
      "GSUITE_CLIENT_ID": "${GSUITE_CLIENT_ID}",
      "GSUITE_CLIENT_SECRET": "${GSUITE_CLIENT_SECRET}",
      "GSUITE_REFRESH_TOKEN": "${GSUITE_REFRESH_TOKEN}"
    }
  }
  ```

#### 16. WhatsApp MCP Server

- **Repository:** [lharries/whatsapp-mcp](https://github.com/lharries/whatsapp-mcp)
- **Package:** Go binary (`whatsapp-mcp`)
- **Required Env:** `WHATSAPP_DB_PATH` (path to WhatsApp database)
- **Use Case:** Read/search WhatsApp messages, manage conversations programmatically.
- **Command:**

  ```json
  {
    "command": "whatsapp-mcp",
    "env": {
      "WHATSAPP_DB_PATH": "${WHATSAPP_DB_PATH}"
    }
  }
  ```

---

### 4.5. Knowledge & Memory Servers

Persistent memory and knowledge graphs. Required for all AI agents to maintain context across sessions.

#### 17. MemoryMesh MCP Server

- **Repository:** [CheMiguel23/MemoryMesh](https://github.com/CheMiguel23/MemoryMesh)
- **Package:** `memorymesh`
- **Required Env:** None
- **Use Case:** Structured knowledge graphs — user preferences, project context, long-term agent memory.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "memorymesh"]
  }
  ```

#### 18. Graphlit MCP Server

- **Repository:** [graphlit/graphlit-mcp-server](https://github.com/graphlit/graphlit-mcp-server)
- **Package:** `graphlit-mcp-server`
- **Required Env:** `GRAPHLIT_ORGANIZATION_ID`, `GRAPHLIT_ENVIRONMENT_ID`, `GRAPHLIT_JWT_SECRET`
- **Use Case:** Ingest, organize, and retrieve documents — great for large knowledge bases.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "graphlit-mcp-server"],
    "env": {
      "GRAPHLIT_ORGANIZATION_ID": "${GRAPHLIT_ORGANIZATION_ID}",
      "GRAPHLIT_ENVIRONMENT_ID": "${GRAPHLIT_ENVIRONMENT_ID}",
      "GRAPHLIT_JWT_SECRET": "${GRAPHLIT_JWT_SECRET}"
    }
  }
  ```

#### 19. Mem0 MCP Server

- **Repository:** [mem0ai/mem0-mcp](https://github.com/mem0ai/mem0-mcp)
- **Package:** `mem0-mcp`
- **Required Env:** `MEM0_API_KEY`
- **Use Case:** Long-term AI memory — remembers user preferences, personalization context.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "mem0-mcp"],
    "env": { "MEM0_API_KEY": "${MEM0_API_KEY}" }
  }
  ```

#### 20. Memory MCP Server

- **Repository:** `servers/src/memory` ([@modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-memory`
- **Required Env:** None
- **Use Case:** Built-in MCP memory — entity/relation storage, fact persistence across conversations.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }
  ```

---

### 4.6. Productivity Servers

Note-taking, task management, calendars, calculations, and email management.

#### 21. Obsidian MCP Server

- **Repository:** [MarkusPfundstein/mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian)
- **Package:** `mcp-obsidian`
- **Required Env:** `OBSIDIAN_API_KEY`, `OBSIDIAN_HOST` (Obsidian Local REST API plugin required)
- **Use Case:** Read/write Obsidian vault notes — ideal for knowledge management and documentation workflows.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "mcp-obsidian"],
    "env": {
      "OBSIDIAN_API_KEY": "${OBSIDIAN_API_KEY}",
      "OBSIDIAN_HOST": "${OBSIDIAN_HOST}"
    }
  }
  ```

#### 22. Notion MCP Server

- **Repository:** [danhilse/notion_mcp](https://github.com/danhilse/notion_mcp)
- **Package:** `notion-mcp-server`
- **Required Env:** `NOTION_API_KEY`
- **Use Case:** Create/update Notion pages, manage databases, track project tasks.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "notion-mcp-server"],
    "env": { "NOTION_API_KEY": "${NOTION_API_KEY}" }
  }
  ```

#### 23. MCP Calculator Server

- **Repository:** [githejie/mcp-server-calculator](https://github.com/githejie/mcp-server-calculator)
- **Package:** `mcp-server-calculator`
- **Required Env:** None
- **Use Case:** Precise arithmetic and financial calculations without LLM hallucination.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "mcp-server-calculator"]
  }
  ```

#### 24. Inbox Zero MCP Server

- **Repository:** [inbox-zero/apps/mcp-server](https://github.com/elie222/inbox-zero)
- **Package:** `@inbox-zero/mcp`
- **Required Env:** `INBOX_ZERO_API_KEY`
- **Use Case:** Automated email management, bulk actions, inbox decluttering.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@inbox-zero/mcp"],
    "env": { "INBOX_ZERO_API_KEY": "${INBOX_ZERO_API_KEY}" }
  }
  ```

---

### 4.7. Filesystem Servers

File and cloud storage management — create, read, update, delete, merge, and organize files.

#### 25. Filesystem MCP Server

- **Repository:** `servers/src/filesystem` ([@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-filesystem`
- **Required Env:** None (pass allowed directories as args)
- **Use Case:** Core local file operations — read/write/list files. Required for all projects.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "${PROJECT_ROOT}"]
  }
  ```

#### 26. Google Drive MCP Server

- **Repository:** `servers/src/gdrive` ([@modelcontextprotocol/server-gdrive](https://github.com/modelcontextprotocol/servers))
- **Package:** `@modelcontextprotocol/server-gdrive`
- **Required Env:** `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`
- **Use Case:** Read/write Google Drive files, search documents, manage shared assets.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-gdrive"],
    "env": {
      "GDRIVE_CLIENT_ID": "${GDRIVE_CLIENT_ID}",
      "GDRIVE_CLIENT_SECRET": "${GDRIVE_CLIENT_SECRET}",
      "GDRIVE_REFRESH_TOKEN": "${GDRIVE_REFRESH_TOKEN}"
    }
  }
  ```

#### 27. MCP File Merger Server

- **Repository:** [exoticknight/mcp-file-merger](https://github.com/exoticknight/mcp-file-merger)
- **Package:** `mcp-file-merger`
- **Required Env:** None
- **Use Case:** Combine multiple files into a single output — useful for generating consolidated reports or merged code files.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "mcp-file-merger"]
  }
  ```

#### 28. Filesystem Go MCP Server

- **Repository:** [mark3labs/mcp-filesystem-server](https://github.com/mark3labs/mcp-filesystem-server)
- **Package:** Go binary (`mcp-filesystem-server`)
- **Required Env:** None
- **Use Case:** High-performance Go-based filesystem operations — use for large codebases where Node.js performance is insufficient.
- **Command:**

  ```json
  {
    "command": "mcp-filesystem-server",
    "args": ["${PROJECT_ROOT}"]
  }
  ```

---

### 4.8. Coding Servers

Code execution, generation, debugging, and semantic editing.

#### 29. Python MCP Server

- **Repository:** [pydantic-ai/mcp-run-python](https://github.com/pydantic/pydantic-ai)
- **Package:** `mcp-run-python` (Python/uvx)
- **Required Env:** None
- **Use Case:** Execute Python code at runtime — data analysis, chart generation, scripting, automation.
- **Command:**

  ```json
  {
    "command": "uvx",
    "args": ["mcp-run-python"]
  }
  ```

#### 30. JavaScript MCP Server

- **Repository:** [yepcode/mcp-server-js](https://github.com/YepCode/mcp-server-js)
- **Package:** `@yepcode/mcp-server-js`
- **Required Env:** `YEPCODE_API_TOKEN`
- **Use Case:** Execute JavaScript/Node.js code in a sandboxed cloud environment.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@yepcode/mcp-server-js"],
    "env": { "YEPCODE_API_TOKEN": "${YEPCODE_API_TOKEN}" }
  }
  ```

#### 31. Desktop Commander MCP

- **Repository:** [wonderwhy-er/DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP)
- **Package:** `@wonderwhy-er/desktop-commander`
- **Required Env:** None
- **Use Case:** Run terminal commands, manage processes, edit files — a superset of filesystem operations.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@wonderwhy-er/desktop-commander"]
  }
  ```

#### 32. Serena MCP Server

- **Repository:** [oraios/serena](https://github.com/oraios/serena)
- **Package:** `serena` (Python/uvx)
- **Required Env:** None
- **Use Case:** Semantic code search and editing — understands code structure, not just text. Use for large codebase refactoring.
- **Command:**

  ```json
  {
    "command": "uvx",
    "args": ["serena", "--context", "ide-assistant", "--project", "${PROJECT_ROOT}"]
  }
  ```

---

### 4.9. Creative & Design Servers

Tools for creative work, design automation, and visual content generation.

#### 33. Adobe Express Developer MCP Server

- **Repository:** Adobe official (closed source)
- **Package:** `@adobe/express-developer-mcp`
- **Required Env:** None
- **Use Case:** Adobe Express Add-on development support — access SDK documentation, code examples, and API references directly in AI coding tools. Essential for building Adobe Express add-ons and extensions.
- **Command:**

  ```json
  {
    "command": "npx",
    "args": ["-y", "@adobe/express-developer-mcp"]
  }
  ```

---

## 5. Environment Variables Reference

All environment variables required by MCP servers. Copy from `templates/mcp/.env.mcp.example`.

### Database

| Variable | Server | Description |
|---|---|---|
| `DATABASE_URL` | Postgres | Full PostgreSQL connection string |
| `SQLITE_DB_PATH` | SQLite | Absolute path to `.db` file |
| `MONGODB_URI` | MongoDB | MongoDB connection string |
| `CLICKHOUSE_HOST` | ClickHouse | ClickHouse server hostname |
| `CLICKHOUSE_PORT` | ClickHouse | ClickHouse port (default: 8443) |
| `CLICKHOUSE_USER` | ClickHouse | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | ClickHouse | ClickHouse password |
| `CLICKHOUSE_DATABASE` | ClickHouse | ClickHouse database name |

### Search

| Variable | Server | Description |
|---|---|---|
| `BRAVE_API_KEY` | Brave Search | Brave Search API key (free tier available) |
| `TAVILY_API_KEY` | Tavily | Tavily AI search API key |

### Finance

| Variable | Server | Description |
|---|---|---|
| `COINMARKETCAP_API_KEY` | CoinMarketCap | CoinMarketCap API key |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage | Alpha Vantage API key (free tier: 25 req/day) |

### Communication

| Variable | Server | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | Slack | Slack bot OAuth token (`xoxb-...`) |
| `SLACK_TEAM_ID` | Slack | Slack workspace team ID |
| `TELEGRAM_API_ID` | Telegram | Telegram app API ID |
| `TELEGRAM_API_HASH` | Telegram | Telegram app API hash |
| `TELEGRAM_PHONE` | Telegram | Phone number in international format |
| `GSUITE_CLIENT_ID` | GSuite | Google OAuth client ID |
| `GSUITE_CLIENT_SECRET` | GSuite | Google OAuth client secret |
| `GSUITE_REFRESH_TOKEN` | GSuite | Google OAuth refresh token |
| `WHATSAPP_DB_PATH` | WhatsApp | Path to WhatsApp chat database |

### Memory & Knowledge

| Variable | Server | Description |
|---|---|---|
| `MEM0_API_KEY` | Mem0 | Mem0 platform API key |
| `GRAPHLIT_ORGANIZATION_ID` | Graphlit | Graphlit organization ID |
| `GRAPHLIT_ENVIRONMENT_ID` | Graphlit | Graphlit environment ID |
| `GRAPHLIT_JWT_SECRET` | Graphlit | Graphlit JWT signing secret |

### Productivity

| Variable | Server | Description |
|---|---|---|
| `OBSIDIAN_API_KEY` | Obsidian | Obsidian Local REST API key |
| `OBSIDIAN_HOST` | Obsidian | Obsidian Local REST API host (default: `http://localhost:27123`) |
| `NOTION_API_KEY` | Notion | Notion integration token |
| `INBOX_ZERO_API_KEY` | Inbox Zero | Inbox Zero API key |

### Cloud Storage

| Variable | Server | Description |
|---|---|---|
| `GDRIVE_CLIENT_ID` | Google Drive | Google Drive OAuth client ID |
| `GDRIVE_CLIENT_SECRET` | Google Drive | Google Drive OAuth client secret |
| `GDRIVE_REFRESH_TOKEN` | Google Drive | Google Drive OAuth refresh token |

### Coding

| Variable | Server | Description |
|---|---|---|
| `YEPCODE_API_TOKEN` | JavaScript MCP | YepCode cloud execution API token |
| `PROJECT_ROOT` | Filesystem / Serena | Absolute path to project root |

---

## 6. Project-Type Configuration Profiles

### Minimal Profile (8 servers)

For lightweight CLIs, scripts, and utilities that need basic AI augmentation.

Included: Postgres, SQLite, DuckDuckGo, Brave Search, Memory, Filesystem, Python MCP, Calculator

### Web Profile (18 servers)

For all Next.js/React/Node web applications.

Included: Postgres, SQLite, MongoDB, DuckDuckGo, Tavily, Google News, Brave Search, Slack, Memory, MemoryMesh, Mem0, Obsidian, Notion, Calculator, Filesystem, Google Drive, Python MCP, Desktop Commander

### Mobile Profile (14 servers)

For Expo/React Native mobile applications.

Included: Postgres, SQLite, DuckDuckGo, Tavily, Slack, Telegram, WhatsApp, Memory, MemoryMesh, Notion, Filesystem, Python MCP, Calculator, Desktop Commander

### Full Profile (32 servers)

Maximum capability — all servers enabled. For flagship products and Audrey's local development environment.

---

## 7. Security Rules for MCP

These rules are an extension of the [SECURITY_STANDARD.md](SECURITY_STANDARD.md).

1. **Never commit secrets.** All MCP server credentials must be in `.env` — never in `.mcp.json` itself.
2. **`.mcp.json` references `${ENV_VAR}`.** Configuration files contain only variable references, never real values.
3. **`.env` is always in `.gitignore`.** The `.env.mcp.example` file (with placeholders) is committed; the real `.env` never is.
4. **Restrict filesystem paths.** The Filesystem MCP server's allowed paths must be scoped to `${PROJECT_ROOT}` only — never `/` or `~`.
5. **Rotate credentials regularly.** API keys for Brave, Tavily, Alpha Vantage, etc. should be rotated quarterly.
6. **Disable unused servers.** If a project does not use a database type, remove that server from `.mcp.json` — do not leave unused servers configured.

---

## 8. Installation Guide

### Prerequisites

- **Node.js 20+** and **pnpm** (for npm-based servers)
- **Python 3.11+** and **uv** (for Python/uvx-based servers)
- **Go 1.22+** (only if using Go-binary servers: Telegram, WhatsApp, Filesystem Go)

### Install uv (Python fast runtime — required for Python servers)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Install Go MCP binaries (optional)

```bash
# Telegram MCP (Go)
go install github.com/chaindead/telegram-mcp@latest

# Filesystem Go MCP
go install github.com/mark3labs/mcp-filesystem-server@latest

# WhatsApp MCP — requires manual setup, see repo README
```

### Verify npm-based servers work

```bash
npx -y @modelcontextprotocol/server-memory --help
```

---

## 9. AI Agent Instructions for MCP

When working in a Revvel project, AI agents must:

1. **Check for `.mcp.json`** at the project root. If present, MCP servers are configured and available.
2. **Use the database MCP server** instead of suggesting raw SQL in comments — actually run queries.
3. **Use the search MCP servers** (DuckDuckGo, Tavily) to fetch current information before responding with potentially outdated answers.
4. **Use the memory MCP server** to persist relevant facts about the project across sessions.
5. **Use the filesystem MCP server** for all file operations rather than generating file content inline.
6. **Use the Python/JS MCP servers** to execute and test code snippets rather than guessing output.
7. **Never add credentials** to `.mcp.json` — always use `${ENV_VAR}` references.

---

## 10. Bootstrap Checklist for New Projects

When running `scripts/setup-mcp.sh` on a new project, the following steps are performed automatically. Verify completion:

- [ ] `.mcp.json` copied from `templates/mcp/mcp.<profile>.json` to project root
- [ ] `.env.mcp.example` copied to project root
- [ ] `.env` updated with real credentials (manual step)
- [ ] `.gitignore` updated to include `.env` (if not already)
- [ ] `uv` installed (if Python servers selected)
- [ ] Project type documented in `SYSTEM_STATE.md` under MCP section

---

## 11. Building Custom MCP Servers with FastMCP

Every Revvel project that exposes business logic to AI agents should package that logic as a custom MCP server using **FastMCP** — the de facto Python-native framework for building MCP servers and clients.

### 11.1. What Is FastMCP

FastMCP ([jlowin/fastmcp](https://github.com/jlowin/fastmcp) · [gofastmcp.com](https://gofastmcp.com)) is the officially recommended Python framework for building MCP servers. It is maintained by Prefect and provides:

- **Decorator-based tool/resource definition** — `@mcp.tool`, `@mcp.resource`, `@mcp.prompt`
- **Automatic schema generation and parameter validation** — no manual JSON schema writing
- **Full async support** — sync and async tools work interchangeably
- **Multi-transport** — STDIO (Claude Desktop/Cursor), HTTP, and Server-Sent Events (SSE)
- **Built-in MCP client SDK** — test your server from Python
- **CLI utilities** — `fastmcp run`, `fastmcp dev`, `fastmcp install`
- **Production-ready** — OAuth/token auth, Docker, OpenAPI integration

### 11.2. When to Build a Custom Server

Build a custom FastMCP server when:

- The project has domain-specific business logic that AI agents should invoke (e.g., Penny Sovereign yield calculations, lead scoring, insurance quoting)
- You need to wrap an internal API that has no public MCP server
- You want to expose a project's database queries as typed, documented tools
- You are building an agent pipeline and need a custom orchestration layer

### 11.3. Installation

```bash
# Install with uv (preferred — matches Revvel Python standard)
uv pip install fastmcp

# Or with pip
pip install fastmcp
```

### 11.4. Standard Custom Server Template

See `templates/mcp/custom-server/server.py` for the Revvel starter template. Every custom MCP server must follow this structure:

```python
from fastmcp import FastMCP
import os

mcp = FastMCP(
    name="[APP_NAME] MCP Server",
    instructions="Describe what this server does and when agents should use it."
)

# --- Tools (actions the agent can take) ---
@mcp.tool
def example_tool(param: str) -> dict:
    """One-line description used as the tool's docstring by AI agents."""
    return {"result": param}

# --- Resources (read-only data sources) ---
@mcp.resource("data://status")
def get_status() -> dict:
    """Return current service status."""
    return {"status": "operational"}

# --- Entry point ---
if __name__ == "__main__":
    mcp.run()
```

### 11.5. Running and Installing

```bash
# Dev mode (auto-reload on file changes)
fastmcp dev server.py

# Run directly
fastmcp run server.py

# Install into Claude Desktop config automatically
fastmcp install server.py --name "[APP_NAME] MCP"

# Install with environment variables
fastmcp install server.py --name "[APP_NAME] MCP" -e DATABASE_URL -e API_KEY
```

### 11.6. Adding to `.mcp.json`

After building, register the custom server in the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "[app_name]-custom": {
      "command": "uvx",
      "args": ["--from", ".", "[app_name]-mcp"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

Or for development (running from source):

```json
{
  "mcpServers": {
    "[app_name]-custom": {
      "command": "uv",
      "args": ["run", "python", "mcp_server/server.py"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### 11.7. Custom Server File Structure

Place all custom MCP server code in `mcp_server/` within the project:

```text
[project-root]/
  mcp_server/
    __init__.py
    server.py          # FastMCP entry point
    tools/
      __init__.py
      [domain].py      # Domain-specific tool modules
    resources/
      __init__.py
      [domain].py      # Read-only data resources
    pyproject.toml     # Package metadata (if deploying as package)
  .mcp.json            # Registers this server + all standard servers
  .env                 # Real credentials (gitignored)
  .env.mcp.example     # Placeholder env vars (committed)
```

### 11.8. FastMCP Best Practices

- **Type everything.** FastMCP uses Python type hints to generate schemas — always annotate parameters and return types.
- **Document every tool.** The docstring becomes the tool description that AI agents read. Write it for an agent, not a human developer.
- **Keep tools atomic.** One tool does one thing. Agents compose tools; you don't need to pre-compose them.
- **Use resources for reads.** If a tool only reads data and has no side effects, make it a `@mcp.resource`, not a `@mcp.tool`.
- **Never hardcode secrets.** Load all credentials from `os.environ`. The `fastmcp install` command passes env vars securely.
- **Test with the client SDK.** Use `fastmcp.Client` in tests to verify tools work end-to-end before deploying.

---

## 12. Revvel Custom MCP Servers

The MIDNGHTSAPPHIRE GitHub organization maintains custom MCP servers built specifically for the Revvel ecosystem. Every project **must** include the two production-ready custom servers. The MCT microservice modules are added per project domain.

For the full audit of all 22 repos see: [`docs/MCP_REVVEL_CATALOG.md`](../MCP_REVVEL_CATALOG.md)

### 12.1. The Two Must-Have Custom Servers

These two are **mandatory in every Revvel project** — include them in any profile alongside the standard servers.

#### `rvvel-affiliate-links-mcp`

- **Repo:** [midnghtsapphire/rvvel-affiliate-links-mcp](https://github.com/midnghtsapphire/rvvel-affiliate-links-mcp)
- **Transport:** stdio · **Backend:** SQLite (self-contained) · **No env vars required**
- **8 Tools:** `store_affiliate_link`, `get_affiliate_links`, `get_best_link`, `search_links`, `get_stats`, `track_click`, `track_conversion`, `export_links`
- **Use case:** AI agents call `get_best_link` or `search_links` to automatically insert real, tracked affiliate links into any content, recommendation, or product page.
- **Config:**

  ```json
  "rvvel-affiliate-links": {
    "command": "npx",
    "args": ["rvvel-affiliate-links-mcp"]
  }
  ```

#### `code-review-mcp-server`

- **Repo:** [midnghtsapphire/code-review-mcp-server](https://github.com/midnghtsapphire/code-review-mcp-server)
- **Transport:** stdio · **No database** (scans filesystem in-process)
- **10 Tools:** `scan_nested_anchors`, `check_react_best_practices`, `validate_typescript`, `scan_accessibility`, `detect_security_issues`, `analyze_performance`, `generate_quality_report`, `validate_deployment_readiness`, `integrate_coderabbit`, `send_slack_report`
- **Use case:** Enforce the Dev→Test→Live deployment gate. Run `validate_deployment_readiness` before every push to `main`.
- **Config:**

  ```json
  "code-review": {
    "command": "node",
    "args": ["${CODE_REVIEW_MCP_PATH}/dist/index.js"]
  }
  ```

- **Setup:**

  ```bash
  git clone https://github.com/midnghtsapphire/code-review-mcp-server ~/mct/code-review
  cd ~/mct/code-review && npm install && npm run build
  # Set CODE_REVIEW_MCP_PATH=~/mct/code-review in .env
  ```

### 12.2. MCT Microservice Modules

The 20 `MCP-*` repos are the InTheWild platform microservice suite. Each is a TypeScript/Express REST API containerized with Docker, with a partial or complete `@modelcontextprotocol/sdk` layer.

**Modules with MCP tools fully implemented (add to projects that need them):**

| Module | Repo | Tools | Domain |
|---|---|---|---|
| MCP-ANALYTICS | [midnghtsapphire/MCP-ANALYTICS](https://github.com/midnghtsapphire/MCP-ANALYTICS) | `get_analytics_data` | Event tracking, user analytics |
| MCP-SUBSCRIPTION | [midnghtsapphire/MCP-SUBSCRIPTION](https://github.com/midnghtsapphire/MCP-SUBSCRIPTION) | `getSubscriptions` | Subscription lifecycle |
| MCP-ADMIN-DASHBOARD | [midnghtsapphire/MCP-ADMIN-DASHBOARD](https://github.com/midnghtsapphire/MCP-ADMIN-DASHBOARD) | `getUsers`, `addUser` | Admin user management |
| MCP-CUSTOMER-SUPPORT | [midnghtsapphire/MCP-CUSTOMER-SUPPORT](https://github.com/midnghtsapphire/MCP-CUSTOMER-SUPPORT) | `fetchCustomerData` | Customer data retrieval |
| MCP-USER-DASHBOARD | [midnghtsapphire/MCP-USER-DASHBOARD](https://github.com/midnghtsapphire/MCP-USER-DASHBOARD) | `getUserData`, `updateUserData` | User profile management |
| MCP-WEBSITE-GENERATOR | [midnghtsapphire/MCP-WEBSITE-GENERATOR](https://github.com/midnghtsapphire/MCP-WEBSITE-GENERATOR) | `generateWebsite` | AI website generation |
| MCP-CONTENT-CALENDAR | [midnghtsapphire/MCP-CONTENT-CALENDAR](https://github.com/midnghtsapphire/MCP-CONTENT-CALENDAR) | (connected, tools pending) | Content scheduling |

**Modules with partial MCP implementation (REST API works, tools need completion):**

MCP-AUTH, MCP-PAYMENT, MCP-AFFILIATE, MCP-SEO-ACCESSIBILITY, MCP-EMAIL-MARKETING, MCP-AD-CAMPAIGN, MCP-BRANDING, MCP-AB-TESTING, MCP-CODE-REVIEW, MCP-DATA-MANAGEMENT

**Not yet audited:** MCP-REPORTS, MCP-KUBERNETES, MCP-LOCALIZATION, MCP-SOFTWARE-DISCOVERY

### 12.3. Adding MCT Modules to `.mcp.json`

Build from source (development):

```bash
git clone https://github.com/midnghtsapphire/MCP-ANALYTICS ~/mct/analytics
cd ~/mct/analytics && npm install && npm run build
```

Then add to `.mcp.json`:

```json
"mct-analytics": {
  "command": "node",
  "args": ["${MCT_ANALYTICS_PATH}/dist/index.js"],
  "env": { "MONGODB_URI": "${MONGODB_URI}" }
}
```

For all custom Revvel servers in one config block, use `templates/mcp/mcp.revvel-custom.json`.

### 12.4. Critical Fix Required: Hardcoded Credentials

**P0 Security Issue:** Multiple MCT modules have hardcoded database credentials in `src/db/schema.ts` (e.g., `password: 'password'`, localhost connection strings). Before running any MCT module in any non-local environment, these must be replaced with `process.env.DATABASE_URL` or equivalent. This is a known issue tracked in [`docs/MCP_REVVEL_CATALOG.md`](../MCP_REVVEL_CATALOG.md).

---

## 13. Updating This Standard

When adding new MCP servers to the Revvel ecosystem:

1. Add the server entry to Section 4 with full documentation
2. Add env vars to Section 5
3. Update the relevant profile configs in Section 6
4. Update `templates/mcp/mcp.full.json` and the appropriate profile template
5. Update `scripts/setup-mcp.sh` to install any new dependencies
6. Update `MASTER_APP_TEMPLATE.md` if the server affects the default project template
7. Bump this document's version number

## MCP Image Prompts

For marketing and landing pages for MCP servers, the following image generation prompts have proven effective:

### Prompt 1: The MCP Server Node & Context Stream (Connected & Real-time)

> A cinematic hero shot of an ultra-modern landing page for a Model Context Protocol (MCP) server integration engine. The interface features a central glassmorphic terminal hub floating over a deep charcoal and navy background. Radiant, glowing circuit lines and translucent data pipelines extend outwards from the terminal, connecting to smaller, semi-transparent frosted glass modules representing diverse data sources and enterprise tools. Crisp, glowing neon-blue and amber monospaced text streams display real-time context exchanges and tool-calling scripts. Soft atmospheric haze drifts between the floating UI layers, catching sharp, brilliant rim lighting on the refractive, glossy glass edges. Photorealistic, 8k resolution, elegant 3D realism, hyper-detailed cloud architecture visualization.

### Prompt 2: The MCP Host Hub & File/Tool Execution (Sleek Developer View)

> A close-up cinematic shot of a developer landing page for an advanced MCP host ecosystem. The central focus is a layered, thick-cut frosted glass workspace hovering over a dark, minimalist gradient background. The top glass layer displays a sharp, glowing code block executing a context handshake or tool-definition script. Overlapping it is a beautifully rendered, semi-transparent glass module illustrating active database and API connections, with sharp caustics and realistic light leaks rippling across the physical surfaces. Elegant, physical depth is created by soft shadows falling realistically between the floating UI cards. Hyper-realistic, 8k, ray-traced reflections, premium developer tool UX visualization, 3D glossy realism.

💡 **Tips for Fine-Tuning the MCP Vibe:**

- **To emphasize tool-calling or security:** Add phrases like *showing secure API authorization badges* or *displaying sandboxed tool execution logs* to make the functional purpose clearer.
- **To change the visual hierarchy:** If you want a more abstract layout representing the "protocol" flow, use terms like *a central core with radial glass nodes stretching outward* to shift it away from a standard rectangular layout.
