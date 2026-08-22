import assert from 'node:assert/strict';
import {
  SURFACE_CATALOG,
  answerLine,
  buildImageRefs,
  buildReport,
  externalSetupSteps,
  shippedReport,
  toGhcrSlug,
} from '../lib/ghcr';

{
  assert.ok(SURFACE_CATALOG.length >= 10);
  const ids = new Set(SURFACE_CATALOG.map((s) => s.id));
  assert.ok(ids.has('publish-workflow'));
  assert.ok(ids.has('product-dockerfile'));
  assert.ok(ids.has('status-product'));
  assert.ok(ids.has('secrets-map'));
}

{
  const empty = buildReport({});
  assert.equal(empty.wired, false);
  assert.equal(empty.passed, 0);
  assert.match(answerLine(empty), /^NO/);
}

{
  const full = shippedReport();
  assert.equal(full.wired, true);
  assert.equal(full.passed, full.total);
  assert.match(answerLine(full), /^YES/);
  assert.match(full.summary, /IS wired/);
  assert.match(full.image, /^ghcr\.io\//);
}

{
  assert.equal(toGhcrSlug('MIDNGHTSAPPHIRE'), 'midnghtsapphire');
  const refs = buildImageRefs({ tag: 'v1.0.0' });
  assert.equal(refs.tagged, 'ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:v1.0.0');
  assert.match(refs.pull, /^docker pull /);
}

{
  const steps = externalSetupSteps();
  assert.ok(steps.length >= 5);
  assert.ok(steps.every((s) => s.href.startsWith('https://')));
}

console.log('✅ ghcr-console product tests passed.');
