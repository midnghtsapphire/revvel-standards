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
 * Honest limitation, stated because the alternative is another decorative
 * marker: whether Perplexity actually serves a request with no Authorization
 * header is Perplexity's call, not ours. If they reject it, this lane now
 * throws `PerplexityLaneUnavailable` carrying the real status code, and the
 * caller falls through. That is still strictly better than before, when the
 * failover produced no request and therefore no evidence either way.
 * `PERPLEXITY_API_KEY` is sent when set.
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
async function chat({ messages, model, temperature = 0.7, max_tokens = 4000 }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required and must contain at least one message');
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
