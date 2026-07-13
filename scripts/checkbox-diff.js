'use strict';

/**
 * Pure utility to detect newly-checked "Follow-up:" checkbox items
 * between two markdown bodies (e.g. issue/PR body before and after an edit).
 *
 * A follow-up checkbox line looks like:
 *   - [ ] Follow-up: <description>
 *   - [x] Follow-up: <description>
 *
 * Matching rules:
 *  - The "Follow-up:" prefix is matched case-insensitively.
 *  - Minor whitespace and hyphen tolerance around the prefix (e.g. "Follow up:", "Follow-up :").
 *  - Items are matched between old and new bodies by their normalized description text,
 *    not by line position, so reordering does not create false positives.
 *  - Only transitions from unchecked in old -> checked in new are reported.
 *  - A checkbox that only appears in the new body (no prior unchecked state) is NOT reported.
 *  - A checkbox already checked in old is NOT reported.
 */

const TASK_LINE_RE = /^\s*[-*+]\s*\[( |x|X)\]\s*(.*\S)\s*$/;
const FOLLOWUP_PREFIX_RE = /^follow[\s-]*up\s*:\s*(.*)$/i;

function normalizeDescription(desc) {
  return String(desc || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFollowUpItems(body) {
  const items = new Map(); // normalizedDesc -> { checked, description }
  if (body == null) return items;

  const lines = String(body).split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(TASK_LINE_RE);
    if (!m) continue;
    const box = m[1];
    const rest = m[2];
    const fm = rest.match(FOLLOWUP_PREFIX_RE);
    if (!fm) continue;
    const description = fm[1].trim();
    if (!description) continue; // skip empty descriptions
    const key = normalizeDescription(description);
    if (items.has(key)) continue; // first occurrence wins
    items.set(key, {
      checked: box === 'x' || box === 'X',
      description,
    });
  }
  return items;
}

/**
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string}>} newly-checked follow-up items
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseFollowUpItems(oldBody);
  const newItems = parseFollowUpItems(newBody);

  const results = [];
  for (const [key, newItem] of newItems.entries()) {
    if (!newItem.checked) continue;
    const oldItem = oldItems.get(key);
    if (!oldItem) continue; // brand new checkbox - do not fire
    if (oldItem.checked) continue; // was already checked
    results.push({ description: newItem.description });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUpItems,
  normalizeDescription,
};
