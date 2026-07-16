# Droplet Access Credentials

## MindMappr Droplet (Primary)
- **IP**: 164.90.148.7
- **SSH**: `ssh root@164.90.148.7`
- **Password**: [REDACTED — stored in vault]
- **Services Running**:
  - MindMappr Bot (systemd: mindmappr) — port 8080
  - meetaudreyevans.com Dashboard — port 80
- **Bot Token**: [REDACTED — see vault]
- **Telegram Group**: RISINGALOHA (chat ID: -1003735305867)
- **Bot Username**: @googlieeyes_bot

## Old Dashboard Droplet (SSH locked — key-only auth)
- **IP**: 147.182.211.246
- **Status**: SSH access lost (key-only auth, unknown key)
- **Note**: Can be destroyed once new dashboard is confirmed working

## Discord Bot (MindMappr)
- **Application Name**: MindMappr
- **Application ID**: 1490049282525630464
- **Public Key**: 6706fa6b815e5cc7242122afcdbd96684ad725b6da9c65db09c114bf58306053
- **Bot Token**: [stored as DISCORD_BOT_TOKEN in DO App Platform env vars]
- **Intents Enabled**: Message Content Intent, Server Members Intent
- **OAuth2 Scopes**: bot, applications.commands
- **Bot Permissions**: Send Messages, Read Message History, Embed Links, Attach Files, Use Slash Commands
- **Invite URL**: <https://discord.com/oauth2/authorize?client_id=1490049282525630464&permissions=274877991936&scope=bot+applications.commands>
- **Created**: 2026-04-04

## DigitalOcean API
- **Token**: [REDACTED — see vault]
- **MindMappr App Env Vars** (set via DO dashboard or doctl):
  - `DISCORD_BOT_TOKEN` = [set in DO App Platform environment variables]
  - `DISCORD_APP_ID` = 1490049282525630464
  - `DISCORD_PUBLIC_KEY` = 6706fa6b815e5cc7242122afcdbd96684ad725b6da9c65db09c114bf58306053

## GitHub
- **Org**: MIDNGHTSAPPHIRE
- **Repos**:
  - MIDNGHTSAPPHIRE/mindmappr — Bot backend
  - MIDNGHTSAPPHIRE/meetaudreyevans-dashboard — Dashboard
  - MIDNGHTSAPPHIRE/Pawsitting — PawSitting app
  - MIDNGHTSAPPHIRE/revvel-standards — Master standards template

## Slack
- **Workspace**: RISINGALOHA
- **Token**: [REDACTED — see vault]

## Namecheap (Domain Registrar)
- **Username**: uprisinghope
- **Password**: [REDACTED — stored in vault]
- **Login URL**: <https://www.namecheap.com/myaccount/login/>
- **Note**: Account requires email 2FA verification on new device logins
- **Domains Managed**:
  - `mind-mappr.com` — MindMappr app (ACTIVE, expires Feb 26, 2027)
    - DNS: ALIAS @ → mindmappr-qarz8.ondigitalocean.app
    - DNS: CNAME www → mindmappr-qarz8.ondigitalocean.app
    - Domain Privacy: ON (WithhheldforPrivacy)
    - PremiumDNS: ON
  - `agentintruder.com` — AgentIntruder project (ACTIVE, expires Feb 26, 2027)
    - Domain Privacy: ON
- **2 Expiring/Expired domains**: Check Namecheap dashboard for renewal status
