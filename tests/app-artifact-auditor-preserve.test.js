'use strict';

/**
 * Regression: re-running app_artifact_auditor must not clobber custom docs SPAs
 * (caspian-channel-console) or wipe README notes under ## Live Deployment.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const AUDITOR = path.join(ROOT, 'scripts', 'app_artifact_auditor.py');

function py(code) {
  const r = spawnSync('python3', ['-c', code], { encoding: 'utf8', cwd: ROOT });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return (r.stdout || '').trim();
}

test('auditor_owned is false for custom pages without the auditor marker', () => {
  const out = py(`
import importlib.util, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('aud', ${JSON.stringify(AUDITOR)})
aud = importlib.util.module_from_spec(spec); spec.loader.exec_module(aud)
td = Path(tempfile.mkdtemp())
custom = td / 'index.html'
custom.write_text('<html>custom spa</html>')
assert aud.auditor_owned(str(custom)) is False
custom.write_text('served by app_artifact_auditor.py yes')
assert aud.auditor_owned(str(custom)) is True
assert aud.auditor_owned(str(td / 'missing.html')) is True
print('ok')
`);
  assert.equal(out, 'ok');
});

test('ensure_readme_link swaps URL in-place and keeps section notes', () => {
  const out = py(`
import importlib.util, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('aud', ${JSON.stringify(AUDITOR)})
aud = importlib.util.module_from_spec(spec); spec.loader.exec_module(aud)
td = Path(tempfile.mkdtemp())
app = td / 'demo'
app.mkdir()
readme = app / 'README.md'
readme.write_text('# Demo\\n\\n## Live Deployment\\n\\n▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/demo/)**\\n\\nKeep this note.\\n\\n## Next\\n\\nx\\n')
aud.ROOT = str(td)
aud.ensure_readme_link({'path': 'demo'}, True, 'https://midnghtsapphire.github.io/revvel-standards/docs/demo/')
body = readme.read_text()
assert 'Keep this note.' in body
assert 'github.io/revvel-standards/docs/demo/' in body
assert 'vercel.app' not in body
assert body.count('Open the live app') == 1
print('ok')
`);
  assert.equal(out, 'ok');
});

test('ensure_readme_link handles button with no space before bold close', () => {
  const out = py(`
import importlib.util, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('aud', ${JSON.stringify(AUDITOR)})
aud = importlib.util.module_from_spec(spec); spec.loader.exec_module(aud)
td = Path(tempfile.mkdtemp())
app = td / 'demo'
app.mkdir()
readme = app / 'README.md'
readme.write_text('# Demo\\n\\n## Live Deployment\\n\\n▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/demo/)**\\n\\nKeep.\\n')
aud.ROOT = str(td)
aud.ensure_readme_link({'path': 'demo'}, True, 'https://midnghtsapphire.github.io/revvel-standards/docs/demo/')
body = readme.read_text()
assert body.count('Open the live app') == 1, body
assert 'github.io/revvel-standards/docs/demo/' in body
assert 'Keep.' in body
assert 'vercel.app' not in body
print('ok')
`);
  assert.equal(out, 'ok');
});

test('caspian docs SPA on disk is not auditor-owned (must stay custom)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'docs/caspian-channel-console/index.html'), 'utf8');
  assert.ok(!html.includes('app_artifact_auditor.py'), 'caspian index must remain the custom SPA');
  assert.ok(html.length > 2000, 'caspian index should be the full SPA, not the short auditor stub');
});
