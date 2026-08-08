#!/usr/bin/env node
/**
 * Chat Deployment Organizer
 *
 * Filters noisy research/chat dumps, classifies remaining segments, and
 * organizes them into an ordered deployment plan (Finisher pipeline) with
 * GitHub-ready Work Request bodies.
 *
 * Usage:
 *   node scripts/chat-deployment-organizer.js --input path/to/chat.txt
 *   node scripts/chat-deployment-organizer.js --stdin < chat.txt
 *   node scripts/chat-deployment-organizer.js --input chat.txt --format markdown
 *
 * Exit codes:
 *   0 — plan produced (even if empty after filter)
 *   2 — invalid usage / unreadable input
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** @typedef {"noise"|"research_finding"|"commerce_action"|"product_ship"|"finisher_wr"|"blocker"|"infra"|"script_probe"|"memory_learning"|"general_action"} SegmentCategory */
/** @typedef {"revvel-finishers"|"sellable-dist"|"gumroad"|"vercel-app"|"hub-landing"|"affiliate"|"public-api"|"standards-repo"|"deferred"|"unmapped"} DeploymentTarget */

/**
 * Ordered Finisher deployment lanes from the commerce last-mile research chat.
 * Do not scramble — money path is Finisher-0 → 1 → 2 first.
 */
const FINISHER_PIPELINE = Object.freeze([
  {
    order: 0,
    id: "finisher-0",
    title: "Finisher-0: Bootstrap revvel-finishers",
    target: "revvel-finishers",
    purpose: "Seed finishers repo, SYSTEM_PROMPT, memory, script probes, Grok PR review",
    firstDollar: "Enables all",
    labels: ["priority:high", "commerce", "finishers", "work-request"],
  },
  {
    order: 1,
    id: "finisher-1",
    title: "Finisher-1: Produce dist sellables",
    target: "sellable-dist",
    purpose: "Run build_skills_vault.py + build_packs.py → real products/dist artifacts",
    firstDollar: "Days",
    labels: ["priority:high", "commerce", "finishers", "work-request"],
  },
  {
    order: 2,
    id: "finisher-2",
    title: "Finisher-2: Gumroad storefront",
    target: "gumroad",
    purpose: "Live SKUs vault $99, packs $29, R&D $399; stop free full leak",
    firstDollar: "Days",
    labels: ["priority:high", "commerce", "finishers", "work-request"],
  },
  {
    order: 3,
    id: "finisher-3",
    title: "Finisher-3: daily-digest ship",
    target: "vercel-app",
    purpose: "Push daily-digest app + Vercel live URL",
    firstDollar: "Portfolio / soft $",
    labels: ["priority:high", "commerce", "finishers", "work-request"],
  },
  {
    order: 4,
    id: "revvel-fixer",
    title: "revvel-fixer: Fleet sweep",
    target: "standards-repo",
    purpose: "404 / dead workflow / TODO / shipped-vs-live sweep via scripts",
    firstDollar: "Indirect",
    labels: ["priority:high", "finishers", "self-heal", "work-request"],
  },
  {
    order: 5,
    id: "finisher-4",
    title: "Finisher-4: Landing CTAs",
    target: "hub-landing",
    purpose: "Hub landing CTAs → Gumroad after storefront is live",
    firstDollar: "After Finisher-2",
    labels: ["commerce", "finishers", "work-request"],
  },
  {
    order: 6,
    id: "finisher-5",
    title: "Finisher-5: Affiliate after sale",
    target: "affiliate",
    purpose: "Affiliate deploys only after ≥1 paid sale",
    firstDollar: "After sale",
    labels: ["commerce", "finishers", "work-request"],
  },
  {
    order: 7,
    id: "finisher-6",
    title: "Finisher-6: Public API (defer)",
    target: "public-api",
    purpose: "Public /api/* surface — explicit defer until commerce loop closes",
    firstDollar: "Defer",
    labels: ["finishers", "work-request", "deferred"],
  },
]);

const NOISE_LINE_PATTERNS = [
  /^\s*$/,
  /^Ctrl\+[A-Z]$/i,
  /^Skip to content$/i,
  /^Marketplace$/i,
  /^Actions$/i,
  /^Thought for\b/i,
  /^Worked for\b/i,
  /^\d+\s+sources?$/i,
  /^Ran command$/i,
  /^Show more$/i,
  /^Copy code$/i,
  /^Loading\.\.\.$/i,
  /^hds-[\w-]+\.grok/i,
  /^https?:\/\/.*grok-sandbox/i,
];

const NOISE_BLOCK_PATTERNS = [
  /Grok Build PR Review[\s\S]{0,200}Quick start/i,
  /Prefer plain shell in your scripts:[\s\S]{0,400}norwd\/grawk/i,
];

/**
 * @param {string} line
 * @returns {boolean}
 */
function isNoiseLine(line) {
  const trimmed = String(line || "").replace(/\r/g, "").trimEnd();
  if (trimmed.length === 0) return true;
  // Long pure-UI chrome lines with only whitespace/control leftovers
  if (trimmed.length < 3 && !/[A-Za-z0-9]/.test(trimmed)) return true;
  return NOISE_LINE_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripNoiseBlocks(text) {
  let out = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const re of NOISE_BLOCK_PATTERNS) {
    out = out.replace(re, "\n");
  }
  return out;
}

/**
 * @param {string} text
 * @returns {{ kept: string[], dropped: number, rawLines: number }}
 */
function filterChatLines(text) {
  const cleaned = stripNoiseBlocks(text);
  const lines = cleaned.split("\n");
  const kept = [];
  let dropped = 0;
  for (const line of lines) {
    if (isNoiseLine(line)) {
      dropped += 1;
      continue;
    }
    kept.push(line.replace(/\s+$/g, ""));
  }
  // Collapse 3+ blank survivors (should be rare after filter)
  const collapsed = [];
  let blankRun = 0;
  for (const line of kept) {
    if (line.trim() === "") {
      blankRun += 1;
      if (blankRun <= 1) collapsed.push(line);
      else dropped += 1;
      continue;
    }
    blankRun = 0;
    collapsed.push(line);
  }
  return { kept: collapsed, dropped, rawLines: lines.length };
}

/**
 * @param {string} text
 * @returns {SegmentCategory}
 */
function classifyText(text) {
  const t = text.toLowerCase();

  if (
    /\b(403|blocked|permission gap|needs-human|wr-blocker|cannot|missing secret|expired cage)\b/.test(
      t
    )
  ) {
    return "blocker";
  }
  if (
    /\b(gumroad|sku|\$29|\$99|\$399|storefront|paid sale|vault|packs|anti-cannibal)\b/.test(t)
  ) {
    return "commerce_action";
  }
  if (
    /\b(vercel|daily-digest|deploy|live url|next\.js app|push the app)\b/.test(t)
  ) {
    return "product_ship";
  }
  if (
    /\b(finisher-\d|ordered_wrs|revvel-finishers|wr\/pr order|system_prompt)\b/.test(t)
  ) {
    return "finisher_wr";
  }
  if (
    /\b(github app|installations|connector|grok_auth_json|xai_api|secret|pat|token)\b/.test(t)
  ) {
    return "infra";
  }
  if (/\b(audit-404|scripts\/|curl|grep|workflow path|shellcheck)\b/.test(t)) {
    return "script_probe";
  }
  if (/\b(learnings\.md|research_log|memory\/|append-only|vaccine)\b/.test(t)) {
    return "memory_learning";
  }
  if (
    /\b(research|finding|bottom line|scorecard|stars|citation|monetization|seo)\b/.test(t)
  ) {
    return "research_finding";
  }
  if (/\b(create|wire|ship|fix|run|build|open issue|pr)\b/.test(t)) {
    return "general_action";
  }
  return "research_finding";
}

/**
 * @param {SegmentCategory} category
 * @param {string} text
 * @returns {DeploymentTarget}
 */
function mapTarget(category, text) {
  const t = text.toLowerCase();
  if (/\bpublic \/api|public api\b/.test(t) || category === "finisher_wr" && /finisher-6/.test(t)) {
    return "public-api";
  }
  if (/\baffiliate\b/.test(t)) return "affiliate";
  if (/\bhub|landing|cta\b/.test(t)) return "hub-landing";
  if (/\bgumroad|sku|\$29|\$99|\$399\b/.test(t) || category === "commerce_action") {
    return "gumroad";
  }
  if (/\bdist\/|build_packs|build_skills_vault|sellable\b/.test(t)) return "sellable-dist";
  if (/\bvercel|daily-digest\b/.test(t) || category === "product_ship") return "vercel-app";
  if (/\brevvel-finishers|system_prompt|finisher-0\b/.test(t)) return "revvel-finishers";
  if (/\b404|dead workflow|todo|shipped-vs-live|fixer\b/.test(t)) return "standards-repo";
  if (category === "blocker" && /\bdefer\b/.test(t)) return "deferred";
  if (category === "infra") return "revvel-finishers";
  if (category === "script_probe") return "standards-repo";
  return "unmapped";
}

/**
 * Priority score — lower is sooner in the money path.
 * @param {DeploymentTarget} target
 * @param {SegmentCategory} category
 */
function priorityFor(target, category) {
  const targetRank = {
    "revvel-finishers": 0,
    "sellable-dist": 1,
    gumroad: 2,
    "vercel-app": 3,
    "standards-repo": 4,
    "hub-landing": 5,
    affiliate: 6,
    "public-api": 7,
    deferred: 8,
    unmapped: 9,
  };
  let base = targetRank[target] ?? 9;
  if (category === "blocker") base -= 0.25; // surface blockers early within lane
  if (category === "noise") base = 99;
  return base;
}

/**
 * Split filtered text into coherent segments (paragraph-ish).
 * @param {string[]} lines
 * @returns {string[]}
 */
function segmentLines(lines) {
  const segments = [];
  let buf = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text.length >= 24) segments.push(text);
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    // Heuristic: short UI remnants already filtered; blank or heading-like breaks
    if (trimmed === "") {
      flush();
      continue;
    }
    if (/^#{1,3}\s/.test(trimmed) || /^(primary goal|bottom line|next move|status:)/i.test(trimmed)) {
      flush();
      buf.push(line);
      continue;
    }
    buf.push(line);
    // Cap segment size so one huge dump doesn't become a single blob
    if (buf.join("\n").length > 1200) flush();
  }
  flush();
  return segments;
}

/**
 * @param {string} rawText
 * @param {{ sourceName?: string }} [options]
 */
function organizeChat(rawText, options = {}) {
  const sourceName = options.sourceName || "chat-dump";
  const { kept, dropped, rawLines } = filterChatLines(rawText);
  const filteredText = kept.join("\n").trim();
  const rawSegments = segmentLines(kept);

  const segments = rawSegments.map((text, index) => {
    const category = classifyText(text);
    const deploymentTarget = mapTarget(category, text);
    const priority = priorityFor(deploymentTarget, category);
    const excerpt = text.replace(/\s+/g, " ").slice(0, 220);
    return {
      id: `seg-${index + 1}`,
      category,
      deploymentTarget,
      priority,
      excerpt,
      text,
      confidence: scoreConfidence(category, text),
    };
  });

  segments.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const byTarget = groupBy(segments, (s) => s.deploymentTarget);
  const blockers = segments.filter((s) => s.category === "blocker");

  const deploymentPlan = FINISHER_PIPELINE.map((lane) => {
    const matched = segments.filter(
      (s) =>
        s.deploymentTarget === lane.target ||
        s.text.toLowerCase().includes(lane.id) ||
        s.text.toLowerCase().includes(lane.title.toLowerCase().slice(0, 18))
    );
    return {
      ...lane,
      segmentIds: matched.map((m) => m.id),
      segmentCount: matched.length,
      blockerCount: matched.filter((m) => m.category === "blocker").length,
      status: lane.target === "public-api" || /defer/i.test(lane.purpose)
        ? "deferred"
        : matched.length > 0
          ? "ready"
          : "pending-evidence",
    };
  });

  const workRequests = deploymentPlan.map((lane) => {
    const body = buildWrBody(lane, segments.filter((s) => lane.segmentIds.includes(s.id)));
    return {
      order: lane.order,
      id: lane.id,
      title: `[WR] ${lane.title}`,
      labels: lane.labels,
      target: lane.target,
      body,
    };
  });

  const categoryCounts = countBy(segments, (s) => s.category);
  const targetCounts = countBy(segments, (s) => s.deploymentTarget);

  return {
    sourceName,
    generatedAt: new Date().toISOString(),
    stats: {
      rawLines,
      keptLines: kept.length,
      droppedLines: dropped,
      segmentCount: segments.length,
      blockerCount: blockers.length,
      categoryCounts,
      targetCounts,
      filterRatio: rawLines === 0 ? 0 : Number((dropped / rawLines).toFixed(4)),
    },
    filteredText,
    segments,
    blockers: blockers.map((b) => ({ id: b.id, excerpt: b.excerpt, target: b.deploymentTarget })),
    deploymentPlan,
    workRequests,
    byTarget,
    pipeline: FINISHER_PIPELINE,
  };
}

/**
 * @param {SegmentCategory} category
 * @param {string} text
 */
function scoreConfidence(category, text) {
  let score = 0.55;
  if (category === "commerce_action" && /\$\d+/.test(text)) score += 0.2;
  if (category === "finisher_wr" && /finisher-\d/i.test(text)) score += 0.25;
  if (category === "blocker" && /\b403\b|\bblocked\b/i.test(text)) score += 0.2;
  if (category === "product_ship" && /vercel/i.test(text)) score += 0.15;
  if (text.length > 400) score += 0.05;
  return Number(Math.min(0.99, score).toFixed(2));
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 */
function groupBy(items, keyFn) {
  /** @type {Record<string, T[]>} */
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 */
function countBy(items, keyFn) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

/**
 * @param {typeof FINISHER_PIPELINE[number] & { segmentCount: number, status: string }} lane
 * @param {ReturnType<typeof organizeChat>["segments"]} matched
 */
function buildWrBody(lane, matched) {
  const evidence = matched
    .slice(0, 8)
    .map((s) => `- (${s.category} → ${s.deploymentTarget}, conf ${s.confidence}) ${s.excerpt}`)
    .join("\n");

  return [
    `### Output Type (required)`,
    ``,
    `production-app`,
    ``,
    `### Summary`,
    ``,
    lane.title,
    ``,
    `### Objective`,
    ``,
    lane.purpose,
    ``,
    `### REVENUE_GATE`,
    ``,
    `- First-$ signal: ${lane.firstDollar}`,
    `- Deployment target: \`${lane.target}\``,
    `- Pipeline order: ${lane.order} (do not scramble money path 0→1→2)`,
    ``,
    `### Research Gate`,
    ``,
    `- Web / MM search first; append memory/RESEARCH_LOG.md`,
    `- Prefer scripts over agents; cap $ and turns per worker`,
    `- Read learnings before edits; append vaccines after`,
    ``,
    `### Chat-derived evidence (${matched.length} segment(s))`,
    ``,
    evidence || `- No direct chat segments mapped; execute lane from ORDERED_WRS baseline.`,
    ``,
    `### Acceptance Criteria`,
    ``,
    `- Lane \`${lane.id}\` postcondition holds on main (scripts green, artifact or live URL present as applicable)`,
    `- Docs updated; tests cover the new behavior`,
    `- No scaffold/stub deliverables`,
    ``,
    `### Dependencies`,
    ``,
    lane.order === 0
      ? `- GitHub access to create/seed revvel-finishers`
      : `- Prior finisher lanes through order ${Math.max(0, lane.order - 1)} where sequential`,
    ``,
    `### Labels`,
    ``,
    lane.labels.map((l) => `\`${l}\``).join(", "),
    ``,
  ].join("\n");
}

/**
 * @param {ReturnType<typeof organizeChat>} result
 */
function toMarkdown(result) {
  const lines = [];
  lines.push(`# Chat → Deployment Plan`);
  lines.push(``);
  lines.push(`Source: \`${result.sourceName}\``);
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(``);
  lines.push(`## Filter stats`);
  lines.push(``);
  lines.push(
    `| Raw lines | Kept | Dropped | Segments | Blockers | Filter ratio |`
  );
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  lines.push(
    `| ${result.stats.rawLines} | ${result.stats.keptLines} | ${result.stats.droppedLines} | ${result.stats.segmentCount} | ${result.stats.blockerCount} | ${result.stats.filterRatio} |`
  );
  lines.push(``);
  lines.push(`## Ordered deployment plan (do not scramble)`);
  lines.push(``);
  for (const lane of result.deploymentPlan) {
    lines.push(
      `### ${lane.order}. ${lane.title} \`${lane.status}\``
    );
    lines.push(``);
    lines.push(`- Target: \`${lane.target}\``);
    lines.push(`- Purpose: ${lane.purpose}`);
    lines.push(`- First $: ${lane.firstDollar}`);
    lines.push(`- Matched segments: ${lane.segmentCount} (blockers: ${lane.blockerCount})`);
    lines.push(``);
  }

  if (result.blockers.length) {
    lines.push(`## Blockers surfaced early`);
    lines.push(``);
    for (const b of result.blockers) {
      lines.push(`- **${b.id}** (${b.target}): ${b.excerpt}`);
    }
    lines.push(``);
  }

  lines.push(`## Work requests (paste-ready titles)`);
  lines.push(``);
  for (const wr of result.workRequests) {
    lines.push(`${wr.order}. ${wr.title}`);
  }
  lines.push(``);
  lines.push(`## Category counts`);
  lines.push(``);
  for (const [k, v] of Object.entries(result.stats.categoryCounts).sort()) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push(``);
  lines.push(`## Marketing / SEO keywords`);
  lines.push(``);
  lines.push(
    `chat deployment organizer, finisher pipeline, commerce last-mile, gumroad skills vault, vercel product ship, work request automation, script-first finishers`
  );
  lines.push(``);
  lines.push(`## Monetization path`);
  lines.push(``);
  lines.push(
    `SaaS organizer ($29 one-shot pack / $99 mo workspace) → unblocks Finisher-2 Gumroad SKUs ($29 packs / $99 vault / $399 R&D fleet) before affiliate sprawl.`
  );
  lines.push(``);
  lines.push(`## Citations`);
  lines.push(``);
  lines.push(
    `- In-repo artifacts: \`artifacts/revvel-finishers/\`, \`artifacts/wrs/\` (Finisher ORDERED_WRS)`
  );
  lines.push(
    `- Issue context: midnghtsapphire/revvel-standards#16924 (filter + organize chat into correct deployment)`
  );
  lines.push(``);
  return lines.join("\n");
}

/**
 * @param {ReturnType<typeof organizeChat>} result
 */
function toWrPackMarkdown(result) {
  return result.workRequests
    .map((wr) => `# ${wr.title}\n\n${wr.body}\n`)
    .join("\n---\n\n");
}

function printUsage(exitCode = 2) {
  const msg = `Usage:
  node scripts/chat-deployment-organizer.js --input <file> [--format json|markdown|wr-pack]
  node scripts/chat-deployment-organizer.js --stdin [--format json|markdown|wr-pack]
`;
  process.stderr.write(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  /** @type {{ input: string|null, stdin: boolean, format: "json"|"markdown"|"wr-pack" }} */
  const opts = { input: null, stdin: false, format: "json" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input" || a === "-i") {
      opts.input = argv[++i];
    } else if (a === "--stdin") {
      opts.stdin = true;
    } else if (a === "--format" || a === "-f") {
      const v = String(argv[++i] || "").toLowerCase();
      if (v !== "json" && v !== "markdown" && v !== "wr-pack") printUsage(2);
      opts.format = /** @type {"json"|"markdown"|"wr-pack"} */ (v);
    } else if (a === "--help" || a === "-h") {
      printUsage(0);
    } else {
      printUsage(2);
    }
  }
  if (!opts.input && !opts.stdin) printUsage(2);
  return opts;
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  let raw;
  let sourceName = "stdin";
  if (opts.stdin) {
    raw = readStdin();
  } else {
    const abs = path.resolve(String(opts.input));
    if (!fs.existsSync(abs)) {
      process.stderr.write(`Input not found: ${abs}\n`);
      process.exit(2);
    }
    raw = fs.readFileSync(abs, "utf8");
    sourceName = path.basename(abs);
  }

  const result = organizeChat(raw, { sourceName });
  if (opts.format === "markdown") {
    process.stdout.write(toMarkdown(result));
  } else if (opts.format === "wr-pack") {
    process.stdout.write(toWrPackMarkdown(result));
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

module.exports = {
  FINISHER_PIPELINE,
  organizeChat,
  filterChatLines,
  isNoiseLine,
  classifyText,
  mapTarget,
  toMarkdown,
  toWrPackMarkdown,
  main,
};

if (require.main === module) {
  main();
}
