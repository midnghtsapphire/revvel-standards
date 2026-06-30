#!/usr/bin/env node
'use strict';

/**
 * Live dispatch adapter — wires the research orchestrator's `dispatch(arm, ctx)`
 * contract to the real arm runners (deep-search / twin / triplet).
 *
 * The runners (`twin-search.js`, `triplet-search.js`, `deep-search-router.js`)
 * keep their network orchestration under `if (require.main === module)` and emit
 * their result on stdout (twin/triplet print an eval-compatible JSON report;
 * deep-search prints the answer text). They expose no in-process run function, so
 * we drive them the way they're designed to be driven: as a subprocess. This is
 * also how a cut arm is genuinely killed — the orchestrator's stall/stop abort
 * fires `ctx.signal`, and we SIGTERM the child.
 *
 * Pure helpers (`extractCitations`, `parseRunnerOutput`) are exported for tests;
 * `makeDispatch` is the integration glue. No network is touched here — the model
 * calls live inside the spawned runner, which reads OPENROUTER_API_KEY itself.
 */

const path = require('path');
const { spawn } = require('child_process');

// arm.kind -> runner script. Default kind is 'single' (one deep-search call).
const ARM_RUNNERS = Object.freeze({
  single: 'deep-search-router.js',
  twin: 'twin-search.js',
  triplet: 'triplet-search.js',
});

// deep-search-router's completion banner, as a whole line (optionally prefixed
// with the ✅). Line-anchored so it can't be spoofed by the phrase appearing
// inside an echoed query or answer body.
const SINGLE_DONE_RE = /^[ \t]*✅?[ \t]*RESEARCH COMPLETE[ \t]*$/m;

// --- pure helpers ----------------------------------------------------------

// Local URL extractor (mirrors twin-search.extractCitations) so this module has
// no load-time dependency on a runner that may not be merged on this branch yet.
function extractCitations(text) {
  if (typeof text !== 'string') return [];
  const urls = text.match(/https?:\/\/[^\s)\]}"'<>]+/g) || [];
  const seen = new Set();
  const out = [];
  for (let u of urls) {
    u = u.replace(/[.,;:]+$/, ''); // strip trailing punctuation
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

// Grab the outermost {...} and JSON.parse it, tolerating banner/log noise.
function tryParseReport(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Normalize a runner's stdout into the orchestrator's {answer, citations,
// cost_usd} arm-result shape.
function parseRunnerOutput(kind, stdout) {
  const text = String(stdout || '');
  if (kind === 'twin' || kind === 'triplet') {
    const report = tryParseReport(text);
    const r = report && Array.isArray(report.results) ? report.results[0] : null;
    if (r) {
      return {
        answer: typeof r.answer === 'string' ? r.answer : '',
        citations: Array.isArray(r.citations) ? r.citations.slice() : [],
        cost_usd: typeof r.cost_usd === 'number' ? r.cost_usd : null,
      };
    }
    // fall through to text handling if the report wasn't shaped as expected
  }
  // deep-search-router prints banners + the answer after the completion banner.
  // Anchor to the banner *line* (^…$) so an echoed query containing the phrase
  // (e.g. "Query: RESEARCH COMPLETE") can't spoof completion.
  const m = SINGLE_DONE_RE.exec(text);
  const answer = m ? text.slice(m.index + m[0].length).replace(/^[\s═✅=]+/, '').trim() : text.trim();
  return { answer, citations: extractCitations(text), cost_usd: null };
}

// Per-arm model override -> the env var the runner reads. deep-search-router
// takes a profile as argv (handled in dispatch), so 'single' has no env mapping.
function modelEnvFor(kind, model) {
  if (!model) return {};
  if (kind === 'twin') return { TWIN_MODEL_A: model };
  if (kind === 'triplet') return { TRIPLET_MODEL_1: model };
  return {};
}

// --- integration glue ------------------------------------------------------

/**
 * Build a `dispatch(arm, ctx)` bound to a query. Each call spawns the runner for
 * `arm.kind` ('single' | 'twin' | 'triplet'), streams progress as the child
 * emits output, kills the child if `ctx.signal` aborts, and resolves the parsed
 * result. Designed for injection in tests via `opts.spawnFn`.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.dir] directory holding the runner scripts (default: here)
 * @param {object} [opts.env] base env for children (default: process.env)
 * @param {Function} [opts.spawnFn] child_process.spawn override (tests)
 * @param {Record<string,string>} [opts.runners] kind -> script-name overrides
 */
function makeDispatch(query, opts = {}) {
  const {
    dir = __dirname,
    env = process.env,
    spawnFn = spawn,
    runners = ARM_RUNNERS,
  } = opts;

  return function dispatch(arm, ctx = {}) {
    const kind = arm.kind || 'single';
    const script = runners[kind];
    if (!script) return Promise.reject(new Error(`dispatch: unknown arm kind "${kind}"`));

    const scriptPath = path.join(dir, script);
    // deep-search-router selects models via a profile argv; twin/triplet via env.
    const args = [scriptPath];
    if (kind === 'single' && arm.model) args.push('--profile', arm.model);
    args.push(query);
    const childEnv = { ...env, ...modelEnvFor(kind, arm.model) };
    const onProgress = typeof ctx.onProgress === 'function' ? ctx.onProgress : () => {};
    const signal = ctx.signal;

    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawnFn(process.execPath, args, { env: childEnv });
      } catch (e) {
        return reject(new Error(`failed to spawn ${script}: ${e.message}`));
      }

      let out = '';
      let stderr = '';
      const onAbort = () => {
        try {
          child.kill('SIGTERM');
        } catch {
          /* child may already be gone */
        }
      };
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
      const cleanup = () => {
        if (signal && typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        }
      };

      if (child.stdout) child.stdout.on('data', (d) => { out += d; onProgress(); });
      // Runners stream progress/banners on stderr — treat any chunk as a heartbeat.
      if (child.stderr) child.stderr.on('data', (d) => { stderr += d; onProgress(); });

      child.on('error', (e) => {
        cleanup();
        reject(new Error(`${script} failed to run: ${e.message}`));
      });

      child.on('close', (code) => {
        cleanup();
        if (signal && signal.aborted) {
          return reject(new Error(`${kind} arm aborted (cut by orchestrator)`));
        }
        const parsed = parseRunnerOutput(kind, out);
        // deep-search marks a real completion with a "RESEARCH COMPLETE" banner —
        // require it so a keyless/failed run (banner only, no answer) is a clean
        // failure, not a false-green. twin/triplet exit 1 on a *degraded* run but
        // still print a usable report, so for them any parseable answer is enough.
        const ok = kind === 'single'
          ? SINGLE_DONE_RE.test(out) && Boolean(parsed.answer)
          : Boolean(parsed.answer);
        if (ok) return resolve(parsed);
        reject(new Error(`${script} exited ${code} with no usable answer${stderr ? `: ${stderr.slice(0, 200)}` : ''}`));
      });
    });
  };
}

module.exports = {
  ARM_RUNNERS,
  extractCitations,
  parseRunnerOutput,
  modelEnvFor,
  makeDispatch,
};
