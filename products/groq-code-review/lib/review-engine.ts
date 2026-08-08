import { chunkPullRequestDiff } from "./chunk";
import { buildMarkdownReport, countBySeverity, sortFindings } from "./export";
import { callGroqChat, parseGroqFindings } from "./groq-client";
import { reviewDiffLocally, summarizeLocalFindings } from "./local-reviewer";
import {
  ChunkReview,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_NEW_TOKENS,
  DEFAULT_TOP_P,
  ReviewFinding,
  ReviewOptions,
  ReviewResult,
  Severity,
} from "./types";

function isSeverity(value: string): value is Severity {
  return ["critical", "high", "medium", "low", "info"].includes(value);
}

/**
 * End-to-end review pipeline:
 * 1. Chunk the PR diff for model context limits.
 * 2. Review each chunk via Groq (when keyed) or local heuristics.
 * 3. Consolidate findings + markdown for UI / GitHub Action posting.
 */
export async function reviewPullRequestDiff(
  diff: string,
  options: ReviewOptions = {},
): Promise<ReviewResult> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunks = chunkPullRequestDiff(diff, chunkSize);
  const apiKey = (options.apiKey ?? process.env.GROQ_API_KEY ?? "").trim();
  const preferGroq = Boolean(apiKey) && !options.forceLocal;

  if (!chunks.length) {
    const empty = {
      findings: [] as ReviewFinding[],
      chunkReviews: [] as ChunkReview[],
      summary: "Empty diff — nothing to review.",
      stats: {
        chunkCount: 0,
        findingCount: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        provider: "local" as const,
        model: "local-heuristics",
      },
    };
    return { ...empty, markdown: buildMarkdownReport(empty) };
  }

  const chunkReviews: ChunkReview[] = [];
  const allFindings: ReviewFinding[] = [];
  const providers = new Set<"groq" | "local">();

  for (const chunk of chunks) {
    let findings: ReviewFinding[] = [];
    let provider: "groq" | "local" = "local";
    let summary = "";

    if (preferGroq) {
      try {
        const groq = await callGroqChat({
          apiKey,
          model: options.model,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          maxNewTokens: options.maxNewTokens ?? DEFAULT_MAX_NEW_TOKENS,
          topP: options.topP ?? DEFAULT_TOP_P,
          userPrompt: [
            `Review chunk ${chunk.index + 1}/${chunks.length} (${chunk.label}).`,
            "Unified diff follows:",
            "```diff",
            chunk.content,
            "```",
          ].join("\n"),
        });
        const parsed = parseGroqFindings(groq.text, chunk.index);
        findings = parsed.map((row, i) => ({
          id: `groq-${chunk.index}-${i + 1}`,
          severity: isSeverity(row.severity) ? row.severity : "info",
          title: row.title,
          detail: row.detail,
          file: chunk.files[0],
          ruleId: "groq-llm",
          chunkIndex: chunk.index,
        }));
        provider = "groq";
        summary =
          findings.length > 0
            ? `LLM review found ${findings.length} item(s) in "${chunk.label}".`
            : `LLM review: no findings in "${chunk.label}".`;
      } catch {
        // Fall through to local — rate limits / missing credits are common.
        findings = reviewDiffLocally(chunk.content, chunk.index);
        provider = "local";
        summary = `${summarizeLocalFindings(findings, chunk.label)} (Groq unavailable; used local fallback)`;
      }
    } else {
      findings = reviewDiffLocally(chunk.content, chunk.index);
      provider = "local";
      summary = summarizeLocalFindings(findings, chunk.label);
    }

    providers.add(provider);
    allFindings.push(...findings);
    chunkReviews.push({
      chunkIndex: chunk.index,
      label: chunk.label,
      findings,
      summary,
      provider,
    });
  }

  const sorted = sortFindings(allFindings);
  const counts = countBySeverity(sorted);
  const provider: ReviewResult["stats"]["provider"] =
    providers.size > 1 ? "mixed" : providers.has("groq") ? "groq" : "local";

  const summary = buildExecutiveSummary(sorted, chunks.length, provider);
  const partial = {
    findings: sorted,
    chunkReviews,
    summary,
    stats: {
      chunkCount: chunks.length,
      findingCount: sorted.length,
      ...counts,
      provider,
      model: preferGroq && provider !== "local" ? options.model || process.env.GROQ_MODEL || DEFAULT_MODEL : "local-heuristics",
    },
  };

  return {
    ...partial,
    markdown: buildMarkdownReport(partial),
  };
}

function buildExecutiveSummary(
  findings: ReviewFinding[],
  chunkCount: number,
  provider: ReviewResult["stats"]["provider"],
): string {
  if (!findings.length) {
    return `Reviewed ${chunkCount} chunk(s) via ${provider}. No material issues detected.`;
  }
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  if (critical > 0) {
    return `Reviewed ${chunkCount} chunk(s) via ${provider}. ${findings.length} finding(s) including ${critical} critical — block merge until secrets/RCE risks are cleared.`;
  }
  if (high > 0) {
    return `Reviewed ${chunkCount} chunk(s) via ${provider}. ${findings.length} finding(s) including ${high} high severity. Address before merge.`;
  }
  return `Reviewed ${chunkCount} chunk(s) via ${provider}. ${findings.length} non-blocking finding(s) for follow-up.`;
}

/** Workflow YAML snippet teams can paste into .github/workflows. */
export function buildWorkflowSnippet(opts?: {
  model?: string;
  chunkSize?: number;
  actionRef?: string;
}): string {
  const model = opts?.model || DEFAULT_MODEL;
  const chunkSize = opts?.chunkSize || DEFAULT_CHUNK_SIZE;
  const actionRef = opts?.actionRef || "./products/groq-code-review/action";

  return `name: Groq Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths-ignore:
      - "**/*.md"
      - "LICENSE"

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: groq-code-review-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  review:
    if: >-
      github.event.pull_request.draft == false &&
      !contains(github.event.pull_request.title, '[skip-review]')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get pull request diff
        id: diff
        env:
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
        run: |
          git diff "\${BASE_SHA}" "\${HEAD_SHA}" -- . ":(exclude)*.png" ":(exclude)*.jpg" > /tmp/pr.diff
          {
            echo "pull_request_diff<<REVVELEOF"
            cat /tmp/pr.diff
            echo "REVVELEOF"
          } >> "$GITHUB_OUTPUT"

      - name: Groq Code Review
        uses: ${actionRef}
        with:
          apiKey: \${{ secrets.GROQ_API_KEY }}
          githubToken: \${{ secrets.GITHUB_TOKEN }}
          githubRepository: \${{ github.repository }}
          githubPullRequestNumber: \${{ github.event.pull_request.number }}
          gitCommitHash: \${{ github.event.pull_request.head.sha }}
          pullRequestDiff: \${{ steps.diff.outputs.pull_request_diff }}
          pullRequestDiffChunkSize: "${chunkSize}"
          repoId: "${model}"
          temperature: "0.2"
          maxNewTokens: "512"
          topP: "0.95"
          logLevel: "INFO"
`;
}
