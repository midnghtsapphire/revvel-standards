#!/usr/bin/env node
// fix-wr-gate.mjs — closes the "documents the fix but doesn't apply it" hole.
// A fix-class WR PR must EITHER touch a real (non-wr/) file, OR be explicitly labeled tracking-only.
// Catches PRs #14186/#14185/#14177/#14138/#14116/#14066 etc. pattern.
//
// Usage: node fix-wr-gate.mjs --changed <file-list-newline-or-comma> [--labels <csv>] [--title "<pr title>"] [--body "<pr body>"]
//   exit 0 = pass, 1 = gate violation.
//
// "Real fix" = any changed file outside wr/, OR specific allowlisted wr/ paths
// (wr/scripts/, wr/WR_TEMPLATE_*.md, wr/README.md) because fixes to the gate
// itself or the templates are also genuine fixes.
// Tracking-only escape hatch = PR has a label in TRACKING_LABELS or title starts with a TRACKING_PREFIX
// AND the body carries an explicit `Tracks: #NNNN` reference to the follow-up issue/PR that will apply the fix.

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : ""; };

const changedRaw = get("changed");
const labels = get("labels").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const title = get("title") || "";
const bodyRaw = get("body")  || "";

// Audit finding B.2: `Tracks: #N` regex matched inside fenced code blocks
// (```...```) and blockquotes (`^>`). Strip those before testing so a
// quoted/commented-out tracking ref can't satisfy the gate.
function stripCodeAndQuotes(s) {
  // strip ```...``` fenced blocks
  let out = s.replace(/```[\s\S]*?```/g, "");
  // strip ~~~...~~~ fenced blocks
  out = out.replace(/~~~[\s\S]*?~~~/g, "");
  // strip blockquote lines (^>) line-by-line
  out = out.split("\n").filter((l) => !/^\s{0,3}>/.test(l)).join("\n");
  return out;
}
const body = stripCodeAndQuotes(bodyRaw);

// "Tracks: #1234" or "Tracks #1234" or "Tracking: #1234" — case-insensitive,
// allows owner/repo qualified forms too ("Tracks: foo/bar#1234").
const TRACKS_REF = /\btrack(?:s|ing)?\s*[: ]\s*([A-Za-z0-9_.\/-]+)?#\d+/i;

const TRACKING_LABELS = ["tracking-only", "wr-docs", "wr-tracking", "meta-tracking", "docs-only"];
// Audit finding B.1: the bare `/^track\b/i` matched legitimate titles like
// "Track down regression" / "Tracking memory leak". Keep only the bracketed
// forms which are unambiguous tracking-PR markers.
const TRACKING_PREFIXES = [/^\[wr-docs\]/i, /^\[wr-tracking\]/i, /^\[track\]/i];

// Title signals this PR claims to FIX something (not just track it).
const FIX_SIGNAL = /\b(fix|resolve|repair|correct|patch|remove|add (missing|the)|implement)\b/i;

const changed = changedRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

// Audit finding B.3: `wr/` was a blanket "not a real fix", which blocked
// legitimate fixes to the gate scripts / templates / readme themselves. Add
// an explicit allowlist for those.
const WR_REAL_FIX_ALLOWLIST = [
  /^wr\/scripts\//,
  /^wr\/WR_TEMPLATE_.*\.md$/,
  /^wr\/README\.md$/,
];

function isRealFix(p) {
  if (p.startsWith("wr/")) {
    return WR_REAL_FIX_ALLOWLIST.some((re) => re.test(p));
  }
  if (/^docs\/.*\.md$/i.test(p)) return true;            // a docs FIX (e.g. broken link) IS the fix
  return true;                                            // any code/config/workflow file counts
}

const realFixFiles = changed.filter(isRealFix);
const wrOnly = changed.length > 0 && realFixFiles.length === 0;
const claimsFix = FIX_SIGNAL.test(title);
const trackingLabeled =
  labels.some((l) => TRACKING_LABELS.includes(l)) ||
  TRACKING_PREFIXES.some((re) => re.test(title.trim()));
// Per Octopus review: the label alone became an escape hatch. To count as
// tracking-only, the PR body must also carry an explicit `Tracks: #NNNN`
// reference so a future reviewer can find the follow-up that applies the fix.
const hasTracksRef = TRACKS_REF.test(body);
const isTrackingOnly = trackingLabeled && hasTracksRef;

const issues = [];

if (claimsFix && wrOnly && !isTrackingOnly) {
  if (trackingLabeled && !hasTracksRef) {
    issues.push(
      `PR is labeled tracking-only but the body has no "Tracks: #NNNN" reference. ` +
      `A tracking-only fix WR must point to the follow-up issue/PR that will apply ` +
      `the actual fix — add a "Tracks: #1234" line to the PR body, or remove the ` +
      `tracking label and include the real fix.`
    );
  } else {
    issues.push(
      `PR title claims a fix ("${title.trim()}") but the diff only touches wr/ tracking files ` +
      `(${changed.join(", ")}). Either include the actual fix (a non-wr/ file), OR label the PR ` +
      `one of [${TRACKING_LABELS.join(", ")}] / prefix the title "[WR-DOCS]" AND add ` +
      `"Tracks: #NNNN" to the PR body pointing at the follow-up that applies the fix.`
    );
  }
}

// Secondary: a fix WR that is tracking-only should SAY so, to avoid a future reviewer thinking it's resolved.
if (claimsFix && wrOnly && isTrackingOnly) {
  console.log(`note: tracking-only fix WR accepted (labeled + Tracks: ref present). Ensure the referenced follow-up actually applies the fix.`);
}

if (issues.length) {
  console.log("✗ fix-WR gate failed:");
  issues.forEach((i) => console.log("   - " + i));
  process.exit(1);
}
console.log("✓ fix-WR gate passed");
process.exit(0);
