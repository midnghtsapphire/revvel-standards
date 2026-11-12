// Pick the DigitalOcean app whose spec name matches this product.
// Create when there is none. Update when there is one. Refuse when two apps
// share the name — guessing which one to update can point a domain at the
// wrong app. Added 2026-11-11 by MarketShipper.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function selectDoApp(apps, name) {
  if (!Array.isArray(apps)) {
    return { action: 'refuse', reason: 'app_list_not_array' };
  }
  const matches = apps.filter((app) => app
    && app.spec
    && app.spec.name === name
    && typeof app.id === 'string'
    && app.id.length > 0);
  if (matches.length === 0) return { action: 'create' };
  if (matches.length > 1) {
    return { action: 'refuse', reason: 'duplicate_app_name', ids: matches.map((app) => app.id) };
  }
  return { action: 'update', id: matches[0].id };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const name = process.argv[2];
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    process.stderr.write('product name is required\n');
    process.exit(2);
  }
  const raw = readFileSync(0, 'utf8').trim();
  const apps = raw ? JSON.parse(raw) : [];
  const decision = selectDoApp(apps, name);
  process.stdout.write(JSON.stringify(decision));
  if (decision.action === 'refuse') process.exit(2);
}
