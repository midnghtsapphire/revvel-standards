'use strict';

/**
 * Content fingerprint for a set of security-fleet findings (WR #17842).
 *
 * The event lane deduped on the SUBJECT — `[security-fleet] finding on #N`.
 * Every fix PR for a finding quotes the finding to explain it, which re-fires
 * the same detector against a new subject number, which looks new, which files
 * a new issue. One finding, four issues: #17772 → #17804/#17805 → #17814/#17815
 * → #17826/#17828, each attached to the PR trying to resolve the previous one.
 *
 * The workflow's own comment names the cause and stops short of it:
 *
 *   "The dedup below cannot stop it: its key is 'finding on #<subject>', and
 *    the subject is a different number every link, so each one looks new."
 *
 * Two events carrying the same rule and the same excerpt are the same finding,
 * whatever they are attached to. That is what this hashes.
 *
 * Deliberately NOT a body-content skip. Refusing to scan a PR that mentions
 * `security-fleet` would let anything evade the detector by saying the word.
 * Detection is unchanged here; only the bookkeeping is.
 */

const crypto = require('node:crypto');

const MARKER = 'security-fleet:fingerprint';

/**
 * Stable id for a set of findings.
 *
 * Order-independent (two reports listing the same findings in a different
 * order are one finding set) and whitespace-normalised, because the excerpt is
 * rendered text and a re-wrap is not a new finding.
 *
 * @param {Array<{handle: string, report: {findings?: Array<{rule?: string, excerpt?: string}>}}>} reports
 * @returns {string} 16 hex chars
 */
function fingerprint(reports) {
  const lines = [];
  for (const { handle, report } of reports ?? []) {
    for (const f of report?.findings ?? []) {
      const rule = String(f?.rule ?? '').trim();
      const excerpt = String(f?.excerpt ?? '').replace(/\s+/g, ' ').trim();
      lines.push(`${String(handle ?? '').trim()}|${rule}|${excerpt}`);
    }
  }
  lines.sort();
  return crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}

/** The HTML comment embedded in an issue body so a later run can find it. */
function marker(fp) {
  return `<!-- ${MARKER}:${fp} -->`;
}

/** True when `body` carries this fingerprint. */
function bodyHasFingerprint(body, fp) {
  return typeof body === 'string' && body.includes(marker(fp));
}

module.exports = { fingerprint, marker, bodyHasFingerprint, MARKER };
