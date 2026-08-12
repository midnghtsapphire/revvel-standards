import { NextResponse } from 'next/server';
import {
  ALLOWED_DOMAINS,
  ALLOWED_SKILLS,
  MAX_SKILLS,
  TIMEOUT_MAX,
  TIMEOUT_MIN,
} from '../../data/validator';

export const runtime = 'nodejs';

/** Public schema summary for integrators (mirrors schemas/registry_rules.json). */
export async function GET() {
  return NextResponse.json({
    title: 'RevvelStandardsAgentManifest',
    source: 'schemas/registry_rules.json',
    required: [
      'persona_id',
      'version',
      'skills',
      'target_artifact_domains',
      'system_constraints',
    ],
    skills: {
      maxItems: MAX_SKILLS,
      enum: ALLOWED_SKILLS,
    },
    target_artifact_domains: {
      enum: ALLOWED_DOMAINS,
    },
    system_constraints: {
      execution_timeout_seconds: { minimum: TIMEOUT_MIN, maximum: TIMEOUT_MAX },
      allow_local_shell_access: { type: 'boolean' },
    },
    persona_id_pattern: '^[a-z0-9-]+-agent$',
    version_pattern: '^\\d+\\.\\d+\\.\\d+$',
  });
}
