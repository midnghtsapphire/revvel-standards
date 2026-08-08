/**
 * Caspian Channel Console — domain engine.
 *
 * Pure logic for multi-channel agent blueprints, message simulation,
 * code generation, cost estimation, and research-backed channel catalog.
 * UMD: works in Node (CommonJS) and the browser via window.CaspianEngine.
 *
 * Research basis: https://github.com/TryCaspian/caspian-sdk (WR-16898)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CaspianEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** @type {const} */
  const RESEARCH = {
    repo: "TryCaspian/caspian-sdk",
    url: "https://github.com/TryCaspian/caspian-sdk",
    homepage: "https://trycaspianai.com",
    gateway: "https://api.trycaspianai.com",
    pypi: "https://pypi.org/project/caspian-sdk/",
    npm: "https://www.npmjs.com/package/caspian-sdk",
    stars: 527,
    forks: 135,
    openIssues: 30,
    license: "AGPL-3.0",
    language: "Python",
    observedAt: "2026-08-07",
    starsConfidence: "observed",
    description:
      "Agent communication SDK — one identity for an AI agent across email, Slack, Discord, Telegram, SMS, and more.",
    keywords: [
      "agent communication sdk",
      "multi channel ai agent",
      "slack discord telegram bot unified",
      "ai agent email inbox",
      "caspian sdk",
      "agent messaging gateway",
      "whatsapp business ai agent",
      "one handler multi channel",
    ],
  };

  /**
   * Channel catalog derived from Caspian README + SKILL.md live gateway notes.
   * costTier: free | byo-credentials | prepaid-credit | hosted-paid
   */
  const CHANNELS = [
    {
      id: "email",
      name: "Email",
      icon: "✉",
      costTier: "free",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_email",
      connectMethodTs: "connectEmail",
      credentials: [],
      capabilities: ["text", "threading", "attachments"],
      etiquette:
        "Prefer complete sentences. Include a clear subject context. Keep replies under ~400 words unless the user asked for depth.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Instant hosted inbox @agents.trycaspianai.com; custom domains supported.",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: "✈",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_telegram",
      connectMethodTs: "connectTelegram",
      credentials: ["bot_token"],
      capabilities: ["text", "threading", "typing", "media"],
      etiquette:
        "Short messages win. Use plain text or light Markdown. Typing indicators expected.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Bot token from @BotFather. Free on hosted gateway when token provided.",
    },
    {
      id: "discord",
      name: "Discord",
      icon: "🎮",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_discord",
      connectMethodTs: "connectDiscord",
      credentials: ["bot_token"],
      capabilities: ["text", "threading", "typing", "embeds"],
      etiquette:
        "Respect server culture. Prefer ephemeral/private replies for PII. Use embeds sparingly.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "One-click install available via install_discord() on hosted gateway.",
    },
    {
      id: "slack",
      name: "Slack",
      icon: "💬",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_slack",
      connectMethodTs: "connectSlack",
      credentials: ["slack_client_id", "slack_client_secret", "slack_signing_secret"],
      capabilities: ["text", "threading", "blocks", "reactions"],
      etiquette:
        "Reply in-thread. Keep block kits simple. Never spam channels — DM when personal.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Webhook signature verification mandatory. install_slack() returns authorize_url.",
    },
    {
      id: "bluesky",
      name: "Bluesky",
      icon: "☁",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_bluesky",
      connectMethodTs: "connectBluesky",
      credentials: ["handle", "app_password"],
      capabilities: ["text", "public_posts"],
      etiquette: "Public-by-default. Stay under character limits. No unsolicited mass replies.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Bring-your-own Bluesky handle + app password.",
    },
    {
      id: "github",
      name: "GitHub Issues/PRs",
      icon: "🐙",
      costTier: "byo-credentials",
      hosted: false,
      selfHost: true,
      liveOnGateway: false,
      connectMethod: "connect_github",
      connectMethodTs: "connectGithub",
      credentials: [
        "github_app_id",
        "github_app_slug",
        "github_private_key",
        "github_webhook_secret",
      ],
      capabilities: ["text", "threading", "mentions"],
      etiquette:
        "Reply only when mentioned. Keep comments concise and actionable. Link PRs/issues.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Self-host / own GitHub App. Not listed as live on managed gateway snapshot.",
    },
    {
      id: "x",
      name: "X / Twitter",
      icon: "𝕏",
      costTier: "prepaid-credit",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_x",
      connectMethodTs: "connectX",
      credentials: ["access_token", "access_secret", "user_id"],
      capabilities: ["text", "dm_reactive"],
      etiquette:
        "Reactive DMs only — no cold outreach (X ToS). Public replies ≤ 280 chars.",
      monthlyBaseUsd: 20,
      perMessageUsd: 0.02,
      notes: "Requires paid X API tier + Caspian prepaid credit after account sign-in.",
    },
    {
      id: "sms",
      name: "SMS / Phone",
      icon: "📱",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: true,
      connectMethod: "connect_phone",
      connectMethodTs: "connectPhone",
      credentials: ["twilio_or_telnyx_number"],
      capabilities: ["text", "short_form"],
      etiquette: "Keep under 160 chars when possible. Always honor STOP/HELP. No spam.",
      monthlyBaseUsd: 1.15,
      perMessageUsd: 0.0079,
      notes: "BYO Twilio/Telnyx number. Carrier A2P compliance is the operator's duty.",
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      icon: "🟢",
      costTier: "hosted-paid",
      hosted: true,
      selfHost: false,
      liveOnGateway: false,
      connectMethod: "connect_whatsapp",
      connectMethodTs: "connectWhatsapp",
      credentials: [],
      capabilities: ["text", "media", "24h_window"],
      etiquette:
        "Respect 24h customer-care window. Template messages outside the window. No bulk spam.",
      monthlyBaseUsd: 49,
      perMessageUsd: 0.005,
      notes: "Hosted-only channel. SKILL.md notes it may 400 if not live on a given gateway.",
    },
    {
      id: "imessage",
      name: "iMessage / RCS",
      icon: "💙",
      costTier: "hosted-paid",
      hosted: true,
      selfHost: false,
      liveOnGateway: false,
      connectMethod: "connect_imessage",
      connectMethodTs: "connectImessage",
      credentials: [],
      capabilities: ["text", "media"],
      etiquette: "No markdown. Keep conversational. Confirm identity carefully.",
      monthlyBaseUsd: 79,
      perMessageUsd: 0.01,
      notes: "Hosted gateway channel; availability depends on deployment.",
    },
    {
      id: "instagram",
      name: "Instagram DM",
      icon: "📷",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: false,
      connectMethod: "connect_instagram",
      connectMethodTs: "connectInstagram",
      credentials: ["meta_app", "page_token"],
      capabilities: ["text", "media"],
      etiquette: "Fast, friendly, mobile-first. Avoid long walls of text.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Meta app + Page required. Gateway live status varies by deployment.",
    },
    {
      id: "messenger",
      name: "Facebook Messenger",
      icon: "💭",
      costTier: "byo-credentials",
      hosted: true,
      selfHost: true,
      liveOnGateway: false,
      connectMethod: "connect_facebook",
      connectMethodTs: "connectFacebook",
      credentials: ["meta_app", "page_token"],
      capabilities: ["text", "media", "quick_replies"],
      etiquette: "Use quick replies for common intents. Stay on-brand for the Page.",
      monthlyBaseUsd: 0,
      perMessageUsd: 0,
      notes: "Meta app + Page required.",
    },
  ];

  const PRICING_TIERS = [
    {
      id: "starter",
      name: "Starter",
      priceUsd: 29,
      period: "mo",
      seats: 1,
      maxChannels: 3,
      maxAgents: 1,
      messagesIncluded: 5000,
      features: [
        "Channel planner + cost estimator",
        "Offline message simulator",
        "Python & TypeScript code export",
        "Behavior-prompt composer",
        "Community support",
      ],
      cta: "Start free trial",
      highlight: false,
    },
    {
      id: "pro",
      name: "Pro",
      priceUsd: 99,
      period: "mo",
      seats: 5,
      maxChannels: 12,
      maxAgents: 10,
      messagesIncluded: 50000,
      features: [
        "Everything in Starter",
        "Multi-agent fleet blueprints",
        "Markdown / JSON blueprint export",
        "Gateway health checklist",
        "Priority support",
        "Polar.sh / Stripe checkout ready",
      ],
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      priceUsd: 399,
      period: "mo",
      seats: 50,
      maxChannels: 100,
      maxAgents: 100,
      messagesIncluded: 500000,
      features: [
        "Everything in Pro",
        "Self-hosted gateway runbooks",
        "SSO / multi-tenant scoping recipes",
        "Custom channel adapter coaching",
        "SLA + dedicated slack channel",
      ],
      cta: "Talk to sales",
      highlight: false,
    },
  ];

  const COMPETITORS = [
    {
      name: "DIY adapters in LangChain / CrewAI / AutoGen",
      starsNote: "framework stars vary; plumbing still in-tree",
      weakness: "Each channel is a separate bot lifecycle — 8–15% of issues are channel plumbing (Caspian claim, measured on 42 OSS agent projects).",
      ourEdge: "One handler, normalized messages, webhook verification built-in.",
    },
    {
      name: "Composio / tool-calling hubs",
      starsNote: "tool auth focus",
      weakness: "Great for tool OAuth; weaker as a continuous human conversation layer with threading continuity.",
      ourEdge: "Conversation-first identity across human channels.",
    },
    {
      name: "Botpress / Voiceflow",
      starsNote: "closed platforms",
      weakness: "Vendor lock-in; hard to keep one identity in your own agent runtime.",
      ourEdge: "Open-core SDK (Python + TS) + self-hostable gateway.",
    },
    {
      name: "n8n / Make.com messaging nodes",
      starsNote: "automation, not agent identity",
      weakness: "Workflow graphs, not a stable agent persona with reply-in-thread semantics.",
      ourEdge: "message.reply() always answers on the arriving channel/thread.",
    },
  ];

  function listChannels() {
    return CHANNELS.map(clone);
  }

  function getChannel(id) {
    const ch = CHANNELS.find((c) => c.id === id);
    if (!ch) throw new Error(`Unknown channel: ${id}`);
    return clone(ch);
  }

  function listPricingTiers() {
    return PRICING_TIERS.map(clone);
  }

  function getResearch() {
    return clone(RESEARCH);
  }

  function listCompetitors() {
    return COMPETITORS.map(clone);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeAgentName(name) {
    const raw = String(name || "").trim().toLowerCase();
    const cleaned = raw
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleaned) throw new Error("Agent name is required");
    if (cleaned.length < 2) throw new Error("Agent name must be at least 2 characters");
    if (cleaned.length > 32) throw new Error("Agent name must be 32 characters or fewer");
    return cleaned;
  }

  /**
   * @param {{ agentName: string, channels: string[], persona?: string, language?: 'python'|'typescript' }} input
   */
  function buildBlueprint(input) {
    if (!input || typeof input !== "object") throw new Error("blueprint input required");
    const agentName = normalizeAgentName(input.agentName);
    const channelIds = uniqueStrings(input.channels || []);
    if (channelIds.length === 0) throw new Error("Select at least one channel");

    const channels = channelIds.map((id) => getChannel(id));
    const persona =
      String(input.persona || "Helpful multi-channel support agent").trim() ||
      "Helpful multi-channel support agent";
    const language = input.language === "typescript" ? "typescript" : "python";

    const freeCount = channels.filter((c) => c.costTier === "free").length;
    const paidCount = channels.length - freeCount;
    const liveCount = channels.filter((c) => c.liveOnGateway).length;

    return {
      agentName,
      persona,
      language,
      channels,
      channelIds,
      emailAddress: channels.some((c) => c.id === "email")
        ? `${agentName}@agents.trycaspianai.com`
        : null,
      stats: {
        channelCount: channels.length,
        freeCount,
        paidCount,
        liveOnGatewayCount: liveCount,
        capabilityCount: uniqueStrings(channels.flatMap((c) => c.capabilities)).length,
      },
      warnings: collectWarnings(channels),
      createdAt: "blueprint", // deterministic placeholder; UI stamps wall clock separately
    };
  }

  function collectWarnings(channels) {
    const warnings = [];
    for (const ch of channels) {
      if (!ch.liveOnGateway) {
        warnings.push(
          `${ch.name}: may return 400 on managed gateway if not enabled — verify GET /v1/channels first.`
        );
      }
      if (ch.costTier === "prepaid-credit" || ch.costTier === "hosted-paid") {
        warnings.push(
          `${ch.name}: requires Caspian account sign-in and prepaid credit (401 account_required / 402 insufficient_credit).`
        );
      }
      if (ch.id === "x") {
        warnings.push("X: reactive DMs only; paid X API subscription required.");
      }
      if (ch.id === "sms") {
        warnings.push("SMS: carrier A2P compliance and STOP handling are your responsibility.");
      }
    }
    return uniqueStrings(warnings);
  }

  /**
   * Estimate monthly spend for channel mix + outbound volume.
   * @param {{ channels: string[], messagesPerMonth: number, seats?: number, planId?: string }} input
   */
  function estimateCost(input) {
    if (!input || typeof input !== "object") throw new Error("estimate input required");
    const channelIds = uniqueStrings(input.channels || []);
    if (channelIds.length === 0) throw new Error("Select at least one channel");
    const messages = Number(input.messagesPerMonth);
    if (!Number.isFinite(messages) || messages < 0) {
      throw new Error("messagesPerMonth must be a non-negative number");
    }
    if (messages > 10_000_000) throw new Error("messagesPerMonth too large");

    const channels = channelIds.map((id) => getChannel(id));
    const perChannel = channels.map((ch) => {
      const base = ch.monthlyBaseUsd;
      const variable = ch.perMessageUsd * messages;
      return {
        id: ch.id,
        name: ch.name,
        baseUsd: round2(base),
        variableUsd: round2(variable),
        totalUsd: round2(base + variable),
      };
    });

    const channelTotal = round2(perChannel.reduce((s, row) => s + row.totalUsd, 0));
    const plan = pickPlan(input.planId, channelIds.length, Number(input.seats) || 1);
    const planUsd = plan.priceUsd;
    const overage = Math.max(0, messages - plan.messagesIncluded);
    // Console SaaS overage model (not Caspian gateway): $2 / 1k msgs
    const overageUsd = round2((overage / 1000) * 2);
    const totalUsd = round2(channelTotal + planUsd + overageUsd);

    return {
      messagesPerMonth: messages,
      plan,
      perChannel,
      channelTotalUsd: channelTotal,
      planUsd,
      overageMessages: overage,
      overageUsd,
      totalUsd,
      currency: "USD",
      notes: [
        "Channel variable costs are planning estimates from public carrier/API ranges — label: estimate.",
        "Caspian free channels have $0 gateway fee; prepaid channels bill via Caspian dashboard credit.",
        "Console plan pricing is Revvel SaaS (this product), separate from Caspian gateway spend.",
      ],
    };
  }

  function pickPlan(planId, channelCount, seats) {
    if (planId) {
      const found = PRICING_TIERS.find((p) => p.id === planId);
      if (!found) throw new Error(`Unknown plan: ${planId}`);
      return clone(found);
    }
    // Auto-pick smallest plan that fits channel + seat needs
    const fit = PRICING_TIERS.find(
      (p) => p.maxChannels >= channelCount && p.seats >= seats
    );
    return clone(fit || PRICING_TIERS[PRICING_TIERS.length - 1]);
  }

  /**
   * Compose Caspian-style behavior prompt for selected channels.
   * @param {string[]} channelIds
   */
  function buildBehaviorPrompt(channelIds) {
    const ids = uniqueStrings(channelIds || []);
    if (ids.length === 0) throw new Error("Select at least one channel");
    const channels = ids.map((id) => getChannel(id));
    const lines = [
      "You are a single agent identity reachable on multiple human channels.",
      "Always answer on the channel and thread the user used.",
      "Never invent credentials. Never send unsolicited bulk messages.",
      "",
      "Channel etiquette:",
    ];
    for (const ch of channels) {
      lines.push(`- ${ch.name}: ${ch.etiquette}`);
    }
    return lines.join("\n");
  }

  /**
   * Generate integration source for Python or TypeScript.
   * @param {{ agentName: string, channels: string[], language?: 'python'|'typescript', persona?: string }} input
   */
  function generateIntegrationCode(input) {
    const bp = buildBlueprint(input);
    if (bp.language === "typescript") return generateTypeScript(bp);
    return generatePython(bp);
  }

  function generatePython(bp) {
    const connects = bp.channels
      .map((ch) => {
        if (ch.id === "email") {
          return `email = client.connect_email(username="${bp.agentName}")\nprint("Agent email:", email["address"])`;
        }
        if (ch.credentials.length === 0) {
          return `client.${ch.connectMethod}()  # ${ch.name}`;
        }
        const args = ch.credentials.map((c) => `${c}=os.environ["${c.toUpperCase()}"]`).join(", ");
        return `client.${ch.connectMethod}(${args})  # ${ch.name}`;
      })
      .join("\n");

    return [
      '"""Generated by Caspian Channel Console — review before production use."""',
      "import os",
      "from caspian_sdk import CommClient",
      "",
      `PERSONA = ${JSON.stringify(bp.persona)}`,
      "",
      "client = CommClient()  # reads CASPIAN_API_KEY / CASPIAN_BASE_URL",
      connects,
      "",
      "behavior = client.behavior_prompt()  # per-channel etiquette",
      "",
      "@client.on_message",
      "def handle(message):",
      "    text = (message.text or \"\").strip()",
      "    sender = (message.sender or {}).get(\"address\", \"unknown\")",
      "    # One handler for every connected channel — reply stays in-thread.",
      `    reply = f\"[{bp.agentName}] {PERSONA}\\nYou said: {text}\\n(from {sender})\"`,
      "    message.reply(reply)",
      "",
      'if __name__ == "__main__":',
      "    print(\"Listening on connected channels…\")",
      "    client.listen()",
      "",
    ].join("\n");
  }

  function generateTypeScript(bp) {
    const connects = bp.channels
      .map((ch) => {
        if (ch.id === "email") {
          return `const inbox = await client.connectEmail({ username: "${bp.agentName}" });\nconsole.log("Agent email:", inbox.address);`;
        }
        if (ch.credentials.length === 0) {
          return `await client.${ch.connectMethodTs}(); // ${ch.name}`;
        }
        const args = ch.credentials
          .map((c) => `${camel(c)}: process.env.${c.toUpperCase()}!`)
          .join(", ");
        return `await client.${ch.connectMethodTs}({ ${args} }); // ${ch.name}`;
      })
      .join("\n");

    return [
      "// Generated by Caspian Channel Console — review before production use.",
      'import { CommClient } from "caspian-sdk";',
      "",
      `const PERSONA = ${JSON.stringify(bp.persona)};`,
      "",
      "async function main() {",
      "  const client = new CommClient(); // reads CASPIAN_API_KEY / CASPIAN_BASE_URL",
      `  ${connects.split("\n").join("\n  ")}`,
      "",
      "  const behavior = await client.behaviorPrompt?.() ?? \"\";",
      "  void behavior;",
      "",
      "  client.onMessage(async (message) => {",
      "    const text = (message.text ?? \"\").trim();",
      "    const sender = message.sender?.address ?? \"unknown\";",
      `    await message.reply(\`[${bp.agentName}] \${PERSONA}\\nYou said: \${text}\\n(from \${sender})\`);`,
      "  });",
      "",
      '  console.log("Listening on connected channels…");',
      "  await client.listen();",
      "}",
      "",
      "main().catch((err) => {",
      "  console.error(err);",
      "  process.exit(1);",
      "});",
      "",
    ].join("\n");
  }

  function camel(s) {
    return String(s).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  /**
   * Offline simulator of Caspian's one-handler model.
   * @param {{ agentName: string, channels: string[], persona?: string, inbound: Array<{channel: string, text: string, sender?: string}> }} input
   */
  function simulateConversation(input) {
    const bp = buildBlueprint({
      agentName: input.agentName,
      channels: input.channels,
      persona: input.persona,
    });
    const inbound = Array.isArray(input.inbound) ? input.inbound : [];
    if (inbound.length === 0) throw new Error("Provide at least one inbound message");
    if (inbound.length > 100) throw new Error("Too many inbound messages (max 100)");

    const allowed = new Set(bp.channelIds);
    const events = [];
    let idx = 0;

    for (const msg of inbound) {
      idx += 1;
      const channelId = String(msg.channel || "");
      if (!allowed.has(channelId)) {
        throw new Error(`Inbound channel not in blueprint: ${channelId}`);
      }
      const ch = getChannel(channelId);
      const text = String(msg.text || "").trim();
      if (!text) throw new Error(`Inbound message #${idx} has empty text`);
      const sender = String(msg.sender || `user@${channelId}.example`).trim();
      const conversationId = `${channelId}:thread-${hashStr(sender) % 1000}`;

      const replyText = formatReply({
        agentName: bp.agentName,
        persona: bp.persona,
        channelName: ch.name,
        text,
        sender,
      });

      events.push({
        id: `evt-${idx}`,
        direction: "inbound",
        channel: channelId,
        channelName: ch.name,
        conversationId,
        sender,
        text,
      });
      events.push({
        id: `evt-${idx}-reply`,
        direction: "outbound",
        channel: channelId,
        channelName: ch.name,
        conversationId,
        sender: bp.agentName,
        text: replyText,
      });
    }

    return {
      agentName: bp.agentName,
      persona: bp.persona,
      channelIds: bp.channelIds,
      eventCount: events.length,
      events,
      summary: {
        inbound: events.filter((e) => e.direction === "inbound").length,
        outbound: events.filter((e) => e.direction === "outbound").length,
        channelsTouched: uniqueStrings(events.map((e) => e.channel)).length,
      },
    };
  }

  function formatReply({ agentName, persona, channelName, text, sender }) {
    return `[${agentName} · ${channelName}] ${persona}\nYou said: ${text}\n(from ${sender})`;
  }

  /**
   * Export blueprint as Markdown runbook.
   */
  function exportBlueprintMarkdown(input) {
    const bp = buildBlueprint(input);
    const cost = estimateCost({
      channels: bp.channelIds,
      messagesPerMonth: Number(input.messagesPerMonth) || 10000,
      planId: input.planId,
      seats: input.seats,
    });
    const behavior = buildBehaviorPrompt(bp.channelIds);
    const code = generateIntegrationCode({
      agentName: bp.agentName,
      channels: bp.channelIds,
      language: bp.language,
      persona: bp.persona,
    });

    const channelTable = bp.channels
      .map(
        (c) =>
          `| ${c.name} | \`${c.id}\` | ${c.costTier} | ${c.liveOnGateway ? "yes" : "check"} | ${c.capabilities.join(", ")} |`
      )
      .join("\n");

    const warnings = bp.warnings.map((w) => `- ${w}`).join("\n") || "- None";

    return [
      `# Agent blueprint: ${bp.agentName}`,
      "",
      `> Generated by Caspian Channel Console · research source: ${RESEARCH.url} (${RESEARCH.stars}★ observed ${RESEARCH.observedAt})`,
      "",
      "## Identity",
      "",
      `- **Agent name:** ${bp.agentName}`,
      `- **Persona:** ${bp.persona}`,
      `- **Language:** ${bp.language}`,
      bp.emailAddress ? `- **Hosted email:** ${bp.emailAddress}` : null,
      "",
      "## Channels",
      "",
      "| Channel | ID | Cost tier | Live on gateway | Capabilities |",
      "| --- | --- | --- | --- | --- |",
      channelTable,
      "",
      "## Cost estimate (planning)",
      "",
      `- **Console plan:** ${cost.plan.name} ($${cost.planUsd}/${cost.plan.period})`,
      `- **Messages / month:** ${cost.messagesPerMonth}`,
      `- **Channel transport estimate:** $${cost.channelTotalUsd}`,
      `- **Overage:** $${cost.overageUsd}`,
      `- **Total planning figure:** $${cost.totalUsd} USD / month`,
      "",
      ...cost.notes.map((n) => `- Note: ${n}`),
      "",
      "## Warnings",
      "",
      warnings,
      "",
      "## Behavior prompt",
      "",
      "```text",
      behavior,
      "```",
      "",
      "## Integration code",
      "",
      bp.language === "typescript" ? "```ts" : "```python",
      code.trimEnd(),
      "```",
      "",
      "## Verify (hosted gateway)",
      "",
      "```bash",
      `curl -s -X POST ${RESEARCH.gateway}/v1/test-emails \\`,
      '  -H "Authorization: ******" \\',
      "  -H 'Content-Type: application/json' \\",
      `  -d '{"text":"hello from ${bp.agentName}"}'`,
      "```",
      "",
      "## Citations",
      "",
      `- Caspian SDK README / SKILL.md — ${RESEARCH.url}`,
      `- Gateway — ${RESEARCH.gateway}`,
      `- Stars: ${RESEARCH.stars} (confidence: ${RESEARCH.starsConfidence}, as of ${RESEARCH.observedAt})`,
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  function exportBlueprintJson(input) {
    const bp = buildBlueprint(input);
    const cost = estimateCost({
      channels: bp.channelIds,
      messagesPerMonth: Number(input.messagesPerMonth) || 10000,
      planId: input.planId,
      seats: input.seats,
    });
    return {
      research: getResearch(),
      blueprint: bp,
      behaviorPrompt: buildBehaviorPrompt(bp.channelIds),
      cost,
      code: generateIntegrationCode({
        agentName: bp.agentName,
        channels: bp.channelIds,
        language: bp.language,
        persona: bp.persona,
      }),
    };
  }

  /** Recommend a channel mix for a use-case slug. */
  function recommendChannels(useCase) {
    const key = String(useCase || "")
      .trim()
      .toLowerCase();
    const map = {
      support: ["email", "slack", "discord", "whatsapp"],
      sales: ["email", "sms", "telegram", "whatsapp"],
      community: ["discord", "slack", "telegram", "bluesky"],
      personal: ["email", "telegram", "sms"],
      devops: ["slack", "github", "email", "discord"],
      social: ["x", "bluesky", "instagram", "messenger"],
    };
    const ids = map[key];
    if (!ids) {
      throw new Error(
        `Unknown use case '${useCase}'. Try: ${Object.keys(map).join(", ")}`
      );
    }
    return ids.map((id) => getChannel(id));
  }

  function uniqueStrings(arr) {
    const out = [];
    const seen = new Set();
    for (const raw of arr) {
      const v = String(raw || "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  }

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function hashStr(s) {
    let h = 0;
    const str = String(s);
    for (let i = 0; i < str.length; i += 1) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function gatewayChecklist() {
    return [
      {
        id: "mint-key",
        title: "Mint sandbox API key",
        command: `curl -s -X POST ${RESEARCH.gateway}/v1/projects/sandbox -H 'Content-Type: application/json' -d '{"name":"my-agent"}'`,
        detail: "Writes project_id + api_key. Store as CASPIAN_API_KEY. Free channels need no signup.",
      },
      {
        id: "list-channels",
        title: "List live channels on this gateway",
        command: `curl -s ${RESEARCH.gateway}/v1/channels -H "Authorization: ******"`,
        detail: "Only offer channels returned here. Others may 400.",
      },
      {
        id: "connect-email",
        title: "Connect email with a chosen username",
        command: "client.connect_email(username=\"your-agent\")",
        detail: "Do not call bare connect_email() — ugly random names. Handle 409 suggestions.",
      },
      {
        id: "handler",
        title: "Write one on_message handler",
        command: "message.reply(agent(message.text))",
        detail: "Same handler for every channel. Key memory on conversation_id.",
      },
      {
        id: "behavior",
        title: "Inject behavior_prompt()",
        command: "system_prompt += client.behavior_prompt()",
        detail: "Per-channel etiquette so the model matches Slack vs SMS vs email.",
      },
      {
        id: "verify",
        title: "Send test email and confirm message.sent",
        command: `curl -s -X POST ${RESEARCH.gateway}/v1/test-emails -H "Authorization: ******" -H 'Content-Type: application/json' -d '{"text":"hello"}'`,
        detail: "Then GET /v1/events?type=message.sent. Check spam if real mail has no reply.",
      },
    ];
  }

  return {
    RESEARCH,
    CHANNELS,
    PRICING_TIERS,
    listChannels,
    getChannel,
    listPricingTiers,
    getResearch,
    listCompetitors,
    normalizeAgentName,
    buildBlueprint,
    estimateCost,
    buildBehaviorPrompt,
    generateIntegrationCode,
    simulateConversation,
    exportBlueprintMarkdown,
    exportBlueprintJson,
    recommendChannels,
    gatewayChecklist,
  };
});
