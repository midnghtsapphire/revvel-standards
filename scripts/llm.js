#!/usr/bin/env node
"use strict";

/**
 * Shared LLM helper — no-key-first, OpenRouter-backup.
 *
 * The default lane for "use Perplexity for everything when we can":
 *   1. PRIMARY (free): the keyless helallao/perplexity-ai bridge.
 *   2. BACKUP: OpenRouter with a model fallback chain (needs OPENROUTER_API_KEY).
 *
 * Any engine/script can call `ask(prompt, { system })` to get a grounded answer
 * without wiring its own provider logic. Browser/UI contexts should use the
 * Puter.js path instead (standards/PUTER_PERPLEXITY_INTEGRATION_STANDARD.md).
 *
 * 2026-05-21 (Claude): created to centralize the no-key-first lane.
 */

const fs = require('fs');
const path = require('path');
const { callPerplexityNoKey } = require("./perplexity-research-issue");
const { callOpenRouter } = require("./openrouter-routing");
const { SCRIPT_EXECUTABLE_MODES } = require('../src/lib/model-routing-modes');

function loadFallbackModels() {
  try {
    const lookupPath = path.join(__dirname, '../config/model-lookup.json');
    if (fs.existsSync(lookupPath)) {
      const data = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
      if (data.fallback_chain && data.models) {
        const supportedModes = new Set(SCRIPT_EXECUTABLE_MODES);
        const resolvedModels = data.fallback_chain
          .map(id => data.models.find(m => m.id === id))
          .filter(model => model !== undefined);
        const excludedModels = resolvedModels.filter(model => !supportedModes.has(model.mode));
        if (excludedModels.length > 0) {
          console.warn(
            `Ignoring non-executable fallback models for script execution: ${excludedModels.map(model => `${model.provider}/${model.name} (${model.mode || 'unknown'})`).join(', ')}`
          );
        }
        const resolved = resolvedModels
          .filter(model => supportedModes.has(model.mode))
          .map(model => `${model.provider}/${model.name}`);

        if (resolved.length > 0) {
          return resolved;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load model-lookup.json, falling back to defaults", err.message);
  }
  return [
    "perplexity/sonar-pro",
    "anthropic/claude-sonnet-4",
    "deepseek/deepseek-v3.2"
  ];
}

// Backup model chain (Perplexity Sonar first so the answer style stays grounded).
const DEFAULT_FALLBACK_MODELS = loadFallbackModels();

/**
 * Ask the default LLM lane a question.
 *
 * @param {string} prompt - User prompt.
 * @param {Object} [opts]
 * @param {string} [opts.system] - Optional system instruction.
 * @param {string[]} [opts.models] - OpenRouter backup model chain.
 * @param {string} [opts.apiKey] - OpenRouter API key (else env).
 * @param {boolean} [opts.preferNoKey=true] - Try the free no-key bridge first.
 * @param {boolean} [opts.silent=false] - Suppress console logging.
 * @param {Function} [opts._noKey] - Injectable no-key impl (testing seam).
 * @param {Function} [opts._openRouter] - Injectable OpenRouter impl (testing seam).
 * @returns {Promise<{text: string, lane: string, modelUsed: string, requestedModels?: string[]}>}
 */
async function ask(prompt, opts = {}) {
  const {
    system,
    models = DEFAULT_FALLBACK_MODELS,
    apiKey,
    preferNoKey = true,
    silent = false,
    _noKey = callPerplexityNoKey,
    _openRouter = callOpenRouter,
  } = opts;

  if (!prompt || typeof prompt !== "string") {
    throw new Error("ask(prompt) requires a non-empty string prompt");
  }

  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

  if (preferNoKey) {
    try {
      const text = await _noKey(fullPrompt);
      return { text, lane: "no-key-perplexity", modelUsed: "perplexity/sonar (no-key)" };
    } catch (err) {
      if (!silent) {
        console.warn(`⚠️ no-key Perplexity lane failed, falling back to OpenRouter: ${err.message}`);
      }
    }
  }

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const result = await _openRouter({ models, messages, apiKey, silent });
  return {
    text: result.text,
    lane: "openrouter",
    modelUsed: result.modelUsed,
    requestedModels: result.requestedModels || models,
  };
}

module.exports = { ask, DEFAULT_FALLBACK_MODELS };
