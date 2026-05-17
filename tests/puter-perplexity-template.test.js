const fs = require('fs');
const path = require('path');

const {
  DEFAULT_MODEL,
  DEFAULT_OUTPUT_FILE,
  PUTER_SCRIPT_URL,
  SUPPORTED_PUTER_PERPLEXITY_MODELS,
  assertSupportedModel,
  buildPuterPerplexityHtml,
  renderModelOptions
} = require('../scripts/puter-perplexity-template.js');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function assertThrows(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    assert(pattern.test(error.message), message || `Unexpected error: ${error.message}`);
    return;
  }
  throw new Error(message || 'Expected function to throw');
}

function run() {
  assert(SUPPORTED_PUTER_PERPLEXITY_MODELS.includes(DEFAULT_MODEL), 'default model must be supported');
  assert(
    SUPPORTED_PUTER_PERPLEXITY_MODELS.includes('perplexity/sonar-deep-research'),
    'deep research model missing'
  );
  assert(
    SUPPORTED_PUTER_PERPLEXITY_MODELS.includes('perplexity/sonar-reasoning-pro'),
    'reasoning model missing'
  );

  assertSupportedModel('perplexity/sonar-pro');
  assertThrows(
    () => assertSupportedModel('perplexity/not-real'),
    /Unsupported Puter Perplexity model/,
    'unsupported models must be rejected'
  );

  const optionsHtml = renderModelOptions('perplexity/sonar-pro');
  assert(/value="perplexity\/sonar-pro" selected/.test(optionsHtml), 'selected model option missing');
  assert(!/perplexity\/not-real/.test(optionsHtml), 'unexpected model option rendered');

  const html = buildPuterPerplexityHtml({
    title: 'Custom <Research>',
    defaultPrompt: 'Compare <script>alert(1)</script>',
    selectedModel: 'perplexity/sonar-pro-search'
  });

  assert(html.includes(PUTER_SCRIPT_URL), 'Puter script URL missing');
  assert(html.includes("window.puter.ai.chat"), 'Puter chat call missing');
  assert(html.includes("stream: true"), 'streaming option missing');
  assert(html.includes('Content-Security-Policy'), 'CSP meta tag missing');
  assert(html.includes('https://js.puter.com'), 'CSP must allow Puter script');
  assert(html.includes('form-action &#39;none&#39;') || html.includes("form-action 'none'"), 'CSP must block forms');
  assert(html.includes('Custom &lt;Research&gt;'), 'title must be escaped');
  assert(html.includes('Compare &lt;script&gt;alert(1)&lt;/script&gt;'), 'prompt must be escaped');
  assert(!/innerHTML\s*=/.test(html), 'template must not assign innerHTML');
  assert(!/document\.write/.test(html), 'template must not use document.write');
  assert(!/PERPLEXITY_API_KEY|OPENROUTER_API_KEY/.test(html), 'template must not mention API key env vars');

  const committedTemplate = fs.readFileSync(DEFAULT_OUTPUT_FILE, 'utf8');
  assert(committedTemplate === buildPuterPerplexityHtml(), 'committed template must match generator output');

  const standard = fs.readFileSync(
    path.join(__dirname, '..', 'standards', 'PUTER_PERPLEXITY_INTEGRATION_STANDARD.md'),
    'utf8'
  );
  for (const model of SUPPORTED_PUTER_PERPLEXITY_MODELS) {
    assert(standard.includes(model), `standard missing model ${model}`);
    assert(committedTemplate.includes(model), `template missing model ${model}`);
  }
  assert(/user-pays/i.test(standard), 'standard must explain user-pays model');
  assert(/No secrets in the browser/i.test(standard), 'standard must include no-secrets rule');

  console.log('puter-perplexity-template tests passed');
}

run();
