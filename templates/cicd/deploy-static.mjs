#!/usr/bin/env node
// Deterministic static-export adapter to deploy.sh: package locally, without
// GitHub Actions, repository webhooks, external base images or model calls.
import { readFile, readdir, realpath, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// 2026-11-10 Codex: retain original catalog-only set; extend the same adapter.
// const products = new Set(['affiliate-hub', 'ai-video-toolkit', 'screen-recorder-finder']);
const products = new Set(['affiliate-hub', 'ai-video-toolkit', 'screen-recorder-finder', 'goap-swarm-console']);
const allowed = new Set(['', '.html', '.css', '.js', '.json', '.txt', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2']);
export async function packageStatic({ repoRoot, product, output }) {
  // 2026-11-10 Codex: original catalog-only validation retained for history.
  // if (!products.has(product)) throw new Error('Choose one of the three revenue catalog products');
  if (!products.has(product)) throw new Error('Choose one of the three revenue catalog products or goap-swarm-console');
  const productRoot = await realpath(join(repoRoot, 'products', product));
  const root = await realpath(join(productRoot, 'out'));
  if (relative(productRoot, root) !== 'out') throw new Error('Static export must be inside the selected product');
  const assets = {};
  let rawBytes = 0;
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in public exports');
      if (entry.name.startsWith('.')) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { await visit(path); continue; }
      // 2026-11-10 Codex: only GOAP's named public sales PDF extends asset scope.
      // if (!entry.isFile() || !allowed.has(extname(entry.name))) continue;
      const salesPdf = product === 'goap-swarm-console' && path === join(root, 'goap-agent-sales-deck.pdf');
      if (!entry.isFile() || (!allowed.has(extname(entry.name)) && !salesPdf)) continue;
      const body = await readFile(path);
      rawBytes += body.length;
      if (rawBytes > 10 * 1024 * 1024) throw new Error('Public export exceeds the 10 MiB packaging limit');
      const key = `/${relative(root, path).replaceAll('\\', '/')}`;
      assets[key] = { body: body.toString('base64'), etag: `"${createHash('sha256').update(body).digest('hex')}"` };
    }
  }
  await visit(root);
  // 2026-11-10 Codex: original three-product requirement retained and active below.
  // if (!assets['/index.html'] || !assets['/pricing.html'] || (!assets['/health'] && !assets['/health.json'])) throw new Error('Build must contain home, pricing and health artifacts');
  if (product === 'goap-swarm-console') {
    if (!assets['/index.html'] || !assets['/agent-as-fte.html'] || !assets['/agent-as-fte/deck.html'] || !assets['/goap-agent-sales-deck.pdf'] || (!assets['/health'] && !assets['/health.json'])) throw new Error('GOAP build must contain home, sales page, deck, PDF and health artifacts');
  } else if (!assets['/index.html'] || !assets['/pricing.html'] || (!assets['/health'] && !assets['/health.json'])) throw new Error('Build must contain home, pricing and health artifacts');
  const runtime = await readFile(new URL('./static-runtime.mjs', import.meta.url), 'utf8');
  const payload = gzipSync(Buffer.from(JSON.stringify(assets))).toString('base64');
  const source = `${runtime}\n// Generated exclusively from products/${product}/out.\nstartPackedSite(${JSON.stringify(payload)});\n`;
  if (Buffer.byteLength(source) > 5 * 1024 * 1024) throw new Error('Packed source exceeds the 5 MiB deployment limit');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, source, { flag: 'wx' });
  return { product, files: Object.keys(assets).length, rawBytes, bytes: Buffer.byteLength(source), sha256: createHash('sha256').update(source).digest('hex'), output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [product, destination] = process.argv.slice(2);
  if (!product || !destination) {
    console.error('Usage: node templates/cicd/deploy-static.mjs PRODUCT OUTPUT.mjs (run npm build in product first)'); process.exitCode = 2;
  } else {
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    try { console.log(JSON.stringify(await packageStatic({ repoRoot, product, output: resolve(destination) }))); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
