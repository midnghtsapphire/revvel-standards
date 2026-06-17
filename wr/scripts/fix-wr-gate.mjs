#!/usr/bin/env node
// fix-wr-gate.mjs — closes the "documents the fix but doesn't apply it" hole.
// A fix-class WR PR must EITHER touch a real (non-wr/) file, OR be explicitly labeled tracking-only.
// Catches PRs #14186/#14185/#14177/#14138/#14116/#14066 etc. pattern.
//
// Usage: node fix-wr-gate.mjs --changed <file-list-newline-or-comma> [--labels <csv>] [--title "<pr title>"] [--body "<pr body>"]
//   exit 0 = pass, 1 = gate violation.
//
// "Real fix" = any changed file NOT under wr/ and NOT a pure docs/tracking artifact.
// Tracking-only escape hatch = PR has a label in TRACKING_LABELS or title starts with a TRACKING_PREFIX
// AND the body carries an explicit `Tracks: #NNNN` reference to the follow-up issue/PR that will apply the fix.

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : ""; };

const changedRaw = get("changed");
const labels = get("labels").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const title = get("title") || "";
const body  = get("body")  || "";

// "Tracks: #1234" or "Tracks #1234" or "Tracking: #1234" — case-insensitive,
// allows owner/repo qualified forms too ("Tracks: foo/bar#1234").
const TRACKS_REF = /\btrack(?:s|ing)?\s*[: ]\s*([A-Za-z0-9_.\/-]+)?#\d+/i;

// GitHub issue-closing keywords ("Closes #1234", "Fixes owner/repo#12", …).
// Used to confirm a research WR links its originating issue (the follow-up tracker).
const CLOSES_REF = /\b(?:clos(?:e|es|ed)|fix(?:e|es|ed)?|resolv(?:e|es|ed))\s+(?:[A-Za-z0-9_.\/-]+)?#\d+/i;

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
const trackingLabeled =
  labels.some((l) => TRACKING_LABELS.includes(l)) ||
  TRACKING_PREFIXES.some((re) => re.test(title.trim()));
// Per Octopus review: the label alone became an escape hatch. To count as
// tracking-only, the PR body must also carry an explicit `Tracks: #NNNN`
// reference so a future reviewer can find the follow-up that applies the fix.
const hasTracksRef = TRACKS_REF.test(body);
const isTrackingOnly = trackingLabeled && hasTracksRef;

// The INITIAL WR research PR (auto-created by wr-pr-creation.yml, labeled
// `weekly-research`) is the research deliverable itself: a wr/issues/*.md doc
// that links its originating issue with "Closes #N". It is NOT a fix-class WR
// claiming to apply a fix — the implementation lands later against that issue —
// so the "must include a real (non-wr/) fix" rule does not apply. We still
// require a closing/tracking reference so a reviewer can find the originating
// issue; that keeps this from being a blanket bypass for genuine fix WRs.
const linksIssue = hasTracksRef || CLOSES_REF.test(body);
const isResearchWR = labels.includes("weekly-research") && linksIssue;

const issues = [];

if (claimsFix && wrOnly && !isTrackingOnly && !isResearchWR) {
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

// Research WR accepted: surface it so a reviewer knows the fix is tracked, not applied here.
if (claimsFix && wrOnly && !isTrackingOnly && isResearchWR) {
  console.log(`note: weekly-research WR accepted (research deliverable that links its originating issue). The fix lands in a follow-up against that issue.`);
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
