#!/usr/bin/env node
"use strict";

/**
 * OpenRouter Model Routing Module
 * 
 * Provides task-based model routing with automatic fallback for coding workflows.
 * Supports routing profiles including:
 * - deep_search: Deep R&D research using DOE/TRIZ/MEErP/LCA/BNAT
 * - repo_surgery: Multi-file edits, bug fixing, refactors
 * - cheap_batch_edits: Repetitive transforms, test generation, lint-fix loops
 * - hard_debug: Difficult failures, ambiguous root-cause analysis
 * 
 * API Documentation: https://openrouter.ai/docs/guides/routing/model-fallbacks
 */

const https = require("https");
const fs = require('fs');
const path = require('path');
const { openRouterAuthHeader } = require("./utils/openrouter-key");

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

function loadModelLookup() {
  try {
    const lookupPath = path.join(__dirname, '../config/model-lookup.json');
    if (fs.existsSync(lookupPath)) {
      return JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
    }
  } catch (err) {
    console.warn("Could not load model-lookup.json, falling back to defaults", err.message);
  }
  return null;
}

const lookupData = loadModelLookup();

let ROUTING_PROFILES = {};

if (lookupData && lookupData.profiles && lookupData.models) {
  for (const [key, profile] of Object.entries(lookupData.profiles)) {
    const resolvedModels = profile.models.map(modelId => {
      const model = lookupData.models.find(m => m.id === modelId);
      return model ? `${model.provider}/${model.name}` : null;
    }).filter(m => m !== null);

    ROUTING_PROFILES[key] = {
      description: profile.description,
      models: resolvedModels
    };
  }
} else {
  // Fallback if config is missing
  ROUTING_PROFILES = {
    // Deep search profile - uses Sonnet + Fusion for rigorous R&D research
    // Based on Audrey's master prompt: DOE Screening, TRIZ, MEErP, LCA, BNAT
    deep_search: {
      description: "Deep R&D research using DOE Screening, TRIZ, MEErP, LCA, and BNAT frameworks",
      models: [
        "anthropic/claude-3.5-sonnet",
        "openrouter/fusion"
      ]
    },
    repo_surgery: {
      description: "Multi-file edits, bug fixing, refactors, and 'take initiative' tasks",
      models: [
        "anthropic/claude-sonnet-4",
        "deepseek/deepseek-v3.2",
        "openai/gpt-5.2-codex"
      ]
    },
    cheap_batch_edits: {
      description: "Repetitive transforms, test generation, lint-fix loops, and lower-cost bulk changes",
      models: [
        "deepseek/deepseek-v3.2",
        "anthropic/claude-sonnet-4"
      ]
    },
    hard_debug: {
      description: "Difficult failures, ambiguous root-cause analysis, and second-opinion patches",
      models: [
        "openai/gpt-5.2-codex",
        "anthropic/claude-sonnet-4",
        "deepseek/deepseek-v3.2"
      ]
    }
  };
}


/**
 * Call OpenRouter API with model fallback support
 * 
 * @param {Object} params - Request parameters
 * @param {string[]} params.models - Array of model identifiers in fallback order
 * @param {Array<{role: string, content: string}>} params.messages - Chat messages
 * @param {number} [params.temperature=0.7] - Sampling temperature
 * @param {number} [params.max_tokens=4000] - Maximum tokens to generate
 * @param {string} [params.apiKey] - OpenRouter API key (defaults to env var)
 * @param {number} [params.timeout=60000] - Request timeout in milliseconds
 * @param {string} [params.httpReferer] - HTTP-Referer header (defaults to env var or repo URL)
 * @param {string} [params.appTitle] - X-Title header (defaults to env var or app name)
 * @returns {Promise<Object>} Response with content, modelUsed, and requestedModels
 */
async function callOpenRouter({ models, messages, temperature = 0.7, max_tokens = 4000, apiKey, timeout = 60000, httpReferer, appTitle }) {
  // Sanitize + validate once via shared helper so a secret pasted with a
  // trailing newline/CR (issue #16942) cannot crash Node header construction.
  // openRouterAuthHeader throws if the key is empty after sanitization.
  const authorization = openRouterAuthHeader(apiKey);

  if (!models || !Array.isArray(models) || models.length === 0) {
    throw new Error("models array is required and must contain at least one model");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages array is required and must contain at least one message");
  }

  // Allow configurable headers for reusability
  const referer = httpReferer || process.env.OPENROUTER_HTTP_REFERER || "https://github.com/midnghtsapphire/revvel-standards";
  const title = appTitle || process.env.OPENROUTER_APP_TITLE || "Revvel Standards OpenRouter Routing";

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      models, // OpenRouter supports a models array for automatic fallback
      messages,
      temperature,
      max_tokens,
    });

    const options = {
      hostname: OPENROUTER_HOST,
      path: OPENROUTER_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": authorization,
        "HTTP-Referer": referer,
        "X-Title": title,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        // Check status code before parsing
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const truncatedBody = data.length > 500 ? data.substring(0, 500) + "..." : data;
          reject(new Error(`OpenRouter API returned status ${res.statusCode}: ${truncatedBody}`));
          return;
        }

        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            const errorMsg = parsed.error.message || JSON.stringify(parsed.error);
            reject(new Error(`OpenRouter API error: ${errorMsg}`));
            return;
          }
          
          if (!parsed.choices || parsed.choices.length === 0) {
            reject(new Error("No response choices returned from OpenRouter"));
            return;
          }
          
          const choice = parsed.choices[0];
          if (!choice.message || !choice.message.content) {
            reject(new Error("No message content in response"));
            return;
          }
          
          // Extract the model that was actually used from the response
          const modelUsed = parsed.model || null;
          
          resolve({
            text: choice.message.content,
            modelUsed,
            requestedModels: models,
            raw: parsed // Include raw response for debugging
          });
        } catch (err) {
          reject(new Error(`Failed to parse OpenRouter response: ${err.message}`));
        }
      });
    });

    // Set request timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    req.on("error", (err) => {
      reject(new Error(`OpenRouter request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Execute a routed chat completion using a named profile
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.profile - Routing profile name (deep_search, repo_surgery, cheap_batch_edits, hard_debug)
 * @param {Array<{role: string, content: string}>} params.messages - Chat messages
 * @param {number} [params.temperature] - Sampling temperature (profile-specific defaults)
 * @param {number} [params.max_tokens] - Maximum tokens to generate
 * @param {string} [params.apiKey] - OpenRouter API key
 * @param {boolean} [params.silent=false] - Suppress console logging
 * @param {number} [params.timeout] - Request timeout in milliseconds
 * @param {string} [params.httpReferer] - HTTP-Referer header
 * @param {string} [params.appTitle] - X-Title header
 * @returns {Promise<Object>} Response with text, modelUsed, requestedModels, and profile
 */
async function routedChat({ profile, messages, temperature, max_tokens, apiKey, silent = false, timeout, httpReferer, appTitle }) {
  const profileConfig = ROUTING_PROFILES[profile];
  
  if (!profileConfig) {
    const available = Object.keys(ROUTING_PROFILES).join(", ");
    throw new Error(`Unknown profile: ${profile}. Available profiles: ${available}`);
  }

  if (!silent) {
    console.log(`🔀 Routing profile: ${profile}`);
    console.log(`📝 Description: ${profileConfig.description}`);
    console.log(`🎯 Requested models (fallback order): ${profileConfig.models.join(" → ")}`);
  }

  try {
    const result = await callOpenRouter({
      models: profileConfig.models,
      messages,
      temperature,
      max_tokens,
      apiKey,
      timeout,
      httpReferer,
      appTitle,
    });

    if (!silent) {
      console.log(`✅ Model used: ${result.modelUsed || "unknown"}`);
    }
    
    return {
      ...result,
      profile,
      profileDescription: profileConfig.description,
    };
  } catch (err) {
    if (!silent) {
      console.error(`❌ All models in fallback chain failed: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Get available routing profiles
 * 
 * @returns {Object} Routing profiles configuration
 */
function getProfiles() {
  return ROUTING_PROFILES;
}

/**
 * Get models for a specific profile
 * 
 * @param {string} profile - Profile name
 * @returns {string[]} Array of model identifiers
 */
function getProfileModels(profile) {
  const profileConfig = ROUTING_PROFILES[profile];
  if (!profileConfig) {
    const available = Object.keys(ROUTING_PROFILES).join(", ");
    throw new Error(`Unknown profile: ${profile}. Available profiles: ${available}`);
  }
  return profileConfig.models;
}

module.exports = {
  callOpenRouter,
  routedChat,
  getProfiles,
  getProfileModels,
  ROUTING_PROFILES,
};
