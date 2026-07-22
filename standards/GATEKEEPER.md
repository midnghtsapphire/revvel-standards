# Gatekeeper Standard — BOM, API, MCP & Secret Lifecycle Management

**Status:** Active  
**Owner:** @midnghtsapphire  
**Related standards:** [`AUTOMATED_PRODUCT_PIPELINE.md`](AUTOMATED_PRODUCT_PIPELINE.md), [`KONG_GATEWAY.md`](KONG_GATEWAY.md), [`SECURITY.md`](SECURITY.md), [`CREDENTIAL_AUDIT_SYSTEM.md (merged 2026-05-06)`](CREDENTIAL_AUDIT_SYSTEM.md)  
**Related workflows:** [`.github/workflows/credential-gatekeeper.yml`](../.github/workflows/credential-gatekeeper.yml), [`templates/cicd/bom-self-heal.yml`](../templates/cicd/bom-self-heal.yml)  
**Related scripts:** [`scripts/gatekeeper-sync.sh`](../scripts/gatekeeper-sync.sh), [`scripts/gatekeeper-rotate.sh`](../scripts/gatekeeper-rotate.sh)  
**Related docs:** [`docs/_MASTER_BOM.md`](../docs/_MASTER_BOM.md), [`docs/_MASTER_INVENTORY.md`](../docs/_MASTER_INVENTORY.md)

---

## Purpose

The Gatekeeper is the unified control plane that manages the full lifecycle of every API, MCP server, credential, integration, and external dependency across all Revvel products. When the automated product pipeline (step 6) generates a BOM, the Gatekeeper takes ownership: it validates, provisions, organizes, monitors, and rotates every item — without human intervention unless a purchase or irreversible decision is required.

> **One sentence:** Every API key, MCP connection, and external dependency enters through the Gatekeeper, stays organized in the registry, and gets rotated on schedule — automatically.

---

## Architecture

```text
Product Pipeline (step 5: shape router)
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│  GATEKEEPER                                                       │
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐    │
│  │ BOM          │───▶│ Registry     │───▶│ Provisioner       │    │
│  │ Validator    │    │ (organize)   │    │ (auto-procure)    │    │
│  └─────────────┘    └──────┬───────┘    └────────┬──────────┘    │
│                            │                      │               │
│                            ▼                      ▼               │
│                     ┌──────────────┐    ┌───────────────────┐    │
│                     │ Inventory    │    │ Rotator           │    │
│                     │ Tracker      │    │ (scheduled)       │    │
│                     └──────┬───────┘    └────────┬──────────┘    │
│                            │                      │               │
│                            ▼                      ▼               │
│                     ┌──────────────────────────────────────┐     │
│                     │ Doppler + Kong + GitHub Secrets       │     │
│                     │ (storage & enforcement layer)         │     │
│                     └──────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
        │
        ▼
Product Pipeline (step 7: build — only if bom_ready: true)
```

---

## 1. BOM Validator

When a product enters the pipeline (via `scripts/init-product.sh <slug> --shape <shape>`), the Gatekeeper reads the product's `BOM.md` and validates every line item.

### BOM.md Format (per product)

Every product folder MUST contain a `BOM.md` with this structure:

```markdown
# BOM — <product-slug>

| Item | Type | Provider | Env Var | Doppler Path | Status | Rotation | Notes |
|------|------|----------|---------|--------------|--------|----------|-------|
| Steam API key | api_key | Valve | STEAM_API_KEY | growlingeyes/prd | ✅ on hand | 90d | Free tier |
| Discord bot token | bot_token | Discord | DISCORD_BOT_TOKEN | growlingeyes/prd | ✅ on hand | 90d | Needs MESSAGE_CONTENT intent |
| WhatsMyName data | public_api | GitHub raw | — | — | ✅ free | none | No auth required |
| TikTok scraping | scraper | Urlebird | — | — | ✅ free | none | Anonymous, no account |
| MCP SDK | npm_package | Anthropic | — | — | ✅ free | none | @modelcontextprotocol/sdk |
| Telegram bot token | bot_token | Telegram | TELEGRAM_BOT_TOKEN | growlingeyes/prd | ❌ needed | 90d | BotFather |
```

### Item Types

| Type | Description | Auto-Provisioning | Rotation Required |
|------|-------------|-------------------|-------------------|
| `api_key` | Third-party API key | If free tier and API exists | Yes — per provider policy |
| `bot_token` | Discord/Telegram/Slack bot token | No — requires manual creation | Yes — 90 days default |
| `oauth_client` | OAuth 2.0 client ID + secret | No — requires app registration | Yes — secret rotation 90d |
| `npm_package` | npm/pip/cargo dependency | Auto (`npm install`) | Dependabot handles |
| `public_api` | Free public API, no auth needed | N/A | N/A |
| `scraper` | Web scraping target | N/A | N/A — monitor for breakage |
| `mcp_server` | MCP server dependency | Auto-register in Kong | Yes — key rotation 90d |
| `database` | DB connection string | Auto via Doppler | Yes — password rotation 30d |
| `ssh_key` | SSH access key | Auto from Doppler | Yes — 180d |
| `webhook` | Incoming/outgoing webhook URL | Create via provider API if available | Yes — secret rotation 90d |
| `asset` | Font, image, template, etc. | Download if URL provided | N/A |
| `subscription` | Paid service subscription | No — requires human approval | N/A — monitor billing |

### Validation Rules

The BOM Validator runs on every PR that modifies a product's `BOM.md` and on `workflow_dispatch`:

1. **Schema check** — every row has all 8 columns filled.
2. **Type check** — `Type` is one of the recognized item types above.
3. **Env var naming** — env var names follow `UPPER_SNAKE_CASE` and do not collide with existing vars in `_MASTER_INVENTORY.md`.
4. **Doppler path check** — if a Doppler path is specified, verify the secret exists (via `doppler secrets get`).
5. **Status consistency** — items marked `✅ on hand` must actually exist in Doppler or GitHub Secrets.
6. **Rotation policy** — items with `rotation: none` are only valid for types `public_api`, `scraper`, `npm_package`, `asset`.

---

## 2. Registry — Organizing APIs, MCPs & Integrations

The Gatekeeper maintains a central registry at `docs/_GATEKEEPER_REGISTRY.json` that catalogs every active API, MCP server, and integration across all products.

### Registry Schema

```json
{
  "version": "1.0.0",
  "last_updated": "2026-04-27T00:00:00Z",
  "entries": [
    {
      "id": "steam-api",
      "name": "Steam Web API",
      "type": "api_key",
      "provider": "Valve",
      "env_var": "STEAM_API_KEY",
      "doppler_path": "growlingeyes/prd/STEAM_API_KEY",
      "used_by": ["genz-int-mcp", "growlingeyes-osint"],
      "kong_service": "steam-api-proxy",
      "rate_limit": "100000/day",
      "cost": "free",
      "provisioned_at": "2026-04-20T00:00:00Z",
      "last_rotated": "2026-04-20T00:00:00Z",
      "rotation_days": 90,
      "next_rotation": "2026-07-19T00:00:00Z",
      "status": "active",
      "docs_url": "https://developer.valvesoftware.com/wiki/Steam_Web_API"
    }
  ]
}
```

### Registry Rules

1. **Single source of truth.** Every API key, MCP server, and integration MUST have exactly one entry in the registry. Duplicates are rejected.
2. **Product linkage.** The `used_by` array tracks which products depend on each entry. When a product is deprecated, its references are cleaned.
3. **Kong linkage.** If the API passes through Kong (see [`KONG_GATEWAY.md`](KONG_GATEWAY.md)), the `kong_service` field links to the Kong service name.
4. **Cost tracking.** The `cost` field tracks monthly cost (`"free"`, `"$5/mo"`, `"$0.001/req"`, etc.) for budget rollups.
5. **Auto-sync.** The `gatekeeper-sync.sh` script reads the registry and ensures every `env_var` is provisioned in Doppler and GitHub Secrets.

### Updating the Registry

Agents MUST NOT edit `_GATEKEEPER_REGISTRY.json` by hand. Use the gatekeeper CLI:

```bash
# Add a new entry
bash scripts/gatekeeper-cli.sh add \
  --id "discord-bot" \
  --name "Discord Bot Token" \
  --type bot_token \
  --provider Discord \
  --env-var DISCORD_BOT_TOKEN \
  --doppler growlingeyes/prd \
  --used-by genz-int-mcp,genz-int-discord-bot \
  --rotation 90 \
  --cost free

# List all entries for a product
bash scripts/gatekeeper-cli.sh list --used-by genz-int-mcp

# Check rotation status
bash scripts/gatekeeper-cli.sh rotate --check

# Force rotation of a specific entry
bash scripts/gatekeeper-cli.sh rotate --id steam-api --force

# Remove a deprecated entry
bash scripts/gatekeeper-cli.sh remove --id old-api-key

# Sync all entries to Doppler + GitHub Secrets
bash scripts/gatekeeper-cli.sh sync
```

---

## 3. Provisioner — Auto-Procuring Dependencies

When the BOM Validator finds items with status `❌ needed`, the Provisioner attempts to resolve them automatically.

### Auto-Provisioning Matrix

| Type | Can Auto-Provision? | Method |
|------|-------------------|--------|
| `api_key` (free tier) | Yes | Call provider's signup/API-key endpoint if API exists |
| `api_key` (paid) | No — human approval | Create `bom-block` issue |
| `bot_token` | No — manual creation | Create `bom-block` issue with step-by-step instructions |
| `npm_package` | Yes | `npm install <package>` |
| `public_api` | Yes (no action needed) | Mark as ✅ |
| `mcp_server` | Yes | Register route in Kong via Admin API |
| `database` | Conditional | If Supabase project exists, create via API; otherwise `bom-block` |
| `ssh_key` | Yes | Generate ed25519 key pair, store in Doppler |
| `webhook` | Conditional | Create via provider API if supported |
| `subscription` | No — human approval | Create `bom-block` issue with pricing + signup link |

### Provisioning Workflow

```text
BOM.md parsed
    │
    ├─ item.status == "✅ on hand"  →  verify in Doppler → done
    │
    ├─ item.status == "❌ needed" && auto_provisionable
    │       │
    │       ├─ Provision via API/CLI
    │       ├─ Store value in Doppler (project/config from BOM)
    │       ├─ Sync to GitHub Secrets via gatekeeper-sync.sh
    │       ├─ Register in Kong if applicable
    │       ├─ Add entry to _GATEKEEPER_REGISTRY.json
    │       └─ Update BOM.md status to "✅ on hand"
    │
    └─ item.status == "❌ needed" && NOT auto_provisionable
            │
            ├─ Create GitHub issue: [BOM-BLOCK] <product> needs <item>
            │     Labels: bom-block, bom-purchase (if paid)
            │     Body: what it is, why it's needed, signup link, exact steps
            ├─ Set product state.json → bom_ready: false
            └─ Pipeline pauses for this product only
```

---

## 4. Rotator — Scheduled Secret & Key Rotation

The Rotator runs on a weekly cron (`0 6 * * 1` — Monday 06:00 UTC) and checks every entry in `_GATEKEEPER_REGISTRY.json` against its rotation schedule.

### Rotation Schedule Defaults

| Type | Default Rotation | Override Allowed |
|------|-----------------|-----------------|
| `api_key` | 90 days | Yes — per provider policy |
| `bot_token` | 90 days | Yes |
| `oauth_client` | 90 days (secret only) | Yes |
| `database` | 30 days | Yes — minimum 7 days |
| `ssh_key` | 180 days | Yes |
| `webhook` | 90 days | Yes |
| `mcp_server` | 90 days (if keyed) | Yes |

### Rotation Workflow

```text
Rotator cron fires (Monday 06:00 UTC)
    │
    ├─ Read _GATEKEEPER_REGISTRY.json
    │
    ├─ For each entry where now > next_rotation:
    │       │
    │       ├─ provider supports programmatic rotation?
    │       │       ├─ Yes: call provider API → new key → store in Doppler
    │       │       │        → update registry → update Kong consumer key
    │       │       │        → update GitHub Secrets → log rotation
    │       │       └─ No:  create issue: [ROTATE] <item> due for rotation
    │       │                 Labels: rotation-due
    │       │                 Body: link to provider console, steps to rotate
    │       │
    │       └─ Update last_rotated + next_rotation in registry
    │
    ├─ For entries expiring in ≤ 7 days:
    │       └─ Post warning to Slack/email: "⚠️ <item> expires in N days"
    │
    └─ Emit rotation report → docs/_ROTATION_LOG.md
```

### Rotation Log

Every rotation (automatic or manual) is appended to `docs/_ROTATION_LOG.md`:

```markdown
| Date | Item | Old Suffix | New Suffix | Method | Agent |
|------|------|-----------|-----------|--------|-------|
| 2026-04-27 | STEAM_API_KEY | ...a3f2 | ...b7e1 | auto | gatekeeper-rotate.sh |
| 2026-04-27 | DISCORD_BOT_TOKEN | ...9c4d | ...2e8a | manual | Audrey |
```

Only the last 4 characters of keys are logged. Full values NEVER appear in logs, issues, or PRs.

---

## 5. Kong Integration

APIs that serve multiple products or need rate limiting, auth, or monitoring are routed through Kong (see [`KONG_GATEWAY.md`](KONG_GATEWAY.md)).

### When to Register in Kong

| Scenario | Register in Kong? |
|----------|-------------------|
| API used by 1 product only | No — direct connection |
| API used by 2+ products | Yes — centralized rate limiting |
| API with rate limits we must share | Yes — Kong rate-limiting plugin |
| MCP server exposed externally | Yes — auth + rate limiting |
| Internal-only MCP server | No — local connection |

### Kong Registration via Gatekeeper

When the Gatekeeper provisions or registers an API:

```bash
# Auto-register in Kong (done by gatekeeper-cli.sh add --kong)
curl -s http://localhost:8001/services -d name=steam-api \
  -d url=https://api.steampowered.com
curl -s http://localhost:8001/services/steam-api/routes \
  -d paths[]=/steam -d strip_path=true
curl -s http://localhost:8001/services/steam-api/plugins \
  -d name=rate-limiting -d config.minute=100
curl -s http://localhost:8001/services/steam-api/plugins \
  -d name=key-auth
```

The Kong service name is stored in the registry's `kong_service` field.

---

## 6. MCP Server Management

MCP servers have additional lifecycle requirements beyond regular APIs.

### MCP Server Registry Fields

In addition to standard registry fields, MCP entries include:

```json
{
  "type": "mcp_server",
  "mcp_tools": ["steam_profile", "username_sweep", "discord_user_lookup"],
  "mcp_transport": "stdio",
  "mcp_repo": "midnghtsapphire/growlingeyes",
  "mcp_path": "server/genz-int/mcp-server",
  "mcp_published": false,
  "mcp_registry_url": null
}
```

### MCP Lifecycle

1. **Build** — MCP server is built per shape standard (`standards/shapes/MCP.md` or `GENZ_INT_OSINT.md`).
2. **Register** — Gatekeeper adds entry with tool list, transport, and repo path.
3. **Test** — Verify all tools respond via `mcp-inspector` or integration tests.
4. **Publish** — If selling: push to mcp.so registry, update `mcp_published: true`.
5. **Monitor** — Kong health checks (if routed through Kong) or cron ping.
6. **Rotate** — If MCP server uses API keys internally, those keys follow the rotation schedule.

---

## 7. Cron Schedule

| Job | Cron | What it does |
|-----|------|-------------|
| BOM Validator | On PR + `workflow_dispatch` | Validates BOM.md changes |
| Credential Gatekeeper | On issue open/label | Scans issues for credential needs |
| Gatekeeper Sync | On BOM change + daily `0 3 * * *` | Syncs Doppler → GitHub Secrets |
| Rotator | Weekly `0 6 * * 1` | Checks + executes rotations |
| BOM Self-Heal | Post-deploy + weekly `0 9 * * 1` | Audits P0 gaps, creates issues |
| Registry Drift Check | Daily `0 4 * * *` | Compares registry vs Doppler vs Kong |
| Master BOM Sync | Weekly `0 5 * * 1` | Regenerates `_MASTER_BOM.md` from product BOMs |

---

## 8. Integration with Product Pipeline

The Gatekeeper is invoked at **step 6** of the [`AUTOMATED_PRODUCT_PIPELINE.md`](AUTOMATED_PRODUCT_PIPELINE.md):

1. Pipeline router selects a shape (step 5).
2. `init-product.sh <slug> --shape <shape>` creates product folder with empty `BOM.md`.
3. Build agent fills `BOM.md` with required dependencies for that shape.
4. **Gatekeeper Validator** runs against `BOM.md`:
   - Cross-references `_GATEKEEPER_REGISTRY.json` and `_MASTER_INVENTORY.md`.
   - Items already in registry → `✅ on hand`.
   - Free/auto-provisionable items → Provisioner handles.
   - Paid/manual items → `bom-block` issue created.
5. When all items are `✅`, Gatekeeper sets `state.json → bom_ready: true`.
6. Pipeline proceeds to step 7 (build).

**Mandatory rule:** No build step may run while `bom_ready: false`.

---

## 9. File Layout

```text
revvel-standards/
  standards/
    GATEKEEPER.md                          # ← this file
  docs/
    _MASTER_BOM.md                         # All outstanding purchases (existing)
    _MASTER_INVENTORY.md                   # All active services/subscriptions (existing)
    _GATEKEEPER_REGISTRY.json              # Central API/MCP/credential registry (new)
    _ROTATION_LOG.md                       # Rotation history (new)
  scripts/
    gatekeeper-cli.sh                      # CLI for managing registry (existing ref, needs impl)
    gatekeeper-sync.sh                     # Doppler → GitHub Secrets sync (existing)
    gatekeeper-rotate.sh                   # Rotation executor (new)
  templates/
    cicd/
      bom-self-heal.yml                    # BOM audit workflow (existing)
  .github/
    workflows/
      credential-gatekeeper.yml            # Issue credential scanner (existing)
      gatekeeper-rotate.yml                # Weekly rotation cron (new)
      gatekeeper-registry-drift.yml        # Daily registry drift check (new)
```

---

## 10. Agent Instructions

### For Any Agent Building a Product

1. After selecting a shape, fill the product's `BOM.md` with every external dependency.
2. Run `bash scripts/gatekeeper-cli.sh validate --bom <product>/BOM.md` before pushing.
3. If the Gatekeeper blocks (`bom_ready: false`), do NOT bypass. Wait for the `bom-block` issue to be resolved.
4. After build, ensure all API keys used are registered in the Gatekeeper registry.

### Credential Handling Rules

<!-- These are security policies for human and AI contributors — not executable code. -->

1. Secrets must only be stored in approved locations:
   - Doppler (primary — `revvel-standards/prd` for org-wide, `<project>/prd` for project-specific)
   - GitHub Actions Secrets (synced from Doppler by `gatekeeper-sync.sh`)
   - OpenHands org secrets (for OpenHands sessions only)
2. Rotating a key requires updating both Doppler AND the registry.
3. Registry entries must not be deleted while `used_by` is non-empty.
4. All rotations must be logged in `_ROTATION_LOG.md`.

### Adding New APIs or MCP Servers

1. Check the registry first — the API may already be provisioned for another product.
2. If it exists: add your product to `used_by`. Do not create a duplicate key.
3. If it's new: use `gatekeeper-cli.sh add` with all required fields.
4. If the API should go through Kong: add `--kong` flag to auto-register the service and route.

---

## Acceptance Criteria

- [ ] `_GATEKEEPER_REGISTRY.json` exists with schema validation.
- [ ] `gatekeeper-cli.sh` supports `add`, `list`, `remove`, `validate`, `rotate --check`, `sync`.
- [ ] `gatekeeper-rotate.sh` runs weekly and logs to `_ROTATION_LOG.md`.
- [ ] `gatekeeper-rotate.yml` workflow is active on the cron schedule.
- [ ] `gatekeeper-registry-drift.yml` workflow detects registry vs Doppler mismatches.
- [ ] Every product's `BOM.md` passes the validator before `bom_ready: true` is set.
- [ ] All existing APIs/MCP servers from `_MASTER_INVENTORY.md` have entries in the registry.
- [ ] Kong services are cross-referenced in registry entries where applicable.
