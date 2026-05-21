import { NextRequest, NextResponse } from "next/server";
import {
  buildCsvExport,
  buildMarkdownReport,
  estimatePlatforms,
  normalizeMetrics,
} from "../../data/calculator";
import { PLATFORMS } from "../../data/platforms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const metrics = normalizeMetrics({
    monthlyViews: parseMetric(body.monthlyViews),
    monthlySubscribers: parseMetric(body.monthlySubscribers),
    subscriptionPrice: parseMetric(body.subscriptionPrice),
  });
  const estimates = estimatePlatforms(PLATFORMS, metrics);

  return NextResponse.json({
    metrics,
    topPlatforms: estimates.slice(0, 5).map((estimate) => ({
      id: estimate.platform.id,
      name: estimate.platform.name,
      category: estimate.platform.category,
      monthlyAdRevenue: estimate.monthlyAdRevenue,
      monthlySubscriptionRevenue: estimate.monthlySubscriptionRevenue,
      blendedMonthlyRevenue: estimate.blendedMonthlyRevenue,
      paymentCadence: estimate.platform.paymentCadence,
    })),
    markdown: buildMarkdownReport(metrics, estimates),
    csv: buildCsvExport(estimates),
  });
}

function parseMetric(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return undefined;
}
