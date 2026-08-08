import { NextRequest, NextResponse } from "next/server";
import { buildGithubReviewBody } from "../../../lib/export";
import { reviewPullRequestDiff } from "../../../lib/review-engine";
import { DEFAULT_CHUNK_SIZE, DEFAULT_MAX_NEW_TOKENS, DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P } from "../../../lib/types";

export const runtime = "nodejs";

/**
 * POST /api/review
 *
 * Body:
 * {
 *   "diff": "...unified diff...",
 *   "chunkSize": 4000,
 *   "model": "llama-3.3-70b-versatile",
 *   "temperature": 0.2,
 *   "forceLocal": false
 * }
 *
 * Auth: optional GROQ_API_KEY from server env (never accept raw keys from
 * untrusted browsers in production without your own auth layer). Clients may
 * pass forceLocal=true for offline demos.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const diff = typeof body.diff === "string" ? body.diff : typeof body.pullRequestDiff === "string" ? body.pullRequestDiff : "";

  if (!diff.trim()) {
    return NextResponse.json(
      { error: "diff is required (unified diff text)" },
      { status: 400 },
    );
  }

  // Soft guard — keep serverless payloads reasonable.
  if (diff.length > 1_500_000) {
    return NextResponse.json(
      { error: "diff exceeds 1.5MB limit; split the PR or raise the limit intentionally" },
      { status: 413 },
    );
  }

  const result = await reviewPullRequestDiff(diff, {
    chunkSize: parseNumber(body.chunkSize ?? body.pullRequestDiffChunkSize, DEFAULT_CHUNK_SIZE),
    model: typeof body.model === "string" ? body.model : typeof body.repoId === "string" ? body.repoId : DEFAULT_MODEL,
    temperature: parseNumber(body.temperature, DEFAULT_TEMPERATURE),
    maxNewTokens: parseNumber(body.maxNewTokens, DEFAULT_MAX_NEW_TOKENS),
    topP: parseNumber(body.topP, DEFAULT_TOP_P),
    forceLocal: Boolean(body.forceLocal) || body.provider === "local",
  });

  return NextResponse.json({
    ...result,
    githubReviewBody: buildGithubReviewBody(result),
  });
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
