# Caspian SDK Research

## Overview

Caspian is an agent communication SDK that allows an AI agent to communicate across multiple channels (Slack, Discord, Email, Telegram, WhatsApp, Instagram, etc.) using a single unified identity and handler.

## Key Features

- **One Handler:** `message.reply()` automatically answers in the correct thread on the platform the message arrived from.
- **Webhook Verification:** Handles signature verification across different platforms (Slack, Meta, Telegram, X, email).
- **Capability Negotiation:** Adapters declare what the channel can do, ensuring agents don't try unsupported actions.
- **Offline Fakes:** 131 tests across Python and TS for testing without network.
- **Typing Indicators:** Native indicators on Discord/Telegram, instant acks elsewhere.
- **Behavior Guides:** `client.behavior_prompt()` provides per-channel etiquette.
- **Idempotent Connects:** Restart-safe connections.
- **Pluggable Registry:** Custom providers can be added easily.

## Value Proposition

Most open-source agent frameworks (like LangChain, CrewAI) spend a significant amount of effort maintaining individual channel adapters. Caspian removes this burden by providing a single API (`client.connect_email()`, `client.connect_discord()`, etc.) that normalizes the conversation and handles threading. This allows the AI agent to reason about communication rather than developers hardcoding platform-specific plumbing.

## Architecture

- **Gateway:** A self-hostable FastAPI server (`server/comm-gateway`) that handles incoming webhooks and normalizes them.
- **Client SDKs:** Python (`caspian-sdk`) and TypeScript (`caspian-sdk`) libraries that communicate with the gateway.
- **Integrations:** Includes plugins for OpenClaw (`openclaw-caspian`) and OpenCode (`caspian-opencode-plugin`).

## Use Cases

- Customer support agents seamlessly moving between channels.
- Sales lead follow-ups.
- Unified personal/executive assistants.
- Multi-tenant architectures where each customer gets their own isolated agent identity.

## Getting Started

```python
from caspian_sdk import CommClient

client = CommClient()  # Uses CASPIAN_API_KEY from .env
client.connect_email(username="my-agent")
client.connect_telegram(bot_token="...")

@client.on_message
def handle(message):
    message.reply(f"Echo: {message.text}")

client.listen()
```
