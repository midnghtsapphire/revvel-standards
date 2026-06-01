#!/usr/bin/env node
// fix-wr-gate.mjs — closes the "documents the fix but doesn't apply it" hole.
// A fix-class WR PR must EITHER touch a real (non-wr/) file, OR be explicitly labeled tracking-only.
// Catches PRs #14186/#14185/#14177/#14138/#14116/#14066 etc. pattern.
//
// Usage: node fix-wr-gate.mjs --changed <file-list-newline-or-comma> [--labels <csv>] [--title "<pr title>"]
//   exit 0 = pass, 1 = gate violation.
//
// "Real fix" = any changed file NOT under wr/ and NOT a pure docs/tracking artifact.
// Tracking-only escape hatch = PR has a label in TRACKING_LABELS or title starts with a TRACKING_PREFIX.

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : ""; };

const changedRaw = get("changed");
const labels = get("labels").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const title = get("title") || "";

const TRACKING_LABELS = ["tracking-only", "wr-docs", "wr-tracking", "meta-tracking", "docs-only"];
const TRACKING_PREFIXES = [/^\[wr-docs\]/i, /^\[wr-tracking\]/i, /^track\b/i, /^\[track\]/i];

// Title signals this PR claims to FIX something (not just track it).
const FIX_SIGNAL = /\b(fix|resolve|repair|correct|patch|remove|add (missing|the)|implement)\b/i;

const changed = changedRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

function isRealFix(path) {
  if (path.startsWith("wr/")) return false;                 // WR tracking docs don't count
  if (/^docs\/.*\.md$/i.test(path)) return true;            // a docs FIX (e.g. broken link) IS the fix
  return true;                                              // any code/config/workflow file counts
}

const realFixFiles = changed.filter(isRealFix);
const wrOnly = changed.length > 0 && realFixFiles.length === 0;
const claimsFix = FIX_SIGNAL.test(title);
const isTrackingOnly =
  labels.some((l) => TRACKING_LABELS.includes(l)) ||
  TRACKING_PREFIXES.some((re) => re.test(title.trim()));

const issues = [];

if (claimsFix && wrOnly && !isTrackingOnly) {
  issues.push(
    `PR title claims a fix ("${title.trim()}") but the diff only touches wr/ tracking files ` +
    `(${changed.join(", ")}). Either include the actual fix (a non-wr/ file), OR label the PR ` +
    `one of [${TRACKING_LABELS.join(", ")}] / prefix the title "[WR-DOCS]" to mark it tracking-only.`
  );
}

// Secondary: a fix WR that is tracking-only should SAY so, to avoid a future reviewer thinking it's resolved.
if (claimsFix && wrOnly && isTrackingOnly) {
  console.log(`note: tracking-only fix WR accepted (labeled/prefixed). Ensure a follow-up PR applies the actual fix.`);
}

if (issues.length) {
  console.log("✗ fix-WR gate failed:");
  issues.forEach((i) => console.log("   - " + i));
  process.exit(1);
}
console.log("✓ fix-WR gate passed");
process.exit(0);
