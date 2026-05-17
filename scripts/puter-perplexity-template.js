#!/usr/bin/env node
/**
 * Generates a keyless Puter.js + Perplexity research widget.
 *
 * Usage:
 *   node scripts/puter-perplexity-template.js [--out path] [--title "..."]
 *
 * The generated HTML:
 *   - Loads Puter.js from the canonical CDN (https://js.puter.com/v2/).
 *   - Streams Perplexity Sonar responses via puter.ai.chat().
 *   - Exposes a model selector across supported Perplexity model IDs.
 *   - Renders model output via textContent (never innerHTML).
 *   - Contains zero embedded API keys or secrets.
 *   - Ships with a minimum-permissive Content-Security-Policy.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SUPPORTED_MODELS = [
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'perplexity/sonar-reasoning',
  'perplexity/sonar-reasoning-pro',
  'perplexity/sonar-deep-research',
];

const DEFAULT_MODEL = 'perplexity/sonar';
const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOptions(models, selected) {
  return models
    .map((m) => {
      const sel = m === selected ? ' selected' : '';
      return `        <option value="${escapeHtml(m)}"${sel}>${escapeHtml(m)}</option>`;
    })
    .join('\n');
}

function generateWidget(options = {}) {
  const {
    title = 'Perplexity Research Widget (Keyless via Puter.js)',
    models = SUPPORTED_MODELS,
    defaultModel = DEFAULT_MODEL,
  } = options;

  if (!Array.isArray(models) || models.length === 0) {
    throw new Error('models must be a non-empty array');
  }
  for (const m of models) {
    if (typeof m !== 'string' || !m.startsWith('perplexity/')) {
      throw new Error(`Unsupported model id: ${m}`);
    }
  }
  if (!models.includes(defaultModel)) {
    throw new Error(`defaultModel ${defaultModel} not in models list`);
  }

  const optionsHtml = buildOptions(models, defaultModel);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://js.puter.com; connect-src 'self' https://api.puter.com https://*.puter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    .notice { font-size: 0.85rem; opacity: 0.75; margin-bottom: 1rem; }
    label { display: block; font-size: 0.85rem; margin-top: 0.75rem; }
    select, textarea, button { font: inherit; width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }
    textarea { min-height: 5rem; }
    button { margin-top: 0.75rem; cursor: pointer; }
    #out { white-space: pre-wrap; margin-top: 1rem; padding: 0.75rem; border: 1px solid currentColor; border-radius: 4px; min-height: 4rem; }
    .status { font-size: 0.8rem; opacity: 0.7; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="notice">
    Powered by <a href="https://puter.com" rel="noopener noreferrer" target="_blank">Puter.js</a>.
    Calls run under your Puter account (user-pays). No API keys are stored in this page.
  </p>

  <label for="model">Model</label>
  <select id="model">
${optionsHtml}
  </select>

  <label for="prompt">Question</label>
  <textarea id="prompt" placeholder="Ask a research question..."></textarea>

  <button id="ask" type="button">Ask</button>
  <div class="status" id="status" aria-live="polite"></div>

  <h2 style="font-size:1rem;margin-top:1.25rem;">Response</h2>
  <div id="out" role="region" aria-live="polite"></div>

  <script src="${PUTER_SCRIPT_URL}"></script>
  <script>
    (function () {
      'use strict';
      var promptEl = document.getElementById('prompt');
      var modelEl = document.getElementById('model');
      var outEl = document.getElementById('out');
      var statusEl = document.getElementById('status');
      var btn = document.getElementById('ask');

      function setStatus(text) { statusEl.textContent = text; }

      async function ask() {
        var prompt = promptEl.value.trim();
        if (!prompt) { setStatus('Enter a question first.'); return; }
        if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
          setStatus('Puter.js failed to load.');
          return;
        }
        outEl.textContent = '';
        setStatus('Streaming...');
        btn.disabled = true;
        try {
          var resp = await puter.ai.chat(prompt, {
            model: modelEl.value,
            stream: true
          });
          for await (var part of resp) {
            // Safe rendering: textContent only, never innerHTML.
            outEl.textContent += (part && part.text) ? part.text : '';
          }
          setStatus('Done.');
        } catch (err) {
          setStatus('Error: ' + (err && err.message ? err.message : String(err)));
        } finally {
          btn.disabled = false;
        }
      }

      btn.addEventListener('click', ask);
    }());
  </script>
</body>
</html>
`;
}

function parseArgs(argv) {
  const args = { out: 'templates/puter/perplexity-research-widget.html' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) { args.out = argv[i + 1]; i += 1; }
    else if (a === '--title' && argv[i + 1]) { args.title = argv[i + 1]; i += 1; }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const html = generateWidget({ title: args.title });
  const outPath = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
}

module.exports = {
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  PUTER_SCRIPT_URL,
  generateWidget,
  escapeHtml,
};

if (require.main === module) {
  main();
}
