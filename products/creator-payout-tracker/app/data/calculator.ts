import type { Platform } from "./platforms";

export interface CreatorMetrics {
  monthlyViews: number;
  monthlySubscribers: number;
  subscriptionPrice: number;
}

export interface PlatformEstimate {
  platform: Platform;
  monthlyAdRevenue: number | null;
  monthlySubscriptionRevenue: number | null;
  blendedMonthlyRevenue: number;
  creatorSharePct: number | null;
  fitScore: number;
}

export function normalizeMetrics(metrics: Partial<CreatorMetrics>): CreatorMetrics {
  return {
    monthlyViews: clampNonNegative(metrics.monthlyViews ?? 100000),
    monthlySubscribers: clampNonNegative(metrics.monthlySubscribers ?? 100),
    subscriptionPrice: Math.max(1, clampNonNegative(metrics.subscriptionPrice ?? 5)),
  };
}

export function estimatePlatform(
  platform: Platform,
  metrics: CreatorMetrics,
): PlatformEstimate {
  const monthlyAdRevenue =
    platform.rpmMin !== null && platform.rpmMax !== null
      ? (((platform.rpmMin + platform.rpmMax) / 2) * metrics.monthlyViews) / 1000
      : null;

  const monthlySubscriptionRevenue =
    platform.subPayoutPer5 !== null
      ? platform.subPayoutPer5 * (metrics.subscriptionPrice / 5) * metrics.monthlySubscribers
      : null;

  const blendedMonthlyRevenue =
    (monthlyAdRevenue ?? 0) + (monthlySubscriptionRevenue ?? 0);
  const creatorSharePct =
    platform.platformCutPct === null ? null : 100 - platform.platformCutPct;

  return {
    platform,
    monthlyAdRevenue,
    monthlySubscriptionRevenue,
    blendedMonthlyRevenue,
    creatorSharePct,
    fitScore: blendedMonthlyRevenue + (creatorSharePct ?? 50) * 2,
  };
}

export function estimatePlatforms(
  platforms: Platform[],
  metrics: CreatorMetrics,
): PlatformEstimate[] {
  return platforms
    .map((platform) => estimatePlatform(platform, metrics))
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function getTopRecommendations(
  estimates: PlatformEstimate[],
  count = 3,
): PlatformEstimate[] {
  return [...estimates]
    .sort((a, b) => b.blendedMonthlyRevenue - a.blendedMonthlyRevenue)
    .slice(0, count);
}

export function formatUsd(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildMarkdownReport(
  metrics: CreatorMetrics,
  estimates: PlatformEstimate[],
): string {
  const top = getTopRecommendations(estimates, 5);
  const rows = top.map(
    (estimate, index) =>
      `| ${index + 1} | ${estimate.platform.name} | ${formatUsd(
        estimate.monthlyAdRevenue,
      )} | ${formatUsd(estimate.monthlySubscriptionRevenue)} | ${formatUsd(
        estimate.blendedMonthlyRevenue,
      )} | ${estimate.platform.paymentCadence} |`,
  );

  return [
    "# Creator Payout Strategy Brief",
    "",
    `- Monthly views/streams: ${metrics.monthlyViews.toLocaleString("en-US")}`,
    `- Paying subscribers/patrons: ${metrics.monthlySubscribers.toLocaleString(
      "en-US",
    )}`,
    `- Subscription price: ${formatUsd(metrics.subscriptionPrice)}/mo`,
    "",
    "| Rank | Platform | Ad revenue est. | Subscription est. | Blended est. | Payout cadence |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...rows,
    "",
    "## Recommended next move",
    "",
    top[0]
      ? `Focus first on ${top[0].platform.name}: it has the highest blended estimate for the metrics entered and fits ${top[0].platform.bestFor
          .slice(0, 3)
          .join(", ")} creators.`
      : "Add creator metrics to generate recommendations.",
    "",
    "_Estimates use publicly available and community-reported payout ranges. Actual earnings vary by niche, geography, engagement, and platform eligibility._",
  ].join("\n");
}

export function buildCsvExport(estimates: PlatformEstimate[]): string {
  const header = [
    "Platform",
    "Category",
    "Ad revenue estimate",
    "Subscription estimate",
    "Blended estimate",
    "Creator share %",
    "Payment cadence",
  ];
  const rows = estimates.map((estimate) => [
    estimate.platform.name,
    estimate.platform.category,
    numberCell(estimate.monthlyAdRevenue),
    numberCell(estimate.monthlySubscriptionRevenue),
    numberCell(estimate.blendedMonthlyRevenue),
    estimate.creatorSharePct === null ? "" : String(estimate.creatorSharePct),
    estimate.platform.paymentCadence,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function numberCell(value: number | null): string {
  return value === null ? "" : value.toFixed(2);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
