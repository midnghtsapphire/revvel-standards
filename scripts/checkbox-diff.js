'use strict';

/**
 * checkbox-diff.js
 *
 * Pure utility for detecting newly-checked "Follow-up:" checkbox items
 * between two versions of an issue/PR body.
 *
 * Exported API:
 *   findNewlyCheckedFollowUps(oldBody, newBody) -> Array<{ description: string, raw: string }>
 *
 * Matching rules:
 *   - A follow-up line matches (case-insensitively) the pattern:
 *       - [ ] Follow-up: <description>
 *     with tolerance for leading whitespace, optional hyphen/en-dash after
 *     "Follow" ("Follow-up", "Followup", "Follow up"), and one-or-more spaces
 *     between tokens.
 *   - Items are matched between old and new bodies by *normalized description text*,
 *     not by line position, so reordering does not break detection.
 *   - Newly-checked = present as unchecked in oldBody AND present as checked in newBody.
 *   - Items only present in newBody (added and checked in the same edit) are ignored.
 *   - Items already checked in oldBody are ignored.
 */

const FOLLOWUP_LINE_RE =
  /^\s*[-*+]\s+\[([ xX])\]\s+follow[\s\-\u2010-\u2015]?up\s*:\s*(.*)$/i;

function normalizeDescription(desc) {
  return String(desc || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseFollowUps(body) {
  const result = new Map();
  if (body == null) return result;
  const lines = String(body).split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(FOLLOWUP_LINE_RE);
    if (!m) continue;
    const checked = m[1] !== ' ';
    const description = (m[2] || '').trim();
    const key = normalizeDescription(description);
    if (!key) continue;
    // First occurrence wins (stable behavior for duplicates)
    if (!result.has(key)) {
      result.set(key, { checked, description, raw: line });
    }
  }
  return result;
}

function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseFollowUps(oldBody);
  const newItems = parseFollowUps(newBody);
  const results = [];
  for (const [key, newItem] of newItems.entries()) {
    if (!newItem.checked) continue;
    const oldItem = oldItems.get(key);
    if (!oldItem) continue; // added-and-checked in same edit: skip
    if (oldItem.checked) continue; // already checked: skip
    results.push({ description: newItem.description, raw: newItem.raw });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUps,
  normalizeDescription,
};
