#!/usr/bin/env node
// sanitize-wr-markdown.mjs — normalizes generated WR markdown so it passes the
// CircleCI changed-Markdown gate (markdownlint-cli2) on the first try.
//
// WHY this exists: WR docs are stitched together from the WR template + the
// raw issue body + imported research packets (wr-pr-creation.yml "Generate WR
// document" step). Pasted content routinely carries its own `# H1` heading,
// double blank lines, and asterisk emphasis in a document whose first emphasis
// is underscore-style — tripping MD025, MD012, and MD049 on nearly every WR PR
// (see issue #15604 / the daily "Linting changed Markdown ... exit status 1"
// failures). Fixing each file by hand never sticks; this sanitizer fixes the
// output at the source, right before it is linted/committed.
//
// What it fixes (only OUTSIDE fenced code blocks):
//   MD025 — demotes any H1 after the first one to an H2.
//   MD012 — collapses runs of 2+ blank lines to a single blank line.
//   MD049 — rewrites single-asterisk emphasis (*text*) to underscore (_text_),
//           matching the underscore style the WR templates establish
//           (e.g. `_No response_`). Strong (**bold**) is left alone.
//   MD047 — ensures the file ends with exactly one trailing newline.
//
// Fallback / what to check if it fails: the sanitizer is conservative — it
// never touches fenced code blocks or inline code spans. If a WR still fails
// the markdown gate after sanitizing, the finding is in hand-written content;
// see docs/WR_MARKDOWN_LINT_PLAYBOOK.md for the per-rule fix playbook.
//
// Usage: node sanitize-wr-markdown.mjs <file.md> [more.md ...]   (rewrites in place)

import fs from "node:fs";
import { pathToFileURL } from "node:url";

const FENCE_RE = /^(\s*)(`{3,}|~{3,})/;

/**
 * Rewrite single-asterisk emphasis to underscore emphasis in a text segment
 * that contains no inline code. `**strong**` is untouched (MD050 territory).
 */
function normalizeEmphasis(segment) {
  return segment.replace(
    /(?<!\*)\*(?!\s|\*)((?:[^*\n])*?[^\s*])\*(?!\*)/g,
    "_$1_",
  );
}

/**
 * Apply normalizeEmphasis outside inline code spans (`...`).
 */
function normalizeEmphasisOutsideCode(line) {
  if (!line.includes("*")) return line;
  // Split on inline code spans; even indexes are prose, odd are code.
  const parts = line.split(/(`+[^`]*`+)/);
  return parts
    .map((part, i) => (i % 2 === 0 ? normalizeEmphasis(part) : part))
    .join("");
}

/**
 * Sanitize a full markdown document. Pure — returns the fixed text.
 */
export function sanitizeWrMarkdown(text) {
  const lines = text.split("\n");
  const out = [];
  let inFence = false;
  let fenceMarker = "";
  let seenH1 = false;
  let blankRun = 0;

  for (const line of lines) {
    const fence = line.match(FENCE_RE);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[2][0];
      } else if (fence[2][0] === fenceMarker) {
        inFence = false;
      }
      blankRun = 0;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // MD012: collapse multiple consecutive blank lines to one.
    if (line.trim() === "") {
      blankRun += 1;
      if (blankRun > 1) continue;
      out.push("");
      continue;
    }
    blankRun = 0;

    let fixed = line;

    // MD025: keep the first H1, demote any later H1 to H2.
    if (/^#\s+/.test(fixed)) {
      if (seenH1) {
        fixed = `#${fixed}`;
      } else {
        seenH1 = true;
      }
    }

    // MD049: underscore emphasis style (matches the WR templates).
    fixed = normalizeEmphasisOutsideCode(fixed);

    out.push(fixed);
  }

  // MD047 / trailing whitespace: exactly one trailing newline, no blank tail.
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
  return `${out.join("\n")}\n`;
}

// ---- CLI ----
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: sanitize-wr-markdown.mjs <file.md> [more.md ...]");
    process.exit(2);
  }
  for (const file of files) {
    const before = fs.readFileSync(file, "utf8");
    const after = sanitizeWrMarkdown(before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      console.log(`sanitized: ${file}`);
    } else {
      console.log(`clean: ${file}`);
    }
  }
}
