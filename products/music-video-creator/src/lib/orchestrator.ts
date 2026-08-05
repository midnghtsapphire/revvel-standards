/**
 * Music Video Creator — OpenRouter Swarm Orchestrator
 *
 * Implements the three-layer swarm pattern from
 * docs/orchestration/openrouter-execution-contract.md:
 *
 *   Layer 1 — Scout agents (parallel research via OpenRouter)
 *   Layer 2 — Sage agent (synthesis / aggregation)
 *   Layer 3 — Forge agent (deterministic task list)
 *
 * OpenRouter is the model router only. All side-effectful work
 * (API calls, uploads, polling, storage writes, verification) is
 * handled by deterministic code, never by the LLM.
 */

import { OPENROUTER_API_URL } from './openrouter-config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractJsonFromContent } = require('./video-job-helpers') as {
  extractJsonFromContent: (content: string) => Record<string, unknown> | null;
};

export type FailureClass =
  | 'missing_secret'
  | 'connectivity'
  | 'auth_error'
  | 'rate_limit'
  | 'provider_error'
  | 'artifact_missing'
  | 'publish_failed'
  | 'verification_failed'
  | 'unknown';

export type RenderStatus =
  | 'draft'
  | 'requirements_collected'
  | 'dependencies_identified'
  | 'backend_wiring_pending'
  | 'backend_wired'
  | 'execution_requested'
  | 'processing'
  | 'artifact_created'
  | 'stored'
  | 'published'
  | 'verified'
  | 'indexed'
  | 'failed';

export interface SwarmQueryLog {
  run_id: string;
  query_id: string;
  phase: 'scout' | 'sage' | 'forge' | 'planning' | 'diagnosis';
  scout_name: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  est_cost_usd: string;
  response_text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed_response: Record<string, any> | null;
  confidence: 'high' | 'medium' | 'low';
  timestamp_utc: string;
  used_in_final: boolean;
}

export interface OrchestratorResult {
  run_id: string;
  render_status: RenderStatus;
  provider_selected: string;
  provider_job_id: string | null;
  artifact_uri: string | null;
  canonical_video_url: string | null;
  publish_status: 'unpublished' | 'published' | 'verified';
  failure_class: FailureClass | null;
  failure_reason: string | null;
  failed_at_stage: string | null;
  swarm_logs: SwarmQueryLog[];
  tool_assessments: ToolAssessment[];
  metadata: VideoMetadata;
  total_token_cost_usd: string;
  models_used: string[];
}

export interface ToolAssessment {
  tool_name: string;
  category: 'api' | 'library' | 'service' | 'infra';
  foss: boolean;
  cost_model: 'free' | 'per-call' | 'subscription' | 'usage-based';
  est_cost_per_run: string;
  est_monthly_cost: string;
  alternatives: { name: string; foss: boolean; cost: string }[];
  selected: boolean;
  selection_reason: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  canonical_url_path: string;
}

export interface DiagnosisResult {
  failure_class: FailureClass;
  root_cause: string;
  is_retryable: boolean;
  recommended_action: string;
  next_step_for_human: string | null;
}

/**
 * Approximate cost per token in USD, averaged across the models used in this swarm.
 * Actual costs vary by model and OpenRouter pricing may change over time.
 * Update this constant when repricing OpenRouter models significantly.
 */
const TOKEN_COST_USD_PER_UNIT = 0.000003;

// Scout configuration — one agent per research domain
const SCOUTS = [
  {
    name: 'Scout-1',
    domain: 'provider_selection',
    model: 'anthropic/claude-sonnet-4',
    question:
      'Compare HeyGen, D-ID, Runway Gen-4, and Luma Dream Machine for AI music video generation ' +
      'with lip-sync capability. Assess: cost per video, quality, latency, API availability, ' +
      'and FOSS alternatives (Wav2Lip, SadTalker). Output a recommendation with justification.',
  },
  {
    name: 'Scout-2',
    domain: 'storage_options',
    model: 'deepseek/deepseek-v3.2',
    question:
      'Compare Vercel Blob, Cloudflare R2, and AWS S3 for storing music video input/output assets ' +
      '(WAV files ~50MB, MP4 files ~200MB). Assess: cost, latency, CDN support, free tier. ' +
      'Recommend the best option for a Next.js app hosted on Vercel.',
  },
  {
    name: 'Scout-3',
    domain: 'publication_requirements',
    model: 'anthropic/claude-sonnet-4',
    question:
      'What are the technical requirements to publish a generated MP4 video to a Vercel-hosted ' +
      'Next.js website (meetaudreyevans.com)? Include: deployment method, video embedding best ' +
      'practices, og:video meta tags for social sharing, and required environment variables.',
  },
  {
    name: 'Scout-4',
    domain: 'seo_metadata',
    model: 'anthropic/claude-sonnet-4',
    question:
      'Generate SEO-optimised metadata for an AI music video page. The artist is Audrey Evans. ' +
      'Include: title tag, meta description (max 160 chars), og:title, og:description, ' +
      'JSON-LD schema for MusicVideoObject, and 5 relevant tags. Output as JSON.',
  },
] as const;

const SAGE_MODEL = 'anthropic/claude-sonnet-4';
const FORGE_MODEL = 'anthropic/claude-sonnet-4';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function safeParse(text: string): Record<string, unknown> | null {
  return extractJsonFromContent(text);
}

function isDiagnosisResult(value: unknown): value is DiagnosisResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Record<keyof DiagnosisResult, unknown>>;

  return (
    typeof candidate.failure_class === 'string' &&
    typeof candidate.root_cause === 'string' &&
    typeof candidate.is_retryable === 'boolean' &&
    typeof candidate.recommended_action === 'string' &&
    (typeof candidate.next_step_for_human === 'string' || candidate.next_step_for_human === null)
  );
}

async function callOpenRouter(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const body = JSON.stringify({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'revvel-standards/music-video-creator',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const status = response.status;
    if (status === 429) throw Object.assign(new Error('Rate limit'), { failureClass: 'rate_limit' });
    if (status === 401 || status === 403) throw Object.assign(new Error('Auth error'), { failureClass: 'auth_error' });
    throw Object.assign(new Error(`OpenRouter error ${status}: ${errorText}`), {
      failureClass: 'provider_error',
    });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  return { content, promptTokens, completionTokens };
}

const SCOUT_SYSTEM_PROMPT = (domain: string, scoutName: string) =>
  `You are ${scoutName} (${domain} specialist) in a multi-agent research swarm for a music video creation pipeline.
Your only job is to answer the research question with maximum depth and accuracy.
Output valid JSON matching this schema:
{
  "domain": "${domain}",
  "model_id": "string",
  "answer": "string",
  "confidence": "high" | "medium" | "low",
  "sources": ["string"],
  "caveats": ["string"],
  "tool_assessments": [/* optional array of tool cost objects */],
  "recommendation": "string"
}`;

const SAGE_SYSTEM_PROMPT = `You are Sage, the synthesis agent in a multi-agent swarm.
You receive responses from Scout agents researching different domains.
Combine their findings into one authoritative plan.
Rules:
- Identify consensus points (all/majority Scouts agree): mark as CONFIRMED
- Flag disagreements: mark as DISPUTED, list the conflict and your resolution
- Record which Scout's answer was used for each key decision
- Output valid JSON matching this schema:
{
  "consensus": [{ "topic": "string", "decision": "string", "scouts_agreed": ["string"] }],
  "disputed": [{ "topic": "string", "options": ["string"], "selected": "string", "reason": "string" }],
  "selected_provider": "string",
  "selected_storage": "string",
  "publication_method": "string",
  "tool_assessments": [/* array of tool assessment objects */],
  "metadata": { "title": "string", "description": "string", "tags": ["string"], "canonical_url_path": "string" },
  "risk_register": [{ "risk": "string", "likelihood": "high"|"medium"|"low", "mitigation": "string" }]
}`;

const FORGE_SYSTEM_PROMPT = `You are Forge, the execution specification agent.
Translate the Sage synthesis into a precise ordered task list for deterministic code execution.
Output valid JSON matching this schema:
{
  "tasks": [
    {
      "task_id": "string",
      "stage": number,
      "name": "string",
      "type": "api_call" | "poll" | "upload" | "storage_write" | "publish" | "verify" | "writeback",
      "provider": "string",
      "required_secrets": ["string"],
      "inputs": {},
      "expected_outputs": {},
      "retry_policy": { "max_attempts": number, "back_off_seconds": [number] },
      "on_failure": "retry" | "surface_to_human" | "skip"
    }
  ],
  "required_secrets": ["string"],
  "estimated_total_cost": "string",
  "estimated_duration_seconds": number
}`;

/**
 * Run the full three-layer swarm for a music video project.
 *
 * @param audioFileName  Name of the uploaded audio file
 * @param avatarFileName Name of the uploaded avatar file
 * @returns OrchestratorResult with swarm logs and execution plan
 */
export async function runMusicVideoOrchestrator(
  audioFileName: string,
  avatarFileName: string
): Promise<OrchestratorResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const runId = generateId('run');
  const swarmLogs: SwarmQueryLog[] = [];
  const modelsUsed: string[] = [];
  let totalTokens = 0;

  const result: OrchestratorResult = {
    run_id: runId,
    render_status: 'draft',
    provider_selected: '',
    provider_job_id: null,
    artifact_uri: null,
    canonical_video_url: null,
    publish_status: 'unpublished',
    failure_class: null,
    failure_reason: null,
    failed_at_stage: null,
    swarm_logs: swarmLogs,
    tool_assessments: [],
    metadata: { title: '', description: '', tags: [], canonical_url_path: '' },
    total_token_cost_usd: '0.0000',
    models_used: modelsUsed,
  };

  // ── Gate: OPENROUTER_API_KEY must be present ────────────────────────────
  if (!apiKey) {
    result.render_status = 'failed';
    result.failure_class = 'missing_secret';
    result.failure_reason = 'OPENROUTER_API_KEY is not set in the environment';
    result.failed_at_stage = 'backend_wiring';
    return result;
  }

  result.render_status = 'requirements_collected';

  // ── Layer 1: Scout Phase (parallel) ────────────────────────────────────
  const scoutPromises = SCOUTS.map(async (scout) => {
    const queryId = generateId('scout');
    const userPrompt = `Research question for ${scout.domain}:\n${scout.question}\n\nContext: audio file="${audioFileName}", avatar file="${avatarFileName}"`;

    try {
      const { content, promptTokens, completionTokens } = await callOpenRouter(
        apiKey,
        scout.model,
        SCOUT_SYSTEM_PROMPT(scout.domain, scout.name),
        userPrompt,
        1500
      );

      const tokensUsed = promptTokens + completionTokens;
      totalTokens += tokensUsed;
      if (!modelsUsed.includes(scout.model)) modelsUsed.push(scout.model);

      const parsed = safeParse(content);
      const log: SwarmQueryLog = {
        run_id: runId,
        query_id: queryId,
        phase: 'scout',
        scout_name: scout.name,
        model_id: scout.model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: tokensUsed,
        est_cost_usd: (tokensUsed * TOKEN_COST_USD_PER_UNIT).toFixed(6),
        response_text: content,
        parsed_response: parsed,
        confidence: (parsed?.confidence as 'high' | 'medium' | 'low') ?? 'medium',
        timestamp_utc: isoNow(),
        used_in_final: true,
      };
      swarmLogs.push(log);
      return { scout: scout.name, content, parsed };
    } catch (err: unknown) {
      const error = err as Error & { failureClass?: string };
      const log: SwarmQueryLog = {
        run_id: runId,
        query_id: queryId,
        phase: 'scout',
        scout_name: scout.name,
        model_id: scout.model,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        est_cost_usd: '0.0000',
        response_text: error.message,
        parsed_response: null,
        confidence: 'low',
        timestamp_utc: isoNow(),
        used_in_final: false,
      };
      swarmLogs.push(log);
      return { scout: scout.name, content: '', parsed: null, error: error.message };
    }
  });

  const scoutResults = await Promise.all(scoutPromises);
  result.render_status = 'dependencies_identified';

  // ── Layer 2: Sage Phase (synthesis) ──────────────────────────────────
  const sageQueryId = generateId('sage');
  const scoutSummary = JSON.stringify(
    scoutResults.map((r) => ({ scout: r.scout, response: r.parsed ?? r.content })),
    null,
    2
  );

  let sageOutput: Record<string, unknown> | null = null;

  try {
    const { content: sageContent, promptTokens, completionTokens } = await callOpenRouter(
      apiKey,
      SAGE_MODEL,
      SAGE_SYSTEM_PROMPT,
      `Scout responses:\n${scoutSummary}`,
      2000
    );

    const tokensUsed = promptTokens + completionTokens;
    totalTokens += tokensUsed;
    if (!modelsUsed.includes(SAGE_MODEL)) modelsUsed.push(SAGE_MODEL);

    sageOutput = safeParse(sageContent);

    swarmLogs.push({
      run_id: runId,
      query_id: sageQueryId,
      phase: 'sage',
      scout_name: 'Sage',
      model_id: SAGE_MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: tokensUsed,
      est_cost_usd: (tokensUsed * TOKEN_COST_USD_PER_UNIT).toFixed(6),
      response_text: sageContent,
      parsed_response: sageOutput,
      confidence: 'high',
      timestamp_utc: isoNow(),
      used_in_final: true,
    });
  } catch (err: unknown) {
    const error = err as Error & { failureClass?: string };
    swarmLogs.push({
      run_id: runId,
      query_id: sageQueryId,
      phase: 'sage',
      scout_name: 'Sage',
      model_id: SAGE_MODEL,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      est_cost_usd: '0.0000',
      response_text: error.message,
      parsed_response: null,
      confidence: 'low',
      timestamp_utc: isoNow(),
      used_in_final: false,
    });
  }

  // Extract Sage outputs
  if (sageOutput) {
    result.provider_selected = (sageOutput.selected_provider as string) ?? '';
    result.tool_assessments = (sageOutput.tool_assessments as ToolAssessment[]) ?? [];
    if (sageOutput.metadata) {
      result.metadata = sageOutput.metadata as VideoMetadata;
    }
  }

  result.render_status = 'backend_wiring_pending';

  // ── Layer 3: Forge Phase (execution plan) ────────────────────────────
  const forgeQueryId = generateId('forge');

  try {
    const { content: forgeContent, promptTokens, completionTokens } = await callOpenRouter(
      apiKey,
      FORGE_MODEL,
      FORGE_SYSTEM_PROMPT,
      `Sage synthesis:\n${JSON.stringify(sageOutput ?? {}, null, 2)}\n\nContext: audio="${audioFileName}", avatar="${avatarFileName}"`,
      2000
    );

    const tokensUsed = promptTokens + completionTokens;
    totalTokens += tokensUsed;
    if (!modelsUsed.includes(FORGE_MODEL)) modelsUsed.push(FORGE_MODEL);

    const forgeOutput = safeParse(forgeContent);

    swarmLogs.push({
      run_id: runId,
      query_id: forgeQueryId,
      phase: 'forge',
      scout_name: 'Forge',
      model_id: FORGE_MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: tokensUsed,
      est_cost_usd: (tokensUsed * TOKEN_COST_USD_PER_UNIT).toFixed(6),
      response_text: forgeContent,
      parsed_response: forgeOutput,
      confidence: 'high',
      timestamp_utc: isoNow(),
      used_in_final: true,
    });
  } catch (err: unknown) {
    const error = err as Error;
    swarmLogs.push({
      run_id: runId,
      query_id: forgeQueryId,
      phase: 'forge',
      scout_name: 'Forge',
      model_id: FORGE_MODEL,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      est_cost_usd: '0.0000',
      response_text: error.message,
      parsed_response: null,
      confidence: 'low',
      timestamp_utc: isoNow(),
      used_in_final: false,
    });
  }

  result.render_status = 'backend_wired';
  result.total_token_cost_usd = (totalTokens * TOKEN_COST_USD_PER_UNIT).toFixed(6);

  return result;
}

/**
 * Diagnose a pipeline failure using an OpenRouter model.
 * Returns a failure classification and recommended next action.
 */
export async function diagnoseFailure(
  stageName: string,
  errorMessage: string,
  httpStatus: number | null,
  providerName: string
): Promise<DiagnosisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      failure_class: 'missing_secret',
      root_cause: 'OPENROUTER_API_KEY not set',
      is_retryable: false,
      recommended_action: 'Set OPENROUTER_API_KEY in environment',
      next_step_for_human: 'Add OPENROUTER_API_KEY to repository secrets',
    };
  }

  const systemPrompt = `You are a failure diagnosis agent for a music video generation pipeline.
Classify the failure and recommend the next action.
Output valid JSON with fields: failure_class, root_cause, is_retryable, recommended_action, next_step_for_human.
Valid failure_class values: missing_secret | connectivity | auth_error | rate_limit | provider_error | artifact_missing | publish_failed | verification_failed | unknown`;

  const userPrompt = `Stage: ${stageName}
Error: ${errorMessage}
HTTP status: ${httpStatus ?? 'N/A'}
Provider: ${providerName}`;

  try {
    const { content } = await callOpenRouter(
      apiKey,
      'anthropic/claude-sonnet-4',
      systemPrompt,
      userPrompt,
      500
    );
    const parsed = safeParse(content);
    if (parsed && isDiagnosisResult(parsed)) return parsed;
  } catch {
    // fallback below
  }

  // Deterministic fallback classification
  const msg = errorMessage.toLowerCase();
  if (msg.includes('401') || msg.includes('403') || msg.includes('auth'))
    return { failure_class: 'auth_error', root_cause: errorMessage, is_retryable: false, recommended_action: 'Check API credentials', next_step_for_human: 'Verify API key is valid and has required permissions' };
  if (msg.includes('429') || msg.includes('rate'))
    return { failure_class: 'rate_limit', root_cause: errorMessage, is_retryable: true, recommended_action: 'Retry with exponential back-off', next_step_for_human: null };
  if (httpStatus !== null && httpStatus >= 500 && httpStatus < 600)
    return { failure_class: 'provider_error', root_cause: errorMessage, is_retryable: true, recommended_action: 'Retry after delay', next_step_for_human: null };

  return { failure_class: 'unknown', root_cause: errorMessage, is_retryable: false, recommended_action: 'Investigate manually', next_step_for_human: 'Review error details and retry' };
}
