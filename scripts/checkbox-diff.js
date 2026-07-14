'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checklist items
 * between two markdown bodies (e.g. an issue/PR body before and after an edit).
 *
 * No network / GitHub dependency, so it is fully unit-testable.
 */

/**
 * Matches a markdown task-list line, capturing:
 *   1: the checkbox state character (space, x, or X)
 *   2: the remaining text after the checkbox
 *
 * Tolerates leading whitespace and optional list-marker variants.
 */
const TASK_LINE_RE = /^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/;

/**
 * Matches a "Follow-up:" prefix, case-insensitive, tolerating:
 *   - Follow-up:
 *   - Follow up:
 *   - Followup:
 *   - Extra whitespace around the hyphen/space
 */
const FOLLOW_UP_PREFIX_RE = /^\s*follow[\s-]?up\s*:\s*(.*)$/i;

/**
 * Normalize a follow-up description for matching between old and new bodies.
 * We match by content so reordering / unrelated edits don't break detection.
 */
function normalizeText(text) {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a body into an array of follow-up task-list entries.
 *
 * Returns entries of the form:
 *   { checked: boolean, description: string, normalized: string, raw: string }
 *
 * Only lines whose task-text starts with a "Follow-up:" prefix are returned.
 */
function parseFollowUpTasks(body) {
  if (body == null) return [];
  const lines = String(body).split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = TASK_LINE_RE.exec(line);
    if (!m) continue;
    const state = m[1];
    const rest = m[2] || '';
    const fu = FOLLOW_UP_PREFIX_RE.exec(rest);
    if (!fu) continue;
    const description = (fu[1] || '').trim();
    out.push({
      checked: state === 'x' || state === 'X',
      description,
      normalized: normalizeText(description),
      raw: line,
    });
  }
  return out;
}

/**
 * Find follow-up items that transitioned from unchecked (in oldBody) to
 * checked (in newBody).
 *
 * Rules:
 *   - If oldBody is null/undefined, nothing is "newly checked" — we have no
 *     prior state to compare against, so we avoid over-firing.
 *   - If newBody is null/undefined, returns [].
 *   - Matching is by normalized description text, not line position.
 *   - An item checked in newBody but NOT present at all in oldBody is NOT
 *     considered newly checked (added-and-checked in the same edit is a no-op).
 *   - An item that was already checked in oldBody is NOT re-reported.
 *
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, normalized: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  if (oldBody == null || newBody == null) return [];

  const oldTasks = parseFollowUpTasks(oldBody);
  const newTasks = parseFollowUpTasks(newBody);

  // Index old tasks by normalized text. If duplicates exist, prefer the
  // "unchecked" state so a subsequent check on any duplicate is detectable.
  const oldByText = new Map();
  for (const t of oldTasks) {
    if (!t.normalized) continue;
    const existing = oldByText.get(t.normalized);
    if (!existing || (existing.checked && !t.checked)) {
      oldByText.set(t.normalized, t);
    }
  }

  const results = [];
  const seen = new Set();
  for (const t of newTasks) {
    if (!t.checked) continue;
    if (!t.normalized) continue;
    if (seen.has(t.normalized)) continue;
    const prior = oldByText.get(t.normalized);
    if (!prior) continue; // added-and-checked in same edit — skip
    if (prior.checked) continue; // already checked before
    seen.add(t.normalized);
    results.push({
      description: t.description,
      normalized: t.normalized,
    });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUpTasks,
  normalizeText,
};
