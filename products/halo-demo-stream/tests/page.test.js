import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer } from './helpers.js';

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('demo page loads in under 2 s (cold server start + page + its script)', async () => {
  const t0 = performance.now();
  const s = await startServer();
  try {
    const page = await fetch(`${s.base}/`);
    const html = await page.text();
    const script = await fetch(`${s.base}/agui.js`);
    await script.text();
    const ms = performance.now() - t0;
    assert.equal(page.status, 200);
    assert.equal(script.status, 200);
    assert.match(html, /affiliate-hub live demo/);
    assert.ok(ms < 2000, `cold start + page + script took ${Math.round(ms)} ms`);
    console.log(`# page load (cold start included): ${Math.round(ms)} ms, ${html.length} bytes`);
  } finally {
    await s.close();
  }
});

test('page is self-contained: no third-party requests', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const external = [...html.matchAll(/(?:src|href)=["'](https?:)?\/\/[^"']+["']|url\(\s*https?:/g)];
  assert.equal(external.length, 0);
});

test('every text/background pair in the page CSS is at least 7:1 (low-vision requirement)', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const v = Object.fromEntries([...html.matchAll(/--c-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
  const pairs = [
    ['text', 'bg'], ['muted', 'bg'], ['link', 'bg'], ['error', 'bg'], ['ok', 'bg'],
    ['text', 'panel'], ['button-text', 'button-bg'],
  ];
  for (const [fg, bg] of pairs) {
    assert.ok(v[fg] && v[bg], `missing ${fg}/${bg}`);
    const ratio = contrast(v[fg], v[bg]);
    console.log(`# contrast ${fg} ${v[fg]} on ${bg} ${v[bg]} = ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 7, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
  assert.match(html, /::placeholder\s*\{[^}]*var\(--c-muted\)[^}]*opacity:\s*1/, 'placeholder text must not use the browser default grey');
  // No colour literals outside the audited variables.
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const stray = [...css.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0]).filter((c) => !Object.values(v).includes(c));
  assert.deepEqual(stray, []);
});
