/**
 * validation.test.ts — input validation & sanitization.
 */

import assert from 'node:assert/strict';
import {
  escapeMarkdown,
  isEventKind,
  isSeverity,
  sanitizeText,
  validateEmail,
  validateGroupName,
  validateId,
  validateNoteText,
  validatePassword,
  validateTraceName,
} from '../app/lib/validation';

assert.equal(validateEmail('auditor@revvel.local').ok, true);
assert.equal(validateEmail('bad').ok, false);
assert.equal(validateEmail('').ok, false);
assert.equal(validateEmail(null).ok, false);

assert.equal(validatePassword('auditor-demo-1').ok, true);
assert.equal(validatePassword('short').ok, false);
assert.equal(validatePassword('a'.repeat(200)).ok, false);

assert.equal(validateId('ev_007').ok, true);
assert.equal(validateId('ev 007').ok, false);
assert.equal(validateId('../etc/passwd').ok, false);

assert.equal(validateNoteText('looks suspicious').ok, true);
assert.equal(validateNoteText('   ').ok, false);
assert.equal(validateNoteText('x'.repeat(5000)).ok, false);

assert.equal(validateGroupName('Auth churn').ok, true);
assert.equal(validateGroupName('').ok, false);

assert.equal(validateTraceName('2026-08-01_agent-scaffold-session').ok, true);
assert.equal(validateTraceName('has spaces').ok, false);
assert.equal(validateTraceName('../../x').ok, false);

assert.equal(isEventKind('bash'), true);
assert.equal(isEventKind('explode'), false);
assert.equal(isSeverity('high'), true);
assert.equal(isSeverity('extreme'), false);

assert.equal(sanitizeText('  hello\u0000 world  '), 'hello world');
assert.equal(escapeMarkdown('a|b'), 'a\\|b');
assert.match(escapeMarkdown('`code`'), /\\`/);

console.log('validation.test.ts: ok');
