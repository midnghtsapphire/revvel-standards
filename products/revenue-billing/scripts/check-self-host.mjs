#!/usr/bin/env node
/** Static policy checks for self-host/ (WR #18333). Zero dependencies; no
 * Docker needed, so it runs in plain CircleCI. YAML syntax is checked separately
 * (npx js-yaml). Exits 1 listing every violation.
 */
import { readFile } from 'node:fs/promises';

const dir = new URL('../self-host/', import.meta.url);
const compose = await readFile(new URL('docker-compose.yml', dir), 'utf8');
const env = await readFile(new URL('.env.example', dir), 'utf8');
const problems = [];

// 1. Every image is pinned to an exact tag; never latest/current/stable/volatile.
const images = [...compose.matchAll(/^\s*(?:image:\s*)(\S+)\s*$/gm)].map(m => m[1]);
if (images.length < 5) problems.push(`expected at least 5 image: lines, found ${images.length}`);
for (const image of images) {
  const tag = image.split('/').pop().split(':')[1];
  if (!tag) problems.push(`image without a tag: ${image}`);
  else if (/^(latest|current|stable|volatile|main|master)$/i.test(tag)) problems.push(`floating image tag: ${image}`);
}

// 2. No vendor sample secrets copied from upstream defaults.
for (const bad of ['changeme', 'your-secret-key-base', 'your-encryption', 'azerty123456']) {
  if (compose.includes(bad) || env.includes(bad)) problems.push(`vendor default secret text present: ${bad}`);
}

// 3. Required secrets use ${VAR:?message} and are blank in .env.example.
const required = ['POSTGRES_PASSWORD', 'SECRET_KEY_BASE', 'LAGO_RSA_PRIVATE_KEY', 'LAGO_ENCRYPTION_PRIMARY_KEY', 'LAGO_ENCRYPTION_DETERMINISTIC_KEY', 'LAGO_ENCRYPTION_KEY_DERIVATION_SALT'];
for (const name of required) {
  if (!new RegExp(`\\$\\{${name}:\\?`).test(compose)) problems.push(`${name} must be required with \${${name}:?...}`);
  if (new RegExp(`\\$\\{${name}:-`).test(compose)) problems.push(`${name} must not have a default`);
  const line = env.split('\n').find(l => l.startsWith(`${name}=`));
  if (line === undefined) problems.push(`${name} missing from .env.example`);
  else if (line.trim() !== `${name}=`) problems.push(`${name} must be blank in .env.example`);
}

// 4. Published ports bind loopback only; db and redis publish nothing.
for (const m of compose.matchAll(/^\s*-\s*(["']?)([^\s"']*:\d+)\1\s*$/gm)) {
  if (/^\$\{|^\d/.test(m[2]) && !m[2].startsWith('127.0.0.1:')) problems.push(`port not bound to 127.0.0.1: ${m[2]}`);
}
const services = compose.split(/^services:\s*$/m)[1] ?? '';
for (const name of ['db', 'redis', 'pdf']) {
  const block = services.split(new RegExp(`^  ${name}:\\s*$`, 'm'))[1]?.split(/^  \S/m)[0] ?? '';
  if (!block) problems.push(`service ${name} not found`);
  else if (/^\s{4}ports:/m.test(block)) problems.push(`service ${name} must not publish ports`);
}

// 5. .env.example holds names only: nothing that looks like a live key.
for (const line of env.split('\n')) {
  if (line.startsWith('#') || !line.includes('=')) continue;
  const value = line.slice(line.indexOf('=') + 1).trim();
  if (/^(sk|pk|rk|whsec)_/.test(value) || value.length > 40) problems.push(`suspicious value in .env.example: ${line.split('=')[0]}`);
}

if (problems.length) { console.error(`self-host policy violations:\n - ${problems.join('\n - ')}`); process.exit(1); }
console.log(`self-host policy ok: ${images.length} images pinned, ${required.length} required secrets blank, ports loopback-only.`);
