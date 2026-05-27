'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const {
  generatePromptPacket,
  packetToMarkdown,
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

run('red-ocean base score is 30', () => {
  const p = generatePromptPacket({ idea: 'unique innovative idea' });
  assert.equal(p.scores.redOcean, 30);
});

run('red-ocean score boosts on keywords', () => {
  const p = generatePromptPacket({ idea: 'social chat app' });
  // 30 + 10 (social) + 10 (chat) = 50
  assert.equal(p.scores.redOcean, 50);
});

run('red-ocean scoring is case-insensitive', () => {
  const p = generatePromptPacket({ idea: 'SOCIAL CHAT' });
  assert.equal(p.scores.redOcean, 50);
});

run('red-ocean score is capped at 100', () => {
  // All 7 keywords: social, chat, todo, note, crm, generic, crypto
  const p = generatePromptPacket({ idea: 'social chat todo note crm generic crypto extra' });
  assert.equal(p.scores.redOcean, 100);
});
