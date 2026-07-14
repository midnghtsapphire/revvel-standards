'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checklist items
 * between two markdown bodies (typically an issue/PR body before and after
 * an edit).
 *
 * Trigger contract:
 *   A line of the form `- [ ] Follow-up: <description>` that transitions to
 *   `- [x] Follow-up: <description>` between oldBody and newBody counts as
 *   "newly checked" and should be routed into a tracked WR issue.
 *
 * Non-triggers (deliberately):
 *   - Items that appear already-checked in newBody but had no unchecked
 *     counterpart in oldBody (i.e. the checkbox was added and checked in
 *     the same edit -- no prior unchecked state to transition from).
 *   - Items that were already checked in oldBody.
 *   - Checkboxes whose label does not match the `Follow-up:` prefix.
 *
 * Matching is by normalized description text (not line position), so
 * reordering unrelated lines in the same edit does not create false
 * positives or negatives.
 */

// Matches a markdown task-list line, capturing:
//   1: the check state character (space, x, or X)
//   2: the remainder of the line (label text)
// Allows leading whitespace and a few common list markers (`-`, `*`, `+`).
const TASK_LINE_RE = /^\s*[-*+]\s*\[( |x|X)\]\s*(.*)$/;

// Matches the `Follow-up:` prefix case-insensitively, with tolerance for
// a hyphen or space between "Follow" and "up" and optional whitespace
// around the colon.
const FOLLOWUP_PREFIX_RE = /^follow[\s-]?up\s*:\s*(.*)$/i;

/**
 * Normalize a follow-up description for stable matching across edits.
 * Collapses whitespace and lowercases so casing/spacing tweaks don't
 * break the old<->new pairing.
 */
function normalizeDescription(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Parse a markdown body into an array of follow-up checkbox entries.
 * Each entry: { checked: boolean, description: string, normalized: string }
 *
 * Non-task lines and task lines whose label does not start with
 * `Follow-up:` are skipped.
 */
function parseFollowUpCheckboxes(body) {
  if (body == null) return [];
  const lines = String(body).split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const taskMatch = line.match(TASK_LINE_RE);
    if (!taskMatch) continue;
    const checked = taskMatch[1].toLowerCase() === 'x';
    const label = taskMatch[2] || '';
    const followMatch = label.match(FOLLOWUP_PREFIX_RE);
    if (!followMatch) continue;
    const description = followMatch[1].trim();
    out.push({
      checked,
      description,
      normalized: normalizeDescription(description),
    });
  }
  return out;
}

/**
 * Find follow-up checklist items that transitioned from unchecked in
 * oldBody to checked in newBody.
 *
 * Returns an array of { description } objects (one per newly-checked
 * item, in the order they appear in newBody). Duplicate normalized
 * descriptions within a single body are handled by consuming matches
 * from oldBody one at a time.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const newItems = parseFollowUpCheckboxes(newBody);
  if (newItems.length === 0) return [];

  const oldItems = parseFollowUpCheckboxes(oldBody);

  // Build a mutable pool of old entries keyed by normalized description.
  // We pop one at a time so duplicate labels are consumed pairwise.
  const oldPool = new Map();
  for (const item of oldItems) {
    if (!oldPool.has(item.normalized)) oldPool.set(item.normalized, []);
    oldPool.get(item.normalized).push(item);
  }

  const results = [];
  for (const item of newItems) {
    if (!item.checked) continue;
    const bucket = oldPool.get(item.normalized);
    if (!bucket || bucket.length === 0) {
      // No prior state -- item was added and checked in the same edit.
      // Skip to avoid over-firing.
      continue;
    }
    const prior = bucket.shift();
    if (!prior.checked) {
      results.push({ description: item.description });
    }
    // If prior was already checked, no transition -> no trigger.
  }

  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUpCheckboxes,
  normalizeDescription,
};
