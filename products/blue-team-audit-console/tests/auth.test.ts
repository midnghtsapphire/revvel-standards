/**
 * auth.test.ts — session token + credential checks.
 */

import assert from 'node:assert/strict';
import {
  authenticate,
  canWrite,
  createSessionToken,
  parseCookieHeader,
  verifySessionToken,
  DEMO_USERS,
} from '../app/lib/auth';

assert.ok(DEMO_USERS.length >= 3);

const bad = authenticate('nope@revvel.local', 'auditor-demo-1');
assert.equal(bad.ok, false);

const short = authenticate('auditor@revvel.local', 'short');
assert.equal(short.ok, false);

const ok = authenticate('auditor@revvel.local', 'auditor-demo-1');
assert.equal(ok.ok, true);
if (!ok.ok) throw new Error('expected ok');
assert.equal(ok.user.role, 'auditor');
assert.equal(canWrite(ok.user), true);

const token = createSessionToken(ok.user);
assert.ok(token.includes('.'));
const verified = verifySessionToken(token);
assert.ok(verified);
assert.equal(verified?.email, 'auditor@revvel.local');
assert.equal(verifySessionToken('not.a.token'), null);
assert.equal(verifySessionToken(null), null);

// tamper detection
const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
assert.equal(verifySessionToken(tampered), null);

const viewer = authenticate('viewer@revvel.local', 'viewer-demo1');
assert.equal(viewer.ok, true);
if (viewer.ok) {
  assert.equal(canWrite(viewer.user), false);
}

const cookie = parseCookieHeader('a=1; bt_session=abc%2Edef; b=2', 'bt_session');
assert.equal(cookie, 'abc.def');
assert.equal(parseCookieHeader(null, 'bt_session'), null);

console.log('auth.test.ts: ok');
