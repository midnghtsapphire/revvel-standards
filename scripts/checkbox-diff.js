'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility to detect newly-checked "Follow-up:" checklist items between
 * two versions of a markdown body (e.g. a PR/issue body before and after an
 * edit). No network, no GitHub API — fully unit-testable.
 *
 * Trigger contract:
 *   A line `- [ ] Follow-up: <desc>` that becomes `- [x] Follow-up: <desc>`
 *   between oldBody and newBody counts as "newly checked" and should be
 *   routed into a tracked WR issue.
 *
 * Non-triggers (deliberately):
 *   - Items added AND checked in the same edit (no prior unchecked state).
 *   - Items already checked in oldBody.
 *   - Checkboxes whose label does not match the `Follow-up:` prefix.
 *   - Follow-up items with an empty description.
 *
 * Matching is by normalized description text (not line position), so
 * reordering unrelated lines in the same edit does not cause false results.
 */

// Markdown task-list line. Group 1: state char (space, x, X); group 2: label.
const TASK_LINE_RE = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;

// `Follow-up:` prefix, case-insensitive, tolerant of a hyphen or spaces
// between "follow" and "up" and whitespace around the colon.
const FOLLOWUP_PREFIX_RE = /^follow\s*-?\s*up\s*:\s*(.*)$/i;

/**
 * Normalize a description: lowercase, collapse whitespace, trim.
 * @param {string} text
 * @returns {string}
 */
function normalizeDescription(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Matching key: like normalizeDescription but also strips trailing sentence
 * punctuation so "do the thing" and "do the thing." pair across edits.
 * @param {string} s
 * @returns {string}
 */
function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

/**
 * Parse a markdown body into follow-up checkbox entries.
 * Each entry: { checked, description, rawLine, normalized }.
 * Non-task lines and non-`Follow-up:` task lines are skipped. Entries with an
 * empty description are retained (findNewlyCheckedFollowUps skips them later).
 *
 * @param {string|null|undefined} body
 * @returns {Array<{checked: boolean, description: string, rawLine: string, normalized: string}>}
 */
function parseFollowUpCheckboxes(body) {
  if (body === null || body === undefined || typeof body !== 'string') {
    return [];
  }
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const taskMatch = TASK_LINE_RE.exec(line);
    if (!taskMatch) continue;
    const label = taskMatch[2] || '';
    const followMatch = FOLLOWUP_PREFIX_RE.exec(label.trim());
    if (!followMatch) continue;
    const description = (followMatch[1] || '').trim();
    out.push({
      checked: taskMatch[1] === 'x' || taskMatch[1] === 'X',
      description,
      rawLine: line,
      normalized: normalizeDescription(description),
    });
  }
  return out;
}

// Historical alias kept so existing importers keep working.
const parseFollowUpTasks = parseFollowUpCheckboxes;

/**
 * Find follow-up items that transitioned from unchecked in oldBody to checked
 * in newBody. Returns { description, rawLine } per newly-checked item, in
 * newBody order. Duplicate descriptions are consumed pairwise from oldBody.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, rawLine: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const newItems = parseFollowUpCheckboxes(newBody);
  if (newItems.length === 0) return [];

  const oldPool = new Map();
  for (const item of parseFollowUpCheckboxes(oldBody)) {
    const key = normalizeKey(item.description);
    if (!key) continue;
    if (!oldPool.has(key)) oldPool.set(key, []);
    oldPool.get(key).push(item);
  }

  const results = [];
  for (const item of newItems) {
    if (!item.checked) continue;
    const key = normalizeKey(item.description);
    if (!key) continue; // empty description -> skip
    const bucket = oldPool.get(key);
    if (!bucket || bucket.length === 0) continue; // added+checked same edit -> skip
    const prior = bucket.shift();
    if (!prior.checked) {
      results.push({ description: item.description, rawLine: item.rawLine });
    }
    // prior already checked -> no transition -> no trigger
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUpCheckboxes,
  parseFollowUpTasks,
  normalizeDescription,
  normalizeKey,
};
