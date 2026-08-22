'use strict';
// Writes a README.md into every docs/<app>/ that has a verified-live GitHub
// Pages URL, so each project carries its own working test link.
//
// Why this exists: the owner asked for "a working link to test it, no matter
// what it is" on every project. Vercel is returning 402 DEPLOYMENT_DISABLED and
// oaudrey.com is parked, so GitHub Pages is the only live host — and it already
// serves every one of these for free.
//
// It also labels placeholders honestly. Most docs/<app>/index.html files are
// ~2KB generated stubs with nothing behind them. Publishing a link to a stub
// without saying so would be exactly the scaffolding AGENTS.md bans, so the
// README says which it is.
//
// Input: live.txt in this directory — lines of "<http-status> <app-name>",
// produced by curling each Pages URL. Only 200s are processed.
// Run: node .sandbox/claude-code-opus5/gen-preview-readmes.js

const fs = require('fs');
const path = require('path');

const here = __dirname;
const repoRoot = path.join(here, '..', '..');
const BASE = 'https://midnghtsapphire.github.io/revvel-standards';
const VERIFIED_ON = '2026-08-21';

const live = fs
  .readFileSync(path.join(here, 'live.txt'), 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('200'))
  .map((l) => l.trim().split(/\s+/)[1])
  .filter(Boolean);

let written = 0;
let stubs = 0;

for (const name of live) {
  const dir = path.join(repoRoot, 'docs', name);
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) continue;

  const url = `${BASE}/docs/${name}/`;
  const html = fs.readFileSync(indexPath, 'utf8');

  // A page under ~2.6KB whose <title> is the generated "<name> — Revvel app"
  // is a scaffold, not a product. Both conditions, so a genuinely small real
  // page isn't mislabelled.
  const isStub = html.length < 2600 && html.includes('— Revvel app</title>');
  if (isStub) stubs += 1;

  const hasSource = fs.existsSync(path.join(repoRoot, 'products', name));

  const status = isStub
    ? [
        '## Status: placeholder — do not share this link yet',
        '',
        'This page is a generated stub. It renders a heading and nothing else,',
        'so the link above loads but there is no working app behind it.',
        hasSource
          ? `Source scaffold lives in \`products/${name}/\` and still needs to be`
          : 'There is no source directory for this one yet, so it needs to be',
        'built before the link is worth showing anyone.',
      ].join('\n')
    : [
        '## Status: has real content',
        '',
        'This page renders an actual interface rather than a stub, so the link',
        'above is safe to share and test.',
      ].join('\n');

  const readmePath = path.join(dir, 'README.md');
  const previous = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, 'utf8').trim()
    : '';

  // Never clobber existing prose — keep it below the generated block. Demote
  // any H1 it carries to H2 first: this file already opens with "# <name>", and
  // a second top-level heading trips markdownlint MD025.
  const preservedBody = previous.replace(/^# (?!#)/gm, '## ');
  const preserved =
    previous && !previous.includes(url) ? `\n---\n\n${preservedBody}\n` : '';

  const body = [
    `# ${name}`,
    '',
    '## Live link',
    '',
    `<${url}>`,
    '',
    'Served by GitHub Pages from this repository via',
    '`.github/workflows/static.yml`, which deploys on every push to `main`.',
    'No Vercel project, no DigitalOcean app, no build step, no cost.',
    `Verified reachable ${VERIFIED_ON}.`,
    '',
    status,
    preserved,
  ].join('\n');

  fs.writeFileSync(readmePath, body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  written += 1;
}

console.log(`READMEs written : ${written}`);
console.log(`  real content  : ${written - stubs}`);
console.log(`  placeholders  : ${stubs}`);
