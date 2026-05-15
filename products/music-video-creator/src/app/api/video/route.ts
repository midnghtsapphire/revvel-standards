import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Supported providers in priority order. The orchestrator selects the first
// provider whose API key is present in the runtime environment.
const VIDEO_PROVIDERS = [
  { name: 'heygen',  envKey: 'HEYGEN_API_KEY',  label: 'HeyGen (lip-sync)' },
  { name: 'luma',    envKey: 'LUMA_API_KEY',     label: 'Luma Dream Machine' },
  { name: 'runway',  envKey: 'RUNWAY_API_KEY',   label: 'Runway Gen-3' },
] as const;

type ProviderName = (typeof VIDEO_PROVIDERS)[number]['name'];

interface JobRecord {
  jobId: string;
  provider: ProviderName;
  render_status: string;
  video_exists: boolean;
  provider_job_id: string | null;
  artifact_storage_url: string | null;
  canonical_video_url: string | null;
  publish_status: string;
  verified_at_utc: string | null;
  failure_reason: string | null;
  audit_log: Array<{ timestamp_utc: string; stage: string; event: string; note: string }>;
}

// In-memory job store (replace with a database in production).
const jobStore = new Map<string, JobRecord>();

function generateJobId(): string {
  return `mvc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowUtc(): string {
  return new Date().toISOString();
}

function addAuditEntry(
  job: JobRecord,
  stage: string,
  event: string,
  note: string,
): void {
  job.audit_log.push({ timestamp_utc: nowUtc(), stage, event, note });
}

/**
 * Ask OpenRouter to select the best available provider and generate the
 * execution plan for this video job. This is the model-assisted planning step
 * described in the Cross-Project Orchestration Standard.
 */
async function runOrchestratorPlanning(params: {
  audioFileName: string;
  avatarFileName: string;
  availableProviders: string[];
}): Promise<{ provider: string; plan: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set — orchestrator cannot plan without it');
  }

  const systemPrompt = `MISSION
You are the project orchestrator for a music video generation job.
Your job is to select the best available AI video provider and produce a
concise execution plan covering provider call, polling, storage, and publication.

RULES
1. Never mark a stage complete without evidence (job ID, HTTP 200, file size, etc.)
2. Never use placeholder URLs — leave fields null until real values are confirmed
3. Always record failure_reason when a stage fails; never silently skip
4. Separate planning output (your task) from deterministic execution code

AVAILABLE PROVIDERS: ${params.availableProviders.join(', ')}
If no providers are available, respond with provider: "none" and explain what is needed.`;

  const userPrompt = `Generate a complete execution plan for:
- Audio file: ${params.audioFileName}
- Avatar file: ${params.avatarFileName}
- Destination: meetaudreyevans.com
- Required output: MP4 lip-sync music video

Select the best provider from the available list. Return JSON with:
{
  "provider": "<selected_provider_name>",
  "rationale": "<why this provider>",
  "execution_steps": ["step 1", "step 2", ...],
  "required_secrets": ["ENV_VAR_NAME", ...],
  "verification_criteria": "<what confirms success>"
}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'Music Video Creator — Orchestrator',
    },
    body: JSON.stringify({
      models: [
        'anthropic/claude-sonnet-4',
        'deepseek/deepseek-chat',
        'openai/gpt-4o',
      ],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter planning call failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  // Extract JSON from the response (model may include surrounding prose)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { provider: params.availableProviders[0] ?? 'heygen', plan: content };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { provider?: string };
    return {
      provider: parsed.provider ?? params.availableProviders[0] ?? 'heygen',
      plan: content,
    };
  } catch {
    return { provider: params.availableProviders[0] ?? 'heygen', plan: content };
  }
}

/**
 * Submit a generation job to HeyGen.
 * Requires HEYGEN_API_KEY in the environment.
 */
async function submitHeygenJob(audioFile: File, avatarFile: File): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error('HEYGEN_API_KEY is not set');

  // Convert files to base64 for the HeyGen API
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: 'custom',
          avatar_style: 'normal',
        },
        voice: {
          type: 'audio',
          audio_url: `data:audio/wav;base64,${audioBuffer.toString('base64')}`,
        },
      },
    ],
    avatar_image: `data:${avatarFile.type};base64,${avatarBuffer.toString('base64')}`,
    aspect_ratio: '16:9',
    // test: true generates a watermarked preview video at no cost.
    // Set HEYGEN_TEST_MODE=false in production to generate final videos (test mode is ON by default when unset).
    test: process.env.HEYGEN_TEST_MODE !== 'false',
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

/**
 * Submit a generation job to Luma Dream Machine.
 * Requires LUMA_API_KEY in the environment.
 */
async function submitLumaJob(audioFile: File): Promise<string> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new Error('LUMA_API_KEY is not set');

  const res = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `Music video for the song: ${audioFile.name}`,
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

/**
 * Submit a generation job to the selected provider.
 * This is the deterministic execution step — no LLM involvement.
 */
async function submitToProvider(
  provider: string,
  audioFile: File,
  avatarFile: File,
): Promise<string> {
  switch (provider) {
    case 'heygen':
      return submitHeygenJob(audioFile, avatarFile);
    case 'luma':
      return submitLumaJob(audioFile);
    case 'runway': {
      const apiKey = process.env.RUNWAY_API_KEY;
      if (!apiKey) throw new Error('RUNWAY_API_KEY is not set');
      // Runway Gen-3 submission — implement when Runway API is provisioned
      throw new Error('Runway integration not yet provisioned — add RUNWAY_API_KEY and implement submitRunwayJob');
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── POST /api/video — Start a video generation job ────────────────────────

export async function POST(request: NextRequest) {
  const jobId = generateJobId();

  const job: JobRecord = {
    jobId,
    provider: 'heygen',
    render_status: 'draft',
    video_exists: false,
    provider_job_id: null,
    artifact_storage_url: null,
    canonical_video_url: null,
    publish_status: 'unpublished',
    verified_at_utc: null,
    failure_reason: null,
    audit_log: [],
  };

  jobStore.set(jobId, job);
  addAuditEntry(job, 'intake', 'job_created', `Job ${jobId} initialised`);

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const avatarFile = formData.get('avatar') as File | null;

    if (!audioFile || !avatarFile) {
      job.render_status = 'failed';
      job.failure_reason = 'Audio and avatar files are required';
      addAuditEntry(job, 'intake', 'validation_failed', job.failure_reason);
      return NextResponse.json({ error: job.failure_reason }, { status: 400 });
    }

    job.render_status = 'requirements_collected';
    addAuditEntry(job, 'intake', 'assets_received', `audio=${audioFile.name}, avatar=${avatarFile.name}`);

    // ── Stage 2: Planning via OpenRouter ──────────────────────────────────
    const availableProviders = VIDEO_PROVIDERS
      .filter(p => !!process.env[p.envKey])
      .map(p => p.name);

    if (availableProviders.length === 0) {
      job.render_status = 'backend_wiring_pending';
      job.failure_reason = 'No video provider API keys are configured. Set HEYGEN_API_KEY, LUMA_API_KEY, or RUNWAY_API_KEY.';
      addAuditEntry(job, 'planning', 'no_providers', job.failure_reason);
      return NextResponse.json({
        success: false,
        jobId,
        render_status: job.render_status,
        failure_reason: job.failure_reason,
        message: 'Backend wiring required: configure at least one video provider API key.',
      }, { status: 503 });
    }

    job.render_status = 'dependencies_identified';
    addAuditEntry(job, 'planning', 'providers_identified', `Available: ${availableProviders.join(', ')}`);

    // Ask OpenRouter to select provider and produce execution plan
    let selectedProvider = availableProviders[0];
    try {
      const orchestration = await runOrchestratorPlanning({
        audioFileName: audioFile.name,
        avatarFileName: avatarFile.name,
        availableProviders,
      });
      if (availableProviders.includes(orchestration.provider as ProviderName)) {
        selectedProvider = orchestration.provider as ProviderName;
      }
      addAuditEntry(job, 'planning', 'orchestrator_plan_received', `Provider selected: ${selectedProvider}`);
    } catch (planErr) {
      // Planning failure is non-fatal — fall back to first available provider
      const msg = planErr instanceof Error ? planErr.message : String(planErr);
      addAuditEntry(job, 'planning', 'orchestrator_plan_failed', `Falling back to ${selectedProvider}: ${msg}`);
    }

    job.provider = selectedProvider as ProviderName;
    job.render_status = 'backend_wired';
    addAuditEntry(job, 'wiring', 'provider_selected', `Using ${selectedProvider}`);

    // ── Stage 4: Execution — submit job to provider ───────────────────────
    job.render_status = 'execution_requested';
    addAuditEntry(job, 'execution', 'job_submitted', `Submitting to ${selectedProvider}`);

    let providerJobId: string;
    try {
      providerJobId = await submitToProvider(selectedProvider, audioFile, avatarFile);
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr);
      job.render_status = 'failed';
      job.failure_reason = `Provider submission failed: ${msg}`;
      addAuditEntry(job, 'execution', 'submission_failed', job.failure_reason);
      return NextResponse.json({
        success: false,
        jobId,
        render_status: job.render_status,
        failure_reason: job.failure_reason,
      }, { status: 502 });
    }

    job.provider_job_id = providerJobId;
    job.render_status = 'processing';
    addAuditEntry(job, 'execution', 'provider_job_accepted', `Provider job ID: ${providerJobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      provider: selectedProvider,
      provider_job_id: providerJobId,
      render_status: job.render_status,
      video_exists: job.video_exists,
      publish_status: job.publish_status,
      verified_at_utc: job.verified_at_utc,
      message: `Video generation job submitted to ${selectedProvider}. Poll /api/video?jobId=${jobId} to track progress.`,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    job.render_status = 'failed';
    job.failure_reason = msg;
    addAuditEntry(job, 'execution', 'unexpected_error', msg);
    console.error('Video API error:', error);
    return NextResponse.json({ error: 'Internal server error', jobId }, { status: 500 });
  }
}

// ─── GET /api/video?jobId=… — Poll job status ──────────────────────────────

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 });
  }

  const job = jobStore.get(jobId);
  if (!job) {
    return NextResponse.json({ error: `Job ${jobId} not found` }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.jobId,
    provider: job.provider,
    provider_job_id: job.provider_job_id,
    render_status: job.render_status,
    video_exists: job.video_exists,
    artifact_storage_url: job.artifact_storage_url,
    canonical_video_url: job.canonical_video_url,
    publish_status: job.publish_status,
    verified_at_utc: job.verified_at_utc,
    failure_reason: job.failure_reason,
  });
}
