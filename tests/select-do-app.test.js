'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('selectDoApp creates, updates, or refuses duplicates', async () => {
  const { selectDoApp } = await import(pathToFileURL(path.join(
    __dirname,
    '../.circleci/scripts/select-do-app.mjs',
  )).href);
  assert.deepEqual(selectDoApp([], 'affiliate-hub'), { action: 'create' });
  assert.deepEqual(
    selectDoApp([{ id: 'app-1', spec: { name: 'affiliate-hub' } }], 'affiliate-hub'),
    { action: 'update', id: 'app-1' },
  );
  const refused = selectDoApp([
    { id: 'app-1', spec: { name: 'affiliate-hub' } },
    { id: 'app-2', spec: { name: 'affiliate-hub' } },
  ], 'affiliate-hub');
  assert.equal(refused.action, 'refuse');
  assert.deepEqual(refused.ids, ['app-1', 'app-2']);
  assert.deepEqual(
    selectDoApp([{ id: 'other', spec: { name: 'ai-video-toolkit' } }], 'affiliate-hub'),
    { action: 'create' },
  );
  assert.equal(selectDoApp({ not: 'an array' }, 'affiliate-hub').reason, 'app_list_not_array');
});
