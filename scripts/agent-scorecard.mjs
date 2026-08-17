#!/usr/bin/env node
/**
 * agent-scorecard.mjs
 * Aggregates formal-report agent accuracy + optional event log into
 * config/agent-scorecard-state.json and a human-readable markdown table.
 *
 * Privilege tiers are SUGGESTED only. Emergency requires human label.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPORT =
  process.env.FORMAL_REPORT ||
  path.join(process.cwd(), "artifacts/formal-report.json");
const STATE =
  process.env.SCORECARD_STATE ||
  path.join(process.cwd(), "config/agent-scorecard-state.json");
const EVENTS_DIR =
  process.env.SCORECARD_EVENTS ||
  path.join(process.cwd(), "logs/agent-scorecard");

const WEIGHTS = {
  loyalty: 0.2,
  bnat: 0.15,
  speed: 0.15,
  canonical: 0.2,
  features: 0.1,
  formal: 0.15,
  breakthrough: 0.05,
};

function tierOf(composite) {
  if (composite >= 90) return "principal"; // emergency is human-only promotion
  if (composite >= 80) return "principal";
  if (composite >= 60) return "senior";
  if (composite >= 40) return "associate";
  return "intern";
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function loadEvents() {
  const out = [];
  if (!fs.existsSync(EVENTS_DIR)) return out;
  for (const f of fs.readdirSync(EVENTS_DIR)) {
    if (!f.endsWith(".jsonl")) continue;
    const lines = fs.readFileSync(path.join(EVENTS_DIR, f), "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function main() {
  const agents = {};
  if (fs.existsSync(REPORT)) {
    const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
    for (const a of report.agents || []) {
      const formal = (a.accuracy_bps ?? 5000) / 100; // bps → 0-100
      agents[a.login] = {
        login: a.login,
        metrics: {
          loyalty: 70,
          bnat: 50,
          speed: 60,
          canonical: 65,
          features: 50,
          formal: clamp(formal),
          breakthrough: 0,
        },
        formal_raw: a,
      };
    }
  }

  for (const ev of loadEvents()) {
    const login = ev.agent;
    if (!login) continue;
    if (!agents[login]) {
      agents[login] = {
        login,
        metrics: {
          loyalty: 50,
          bnat: 50,
          speed: 50,
          canonical: 50,
          features: 50,
          formal: 50,
          breakthrough: 0,
        },
      };
    }
    const d = ev.delta || {};
    for (const [k, v] of Object.entries(d)) {
      if (agents[login].metrics[k] == null) continue;
      agents[login].metrics[k] = clamp(agents[login].metrics[k] + Number(v));
    }
  }

  const rows = Object.values(agents).map((a) => {
    let composite = 0;
    for (const [k, w] of Object.entries(WEIGHTS)) {
      composite += (a.metrics[k] ?? 50) * w;
    }
    composite = clamp(composite);
    return {
      ...a,
      composite,
      suggested_tier: tierOf(composite),
      privilege_label: `privilege:${tierOf(composite)}`,
    };
  });

  rows.sort((x, y) => y.composite - x.composite);

  const state = {
    generated_at: new Date().toISOString(),
    weights: WEIGHTS,
    agents: rows,
    note: "Emergency tier requires human label privilege:emergency",
  };

  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));

  console.log("| Agent | Composite | Tier | Formal | Loyalty | Canonical |");
  console.log("| --- | ---: | --- | ---: | ---: | ---: |");
  for (const r of rows) {
    console.log(
      `| ${r.login} | ${r.composite} | ${r.suggested_tier} | ${r.metrics.formal} | ${r.metrics.loyalty} | ${r.metrics.canonical} |`,
    );
  }
  console.log(`\nwrote ${STATE}`);
}

main();
