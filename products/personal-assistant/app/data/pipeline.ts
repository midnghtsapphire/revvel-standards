/**
 * Multi-agent personal-data → GitHub structure pipeline.
 *
 * Agents (pure functions, no network required):
 *  1. IngestAgent     — normalize multi-source fragments
 *  2. PrivacyAgent    — redact emails / phones / handles (PII-safe)
 *  3. TriageAgent     — classify into content categories
 *  4. StructureAgent  — map classifications to repo paths + filenames
 *  5. CommitPlanAgent — produce a GitHub commit / PR plan + exports
 *
 * Design notes:
 *  - Runs fully offline so demos and CI never need OPENROUTER_API_KEY.
 *  - Optional LLM enrichment can wrap these pure steps later without
 *    changing the public runPipeline() contract.
 *  - Matches standards/AUTOMATED_PRODUCT_PIPELINE.md privacy rule:
 *    strip handles and redact emails/phones before persistence.
 */

import {
  CATEGORY_DIRECTORY,
  CATEGORY_LABELS,
  ContentCategory,
  SourceKind,
  getSourceDefinition,
} from "./sources";

export interface RawFragment {
  id?: string;
  source: SourceKind | string;
  title?: string;
  body: string;
  receivedAt?: string;
}

export interface NormalizedFragment {
  id: string;
  source: SourceKind;
  title: string;
  body: string;
  receivedAt: string;
  charCount: number;
}

export interface RedactedFragment extends NormalizedFragment {
  redactedBody: string;
  redactions: {
    emails: number;
    phones: number;
    handles: number;
  };
}

export interface ClassifiedFragment extends RedactedFragment {
  category: ContentCategory;
  confidence: number;
  tags: string[];
  reasons: string[];
}

export interface StructuredFile {
  path: string;
  title: string;
  category: ContentCategory;
  source: SourceKind;
  markdown: string;
  fragmentIds: string[];
}

export interface CommitPlanStep {
  order: number;
  action: "create_dir" | "write_file" | "open_pr";
  target: string;
  detail: string;
}

export interface PipelineOptions {
  repoName?: string;
  owner?: string;
  defaultBranch?: string;
  maxTitleLength?: number;
}

export interface PipelineResult {
  summary: {
    fragmentCount: number;
    fileCount: number;
    categoryCounts: Record<string, number>;
    redactionTotals: { emails: number; phones: number; handles: number };
    repoName: string;
    owner: string;
    defaultBranch: string;
  };
  fragments: ClassifiedFragment[];
  files: StructuredFile[];
  directoryTree: string[];
  commitPlan: CommitPlanStep[];
  markdownExport: string;
  csvExport: string;
  agentLog: string[];
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\w)/g;
const HANDLE_RE = /(?<![A-Za-z0-9_/])@[A-Za-z0-9_]{2,30}\b/g;

const CATEGORY_RULES: Array<{
  category: ContentCategory;
  weight: number;
  patterns: RegExp[];
}> = [
  {
    category: "action-item",
    weight: 3,
    patterns: [
      /\b(todo|action item|follow[- ]?up|please (reply|send|review)|deadline|due by|asap|need you to)\b/i,
      /\b(can you|could you|remind me|don't forget|schedule)\b/i,
    ],
  },
  {
    category: "meeting",
    weight: 3,
    patterns: [
      /\b(meeting|standup|sync|call at|zoom|teams meeting|calendar invite|agenda)\b/i,
      /\b(tomorrow at|next week|conference room|dial[- ]?in)\b/i,
    ],
  },
  {
    category: "code-change",
    weight: 3,
    patterns: [
      /\b(pull request|PR #?\d+|commit|refactor|bugfix|implement|typescript|github|repo|branch)\b/i,
      /\b(api route|unit test|deploy|ci\/cd|workflow)\b/i,
    ],
  },
  {
    category: "research",
    weight: 2.5,
    patterns: [
      /\b(research|deep dive|benchmark|market size|competitor|citation|paper|study)\b/i,
      /\b(findings|hypothesis|literature|survey)\b/i,
    ],
  },
  {
    category: "finance",
    weight: 3,
    patterns: [
      /\b(invoice|receipt|payment|subscription|refund|wire transfer|amount due|\$\d+)\b/i,
      /\b(billing|stripe|polar\.sh|paypal|account balance)\b/i,
    ],
  },
  {
    category: "documentation",
    weight: 2,
    patterns: [
      /\b(readme|documentation|spec|runbook|how to|procedure|standard|playbook)\b/i,
      /\b(write up|notes on|summary of)\b/i,
    ],
  },
  {
    category: "personal",
    weight: 1.5,
    patterns: [
      /\b(birthday|family|vacation|doctor|grocery|personal|home)\b/i,
    ],
  },
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function slugify(input: string, maxLength = 48): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return base || "untitled-note";
}

function firstLineTitle(body: string, fallback: string, maxLength: number): string {
  const line =
    body
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? fallback;
  return line.slice(0, maxLength);
}

/** Agent 1 — normalize raw multi-source fragments into a stable shape. */
export function ingestFragments(
  raw: RawFragment[],
  options: PipelineOptions = {},
): NormalizedFragment[] {
  const maxTitle = options.maxTitleLength ?? 80;
  return (raw ?? [])
    .filter((item) => item && typeof item.body === "string" && item.body.trim())
    .map((item, index) => {
      const sourceDef = getSourceDefinition(String(item.source || "other"));
      const body = item.body.replace(/\r\n/g, "\n").trim();
      const title =
        (item.title && item.title.trim()) ||
        firstLineTitle(body, `${sourceDef.label} note ${index + 1}`, maxTitle);
      return {
        id: item.id?.trim() || `frag-${index + 1}`,
        source: sourceDef.id,
        title: title.slice(0, maxTitle),
        body,
        receivedAt: item.receivedAt || new Date(0).toISOString(),
        charCount: body.length,
      };
    });
}

/** Agent 2 — strip PII before any classification or export. */
export function redactFragment(fragment: NormalizedFragment): RedactedFragment {
  let emails = 0;
  let phones = 0;
  let handles = 0;

  const redactedBody = fragment.body
    .replace(EMAIL_RE, () => {
      emails += 1;
      return "[REDACTED_EMAIL]";
    })
    .replace(PHONE_RE, () => {
      phones += 1;
      return "[REDACTED_PHONE]";
    })
    .replace(HANDLE_RE, () => {
      handles += 1;
      return "[REDACTED_HANDLE]";
    });

  return {
    ...fragment,
    redactedBody,
    redactions: { emails, phones, handles },
  };
}

/** Agent 3 — rule-based triage with source priors. */
export function classifyFragment(fragment: RedactedFragment): ClassifiedFragment {
  const sourceDef = getSourceDefinition(fragment.source);
  const haystack = `${fragment.title}\n${fragment.redactedBody}`.toLowerCase();
  const scores = new Map<ContentCategory, number>();
  const reasons: string[] = [];
  const tags = new Set<string>([fragment.source]);

  scores.set(sourceDef.categoryHint, 1);
  reasons.push(`source prior: ${sourceDef.id} → ${sourceDef.categoryHint}`);

  for (const word of sourceDef.signalWords) {
    if (word && haystack.includes(word.toLowerCase())) {
      scores.set(sourceDef.categoryHint, (scores.get(sourceDef.categoryHint) ?? 0) + 0.5);
      tags.add(word);
    }
  }

  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(haystack)) {
        scores.set(rule.category, (scores.get(rule.category) ?? 0) + rule.weight);
        reasons.push(`matched ${rule.category} pattern ${pattern.source.slice(0, 40)}`);
        tags.add(rule.category);
      }
    }
  }

  let best: ContentCategory = "unclassified";
  let bestScore = 0;
  for (const [category, score] of scores.entries()) {
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  if (bestScore < 1.25) {
    best = sourceDef.categoryHint === "unclassified" ? "unclassified" : sourceDef.categoryHint;
    reasons.push("low signal — fell back to source category hint");
  }

  const confidence = clamp(bestScore / 8, 0.15, 0.99);

  return {
    ...fragment,
    category: best,
    confidence: Number(confidence.toFixed(3)),
    tags: [...tags].slice(0, 12),
    reasons: reasons.slice(0, 8),
  };
}

function buildFileMarkdown(fileFragments: ClassifiedFragment[], category: ContentCategory): string {
  const header = [
    `# ${CATEGORY_LABELS[category]}`,
    "",
    `> Auto-structured by Revvel Personal Assistant · ${fileFragments.length} source fragment(s)`,
    "",
  ];

  const sections = fileFragments.map((frag, index) => {
    return [
      `## ${index + 1}. ${frag.title}`,
      "",
      `- **Source:** ${frag.source}`,
      `- **Category:** ${frag.category}`,
      `- **Confidence:** ${(frag.confidence * 100).toFixed(0)}%`,
      `- **Received:** ${frag.receivedAt}`,
      `- **Tags:** ${frag.tags.join(", ") || "—"}`,
      "",
      "### Content (PII-redacted)",
      "",
      frag.redactedBody,
      "",
      "### Triage reasons",
      "",
      ...frag.reasons.map((reason) => `- ${reason}`),
      "",
    ].join("\n");
  });

  return [...header, ...sections].join("\n").trim() + "\n";
}

/** Agent 4 — group classified fragments into repo file paths. */
export function structureFiles(fragments: ClassifiedFragment[]): StructuredFile[] {
  const groups = new Map<ContentCategory, ClassifiedFragment[]>();
  for (const fragment of fragments) {
    const list = groups.get(fragment.category) ?? [];
    list.push(fragment);
    groups.set(fragment.category, list);
  }

  const files: StructuredFile[] = [];
  for (const [category, group] of groups.entries()) {
    const dir = CATEGORY_DIRECTORY[category];
    // One file per fragment keeps diffs reviewable; also emit a category index.
    for (const fragment of group) {
      const filename = `${slugify(fragment.title)}-${fragment.id}.md`;
      files.push({
        path: `${dir}/${filename}`,
        title: fragment.title,
        category,
        source: fragment.source,
        markdown: buildFileMarkdown([fragment], category),
        fragmentIds: [fragment.id],
      });
    }

    files.push({
      path: `${dir}/_index.md`,
      title: `${CATEGORY_LABELS[category]} index`,
      category,
      source: group[0]?.source ?? "other",
      markdown: buildFileMarkdown(group, category),
      fragmentIds: group.map((item) => item.id),
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/** Agent 5 — turn structured files into a GitHub commit/PR plan. */
export function buildCommitPlan(
  files: StructuredFile[],
  options: PipelineOptions = {},
): CommitPlanStep[] {
  const repo = options.repoName || "personal-knowledge-base";
  const branch = options.defaultBranch || "main";
  const dirs = [...new Set(files.map((file) => file.path.split("/").slice(0, -1).join("/")))];

  const steps: CommitPlanStep[] = [
    {
      order: 1,
      action: "create_dir",
      target: dirs.join(", "),
      detail: `Ensure category directories exist on ${branch} of ${repo}`,
    },
  ];

  files.forEach((file, index) => {
    steps.push({
      order: index + 2,
      action: "write_file",
      target: file.path,
      detail: `Write ${file.category} note from source ${file.source} (${file.fragmentIds.length} fragment(s))`,
    });
  });

  steps.push({
    order: steps.length + 1,
    action: "open_pr",
    target: `chore(assistant): import ${files.length} structured notes`,
    detail: `Open a PR against ${branch} summarizing multi-source ingest`,
  });

  return steps;
}

export function buildDirectoryTree(files: StructuredFile[]): string[] {
  const paths = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    let cursor = "";
    for (let i = 0; i < parts.length; i += 1) {
      cursor = cursor ? `${cursor}/${parts[i]}` : parts[i];
      const isFile = i === parts.length - 1;
      paths.add(isFile ? cursor : `${cursor}/`);
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

export function buildMarkdownExport(result: Omit<PipelineResult, "markdownExport" | "csvExport">): string {
  const { summary, files, commitPlan, directoryTree, agentLog } = result;
  const categoryLines = Object.entries(summary.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `| ${CATEGORY_LABELS[category as ContentCategory] ?? category} | ${count} |`);

  return [
    "# Personal Assistant Structure Plan",
    "",
    `Repository: \`${summary.owner}/${summary.repoName}\` · branch \`${summary.defaultBranch}\``,
    "",
    "## Summary",
    "",
    `- Fragments ingested: **${summary.fragmentCount}**`,
    `- Files planned: **${summary.fileCount}**`,
    `- PII redactions: emails=${summary.redactionTotals.emails}, phones=${summary.redactionTotals.phones}, handles=${summary.redactionTotals.handles}`,
    "",
    "## Category breakdown",
    "",
    "| Category | Count |",
    "| --- | ---: |",
    ...categoryLines,
    "",
    "## Directory tree",
    "",
    "```",
    ...directoryTree,
    "```",
    "",
    "## Commit plan",
    "",
    ...commitPlan.map(
      (step) =>
        `${step.order}. **${step.action}** \`${step.target}\` — ${step.detail}`,
    ),
    "",
    "## Planned files",
    "",
    ...files.map((file) => `- \`${file.path}\` (${file.category}, source=${file.source})`),
    "",
    "## Agent log",
    "",
    ...agentLog.map((line) => `- ${line}`),
    "",
  ].join("\n");
}

export function buildCsvExport(files: StructuredFile[]): string {
  const header = '"path","category","source","title","fragment_ids"';
  const rows = files.map((file) => {
    const cells = [
      file.path,
      file.category,
      file.source,
      file.title,
      file.fragmentIds.join("|"),
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    return cells.join(",");
  });
  return [header, ...rows].join("\n");
}

export function runPipeline(
  raw: RawFragment[],
  options: PipelineOptions = {},
): PipelineResult {
  const agentLog: string[] = [];
  const owner = options.owner?.trim() || "midnghtsapphire";
  const repoName = options.repoName?.trim() || "personal-knowledge-base";
  const defaultBranch = options.defaultBranch?.trim() || "main";

  agentLog.push("IngestAgent: normalizing multi-source fragments");
  const normalized = ingestFragments(raw, options);

  agentLog.push("PrivacyAgent: redacting emails, phones, and handles");
  const redacted = normalized.map(redactFragment);

  agentLog.push("TriageAgent: classifying fragments into content categories");
  const classified = redacted.map(classifyFragment);

  agentLog.push("StructureAgent: mapping classifications to repository paths");
  const files = structureFiles(classified);

  agentLog.push("CommitPlanAgent: building GitHub directory + PR steps");
  const commitPlan = buildCommitPlan(files, { owner, repoName, defaultBranch });
  const directoryTree = buildDirectoryTree(files);

  const categoryCounts: Record<string, number> = {};
  const redactionTotals = { emails: 0, phones: 0, handles: 0 };
  for (const fragment of classified) {
    categoryCounts[fragment.category] = (categoryCounts[fragment.category] ?? 0) + 1;
    redactionTotals.emails += fragment.redactions.emails;
    redactionTotals.phones += fragment.redactions.phones;
    redactionTotals.handles += fragment.redactions.handles;
  }

  const partial = {
    summary: {
      fragmentCount: classified.length,
      fileCount: files.length,
      categoryCounts,
      redactionTotals,
      repoName,
      owner,
      defaultBranch,
    },
    fragments: classified,
    files,
    directoryTree,
    commitPlan,
    agentLog,
  };

  return {
    ...partial,
    markdownExport: buildMarkdownExport(partial),
    csvExport: buildCsvExport(files),
  };
}

/** Demo corpus used by the UI "Load sample" button and API default. */
export const SAMPLE_FRAGMENTS: RawFragment[] = [
  {
    id: "sample-gmail-1",
    source: "gmail",
    title: "Follow up on WR personal assistant",
    body: "Hi team,\nPlease review the personal assistant pipeline and reply by Friday.\nAction item: open the PR against main.\nContact: ops@example.com or +1 415-555-0182.\nThanks,\n@midnghtsapphire",
    receivedAt: "2026-07-20T16:00:00.000Z",
  },
  {
    id: "sample-keep-1",
    source: "keep",
    title: "Brain dump — assistant architecture",
    body: "Notes on multi-agent layout:\n- Ingest from Gmail/Keep/Drive/SMS\n- Redact PII before model prompts\n- Structure into docs/ and inbox/\nWrite up the README procedure.",
    receivedAt: "2026-07-20T17:00:00.000Z",
  },
  {
    id: "sample-outlook-1",
    source: "outlook",
    title: "Accepted: Weekly product sync",
    body: "Teams meeting tomorrow at 10:00 AM.\nAgenda: personal assistant SaaS pricing, Polar checkout, deploy path.",
    receivedAt: "2026-07-21T09:00:00.000Z",
  },
  {
    id: "sample-sms-1",
    source: "sms",
    title: "SMS from contractor",
    body: "Hey — can you send the invoice for the landing page? Amount due $480. Text me at 555-0100.",
    receivedAt: "2026-07-21T12:30:00.000Z",
  },
  {
    id: "sample-drive-1",
    source: "drive",
    title: "Shared research doc",
    body: "drive.google.com research dump: competitor benchmark for CrewAI vs LangGraph vs n8n agent nodes. Market size notes and citations for deep dive.",
    receivedAt: "2026-07-21T14:00:00.000Z",
  },
];
