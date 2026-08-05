# MCP Server Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `mcp`
**Template:** `templates/agent-generated-product/build/mcp/`
**Related:** [`CLI_MCP_AUTOMATION.md`](../CLI_MCP_AUTOMATION.md)

---

## When to Use This Shape

- LLM agents (Claude, OpenHands, Cursor, Copilot) need to interact with a service
- The problem is best solved by giving AI agents a new capability
- Data access, API wrapping, or workflow automation for agents
- Growing market: AI-native tooling is the fastest-growing dev segment
- Low build cost (typically a thin wrapper around an existing API)

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate agent demand | mcp.so registry, GitHub MCP repos, AI dev forums | Confirmed gap — no existing MCP server for this |
| Audit existing MCP servers | `mcp.so`, Smithery, GitHub search `mcp-server-*` | `research/competitors.md` — what exists, what's missing |
| Identify target agents | Claude Desktop, OpenHands, Cursor, Windsurf, Cline | `research/audience.md` — which agents would use this |
| Define tool surface | User complaints about what agents can't do | `research/tools.md` — proposed tools, inputs, outputs |
| Determine pricing | Free vs. API-key-gated vs. hosted | `decision/pricing.json` |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Project Structure

```text
build/mcp/
  src/
    index.ts            # MCP server entry point
    tools/              # One file per tool
      list-items.ts
      create-item.ts
      ...
    resources/          # MCP resources (if applicable)
    prompts/            # MCP prompts (if applicable)
    lib/                # API client, auth, helpers
  tests/
    tools/              # Test per tool
    integration/        # End-to-end MCP protocol tests
  package.json
  tsconfig.json
  README.md
  LICENSE               # Proprietary (Audrey Evans / GlowStarLabs)
```

### MCP SDK

```bash
# Initialize
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node vitest
```

### Server Template

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "<server-name>",
  version: "1.0.0",
});

server.tool(
  "tool_name",
  "Description of what this tool does",
  { param: z.string().describe("Parameter description") },
  async ({ param }) => {
    // Implementation
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Quality Gates

- [ ] All tools have Zod input validation with `.describe()` on every parameter
- [ ] All tools return structured `content` arrays (text or image)
- [ ] Error responses use MCP error codes (not raw throws)
- [ ] Unit tests for each tool (≥ 60% coverage)
- [ ] Integration test: connect via stdio, call each tool, verify response shape
- [ ] `README.md` has MCP config snippet for Claude Desktop, Cursor, and OpenHands
- [ ] No secrets in source (gitleaks clean)
- [ ] TypeScript strict mode, no `any`

---

## 3. Design Phase

MCP servers are invisible to end users, but still need:

| Asset | Purpose | Tool |
|-------|---------|------|
| Logo / icon | mcp.so listing, npm page, GitHub repo | Figma |
| Architecture diagram | README, landing page | Figma or Mermaid |
| Landing page | SEO + install instructions | Figma → HTML |
| OG image | Social sharing (1200×630) | Figma |
| Demo video/GIF | Show agent using the MCP server | Screen recording |

---

## 4. Publish Phase

### Primary Distribution

| Channel | How | Notes |
|---------|-----|-------|
| **npm** | `npm publish` | Primary — agents install via `npx` |
| **mcp.so** | Submit to MCP registry | Largest MCP directory |
| **Smithery** | Submit to Smithery registry | Growing alternative |
| **GitHub Releases** | Source + binary | For manual installs |

### MCP Config Snippets (for README)

```json
// Claude Desktop — claude_desktop_config.json
{
  "mcpServers": {
    "<server-name>": {
      "command": "npx",
      "args": ["-y", "<npm-package-name>"],
      "env": {
        "API_KEY": "<your-api-key>"
      }
    }
  }
}
```

```json
// Cursor — .cursor/mcp.json
{
  "mcpServers": {
    "<server-name>": {
      "command": "npx",
      "args": ["-y", "<npm-package-name>"],
      "env": { "API_KEY": "<your-api-key>" }
    }
  }
}
```

### Landing Page

```text
<server-name>.revvel.io   OR   revvel.io/mcp/<server-name>
```

Must include:

- What agents can do with this server (capability list)
- Install command: `npx -y <package-name>`
- Config snippets for top 5 agent platforms
- Demo video showing an agent using the tools
- Pricing (if applicable)
- Badge: "Works with Claude, Cursor, OpenHands, Copilot"

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **npm token** | Publish to npm registry | Doppler `revvel-standards/prd/NPM_TOKEN` |
| **Target API credentials** | The API the MCP server wraps | Doppler (per-project) |
| **mcp.so account** | Registry listing | Doppler `revvel-standards/prd/MCP_SO_TOKEN` |
| **Stripe API key** | Monetization (if paid tier) | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |

---

## Monetization Models

| Model | How | Example |
|-------|-----|---------|
| **Free + API key** | MCP server is free, underlying API requires paid key | Wrap a paid API, earn affiliate commission |
| **Hosted proxy** | Free MCP server hits your hosted proxy (metered) | Stripe metered billing per API call |
| **Sponsorware** | Free for sponsors, public after threshold | GitHub Sponsors |
| **Enterprise tier** | Free tools, paid advanced tools | `tool_basic` free, `tool_advanced` requires license |

---

## Acceptance Criteria

- [ ] MCP server connects and responds to `tools/list` request
- [ ] All tools work end-to-end with real API (not mocked)
- [ ] Published to npm
- [ ] Submitted to mcp.so registry
- [ ] README has config snippets for Claude Desktop + Cursor + OpenHands
- [ ] Tests pass with ≥ 60% coverage
- [ ] Landing page deployed
- [ ] Stripe Product created (even if free)
- [ ] `state.json` step = `deployed`, `certified = true`

## MCP Image Prompts

For marketing and landing pages for MCP servers, the following image generation prompts have proven effective:

### Prompt 1: The MCP Server Node & Context Stream (Connected & Real-time)

> A cinematic hero shot of an ultra-modern landing page for a Model Context Protocol (MCP) server integration engine. The interface features a central glassmorphic terminal hub floating over a deep charcoal and navy background. Radiant, glowing circuit lines and translucent data pipelines extend outwards from the terminal, connecting to smaller, semi-transparent frosted glass modules representing diverse data sources and enterprise tools. Crisp, glowing neon-blue and amber monospaced text streams display real-time context exchanges and tool-calling scripts. Soft atmospheric haze drifts between the floating UI layers, catching sharp, brilliant rim lighting on the refractive, glossy glass edges. Photorealistic, 8k resolution, elegant 3D realism, hyper-detailed cloud architecture visualization.

### Prompt 2: The MCP Host Hub & File/Tool Execution (Sleek Developer View)

> A close-up cinematic shot of a developer landing page for an advanced MCP host ecosystem. The central focus is a layered, thick-cut frosted glass workspace hovering over a dark, minimalist gradient background. The top glass layer displays a sharp, glowing code block executing a context handshake or tool-definition script. Overlapping it is a beautifully rendered, semi-transparent glass module illustrating active database and API connections, with sharp caustics and realistic light leaks rippling across the physical surfaces. Elegant, physical depth is created by soft shadows falling realistically between the floating UI cards. Hyper-realistic, 8k, ray-traced reflections, premium developer tool UX visualization, 3D glossy realism.

💡 **Tips for Fine-Tuning the MCP Vibe:**

- **To emphasize tool-calling or security:** Add phrases like *showing secure API authorization badges* or *displaying sandboxed tool execution logs* to make the functional purpose clearer.
- **To change the visual hierarchy:** If you want a more abstract layout representing the "protocol" flow, use terms like *a central core with radial glass nodes stretching outward* to shift it away from a standard rectangular layout.
