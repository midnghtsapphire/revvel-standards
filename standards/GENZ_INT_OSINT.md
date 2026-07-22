# GenZ-INT — Gen Z OSINT Bot Standard

**Status:** Active
**Owner:** @midnghtsapphire
**Target repo:** `midnghtsapphire/growlingeyes`
**Related:** [`AUTOMATED_PRODUCT_PIPELINE.md`](AUTOMATED_PRODUCT_PIPELINE.md), [`MCP_STANDARD.md`](../docs/Master_Inventory/MCP_STANDARD.md), [`KONG_GATEWAY.md`](KONG_GATEWAY.md)

---

## Purpose

A chat-first OSINT toolkit for Gen Z and gamer audiences. No traditional web dashboard — intelligence is delivered via Discord slash commands and Telegram bot messages. An MCP-based AI agent orchestrates 40+ recon tools in parallel, synthesizes results, and pushes bite-sized intelligence briefs directly into chat.

> **One sentence:** `/recon [username]` → cross-platform identity resolution + social graph + media footprint → delivered in a Discord embed or Telegram message in < 30 seconds.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  USER INTERFACES (chat-first, no web dashboard)         │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐                    │
│  │ Discord Bot  │  │ Telegram Bot  │                    │
│  │ /recon       │  │ /recon        │                    │
│  │ /steam       │  │ /steam        │                    │
│  │ /discord     │  │ /tiktok       │                    │
│  │ /reddit      │  │ /reddit       │                    │
│  └──────┬───────┘  └──────┬────────┘                    │
│         │                  │                             │
│         └──────┬───────────┘                             │
│                ▼                                         │
│  ┌─────────────────────────────┐                        │
│  │  AI Agent (LLM + MCP)      │                        │
│  │  Orchestrates tool calls,  │                        │
│  │  correlates results,       │                        │
│  │  generates briefs          │                        │
│  └─────────────┬──────────────┘                        │
│                ▼                                         │
│  ┌─────────────────────────────┐                        │
│  │  GenZ-INT MCP Server        │                        │
│  │  37 base tools (osint-mcp)  │                        │
│  │  + custom tools below       │                        │
│  └─────────────┬──────────────┘                        │
│                ▼                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │  TOOL MODULES                                │        │
│  │                                              │        │
│  │  Phase 1: Identity Resolution                │        │
│  │  ├── steam-osint (Steam profiles/friends)    │        │
│  │  ├── WhatsMyName (500+ platform sweep)       │        │
│  │  └── BOSINT concepts (Discord+Steam lookup)  │        │
│  │                                              │        │
│  │  Phase 2: Discord Recon                      │        │
│  │  ├── Doxcord (server link scanning)          │        │
│  │  ├── Discord ID lookup (Gatecord)            │        │
│  │  └── DiscordGate analytics                   │        │
│  │                                              │        │
│  │  Phase 3: Media & Streamer Tracking          │        │
│  │  ├── Think-Pol / SnooSnoop (Reddit)          │        │
│  │  ├── Reveddit (deleted content)              │        │
│  │  ├── TikSpyder (TikTok hashtag/keyword)      │        │
│  │  └── Urlebird (anonymous TikTok viewing)     │        │
│  │                                              │        │
│  │  Phase 4: GrowlingEyes Integration           │        │
│  │  ├── Unified events table                    │        │
│  │  ├── Entity extraction pipeline              │        │
│  │  └── Tactical map geo-pinning                │        │
│  │                                              │        │
│  │  Phase 5: Geospatial / Satellite Intel       │        │
│  │  ├── Axion MCP (satellite imagery)           │        │
│  │  ├── NDVI/NDWI/urban index mapping           │        │
│  │  ├── ML land-cover classification            │        │
│  │  └── Temporal change detection               │        │
│  └──────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Gamer Tag & Identity Resolution

Start with a single handle or gamertag → map across all platforms.

### Tools

| Tool | Source | Purpose | Integration |
|------|--------|---------|-------------|
| **steam-osint** | [github.com/matiash26/steam-osint](https://github.com/matiash26/steam-osint) | Steam profile, mutual friends, relationship patterns, external connections | Clone → wrap as MCP tool |
| **WhatsMyName** | [whatsmyname.app](https://whatsmyname.app/) | Check username across 500+ social and gaming platforms | API integration → MCP tool |
| **InstantUsername** | [instantusername.com](https://instantusername.com/) | Rapid cross-platform username availability/existence check | Scrape/API → MCP tool |
| **BOSINT** | [app.bosint.gg](https://app.bosint.gg/) | All-in-one OSINT with native Discord + Steam lookups | Concepts + API if available |

### MCP Tool Definitions

```typescript
// Phase 1 tools registered on the MCP server
server.tool("steam_profile", "Fetch Steam profile, friends, games, and external links", {
  steam_id: z.string().describe("Steam ID, vanity URL, or profile URL"),
}, async ({ steam_id }) => { /* steam-osint wrapper */ });

server.tool("username_sweep", "Check a username/gamertag across 500+ platforms", {
  username: z.string().describe("The gamertag or handle to search"),
  platforms: z.array(z.string()).optional().describe("Limit to specific platforms"),
}, async ({ username, platforms }) => { /* WhatsMyName + InstantUsername */ });

server.tool("identity_correlate", "Cross-reference multiple handles to find the same person", {
  handles: z.array(z.string()).describe("List of known handles/aliases"),
}, async ({ handles }) => { /* Correlation engine */ });
```

### Output Format

```json
{
  "query": "xX_DarkStar_Xx",
  "matches": [
    { "platform": "steam", "url": "https://steamcommunity.com/id/...", "confidence": 0.95 },
    { "platform": "discord", "username": "darkstar#1234", "confidence": 0.80 },
    { "platform": "reddit", "username": "u/DarkStar_gaming", "confidence": 0.70 },
    { "platform": "tiktok", "username": "@darkstargaming", "confidence": 0.65 }
  ],
  "social_graph": { "mutual_friends": 12, "shared_servers": 3 },
  "risk_indicators": []
}
```

---

## Phase 2: Discord Server & User Reconnaissance

Discord is the cultural hub. Build capabilities to analyze communities and resolve anonymous users.

### Tools

| Tool | Source | Purpose | Integration |
|------|--------|---------|-------------|
| **Doxcord** | [github.com/boringthegod/doxcord](https://github.com/boringthegod/doxcord) | Scan Discord servers for shared TikTok/Instagram/Facebook links with tracking params | Clone → Python script → MCP tool |
| **Discord ID Lookup** | [gatecord.com/discord-id-lookup](https://gatecord.com/discord-id-lookup/) | Reverse-search Discord numerical IDs → creation date, badges, avatars | API wrapper → MCP tool |
| **DiscordGate** | [discordgate.com/tools](https://discordgate.com/tools) | AI-powered server analytics, audits, user lookups | Link + API if available |

### MCP Tool Definitions

```typescript
server.tool("discord_user_lookup", "Look up Discord user by ID or username", {
  user_id: z.string().describe("Discord user ID (numerical) or username#discriminator"),
}, async ({ user_id }) => { /* Gatecord API + Discord API */ });

server.tool("discord_server_scan", "Scan a Discord server for social media links and tracking parameters", {
  server_id: z.string().describe("Discord server/guild ID"),
  scan_depth: z.number().optional().describe("Number of messages to scan (default 1000)"),
}, async ({ server_id, scan_depth }) => { /* Doxcord wrapper */ });

server.tool("discord_social_links", "Extract social media profiles linked in Discord bios and messages", {
  user_id: z.string().describe("Discord user ID"),
}, async ({ user_id }) => { /* Bio scraper + Doxcord */ });
```

---

## Phase 3: Viral Media & Streamer Tracking

Gen Z consumes information through short-form video and Reddit. Scrape and analyze anonymously.

### Reddit Tools

| Tool | Source | Purpose | Integration |
|------|--------|---------|-------------|
| **Think-Pol** | [think-pol.com](https://think-pol.com/) | Export Reddit comment histories, map subreddit networks | API/scrape → MCP tool |
| **SnooSnoop** | [snoosnoop.com](https://snoosnoop.com/) | Reddit user behavioral pattern extraction | API → MCP tool |
| **Reveddit** | [reveddit.com](https://www.reveddit.com/) | Track deleted posts, removed gamer drama content | API → MCP tool |

### TikTok Tools

| Tool | Source | Purpose | Integration |
|------|--------|---------|-------------|
| **TikSpyder** | [github.com/estebanpdl/tik-spyder](https://github.com/estebanpdl/tik-spyder) | Keyword and hashtag tracking via TikTok API | Clone → MCP tool |
| **TikTrackBot** | [t.me/TikTrackBot](https://t.me/TikTrackBot) | Public TikTok profile details (country, language, timeline) | Telegram bot API |
| **Urlebird** | [urlebird.com](https://urlebird.com) | Anonymous no-account TikTok video viewing and scraping | Scrape → MCP tool |

### MCP Tool Definitions

```typescript
server.tool("reddit_profile", "Full Reddit user analysis — comment history, subreddit map, behavior patterns", {
  username: z.string().describe("Reddit username (without u/)"),
  include_deleted: z.boolean().optional().describe("Include deleted/removed posts via Reveddit"),
}, async ({ username, include_deleted }) => { /* Think-Pol + SnooSnoop + Reveddit */ });

server.tool("tiktok_profile", "TikTok user intelligence — country, language, timeline, top content", {
  username: z.string().describe("TikTok username (without @)"),
}, async ({ username }) => { /* TikSpyder + Urlebird */ });

server.tool("tiktok_hashtag_monitor", "Monitor TikTok hashtags for emerging trends and content", {
  hashtags: z.array(z.string()).describe("Hashtags to monitor (without #)"),
  since: z.string().optional().describe("ISO date to start from"),
}, async ({ hashtags, since }) => { /* TikSpyder */ });
```

---

## Phase 4: AI Agent & Chat Delivery

No traditional web app. Gamers want `/recon [username]`.

### AI Agent (MCP Backbone)

The AI agent connects to the GenZ-INT MCP server and orchestrates tool calls:

1. User sends `/recon darkstar` in Discord or Telegram
2. Agent receives the command → plans tool calls
3. Agent runs tools in parallel:
   - `username_sweep("darkstar")` → finds matches on Steam, Reddit, TikTok
   - `steam_profile(steam_match)` → friends, games, external links
   - `reddit_profile(reddit_match)` → comment history, subreddits
   - `tiktok_profile(tiktok_match)` → country, timeline
4. Agent correlates results → generates brief
5. Brief pushed to Discord embed or Telegram message

### Base MCP Server

Clone and extend [osint-mcp-server](https://github.com/badchars/osint-mcp-server) which provides 37 recon tools without API keys:

```bash
git clone https://github.com/badchars/osint-mcp-server.git
cd osint-mcp-server
# Add custom tools for Discord, Steam, Reddit, TikTok
```

### Discord Bot

```typescript
// Discord.js v14 bot with slash commands
import { Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("recon")
    .setDescription("Full cross-platform reconnaissance on a username")
    .addStringOption(opt => opt.setName("username").setDescription("Target handle").setRequired(true)),

  new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Steam profile intelligence")
    .addStringOption(opt => opt.setName("id").setDescription("Steam ID or vanity URL").setRequired(true)),

  new SlashCommandBuilder()
    .setName("discord_lookup")
    .setDescription("Discord user reverse lookup")
    .addStringOption(opt => opt.setName("user_id").setDescription("Discord numerical user ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("reddit")
    .setDescription("Reddit user behavioral analysis")
    .addStringOption(opt => opt.setName("username").setDescription("Reddit username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("TikTok profile intelligence")
    .addStringOption(opt => opt.setName("username").setDescription("TikTok username").setRequired(true)),
];
```

**Discord notification delivery** via [Discord Notification MCP Server](https://mcpservers.org/servers/s-yu-yu-yu/discord-notification-mcp):

```json
{
  "mcpServers": {
    "discord-notification": {
      "command": "npx",
      "args": ["-y", "discord-notification-mcp"],
      "env": { "DISCORD_WEBHOOK_URL": "$DISCORD_WEBHOOK_URL" }
    }
  }
}
```

### Telegram Bot

Build using [Telegram MCP Server](https://github.com/vysp3r/mcp-telegram):

```typescript
// Telegram bot commands mirror Discord slash commands
bot.command("recon", async (ctx) => {
  const username = ctx.message.text.split(" ").slice(1).join(" ");
  // Send to AI agent → MCP tool calls → format brief → reply
  const brief = await agent.recon(username);
  await ctx.reply(formatTelegramBrief(brief), { parse_mode: "HTML" });
});
```

---

## Phase 5: Geospatial & Satellite Intelligence (Axion)

Axion is an MCP server providing satellite imagery search, map generation, and ML-based land-cover classification. It pulls free data from Sentinel-2, Landsat 8/9, and NAIP — giving users geospatial intelligence via chat commands.

### Tools

| Tool | Source | Purpose | Integration |
|------|--------|---------|-------------|
| **Axion MCP** | [github.com/dhenenjay/axion-planetary-mcp](https://github.com/dhenenjay/axion-planetary-mcp) | Satellite imagery search, map generation, ML classification | MCP server (self-hosted Docker or hosted with API key) |

### Deployment Options

| Option | Setup | API Key Required | Capabilities |
|--------|-------|-----------------|-------------|
| **Self-hosted (Docker)** | `docker run -p 3000:3000 dhenenjay/axion-planetary-mcp:latest` | No (uses free public STAC API) | Data search, map generation, classification |
| **Hosted (cloud)** | `npx -y axion-mcp` with `AXION_API_KEY` env var | Yes | All above + SAR-to-optical AI conversion |

### MCP Tool Definitions

```typescript
// Phase 5 tools — thin wrappers that delegate to the Axion MCP server
server.tool("satellite_search", "Search satellite imagery for a location and date range", {
  location: z.string().describe("Location name or lat,lon coordinates"),
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
  max_cloud_cover: z.number().optional().describe("Max cloud cover percentage (0-100)"),
}, async ({ location, start_date, end_date, max_cloud_cover }) => {
  // Forward to Axion axion_data tool
});

server.tool("satellite_map", "Generate an interactive map with vegetation/water/urban indices", {
  location: z.string().describe("Location name or lat,lon coordinates"),
  index: z.enum(["ndvi", "ndwi", "built_up"]).optional().describe("Map index type"),
}, async ({ location, index }) => {
  // Forward to Axion axion_map tool
});

server.tool("satellite_classify", "Run ML land-cover classification on satellite imagery", {
  location: z.string().describe("Location name or lat,lon coordinates"),
}, async ({ location }) => {
  // Forward to Axion axion_classification tool
});
```

### Output Format

```json
{
  "query": "Seattle urban expansion",
  "location": { "lat": 47.6062, "lon": -122.3321 },
  "imagery": [
    {
      "source": "sentinel-2",
      "date": "2024-03-15",
      "resolution": "10m",
      "cloud_cover": 12,
      "thumbnail_url": "https://..."
    }
  ],
  "indices": {
    "ndvi": { "mean": 0.42, "description": "Moderate vegetation" },
    "ndwi": { "mean": 0.18, "description": "Low water content" },
    "built_up": { "mean": 0.65, "description": "High urban density" }
  },
  "classification": {
    "urban": 45.2,
    "vegetation": 30.1,
    "water": 12.4,
    "bare_soil": 8.3,
    "other": 4.0
  }
}
```

---

## Slash Commands Reference

| Command | Platforms | Description |
|---------|-----------|-------------|
| `/recon [username]` | Discord, Telegram | Full cross-platform reconnaissance |
| `/steam [id]` | Discord, Telegram | Steam profile + friends + games |
| `/discord [user_id]` | Discord, Telegram | Discord user reverse lookup |
| `/reddit [username]` | Discord, Telegram | Reddit comment history + behavior |
| `/tiktok [username]` | Discord, Telegram | TikTok profile + content analysis |
| `/sweep [username]` | Discord, Telegram | Username existence check across 500+ platforms |
| `/server [server_id]` | Discord only | Discord server social link scan |
| `/deleted [reddit_user]` | Discord, Telegram | Deleted/removed Reddit content recovery |
| `/monitor [hashtag]` | Discord, Telegram | TikTok hashtag monitoring |
| `/satellite [location]` | Discord, Telegram | Satellite imagery search for a location |
| `/map [location]` | Discord, Telegram | Generate interactive vegetation/water/urban map |

---

## GrowlingEyes Integration

GenZ-INT feeds into the existing GrowlingEyes OSINT platform:

| Integration point | How |
|-------------------|-----|
| **Unified events table** | Recon results stored as events with `source = 'genz-int'` |
| **Entity extraction** | Usernames, handles, platform IDs extracted as entities |
| **Tactical map** | Geo-pin users when location data is available (TikTok country, Reddit timezone) |
| **Identity graph** | Cross-platform handle correlations stored in entity relationships |
| **Flash banner** | Breaking recon alerts surfaced in the GrowlingEyes dashboard ticker |

### New Router

```typescript
// server/genzIntRouter.ts — tRPC router for GenZ-INT data
export const genzIntRouter = router({
  recon: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      // Orchestrate MCP tool calls
      // Return consolidated brief
    }),

  identityGraph: protectedProcedure
    .input(z.object({ handles: z.array(z.string()) }))
    .query(async ({ input }) => {
      // Cross-reference handles across platforms
    }),
});
```

---

## Repository Layout

```text
growlingeyes/
  server/
    genzIntRouter.ts          # tRPC router for GenZ-INT queries
    genz-int/
      mcp-server/             # GenZ-INT MCP server (extends osint-mcp-server)
        src/
          index.ts            # MCP server entry
          tools/
            steam.ts          # Steam OSINT tool
            username-sweep.ts # WhatsMyName + InstantUsername
            discord-recon.ts  # Doxcord + Gatecord
            reddit.ts         # Think-Pol + SnooSnoop + Reveddit
            tiktok.ts         # TikSpyder + Urlebird
            correlate.ts      # Identity correlation engine
            axion.ts          # Axion satellite/geospatial intelligence
        package.json
      discord-bot/            # Discord.js bot
        src/
          index.ts
          commands/
            recon.ts
            steam.ts
            discord-lookup.ts
            reddit.ts
            tiktok.ts
            satellite.ts
            map.ts
        package.json
      telegram-bot/           # Telegram bot
        src/
          index.ts
          commands/            # Mirror of Discord commands
        package.json
  agents/
    GENZ_INT_AGENT.md         # AI agent system prompt for recon
```

---

## Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **Discord Bot Token** | Discord bot authentication | Doppler `growlingeyes/prd/DISCORD_BOT_TOKEN` |
| **Discord Webhook URL** | Push OSINT reports to channels | Doppler `growlingeyes/prd/DISCORD_WEBHOOK_URL` |
| **Telegram Bot Token** | Telegram bot authentication | Doppler `growlingeyes/prd/TELEGRAM_BOT_TOKEN` |
| **Steam API Key** | Steam profile lookups | Doppler `growlingeyes/prd/STEAM_API_KEY` |
| **OpenRouter API Key** | LLM for AI agent reasoning | Doppler `growlingeyes/prd/OPENROUTER_API_KEY` |
| **Reddit API credentials** | Reddit data access (optional — some tools don't need it) | Doppler `growlingeyes/prd/REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` |
| **Axion API Key** | Satellite imagery via Axion MCP (optional — self-hosted works without) | Doppler `growlingeyes/prd/AXION_API_KEY` |

---

## Build Phases & Timeline

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|-------------|
| **Phase 1** | MCP server + Steam + username sweep | 2-3 days | Steam API key |
| **Phase 2** | Discord recon tools + Discord bot | 2-3 days | Discord bot token |
| **Phase 3** | Reddit + TikTok tools | 2-3 days | Minimal (most tools are keyless) |
| **Phase 4** | AI agent + Telegram bot + GrowlingEyes integration | 3-4 days | OpenRouter API key, Telegram token |
| **Phase 5** | Axion satellite/geospatial intelligence + chat commands | 1-2 days | Axion API key (optional) or Docker |

**Total estimated build time:** 10-15 days of agent work

---

## Security & Ethics

- **No PII storage.** Recon results are ephemeral unless the user explicitly saves them.
- **Rate limiting.** All tools respect platform ToS and rate limits.
- **No account creation.** Tools use public data only — no fake accounts, no login bypasses.
- **Audit logging.** Every recon query is logged with requester ID and timestamp.
- **Access control.** Discord bot restricted to authorized servers/channels. Telegram bot restricted to authorized users.
- **No scraping private data.** Only publicly available information is collected.

---

## Acceptance Criteria

- [ ] MCP server runs and responds to `tools/list` with all GenZ-INT tools
- [ ] `/recon [username]` works end-to-end in Discord (returns embed with results)
- [ ] `/recon [username]` works end-to-end in Telegram (returns formatted message)
- [ ] Steam, Reddit, and TikTok tools return real data for valid usernames
- [ ] Username sweep checks ≥ 100 platforms (full WhatsMyName integration)
- [ ] Results feed into GrowlingEyes unified events table
- [ ] All tools have unit tests
- [ ] No secrets in source (gitleaks clean)
- [ ] Discord bot registered and running in at least one server
- [ ] Telegram bot registered and responding to commands
- [ ] Axion MCP tools respond to satellite data and map generation requests
- [ ] `/satellite` and `/map` commands work in Discord and Telegram

---

## ADDED: Money & Execution Ethic

### OSINT Monetization
- **Research to revenue in 24 hours**
- **Sell intel, not reports** — actionable > pretty
- **If not monetizeable, deprioritize**

### Extreme Programming Ethic
1. **Ship fast** — OSINT tools in hours
2. **Test with real targets** — not synthetic
3. **Break things** — learn faster  
4. **No specs** — build then ship
5. **Done = paid**
6. **Automate** — manual intel is failure
7. **Code talks** — meetings kill velocity
8. **Revenue > reports** — money proves value

### The OSINT Rule
- Hunt → Verify → Package → Sell → Repeat
- Speed is everything
- Real intel > perfect reports

---

*ADDED: Phase 1 upgrade ($3k → $10k/month) + execution ethic*
