import { NextResponse } from "next/server";
import {
  SAMPLE_STARRED_REPOS,
  StarredRepo,
  buildCsvExport,
  buildStarMagnetReadmeBlock,
  estimateOrganicGrowth,
  generatePrioritizedMarkdown,
  mergeDiscoveryTopics,
  rankRepos,
} from "../../data/engine";

export const runtime = "nodejs";

interface ReportBody {
  owner?: string;
  repo?: string;
  currentTopics?: string[];
  currentStars?: number;
  starsYesterday?: number;
  dailyOrganicVisitors?: number;
  conversionRatePct?: number;
  repos?: StarredRepo[];
}

export async function POST(request: Request) {
  let body: ReportBody = {};
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    body = {};
  }

  const owner = body.owner?.trim() || "midnghtsapphire";
  const repo = body.repo?.trim() || "revvel-standards";
  const repos =
    Array.isArray(body.repos) && body.repos.length > 0
      ? body.repos
      : SAMPLE_STARRED_REPOS;

  const scored = rankRepos(repos);
  const growth = estimateOrganicGrowth({
    owner,
    repo,
    currentTopics: body.currentTopics,
    currentStars: body.currentStars,
    starsYesterday: body.starsYesterday,
    dailyOrganicVisitors: body.dailyOrganicVisitors,
    conversionRatePct: body.conversionRatePct,
  });

  return NextResponse.json({
    owner,
    repo,
    count: scored.length,
    top: scored.slice(0, 25).map((item) => ({
      nameWithOwner: item.repo.nameWithOwner,
      url: item.repo.url,
      score: item.score,
      stars: item.repo.stargazerCount,
      components: item.components,
    })),
    growth,
    recommendedTopics: mergeDiscoveryTopics(body.currentTopics ?? []),
    markdown: generatePrioritizedMarkdown(scored),
    csv: buildCsvExport(scored),
    readmeBlock: buildStarMagnetReadmeBlock(owner, repo),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "self-optimizing-star-magnet",
    endpoints: {
      report: "POST /api/report",
    },
  });
}
