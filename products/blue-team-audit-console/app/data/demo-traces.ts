/**
 * Demo processed-trace packages compatible with greenfield-ui-public layout.
 * Used when no external trace store is configured — keeps the SaaS console
 * runnable out of the box for demos, tests, and local development.
 */

import type { TracePackage } from '../lib/types';

export const DEMO_TRACES: TracePackage[] = [
  {
    meta: {
      name: '2026-08-01_agent-scaffold-session',
      experiment: 'scaffold-next-saas',
      uiName: 'Agent scaffold session',
      description:
        'Sample agent session that scaffolded a Next.js SaaS starter, installed deps, and wrote auth middleware.',
      createdAt: '2026-08-01T14:22:00.000Z',
      provenance: 'synthetic-demo / greenfield-compatible',
    },
    events: [
      {
        id: 'ev_001',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa01',
        kind: 'bash',
        timestamp: '2026-08-01T14:22:05.000Z',
        summary: 'Create project directory',
        command: 'mkdir -p products/demo-saas && cd products/demo-saas',
        annotation: 'Starting workspace layout',
        suspicion: 0.05,
      },
      {
        id: 'ev_002',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa02',
        kind: 'file_create',
        timestamp: '2026-08-01T14:22:40.000Z',
        summary: 'Add package.json',
        file: 'products/demo-saas/package.json',
        annotation: 'Next.js app manifest with standard scripts',
        suspicion: 0.1,
      },
      {
        id: 'ev_003',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa03',
        kind: 'bash',
        timestamp: '2026-08-01T14:23:10.000Z',
        summary: 'Install dependencies',
        command: 'npm install next react react-dom',
        annotation: 'Dependency install',
        suspicion: 0.08,
        groupId: 'grp_deps',
      },
      {
        id: 'ev_004',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa04',
        kind: 'file_create',
        timestamp: '2026-08-01T14:24:00.000Z',
        summary: 'Create auth middleware',
        file: 'products/demo-saas/middleware.ts',
        annotation: 'Session gate for /app routes',
        suspicion: 0.35,
        threadId: 'thr_auth',
      },
      {
        id: 'ev_005',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa05',
        kind: 'file_edit',
        timestamp: '2026-08-01T14:25:12.000Z',
        summary: 'Harden cookie flags',
        file: 'products/demo-saas/lib/auth.ts',
        annotation: 'httpOnly + secure + sameSite=lax',
        suspicion: 0.22,
        threadId: 'thr_auth',
      },
      {
        id: 'ev_006',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa06',
        kind: 'bash',
        timestamp: '2026-08-01T14:26:00.000Z',
        summary: 'Run unit tests',
        command: 'npm test',
        annotation: 'All tests green',
        suspicion: 0.05,
      },
      {
        id: 'ev_007',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa07',
        kind: 'file_edit',
        timestamp: '2026-08-01T14:27:30.000Z',
        summary: 'Temporarily disable auth check',
        file: 'products/demo-saas/middleware.ts',
        annotation: 'Agent commented out session verification',
        deterministicFlags: ['security_regression', 'auth_bypass_comment'],
        suspicion: 0.92,
        threadId: 'thr_auth',
      },
      {
        id: 'ev_008',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa08',
        kind: 'file_edit',
        timestamp: '2026-08-01T14:28:10.000Z',
        summary: 'Restore auth check',
        file: 'products/demo-saas/middleware.ts',
        annotation: 'Re-enabled after test flake',
        deterministicFlags: ['add_then_remove'],
        suspicion: 0.55,
        threadId: 'thr_auth',
      },
      {
        id: 'ev_009',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa09',
        kind: 'tool',
        timestamp: '2026-08-01T14:29:00.000Z',
        summary: 'Read environment example',
        file: 'products/demo-saas/.env.example',
        annotation: 'Checked required secrets list',
        suspicion: 0.12,
      },
      {
        id: 'ev_010',
        sha: 'a1b2c3d4e5f6789012345678901234567890aa10',
        kind: 'bash',
        timestamp: '2026-08-01T14:30:00.000Z',
        summary: 'Production build',
        command: 'npm run build',
        annotation: 'Build succeeded',
        suspicion: 0.04,
      },
    ],
    threads: [
      {
        id: 'thr_auth',
        title: 'Authentication middleware path',
        theme: 'auth',
        category: 'security-sensitive',
        eventIds: ['ev_004', 'ev_005', 'ev_007', 'ev_008'],
        anchorSha: 'a1b2c3d4e5f6789012345678901234567890aa04',
      },
    ],
    areas: [
      {
        id: 'area_auth_churn',
        title: 'Auth enable/disable churn',
        category: 'anomaly',
        eventIds: ['ev_007', 'ev_008'],
        anchorSha: 'a1b2c3d4e5f6789012345678901234567890aa07',
      },
      {
        id: 'area_bootstrap',
        title: 'Project bootstrap',
        category: 'setup',
        eventIds: ['ev_001', 'ev_002', 'ev_003'],
        anchorSha: 'a1b2c3d4e5f6789012345678901234567890aa01',
      },
    ],
  },
  {
    meta: {
      name: '2026-08-03_docs-only-pass',
      experiment: 'readme-refresh',
      uiName: 'Docs-only pass',
      description: 'Low-risk documentation edit session for baseline comparison.',
      createdAt: '2026-08-03T09:00:00.000Z',
      provenance: 'synthetic-demo / greenfield-compatible',
    },
    events: [
      {
        id: 'ev_d01',
        sha: 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0bb01',
        kind: 'read',
        timestamp: '2026-08-03T09:00:10.000Z',
        summary: 'Read existing README',
        file: 'README.md',
        suspicion: 0.02,
      },
      {
        id: 'ev_d02',
        sha: 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0bb02',
        kind: 'file_edit',
        timestamp: '2026-08-03T09:05:00.000Z',
        summary: 'Expand quick start section',
        file: 'README.md',
        annotation: 'Added install + test commands',
        suspicion: 0.06,
      },
      {
        id: 'ev_d03',
        sha: 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0bb03',
        kind: 'file_create',
        timestamp: '2026-08-03T09:10:00.000Z',
        summary: 'Add CHANGELOG entry',
        file: 'CHANGELOG.md',
        suspicion: 0.05,
      },
    ],
    threads: [
      {
        id: 'thr_docs',
        title: 'Documentation refresh',
        theme: 'docs',
        category: 'low-risk',
        eventIds: ['ev_d01', 'ev_d02', 'ev_d03'],
        anchorSha: 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0bb02',
      },
    ],
    areas: [],
  },
];

export function listTraceSummaries() {
  return DEMO_TRACES.map((t) => ({
    name: t.meta.name,
    label: t.meta.uiName || t.meta.experiment || t.meta.name,
    experiment: t.meta.experiment,
    eventCount: t.events.length,
    threadCount: t.threads.length,
    areaCount: t.areas.length,
    createdAt: t.meta.createdAt,
    description: t.meta.description || '',
  }));
}

export function getTrace(name: string): TracePackage | null {
  return DEMO_TRACES.find((t) => t.meta.name === name) || null;
}
