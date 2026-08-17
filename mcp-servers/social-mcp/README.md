# Social Media MCP Server

**Version:** 1.0.0
**Date:** April 30, 2026
**Status:** Ready for Integration
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## Overview

Comprehensive social media management via MCP. Find, claim, manage profiles across 12+ platforms.

## Quick Start

```bash
# Install
cd mcp-servers/social-mcp
pip install -e .

# Configure
export SOCIAL_MEDIA_TOKEN=your_token

# Run
python -m social_mcp.server
```

## Add to .mcp.json

```json
{
  "mcpServers": {
    "social": {
      "command": "python",
      "args": ["-m", "social_mcp.server"],
      "env": {
        "SOCIAL_MEDIA_TOKEN": "${SOCIAL_MEDIA_TOKEN}"
      }
    }
  }
}
```

---

## Tools

### Platform Discovery

| Tool | Description |
|------|-------------|
| `social_platforms_list` | List all 12 supported platforms |
| `social_profile_find` | Find profiles by username/email/domain |
| `social_missing_find` | Gap analysis - find missing profiles |

### Profile Management

| Tool | Description |
|------|-------------|
| `social_profile_claim` | Register new profile on platform |
| `social_profile_get` | Get full profile details |
| `social_profile_update` | Update bio, avatar, links |

### Domain Management

| Tool | Description |
|------|-------------|
| `social_domains_check` | Check domain availability |
| `social_domains_available` | Check brand across all platforms |

### Content & Analytics

| Tool | Description |
|------|-------------|
| `social_post_create` | Create scheduled post |
| `social_posts_list` | List recent posts |
| `social_analytics` | Get engagement metrics |

### Health

| Tool | Description |
|------|-------------|
| `social_health` | Check API status |

---

## Supported Platforms

1. X (Twitter)
2. Instagram
3. Facebook
4. TikTok
5. LinkedIn
6. YouTube
7. Threads
8. Bluesky
9. Mastodon
10. Reddit
11. Pinterest
12. Snapchat

---

## Environment Variables

```bash
SOCIAL_MEDIA_TOKEN=your_api_token
SOCIAL_API_URL=https://api.custom.com  # Optional custom endpoint
```

---

## Use Cases

### Find Missing Profiles
```python
social_missing_find(brand_name="MyBrand", owned_usernames="twitter,instagram")
# Returns: missing platforms to claim
```

### Check Brand Availability
```python
social_domains_available(brand_name="MyBrand", platforms="twitter,instagram,tiktok")
# Returns: which platforms have @MyBrand available
```

### Claim Profile
```python
social_profile_claim(
    platform="twitter",
    username="mybrand",
    email="brand@example.com",
    display_name="My Brand"
)
```

---

## References

- [MCP_STANDARD.md](../../docs/Master_Inventory/MCP_STANDARD.md)
- [SECRET_MANAGEMENT_STANDARD.md](../../docs/Master_Inventory/SECRET_MANAGEMENT_STANDARD.md)
