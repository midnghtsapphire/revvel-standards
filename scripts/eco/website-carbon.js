#!/usr/bin/env node
'use strict';
/**
 * website-carbon.js - website carbon report that works without the removed
 * Website Carbon /site endpoint. Replaces the fetch inside
 * .github/workflows/green-website.yml (billing-locked, and also broken for a
 * second reason: https://api.websitecarbon.com/site has had no public access
 * since 2025-07-14; only /data is public. Verified 2026-11-19: /site -> 401).
 *
 * How: (1) download the page and the assets it links, summing the bytes that
 * crossed the wire (curl --compressed); (2) ask the Green Web Foundation if the
 * host is green; (3) call the public /data endpoint with those two numbers.
 *
 * LIMITS: static analysis of the initial HTML, not a headless-browser load.
 * Assets requested by running JavaScript (fonts from CSS @font-face, fetch()
 * calls, lazy images) are not counted, so the figure is a floor.
 *
 * Usage: node scripts/eco/website-carbon.js [--url URL] [--out DIR]
 *   URL comes from --url or $GREEN_WEBSITE_URL. There is deliberately no
 *   default: the old default (https://midnghtsapphire.github.io/revvel-standards/)
 *   is a 404 because GitHub Pages is not enabled on this repo, and
 *   https://oaudrey.com/ is a 106-byte JS redirect stub (checked 2026-11-19), so
 *   either would produce a meaningless score.
 * Output: DIR/carbon.json (keeps top-level cleanerThan/gco2e/rating, so the
 * README card logic in green-website.yml can read it unchanged).
 *
 * Exit: 0 report written; 1 page unreachable or API unusable (never writes a
 * made-up number); 2 bad arguments.
 */
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const execFileP = promisify(execFile);

const MAX_ASSETS = 60;

function resolveAssetUrls(html, baseUrl) {
  const found = new Set();
  const add = (raw) => {
    if (!raw) return;
    const v = raw.trim();
    if (!v || v.startsWith('data:') || v.startsWith('#') || v.startsWith('javascript:') || v.startsWith('mailto:')) return;
    try {
      const u = new URL(v, baseUrl);
      if (u.protocol === 'http:' || u.protocol === 'https:') { u.hash = ''; found.add(u.href); }
    } catch { /* unparseable reference: skip */ }
  };
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (/\brel\s*=\s*["'][^"']*(stylesheet|icon|preload|modulepreload)[^"']*["']/i.test(tag)) {
      const h = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (h) add(h[1]);
    }
  }
  for (const m of html.matchAll(/<(?:img|source|video|audio|iframe)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  return [...found].slice(0, MAX_ASSETS);
}

async function curlBytes(url, bodyFile) {
  // size_download is the on-the-wire byte count for the response body
  // (compressed when --compressed negotiated gzip/br).
  const args = ['-sS', '-L', '--max-time', '30', '--max-filesize', '20000000', '--compressed',
    '-A', 'revvel-eco-run/1', '-o', bodyFile || '/dev/null', '-w', '%{http_code} %{size_download}', url];
  const { stdout } = await execFileP('curl', args, { maxBuffer: 1 << 20 });
  const [code, size] = stdout.trim().split(' ');
  return { status: Number(code), bytes: Number(size) };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'revvel-eco-run/1' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function run({ url, outDir, curl = curlBytes, json = getJson, now = () => new Date() }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eco-wc-'));
  const htmlFile = path.join(tmp, 'page.html');
  const page = await curl(url, htmlFile);
  if (page.status < 200 || page.status >= 300) {
    throw new Error(`page ${url} returned HTTP ${page.status}`);
  }
  const html = fs.readFileSync(htmlFile, 'utf8');
  const assets = resolveAssetUrls(html, url);
  let total = page.bytes;
  const failed = [];
  for (const a of assets) {
    try {
      const r = await curl(a, null);
      if (r.status >= 200 && r.status < 300) total += r.bytes; else failed.push({ url: a, status: r.status });
    } catch (e) {
      failed.push({ url: a, error: String(e.message || e).slice(0, 120) });
    }
  }
  const host = new URL(url).hostname;
  let green = 0;
  let greenSource = 'thegreenwebfoundation.org greencheck';
  try {
    const g = await json(`https://api.thegreenwebfoundation.org/greencheck/${encodeURIComponent(host)}`);
    green = g && g.green ? 1 : 0;
  } catch (e) {
    greenSource = `unavailable (${String(e.message || e).slice(0, 80)}); assumed not green`;
  }
  const api = await json(`https://api.websitecarbon.com/data?bytes=${total}&green=${green}`);
  if (typeof api.gco2e !== 'number') throw new Error('Website Carbon /data response had no numeric gco2e');
  const report = {
    schema: 'revvel-website-carbon/1',
    url,
    measured_at: now().toISOString(),
    method: 'static page-weight: HTML + linked assets, wire bytes via curl --compressed; green flag from Green Web Foundation; emissions from Website Carbon /data',
    limits: 'initial HTML only; JavaScript-requested and CSS-referenced assets are not counted (figure is a floor)',
    bytes: total,
    page_bytes: page.bytes,
    asset_count: assets.length,
    asset_failures: failed,
    green,
    green_source: greenSource,
    gco2e: api.gco2e,
    rating: api.rating,
    cleanerThan: api.cleanerThan,
    statistics: api.statistics,
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'carbon.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.rmSync(tmp, { recursive: true, force: true });
  return report;
}

async function main(argv) {
  let url = process.env.GREEN_WEBSITE_URL || '';
  let outDir = process.env.ECO_OUT_DIR || 'eco-out';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url') url = argv[++i];
    else if (argv[i] === '--out') outDir = argv[++i];
    else { console.error(`unknown argument: ${argv[i]}`); return 2; }
  }
  if (!/^https?:\/\//.test(url || '')) { console.error('set GREEN_WEBSITE_URL or pass --url (must start with http:// or https://)'); return 2; }
  try {
    const r = await run({ url, outDir });
    console.log(`${r.url}: ${r.bytes} bytes over ${r.asset_count + 1} requests, green=${r.green}, ${r.gco2e.toFixed(3)} gCO2e/view, rating ${r.rating}, cleaner than ${Math.round(r.cleanerThan * 100)}%`);
    return 0;
  } catch (e) {
    console.error(`website-carbon: ${e.message}`);
    return 1;
  }
}

if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c));
module.exports = { resolveAssetUrls, run };
