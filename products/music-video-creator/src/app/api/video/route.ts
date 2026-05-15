import { NextRequest, NextResponse } from 'next/server';
import { runMusicVideoOrchestrator, diagnoseFailure } from '@/lib/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const avatarFile = formData.get('avatar') as File;

    if (!audioFile || !avatarFile) {
      return NextResponse.json(
        { error: 'Audio and avatar files are required' },
        { status: 400 }
      );
    }

    // Run the three-layer OpenRouter swarm orchestrator:
    //   Layer 1 — Scout agents (parallel research: provider, storage, publication, SEO)
    //   Layer 2 — Sage agent (synthesis / aggregation of all Scout responses)
    //   Layer 3 — Forge agent (deterministic execution task list)
    //
    // OpenRouter is the model router only. All side-effectful work (API calls,
    // polling, uploads, storage writes, verification) is handled by deterministic
    // code, never by the LLM.
    const orchestratorResult = await runMusicVideoOrchestrator(
      audioFile.name,
      avatarFile.name
    );

    if (orchestratorResult.render_status === 'failed') {
      const diagnosis = await diagnoseFailure(
        orchestratorResult.failed_at_stage ?? 'unknown',
        orchestratorResult.failure_reason ?? 'unknown error',
        null,
        orchestratorResult.provider_selected || 'none'
      );
      return NextResponse.json(
        {
          success: false,
          error: orchestratorResult.failure_reason,
          failure_class: orchestratorResult.failure_class,
          diagnosis,
          run_id: orchestratorResult.run_id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Orchestration complete. Execution plan ready.',
      run_id: orchestratorResult.run_id,
      render_status: orchestratorResult.render_status,
      provider_selected: orchestratorResult.provider_selected,
      provider_job_id: orchestratorResult.provider_job_id,
      artifact_uri: orchestratorResult.artifact_uri,
      canonical_video_url: orchestratorResult.canonical_video_url,
      publish_status: orchestratorResult.publish_status,
      metadata: orchestratorResult.metadata,
      tool_assessments: orchestratorResult.tool_assessments,
      models_used: orchestratorResult.models_used,
      total_token_cost_usd: orchestratorResult.total_token_cost_usd,
      swarm_query_count: orchestratorResult.swarm_logs.length,
      // Full swarm logs available for auditability
      swarm_logs: orchestratorResult.swarm_logs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in video orchestrator:', err);
    return NextResponse.json(
      { error: 'Orchestrator failed.', detail: err.message },
      { status: 500 }
    );
  }
}
