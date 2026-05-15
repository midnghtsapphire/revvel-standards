import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEEP_RESEARCH_SYSTEM_PROMPT = `MISSION
You are the deep research and project orchestration agent for the Music Video Creator.
You conduct exhaustive research on the project topic and produce a complete, actionable
production plan that covers every stage from intake to verified publication.

ORCHESTRATION STANDARD
Follow the 9-stage lifecycle from the Cross-Project Orchestration Standard:
1. Intake — collect all required assets and requirements
2. Planning — identify providers, APIs, storage, and deployment targets
3. Backend Wiring — confirm all API connections and secrets
4. Execution — submit generation job and capture provider job ID
5. Storage — persist MP4 in permanent storage
6. Publication — embed on destination website
7. Verification — confirm live URL returns HTTP 200
8. Docs/Source-of-Truth Writeback — update manifest and README with real URLs
9. Handoff — expose output location and surface any failures

COMPLETION RULES
- A project is NOT complete because a manifest or README exists
- A project is complete when: artifact exists, backend is wired, publication is live,
  verification has passed, and source-of-truth records contain real final URLs
- Never use placeholder URLs — leave fields null until real values are confirmed
- Never mark a stage complete without evidence (job ID, HTTP 200, file size, etc.)

OUTPUT FORMAT
Return structured JSON with:
{
  "research_summary": "...",
  "artist_profile": { "name": "...", "genre": "...", "target_audience": "..." },
  "provider_recommendation": {
    "primary": "...",
    "rationale": "...",
    "fallback": "...",
    "estimated_cost": "...",
    "estimated_duration_minutes": 0
  },
  "required_secrets": ["ENV_VAR_NAME", ...],
  "execution_plan": ["step 1", "step 2", ...],
  "seo_metadata": {
    "title": "...",
    "description": "...",
    "tags": ["...", "..."]
  },
  "publication_target": {
    "website": "...",
    "page_path": "...",
    "verification_url": "..."
  },
  "verification_criteria": "...",
  "estimated_completion_stages": {
    "backend_wiring": "...",
    "execution": "...",
    "storage": "...",
    "publication": "...",
    "verification": "..."
  },
  "risks": ["...", "..."],
  "next_steps": ["...", "..."]
}`;

interface OrchestrateRequest {
  project_name: string;
  artist_name: string;
  song_title: string;
  destination_website: string;
  available_providers: string[];
  additional_context?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'OPENROUTER_API_KEY is not configured. The orchestrator requires OpenRouter to plan and research.',
        setup_required: [
          'Set OPENROUTER_API_KEY in your .env.local',
          'See products/music-video-creator/.env.example for all required variables',
        ],
      },
      { status: 503 },
    );
  }

  let body: Partial<OrchestrateRequest>;
  try {
    body = await request.json() as Partial<OrchestrateRequest>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    project_name = 'Music Video',
    artist_name = 'Unknown Artist',
    song_title = 'Unknown Song',
    destination_website = 'meetaudreyevans.com',
    available_providers = [],
    additional_context = '',
  } = body;

  const userPrompt = `Conduct deep research and produce a complete production plan for:

PROJECT: ${project_name}
ARTIST: ${artist_name}
SONG: ${song_title}
DESTINATION: ${destination_website}
AVAILABLE VIDEO PROVIDERS: ${available_providers.length > 0 ? available_providers.join(', ') : 'none configured — recommend what is needed'}
ADDITIONAL CONTEXT: ${additional_context || 'none'}

Research the artist, song, target audience, visual style, and best video generation
approach. Select the optimal provider and produce a step-by-step execution plan that
covers every lifecycle stage through to verified publication on ${destination_website}.

Include realistic timeline estimates, cost estimates, required API keys, and a full
SEO metadata package for the publication page.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
        'X-Title': 'Music Video Creator — Deep Research Orchestrator',
      },
      body: JSON.stringify({
        models: [
          'anthropic/claude-sonnet-4',
          'deepseek/deepseek-v3.2',
          'openai/gpt-5.2-codex',
        ],
        messages: [
          { role: 'system', content: DEEP_RESEARCH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `OpenRouter request failed (${response.status}): ${err}` },
        { status: 502 },
      );
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const modelUsed = data.model ?? 'unknown';

    // Extract structured JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let plan: Record<string, unknown> = { raw: content };
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        plan = { raw: content };
      }
    }

    return NextResponse.json({
      success: true,
      model_used: modelUsed,
      project: { project_name, artist_name, song_title, destination_website },
      plan,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Orchestrate API error:', error);
    return NextResponse.json({ error: `Orchestrator failed: ${msg}` }, { status: 500 });
  }
}
