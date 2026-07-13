'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting follow-up checkbox transitions in markdown bodies
 * (issue/PR descriptions). Used by the follow-up-checkbox-router workflow to
 * decide whether a maintainer just checked a `- [ ] Follow-up: ...` line, which
 * is the trigger to spin out a tracked WR issue.
 *
 * The core function `findNewlyCheckedFollowUps(oldBody, newBody)` returns an
 * array of description strings for each follow-up that transitioned from
 * unchecked in `oldBody` to checked in `newBody`.
 *
 * Matching is done by *normalized text content*, not line position, so that
 * unrelated edits or reordering in the same body edit don't create false
 * positives or false negatives.
 *
 * No network / GitHub API dependency — fully unit-testable.
 */

// Matches a markdown task-list line, capturing:
//   1: the checkbox state character (space, x, or X)
//   2: the rest of the line (the item text)
//
// Tolerates leading whitespace and common list markers (- / * / +).
const TASK_LINE_RE = /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/;

// Matches the follow-up prefix, case-insensitively, tolerating minor
// whitespace/hyphen variants like "Follow up:", "follow-up :", "Followup:".
const FOLLOWUP_PREFIX_RE = /^follow[\s-]?up\s*:\s*/i;

/**
 * Normalize an item's text for cross-body matching.
 *
 * Collapses whitespace and lowercases so that trivial reformatting between the
 * two body versions (e.g. an extra space, a capitalization change on the
 * prefix) doesn't cause us to treat the same item as two different items.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeItemText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extract the follow-up description (text after the `Follow-up:` prefix), or
 * null if this task-list line is not a follow-up item at all.
 *
 * @param {string} itemText - the text of a task list line, without the `[ ]`/`[x]` box.
 * @returns {string|null} - the description, or null if not a follow-up line.
 */
function extractFollowUpDescription(itemText) {
  if (typeof itemText !== 'string') return null;
  const match = itemText.match(FOLLOWUP_PREFIX_RE);
  if (!match) return null;
  const description = itemText.slice(match[0].length).trim();
  // A follow-up line with no description at all is not actionable — skip it
  // rather than firing a WR with an empty body.
  if (!description) return null;
  return description;
}

/**
 * Parse a body string into an array of task-list items.
 *
 * @param {string|null|undefined} body
 * @returns {Array<{checked: boolean, text: string, normalized: string, followUpDescription: string|null}>}
 */
function parseTaskListItems(body) {
  if (body == null) return [];
  const lines = String(body).split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const match = line.match(TASK_LINE_RE);
    if (!match) continue;
    const box = match[1];
    const text = match[2];
    items.push({
      checked: box === 'x' || box === 'X',
      text: text,
      normalized: normalizeItemText(text),
      followUpDescription: extractFollowUpDescription(text),
    });
  }
  return items;
}

/**
 * Find follow-up items that were unchecked in `oldBody` and are now checked in
 * `newBody`.
 *
 * Behavior:
 *  - If a follow-up line exists in newBody but did not exist at all in
 *    oldBody, it is NOT reported (added-and-checked in the same edit — no
 *    prior unchecked state to transition from).
 *  - If a follow-up line was already checked in oldBody, it is NOT reported
 *    (no transition).
 *  - Non-follow-up checkboxes are ignored entirely.
 *  - Matching between the two bodies is done by normalized item text, so
 *    reorderings in the same edit still match correctly.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<string>} - array of follow-up description strings that were newly checked.
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseTaskListItems(oldBody);
  const newItems = parseTaskListItems(newBody);

  // Build a map of oldBody items keyed by normalized text — used to look up
  // "was this same item unchecked before?"
  const oldByNormalized = new Map();
  for (const item of oldItems) {
    // If duplicates exist in the old body, prefer the first occurrence.
    if (!oldByNormalized.has(item.normalized)) {
      oldByNormalized.set(item.normalized, item);
    }
  }

  const results = [];
  const seenNormalized = new Set();

  for (const item of newItems) {
    if (!item.checked) continue;
    if (!item.followUpDescription) continue;
    // Deduplicate within newBody itself in case the same follow-up appears twice.
    if (seenNormalized.has(item.normalized)) continue;
    seenNormalized.add(item.normalized);

    const previous = oldByNormalized.get(item.normalized);
    if (!previous) continue; // added-and-checked in same edit — skip
    if (previous.checked) continue; // already checked before — skip

    results.push(item.followUpDescription);
  }

  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  // Exported for testing / reuse:
  parseTaskListItems,
  extractFollowUpDescription,
  normalizeItemText,
};
