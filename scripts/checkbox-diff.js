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
 * Diffs two markdown bodies (an issue's or PR's `body` before/after an edit)
 * to find task-list ("- [ ]" / "- [x]") lines that were newly checked in
 * this edit AND match the `Follow-up:` convention documented in
 * `.github/workflows/followup-checkbox-router.yml`:
 *
 *   - [ ] Follow-up: <free text description of what needs tracking later>
 *
 * When a maintainer/agent edits the body and flips that box from unchecked
 * to checked, it is the trigger signal to spin the follow-up out into a
 * tracked WR issue. This module is the pure-logic half of that feature — it
 * has no GitHub API / network dependency so it can be unit tested directly.
 */

// Matches a markdown task-list line, e.g.:
//   - [ ] Follow-up: do the thing
//   * [x] some other item
//   +   [X]   spaced out item
const TASK_LINE_RE = /^[ \t]*[-*+][ \t]+\[([ xX])\][ \t]+(.+?)[ \t]*$/;

// Matches the "Follow-up:" prefix (case-insensitive, optional hyphen,
// optional colon, tolerant of trailing whitespace) that marks a checklist
// item as a trackable follow-up commitment. Covers "Follow-up:", "Followup:",
// "FOLLOWUP". (Does not match "Follow up:" with a bare space — the
// convention documented in followup-checkbox-router.yml is "Follow-up:".)
const FOLLOWUP_PREFIX_RE = /^follow-?up:?\s*/i;

/**
 * Parse every markdown task-list line out of a body.
 * @param {string|null|undefined} body
 * @returns {Array<{ text: string, checked: boolean }>}
 */
function parseTaskItems(body) {
  if (!body) return [];
  const items = [];
  const lines = String(body).split(/\r?\n/);
  for (const line of lines) {
    const match = TASK_LINE_RE.exec(line);
    if (!match) continue;
    items.push({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim(),
    });
  }
  return items;
}

/**
 * Normalize task-item text into a matching key. Minor whitespace variation
 * (extra spaces, tabs) should not prevent a line from being matched between
 * the old and new body; case is folded too since "Follow-up" items are
 * matched case-insensitively everywhere else in this module.
 * @param {string} text
 * @returns {string}
 */
function normalizeKey(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Find follow-up checklist items that transitioned from unchecked to
 * checked between `oldBody` and `newBody`.
 *
 * Matching strategy: items are matched by normalized text content (not by
 * line position), so a line can be correctly identified as "the same item"
 * even if unrelated lines above/below it were added, removed, or reordered
 * in the same edit. Only an item that (a) existed in `oldBody` as unchecked
 * and (b) exists in `newBody` as checked counts as "newly checked" — an
 * item that is brand new in `newBody` (no matching text in `oldBody` at
 * all) is not reported, since there is no unchecked->checked transition to
 * observe for it.
 *
 * @param {string|null|undefined} oldBody - body before the edit
 *   (`github.event.changes.body.from`). May be null/undefined, e.g. when
 *   the issue/PR was just created and there is no prior body to diff
 *   against, or when the edit didn't touch the body field at all.
 * @param {string|null|undefined} newBody - body after the edit (current
 *   `issue.body` / `pull_request.body`).
 * @returns {string[]} the free-text description of each newly-checked
 *   follow-up item, with the `Follow-up:` prefix stripped and trimmed. If
 *   multiple follow-up items were checked in the same edit, all of them are
 *   returned, in the order they appear in `newBody`.
 */
function findNewlyCheckedFollowUps(oldBody, newBody) {
  if (!oldBody || !newBody) return [];

  const oldItems = parseTaskItems(oldBody);
  const newItems = parseTaskItems(newBody);
  if (oldItems.length === 0 || newItems.length === 0) return [];

  // Bucket old items by normalized text into per-key queues so duplicate
  // line text (rare, but possible) is matched one-to-one in document order
  // rather than every duplicate matching the first old entry.
  const oldByKey = new Map();
  for (const item of oldItems) {
    const key = normalizeKey(item.text);
    if (!oldByKey.has(key)) oldByKey.set(key, []);
    oldByKey.get(key).push(item);
  }

  const results = [];
  for (const newItem of newItems) {
    if (!newItem.checked) continue;

    const key = normalizeKey(newItem.text);
    const queue = oldByKey.get(key);
    if (!queue || queue.length === 0) continue; // no matching prior line found
    const oldItem = queue.shift();
    if (oldItem.checked) continue; // already checked before this edit

    const followUpMatch = FOLLOWUP_PREFIX_RE.exec(newItem.text);
    if (!followUpMatch) continue; // checked, but not a "Follow-up:" item

    const description = newItem.text.slice(followUpMatch[0].length).trim();
    if (!description) continue; // "Follow-up:" with no description — nothing to track

    results.push(description);
  }

  return results;
}

module.exports = {
  findNewlyCheckedFollowUps,
  parseFollowUps,
  normalizeDescription,
  parseTaskItems,
  normalizeKey,
  TASK_LINE_RE,
  FOLLOWUP_PREFIX_RE,
};
