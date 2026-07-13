'use strict';

/**
 * Pure utility to detect newly-checked "Follow-up:" checklist items
 * between two versions of an issue/PR body.
 *
 * A "newly checked" item is one that:
 *   - existed in oldBody as unchecked (`- [ ]`)
 *   - exists in newBody as checked (`- [x]` or `- [X]`)
 *   - has the "Follow-up:" prefix (case-insensitive, whitespace/hyphen tolerant)
 *
 * Items matched by normalized text content, not line position, so reordering
 * or unrelated edits don't break detection.
 */

const FOLLOWUP_PREFIX_RE = /^\s*follow[\s-]*up\s*:\s*/i;
const TASK_LINE_RE = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;

function parseTaskLines(body) {
  if (body == null || typeof body !== 'string') return [];
  const out = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(TASK_LINE_RE);
    if (!m) continue;
    const checked = m[1] === 'x' || m[1] === 'X';
    const text = m[2];
    if (!FOLLOWUP_PREFIX_RE.test(text)) continue;
    const description = text.replace(FOLLOWUP_PREFIX_RE, '').trim();
    const normalized = description.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    out.push({ checked, description, normalized, raw: text });
  }
  return out;
}

/**
 * Return an array of follow-up items that transitioned from unchecked → checked.
 * @param {string|null|undefined} oldBody
 * @param {string|null|undefined} newBody
 * @returns {Array<{description: string, normalized: string, raw: string}>}
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  const oldItems = parseTaskLines(oldBody);
  const newItems = parseTaskLines(newBody);
  if (newItems.length === 0) return [];

  const oldByKey = new Map();
  for (const item of oldItems) {
    // If duplicate normalized keys, keep the unchecked one preferentially,
    // so we correctly detect an unchecked→checked transition.
    const existing = oldByKey.get(item.normalized);
    if (!existing || (existing.checked && !item.checked)) {
      oldByKey.set(item.normalized, item);
    }
  }

  const results = [];
  const seen = new Set();
  for (const item of newItems) {
    if (!item.checked) continue;
    if (seen.has(item.normalized)) continue;
    const prior = oldByKey.get(item.normalized);
    if (!prior) continue; // brand-new item, no prior unchecked state
    if (prior.checked) continue; // already checked before
    seen.add(item.normalized);
    results.push({
      description: item.description,
      normalized: item.normalized,
      raw: item.raw,
    });
  }
  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseTaskLines,
};
