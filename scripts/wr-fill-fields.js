#!/usr/bin/env node
'use strict';

/**
 * WR Field Filler — the search-loop-until-every-field-is-filled agent.
 *
 * Purpose: a WR issue MUST NEVER reach downstream automation with a blank
 * field. The GitHub issue form leaves `_No response_` in unfilled textareas
 * and a literal "None" in unfilled dropdowns; both are lint-forbidden by
 * wr/scripts/wr-lint.mjs and both block wr-pr-creation.yml. Historically the
 * agents that touched a partly-filled WR stopped instead of filling. This
 * script does not stop. It loops through EVERY known field and applies, in
 * order:
 *
 *   1. Rule-based fill  - from config/wr-field-defaults.yml keyed off Output
 *      Type and other already-filled fields. Cheap, deterministic,
 *      reproducible. Handles roughly 70% of blanks with zero LLM cost.
 *
 *   2. LLM refinement   - for fields whose default_by == "llm" (Objective,
 *      Required Bundle, Definition of Done, Do Not Under-Scope,
 *      Explicit Exclusions, Validation Expectations). Uses the FILLED fields
 *      (title, Summary, Objective) as context so the LLM writes something
 *      specific to THIS WR, not a template. Cascades through the standard
 *      OpenRouter fallback lanes (primary paid model -> free-tier models);
 *      if all lanes fail, falls through to the field's declared `fallback`.
 *
 *   3. Explicit N/A     - final tier. Every field has a `fallback:` string
 *      in the defaults YAML that is guaranteed non-empty. This tier is the
 *      guarantee "no blank ever leaves the filler."
 *
 * Public API (exported for tests):
 *   loadDefaults()         -> parsed YAML
 *   parseIssueBody(body)   -> ordered [{heading, kind, value, raw}, ...]
 *   isBlank(kind, value)   -> boolean
 *   fillDeterministic(...) -> { filled, changes[] }  // no network
 *   renderIssueBody(...)   -> string (round-trip safe)
 *
 * CLI:
 *   node scripts/wr-fill-fields.js --issue-file body.md --title "..." [--out out.md]
 *   node scripts/wr-fill-fields.js --stdin --title "..."
 *
 *   Set WR_LLM=1 to enable LLM refinement (requires OPENROUTER_API_KEY).
 *   Set WR_LLM=0 (default) for pure-deterministic mode used by CI dry-runs
 *   and by the unit tests.
 *
 * Anti-injection: LLM refinement is bounded - only fills fields whose
 * default_by is "llm" and NEVER touches dropdown/checkbox fields (those are
 * always rule-based so an untrusted body cannot escape the allowed enum).
 */

const fs = require('fs');
const { assertCloudAllowed } = require("./llm-spend-gate");
const path = require('path');
const https = require('https');
const yaml = require('yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULTS_PATH = path.join(REPO_ROOT, 'config/wr-field-defaults.yml');

// Sentinels the GitHub issue form emits for blank fields.
const BLANK_MARKERS = new Set(['_No response_', 'None', 'TBD', '']);

let defaultsCache = null;
function loadDefaults() {
  if (defaultsCache) return defaultsCache;
  defaultsCache = yaml.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
  return defaultsCache;
}

/** True when a field value is effectively blank per the WR intake convention. */
function isBlank(kind, value) {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  if (BLANK_MARKERS.has(trimmed)) return true;
  // Checkboxes are considered blank when no boxes are ticked.
  if (kind === 'checkboxes') {
    // A ticked box in issue-form rendering starts with `- [x]` (or [X]).
    return !/-\s*\[[xX]\]/.test(value);
  }
  return false;
}

/**
 * Parse an issue body rendered from an issue form into an ordered list of
 * fields. The form always emits `### <Heading>` then a blank line then the
 * value block. We slice the body by the heading list from the defaults so a
 * novel heading in the body doesn't quietly get lost.
 */
function parseIssueBody(body) {
  const defs = loadDefaults();
  const headings = defs.fields.map((f) => f.heading);
  // Build a regex that captures each of the known headings. Escape regex
  // meta chars in the heading text so parentheses in "Output Type (required)"
  // are treated literally.
  const escapedHeadings = headings.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const headingPattern = new RegExp(`^###\\s+(${escapedHeadings.join('|')})\\s*$`, 'gm');

  const found = [];
  let match;
  while ((match = headingPattern.exec(body)) !== null) {
    found.push({ heading: match[1], startBlock: match.index, endHeading: match.index + match[0].length });
  }
  // Compute each field's value: text between endHeading of this heading and
  // startBlock of the next.
  const fields = found.map((entry, i) => {
    const next = found[i + 1];
    const raw = body.slice(entry.endHeading, next ? next.startBlock : body.length);
    const value = raw.replace(/^\s*\n/, '').replace(/\n+\s*$/, '');
    const spec = defs.fields.find((f) => f.heading === entry.heading);
    return { heading: entry.heading, kind: spec.kind, raw, value };
  });
  return fields;
}

/**
 * Compute the deterministic default for one field. Returns {value, source}
 * or null when this field is `default_by: llm` and must be refined instead.
 */
function computeDefault(field, filled) {
  const outputType = (filled['Output Type (required)'] || '').trim();
  const mode = field.default_by || 'always';

  if (mode === 'llm') return null;

  if (mode === 'output_type' || mode === 'always') {
    const map = field.defaults || {};
    if (mode === 'output_type' && outputType && map[outputType] !== undefined) {
      return { value: map[outputType], source: `defaults[${outputType}]` };
    }
    if (map['*'] !== undefined) {
      return { value: map['*'], source: 'defaults[*]' };
    }
  }

  if (mode === 'derived') {
    if (field.heading === 'Lifecycle Mode') {
      return { value: 'new-build', source: 'derived (default: new-build)' };
    }
    if (field.heading === 'Summary') {
      const title = filled.__title || '';
      const objective = (filled.Objective || '').trim();
      const derived = title
        .replace(/^\[WR\]\s*/i, '')
        .replace(/^\s*[/](\w+)\s*/, '')
        .trim();
      if (derived) return { value: derived, source: 'derived from title' };
      if (objective) {
        const firstLine = objective.split(/\r?\n/).find((l) => l.trim()) || '';
        if (firstLine) return { value: firstLine.trim().slice(0, 160), source: 'derived from Objective first line' };
      }
    }
  }

  return { value: field.fallback, source: 'fallback' };
}

/**
 * Render an Acknowledgements block. When defaults[*] == "all", tick every
 * allowed option. Otherwise render an untouched block that lists them.
 */
function renderAcknowledgements(field, tickAll) {
  return (field.allowed || [])
    .map((opt) => `- [${tickAll ? 'x' : ' '}] ${opt}`)
    .join('\n');
}

/**
 * Deterministic pass: fill everything that does NOT need an LLM. Returns
 * updated fields + a change log for the summary comment.
 */
function fillDeterministic({ title, fields }) {
  const defs = loadDefaults();
  const specByHeading = new Map(defs.fields.map((f) => [f.heading, f]));
  const filledMap = { __title: title };
  for (const f of fields) if (!isBlank(f.kind, f.value)) filledMap[f.heading] = f.value;

  const changes = [];
  const out = fields.map((f) => {
    const spec = specByHeading.get(f.heading);
    if (!spec) return f;
    if (!isBlank(f.kind, f.value)) return f;

    const def = computeDefault(spec, filledMap);
    if (def == null) {
      // LLM-refinement field left for the LLM pass. Record so we know.
      changes.push({ heading: f.heading, source: 'llm-pending' });
      return f;
    }
    let value = def.value;
    if (spec.kind === 'checkboxes') {
      value = renderAcknowledgements(spec, value === 'all' || value === true);
    }
    changes.push({ heading: f.heading, source: def.source, value: String(value).slice(0, 80) });
    filledMap[f.heading] = value;
    return { ...f, value: String(value) };
  });

  return { filled: out, changes, filledMap };
}

/**
 * LLM refinement pass. Only touches text fields whose default_by is 'llm'
 * and are still blank after the deterministic pass. Cascades through the
 * OpenRouter primary paid lane and then the free-tier lane, and falls back
 * to the field's declared fallback string if every lane errors.
 *
 * Each field is filled INDEPENDENTLY so one LLM error doesn't block the
 * others - matches the fleet rule "always fall back to something."
 */
async function fillWithLlm({ title, fields, filledMap, log }) {
  const defs = loadDefaults();
  const specByHeading = new Map(defs.fields.map((f) => [f.heading, f]));
  const changes = [];
  const enableLlm = process.env.WR_LLM === '1' && process.env.OPENROUTER_API_KEY;

  const out = [];
  for (const f of fields) {
    const spec = specByHeading.get(f.heading);
    if (!spec || spec.default_by !== 'llm' || !isBlank(f.kind, f.value)) {
      out.push(f);
      continue;
    }

    let value = null;
    let source = 'fallback';
    if (enableLlm) {
      try {
        value = await refineOneField({ heading: f.heading, title, filledMap });
        source = 'llm';
      } catch (err) {
        log(`llm refine failed for "${f.heading}": ${err.message} — using fallback`);
      }
    }
    if (!value || String(value).trim().length < 20) {
      value = spec.fallback;
      source = enableLlm ? 'fallback (llm below threshold)' : 'fallback (llm disabled)';
    }
    changes.push({ heading: f.heading, source, value: String(value).slice(0, 80) });
    filledMap[f.heading] = value;
    out.push({ ...f, value: String(value) });
  }
  return { filled: out, changes };
}

/** OpenRouter cascade for a single field. */
function refineOneField({ heading, title, filledMap }) {
  const context = [
    `WR title: ${title}`,
    `Output Type: ${filledMap['Output Type (required)'] || 'unknown'}`,
    `Summary: ${filledMap.Summary || '(not yet filled)'}`,
    `Objective: ${(filledMap.Objective || '(not yet filled)').slice(0, 1200)}`,
  ].join('\n');

  const systemPrompt = `You are the WR Field Filler. Fill exactly ONE field of a Work Request issue based on the context provided. Output ONLY the field content — no preamble, no field name, no markdown fencing, no acknowledgements. Keep it 2-6 sentences, concrete, and specific to THIS WR. Never write "TBD", "TODO", "pending", or "_No response_".`;
  const userPrompt = `Field to fill: **${heading}**\n\nContext:\n${context}\n\nWrite the field value now.`;

  return withCascade([
    () => openRouterCall(process.env.WR_LLM_MODEL || 'anthropic/claude-sonnet-4', systemPrompt, userPrompt),
    () => openRouterFree(systemPrompt, userPrompt),
  ]);
}

async function withCascade(tries) {
  let lastErr;
  for (const t of tries) {
    try { return await t(); } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all lanes failed');
}

function openRouterCall(model, systemPrompt, userPrompt) {
  return orRequest({ model, messages: mkMsgs(systemPrompt, userPrompt) });
}

function openRouterFree(systemPrompt, userPrompt) {
  const models = (process.env.OR_FREE_MODELS || 'meta-llama/llama-3.1-8b-instruct:free,google/gemma-2-9b-it:free')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return orRequest({ models, messages: mkMsgs(systemPrompt, userPrompt) });
}

function mkMsgs(sys, usr) {
  return [ { role: 'system', content: sys }, { role: 'user', content: usr } ];
}

function orRequest(payload) {
  // Spend gate (#17850): refuse unless someone deliberately allowed it.
  assertCloudAllowed("wr-fill-fields");
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return Promise.reject(new Error('OPENROUTER_API_KEY not set'));
  const body = JSON.stringify({ temperature: 0.2, ...payload });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': `https://github.com/${process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards'}`,
        'X-Title': 'WR Field Filler',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const status = res.statusCode || 0;
        let parsed;
        try { parsed = JSON.parse(data || '{}'); } catch { parsed = {}; }
        if (status < 200 || status >= 300) return reject(new Error(`OpenRouter ${status}: ${(parsed.error && parsed.error.message) || 'no body'}`));
        const text = parsed?.choices?.[0]?.message?.content;
        if (!text) return reject(new Error('OpenRouter returned no content'));
        resolve(String(text).trim());
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

/**
 * Rebuild the issue body from the (possibly updated) field list. Preserves
 * the order and the exact heading strings so a downstream re-parse round-trips.
 */
function renderIssueBody(fields) {
  return fields.map((f) => `### ${f.heading}\n\n${String(f.value).trim()}\n`).join('\n');
}

async function fill({ title, body, log = () => {} }) {
  const fields = parseIssueBody(body);
  const det = fillDeterministic({ title, fields });
  const llm = await fillWithLlm({ title, fields: det.filled, filledMap: det.filledMap, log });
  const rendered = renderIssueBody(llm.filled);
  return {
    body: rendered,
    changes: [...det.changes, ...llm.changes],
    fields: llm.filled,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { issueFile: null, out: null, stdin: false, title: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--issue-file' && argv[i + 1]) { out.issueFile = argv[++i]; continue; }
    if (a === '--out' && argv[i + 1]) { out.out = argv[++i]; continue; }
    if (a === '--title' && argv[i + 1]) { out.title = argv[++i]; continue; }
    if (a === '--stdin') { out.stdin = true; continue; }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let body;
  if (args.issueFile) body = fs.readFileSync(args.issueFile, 'utf8');
  else if (args.stdin) body = fs.readFileSync(0, 'utf8');
  else { process.stderr.write('wr-fill-fields: pass --issue-file or --stdin\n'); process.exit(2); }
  if (!args.title) { process.stderr.write('wr-fill-fields: --title is required\n'); process.exit(2); }

  const log = (m) => process.stderr.write(`[wr-fill] ${m}\n`);
  const result = await fill({ title: args.title, body, log });

  if (args.out) fs.writeFileSync(args.out, result.body);
  else process.stdout.write(result.body);

  process.stderr.write(`\n[wr-fill] filled ${result.changes.length} field(s):\n`);
  for (const c of result.changes) process.stderr.write(`  - ${c.heading} [${c.source}]\n`);
}

module.exports = {
  loadDefaults,
  parseIssueBody,
  isBlank,
  computeDefault,
  fillDeterministic,
  fillWithLlm,
  renderIssueBody,
  fill,
  BLANK_MARKERS,
};

if (require.main === module) {
  main().catch((e) => { process.stderr.write(`wr-fill-fields: ${e.stack || e.message}\n`); process.exit(1); });
}
