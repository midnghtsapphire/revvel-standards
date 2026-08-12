#!/usr/bin/env node
'use strict';

/**
 * WR-16450 — Acknowledgements (including continue-the-loop) are permanent for
 * every WR type: heavy form, OpenHands quick form, and markdown WR templates.
 */

const fs = require('fs');
const path = require('path');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const REPO = path.join(__dirname, '..');

const CONTINUE_LOOP =
  'After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.';

const REQUIRED_ACKS = [
  'This WR defines a bundled outcome, not just a minimum acceptable patch.',
  'Explicitly requested secondary items should not be silently deferred.',
  'If the PR is partial, the blocker must be documented.',
  "The PR should reflect the WR's required bundle and definition of done.",
  CONTINUE_LOOP,
];

const SOURCES = [
  path.join('.github', 'ISSUE_TEMPLATE', '00-work-request.yml'),
  path.join('.github', 'ISSUE_TEMPLATE', '10-openhands-system-wr.yml'),
  path.join('templates', 'issue-template', '00-work-request.yml'),
  path.join('templates', 'issue-template', '10-openhands-system-wr.yml'),
  path.join('wr', 'WR_TEMPLATE_BASIC.md'),
  path.join('wr', 'WR_TEMPLATE_FULL.md'),
];

describe('permanent WR Acknowledgements (WR-16450)', () => {
  for (const rel of SOURCES) {
    test(`${rel} includes all five Acknowledgements`, () => {
      const content = fs.readFileSync(path.join(REPO, rel), 'utf8');
      assert.match(content, /Acknowledgements/);
      for (const ack of REQUIRED_ACKS) {
        assert.ok(
          content.includes(ack),
          `${rel} missing acknowledgement: ${ack}`
        );
      }
    });
  }

  test('wr-field-defaults ticks every acknowledgement by default', () => {
    const defaults = fs.readFileSync(
      path.join(REPO, 'config', 'wr-field-defaults.yml'),
      'utf8'
    );
    assert.match(defaults, /heading:\s*"?Acknowledgements"?/);
    assert.match(defaults, /["']?\*["']?:\s*["']?all["']?/);
    for (const ack of REQUIRED_ACKS) {
      assert.ok(defaults.includes(ack), `defaults missing: ${ack}`);
    }
  });

  test('OpenHands quick form documents permanent continue-the-loop policy', () => {
    const content = fs.readFileSync(
      path.join(REPO, '.github', 'ISSUE_TEMPLATE', '10-openhands-system-wr.yml'),
      'utf8'
    );
    assert.match(content, /Permanent for \*\*every\*\* WR type/i);
    assert.match(content, /id:\s*acknowledgements/);
  });
});
