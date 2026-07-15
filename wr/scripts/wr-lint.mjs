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

// Persona slash-command WRs (e.g. research personas) are substantive
// research/permanent-fix requests that must get the FULL long-form template even
// though their title often contains "fix". Detect the leading slash command so
// rule 4 does not misclassify them as BASIC and reject the FULL product sections.
// Mirrors the classifiers in wr/scripts/generate-wr.sh and wr-pr-creation.yml.
//
// EXCEPTION: the DRAGNET fix persona (/dragnet and its fix aliases) files
// permanent bug fixes, which use the BASIC short-form template (issue #15122).
// These are NOT treated as FULL-forcing slash commands, so rule 4 still applies.
const DRAGNET_FIX_COMMAND = /^\/(dragnet(-fix)?|errorfix|perm-?fix)(?![a-z0-9-])/i;
function isSlashCommandTitle(firstLine) {
  const title = String(firstLine || "")
    .replace(/^#\s*/, "")
    .replace(/^WR:\s*/i, "")
    .replace(/^\[WR\]\s*/i, "")
    .trim();
  if (DRAGNET_FIX_COMMAND.test(title)) return false;
  return /^\/[a-z][\w-]*/i.test(title);
}

// Shell-injection anti-pattern: untrusted github.event.*.{body,title} (or
// comment.body) interpolated with ${{ }} directly into a shell command. Per
// CLAUDE.md gotcha #4, these must be passed through `env:` and referenced as
// "$VAR" inside the script. WR docs ship ready-to-commit workflow snippets, so
// this rule intentionally scans inside fenced code blocks too — that is exactly
// where the dangerous snippets live (Devin finding on #15094).
const UNTRUSTED_EVENT_INTERP = /\$\{\{\s*github\.event\.[a-z0-9_.]*\b(?:body|title)\b[^}]*\}\}/i;
// A line is "shell usage" when the interpolation lands in a command rather than
// a safe `env:`/`with:` YAML mapping or an `if:` expression. `env:`/`with:` use
// `key: ${{ ... }}` (colon), which the shell detector below deliberately misses.
const SHELL_USAGE = /\becho\b|\[\[|\]\]|(^|\s)gh\s|^[^:]*\b[A-Za-z_][A-Za-z0-9_]*=/;

// Unsubstituted generator tokens that must never ship.
const RAW_TOKENS = /\{(STARS|OPEN_ISSUES|IS_PRIVATE|IS_ARCHIVED|DESCRIPTION|REPO|LANGUAGE)\}/;

// GitHub issue-form artifact left in the rendered body when an optional field
// (Summary, Required Bundle, Definition of Done, etc.) is submitted blank. It
// is not a template token, so the other placeholder rules never catch it — but
// a WR still showing "_No response_" has unfilled scope sections, and any [x]
// acknowledgement alongside it is the same false-completion signal as a raw
// {TOKEN}/[placeholder]. See issue #15080 (long-form work-request template).
const NO_RESPONSE = /(^|[^A-Za-z0-9])_No response_(?=[^A-Za-z0-9]|$)/i;

// Bracket placeholders the full template leaves behind.
const BRACKET_PLACEHOLDER = /\[(Yes\/No|engine|notes|Pattern \d|Option \d|primary keyword \d|\$CPC|\$amount[^\]]*|volume|Vercel URL[^\]]*|Complaint \d|Action \d|2-3 sentence summary[^\]]*|Tree structure[^\]]*|Research findings[^\]]*|Fix|Pricing|Date and summary)\]/gi;

// Deferral placeholders: phrases that indicate an agent stopped researching instead of filling content.
// Forbidden in all WR docs — agents must loop until sections are filled or open a [WR-BLOCKER] issue.
// Policy reference: wr/lint-rules/no-pending-placeholders.md
const DEFERRAL_PLACEHOLDERS = [
  { re: /N\/A\s*[—\-]\s*pending\s+Jules\s+refinement/i, label: "N/A — pending Jules refinement" },
  { re: /N\/A\s*[—\-]\s*pending\s+human\s+review/i,     label: "N/A — pending human review" },
  { re: /\bpending\s+refinement\b/i,                     label: "pending refinement" },
  { re: /\bTBD\b/,                                       label: "TBD" },
  { re: /\bTODO\b/,                                      label: "TODO" },
  // _No response_ is also caught by NO_RESPONSE / rule 7 (false-completion with checked items);
  // including it here as well gives a standalone rule-12 error even when no checklist is checked.
  // Dual detection is intentional: rule 7 catches the combination, rule 12 catches it alone.
  { re: NO_RESPONSE,                                     label: "_No response_" },
];

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
  const isBasic = !isSlashCommandTitle(lines[0]) &&
    (BASIC_SIGNALS.test(path) || BASIC_SIGNALS.test(lines[0] || ""));
  if (isBasic) {
    for (const sec of PRODUCT_SECTIONS) {
      const re = new RegExp(`^#{1,4}\\s*.*${sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
      if (re.test(text)) {
        issues.push(`bug/style WR contains product section "${sec}" — wrong template; use WR_TEMPLATE_BASIC.md`);
      }
    }
  }

  // 5. Unsubstituted generator tokens ({STARS} etc.)
  const RAW_TOKENS_G = new RegExp(RAW_TOKENS.source, "g");
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip examples
    const m = l.match(RAW_TOKENS_G);
    if (m) issues.push(`line ${i + 1}: unsubstituted generator token(s) ${[...new Set(m)].join(", ")} — substitute real value or remove the row`);
  });

  // 6. Full-template bracket placeholders left raw.
  lines.forEach((l, i) => {
    if (inFence[i]) return; // skip examples
    const m = l.match(BRACKET_PLACEHOLDER);
    if (m) issues.push(`line ${i + 1}: raw template placeholder ${m[0]} — fill or mark "N/A — <reason>"`);
  });

  // 7. Falsely pre-checked checklist while body has any raw placeholders.
  // Per Octopus review of #14118/#14138/#14224/#14225: ANY [x] check while
  // ANY forbidden pattern is in the doc is false-completion. The old
  // threshold (≥5 [x] + narrow placeholder list) lets the worst offenders
  // through — a single [x] flipped on while {STARS} is still in the table
  // is the same false-completion signal.
  // Build the forbidden-pattern detector once from the same rules used above
  // (excluding code fences via the same inFence mask).
  const FORBIDDEN_FOR_CHECKLIST = [
    RAW_TOKENS,
    // Non-global clone of BRACKET_PLACEHOLDER: the `g` flag makes `.test()`
    // stateful (lastIndex), which can false-negative on repeat calls and
    // let forbidden placeholders slip past the rule. Per Copilot review.
    new RegExp(BRACKET_PLACEHOLDER.source, "i"),
    /\[Yes\/No\]/i,
    /\[Option \d+\]/i,
    /\[Research findings\.\.\.\]/i,
    /\[\$CPC\]/i,
    /\[Date and summary\]/i,
    /\[Fix\]/i,
    // Blank issue-form fields rendered as "_No response_" (issue #15080).
    NO_RESPONSE,
    // Deferral placeholders (rule 12 / no-pending-placeholders.md).
    ...DEFERRAL_PLACEHOLDERS.map(({ re }) => re),
  ];
  const hasAnyForbidden = lines.some((l, i) => {
    if (inFence[i]) return false;
    return FORBIDDEN_FOR_CHECKLIST.some((re) => re.test(l));
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

  // 10. Shell-injection anti-pattern in embedded workflow snippets: untrusted
  // github.event.*.{body,title} interpolated straight into a shell command.
  // Scans inside code fences on purpose — the ready-to-commit workflow YAML in
  // the "Automatic Fix and Commit Queue" section is where this lands.
  lines.forEach((l, i) => {
    if (!UNTRUSTED_EVENT_INTERP.test(l)) return;
    if (!SHELL_USAGE.test(l)) return; // safe env:/with:/if: mappings
    issues.push(`line ${i + 1}: untrusted \${{ github.event.*.body/title }} interpolated into a shell command — pass it via env: (e.g. \`ISSUE_BODY: \${{ github.event.issue.body }}\`) and reference "$ISSUE_BODY" instead (CLAUDE.md gotcha #4)`);
  });

  // 11. REVVEL-DISABLED archival blocks: if the WR embeds any REVVEL-DISABLED
  // block it must have all required metadata fields. This validates that WR
  // docs shipping workflow snippets with disabled code don't omit the audit
  // trail required by RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md).
  // Uses word-boundary-aware regex to avoid false negatives from partial matches
  // (e.g. "REASON: MODEL: needs update" must not satisfy the MODEL: field check).
  // Match ONLY the canonical machine-greppable header — the token followed by
  // its pipe-separated field list (COMMENT-DONT-DELETE.md §3: "REVVEL-DISABLED
  // | AGENT: ... | MODEL: ..."). A bare prose mention of the token (e.g. the
  // WR_TEMPLATE_FULL.md "Superseded Content" guidance says "commented out with
  // a REVVEL-DISABLED header") must NOT open a phantom block — that false
  // positive made wr-lint refuse every FULL-template WR (issue #15215
  // regression tests caught it).
  // Real markers always use the pipe-delimited metadata format:
  //   // REVVEL-DISABLED | AGENT: ... | MODEL: ... | WR: ... | DATE: ... | STATUS: ...
  // The (?!-END) lookahead keeps a "REVVEL-DISABLED-END | ..." line from
  // re-opening a phantom block.
  const REVVEL_DISABLED_OPEN = /REVVEL-DISABLED(?!-END)\s*\|/;
  const REVVEL_DISABLED_CLOSE = /REVVEL-DISABLED-END\b/;
  // Each field regex anchors on a pipe (|) or line start/comment prefix so
  // "AGENT:" in a REASON sentence does not satisfy the AGENT: field requirement.
  const REQUIRED_REVVEL_FIELDS = [
    { name: "AGENT:",  re: /(?:^|\|)\s*AGENT\s*:/ },
    { name: "MODEL:",  re: /(?:^|\|)\s*MODEL\s*:/ },
    { name: "WR:",     re: /(?:^|\|)\s*WR\s*:/ },
    { name: "DATE:",   re: /(?:^|\|)\s*DATE\s*:/ },
    { name: "STATUS:", re: /(?:^|\|)\s*STATUS\s*:/ },
  ];
  let inDisabledBlock = false;
  let disabledBlockStart = -1;
  let disabledBlockHeader = "";
  lines.forEach((l, i) => {
    if (!inDisabledBlock && REVVEL_DISABLED_OPEN.test(l)) {
      inDisabledBlock = true;
      disabledBlockStart = i + 1;
      disabledBlockHeader = l;
    } else if (inDisabledBlock && REVVEL_DISABLED_CLOSE.test(l)) {
      // Validate the opening header has all required fields
      const missing = REQUIRED_REVVEL_FIELDS.filter(({ re }) => !re.test(disabledBlockHeader));
      if (missing.length > 0) {
        issues.push(
          `line ${disabledBlockStart}: REVVEL-DISABLED block missing required field(s): ${missing.map((f) => f.name).join(", ")} — see standards/COMMENT-DONT-DELETE.md §2.1`
        );
      }
      inDisabledBlock = false;
      disabledBlockHeader = "";
    }
  });
  // Unclosed block
  if (inDisabledBlock) {
    issues.push(
      `line ${disabledBlockStart}: REVVEL-DISABLED block opened but never closed with REVVEL-DISABLED-END`
    );
  }

  // 12. Deferral placeholders: phrases agents must never leave in a final WR doc.
  // "N/A — pending Jules refinement", "pending human review", "pending refinement",
  // "TBD", "TODO", "_No response_" all signal that an agent stopped instead of
  // researching. Fill the section or open a [WR-BLOCKER] issue with the specific gap.
  // Skips fenced code blocks (examples/snippets are OK) and inline code spans
  // (e.g. `TODO`/`FIXME` used as code-term examples, not as actual deferral markers).
  // Policy: wr/lint-rules/no-pending-placeholders.md
  lines.forEach((l, i) => {
    if (inFence[i]) return;
    // Strip inline code span content before testing so that backtick-wrapped
    // terms like `TODO` or `TBD` used as code references are not flagged.
    // Handles single-backtick spans; escaped backticks within spans are not
    // supported (not needed for realistic WR content).
    const stripped = l.replace(/`[^`\n]*`/g, "``");
    for (const { re, label } of DEFERRAL_PLACEHOLDERS) {
      if (re.test(stripped)) {
        issues.push(`line ${i + 1}: deferral placeholder "${label}" — fill the section or open a [WR-BLOCKER] issue; see wr/lint-rules/no-pending-placeholders.md`);
        break; // one issue per line keeps output readable; first matched pattern is reported
      }
    }
  });

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
