/**
 * Agent manifest validator — TypeScript port of scripts/lib/validate-agent-manifest.js
 * Keep rules in lockstep with schemas/registry_rules.json (max 5 skills, domain enum, etc.).
 */

export const ALLOWED_SKILLS = [
  'web_scrape',
  'keyword_extract',
  'mcp_file_read',
  'github_api_commit',
  'linear_task_update',
  'terminal_cli_command',
] as const;

export const ALLOWED_DOMAINS = [
  'meetaudreyevans',
  'oaudrey',
  'openaudrey',
] as const;

export type AllowedSkill = (typeof ALLOWED_SKILLS)[number];
export type AllowedDomain = (typeof ALLOWED_DOMAINS)[number];

export const MAX_SKILLS = 5;
export const TIMEOUT_MIN = 5;
export const TIMEOUT_MAX = 300;

export interface SystemConstraints {
  execution_timeout_seconds: number;
  allow_local_shell_access: boolean;
}

export interface AgentManifest {
  persona_id: string;
  version: string;
  skills: AllowedSkill[];
  target_artifact_domains: AllowedDomain[];
  system_constraints: SystemConstraints;
}

export interface ManifestError {
  path: string;
  message: string;
  keyword?: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestError[];
  summary: string;
  skill_budget_remaining: number | null;
  checked_at: string;
}

const PERSONA_ID_RE = /^[a-z0-9-]+-agent$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const REQUIRED_TOP_LEVEL = [
  'persona_id',
  'version',
  'skills',
  'target_artifact_domains',
  'system_constraints',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasUniqueItems(arr: unknown[]): boolean {
  return new Set(arr.map((item) => JSON.stringify(item))).size === arr.length;
}

export function validateAgentManifest(manifest: unknown): ManifestValidationResult {
  const errors: ManifestError[] = [];
  const checked_at = new Date().toISOString();

  if (!isPlainObject(manifest)) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'Manifest must be a JSON object',
          keyword: 'type',
        },
      ],
      summary: 'Manifest must be a JSON object',
      skill_budget_remaining: null,
      checked_at,
    };
  }

  for (const key of Object.keys(manifest)) {
    if (!(REQUIRED_TOP_LEVEL as readonly string[]).includes(key)) {
      errors.push({
        path: `/${key}`,
        message: `additional property "${key}" is not allowed`,
        keyword: 'additionalProperties',
      });
    }
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in manifest)) {
      errors.push({
        path: `/${key}`,
        message: `required property "${key}" is missing`,
        keyword: 'required',
      });
    }
  }

  if ('persona_id' in manifest) {
    if (typeof manifest.persona_id !== 'string') {
      errors.push({
        path: '/persona_id',
        message: 'persona_id must be a string',
        keyword: 'type',
      });
    } else if (!PERSONA_ID_RE.test(manifest.persona_id)) {
      errors.push({
        path: '/persona_id',
        message:
          'persona_id must match ^[a-z0-9-]+-agent$ (lowercase kebab-case ending in -agent)',
        keyword: 'pattern',
      });
    }
  }

  if ('version' in manifest) {
    if (typeof manifest.version !== 'string') {
      errors.push({
        path: '/version',
        message: 'version must be a string',
        keyword: 'type',
      });
    } else if (!SEMVER_RE.test(manifest.version)) {
      errors.push({
        path: '/version',
        message: 'version must match SemVer X.Y.Z (e.g. 1.0.0)',
        keyword: 'pattern',
      });
    }
  }

  let skillCount: number | null = null;
  if ('skills' in manifest) {
    if (!Array.isArray(manifest.skills)) {
      errors.push({
        path: '/skills',
        message: 'skills must be an array',
        keyword: 'type',
      });
    } else {
      skillCount = manifest.skills.length;
      if (manifest.skills.length > MAX_SKILLS) {
        errors.push({
          path: '/skills',
          message: `skills exceeds hard ceiling of ${MAX_SKILLS} (got ${manifest.skills.length})`,
          keyword: 'maxItems',
        });
      }
      if (!hasUniqueItems(manifest.skills)) {
        errors.push({
          path: '/skills',
          message: 'skills must contain unique items',
          keyword: 'uniqueItems',
        });
      }
      manifest.skills.forEach((skill, index) => {
        if (typeof skill !== 'string') {
          errors.push({
            path: `/skills/${index}`,
            message: 'skill entry must be a string',
            keyword: 'type',
          });
          return;
        }
        if (!(ALLOWED_SKILLS as readonly string[]).includes(skill)) {
          errors.push({
            path: `/skills/${index}`,
            message: `skill "${skill}" is not in the allow-list: ${ALLOWED_SKILLS.join(', ')}`,
            keyword: 'enum',
          });
        }
      });
    }
  }

  if ('target_artifact_domains' in manifest) {
    if (!Array.isArray(manifest.target_artifact_domains)) {
      errors.push({
        path: '/target_artifact_domains',
        message: 'target_artifact_domains must be an array',
        keyword: 'type',
      });
    } else {
      if (manifest.target_artifact_domains.length < 1) {
        errors.push({
          path: '/target_artifact_domains',
          message: 'target_artifact_domains must include at least one domain',
          keyword: 'minItems',
        });
      }
      if (!hasUniqueItems(manifest.target_artifact_domains)) {
        errors.push({
          path: '/target_artifact_domains',
          message: 'target_artifact_domains must contain unique items',
          keyword: 'uniqueItems',
        });
      }
      manifest.target_artifact_domains.forEach((domain, index) => {
        if (typeof domain !== 'string') {
          errors.push({
            path: `/target_artifact_domains/${index}`,
            message: 'domain entry must be a string',
            keyword: 'type',
          });
          return;
        }
        if (!(ALLOWED_DOMAINS as readonly string[]).includes(domain)) {
          errors.push({
            path: `/target_artifact_domains/${index}`,
            message: `domain "${domain}" is not allowed (use: ${ALLOWED_DOMAINS.join(', ')})`,
            keyword: 'enum',
          });
        }
      });
    }
  }

  if ('system_constraints' in manifest) {
    const constraints = manifest.system_constraints;
    if (!isPlainObject(constraints)) {
      errors.push({
        path: '/system_constraints',
        message: 'system_constraints must be an object',
        keyword: 'type',
      });
    } else {
      for (const key of Object.keys(constraints)) {
        if (key !== 'execution_timeout_seconds' && key !== 'allow_local_shell_access') {
          errors.push({
            path: `/system_constraints/${key}`,
            message: `additional property "${key}" is not allowed`,
            keyword: 'additionalProperties',
          });
        }
      }

      if (!('execution_timeout_seconds' in constraints)) {
        errors.push({
          path: '/system_constraints/execution_timeout_seconds',
          message: 'required property "execution_timeout_seconds" is missing',
          keyword: 'required',
        });
      } else if (
        typeof constraints.execution_timeout_seconds !== 'number' ||
        !Number.isInteger(constraints.execution_timeout_seconds)
      ) {
        errors.push({
          path: '/system_constraints/execution_timeout_seconds',
          message: 'execution_timeout_seconds must be an integer',
          keyword: 'type',
        });
      } else if (
        constraints.execution_timeout_seconds < TIMEOUT_MIN ||
        constraints.execution_timeout_seconds > TIMEOUT_MAX
      ) {
        errors.push({
          path: '/system_constraints/execution_timeout_seconds',
          message: `execution_timeout_seconds must be between ${TIMEOUT_MIN} and ${TIMEOUT_MAX}`,
          keyword: 'minimum',
        });
      }

      if (!('allow_local_shell_access' in constraints)) {
        errors.push({
          path: '/system_constraints/allow_local_shell_access',
          message: 'required property "allow_local_shell_access" is missing',
          keyword: 'required',
        });
      } else if (typeof constraints.allow_local_shell_access !== 'boolean') {
        errors.push({
          path: '/system_constraints/allow_local_shell_access',
          message: 'allow_local_shell_access must be a boolean',
          keyword: 'type',
        });
      }
    }
  }

  const skill_budget_remaining =
    skillCount === null ? null : Math.max(0, MAX_SKILLS - skillCount);

  const valid = errors.length === 0;
  const summary = valid
    ? 'Manifest satisfies registry_rules skill budget and structural constraints'
    : errors.length === 1
      ? errors[0].message
      : `${errors.length} validation errors (first: ${errors[0].message})`;

  return {
    valid,
    errors,
    summary,
    skill_budget_remaining,
    checked_at,
  };
}

export function formatValidationAlert(detail: {
  workflowName?: string;
  executionId?: string;
  errorName?: string;
  errorMessage?: string;
  executionUrl?: string;
} = {}): string {
  const workflowName = detail.workflowName || 'Agent Factory Engine';
  const executionId = detail.executionId || 'N/A';
  const errorName = detail.errorName || 'SchemaViolationException';
  const errorMessage =
    detail.errorMessage || 'Manifest broke skill budget ceiling rules.';
  const executionUrl = detail.executionUrl || 'http://localhost:5678';

  return (
    `🚨 **Revvel Standards: Validation Circuit Breaker Tripped** 🚨\n\n` +
    `• **Pipeline Origin:** ${workflowName}\n` +
    `• **Execution ID:** \`${executionId}\`\n` +
    `• **Error Type:** \`${errorName}\`\n` +
    `• **Detailed Manifest Diagnostic:** _${errorMessage}_\n\n` +
    `👉 [Investigate Deployment Log Workspace](${executionUrl})`
  );
}

export function sampleValidManifest(): AgentManifest {
  return {
    persona_id: 'registry-guard-agent',
    version: '1.0.0',
    skills: ['mcp_file_read', 'github_api_commit', 'keyword_extract'],
    target_artifact_domains: ['oaudrey', 'openaudrey'],
    system_constraints: {
      execution_timeout_seconds: 60,
      allow_local_shell_access: false,
    },
  };
}

export function sampleInvalidManifest(): Record<string, unknown> {
  return {
    persona_id: 'BrokenAgent',
    version: 'v1',
    skills: [
      'web_scrape',
      'keyword_extract',
      'mcp_file_read',
      'github_api_commit',
      'linear_task_update',
      'terminal_cli_command',
    ],
    target_artifact_domains: ['unknown-domain'],
    system_constraints: {
      execution_timeout_seconds: 999,
      allow_local_shell_access: 'yes',
    },
  };
}

/** Build a manifest from the guided form controls. */
export function buildManifestFromForm(input: {
  persona_id: string;
  version: string;
  skills: string[];
  target_artifact_domains: string[];
  execution_timeout_seconds: number;
  allow_local_shell_access: boolean;
}): Record<string, unknown> {
  return {
    persona_id: input.persona_id.trim(),
    version: input.version.trim(),
    skills: [...input.skills],
    target_artifact_domains: [...input.target_artifact_domains],
    system_constraints: {
      execution_timeout_seconds: Number(input.execution_timeout_seconds),
      allow_local_shell_access: Boolean(input.allow_local_shell_access),
    },
  };
}
