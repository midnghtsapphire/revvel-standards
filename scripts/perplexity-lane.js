'use strict';

/**
 * Tier-2 keyless Perplexity lane — the one `config/routing-failover.yml` has
 * declared since WR-4481 and that nothing has ever executed.
 *
 * The gap, precisely: `scripts/lane-failover.js` *decides* to fail over to
 * `text.tier2` and writes that decision to the ledger, but it imports only
 * `fs`, `path`, and `failure-ledger`. It has no HTTP client. The only mentions
 * of api.perplexity.ai anywhere else in the repo are a `curl` health probe in
 * `agent-monitor.yml` and a commented-out line in `search_orchestrator.py`.
 *
 * So "failover to keyless Perplexity" was a routing-table row, a decision
 * label, and a ledger class — a producer with no consumer (RVS-VERIFY-001).
 * Every failover it ever "performed" was a string.
 *
 * This module is the consumer. It sends a real request.
 *
 * CORRECTION (#17870). The first version of this module posted to
 * api.perplexity.ai with no Authorization header and called that "keyless".
 * It is not: the official API requires a key, so that lane could only ever
 * 401. The repo already had a genuinely keyless bridge and I missed it —
 * `callPerplexityNoKey` in scripts/perplexity-research-issue.js, which shells
 * out to the `helallao/perplexity-ai` Python package. That is what "keyless
 * Perplexity" has always meant here.
 *
 * So the order inside this lane is:
 *   1. the Python no-key bridge — genuinely free, no key of any kind
 *   2. the official HTTP API — only when PERPLEXITY_API_KEY is set
 *
 * If the bridge is not installed the lane reports the install hint rather
 * than a bare failure, because "not installed" and "refused" are different
 * facts and only one of them is worth acting on.
 *
 *   PERPLEXITY_ENDPOINT  default https://api.perplexity.ai/chat/completions
 *   PERPLEXITY_MODEL     default sonar
 *   PERPLEXITY_API_KEY   optional — the lane is defined as keyless
 *   REVVEL_LLM_TIMEOUT   seconds, default 120
 */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const LANE = 'lane-2-perplexity-keyless';
const DEFAULT_ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const DEFAULT_MODEL = 'sonar';

/** Lane refused or unreachable. Carries the status code when there was one. */
class PerplexityLaneUnavailable extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'PerplexityLaneUnavailable';
    this.lane = LANE;
    this.statusCode = statusCode;
  }
}

function endpoint() {
  return (process.env.PERPLEXITY_ENDPOINT || DEFAULT_ENDPOINT).trim();
}

function timeoutMs() {
  const raw = parseInt(process.env.REVVEL_LLM_TIMEOUT || '', 10);
  return (Number.isFinite(raw) && raw > 0 ? raw : 120) * 1000;
}

/**
 * Is this lane keyless right now?
 *
 * Reported so a caller can say which lane it used truthfully, rather than
 * calling every Perplexity request "the keyless lane" when a key was present.
 */
function isKeyless() {
  return (process.env.PERPLEXITY_API_KEY || '').trim() === '';
}

/**
 * Run a chat completion on Perplexity.
 *
 * Returns the same shape as the other lanes — `{ content, text, modelUsed,
 * lane, keyless }` — so callers can treat lanes interchangeably.
 *
 * @throws {PerplexityLaneUnavailable} on any non-2xx, timeout, transport
 *   error, or unparseable body. Never throws the spend gate's error: this
 *   lane is free by definition, and a caller that reaches it has already been
 *   refused the paid one.
 */
/**
 * Flatten chat messages into the single prompt the Python bridge accepts.
 * The bridge has no role model, so roles are labelled inline rather than
 * dropped — losing the system instruction would silently change behaviour.
 */
function flattenMessages(messages) {
  return messages
    .map((m) => (m.role && m.role !== 'user' ? `[${m.role}] ${m.content}` : m.content))
    .join('\n\n');
}

/**
 * Layer 2a — the genuinely keyless bridge.
 *
 * Runs out-of-process via async execFile, not execFileSync: this lane is
 * awaited from routedChat, and a synchronous child would block Node's event
 * loop for the whole request.
 */
async function chatViaNoKeyBridge(messages) {
  let bridge;
  try {
    ({ NO_KEY_BRIDGE, NO_KEY_INSTALL_HINT, BRIDGE_MODEL, BRIDGE_FALLBACK } = require('./perplexity-no-key-bridge'));
    bridge = true;
  } catch (err) {
    throw new PerplexityLaneUnavailable(`No-key bridge module unavailable: ${err.message}`);
  }
  void bridge;

  const { execFile } = require('node:child_process');
  return new Promise((resolve, reject) => {
    const child = execFile(
      'python3',
      ['-c', NO_KEY_BRIDGE, flattenMessages(messages), BRIDGE_MODEL, BRIDGE_FALLBACK, NO_KEY_INSTALL_HINT],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs() },
      (err, stdout, stderr) => {
        if (err) {
          reject(new PerplexityLaneUnavailable(
            `No-key Perplexity bridge failed: ${(stderr || err.message).slice(0, 300)}. ` +
            `Install it with: ${NO_KEY_INSTALL_HINT}`));
          return;
        }
        const text = String(stdout || '').trim();
        if (!text) {
          reject(new PerplexityLaneUnavailable('No-key Perplexity bridge returned nothing.'));
          return;
        }
        resolve({ content: text, text, modelUsed: BRIDGE_MODEL, lane: LANE, keyless: true });
      },
    );
    child.on('error', (err) =>
      reject(new PerplexityLaneUnavailable(`Could not start the no-key bridge: ${err.message}`)));
  });
}

let NO_KEY_BRIDGE;
let NO_KEY_INSTALL_HINT;
let BRIDGE_MODEL;
let BRIDGE_FALLBACK;

async function chat({ messages, model, temperature = 0.7, max_tokens = 4000 }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required and must contain at least one message');
  }

  // Genuinely keyless first. Only fall through to the keyed HTTP API, and only
  // when a key actually exists — without one it can only 401.
  try {
    return await chatViaNoKeyBridge(messages);
  } catch (bridgeError) {
    if (isKeyless()) throw bridgeError;
  }

  const target = new URL(endpoint());
  const transport = target.protocol === 'http:' ? http : https;
  const chosen = (model || process.env.PERPLEXITY_MODEL || DEFAULT_MODEL).trim();
  const payload = Buffer.from(JSON.stringify({ model: chosen, messages, temperature, max_tokens }));

  const headers = { 'Content-Type': 'application/json', 'Content-Length': payload.length };
  const key = (process.env.PERPLEXITY_API_KEY || '').trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new PerplexityLaneUnavailable(
              `Perplexity returned ${res.statusCode}: ${data.slice(0, 300)}`, res.statusCode));
            return;
          }
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (err) {
            reject(new PerplexityLaneUnavailable(`Perplexity returned unparseable JSON: ${err.message}`));
            return;
          }
          const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content
            : null;
          if (typeof content !== 'string') {
            reject(new PerplexityLaneUnavailable('Perplexity returned no message content'));
            return;
          }
          resolve({
            content,
            text: content,
            modelUsed: parsed.model || chosen,
            lane: LANE,
            keyless: !key,
          });
        });
      },
    );
    req.setTimeout(timeoutMs(), () => {
      req.destroy();
      reject(new PerplexityLaneUnavailable(`Perplexity timed out after ${timeoutMs()}ms`));
    });
    req.on('error', (err) => reject(new PerplexityLaneUnavailable(`Perplexity unreachable: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

module.exports = {
  LANE,
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  PerplexityLaneUnavailable,
  endpoint,
  isKeyless,
  chat,
};
