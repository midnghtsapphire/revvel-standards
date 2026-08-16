import { NextRequest, NextResponse } from "next/server";
import {
  PipelineOptions,
  RawFragment,
  SAMPLE_FRAGMENTS,
  runPipeline,
} from "../../data/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fragments = normalizeFragments(body.fragments);
  const options = normalizeOptions(body);

  if (fragments.length === 0) {
    return NextResponse.json(
      {
        error: "Provide at least one fragment with a non-empty body, or pass useSample: true.",
      },
      { status: 400 },
    );
  }

  const result = runPipeline(fragments, options);
  return NextResponse.json(result);
}

export async function GET() {
  const result = runPipeline(SAMPLE_FRAGMENTS, {
    owner: "midnghtsapphire",
    repoName: "personal-knowledge-base",
    defaultBranch: "main",
  });
  return NextResponse.json(result);
}

function normalizeOptions(body: Record<string, unknown>): PipelineOptions {
  return {
    owner: asString(body.owner) || "midnghtsapphire",
    repoName: asString(body.repoName) || "personal-knowledge-base",
    defaultBranch: asString(body.defaultBranch) || "main",
  };
}

function normalizeFragments(input: unknown): RawFragment[] {
  if (!Array.isArray(input)) {
    if (input && typeof input === "object" && (input as { useSample?: boolean }).useSample) {
      return SAMPLE_FRAGMENTS;
    }
    return [];
  }

  const fragments: RawFragment[] = [];
  input.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const body = asString(row.body);
    if (!body) return;
    const title = asString(row.title);
    const receivedAt = asString(row.receivedAt);
    fragments.push({
      id: asString(row.id) || `api-${index + 1}`,
      source: asString(row.source) || "other",
      title: title || undefined,
      body,
      receivedAt: receivedAt || undefined,
    });
  });
  return fragments;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
