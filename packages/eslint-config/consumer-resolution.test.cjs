const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { buildConfig } = require('./index.js');

test('two isolated consuming products resolve their own Next peer configs', () => {
  const root = mkdtempSync(join(tmpdir(), 'revvel-eslint-consumer-'));
  for (const name of ['affiliate', 'video']) {
    const directory = join(root, name);
    const peer = join(directory, 'node_modules', 'eslint-config-next');
    mkdirSync(peer, { recursive: true });
    writeFileSync(join(directory, 'package.json'), '{}');
    writeFileSync(join(peer, 'package.json'), JSON.stringify({ name: 'eslint-config-next', version: '16.0.0' }));
    writeFileSync(join(peer, 'core-web-vitals.js'), `module.exports = [{ name: '${name}/core' }];`);
    writeFileSync(join(peer, 'typescript.js'), `module.exports = [{ name: '${name}/typescript' }];`);
    const config = buildConfig({ baseDirectory: directory });
    assert.equal(config[1].name, `${name}/core`);
    assert.equal(config[2].name, `${name}/typescript`);
  }
});
