# Caspian SDK — Deep Research Packet (WR-16898)

**Upstream:** [TryCaspian/caspian-sdk](https://github.com/TryCaspian/caspian-sdk)  
**Observed:** 2026-08-07 via GitHub API + README + `https://api.trycaspianai.com/SKILL.md`  
**Output:** production SaaS app `products/caspian-channel-console`

---

## 1. Factual snapshot

| Field | Value | Confidence |
| --- | --- | --- |
| Stars | **527** | observed (GitHub API) |
| Forks | 135 | observed |
| Open issues | 30 | observed |
| License | AGPL-3.0 (GitHub license metadata) | observed |
| Primary language | Python | observed |
| Secondary SDK | TypeScript (`caspian-sdk` on npm) | observed |
| Homepage | <https://trycaspianai.com> | observed |
| Gateway | <https://api.trycaspianai.com> | observed |
| Created | 2026-07-20 | observed |
| Topics | agent-communication, slack, discord, telegram, whatsapp, langchain, … | observed |

> Note: README badges also mention Apache-2.0 in places; GitHub’s `license` field
> reports AGPL-3.0. Treat distribution/compliance under AGPL until clarified upstream.

---

## 2. What Caspian is

Caspian is an **agent communication SDK**: the agent decides *what* to say;
Caspian decides *how it exists* on human channels.

- **One identity** across email, Slack, Discord, Telegram, Bluesky, GitHub,
  Instagram, Messenger, X, SMS, and hosted WhatsApp / iMessage / phone.
- **One handler** — `on_message` + `message.reply()` answers on the arriving
  channel/thread.
- **Gateway** normalizes webhooks, verifies signatures, owns threading.
- **Self-hostable** FastAPI `comm-gateway` + hosted SaaS gateway.
- **Offline fakes** for every channel (131 tests claimed in README).

This is **agent-to-human**, not agent-to-agent (contrast A2A / ACP).

---

## 3. Architecture

```text
Slack / Discord / Telegram / Email / …
        │ webhooks (signed)
        ▼
  comm-gateway (providers registry)
        │ normalized Conversation/Message
        ▼
  CommClient.listen() / handle_webhook()
        │
  developer's single on_message handler
        │ message.reply()
        ▼
  same channel + thread
```

**SDKs**

- Python: `pip install caspian-sdk`
- TypeScript: `npm install caspian-sdk` (camelCase API, zero runtime deps)
- CLI: `caspian-cli` (`init`, `connect`, `listen`, `test-email`)

**Integrations**

- OpenClaw plugin / ClawHub skill
- OpenCode plugin (`caspian-opencode-plugin`)

---

## 4. Channel economics (planning)

| Tier | Channels | Notes |
| --- | --- | --- |
| Free / instant | Email (hosted inbox) | Mint sandbox key, no signup |
| BYO credentials | Telegram, Discord, Slack, Bluesky, SMS (Twilio/Telnyx), Meta DMs | Developer supplies tokens |
| Prepaid credit | X (and other paid network channels) | 401 account_required → 402 insufficient_credit |
| Hosted paid | WhatsApp, iMessage/RCS, phone/voice | May 400 if not live on gateway |

**Always** call `GET /v1/channels` before offering a channel — SKILL.md is explicit
that non-live channels error.

---

## 5. Competitors

| Competitor | Weakness | Caspian / Console edge |
| --- | --- | --- |
| DIY adapters in LangChain/CrewAI/AutoGen | N lifecycles; README cites 8–15% issue load on channel plumbing across 42 OSS projects | One handler + verified webhooks |
| Composio-style tool hubs | Tool OAuth ≠ continuous human conversation identity | Conversation-first threading |
| Botpress / Voiceflow | Closed platform lock-in | Open-core SDK + self-host gateway |
| n8n / Make messaging nodes | Workflow graphs, not stable agent persona | `message.reply()` in-thread semantics |

---

## 6. Marketing / SEO keywords

| Keyword | Intent | Notes |
| --- | --- | --- |
| agent communication sdk | high | category defining |
| multi channel ai agent | high | buyer language |
| slack discord telegram bot unified | mid | comparison SERP |
| ai agent email inbox | mid | email-first wedge |
| caspian sdk | brand | capture upstream demand |
| whatsapp business ai agent | high commercial | hosted upsell |
| agent messaging gateway | mid | infra buyers |

(Search volumes/CPCs not pulled live in this environment — treat as qualitative
priority ranking; confidence: research synthesis.)

---

## 7. Monetization path (Revvel product)

1. **SaaS console** (this app) — plan channel mix, simulate, export blueprints.
2. **Subscriptions** — $29 / $99 / $399 list.
3. **Services** — self-hosted gateway hardening, custom providers.
4. **Affiliate** — Caspian credit top-ups + complementary Revvel fleet tools.
5. **Polar.sh** — GitHub-native funding surface for the console source/add-ons.

Projected path contribution: tooling wedge toward Phase 1 $10k/mo (confidence: design).

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Upstream license AGPL | Keep console as separate product; document dependency; avoid copyleft contamination of proprietary agent code without counsel |
| Gateway channel availability churn | Always discover via `/v1/channels`; simulator works offline |
| X / WhatsApp ToS & paid APIs | Surface warnings in planner; reactive-only for X |
| Deliverability (new email domain) | Document spam-folder warmup from SKILL.md |
| Secret handling | Never put API keys in argv; env / stdin only |

---

## 9. Community chatter (synthesis)

Upstream positioning emphasizes pain every agent team hits: “we rebuilt Slack +
Discord + Telegram adapters again.” Discord invite and Devpost hackathon
(`caspian.devpost.com`) signal active growth-loop marketing. Trendshift badge
on README indicates breakout GitHub traffic. (Confidence: secondary from
upstream marketing surfaces, not primary forum scrape.)

---

## 10. Decision

**Build** a Revvel SaaS console that productizes Caspian research into a
clickable planner/simulator with exportable code — not a thin README mirror.
Shipped as `products/caspian-channel-console` for WR-16898.
