'use strict';
/**
 * Pure-function helpers for the Music Video Creator API routes.
 *
 * This module intentionally has NO Next.js or Node.js runtime imports so it
 * can be required directly by the repo's plain-Node test harness without
 * compilation.
 *
 * TypeScript types are maintained via JSDoc comments.
 */

/**
 * Provider priority list used by the orchestrator and tests.
 * @type {Array<{name: string, envKey: string, label: string}>}
 */
const VIDEO_PROVIDERS = [
  { name: 'heygen',  envKey: 'HEYGEN_API_KEY',  label: 'HeyGen (lip-sync)' },
  { name: 'luma',    envKey: 'LUMA_API_KEY',     label: 'Luma Dream Machine' },
  { name: 'runway',  envKey: 'RUNWAY_API_KEY',   label: 'Runway Gen-3' },
];

/**
 * From the list of available providers, select the best one.
 * If the orchestrator returned a choice that is in the available list, honour
 * it.  Otherwise fall back to the first available provider.
 *
 * @param {string[]} availableProviders - Providers whose API key is present.
 * @param {string}   orchestratorChoice - Provider name suggested by the LLM.
 * @returns {string} The selected provider name.
 * @throws {Error} If availableProviders is empty.
 */
function selectBestProvider(availableProviders, orchestratorChoice) {
  if (!availableProviders || availableProviders.length === 0) {
    throw new Error('No video providers available — configure at least one provider API key.');
  }
  if (orchestratorChoice && availableProviders.includes(orchestratorChoice)) {
    return orchestratorChoice;
  }
  return availableProviders[0];
}

/**
 * Robustly extract a JSON object from an LLM text response.
 *
 * Strategy (in order of preference):
 * 1. If the content is already valid JSON, parse and return it.
 * 2. Walk character-by-character to find the outermost balanced `{...}`.
 *    This avoids the greedy `[\s\S]*` regex that can merge multiple JSON
 *    objects or truncate content with nested `}` chars.
 * 3. If no balanced block is found, return null.
 *
 * @param {string} content - Raw LLM response text.
 * @returns {object|null} Parsed JSON object or null on failure.
 */
function extractJsonFromContent(content) {
  if (!content || typeof content !== 'string') return null;

  // Fast path: the whole string is JSON (happens with response_format:json_object)
  try {
    return JSON.parse(content);
  } catch { /* fall through */ }

  // Walk to find the first balanced `{ ... }` block
  const start = content.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(content.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Build a normalized "failed" JobStatus object suitable for the API response
 * and the client-side `JobStatus` interface.
 *
 * @param {string} failureReason - Human-readable failure description.
 * @param {string} [render_status='failed'] - Override the status label.
 * @returns {object} Normalized JobStatus.
 */
function buildErrorJobStatus(failureReason, render_status = 'failed') {
  return {
    jobId: '',
    provider: '',
    provider_job_id: null,
    render_status,
    video_exists: false,
    artifact_storage_url: null,
    canonical_video_url: null,
    publish_status: 'unpublished',
    verified_at_utc: null,
    failure_reason: failureReason,
    message: failureReason,
  };
}

/**
 * Map a provider's raw status string to our canonical 13-value status machine.
 *
 * @param {string} provider  - Provider name ('heygen' | 'luma').
 * @param {string} rawStatus - Status string returned by the provider.
 * @returns {{ render_status: string, video_exists: boolean }}
 */
function normalizeProviderStatus(provider, rawStatus) {
  if (provider === 'heygen') {
    switch (rawStatus) {
      case 'completed': return { render_status: 'artifact_created', video_exists: true };
      case 'failed':    return { render_status: 'failed',           video_exists: false };
      default:          return { render_status: 'processing',        video_exists: false };
    }
  }
  if (provider === 'luma') {
    switch (rawStatus) {
      case 'completed': return { render_status: 'artifact_created', video_exists: true };
      case 'failed':    return { render_status: 'failed',           video_exists: false };
      default:          return { render_status: 'processing',        video_exists: false };
    }
  }
  return { render_status: 'processing', video_exists: false };
}

module.exports = {
  VIDEO_PROVIDERS,
  selectBestProvider,
  extractJsonFromContent,
  buildErrorJobStatus,
  normalizeProviderStatus,
};
