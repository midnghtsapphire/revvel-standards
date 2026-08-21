'use strict';

/**
 * Layer 0 for the JavaScript side of the fleet: LM Studio on the operator's
 * own machine, tried before anything that bills.
 *
 * `scripts/local_llm.py` already did this for Python. Every JS persona —
 * DRAGNET included — went straight to OpenRouter, so the local model the
 * operator is paying nothing to run was unreachable from half the repo.
 *
 * Env vars are deliberately the SAME NAMES the Python lane uses, so one
 * `LMSTUDIO_ENDPOINT` configures both:
 *
 *   LMSTUDIO_ENDPOINT   default http://127.0.0.1:1234/v1
 *   LMSTUDIO_MODEL      default: whatever LM Studio has loaded
 *   LMSTUDIO_API_KEY    only if the server is set to require a token
 *   REVVEL_LLM_TIMEOUT  seconds, default 120
 *
 * This module never throws `CloudSpendBlockedError` and never bills: if the
 * lane is not there, it throws `LocalLaneUnavailable` and the caller decides
 * whether the paid lane is allowed.
 */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const LANE = 'lane-0-lmstudio';
const DEFAULT_ENDPOINT = 'http://127.0.0.1:1234/v1';

/**
 * Substrings that mark a model as embedding-only. An embedding model shows up
 * in `/v1/models` exactly like a chat model but returns an error from
 * `/chat/completions`, so auto-selection has to skip them or Layer 0 looks
 * broken when it is merely pointed at the wrong model.
 */
const EMBEDDING_HINTS = ['embed', 'embedding', 'bge-', 'gte-', 'e5-', 'nomic-embed'];

/** Lane is absent or unusable. Never a billing condition. */
class LocalLaneUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = 'LocalLaneUnavailable';
    this.lane = LANE;
  }
}

function endpoint() {
  return (process.env.LMSTUDIO_ENDPOINT || DEFAULT_ENDPOINT).trim().replace(/\/+$/, '');
}

function timeoutMs() {
  const raw = parseInt(process.env.REVVEL_LLM_TIMEOUT || '', 10);
  return (Number.isFinite(raw) && raw > 0 ? raw : 120) * 1000;
}

function isEmbeddingModel(id) {
  const lower = String(id || '').toLowerCase();
  return EMBEDDING_HINTS.some((hint) => lower.includes(hint));
}

function headers() {
  const out = { 'Content-Type': 'application/json' };
  const key = (process.env.LMSTUDIO_API_KEY || '').trim();
  if (key) out.Authorization = `Bearer ${key}`;
  return out;
}

/**
 * One request, no proxy.
 *
 * Node's http/https do not consult http_proxy on their own, but agents and
 * bootstrap code in this repo sometimes install a global agent that does.
 * Layer 0 talks to 127.0.0.1; routing that through a proxy is always wrong,
 * so the agent is pinned off. (The Python lane needed the same fix — urllib
 * *does* honour the proxy env vars, and sent loopback traffic to HTTPS_PROXY.)
 */
function request(url, { method = 'GET', body = null } = {}) {
  const target = new URL(url);
  const transport = target.protocol === 'https:' ? https : http;
  const payload = body === null ? null : Buffer.from(JSON.stringify(body));
  const hdrs = headers();
  if (payload) hdrs['Content-Length'] = payload.length;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      { hostname: target.hostname, port: target.port, path: target.pathname + target.search, method, headers: hdrs, agent: false },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            reject(new LocalLaneUnavailable(
              `${url} returned ${res.statusCode} — LM Studio is requiring a token. Set LMSTUDIO_API_KEY.`));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new LocalLaneUnavailable(`${url} returned ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new LocalLaneUnavailable(`${url} returned unparseable JSON: ${err.message}`));
          }
        });
      },
    );
    req.setTimeout(timeoutMs(), () => {
      req.destroy();
      reject(new LocalLaneUnavailable(`${url} timed out after ${timeoutMs()}ms`));
    });
    req.on('error', (err) => reject(new LocalLaneUnavailable(`${url} unreachable: ${err.message}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Models LM Studio currently serves.
 *
 * @param {boolean} [chatOnly=false] Drop embedding models.
 * @returns {Promise<string[]>}
 */
async function listModels(chatOnly = false) {
  const parsed = await request(`${endpoint()}/models`);
  const ids = (parsed.data || []).map((entry) => entry && entry.id).filter(Boolean);
  return chatOnly ? ids.filter((id) => !isEmbeddingModel(id)) : ids;
}

/**
 * Is Layer 0 reachable with a model that can actually answer a chat request?
 * Never throws — this is the question a caller asks before deciding to spend.
 *
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    return (await listModels(true)).length > 0;
  } catch {
    return false;
  }
}

/**
 * Run a chat completion on the local model.
 *
 * Shaped to match `routedChat`'s return so a caller can treat the two lanes
 * interchangeably: `{ content, text, modelUsed, lane }`.
 *
 * @throws {LocalLaneUnavailable} when LM Studio is not running, has no chat
 *   model, or requires a token that is not set. Callers fall through to the
 *   paid lane — subject to the spend gate — on this error.
 */
async function chat({ messages, model, temperature = 0.7, max_tokens = 4000 }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required and must contain at least one message');
  }

  let chosen = (model || process.env.LMSTUDIO_MODEL || '').trim();
  if (!chosen) {
    const available = await listModels(true);
    if (available.length === 0) {
      throw new LocalLaneUnavailable(
        'LM Studio is reachable but serves no chat model. An embedding model cannot answer ' +
        '/chat/completions — load a chat model (e.g. google/gemma-3-4b) or set LMSTUDIO_MODEL.');
    }
    chosen = available[0];
  }

  const parsed = await request(`${endpoint()}/chat/completions`, {
    method: 'POST',
    body: { model: chosen, messages, temperature, max_tokens },
  });

  const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message
    ? parsed.choices[0].message.content
    : null;
  if (typeof content !== 'string') {
    throw new LocalLaneUnavailable(`LM Studio returned no message content for model ${chosen}`);
  }

  return { content, text: content, modelUsed: parsed.model || chosen, lane: LANE };
}

module.exports = {
  LANE,
  DEFAULT_ENDPOINT,
  EMBEDDING_HINTS,
  LocalLaneUnavailable,
  endpoint,
  isEmbeddingModel,
  listModels,
  isAvailable,
  chat,
};
