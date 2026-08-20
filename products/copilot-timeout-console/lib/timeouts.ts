/**
 * Browser-safe Copilot / visiting-LLM timeout policy helpers (WR #17775).
 *
 * The authoritative filesystem auditor lives at
 * `scripts/copilot-timeout-audit.js` (root `npm test`). This module mirrors
 * the floor policy + pure classifiers so the product UI works without Node
 * `fs` and so product tests stay fast and keyless.
 */

export type TimeoutClass = 'missing' | 'below-floor' | 'at-floor' | 'above-floor';

export type TimeoutClassification = {
  ok: boolean;
  label: TimeoutClass;
  detail: string;
};

export type PolicySnapshot = {
  floor_minutes: number;
  recommended_ceiling_minutes: number;
  absolute_max_minutes: number;
  host_default_minutes: number;
  error_signature: string;
  policy_path: string;
  audit_script: string;
  issue: string;
};

export type TargetRow = {
  id: string;
  workflow: string;
  jobs: string;
  reason: string;
  /** Demo/shipped status — the live auditor is the CI gate. */
  expected_minutes: number;
};

export type AuditDemoReport = {
  ok: boolean;
  floor_minutes: number;
  checked_at: string;
  passed: number;
  total: number;
  score: string;
  summary: string;
  targets: Array<TargetRow & { status: TimeoutClassification }>;
};

/** Canonical floor — keep aligned with config/copilot-timeouts.yml. */
export const FLOOR_MINUTES = 60;
export const RECOMMENDED_CEILING_MINUTES = 90;
export const ABSOLUTE_MAX_MINUTES = 360;
export const HOST_DEFAULT_MINUTES = 60;

export const ERROR_SIGNATURE =
  'The job has exceeded the maximum execution time of 10m0s';

export const POLICY: PolicySnapshot = {
  floor_minutes: FLOOR_MINUTES,
  recommended_ceiling_minutes: RECOMMENDED_CEILING_MINUTES,
  absolute_max_minutes: ABSOLUTE_MAX_MINUTES,
  host_default_minutes: HOST_DEFAULT_MINUTES,
  error_signature: ERROR_SIGNATURE,
  policy_path: 'config/copilot-timeouts.yml',
  audit_script: 'scripts/copilot-timeout-audit.js',
  issue: 'https://github.com/midnghtsapphire/revvel-standards/issues/17775',
};

/**
 * Shipped target catalog (subset shown in the UI). Keep ids stable; the root
 * auditor is the full list in config/copilot-timeouts.yml.
 */
export const TARGET_CATALOG: TargetRow[] = [
  {
    id: 'agent-fallback',
    workflow: '.github/workflows/agent-fallback.yml',
    jobs: 'health-check, execute',
    reason: 'Visiting-agent fallback chain (OpenRouter → OpenHands → Cursor)',
    expected_minutes: 60,
  },
  {
    id: 'openrouter-coder',
    workflow: '.github/workflows/openrouter-coder.yml',
    jobs: 'code',
    reason: 'OpenRouter coder (spec-approved / wr:code builds)',
    expected_minutes: 60,
  },
  {
    id: 'openrouter-agent',
    workflow: '.github/workflows/openrouter-agent.yml',
    jobs: 'openrouter-agent',
    reason: 'OpenRouter coding agent entrypoint',
    expected_minutes: 60,
  },
  {
    id: 'openhands-resolver',
    workflow: '.github/workflows/openhands-resolver.yml',
    jobs: 'resolve',
    reason: 'OpenHands visiting coding agent',
    expected_minutes: 60,
  },
  {
    id: 'swe-agent',
    workflow: '.github/workflows/swe-agent.yml',
    jobs: 'resolve',
    reason: 'SWE-agent visiting coding agent',
    expected_minutes: 60,
  },
  {
    id: 'copilot-setup',
    workflow: '.github/workflows/copilot-setup-steps.yml',
    jobs: 'copilot-setup-steps',
    reason: 'GitHub Copilot cloud-agent setup job',
    expected_minutes: 60,
  },
  {
    id: 'free-llm-router',
    workflow: '.github/workflows/free-llm-router.yml',
    jobs: 'route',
    reason: 'Keyless / free LLM router',
    expected_minutes: 60,
  },
  {
    id: 'budget-aware-execute',
    workflow: '.github/workflows/budget-aware-agent.yml',
    jobs: 'execute-task',
    reason: 'Budget-aware agent execution (OpenRouter path)',
    expected_minutes: 60,
  },
  {
    id: 'perplexity-research',
    workflow: '.github/workflows/perplexity-research-agent.yml',
    jobs: 'research',
    reason: 'Perplexity research agent via OpenRouter path',
    expected_minutes: 60,
  },
  {
    id: 'ralph-loop',
    workflow: '.github/workflows/ralph-loop.yml',
    jobs: 'ralph-trigger, ralph-unblock',
    reason: 'Ralph autonomous coding loop',
    expected_minutes: 60,
  },
];

/**
 * Pure classifier — mirrors scripts/copilot-timeout-audit.js#classifyTimeout.
 */
export function classifyTimeout(
  minutes: number | null | undefined,
  floor: number = FLOOR_MINUTES
): TimeoutClassification {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return { ok: false, label: 'missing', detail: 'timeout-minutes not set' };
  }
  const n = Number(minutes);
  if (n < floor) {
    return {
      ok: false,
      label: 'below-floor',
      detail: `${n}m is below the ${floor}m floor`,
    };
  }
  if (n === floor) {
    return { ok: true, label: 'at-floor', detail: `${n}m meets the ${floor}m floor` };
  }
  return {
    ok: true,
    label: 'above-floor',
    detail: `${n}m is above the ${floor}m floor`,
  };
}

/**
 * Build a shipped-status report for the UI (assumes catalog expected values).
 * Root CI runs the real filesystem auditor; this is the human console view.
 */
export function shippedReport(now: Date = new Date()): AuditDemoReport {
  const targets = TARGET_CATALOG.map((t) => ({
    ...t,
    status: classifyTimeout(t.expected_minutes, FLOOR_MINUTES),
  }));
  const passed = targets.filter((t) => t.status.ok).length;
  const total = targets.length;
  const ok = passed === total;
  return {
    ok,
    floor_minutes: FLOOR_MINUTES,
    checked_at: now.toISOString(),
    passed,
    total,
    score: `${passed}/${total}`,
    summary: ok
      ? `OK — all ${total} catalogued copilot/visiting-LLM target(s) are >= ${FLOOR_MINUTES}m`
      : `FAIL — ${total - passed} catalogued target(s) below the ${FLOOR_MINUTES}m floor`,
    targets,
  };
}

export function answerLine(report: AuditDemoReport): string {
  return report.ok
    ? `YES — visiting LLM / OpenRouter / Copilot jobs hold the ${report.floor_minutes}m floor.`
    : `NO — one or more visiting LLM jobs are still below the ${report.floor_minutes}m floor.`;
}

export function verifyCommands(): string[] {
  return [
    'node scripts/copilot-timeout-audit.js --markdown',
    'node --test tests/copilot-timeout-audit.test.js',
    'cd products/copilot-timeout-console && npm test',
  ];
}

export function humanSteps(): Array<{ id: string; title: string; detail: string }> {
  return [
    {
      id: 'open-actions',
      title: 'Open the failing Actions run',
      detail:
        'GitHub → midnghtsapphire/revvel-standards → Actions → open the red run whose log ends with “maximum execution time of 10m0s”. Note the workflow file name and job name.',
    },
    {
      id: 'confirm-target',
      title: 'Confirm it is a visiting-LLM execution job',
      detail:
        'If the job is OpenRouter / OpenHands / SWE-agent / Copilot / Jules / agent-fallback execute, it is in scope. Lint / form-filler / host-decompose jobs are intentionally short and stay excluded.',
    },
    {
      id: 'run-auditor',
      title: 'Run the auditor locally',
      detail:
        'In a clone: `node scripts/copilot-timeout-audit.js --markdown`. Exit 0 means the 60m floor holds; exit 1 prints the exact workflow/job still under floor.',
    },
    {
      id: 'raise-timeout',
      title: 'Raise only the failing job',
      detail:
        'Edit that workflow’s job `timeout-minutes:` to 60 (or 90 only if a captured run proves 60 is still too low). Do not blanket-raise unrelated jobs.',
    },
    {
      id: 'retest',
      title: 'Re-run the auditor + root tests',
      detail:
        '`node --test tests/copilot-timeout-audit.test.js` must pass. Open a PR; CI will re-run the same gate.',
    },
  ];
}
