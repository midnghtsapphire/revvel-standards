#!/usr/bin/env node
// wr-lint.mjs — gate for WR/PR markdown. Catches the recurring review failures automatically.
// Usage: node wr-lint.mjs <file-or-glob...>   |   exit 0 clean, 1 issues found.
// Wire into CI / review-agent pass so these never reach a human reviewer.

import fs from "node:fs";

const SCAFFOLD_PATTERNS = [
  { re: /^#\s*Otherwise,\s*use\s+WR_TEMPLATE_BASIC\.md/im, msg: "template scaffolding comment ('Otherwise, use WR_TEMPLATE_BASIC.md') left in rendered output" },
  { re: /^#\s*[─—-]{10,}\s*$/m, msg: "separator-rule scaffolding line left in rendered output" }
];

// Scaffolding '# WR: <owner>/<repo>' header (repo-path form) is noise ONLY when it's not the line-1 title.
// A legit title like "# WR: Fix duplicate return" is fine; "# WR: midnghtsapphire/revvel-standards" is scaffolding.
function findRepoHeaderScaffold(lines) {
  const out = [];
  lines.forEach((l, i) => {
    if (/^#\s*WR:\s*\S+\/\S+\s*$/i.test(l)) out.push(i + 1); // owner/repo form
  });
  return out;
}

// Product-only sections that must NOT appear in a BASIC/bug-fix WR.
const PRODUCT_SECTIONS = [
  "Executive Summary", "Repository Structure", "Key Technologies",
  "Product/Output Selections", "Deep Web Research", "Prime Directive"
];

// Title/type signals that mean BASIC template (no market research).
const BASIC_SIGNALS = /\b(bug|fix|style|refactor|typo|lint|unreachable|duplicate|docs?-only|chore)\b/i;

// Unsubstituted generator tokens that must never ship.
const RAW_TOKENS = /\{(STARS|OPEN_ISSUES|IS_PRIVATE|IS_ARCHIVED|DESCRIPTION|REPO|LANGUAGE)\}/g;

// Bracket placeholders the full template leaves behind.
const BRACKET_PLACEHOLDER = /\[(Yes\/No|engine|notes|Pattern \d|Option \d|primary keyword \d|\$CPC|\$amount[^\]]*|volume|Vercel URL[^\]]*|Complaint \d|Action \d|2-3 sentence summary[^\]]*|Tree structure[^\]]*|Research findings[^\]]*|Fix|Pricing)\]/gi;

function lintFile(path) {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.split("\n");
  const issues = [];

  // Track fenced code blocks so every heuristic rule below can skip them.
  // Without this the linter false-positives on legitimate WR content that
  // includes example code (e.g. `# yaml comment` lines, `{TOKEN}` examples,
  // `[options]` arrays, pipe tables shown as examples) — per Copilot review
  // on #14227 (five separate findings all reduce to the same bug).
  const inFence = new Array(lines.length).fill(false);
  let fenced = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l.trim())) fenced = !fenced;
    inFence[i] = fenced;
  });

  // 1. Exactly one H1, and it should be line 1. Skip headings inside fences.
  const h1Idx = lines
    .map((l, i) => (!inFence[i] && /^#\s+\S/.test(l) ? i : -1))
    .filter((i) => i >= 0);
  if (h1Idx.length === 0) issues.push("no H1 header found");
  if (h1Idx.length > 1) issues.push(`multiple H1 headers (lines ${h1Idx.map((i) => i + 1).join(", ")}) — keep one at line 1`);
  if (h1Idx.length && h1Idx[0] !== 0) issues.push(`H1 is at line ${h1Idx[0] + 1}, expected line 1 (scaffolding above it?)`);

  // 2. Scaffolding patterns.
  for (const { re, msg } of SCAFFOLD_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const ln = text.slice(0, m.index).split("\n").length;
      issues.push(`line ${ln}: ${msg}`);
    }
  }
  // 2b. Repo-path '# WR: owner/repo' headers (scaffolding) — flag every occurrence.
  for (const ln of findRepoHeaderScaffold(lines)) {
    issues.push(`line ${ln}: scaffolding '# WR: <owner>/<repo>' header — strip it; the title H1 is the real header`);
  }

  // 3. Raw bracketed placeholders (heuristic: short ALL/Title-case tokens in brackets, not links).
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip code examples
    // ignore markdown links [text](url) and checkboxes [ ]/[x]
    const stripped = l.replace(/\[[ xX]\]/g, "").replace(/\[[^\]]+\]\([^)]+\)/g, "");
    const m = stripped.match(/\[[A-Za-z][^\]]{2,60}\]/);
    if (m) issues.push(`line ${i + 1}: raw placeholder ${m[0]} — fill it or mark "N/A — <reason>"`);
  });

  // 4. Template/type mismatch: BASIC-signal title but product sections present.
  const isBasic = BASIC_SIGNALS.test(path) || BASIC_SIGNALS.test(lines[0] || "");
  if (isBasic) {
    for (const sec of PRODUCT_SECTIONS) {
      const re = new RegExp(`^#{1,4}\\s*.*${sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
      if (re.test(text)) {
        issues.push(`bug/style WR contains product section "${sec}" — wrong template; use WR_TEMPLATE_BASIC.md`);
      }
    }
  }

  // 5. Unsubstituted generator tokens ({STARS} etc.)
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip examples
    const m = l.match(RAW_TOKENS);
    if (m) issues.push(`line ${i + 1}: unsubstituted generator token(s) ${[...new Set(m)].join(", ")} — substitute real value or remove the row`);
  });

  // 6. Full-template bracket placeholders left raw.
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip examples
    const m = l.match(BRACKET_PLACEHOLDER);
    if (m) issues.push(`line ${i + 1}: raw template placeholder ${m[0]} — fill or mark "N/A — <reason>"`);
  });

  // 7. Falsely pre-checked research checklist while body has raw placeholders.
  const checkedItems = (text.match(/^- \[x\]/gim) || []).length;
  const hasRawResearch = RAW_TOKENS.test(text) || /\[(Option \d|primary keyword|\$CPC|Complaint \d|Pattern \d)\]/i.test(text);
  RAW_TOKENS.lastIndex = 0;
  if (checkedItems >= 5 && hasRawResearch) {
    issues.push(`research checklist pre-marked complete (${checkedItems} [x]) but body still contains raw placeholders — false-completion signal; uncheck N/A items with a reason or fill the sections`);
  }

  // 8. Issue body pasted into a metadata table cell (## heading inside a | ... | row).
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip example tables in fenced docs
    if (/^\|.*\|/.test(l) && /(^|\s)##\s|## Summary|## Details|## Suggested Action/.test(l)) {
      issues.push(`line ${i + 1}: issue body (## heading) embedded inside a table cell — breaks table rendering; move to a dedicated '## Issue Context' section`);
    }
  });

  // 9. Title rendering artifact: stripped backtick identifier leaves a double space.
  if (/^#\s*WR:.*\S\s{2,}\S/.test(lines[0] || "")) {
    issues.push(`line 1: title has a double space — a backtick-wrapped identifier was likely stripped during generation; restore it`);
  }

  return issues;
}

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node wr-lint.mjs <files...>"); process.exit(2); }
let failed = 0;
for (const f of files) {
  const issues = lintFile(f);
  if (issues.length) {
    failed++;
    console.log(`\n✗ ${f}`);
    issues.forEach((i) => console.log(`   - ${i}`));
  } else {
    console.log(`✓ ${f}`);
  }
}
console.log(failed ? `\n${failed} file(s) with issues.` : "\nAll clean.");
process.exit(failed ? 1 : 0);
