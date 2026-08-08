export type SegmentCategory =
  | "noise"
  | "research_finding"
  | "commerce_action"
  | "product_ship"
  | "finisher_wr"
  | "blocker"
  | "infra"
  | "script_probe"
  | "memory_learning"
  | "general_action";

export type DeploymentTarget =
  | "revvel-finishers"
  | "sellable-dist"
  | "gumroad"
  | "vercel-app"
  | "hub-landing"
  | "affiliate"
  | "public-api"
  | "standards-repo"
  | "deferred"
  | "unmapped";

export interface PipelineLane {
  order: number;
  id: string;
  title: string;
  target: DeploymentTarget;
  purpose: string;
  firstDollar: string;
  labels: string[];
}

export interface Segment {
  id: string;
  category: SegmentCategory;
  deploymentTarget: DeploymentTarget;
  priority: number;
  excerpt: string;
  text: string;
  confidence: number;
}

export interface DeploymentPlanLane extends PipelineLane {
  segmentIds: string[];
  segmentCount: number;
  blockerCount: number;
  status: "ready" | "pending-evidence" | "deferred";
}

export interface WorkRequest {
  order: number;
  id: string;
  title: string;
  labels: string[];
  target: DeploymentTarget;
  body: string;
}

export interface OrganizeResult {
  sourceName: string;
  generatedAt: string;
  stats: {
    rawLines: number;
    keptLines: number;
    droppedLines: number;
    segmentCount: number;
    blockerCount: number;
    categoryCounts: Record<string, number>;
    targetCounts: Record<string, number>;
    filterRatio: number;
  };
  filteredText: string;
  segments: Segment[];
  blockers: Array<{ id: string; excerpt: string; target: DeploymentTarget }>;
  deploymentPlan: DeploymentPlanLane[];
  workRequests: WorkRequest[];
  pipeline: PipelineLane[];
}

export const FINISHER_PIPELINE: PipelineLane[] = [
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
];

const NOISE_LINE_PATTERNS: RegExp[] = [
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

export function isNoiseLine(line: string): boolean {
  const trimmed = String(line || "").replace(/\r/g, "").trimEnd();
  if (trimmed.length === 0) return true;
  if (trimmed.length < 3 && !/[A-Za-z0-9]/.test(trimmed)) return true;
  return NOISE_LINE_PATTERNS.some((re) => re.test(trimmed));
}

export function filterChatLines(text: string): {
  kept: string[];
  dropped: number;
  rawLines: number;
} {
  const cleaned = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n");
  const kept: string[] = [];
  let dropped = 0;
  for (const line of lines) {
    if (isNoiseLine(line)) {
      dropped += 1;
      continue;
    }
    kept.push(line.replace(/\s+$/g, ""));
  }
  return { kept, dropped, rawLines: lines.length };
}

export function classifyText(text: string): SegmentCategory {
  const t = text.toLowerCase();
  if (/\b(403|blocked|permission gap|needs-human|wr-blocker|cannot|missing secret|expired cage)\b/.test(t)) {
    return "blocker";
  }
  if (/\b(gumroad|sku|\$29|\$99|\$399|storefront|paid sale|vault|packs|anti-cannibal)\b/.test(t)) {
    return "commerce_action";
  }
  if (/\b(vercel|daily-digest|deploy|live url|next\.js app|push the app)\b/.test(t)) {
    return "product_ship";
  }
  if (/\b(finisher-\d|ordered_wrs|revvel-finishers|wr\/pr order|system_prompt)\b/.test(t)) {
    return "finisher_wr";
  }
  if (/\b(github app|installations|connector|grok_auth_json|xai_api|secret|pat|token)\b/.test(t)) {
    return "infra";
  }
  if (/\b(audit-404|scripts\/|curl|grep|workflow path|shellcheck)\b/.test(t)) {
    return "script_probe";
  }
  if (/\b(learnings\.md|research_log|memory\/|append-only|vaccine)\b/.test(t)) {
    return "memory_learning";
  }
  if (/\b(research|finding|bottom line|scorecard|stars|citation|monetization|seo)\b/.test(t)) {
    return "research_finding";
  }
  if (/\b(create|wire|ship|fix|run|build|open issue|pr)\b/.test(t)) {
    return "general_action";
  }
  return "research_finding";
}

export function mapTarget(category: SegmentCategory, text: string): DeploymentTarget {
  const t = text.toLowerCase();
  if (/\bpublic \/api|public api\b/.test(t)) return "public-api";
  if (/\baffiliate\b/.test(t)) return "affiliate";
  if (/\bhub|landing|cta\b/.test(t)) return "hub-landing";
  if (/\bgumroad|sku|\$29|\$99|\$399\b/.test(t) || category === "commerce_action") return "gumroad";
  if (/\bdist\/|build_packs|build_skills_vault|sellable\b/.test(t)) return "sellable-dist";
  if (/\bvercel|daily-digest\b/.test(t) || category === "product_ship") return "vercel-app";
  if (/\brevvel-finishers|system_prompt|finisher-0\b/.test(t)) return "revvel-finishers";
  if (/\b404|dead workflow|todo|shipped-vs-live|fixer\b/.test(t)) return "standards-repo";
  if (category === "infra") return "revvel-finishers";
  if (category === "script_probe") return "standards-repo";
  return "unmapped";
}

function priorityFor(target: DeploymentTarget, category: SegmentCategory): number {
  const targetRank: Record<DeploymentTarget, number> = {
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
  if (category === "blocker") base -= 0.25;
  return base;
}

function segmentLines(lines: string[]): string[] {
  const segments: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text.length >= 24) segments.push(text);
    buf = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
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
    if (buf.join("\n").length > 1200) flush();
  }
  flush();
  return segments;
}

function scoreConfidence(category: SegmentCategory, text: string): number {
  let score = 0.55;
  if (category === "commerce_action" && /\$\d+/.test(text)) score += 0.2;
  if (category === "finisher_wr" && /finisher-\d/i.test(text)) score += 0.25;
  if (category === "blocker" && /\b403\b|\bblocked\b/i.test(text)) score += 0.2;
  if (category === "product_ship" && /vercel/i.test(text)) score += 0.15;
  if (text.length > 400) score += 0.05;
  return Number(Math.min(0.99, score).toFixed(2));
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function buildWrBody(lane: DeploymentPlanLane, matched: Segment[]): string {
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
    `### Chat-derived evidence (${matched.length} segment(s))`,
    ``,
    evidence || `- No direct chat segments mapped; execute lane from ORDERED_WRS baseline.`,
    ``,
    `### Acceptance Criteria`,
    ``,
    `- Lane \`${lane.id}\` postcondition holds on main`,
    `- Docs updated; tests cover the new behavior`,
    `- No scaffold/stub deliverables`,
    ``,
  ].join("\n");
}

export function organizeChat(rawText: string, options: { sourceName?: string } = {}): OrganizeResult {
  const sourceName = options.sourceName || "chat-dump";
  const { kept, dropped, rawLines } = filterChatLines(rawText);
  const filteredText = kept.join("\n").trim();
  const rawSegments = segmentLines(kept);

  const segments: Segment[] = rawSegments.map((text, index) => {
    const category = classifyText(text);
    const deploymentTarget = mapTarget(category, text);
    return {
      id: `seg-${index + 1}`,
      category,
      deploymentTarget,
      priority: priorityFor(deploymentTarget, category),
      excerpt: text.replace(/\s+/g, " ").slice(0, 220),
      text,
      confidence: scoreConfidence(category, text),
    };
  });

  segments.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const blockers = segments.filter((s) => s.category === "blocker");

  const deploymentPlan: DeploymentPlanLane[] = FINISHER_PIPELINE.map((lane) => {
    const matched = segments.filter(
      (s) =>
        s.deploymentTarget === lane.target ||
        s.text.toLowerCase().includes(lane.id) ||
        s.text.toLowerCase().includes(lane.title.toLowerCase().slice(0, 18)),
    );
    const deferred = lane.target === "public-api" || /defer/i.test(lane.purpose);
    return {
      ...lane,
      segmentIds: matched.map((m) => m.id),
      segmentCount: matched.length,
      blockerCount: matched.filter((m) => m.category === "blocker").length,
      status: deferred ? "deferred" : matched.length > 0 ? "ready" : "pending-evidence",
    };
  });

  const workRequests: WorkRequest[] = deploymentPlan.map((lane) => ({
    order: lane.order,
    id: lane.id,
    title: `[WR] ${lane.title}`,
    labels: lane.labels,
    target: lane.target,
    body: buildWrBody(
      lane,
      segments.filter((s) => lane.segmentIds.includes(s.id)),
    ),
  }));

  return {
    sourceName,
    generatedAt: new Date().toISOString(),
    stats: {
      rawLines,
      keptLines: kept.length,
      droppedLines: dropped,
      segmentCount: segments.length,
      blockerCount: blockers.length,
      categoryCounts: countBy(segments, (s) => s.category),
      targetCounts: countBy(segments, (s) => s.deploymentTarget),
      filterRatio: rawLines === 0 ? 0 : Number((dropped / rawLines).toFixed(4)),
    },
    filteredText,
    segments,
    blockers: blockers.map((b) => ({ id: b.id, excerpt: b.excerpt, target: b.deploymentTarget })),
    deploymentPlan,
    workRequests,
    pipeline: FINISHER_PIPELINE,
  };
}

export function toMarkdown(result: OrganizeResult): string {
  const lines: string[] = [
    `# Chat → Deployment Plan`,
    ``,
    `Source: \`${result.sourceName}\``,
    `Generated: ${result.generatedAt}`,
    ``,
    `## Filter stats`,
    ``,
    `| Raw lines | Kept | Dropped | Segments | Blockers | Filter ratio |`,
    `| --- | --- | --- | --- | --- | --- |`,
    `| ${result.stats.rawLines} | ${result.stats.keptLines} | ${result.stats.droppedLines} | ${result.stats.segmentCount} | ${result.stats.blockerCount} | ${result.stats.filterRatio} |`,
    ``,
    `## Ordered deployment plan (do not scramble)`,
    ``,
  ];

  for (const lane of result.deploymentPlan) {
    lines.push(`### ${lane.order}. ${lane.title} \`${lane.status}\``);
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
  lines.push(`## Marketing / SEO keywords`);
  lines.push(``);
  lines.push(
    `chat deployment organizer, finisher pipeline, commerce last-mile, gumroad skills vault, vercel product ship, work request automation, script-first finishers`,
  );
  lines.push(``);
  lines.push(`## Monetization path`);
  lines.push(``);
  lines.push(
    `SaaS organizer ($29 one-shot pack / $99 mo workspace) → unblocks Finisher-2 Gumroad SKUs ($29 packs / $99 vault / $399 R&D fleet) before affiliate sprawl.`,
  );
  lines.push(``);
  lines.push(`## Citations`);
  lines.push(``);
  lines.push(`- In-repo: \`artifacts/revvel-finishers/\`, \`scripts/chat-deployment-organizer.js\``);
  lines.push(`- Issue: midnghtsapphire/revvel-standards#16924`);
  lines.push(``);
  return lines.join("\n");
}

export function toWrPackMarkdown(result: OrganizeResult): string {
  return result.workRequests.map((wr) => `# ${wr.title}\n\n${wr.body}\n`).join("\n---\n\n");
}

/** Demo sample derived from the Finisher research chat themes (no PII). */
export const DEMO_CHAT = `Ctrl+K
Worked for 26s
Skip to content
Marketplace

I want to create repository revvel-finishers that clean up fragmented code and ship to market.
REVENUE_GATE — name buyer, channel, price. Prefer scripts before agents.

WR / PR order (do not scramble)
0 Finisher-0 Create revvel-finishers + SYSTEM_PROMPT + memory + scripts
1 Finisher-1 Run build_skills_vault.py + build_packs.py → products/dist
2 Finisher-2 Gumroad live: vault $99, packs $29, R&D $399; stop free full leak
3 Finisher-3 daily-digest push + Vercel
4 revvel-fixer 404 / dead workflow / TODO sweep
5 Finisher-4 Hub landing CTAs → Gumroad
6 Finisher-5 Affiliate deploys only after ≥1 paid sale
7 Finisher-6 Public /api/* — defer

Issue create from connector returned 403 (App permission gap).
Bottom line: commerce last-mile is the blocker; finishers should be script-first.
audit-404s.sh should probe product URLs and fail closed on HTTP 404.
Next Move: seed revvel-finishers, then produce dist sellables before Gumroad.
`;
