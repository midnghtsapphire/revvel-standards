'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checklist items
 * between two versions of a PR/issue body.
 *
 * A follow-up item is a markdown task list line of the form:
 *   - [ ] Follow-up: <description>
 *
 * When such a line transitions from unchecked (`[ ]`) to checked (`[x]`/`[X]`)
 * between oldBody and newBody, we report it as a newly-checked follow-up.
 *
 * Matching is done by *normalized text content* (not line position) so that
 * reordering or unrelated edits in the same diff don't break detection.
 *
 * Items that appear only in newBody (i.e. added and checked in the same edit)
 * are intentionally NOT reported — there's no prior unchecked state to
 * transition from, so we avoid over-firing.
 */

// Matches:  - [ ] Follow-up: text   OR   * [x] Follow up - text   etc.
// Tolerant of: leading whitespace, `-`/`*`/`+` bullet, spaces inside brackets,
// `Follow-up` / `Follow up` / `Followup` casing/hyphenation, colon or dash separator.
const TASK_LINE_RE = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;
const FOLLOWUP_PREFIX_RE = /^\s*follow[\s-]?up\s*[:\-]\s*(.*)$/i;

/**
 * Parse a body into an array of { checked, description, normalized } for each
 * task-list line that looks like a Follow-up item.
 *
 * @param {string} body
 * @returns {Array<{checked: boolean, description: string, normalized: string}>}
 */
function parseFollowUpTasks(body) {
  if (body == null || typeof body !== 'string') return [];
  const out = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(TASK_LINE_RE);
    if (!m) continue;
    const checkMark = m[1];
    const rest = m[2] || '';
    const fm = rest.match(FOLLOWUP_PREFIX_RE);
    if (!fm) continue;
    const description = (fm[1] || '').trim();
    // Normalize for cross-body matching: lowercase, collapse whitespace.
    const normalized = description.toLowerCase().replace(/\s+/g, ' ').trim();
    out.push({
      checked: checkMark === 'x' || checkMark === 'X',
      description,
      normalized,
    });
  }
  return out;
}

/**
 * Find follow-up items that transitioned from unchecked in oldBody to
 * checked in newBody.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, normalized: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldTasks = parseFollowUpTasks(oldBody);
  const newTasks = parseFollowUpTasks(newBody);
  if (newTasks.length === 0) return [];

  // Build a map of oldTasks by normalized text. If the same text appears
  // multiple times, we keep the "most permissive" state (any unchecked wins)
  // so we don't miss a legitimate transition.
  const oldByNorm = new Map();
  for (const t of oldTasks) {
    if (!oldByNorm.has(t.normalized)) {
      oldByNorm.set(t.normalized, t.checked);
    } else {
      // If any occurrence was unchecked, treat as unchecked.
      oldByNorm.set(t.normalized, oldByNorm.get(t.normalized) && t.checked);
    }
  }

  const results = [];
  const seen = new Set();
  for (const t of newTasks) {
    if (!t.checked) continue;
    if (seen.has(t.normalized)) continue;
    if (!oldByNorm.has(t.normalized)) {
      // Added and checked in the same edit — skip (no prior state).
      continue;
    }
    if (oldByNorm.get(t.normalized) === false) {
      // Was unchecked, now checked — this is our transition.
      results.push({ description: t.description, normalized: t.normalized });
      seen.add(t.normalized);
    }
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUpTasks,
};
