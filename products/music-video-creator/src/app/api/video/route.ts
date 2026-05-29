import { NextRequest, NextResponse } from 'next/server';
import { OPENROUTER_API_URL, OR_MODELS, requireApiKey } from '../../../lib/music-video-api';
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  VIDEO_PROVIDERS,
  selectBestProvider,
  extractJsonFromContent,
  normalizeProviderStatus,
} = require('../../../lib/video-job-helpers') as {
  VIDEO_PROVIDERS: Array<{ name: string; envKey: string; label: string }>;
  selectBestProvider: (available: string[], choice: string) => string;
  extractJsonFromContent: (content: string) => Record<string, unknown> | null;
  normalizeProviderStatus: (provider: string, raw: string) => { render_status: string; video_exists: boolean };
};

type ProviderName = 'heygen' | 'luma' | 'runway';

// ─── OpenRouter planning ─────────────────────────────────────────────────────

async function runOrchestratorPlanning(params: {
  audioFileName: string;
  avatarFileName: string;
  availableProviders: string[];
}): Promise<{ provider: string; plan: Record<string, unknown> }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set — orchestrator cannot plan without it');
  }

  const systemPrompt = `MISSION
You are the project orchestrator for a music video generation job.
Select the best available AI video provider and produce a concise execution plan.

RULES
1. Never mark a stage complete without evidence (job ID, HTTP 200, file size, etc.)
2. Never use placeholder URLs — leave fields null until real values are confirmed
3. Always record failure_reason when a stage fails; never silently skip

AVAILABLE PROVIDERS: ${params.availableProviders.join(', ')}

Return ONLY a JSON object (no prose) with keys:
provider, rationale, execution_steps, required_secrets, verification_criteria`;

  const userPrompt = `Plan generation for:
- Audio file: ${params.audioFileName}
- Avatar file: ${params.avatarFileName}
- Destination: meetaudreyevans.com
- Required output: MP4 lip-sync music video`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'Music Video Creator — Orchestrator',
    },
    body: JSON.stringify({
      // model field required for OpenAI-compatible clients; models array used for OR fallback routing
      model: OR_MODELS[0],
      models: OR_MODELS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter planning call failed (${response.status}): ${err}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content: string = data.choices?.[0]?.message?.content ?? '';

  const parsed = extractJsonFromContent(content) ?? {};
  return {
    provider: (parsed['provider'] as string) ?? params.availableProviders[0] ?? 'heygen',
    plan: parsed,
  };
}

// ─── HeyGen helpers ──────────────────────────────────────────────────────────

/**
 * Upload a single file to HeyGen's asset API and return its hosted URL.
 * Using the asset upload endpoint avoids base64-encoding large files inline,
 * which would blow past both the Vercel 4.5 MB request body limit and HeyGen's
 * own request size limits.
 */
async function uploadAssetToHeygen(file: File, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('type', file.type.startsWith('audio') ? 'audio' : 'image');

  const res = await fetch('https://upload.heygen.com/v1/asset', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen asset upload failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { data?: { url?: string; asset_id?: string } };
  const url = data.data?.url;
  if (!url) throw new Error('HeyGen asset upload did not return a URL');
  return url;
}

/**
 * Submit a lip-sync video generation job to HeyGen.
 * Files are first uploaded via the asset API (no base64 inline).
 */
async function submitHeygenJob(audioFile: File, avatarFile: File): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error('HEYGEN_API_KEY is not set');

  // Upload assets first — avoids large base64-encoded inline payloads
  const [audioUrl, avatarUrl] = await Promise.all([
    uploadAssetToHeygen(audioFile, apiKey),
    uploadAssetToHeygen(avatarFile, apiKey),
  ]);

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_image_url: avatarUrl,
          avatar_style: 'normal',
        },
        voice: {
          type: 'audio',
          audio_url: audioUrl,
        },
      },
    ],
    aspect_ratio: '16:9',
    // HEYGEN_TEST_MODE=true generates watermarked previews (opt-in).
    // Production mode (no watermark) is the default when HEYGEN_TEST_MODE is unset.
    test: process.env.HEYGEN_TEST_MODE === 'true',
  };

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen job submission failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { data?: { video_id?: string } };
  const videoId = data.data?.video_id;
  if (!videoId) throw new Error('HeyGen did not return a video_id');
  return videoId;
}

// ─── Luma helpers ─────────────────────────────────────────────────────────────

async function submitLumaJob(audioFile: File, themePrompt?: string): Promise<string> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new Error('LUMA_API_KEY is not set');

  const finalPrompt = themePrompt
    ? `${themePrompt} (Song: ${audioFile.name})`
    : `Music video for the song: ${audioFile.name}`;

  const res = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: finalPrompt,
      loop: false,
      aspect_ratio: '16:9',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma job submission failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { id?: string };
  if (!data.id) throw new Error('Luma did not return a generation id');
  return data.id;
}

// ─── Provider job submission ─────────────────────────────────────────────────

async function submitToProvider(
  provider: string,
  audioFile: File,
  avatarFile: File,
  themePrompt?: string,
): Promise<string> {
  switch (provider) {
    case 'heygen':
      return submitHeygenJob(audioFile, avatarFile);
    case 'luma':
      return submitLumaJob(audioFile, themePrompt);
    case 'runway':
      throw new Error('Runway integration not yet provisioned — add RUNWAY_API_KEY and implement submitRunwayJob');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── Provider status polling (for GET endpoint) ──────────────────────────────

interface ProviderStatus {
  render_status: string;
  video_exists: boolean;
  canonical_video_url: string | null;
  failure_reason: string | null;
}

async function pollHeygenStatus(providerJobId: string): Promise<ProviderStatus> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error('HEYGEN_API_KEY is not set');

  const res = await fetch(
    `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(providerJobId)}`,
    { headers: { 'X-Api-Key': apiKey } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen status check failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    data?: { status?: string; video_url?: string; error?: string };
  };
  const raw = data.data?.status ?? 'processing';
  const { render_status, video_exists } = normalizeProviderStatus('heygen', raw);

  return {
    render_status,
    video_exists,
    canonical_video_url: video_exists ? (data.data?.video_url ?? null) : null,
    failure_reason: raw === 'failed' ? (data.data?.error ?? 'HeyGen generation failed') : null,
  };
}

async function pollLumaStatus(providerJobId: string): Promise<ProviderStatus> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new Error('LUMA_API_KEY is not set');

  const res = await fetch(
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(providerJobId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma status check failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    state?: string;
    assets?: { video?: string };
    failure_reason?: string;
  };
  const raw = data.state ?? 'pending';
  const { render_status, video_exists } = normalizeProviderStatus('luma', raw);

  return {
    render_status,
    video_exists,
    canonical_video_url: video_exists ? (data.assets?.video ?? null) : null,
    failure_reason: raw === 'failed' ? (data.failure_reason ?? 'Luma generation failed') : null,
  };
}

async function pollProviderStatus(provider: string, providerJobId: string): Promise<ProviderStatus> {
  switch (provider) {
    case 'heygen': return pollHeygenStatus(providerJobId);
    case 'luma':   return pollLumaStatus(providerJobId);
    default:
      throw new Error(`Status polling not implemented for provider: ${provider}`);
  }
}

// ─── POST /api/video — Start a video generation job ─────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const audit: Array<{ timestamp_utc: string; stage: string; event: string; note: string }> = [];
  function log(stage: string, event: string, note: string) {
    audit.push({ timestamp_utc: new Date().toISOString(), stage, event, note });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const avatarFile = formData.get('avatar') as File | null;
    const themePrompt = formData.get('theme_prompt') as string | null;

    if (!(audioFile instanceof File) || !(avatarFile instanceof File)) {
      return NextResponse.json(
        { error: 'Audio and avatar files are required', render_status: 'failed', video_exists: false },
        { status: 400 },
      );
    }

    log('intake', 'assets_received', `audio=${audioFile.name}, avatar=${avatarFile.name}`);

    // ── Stage 2: Identify available providers ────────────────────────────
    const availableProviders = (VIDEO_PROVIDERS as Array<{ name: string; envKey: string }>)
      .filter(p => !!process.env[p.envKey])
      .map(p => p.name);

    if (availableProviders.length === 0) {
      const reason = 'No video provider API keys are configured. Set HEYGEN_API_KEY, LUMA_API_KEY, or RUNWAY_API_KEY.';
      log('planning', 'no_providers', reason);
      return NextResponse.json({
        success: false,
        provider: null,
        provider_job_id: null,
        render_status: 'backend_wiring_pending',
        video_exists: false,
        artifact_storage_url: null,
        canonical_video_url: null,
        publish_status: 'unpublished',
        verified_at_utc: null,
        failure_reason: reason,
        message: 'Backend wiring required: configure at least one video provider API key.',
        audit_log: audit,
      }, { status: 500 });
    }

    log('planning', 'providers_identified', `Available: ${availableProviders.join(', ')}`);

    // ── Stage 3: OpenRouter planning (model-assisted) ────────────────────
    let selectedProvider: ProviderName = availableProviders[0] as ProviderName;
    try {
      const orchestration = await runOrchestratorPlanning({
        audioFileName: audioFile.name,
        avatarFileName: avatarFile.name,
        availableProviders,
      });
      selectedProvider = selectBestProvider(availableProviders, orchestration.provider) as ProviderName;
      log('planning', 'orchestrator_plan_received', `Provider selected: ${selectedProvider}`);
    } catch (planErr) {
      const msg = planErr instanceof Error ? planErr.message : String(planErr);
      log('planning', 'orchestrator_plan_failed', `Falling back to ${selectedProvider}: ${msg}`);
    }

    log('wiring', 'provider_selected', `Using ${selectedProvider}`);

    // ── Stage 4: Submit job to provider (deterministic) ──────────────────
    log('execution', 'job_submitting', `Submitting to ${selectedProvider}`);

    let providerJobId: string;
    try {
      providerJobId = await submitToProvider(selectedProvider, audioFile, avatarFile, themePrompt || undefined);
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr);
      log('execution', 'submission_failed', msg);
      return NextResponse.json({
        success: false,
        provider: selectedProvider,
        provider_job_id: null,
        render_status: 'failed',
        video_exists: false,
        artifact_storage_url: null,
        canonical_video_url: null,
        publish_status: 'unpublished',
        verified_at_utc: null,
        failure_reason: `Provider submission failed: ${msg}`,
        audit_log: audit,
      }, { status: 502 });
    }

    log('execution', 'provider_job_accepted', `Provider job ID: ${providerJobId}`);

    return NextResponse.json({
      success: true,
      provider: selectedProvider,
      provider_job_id: providerJobId,
      render_status: 'processing',
      video_exists: false,
      artifact_storage_url: null,
      canonical_video_url: null,
      publish_status: 'unpublished',
      verified_at_utc: null,
      failure_reason: null,
      message: `Video generation job submitted to ${selectedProvider}. Poll GET /api/video?provider=${selectedProvider}&provider_job_id=${providerJobId} to track progress.`,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Video API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', render_status: 'failed', video_exists: false, failure_reason: msg },
      { status: 500 },
    );
  }
}

// ─── GET /api/video?provider=&provider_job_id= — Poll job status ─────────────
//
// The status endpoint polls the provider directly rather than looking up a
// local in-memory store.  This is required for Vercel / Next.js serverless
// deployments where each request may hit a different Lambda instance and
// module-scope Maps are not shared across instances.

export async function GET(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get('provider');
  const providerJobId = searchParams.get('provider_job_id');

  if (!provider || !providerJobId) {
    return NextResponse.json(
      { error: 'provider and provider_job_id query parameters are required' },
      { status: 400 },
    );
  }

  try {
    const status = await pollProviderStatus(provider, providerJobId);
    return NextResponse.json({
      provider,
      provider_job_id: providerJobId,
      ...status,
      publish_status: status.video_exists ? 'artifact_ready' : 'unpublished',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Video API GET error:', error);
    return NextResponse.json(
      { error: `Status check failed: ${msg}`, render_status: 'failed', video_exists: false },
      { status: 502 },
    );
  }
}
