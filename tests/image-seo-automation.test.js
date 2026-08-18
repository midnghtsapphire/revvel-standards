'use strict';

/**
 * Regression tests for image SEO + LSI + release-banner automation pack.
 * Guards the headless control plane (no studio UI) for issue #16983.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BUILDER = path.join(ROOT, 'scripts/image-seo-build-pack.mjs');
const QA = path.join(ROOT, 'scripts/image-seo-filename-qa.mjs');
const AUTO_WR = path.join(ROOT, 'scripts/image-automation-auto-wr.mjs');

const REQUIRED_PATHS = [
  'standards/IMAGE_CREATION_SEO_AUTOMATION.md',
  'scripts/image-seo-build-pack.mjs',
  'scripts/image-seo-filename-qa.mjs',
  'scripts/image-automation-auto-wr.mjs',
  '.github/workflows/image-seo-pipeline.yml',
  '.github/workflows/release-banner-social.yml',
  '.github/workflows/image-seo-qa.yml',
  'workflows/blueprints/image-seo-pipeline.gumloop.json',
  'workflows/blueprints/release-banner-social.n8n.json',
  'workflows/blueprints/image-seo.zapier.json',
  'config/connections.image-automation.yml',
  'wr/pending/WR-image-seo-lsi-release-2026-08-05.md',
];

function loadEsm(rel) {
  return import(path.join(ROOT, rel));
}

function runNode(script, args = [], opts = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...opts,
  });
}

describe('image SEO automation pack presence', () => {
  for (const rel of REQUIRED_PATHS) {
    test(`required path exists: ${rel}`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    });
  }
});

describe('image-seo-build-pack', () => {
  test('slugify and unique helpers', async () => {
    const mod = await loadEsm('scripts/image-seo-build-pack.mjs');
    assert.equal(mod.slugify('Hello World!!'), 'hello-world');
    assert.deepEqual(mod.unique(['A', 'a', 'b', '']), ['a', 'b']);
  });

  test('buildPack emits image_creation/v1 with auto_merge false', async () => {
    const { buildPack } = await loadEsm('scripts/image-seo-build-pack.mjs');
    const pack = buildPack({
      topic: 'Release notes for automation kits',
      primaryKeyword: 'github release banner',
      kind: 'release_banner',
      secondaryKeywords: 'changelog, discord',
      pinnedLsi: ['release notes'],
      excludedLsi: ['spam term'],
      pageUrl: 'https://github.com/midnghtsapphire/revvel-standards/releases/tag/v1',
    });

    assert.equal(pack.schema, 'midnghtsapphire.image_creation/v1');
    assert.equal(pack.automation, true);
    assert.equal(pack.human_gate.auto_merge, false);
    assert.equal(pack.discovery.keywordStrategy.source, 'seed+cooccurrence');
    assert.equal(pack.seo.filename, 'github-release-banner-release-banner.webp');
    assert.match(pack.seo.altText, /github release banner/i);
    assert.equal(pack.seo.openGraph['og:image:width'], '1200');
    assert.ok(pack.discovery.keywordStrategy.lsi.includes('release notes'));
    assert.ok(pack.discovery.keywordStrategy.lsi.includes('changelog'));
    assert.ok(!pack.discovery.keywordStrategy.lsi.includes('spam term'));
    assert.match(pack.seo.openGraph['og:image'], /\/images\/github-release-banner-release-banner\.webp$/);
    assert.equal(pack.seo.jsonLd['@type'], 'ImageObject');
  });

  test('CLI writes pack JSON', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'image-seo-'));
    const brief = path.join(tmp, 'brief.json');
    const out = path.join(tmp, 'pack.json');
    fs.writeFileSync(
      brief,
      JSON.stringify({
        topic: 'Automation asset kits',
        primaryKeyword: 'automation asset generator',
        kind: 'og',
        pinnedLsi: ['image seo'],
      }),
    );
    const res = runNode(BUILDER, ['--brief', brief, '--out', out]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const pack = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(pack.seo.filename, 'automation-asset-generator-og.webp');
    assert.equal(pack.human_gate.auto_merge, false);
  });
});

describe('image-seo-filename-qa', () => {
  test('flags blocker basenames and passes SEO slugs', async () => {
    const { findBadFilenames, filterImagePaths } = await loadEsm('scripts/image-seo-filename-qa.mjs');
    const { isNonSeoFilename, buildPack } = await loadEsm('scripts/image-seo-build-pack.mjs');
    const paths = filterImagePaths([
      'assets/IMG_1234.png',
      'public/DSC_0001.jpg',
      'x/Screenshot-1.webp',
      'y/image.png',
      'z/readme.md',
      'ok/github-release-banner-og.webp',
      'ok/image-seo-guide-og.webp',
    ]);
    assert.deepEqual(
      paths.filter((p) => p.endsWith('.md')),
      [],
    );
    const bad = findBadFilenames([
      'assets/IMG_1234.png',
      'public/DSC_0001.jpg',
      'x/Screenshot-1.webp',
      'y/image.png',
      'y/image_1.jpg',
      'ok/github-release-banner-og.webp',
      'ok/image-seo-guide-og.webp',
    ]);
    assert.equal(bad.length, 5);
    assert.ok(bad.every((b) => b.basename));
    assert.equal(isNonSeoFilename('image-seo-guide-og.webp'), false);
    // primaryKeyword starting with "image" must still build
    const pack = buildPack({ primaryKeyword: 'image seo guide', kind: 'og', topic: 'Image SEO' });
    assert.equal(pack.seo.filename, 'image-seo-guide-og.webp');
  });

  test('CLI exits 1 on bad names and 0 on good', () => {
    const bad = runNode(QA, ['assets/IMG_999.png']);
    assert.equal(bad.status, 1);
    const good = runNode(QA, ['assets/automation-asset-generator-og.webp']);
    assert.equal(good.status, 0, good.stderr || good.stdout);
  });
});

describe('workflows enforce automation-first gates', () => {
  function readWf(name) {
    return fs.readFileSync(path.join(ROOT, '.github/workflows', name), 'utf8');
  }

  test('image-seo-pipeline is draft-only and SHA-pinned', () => {
    const y = readWf('image-seo-pipeline.yml');
    assert.match(y, /^name:\s*image-seo-pipeline\s*$/m);
    assert.match(y, /draft:\s*true/);
    assert.match(y, /schedule:/);
    assert.match(y, /workflow_dispatch:/);
    assert.match(y, /image-seo-build-pack\.mjs/);
    assert.match(y, /peter-evans\/create-pull-request@[0-9a-f]{40}/);
    assert.match(y, /actions\/upload-artifact@[0-9a-f]{40}/);
    assert.match(y, /Open WR on failure/);
    assert.doesNotMatch(y, /auto[_-]merge:\s*true/i);
  });

  test('release-banner-social builds pack and safe Discord payload', () => {
    const y = readWf('release-banner-social.yml');
    assert.match(y, /^name:\s*release-banner-social\s*$/m);
    assert.match(y, /release:/);
    assert.match(y, /image-seo-build-pack\.mjs/);
    assert.match(y, /DISCORD_WEBHOOK_URL/);
    // Payload must be built via JSON.stringify, not raw shell interpolation
    assert.match(y, /JSON\.stringify\(\{\s*content:/);
    assert.match(y, /Open WR on failure/);
  });

  test('image-seo-qa uses shared filename QA script', () => {
    const y = readWf('image-seo-qa.yml');
    assert.match(y, /^name:\s*image-seo-qa\s*$/m);
    assert.match(y, /image-seo-filename-qa\.mjs/);
    assert.match(y, /fetch-depth:\s*0/);
    assert.match(y, /"\$\{files\[@\]\}"/);
  });
});

describe('connections + blueprints', () => {
  test('connections.image-automation.yml lists secret names only', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'config/connections.image-automation.yml'), 'utf8');
    assert.match(raw, /DISCORD_WEBHOOK_URL/);
    assert.match(raw, /TWITTER_CONSUMER_API_KEY/);
    assert.match(raw, /OPENROUTER_API_KEY/);
    assert.match(raw, /GUMLOOP_API_KEY/);
    assert.match(raw, /auto_merge:\s*false/);
    // No accidental secret-looking assignments
    assert.doesNotMatch(raw, /\bsk-[a-zA-Z0-9]{20,}\b/);
    assert.doesNotMatch(raw, /xox[baprs]-/);
  });

  test('blueprints keep auto_merge false and no embedded secrets', () => {
    const files = [
      'workflows/blueprints/image-seo-pipeline.gumloop.json',
      'workflows/blueprints/release-banner-social.n8n.json',
      'workflows/blueprints/image-seo.zapier.json',
    ];
    for (const rel of files) {
      const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const json = JSON.parse(raw);
      assert.ok(json);
      assert.doesNotMatch(raw, /\bsk-[a-zA-Z0-9]{20,}\b/);
      assert.doesNotMatch(raw, /DISCORD_WEBHOOK_URL\s*[:=]\s*['\"]https?:\/\//);
    }
    const gum = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'workflows/blueprints/image-seo-pipeline.gumloop.json'), 'utf8'),
    );
    assert.equal(gum.human_gate.auto_merge, false);
  });
});

describe('standard + auto-wr', () => {
  test('standard forbids studio as production control plane', () => {
    const md = fs.readFileSync(path.join(ROOT, 'standards/IMAGE_CREATION_SEO_AUTOMATION.md'), 'utf8');
    assert.match(md, /AUTOMATION_FIRST_STACK/);
    assert.match(md, /dev\/debug only/i);
    assert.match(md, /image-seo-build-pack\.mjs/);
    assert.match(md, /Never auto-merge/i);
    // Closing fence must not be ```text
    assert.doesNotMatch(md, /```text\s*$/m);
  });

  test('auto-wr re-emits manifest with zero missing', (t) => {
    // Run the generator somewhere disposable.
    //
    // `image-automation-auto-wr.mjs` sets `const ROOT = process.cwd()` and writes
    // its artifacts under that root, so running it with `cwd: ROOT` — as this
    // test used to — regenerated two TRACKED files on every `npm test`:
    // artifacts/image-automation/formal-wr-manifest.json and package.json. The
    // suite left the working tree dirty, so `git status` after a test run
    // reported changes nobody made, and a real accidental edit in that directory
    // would have been invisible among them.
    //
    // The inputs are symlinked but `scripts/` is COPIED, and that distinction is
    // load-bearing. image-seo-build-pack.mjs guards its entry point with
    //
    //   path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    //
    // which is false when it is reached through a symlink, because argv[1] is
    // the link and import.meta.url is the target. Under a symlinked scripts/ the
    // builder silently does nothing, still exits 0, and the parent reports
    // `ok: true` — so this test would pass while generating no package.json at
    // all. Copying keeps both paths identical and the builder actually runs.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'image-auto-wr-'));
    t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

    fs.cpSync(path.join(ROOT, 'scripts'), path.join(tmp, 'scripts'), { recursive: true });
    for (const dir of ['wr', 'standards', '.github', 'workflows', 'config', 'tests']) {
      fs.symlinkSync(path.join(ROOT, dir), path.join(tmp, dir));
    }

    const res = runNode(path.join(tmp, 'scripts/image-automation-auto-wr.mjs'), [], { cwd: tmp });
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(tmp, 'artifacts/image-automation/formal-wr-manifest.json'), 'utf8'),
    );
    assert.equal(manifest.auto_merge, false);
    assert.equal(manifest.human_review_required, true);
    assert.deepEqual(manifest.missing, []);

    // The builder must actually have produced its pack. Without this the
    // symlink trap above returns silently and every assertion still passes.
    assert.ok(
      fs.existsSync(path.join(tmp, 'artifacts/image-automation/package.json')),
      'the spawned builder must write its pack — a missing file here means it ' +
        'no-opped and exited 0'
    );
  });
});
