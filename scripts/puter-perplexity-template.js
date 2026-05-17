#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/';
const DEFAULT_MODEL = 'perplexity/sonar';
const DEFAULT_OUTPUT_FILE = path.join(__dirname, '..', 'templates', 'puter', 'perplexity-research-widget.html');

const SUPPORTED_PUTER_PERPLEXITY_MODELS = Object.freeze([
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'perplexity/sonar-pro-search',
  'perplexity/sonar-deep-research',
  'perplexity/sonar-reasoning-pro'
]);

const MODEL_LABELS = Object.freeze({
  'perplexity/sonar': 'Sonar - general web research',
  'perplexity/sonar-pro': 'Sonar Pro - professional research',
  'perplexity/sonar-pro-search': 'Sonar Pro Search - search-heavy research',
  'perplexity/sonar-deep-research': 'Sonar Deep Research - comprehensive briefs',
  'perplexity/sonar-reasoning-pro': 'Sonar Reasoning Pro - analytical frameworks'
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertSupportedModel(model) {
  if (!SUPPORTED_PUTER_PERPLEXITY_MODELS.includes(model)) {
    throw new Error(`Unsupported Puter Perplexity model: ${model}`);
  }
}

function renderModelOptions(selectedModel = DEFAULT_MODEL) {
  assertSupportedModel(selectedModel);

  return SUPPORTED_PUTER_PERPLEXITY_MODELS.map((model) => {
    const selected = model === selectedModel ? ' selected' : '';
    return `              <option value="${escapeHtml(model)}"${selected}>${escapeHtml(MODEL_LABELS[model])}</option>`;
  }).join('\n');
}

function buildPuterPerplexityHtml(options = {}) {
  const title = options.title || 'Revvel Puter Perplexity Research Widget';
  const defaultPrompt = options.defaultPrompt ||
    'Research the market, competitors, risks, and implementation path for a no-key AI research feature.';
  const selectedModel = options.selectedModel || DEFAULT_MODEL;
  assertSupportedModel(selectedModel);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline' https://js.puter.com; connect-src 'self' https://*.puter.com https://*.puter.site; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://puter.com https://*.puter.com; base-uri 'none'; form-action 'none'"
    >
    <title>${escapeHtml(title)}</title>
    <script src="${PUTER_SCRIPT_URL}"></script>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        background: #08111f;
        color: #f7fafc;
      }

      main {
        width: min(920px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0;
      }

      .panel {
        background: #111c2e;
        border: 1px solid #2f3e56;
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(1.75rem, 4vw, 2.75rem);
      }

      p {
        color: #c8d4e5;
        line-height: 1.6;
      }

      label {
        display: block;
        font-weight: 700;
        margin: 18px 0 8px;
      }

      textarea,
      select,
      button {
        width: 100%;
        border-radius: 12px;
        border: 1px solid #3c4e6a;
        box-sizing: border-box;
        font: inherit;
      }

      textarea,
      select {
        background: #0b1424;
        color: #f7fafc;
        padding: 12px;
      }

      textarea {
        min-height: 150px;
        resize: vertical;
      }

      .actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        margin-top: 18px;
      }

      button {
        cursor: pointer;
        border: 0;
        background: #33d69f;
        color: #06120d;
        font-weight: 800;
        padding: 13px 18px;
      }

      button.secondary {
        background: #22324d;
        color: #edf5ff;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.65;
      }

      output {
        display: block;
        min-height: 180px;
        margin-top: 18px;
        padding: 16px;
        white-space: pre-wrap;
        background: #050b14;
        border: 1px solid #2f3e56;
        border-radius: 14px;
        color: #eef7ff;
      }

      .note {
        font-size: 0.95rem;
      }

      @media (max-width: 720px) {
        .actions {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel" aria-labelledby="research-title">
        <h1 id="research-title">${escapeHtml(title)}</h1>
        <p>
          Keyless browser research through Puter.js and Perplexity Sonar models.
          Each user authorizes and pays for their own usage through Puter's user-pays model;
          no Revvel API key is embedded or proxied.
        </p>

        <label for="research-prompt">Research prompt</label>
        <textarea id="research-prompt">${escapeHtml(defaultPrompt)}</textarea>

        <label for="research-model">Model</label>
        <select id="research-model">
${renderModelOptions(selectedModel)}
        </select>

        <div class="actions">
          <button id="run-research" type="button">Run streamed research</button>
          <button class="secondary" id="copy-output" type="button">Copy output</button>
        </div>

        <p class="note">
          For public pages, disclose that Puter handles user authentication, billing, and model access.
          Do not collect secrets in this form.
        </p>

        <output id="research-output" aria-live="polite">Ready.</output>
      </section>
    </main>

    <script>
      const promptInput = document.getElementById('research-prompt');
      const modelInput = document.getElementById('research-model');
      const runButton = document.getElementById('run-research');
      const copyButton = document.getElementById('copy-output');
      const output = document.getElementById('research-output');

      function setOutput(text) {
        output.textContent = text;
      }

      async function runResearch() {
        const prompt = promptInput.value.trim();
        const model = modelInput.value;

        if (!prompt) {
          setOutput('Enter a research prompt before running.');
          promptInput.focus();
          return;
        }

        if (!window.puter?.ai?.chat) {
          setOutput('Puter.js did not load. Check the network and the Content Security Policy.');
          return;
        }

        runButton.disabled = true;
        setOutput('');

        try {
          const response = await window.puter.ai.chat(prompt, {
            model,
            stream: true
          });

          for await (const part of response) {
            if (part?.text) {
              output.textContent += part.text;
            }
          }

          if (!output.textContent.trim()) {
            setOutput('The model returned an empty response.');
          }
        } catch (error) {
          setOutput('Puter Perplexity research failed: ' + (error?.message || String(error)));
        } finally {
          runButton.disabled = false;
        }
      }

      async function copyOutput() {
        const text = output.textContent.trim();
        if (!text || text === 'Ready.') return;
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copied';
        setTimeout(() => {
          copyButton.textContent = 'Copy output';
        }, 1500);
      }

      runButton.addEventListener('click', runResearch);
      copyButton.addEventListener('click', copyOutput);
    </script>
  </body>
</html>
`;
}

function writeTemplate(outputFile = DEFAULT_OUTPUT_FILE) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, buildPuterPerplexityHtml());
  return outputFile;
}

if (require.main === module) {
  const outputFile = process.argv[2] || process.env.OUTPUT_FILE || DEFAULT_OUTPUT_FILE;
  const written = writeTemplate(path.resolve(outputFile));
  console.log(`Wrote Puter Perplexity template to ${written}`);
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_OUTPUT_FILE,
  MODEL_LABELS,
  PUTER_SCRIPT_URL,
  SUPPORTED_PUTER_PERPLEXITY_MODELS,
  assertSupportedModel,
  buildPuterPerplexityHtml,
  renderModelOptions,
  writeTemplate
};
