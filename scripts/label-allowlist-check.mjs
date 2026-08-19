#!/usr/bin/env node
/**
 * label-allowlist-check.mjs
 * Validates that labels applied to an issue/PR (or all repo labels) are either
 * on the canonical allowlist or mapped via aliases. Exit 1 on unknown labels
 * when --strict. Prefer Project fields for new state; do not invent labels.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadYamlLite(file) {
  // Minimal YAML subset loader for this config (no external dep required).
  // For full YAML, swap to `yaml` package already in root package.json.
  const text = fs.readFileSync(file, "utf8");
  try {
    // Prefer real parser if available
    const yaml = awaitImportYaml();
    if (yaml) return yaml.parse(text);
  } catch {
    /* fall through */
  }
  return parseAllowlistFallback(text);
}

function awaitImportYaml() {
  try {
    return require("yaml");
  } catch {
    return null;
  }
}

function parseAllowlistFallback(text) {
  const labels = [];
  const aliases = {};
  let inAliases = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("aliases:")) {
      inAliases = true;
      continue;
    }
    if (inAliases) {
      const m = line.match(/^\s*"([^"]+)":\s*"([^"]+)"/);
      if (m) aliases[m[1]] = m[2];
      continue;
    }
    const m = line.match(/^\s*-\s*name:\s*(.+)\s*$/);
    if (m) {
      let name = m[1].trim();
      if (
        (name.startsWith('"') && name.endsWith('"')) ||
        (name.startsWith("'") && name.endsWith("'"))
      ) {
        name = name.slice(1, -1);
      }
      labels.push(name);
    }
  }
  return { labels: labels.map((name) => ({ name })), aliases };
}

function main() {
  const root = process.cwd();
  const cfgPath =
    process.env.LABEL_ALLOWLIST_PATH ||
    path.join(root, "config/labels-allowlist.yml");
  if (!fs.existsSync(cfgPath)) {
    console.error(`missing allowlist: ${cfgPath}`);
    process.exit(2);
  }
  const cfg = loadYamlLite(cfgPath);
  const allowed = new Set(
    (cfg.labels || []).map((l) => (typeof l === "string" ? l : l.name)),
  );
  const maxLabels = Number(cfg.max_labels_total);
  if (Number.isFinite(maxLabels) && allowed.size > maxLabels) {
    console.error(`allowlist has ${allowed.size} labels; maximum is ${maxLabels}`);
    process.exit(2);
  }
  const aliases = cfg.aliases || {};

  const checkList = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const strict = process.argv.includes("--strict");
  const dump = process.argv.includes("--dump");

  if (dump) {
    console.log([...allowed].sort().join("\n"));
    process.exit(0);
  }

  const input =
    checkList.length > 0
      ? checkList
      : (process.env.LABELS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

  if (input.length === 0) {
    console.log(
      `allowlist loaded: ${allowed.size} labels, ${Object.keys(aliases).length} aliases`,
    );
    console.log("usage: label-allowlist-check.mjs [--strict] label1 label2");
    process.exit(0);
  }

  const unknown = [];
  const mapped = [];
  for (const raw of input) {
    if (allowed.has(raw)) continue;
    if (aliases[raw] && allowed.has(aliases[raw])) {
      mapped.push(`${raw} → ${aliases[raw]}`);
      continue;
    }
    // Fleet bots mint research:* lanes dynamically. wr-pr-creation.yml
    // propagates every `research:*` label from the WR issue onto the WR PR
    // (`label.startsWith('research:')`), so the lane set is open-ended and
    // cannot be enumerated as fixed aliases without breaking again on the next
    // lane. Resolve by prefix, same as status:* below.
    if (raw.startsWith("research:")) {
      const s = raw.slice("research:".length).toLowerCase();
      // Exact suffixes, not substrings: the `research:reviewer` lane contains
      // "review" but is an ordinary research lane, not a review state, and a
      // substring test silently mapped it to in-review.
      let target = "research";
      if (s === "blocked") target = "blocked";
      else if (s === "review-needed") target = "in-review";
      if (allowed.has(target)) {
        mapped.push(`${raw} → ${target} (research: prefix)`);
        continue;
      }
    }
    // wr-pr-creation.yml derives a `deliver:*` label from the WR's Output Type
    // (OUTPUT_TYPE_DELIVER_MAP) and applies it to the PR alongside the research
    // labels. Per standards/DELIVERY_MATRIX.md each one activates the matching
    // post-merge delivery workflow, so the whole family is delivery automation.
    // The map is open-ended (a new Output Type adds a new deliver: value), so
    // resolve by prefix rather than enumerating today's values.
    if (raw.startsWith("deliver:")) {
      if (allowed.has("automation")) {
        mapped.push(`${raw} → automation (deliver: prefix)`);
        continue;
      }
    }
    // Fleet bots mint status:* ephemera; map to lifecycle/check labels.
    if (raw.startsWith("status:")) {
      const s = raw.slice("status:".length).toLowerCase();
      let target = "in-review";
      if (s.includes("fail")) target = "checks-failing";
      else if (s.includes("ready") && s.includes("merge")) target = "ready-to-merge";
      else if (s.includes("pass") || s.includes("success") || s.includes("green"))
        target = "checks-passing";
      else if (s.includes("block")) target = "blocked";
      else if (s.includes("draft")) target = "draft";
      else if (s.includes("approv")) target = "approved";
      else if (s.includes("change")) target = "changes-requested";
      else if (s.includes("wait") || s.includes("review") || s.includes("pending"))
        target = "awaiting-approval";
      if (allowed.has(target)) {
        mapped.push(`${raw} → ${target} (status: prefix)`);
        continue;
      }
    }
    unknown.push(raw);
  }

  if (mapped.length) console.log("mapped:\n  " + mapped.join("\n  "));
  if (unknown.length) {
    console.error("UNKNOWN labels (not on allowlist):\n  " + unknown.join("\n  "));
    console.error(
      "Prefer Project fields or open a WR to extend config/labels-allowlist.yml",
    );
    process.exit(strict ? 1 : 0);
  }
  console.log("ok: all labels allowed or mapped");
}

main();
