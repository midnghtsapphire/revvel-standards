'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const creativeSystem = require(path.join(
  __dirname,
  '..',
  'products',
  'ugc-review-generator',
  'src',
  'lib',
  'creative-system.js'
));

function run(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const {
  buildAmazonReviewPacket,
  buildLocalLeadPacket,
  buildThirtyDayCalendar,
  normalizeUrgencyHours,
  packetToMarkdown,
} = creativeSystem;

console.log('ugc-review-generator');

run('preserves the original Amazon review script behavior', () => {
  const packet = buildAmazonReviewPacket({
    productName: 'magnetic cable hub',
    problem: 'messy cables destroying your desk setup',
    hookType: 'unboxing',
    affiliateLink: 'https://amzn.to/demo',
  });

  assert.equal(packet.useCase, 'amazon-ugc');
  assert.match(packet.visualPrompt, /magnetic cable hub/);
  assert.match(packet.script, /messy cables destroying your desk setup/);
  assert.match(packet.script, /https:\/\/amzn\.to\/demo/);
  assert.equal(packet.checklist.length, 3);
});

run('builds Zeely-style overlay copy with proof and urgency', () => {
  const packet = buildLocalLeadPacket({
    brandName: 'Lead Hook System',
    businessType: 'real estate',
    audience: 'Real estate agents',
    painPoint: 'what to post on social media',
    proofMetric: '120 organic buyer leads',
    offer: 'Unlimited AI ad generation',
    freeTrialDays: 7,
    urgencyHours: 3,
  });

  assert.equal(packet.useCase, 'local-leads');
  assert.equal(packet.overlayLines.length, 7);
  assert.match(packet.overlayLines[2], /120 organic buyer leads/);
  assert.match(packet.overlayLines[5], /Only 3 hours left\./);
  assert.equal(packet.contentCalendar.length, 30);
  assert.equal(packet.contentCalendar[0].day, 1);
  assert.equal(packet.contentCalendar[29].day, 30);
});

run('falls back to compliant qualitative language when proof is missing', () => {
  const packet = buildLocalLeadPacket({
    brandName: 'Lead Hook System',
    businessType: 'real estate',
    audience: 'Real estate agents',
    proofMetric: '   ',
    offer: 'Unlimited AI ad generation',
  });

  assert.match(packet.overlayLines[2], /proof-led real estate content/);
  assert.match(packet.complianceNotes[0], /defaults to qualitative social-proof language/);
});

run('normalizes urgency hours into a safe 1-72 range', () => {
  assert.equal(normalizeUrgencyHours(0), 1);
  assert.equal(normalizeUrgencyHours('18'), 18);
  assert.equal(normalizeUrgencyHours(999), 72);
  assert.equal(normalizeUrgencyHours('bad'), 3);
});

run('produces deterministic 30-day content calendar entries', () => {
  const calendar = buildThirtyDayCalendar({
    businessType: 'real estate',
    audience: 'Real estate agents',
    offer: 'Unlimited AI ad generation',
  });

  assert.equal(calendar.length, 30);
  assert.deepEqual(calendar[0], {
    day: 1,
    format: 'Reel',
    angle: 'Pain',
    hook: 'Still manually writing real estate posts every morning?',
    cta: 'DM "Unlimited AI ad generation" to get the template.',
  });
});

run('markdown export includes the key local-lead sections', () => {
  const packet = buildLocalLeadPacket({
    brandName: 'Lead Hook System',
    businessType: 'real estate',
    audience: 'Real estate agents',
  });
  const markdown = packetToMarkdown(packet);

  assert.match(markdown, /# Lead Hook System Campaign Packet/);
  assert.match(markdown, /## Overlay Copy/);
  assert.match(markdown, /## Landing Page/);
  assert.match(markdown, /## Compliance Notes/);
});
