'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility to detect newly-checked "Follow-up:" checklist items between
 * two versions of a markdown body (e.g. a PR/issue body before and after edit).
 *
 * The exported function `findNewlyCheckedFollowUps(oldBody, newBody)` returns
 * an array of objects: { description: string, rawLine: string }.
 *
 * Design goals:
 *  - Pure (no network, no GitHub API), so it's fully unit-testable.
 *  - Match items by normalized text content, not by line position, so that
 *    reordering / unrelated edits in the same diff don't confuse detection.
 *  - Tolerate case / whitespace / hyphen variants on the "Follow-up:" prefix.
 *  - Do NOT report items that were newly added AND checked in the same edit
 *    (no prior unchecked state to transition from -- avoids over-firing).
 *  - Do NOT report items that were already checked in the old body.
 */

// Match a markdown task-list line:
//   optional leading whitespace, `- `, `[ ]` or `[x]`/`[X]`, then the label.
// Capture groups: 1 = checkbox inner char (space, x, or X), 2 = label text.
const TASK_LINE_RE = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;

// Match a "Follow-up:" (or "Followup:", "Follow up:", "Follow - up:") prefix,
// case-insensitively, with minor whitespace/hyphen tolerance.
const FOLLOWUP_PREFIX_RE = /^follow\s*-?\s*up\s*:\s*(.*)$/i;

/**
 * Parse a markdown body into an array of task-list entries.
 * Only entries whose label matches the "Follow-up:" prefix are returned.
 *
 * @param {string} body
 * @returns {Array<{checked: boolean, description: string, rawLine: string, normalizedKey: string}>}
 */
function parseFollowUpTasks(body) {
  if (body === null || body === undefined || typeof body !== 'string') {
    return [];
  }
  const lines = body.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = TASK_LINE_RE.exec(line);
    if (!m) continue;
    const checkChar = m[1];
    const label = m[2] || '';
    const fm = FOLLOWUP_PREFIX_RE.exec(label.trim());
    if (!fm) continue;
    const description = (fm[1] || '').trim();
    const checked = checkChar === 'x' || checkChar === 'X';
    out.push({
      checked,
      description,
      rawLine: line,
      normalizedKey: normalizeKey(description),
    });
  }
  return out;
}

/**
 * Normalize the follow-up description for matching purposes:
 * lowercase, collapse whitespace, strip trailing punctuation.
 *
 * @param {string} s
 * @returns {string}
 */
function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

/**
 * Return the list of follow-up items that transitioned from unchecked in
 * `oldBody` to checked in `newBody`.
 *
 * Matching is by normalized description text, so reordering is tolerated.
 * Items that appear only in `newBody` (newly-added AND checked in the same
 * edit) are NOT reported.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, rawLine: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldTasks = parseFollowUpTasks(oldBody);
  const newTasks = parseFollowUpTasks(newBody);

  if (newTasks.length === 0) return [];

  // Build a map keyed by normalized description -> was it checked in old?
  // If a key appears multiple times in old, we conservatively treat it as
  // checked if ANY occurrence was checked (so we don't spuriously re-fire).
  const oldByKey = new Map();
  for (const t of oldTasks) {
    if (!t.normalizedKey) continue;
    const prev = oldByKey.get(t.normalizedKey);
    if (prev === undefined) {
      oldByKey.set(t.normalizedKey, t.checked);
    } else {
      oldByKey.set(t.normalizedKey, prev || t.checked);
    }
  }

  const results = [];
  const seen = new Set();
  for (const t of newTasks) {
    if (!t.checked) continue;
    if (!t.normalizedKey) continue; // no description -> skip (edge case)
    if (seen.has(t.normalizedKey)) continue; // dedupe within new body
    if (!oldByKey.has(t.normalizedKey)) {
      // Newly added and checked in the same edit -> do NOT report.
      continue;
    }
    if (oldByKey.get(t.normalizedKey) === true) {
      // Already checked in old body -> not a new transition.
      continue;
    }
    seen.add(t.normalizedKey);
    results.push({
      description: t.description,
      rawLine: t.rawLine,
    });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  // Exported for tests / debugging:
  parseFollowUpTasks,
  normalizeKey,
};
