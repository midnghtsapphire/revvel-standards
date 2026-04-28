#!/usr/bin/env node
/**
 * Amplitude → Notion Agent
 *
 * Pulls a daily metrics snapshot from the Amplitude Dashboard REST API for a
 * configured chart, and appends a row to a Notion database so the team can
 * see governance throughput (issues opened/closed, PRs merged, releases, etc.)
 * without leaving Notion.
 *
 * This is the read-side complement to `.github/workflows/amplitude-events.yml`
 * (which sends GitHub events INTO Amplitude). Together they form a closed
 * loop: GitHub → Amplitude → Notion.
 *
 * Usage:
 *   AMPLITUDE_API_KEY=...           \
 *   AMPLITUDE_SECRET_KEY=...        \
 *   AMPLITUDE_CHART_ID=abc123       \
 *   NOTION_API_KEY=secret_...       \
 *   NOTION_AMPLITUDE_DATABASE_ID=...\
 *   node scripts/amplitude-to-notion.js
 *
 * Optional:
 *   AMPLITUDE_REGION  "us" (default) | "eu"
 *   NOTION_VERSION    Notion API version header (default 2022-06-28)
 *   DRY_RUN           "true" — log payloads, do not POST to Notion
 *   GITHUB_REPOSITORY owner/repo (used as the Source property; auto-set in CI)
 *
 * See: standards/AMPLITUDE_NOTION_AGENT_STANDARD.md
 */

"use strict";

const https = require("https");

// ---------------------------------------------------------------------------
// Config (read at run time, NOT at module load — so tests can require() us
// without supplying every env var).
// ---------------------------------------------------------------------------

function readConfig(env = process.env) {
  return {
    amplitudeApiKey: env.AMPLITUDE_API_KEY || "",
    amplitudeSecretKey: env.AMPLITUDE_SECRET_KEY || "",
    amplitudeChartId: env.AMPLITUDE_CHART_ID || "",
    amplitudeRegion: (env.AMPLITUDE_REGION || "us").toLowerCase(),
    notionApiKey: env.NOTION_API_KEY || "",
    notionDatabaseId: env.NOTION_AMPLITUDE_DATABASE_ID || "",
    notionVersion: env.NOTION_VERSION || "2022-06-28",
    dryRun: String(env.DRY_RUN || "").toLowerCase() === "true",
    repository: env.GITHUB_REPOSITORY || "midnghtsapphire/revvel-standards",
  };
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

const AMPLITUDE_HOSTS = {
  us: "amplitude.com",
  eu: "analytics.eu.amplitude.com",
};

function amplitudeHost(region) {
  return AMPLITUDE_HOSTS[region] || AMPLITUDE_HOSTS.us;
}

/**
 * Build the Basic Auth header value for the Amplitude Dashboard REST API.
 * The Dashboard API uses HTTP Basic auth: <api_key>:<secret_key>.
 */
function amplitudeAuthHeader(apiKey, secretKey) {
  if (!apiKey || !secretKey) {
    throw new Error("amplitudeAuthHeader: apiKey and secretKey are required");
  }
  const token = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Reduce an Amplitude Chart API response into a flat snapshot suitable for a
 * Notion database row. Amplitude's `/api/3/chart/<id>/query` response shape
 * varies by chart type; we defensively handle the common "events"/"segmentation"
 * shape (top-level `data.series` is an array of arrays) and fall back to a
 * total-count summary so we never crash on an unexpected payload.
 */
function summarizeChart(amplitudeResponse) {
  const out = {
    total: 0,
    seriesCount: 0,
    seriesLabels: [],
    raw: amplitudeResponse,
  };
  if (!amplitudeResponse || typeof amplitudeResponse !== "object") {
    return out;
  }
  const data = amplitudeResponse.data || amplitudeResponse;
  const series = Array.isArray(data.series) ? data.series : [];
  out.seriesCount = series.length;
  out.seriesLabels = Array.isArray(data.seriesLabels)
    ? data.seriesLabels.map((s) => (Array.isArray(s) ? s.join(" / ") : String(s)))
    : [];
  for (const s of series) {
    if (!Array.isArray(s)) continue;
    for (const v of s) {
      const n = Number(v);
      if (Number.isFinite(n)) out.total += n;
    }
  }
  return out;
}

/**
 * Build the JSON body for `POST https://api.notion.com/v1/pages` that creates
 * a new row in the configured database. Schema (must exist in the target DB):
 *   - Title           (title)        — snapshot label, e.g. "2026-04-28 — repo"
 *   - Date            (date)
 *   - Total Events    (number)
 *   - Series Count    (number)
 *   - Series Labels   (rich_text)
 *   - Source          (rich_text)    — owner/repo
 *   - Chart ID        (rich_text)
 */
function buildNotionPagePayload({
  databaseId,
  isoDate,
  repository,
  chartId,
  summary,
}) {
  if (!databaseId) throw new Error("buildNotionPagePayload: databaseId required");
  const dateOnly = String(isoDate).slice(0, 10);
  const title = `${dateOnly} — ${repository}`;
  return {
    parent: { database_id: databaseId },
    properties: {
      Title: {
        title: [{ type: "text", text: { content: title } }],
      },
      Date: {
        date: { start: dateOnly },
      },
      "Total Events": {
        number: Number(summary.total) || 0,
      },
      "Series Count": {
        number: Number(summary.seriesCount) || 0,
      },
      "Series Labels": {
        rich_text: [
          {
            type: "text",
            text: { content: (summary.seriesLabels || []).join(", ").slice(0, 1900) },
          },
        ],
      },
      Source: {
        rich_text: [{ type: "text", text: { content: String(repository) } }],
      },
      "Chart ID": {
        rich_text: [{ type: "text", text: { content: String(chartId || "") } }],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers (Node built-in https; no external deps)
// ---------------------------------------------------------------------------

function httpRequest({ hostname, path, method = "GET", headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers: { ...headers } };
    if (body) {
      opts.headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 0, body: data });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function fetchAmplitudeChart(cfg) {
  const host = amplitudeHost(cfg.amplitudeRegion);
  const path = `/api/3/chart/${encodeURIComponent(cfg.amplitudeChartId)}/query`;
  const auth = amplitudeAuthHeader(cfg.amplitudeApiKey, cfg.amplitudeSecretKey);
  const res = await httpRequest({
    hostname: host,
    path,
    method: "GET",
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(
      `Amplitude chart fetch failed: HTTP ${res.statusCode} — ${res.body.slice(0, 500)}`
    );
  }
  try {
    return JSON.parse(res.body);
  } catch (err) {
    throw new Error(`Amplitude returned non-JSON: ${err.message}`);
  }
}

async function postNotionPage(cfg, payload) {
  const body = JSON.stringify(payload);
  const res = await httpRequest({
    hostname: "api.notion.com",
    path: "/v1/pages",
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.notionApiKey}`,
      "Notion-Version": cfg.notionVersion,
      "Content-Type": "application/json",
    },
    body,
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(
      `Notion page create failed: HTTP ${res.statusCode} — ${res.body.slice(0, 500)}`
    );
  }
  return JSON.parse(res.body);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function validateConfig(cfg) {
  const missing = [];
  if (!cfg.amplitudeApiKey) missing.push("AMPLITUDE_API_KEY");
  if (!cfg.amplitudeSecretKey) missing.push("AMPLITUDE_SECRET_KEY");
  if (!cfg.amplitudeChartId) missing.push("AMPLITUDE_CHART_ID");
  if (!cfg.notionApiKey) missing.push("NOTION_API_KEY");
  if (!cfg.notionDatabaseId) missing.push("NOTION_AMPLITUDE_DATABASE_ID");
  return missing;
}

async function main() {
  const cfg = readConfig();
  const missing = validateConfig(cfg);
  if (missing.length) {
    console.warn(
      `::warning::amplitude-to-notion skipped — missing env: ${missing.join(", ")}. ` +
        `See standards/AMPLITUDE_NOTION_AGENT_STANDARD.md.`
    );
    // Soft exit — same convention as amplitude-events.yml verify step.
    return 0;
  }

  console.log(
    `[amplitude-to-notion] region=${cfg.amplitudeRegion} chart=${cfg.amplitudeChartId} ` +
      `repo=${cfg.repository} dryRun=${cfg.dryRun}`
  );

  const chart = await fetchAmplitudeChart(cfg);
  const summary = summarizeChart(chart);
  console.log(
    `[amplitude-to-notion] summary: total=${summary.total} ` +
      `series=${summary.seriesCount} labels=${JSON.stringify(summary.seriesLabels)}`
  );

  const payload = buildNotionPagePayload({
    databaseId: cfg.notionDatabaseId,
    isoDate: new Date().toISOString(),
    repository: cfg.repository,
    chartId: cfg.amplitudeChartId,
    summary,
  });

  if (cfg.dryRun) {
    console.log("[amplitude-to-notion] DRY_RUN — would POST to Notion:");
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }

  const created = await postNotionPage(cfg, payload);
  console.log(`[amplitude-to-notion] ✅ Notion page created: ${created.id}`);
  return 0;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[amplitude-to-notion] ❌ ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  readConfig,
  validateConfig,
  amplitudeHost,
  amplitudeAuthHeader,
  summarizeChart,
  buildNotionPagePayload,
};
