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
// hyphens or spaces between "Follow" and "up" and optional whitespace
// around the colon.
const FOLLOWUP_PREFIX_RE = /^follow[\s-]*up\s*:\s*(.*)$/i;

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
  parseFollowUpCheckboxes,
  normalizeDescription,
  // Exported for tests / debugging:
  parseFollowUpTasks,
  normalizeKey,
};
