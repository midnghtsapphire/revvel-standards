'use strict';

const { buildState } = require('../scripts/populate-state');

describe('populate-state', () => {
  test('never returns an empty object', () => {
    const s = buildState({ projects: [] });
    expect(Object.keys(s).length).toBeGreaterThan(0);
    expect(s.projects).toBeDefined();
    expect(typeof s.projects.total).toBe('number');
  });

  test('counts projects, statuses, and revenue signals', () => {
    const dashboard = {
      projects: [
        { name: 'a', status: 'live', url: 'https://a.example.com', mrr: 12 },
        { name: 'b', status: 'live', url: 'https://b.example.com' },
        { name: 'c', status: 'paused', url: 'https://a.example.com/sub' },
        { name: 'd', status: 'archived' },
        { name: 'e', status: 'live', revenue_streams: ['polar'] },
      ],
    };
    const s = buildState(dashboard);
    expect(s.projects.total).toBe(5);
    expect(s.projects.status_breakdown.live).toBe(3);
    expect(s.projects.status_breakdown.paused).toBe(1);
    expect(s.projects.status_breakdown.archived).toBe(1);
    expect(s.projects.with_revenue_signal).toBe(2);
    expect(s.surface.urls).toBe(3);
    expect(s.surface.domains).toBe(2);
  });

  test('references the revenue gate', () => {
    const s = buildState({ projects: [] });
    expect(s.gate).toBe('REVENUE_GATE.md');
    expect(s.prime_directive).toMatch(/\$10k.*\$10M/);
  });
});
