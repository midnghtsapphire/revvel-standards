/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checklist items
 * between two markdown bodies (e.g., PR or issue body before/after edit).
 *
 * Convention:
 *   - [ ] Follow-up: <description>
 *
 * When such a line transitions from unchecked to checked, it should be routed
 * to a new tracked WR issue. This module provides the pure detection logic;
 * network/GitHub interactions live in the workflow that consumes it.
 */

'use strict';

// Matches a markdown task-list line. Tolerant of:
//   - leading whitespace
//   - optional list marker `-`, `*`, or `+`
//   - one or more spaces between marker and `[ ]`
//   - `[ ]`, `[x]`, `[X]` (case-insensitive)
//   - optional space after the bracket before the content
const TASK_LINE_RE = /^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/;

// Matches the "Follow-up:" prefix (case-insensitive, tolerant of
// whitespace around the hyphen and colon).
const FOLLOW_UP_PREFIX_RE = /^\s*follow\s*-?\s*up\s*:\s*(.*)$/i;

/**
 * Normalize text for matching lines across an edit. We match by content, not
 * by line index, so reorderings or unrelated edits elsewhere don't break
 * detection.
 *
 * @param {string} s
 * @returns {string}
 */
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a body into a list of task-list entries.
 *
 * @param {string} body
 * @returns {Array<{checked: boolean, text: string, followUpDescription: string|null, key: string}>}
 */
function parseTaskLines(body) {
  if (body === null || body === undefined) return [];
  const src = String(body);
  const out = [];
  const lines = src.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(TASK_LINE_RE);
    if (!m) continue;
    const marker = m[1];
    const text = m[2] || '';
    const checked = marker === 'x' || marker === 'X';
    const fu = text.match(FOLLOW_UP_PREFIX_RE);
    const followUpDescription = fu ? fu[1].trim() : null;
    // Key by the normalized "content after the checkbox" so we can match
    // the same logical item across bodies even if reordered.
    const key = normalizeText(text);
    out.push({ checked, text: text.trim(), followUpDescription, key });
  }
  return out;
}

/**
 * Find follow-up checklist items that transitioned from unchecked -> checked
 * between oldBody and newBody.
 *
 * Rules:
 *   - Item must exist in both bodies (matched by normalized text). This
 *     avoids over-firing on items added-and-checked in the same edit.
 *   - Item must be unchecked in oldBody and checked in newBody.
 *   - Item's text must match the Follow-up: prefix (case-insensitive,
 *     minor whitespace/hyphen tolerance).
 *   - Non-follow-up checkboxes are ignored.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, text: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseTaskLines(oldBody);
  const newItems = parseTaskLines(newBody);

  if (oldItems.length === 0 || newItems.length === 0) return [];

  // Build a map of old items keyed by normalized text. If multiple lines
  // share the same key, prefer the first unchecked occurrence.
  const oldByKey = new Map();
  for (const it of oldItems) {
    if (!oldByKey.has(it.key)) {
      oldByKey.set(it.key, it);
    } else {
      const prev = oldByKey.get(it.key);
      if (prev.checked && !it.checked) oldByKey.set(it.key, it);
    }
  }

  const results = [];
  const seenKeys = new Set();
  for (const it of newItems) {
    if (!it.checked) continue;
    if (!it.followUpDescription) continue;
    if (seenKeys.has(it.key)) continue;
    const prev = oldByKey.get(it.key);
    if (!prev) continue; // not present before -> added-and-checked, skip
    if (prev.checked) continue; // already checked, no transition
    seenKeys.add(it.key);
    results.push({
      description: it.followUpDescription,
      text: it.text,
    });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  // exported for tests
  _parseTaskLines: parseTaskLines,
  _normalizeText: normalizeText,
};
