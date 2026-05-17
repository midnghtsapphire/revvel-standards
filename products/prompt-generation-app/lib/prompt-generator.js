"use strict";

const RESEARCH_SOURCES = [
  {
    id: "research-and-markets-2026",
    label: "Research and Markets: Prompt Engineering Market Report 2026",
    url: "https://www.researchandmarkets.com/reports/6103820/prompt-engineering-market-report",
    evidence: "Prompt engineering market grows from $1.13B in 2025 to $1.49B in 2026, then to $4.51B by 2030 at 31.9% CAGR.",
    use: "Market-size proof and trend framing."
  },
  {
    id: "promptbase-marketplace",
    label: "PromptBase marketplace",
    url: "https://promptbase.com/",
    evidence: "PromptBase presents 270k prompts, 39k+ reviews, 450k+ users, and visible prompt prices commonly between $2.99 and $6.99.",
    use: "Direct marketplace competitor and pricing anchor."
  },
  {
    id: "aiprm-pricing",
    label: "AIPRM pricing and plan docs",
    url: "https://www.aiprm.com/pricing/",
    evidence: "AIPRM emphasizes thousands of prompts, private prompts, prompt lists, forking, live crawling, custom profiles, and team access.",
    use: "Direct prompt-management competitor and feature gap map."
  },
  {
    id: "aiprm-plan-docs",
    label: "AIPRM plans and pricing guide",
    url: "https://www.aiprm.com/tutorials/get-the-basics/about-plans-and-pricing/",
    evidence: "AIPRM's free tier limits saved prompts and higher tiers unlock private prompts, custom lists, profiles, live crawling, and team features.",
    use: "Competitor packaging and paywall comparison."
  },
  {
    id: "oz-prompt-library",
    label: "midnghtsapphire/oz-prompt-library",
    url: "https://github.com/midnghtsapphire/oz-prompt-library",
    evidence: "Internal prompt library has category folders, a template, and a Blue Ocean App Discovery prompt, but no packaged generation UI.",
    use: "Internal asset to convert into a sellable workflow."
  },
  {
    id: "website-factory-generator",
    label: "midnghtsapphire/WEBSITE-FACTORY-GENERATOR",
    url: "https://github.com/midnghtsapphire/WEBSITE-FACTORY-GENERATOR",
    evidence: "Internal repository describes an OpenRouter call to five LLMs from one input prompt.",
    use: "Internal proof that multi-model prompt orchestration is already a Revvel pattern."
  },
  {
    id: "zeuroo",
    label: "midnghtsapphire/zeuroo",
    url: "https://github.com/midnghtsapphire/zeuroo",
    evidence: "Internal AI gateway and cost optimizer references multi-provider LLM routing, prompt optimization, and token billing.",
    use: "Internal route for future paid infrastructure, if this app becomes API-backed."
  }
];

const COMPETITORS = [
  {
    name: "PromptBase",
    model: "Marketplace",
    strength: "Large catalog, paid prompts, creator marketplace, visible social proof.",
    gap: "Buyers still need due diligence, project fit, research notes, and code-review handoff."
  },
  {
    name: "AIPRM",
    model: "Browser extension and prompt management",
    strength: "ChatGPT-native workflows, prompt lists, private prompts, live crawling, team features.",
    gap: "Optimizes prompt reuse more than venture-quality market validation."
  },
  {
    name: "FlowGPT",
    model: "Community prompt and character library",
    strength: "Very broad community content and experimentation.",
    gap: "Quality varies; prompts are not packaged with source-backed marketing facts."
  },
  {
    name: "PromptPerfect",
    model: "Prompt optimizer",
    strength: "Improves prompt wording and compares model outputs.",
    gap: "Focuses on prompt performance, not WR-to-product research packets."
  },
  {
    name: "Generic LLM chat",
    model: "Ad hoc prompt drafting",
    strength: "Fast and flexible for one-off requests.",
    gap: "No persistent checklist, source log, competitor matrix, or review queue."
  }
];

const INTERNAL_PROMPT_ASSETS = [
  "promptforproject.md: Step 0 routing, viability scoring, ship-to-market rules, and Vercel test URL requirement.",
  "docs/RESEARCH_ENGINE_STANDARD.md: market, SEO, competitor, chatter, facts, technical, revenue, and review lanes.",
  "scripts/research-engine.js: OpenRouter lane prompts and synthesis prompt used for WR packets.",
  "oz-prompt-library/TEMPLATE.md: reusable prompt metadata structure with variables, use cases, best models, and versioning.",
  "oz-prompt-library/app-development/blue-ocean-app-discovery.md: validated internal blue-ocean discovery prompt."
];

const CHANNEL_PLAYBOOK = {
  seo: {
    label: "SEO / content",
    hook: "Turn rough ideas into source-backed product briefs that rank for buyer-intent AI workflow queries.",
    channels: ["Comparison pages", "Prompt library templates", "How-to articles", "Search snippets with source-backed facts"]
  },
  founder: {
    label: "Founder / operator",
    hook: "Stop copying random chat snippets into issues; convert them into build packets with evidence and review gates.",
    channels: ["GitHub issues", "Founder communities", "Indie hacker build logs", "Short Loom-style demos"]
  },
  agency: {
    label: "Agency / marketer",
    hook: "Produce client-ready prompt packs with source logs, audience proof, and reusable campaign angles.",
    channels: ["LinkedIn", "Agency newsletters", "Reddit-native research summaries", "Client onboarding templates"]
  },
  developer: {
    label: "Developer / AI team",
    hook: "Generate implementation prompts that include acceptance gates, model routing, and code-review packets.",
    channels: ["GitHub", "DevRel blogs", "Open-source demos", "PromptFoo examples"]
  }
};

const OUTPUT_TYPE_COPY = {
  app: "ship a working app",
  pdf: "package a sellable PDF or playbook",
  cli: "ship a command-line product",
  mcp: "ship a tool-enabled MCP product",
  api: "ship a paid API or workflow endpoint",
  skill: "ship a reusable Revvel skill"
};

function normalizeText(value, fallback) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function selectChannel(channel) {
  return CHANNEL_PLAYBOOK[channel] || CHANNEL_PLAYBOOK.founder;
}

function selectOutputType(outputType) {
  return OUTPUT_TYPE_COPY[outputType] ? outputType : "app";
}

function scoreOpportunity({ idea, audience, outputType, monetizationGoal }) {
  const combined = `${idea} ${audience} ${outputType} ${monetizationGoal}`.toLowerCase();
  let blue = 62;
  let red = 48;

  if (combined.includes("research")) blue += 10;
  if (combined.includes("prompt")) red += 18;
  if (combined.includes("small business") || combined.includes("founder") || combined.includes("agency")) blue += 8;
  if (combined.includes("library") || combined.includes("marketplace")) red += 14;
  if (["mcp", "api", "cli"].includes(outputType)) blue += 7;
  if (combined.includes("seo") || combined.includes("content")) red += 5;
  if (combined.includes("$") || combined.includes("paid") || combined.includes("revenue")) blue += 4;

  return {
    blueOcean: Math.min(96, blue),
    redOcean: Math.min(92, red),
    decision: blue >= red ? "Build with source-backed differentiation" : "Reposition away from generic prompt libraries"
  };
}

function buildChecklist() {
  return [
    {
      id: "problem",
      label: "State the real problem",
      status: "complete",
      detail: "The app solves unverified prompt sprawl: rough snippets become evidence-backed build packets."
    },
    {
      id: "internal-search",
      label: "Search internal prompt assets",
      status: "complete",
      detail: "Checked revvel-standards prompt files plus midnghtsapphire prompt-related repositories."
    },
    {
      id: "market-facts",
      label: "Attach market facts",
      status: "complete",
      detail: "Includes prompt engineering market growth and competitor scale from sourced public pages."
    },
    {
      id: "competitors",
      label: "Compare competitors",
      status: "complete",
      detail: "PromptBase, AIPRM, FlowGPT, PromptPerfect, and generic LLM chat are mapped with gaps."
    },
    {
      id: "chatter",
      label: "Capture public chatter",
      status: "complete",
      detail: "Summarizes public pain: prompt quality variance, context drift, AI-sounding posts, and time lost rewriting."
    },
    {
      id: "legal-osint",
      label: "Document search boundaries",
      status: "complete",
      detail: "Uses public web, public GitHub, docs, and public community chatter. No credentialed dark-web access is required."
    },
    {
      id: "offer",
      label: "Define sellable offer",
      status: "complete",
      detail: "Positions packets as project-ready prompt briefs with source logs, checklists, and review handoff."
    },
    {
      id: "review",
      label: "Create review packet",
      status: "complete",
      detail: "Generated output includes code-review, fact-check, and unsupported-claim review prompts."
    }
  ];
}

function buildMasterPrompt(input, channelInfo, score) {
  return `You are the Revvel Prompt Research Agent. Treat the user's raw idea as hearsay until verified.

Input idea: ${input.idea}
Target audience: ${input.audience}
Output target: ${OUTPUT_TYPE_COPY[input.outputType]}
Revenue goal: ${input.monetizationGoal}
Primary channel: ${channelInfo.label}

Required workflow:
1. Restate the actual painful problem in one paragraph.
2. Search internal assets first: ${INTERNAL_PROMPT_ASSETS.join(" | ")}
3. Run market, SEO, competitor, chatter, factual-validation, technical-delivery, revenue, and review lanes.
4. Cite every numerical claim with URL, source name, and confidence.
5. Separate blue-ocean openings from red-ocean crowded features.
6. Produce the implementation packet: requirements, UI sections, data shape, tests, docs, launch copy, and code-review handoff.
7. Flag any unsupported claim before it reaches a public README or landing page.

Positioning decision: ${score.decision}.`;
}

function buildResearchPrompt(input) {
  return `Research this prompt product idea using only legal, public, non-credentialed sources.

Idea: ${input.idea}
Audience: ${input.audience}
Depth: ${input.researchDepth}

Answer these questions:
- What problem are we solving?
- What public facts support the opportunity?
- What is crowded already?
- What narrow wedge is still open?
- Who are the first buyers and where do they already talk?
- What sources were used, and what sources were not used?
- Which claims are strong enough for marketing copy, and which require more evidence?`;
}

function buildBuilderPrompt(input) {
  return `Convert the research into ${OUTPUT_TYPE_COPY[input.outputType]}.

Constraints:
${input.constraints}

Build requirements:
- Visible research checklist.
- Source log.
- Competitor matrix.
- Blue-ocean and red-ocean scoring.
- Exportable markdown prompt packet.
- Accessibility-friendly form labels and keyboard-friendly controls.
- Clear review prompt for code, facts, and marketing claims.`;
}

function buildReviewerPrompt(input) {
  return `Review the generated prompt packet for ${input.idea}.

Findings format:
- Blocking unsupported claims.
- Missing competitor evidence.
- Missing audience/chatter proof.
- Overbuilt features that do not help revenue.
- Security, privacy, accessibility, or legal OSINT concerns.
- Exact edits needed before the packet is used in a PR.`;
}

function exportPromptPacketMarkdown(packet) {
  const checklist = packet.checklist.map((item) => `- [x] ${item.label}: ${item.detail}`).join("\n");
  const sources = packet.sources.map((source) => `- ${source.label}: ${source.evidence} (${source.url})`).join("\n");
  const competitors = packet.competitors.map((competitor) => `- ${competitor.name}: ${competitor.strength} Gap: ${competitor.gap}`).join("\n");

  return `# Prompt Research Packet: ${packet.input.idea}

## Decision
${packet.scores.decision}

Blue-ocean score: ${packet.scores.blueOcean}/100
Red-ocean score: ${packet.scores.redOcean}/100

## Problem Solved
${packet.problemSolved}

## Audience
${packet.input.audience}

## Differentiation
${packet.differentiation}

## Checklist
${checklist}

## Sources
${sources}

## Competitors
${competitors}

## Master Prompt
\`\`\`
${packet.prompts.master}
\`\`\`

## Research Prompt
\`\`\`
${packet.prompts.research}
\`\`\`

## Builder Prompt
\`\`\`
${packet.prompts.builder}
\`\`\`

## Reviewer Prompt
\`\`\`
${packet.prompts.reviewer}
\`\`\`
`;
}

function generatePromptPacket(options = {}) {
  const input = {
    idea: normalizeText(options.idea, "Create a prompt-generation app for Revvel work requests"),
    audience: normalizeText(options.audience, "founders, small-business operators, agencies, and AI builders"),
    constraints: normalizeText(options.constraints, "Use public sources, no secrets, no unsupported claims, and ship a working UI."),
    monetizationGoal: normalizeText(options.monetizationGoal, "$29 prompt packet download, $99 monthly workspace, or $499 setup service"),
    researchDepth: normalizeText(options.researchDepth, "market, SEO, competitor, GitHub, chatter, facts, technical, revenue, and review"),
    channel: normalizeText(options.channel, "founder").toLowerCase(),
    outputType: selectOutputType(normalizeText(options.outputType, "app").toLowerCase())
  };
  const channelInfo = selectChannel(input.channel);
  const scores = scoreOpportunity(input);

  const packet = {
    input,
    problemSolved: "Most prompt tools sell or rewrite prompts. This product turns messy, unverified ideas into source-backed prompt packets that explain the problem, audience, market facts, competitor gaps, legal research boundaries, and review gates before code is built.",
    differentiation: `${channelInfo.hook} The wedge is not another generic prompt library; it is a due-diligence prompt generator for shipping Revvel products with evidence and acceptance gates.`,
    channels: channelInfo.channels,
    scores,
    checklist: buildChecklist(),
    sources: RESEARCH_SOURCES,
    competitors: COMPETITORS,
    internalAssets: INTERNAL_PROMPT_ASSETS,
    prompts: {
      master: buildMasterPrompt(input, channelInfo, scores),
      research: buildResearchPrompt(input),
      builder: buildBuilderPrompt(input),
      reviewer: buildReviewerPrompt(input)
    }
  };

  return {
    ...packet,
    markdown: exportPromptPacketMarkdown(packet)
  };
}

module.exports = {
  CHANNEL_PLAYBOOK,
  COMPETITORS,
  INTERNAL_PROMPT_ASSETS,
  RESEARCH_SOURCES,
  buildChecklist,
  exportPromptPacketMarkdown,
  generatePromptPacket,
  scoreOpportunity
};
