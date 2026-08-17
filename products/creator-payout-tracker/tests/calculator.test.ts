import assert from "node:assert/strict";
import {
  buildCsvExport,
  buildMarkdownReport,
  estimatePlatform,
  estimatePlatforms,
  getTopRecommendations,
  normalizeMetrics,
} from "../app/data/calculator";
import { PLATFORMS } from "../app/data/platforms";

const metrics = normalizeMetrics({
  monthlyViews: 100000,
  monthlySubscribers: 100,
  subscriptionPrice: 5,
});

assert.deepEqual(metrics, {
  monthlyViews: 100000,
  monthlySubscribers: 100,
  subscriptionPrice: 5,
});

const youtube = PLATFORMS.find((platform) => platform.id === "youtube-longform");
assert.ok(youtube, "YouTube long-form platform exists");

const youtubeEstimate = estimatePlatform(youtube, metrics);
assert.equal(youtubeEstimate.monthlyAdRevenue, 1400);
assert.equal(youtubeEstimate.monthlySubscriptionRevenue, 350);
assert.equal(youtubeEstimate.blendedMonthlyRevenue, 1750);
assert.equal(youtubeEstimate.creatorSharePct, 70);

const estimates = estimatePlatforms(PLATFORMS, metrics);
const top = getTopRecommendations(estimates, 3);

assert.equal(top.length, 3);
assert.equal(top[0].platform.id, "youtube-longform");
assert.ok(top[0].blendedMonthlyRevenue > top[1].blendedMonthlyRevenue);

const report = buildMarkdownReport(metrics, estimates);
assert.match(report, /Creator Payout Strategy Brief/);
assert.match(report, /YouTube \(Long-form\)/);
assert.match(report, /\$1,750/);

const csv = buildCsvExport(estimates);
assert.match(csv, /"Platform","Category","Ad revenue estimate"/);
assert.match(csv, /"YouTube \(Long-form\)","video","1400.00"/);

const sanitized = normalizeMetrics({
  monthlyViews: -100,
  monthlySubscribers: Number.NaN,
  subscriptionPrice: 0,
});
assert.deepEqual(sanitized, {
  monthlyViews: 0,
  monthlySubscribers: 0,
  subscriptionPrice: 1,
});
