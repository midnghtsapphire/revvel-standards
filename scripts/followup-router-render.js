'use strict';

/**
 * followup-router-render.js
 *
 * Helper used by the followup-checkbox-router workflow to:
 *   - classify a follow-up description as BASIC or FULL
 *   - render a WR issue body from the appropriate template
 *
 * Kept in a separate module (no GitHub API calls) so it can be unit-tested
 * and re-used from the workflow via `require(process.env.GITHUB_WORKSPACE + '/scripts/followup-router-render.js')`.
 */

const fs = require('fs');
const path = require('path');

function classify(description) {
  const text = String(description || '').trim();
  if (text.length > 180) return 'FULL';
  // multi-clause heuristic: semicolons, mid-sentence colons, or conjunctions
  if (/;/.test(text)) return 'FULL';
  if (/\b(then|also)\b/i.test(text)) return 'FULL';
  // A colon that isn't at the very end suggests a compound statement
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx < text.length - 1) return 'FULL';
  return 'BASIC';
}

function detectChainedAncestor(sourceBody) {
  if (!sourceBody) return null;
  const m = String(sourceBody).match(/sourced from #(\d+)/i);
  return m ? Number(m[1]) : null;
}

function loadTemplate(repoRoot, kind) {
  const file =
    kind === 'FULL'
      ? path.join(repoRoot, 'wr', 'WR_TEMPLATE_FULL.md')
      : path.join(repoRoot, 'wr', 'WR_TEMPLATE_BASIC.md');
  return fs.readFileSync(file, 'utf8');
}

/**
 * Render a WR issue body for a newly-checked follow-up item.
 *
 * @param {object} opts
 * @param {string} opts.repoRoot         - repo checkout root (GITHUB_WORKSPACE)
 * @param {string} opts.description      - follow-up description text
 * @param {string} opts.sourceUrl        - URL of the PR/issue that spawned this WR
 * @param {number} opts.sourceNumber     - #N of the PR/issue that spawned this WR
 * @param {string} [opts.sourceBody]     - body of the source (for chain detection)
 * @returns {{ kind: 'BASIC'|'FULL', title: string, body: string }}
 */
function renderFollowupWR(opts) {
  const { repoRoot, description, sourceUrl, sourceNumber, sourceBody } = opts;
  const kind = classify(description);
  const template = loadTemplate(repoRoot, kind);

  const chained = detectChainedAncestor(sourceBody);
  const shortDesc =
    description.length > 72 ? description.slice(0, 69).trimEnd() + '...' : description;
  const title = `[WR] Follow-up: ${shortDesc}`;

  const contextBlock = [
    `Auto-generated from a checked \`Follow-up:\` checklist item in #${sourceNumber}.`,
    '',
    `Source: ${sourceUrl}`,
    '',
    `Follow-up text:`,
    '',
    `> ${description}`,
  ].join('\n');

  const learningsBlock = [
    `This WR was spun out of a follow-up commitment left in #${sourceNumber}.`,
    '',
    `Original follow-up text: ${description}`,
    '',
    `Source: ${sourceUrl}`,
    chained
      ? `\nNote: this is a chained follow-up — the source (#${sourceNumber}) itself was sourced from #${chained}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  let body = template;

  // Replace "## Issue Context" section content (up to next "## " heading or EOF)
  body = replaceSection(body, 'Issue Context', contextBlock);
  body = replaceSection(body, 'Learnings — What & Why', learningsBlock);

  return { kind, title, body };
}

function replaceSection(markdown, headingText, newContent) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let i = 0;
  let replaced = false;
  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch && normalizeHeading(headingMatch[1]) === normalizeHeading(headingText)) {
      out.push(line);
      out.push('');
      out.push(newContent);
      out.push('');
      i++;
      // skip old content until next "## " heading or EOF
      while (i < lines.length && !/^##\s+/.test(lines[i])) i++;
      replaced = true;
      continue;
    }
    out.push(line);
    i++;
  }
  if (!replaced) {
    out.push('', `## ${headingText}`, '', newContent, '');
  }
  return out.join('\n');
}

function normalizeHeading(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  classify,
  detectChainedAncestor,
  renderFollowupWR,
  replaceSection,
};
