'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const {
  generatePromptPacket,
  packetToMarkdown,
  clampScore,
} = require(path.join(__dirname, '..', 'products', 'prompt-generation-app', 'lib', 'prompt-generator.js'));

function run(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('prompt-generation-app');

run('throws on missing idea', () => {
  assert.throws(() => generatePromptPacket({}));
  assert.throws(() => generatePromptPacket({ idea: '   ' }));
});

run('generates packet with all sections', () => {
  const p = generatePromptPacket({ idea: 'OSINT tool for tracking competitor pricing', audience: 'founders' });
  assert.equal(p.idea, 'OSINT tool for tracking competitor pricing');
  assert.equal(p.audience, 'founders');
  assert.ok(p.marketFacts.length >= 3);
  assert.ok(p.competitorGaps.length >= 3);
  assert.ok(p.legalBoundaries.length >= 3);
  assert.ok(p.implementationPrompts.length >= 3);
  assert.ok(p.reviewerPrompts.length >= 3);
  assert.ok(p.scores.blueOcean >= 0 && p.scores.blueOcean <= 100);
  assert.ok(p.scores.redOcean >= 0 && p.scores.redOcean <= 100);
});

run('every market fact has a source URL', () => {
  const p = generatePromptPacket({ idea: 'AI compliance audit tool' });
  p.marketFacts.forEach((f) => {
    assert.match(f.source, /^https?:\/\//);
    assert.ok(f.claim.length > 0);
  });
});

run('blue-ocean score boosts on niche keywords', () => {
  const niche = generatePromptPacket({ idea: 'AI OSINT compliance audit for vertical B2B' });
  const generic = generatePromptPacket({ idea: 'social chat todo note app' });
  assert.ok(niche.scores.blueOcean > generic.scores.blueOcean);
  assert.ok(generic.scores.redOcean > niche.scores.redOcean);
});

run('markdown export contains all section headers', () => {
  const p = generatePromptPacket({ idea: 'Polar.sh funding analytics for OSS maintainers' });
  const md = packetToMarkdown(p);
  assert.ok(md.includes('# Prompt Packet:'));
  assert.ok(md.includes('## Market Facts'));
  assert.ok(md.includes('## Competitor Gaps'));
  assert.ok(md.includes('## Legal / OSINT Boundaries'));
  assert.ok(md.includes('## Implementation Prompts'));
  assert.ok(md.includes('## Reviewer Prompts'));
});

run('deterministic output for same input', () => {
  const a = generatePromptPacket({ idea: 'same idea', audience: 'agencies' });
  const b = generatePromptPacket({ idea: 'same idea', audience: 'agencies' });
  assert.deepEqual(a, b);
});

run('adds Spotify visual-link prompts for music embedding requests', () => {
  const baseline = generatePromptPacket({
    idea: 'Build a product analytics dashboard for agencies',
    audience: 'operators'
  });
  const p = generatePromptPacket({
    idea: 'Generate Spotify music platform embedding link visuals for TikTok video',
    audience: 'artists'
  });
  const joined = p.implementationPrompts.join('\n');
  assert.ok(joined.includes('cannot contain clickable hyperlinks'));
  assert.ok(joined.includes('native TikTok/Instagram link stickers'));
  assert.ok(joined.includes('open.spotify.com/track'));
  assert.equal(p.implementationPrompts.length, baseline.implementationPrompts.length + 2);
});

run('does not add music-link prompts for non-music social requests', () => {
  const baseline = generatePromptPacket({
    idea: 'Build a B2B invoice reconciliation dashboard',
    audience: 'finance teams'
  });
  const nonMusicPacket = generatePromptPacket({
    idea: 'Build a TikTok analytics dashboard for agencies',
    audience: 'marketers'
  });
  const joined = nonMusicPacket.implementationPrompts.join('\n');
  assert.equal(nonMusicPacket.implementationPrompts.length, baseline.implementationPrompts.length);
  assert.ok(!joined.includes('cannot contain clickable hyperlinks'));
});

run('red-ocean scoring baseline, incremental keyword match, and case-insensitivity', () => {
  // Base score without any red-ocean keywords
  const basePacket = generatePromptPacket({ idea: 'A simple utility for organizing files' });
  assert.equal(basePacket.scores.redOcean, 30);

  // Single keyword match (+10)
  const singleMatch = generatePromptPacket({ idea: 'A generic utility for organizing files' });
  assert.equal(singleMatch.scores.redOcean, 40);

  // Two keywords match (+20)
  const doubleMatch = generatePromptPacket({ idea: 'A generic CRM utility for organizing files' });
  assert.equal(doubleMatch.scores.redOcean, 50);

  // Case-insensitive match (+10)
  const caseMatch = generatePromptPacket({ idea: 'A gEnErIc utility for organizing files' });
  assert.equal(caseMatch.scores.redOcean, 40);
});

run('red-ocean scoring exact-100 and over-100 clamping', () => {
  // All 7 keywords match: 30 + (7 * 10) = 100
  const allKeywords = generatePromptPacket({ idea: 'social chat todo note crm generic crypto utility' });
  assert.equal(allKeywords.scores.redOcean, 100);

  // clampScore correctly clamps values above 100
  assert.equal(clampScore(105), 100);
});
