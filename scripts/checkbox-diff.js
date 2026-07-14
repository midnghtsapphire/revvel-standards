'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checklist items
 * between two versions of a PR/issue body.
 *
 * Exports:
 *   findNewlyCheckedFollowUps(oldBody, newBody) -> Array<{ description: string, raw: string }>
 *
 * A "follow-up" checklist line looks like (case-insensitive, whitespace/hyphen tolerant):
 *   - [ ] Follow-up: some description
 *   - [x] Follow up: some description
 *   - [X] Followup: some description
 *
 * We only report items that were UNCHECKED in oldBody and are CHECKED in newBody.
 * Items that are newly added AND already checked are skipped (no prior unchecked
 * state to transition from).
 */

const TASK_LINE_RE = /^\s*[-*+]\s*\[( |x|X)\]\s*(.*)$/;
// Matches "Follow-up:", "Follow up:", "Followup:", "follow  -  up  :" etc.
const FOLLOWUP_PREFIX_RE = /^\s*follow[\s-]*up\s*:\s*(.*)$/i;

function parseTaskLines(body) {
  if (body == null || typeof body !== 'string') return [];
  const lines = body.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = line.match(TASK_LINE_RE);
    if (!m) continue;
    const checked = m[1] === 'x' || m[1] === 'X';
    const rest = m[2] || '';
    const fu = rest.match(FOLLOWUP_PREFIX_RE);
    if (!fu) continue;
    const description = (fu[1] || '').trim();
    out.push({
      checked,
      description,
      normalized: normalize(description),
      raw: line,
    });
  }
  return out;
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Return array of follow-up items that transitioned from unchecked -> checked
 * between oldBody and newBody. Items are matched by normalized description text
 * (so reordering does not cause false positives).
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, raw: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseTaskLines(oldBody);
  const newItems = parseTaskLines(newBody);
  if (newItems.length === 0) return [];

  // Map normalized -> { checked } from old body. If duplicates, first-wins is fine.
  const oldByKey = new Map();
  for (const it of oldItems) {
    if (!oldByKey.has(it.normalized)) oldByKey.set(it.normalized, it);
  }

  const results = [];
  for (const it of newItems) {
    if (!it.checked) continue;
    if (!it.normalized) continue; // skip empty descriptions
    const prior = oldByKey.get(it.normalized);
    // Only fire if we have prior state AND it was unchecked.
    // Newly-added-already-checked items are intentionally ignored.
    if (!prior) continue;
    if (prior.checked) continue;
    results.push({ description: it.description, raw: it.raw });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  // Exported for testing only:
  _parseTaskLines: parseTaskLines,
  _normalize: normalize,
};
