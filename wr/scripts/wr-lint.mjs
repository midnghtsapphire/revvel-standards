#!/usr/bin/env node
// wr-lint.mjs — gate for WR/PR markdown. Catches the recurring review failures automatically.
// Usage: node wr-lint.mjs <file-or-glob...>   |   exit 0 clean, 1 issues found.
// Wire into CI / review-agent pass so these never reach a human reviewer.
//
// v3 (strict-reviewer audit): the bracket-placeholder heuristic and the
// fixed RAW_TOKENS enum both produced false positives / false negatives.
// They have been replaced with:
//   (a) a runtime allowlist of bracket placeholders extracted from the
//       WR_TEMPLATE_*.md files at startup. Only those exact strings are
//       forbidden when found in a generated WR — legitimate prose like
//       "[Closes #123]" or "[TODO: refactor]" no longer false-positives.
//   (b) a generic uppercase-snake-case curly-token detector
//       (`/\{[A-Z_][A-Z0-9_]*\}/`) so any new token added to the
//       generator is caught without code changes here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Templates live at wr/WR_TEMPLATE_*.md; this script lives at wr/scripts/.
const WR_DIR = path.resolve(__dirname, "..");

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

// FULL-template headings that signal the WR was generated FROM the full
// template. If none of these are present, the doc looks like a basic WR
// (a strong fallback signal when the title verb doesn't classify cleanly).
const FULL_TEMPLATE_HEADINGS = [
  "Executive Summary", "Deep Web Research", "BOM",
  "Step 1A", "Step 2", "Step 3", "Repository Metadata", "Research Checklist"
];

// Title/type signals that mean BASIC template (no market research).
// Audit finding A.4: extend with explicit verbs (remove/delete/fix/patch/
// chore/docs/refactor/lint/format/typo/style) so titles like
// "Remove unused MCP route" classify as basic and trigger the wrong-template
// product-sections check.
const BASIC_SIGNALS = /\b(bug|fix|style|refactor|typo|lint|unreachable|duplicate|docs?-only|chore|remove|delete|patch|docs?|format)\b/i;
const BASIC_TITLE_VERBS = /^\s*(remove|delete|fix|patch|chore|docs?|refactor|lint|format|typo|style)\b/i;

// Generic unsubstituted-generator-token detector. Matches any UPPER_SNAKE
// curly token (`{STARS}`, `{NEW_TOKEN}`, `{REPO_NAME_2}`), so adding a
// fresh placeholder to the generator no longer silently passes lint.
const RAW_TOKEN = /\{[A-Z_][A-Z0-9_]*\}/;

// Load bracket placeholders from the template files at startup.
// Anything else found in `[…]` in a rendered WR is treated as legitimate prose.
function loadTemplatePlaceholders() {
  const placeholders = new Set();
  const files = ["WR_TEMPLATE_BASIC.md", "WR_TEMPLATE_FULL.md"];
  for (const f of files) {
    const p = path.join(WR_DIR, f);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");
    // Capture every `[…]` that looks like a placeholder (no nested brackets,
    // not a markdown link `[txt](url)`, not a checkbox `[ ]`/`[x]`).
    const re = /\[([^\]\n]+)\]/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      const inner = m[1];
      // skip checkboxes
      if (/^[ xX]$/.test(inner)) continue;
      // skip markdown link forms: peek next char
      const next = txt[m.index + m[0].length];
      if (next === "(") continue;
      placeholders.add(`[${inner}]`);
    }
  }
  return placeholders;
}

const TEMPLATE_PLACEHOLDERS = loadTemplatePlaceholders();

function lintFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
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

  // 3. Raw bracketed placeholders.
  // Audit finding A.1: the old heuristic (any `[A-Za-z][^\]]{2,60}]`) false-
  // positived on legitimate prose like `[Closes #123]`, `[TODO: refactor]`,
  // `[RFC 2119]`. Replaced with a strict allowlist: only the exact bracket
  // strings extracted from the template files are forbidden. Everything
  // else in brackets is treated as legitimate prose.
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip code examples
    // ignore markdown links [text](url) and checkboxes [ ]/[x]
    const stripped = l.replace(/\[[ xX]\]/g, "").replace(/\[[^\]]+\]\([^)]+\)/g, "");
    for (const ph of TEMPLATE_PLACEHOLDERS) {
      if (stripped.includes(ph)) {
        issues.push(`line ${i + 1}: raw template placeholder ${ph} — fill it or mark "N/A — <reason>"`);
        break; // one issue per line is enough
      }
    }
  });

  // 4. Template/type mismatch: BASIC-signal title but product sections present.
  // Audit finding A.4: extend classification with verb-prefix on title and
  // "looks like basic because it has none of the FULL headings" fallback.
  const titleLine = lines[0] || "";
  const verbBasic = BASIC_TITLE_VERBS.test(titleLine.replace(/^#\s*WR:\s*/i, ""));
  const looksFull = FULL_TEMPLATE_HEADINGS.some((h) => {
    const re = new RegExp(`^#{1,4}\\s+.*${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
    return re.test(text);
  });
  const isBasic =
    BASIC_SIGNALS.test(filePath) ||
    BASIC_SIGNALS.test(titleLine) ||
    verbBasic ||
    !looksFull;
  if (isBasic) {
    for (const sec of PRODUCT_SECTIONS) {
      const re = new RegExp(`^#{1,4}\\s*.*${sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
      if (re.test(text)) {
        issues.push(`bug/style WR contains product section "${sec}" — wrong template; use WR_TEMPLATE_BASIC.md`);
      }
    }
  }

  // 5. Unsubstituted generator tokens — generic UPPER_SNAKE curly-token detector.
  // Audit finding A.2: fixed enum (STARS|OPEN_ISSUES|...) silently passed any
  // new {TOKEN} the generator added. Use a generic regex instead.
  const RAW_TOKEN_G = new RegExp(RAW_TOKEN.source, "g");
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip examples
    const m = l.match(RAW_TOKEN_G);
    if (m) issues.push(`line ${i + 1}: unsubstituted generator token(s) ${[...new Set(m)].join(", ")} — substitute real value or remove the row`);
  });

  // 6. Removed: covered by the allowlist in rule 3 (BRACKET_PLACEHOLDER no
  //    longer exists — TEMPLATE_PLACEHOLDERS is the single source of truth).

  // 7. Falsely pre-checked checklist while body has any forbidden patterns.
  // Per Octopus review of #14118/#14138/#14224/#14225: ANY [x] check while
  // ANY forbidden pattern is in the doc is false-completion. The old
  // threshold (≥5 [x] + narrow placeholder list) let the worst offenders
  // through — a single [x] flipped on while {STARS} is still in the table
  // is the same false-completion signal.
  const hasAnyForbidden = lines.some((l, i) => {
    if (inFence[i]) return false;
    if (RAW_TOKEN.test(l)) return true;
    for (const ph of TEMPLATE_PLACEHOLDERS) if (l.includes(ph)) return true;
    return false;
  });
  const checkedItems = lines.reduce((n, l, i) => {
    if (inFence[i]) return n;
    return n + (/^- \[x\]/i.test(l) ? 1 : 0);
  }, 0);
  if (checkedItems >= 1 && hasAnyForbidden) {
    issues.push(`checklist has ${checkedItems} [x] item(s) but the doc still contains forbidden placeholders/tokens — false-completion signal; either fill the placeholders, or uncheck the items (and mark "N/A — <reason>" where genuinely not applicable)`);
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
