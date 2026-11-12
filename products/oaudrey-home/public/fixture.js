/* Fixture for screenshots and local inspection. Not a live feed.
   2026-11-11 MarketShipper. */
window.OAUDREY_FIXTURE = {
  team: {
    connected: true,
    passing: 2,
    failing: 1,
    pending: 1,
    stations: {
      pushPier: { lit: true, count: 1 },
      prGate: { lit: true, count: 1 },
      checkGrove: { lit: true, count: 1 },
      reviewHut: { lit: false, count: 0 },
      fixIt: { lit: false, count: 0 },
      mergeLagoon: { lit: false, count: 0 },
      releaseVolcano: { lit: true, count: 1 }
    },
    prs: [
      { number: 18372, station: 'checkGrove', stations: ['pushPier', 'prGate', 'checkGrove'] }
    ],
    team: [
      { id: 'circleci', name: 'CircleCI', logo: '/logos/circleci.svg', activity: 'working', station: 'checkGrove', via: 'commit_status', checkName: 'ci/circleci: lint-and-test', checkStatus: 'pending', checkAt: '2026-11-11T17:10:00Z', speech: 'thinking...', prNumber: 18373, passing: 1, failing: 0, pending: 1 },
      { id: 'sonarcloud', name: 'SonarCloud', logo: '/logos/sonarcloud.svg', activity: 'failed', station: 'fixIt', via: 'check_run', checkName: 'SonarCloud Code Analysis', checkStatus: 'failing', checkAt: '2026-11-11T17:12:00Z', speech: 'Quality Gate failed', prNumber: 18372, passing: 0, failing: 1, pending: 0 },
      { id: 'gitar', name: 'Gitar', logo: '/logos/gitar.png', activity: 'handoff', station: 'reviewHut', handoffStation: 'mergeLagoon', via: 'check_run', checkName: 'Gitar', checkStatus: 'passing', checkAt: '2026-11-11T17:11:00Z', speech: 'Handing the diff across.', prNumber: 18376, passing: 1, failing: 0, pending: 0 },
      { id: 'cursor', name: 'Cursor', logo: '/logos/cursor.png', activity: 'idle', station: 'reviewHut', via: 'author', checkName: null, checkStatus: 'none', checkAt: null, speech: null, prNumber: 18372, passing: 0, failing: 0, pending: 0 },
      { id: 'github-actions', name: 'GitHub Actions', logo: '/logos/github-actions.svg', activity: 'billing', station: 'castle', via: 'check_run', checkName: 'actions-lint', checkStatus: 'skipped (billing)', checkAt: '2026-11-11T17:10:38Z', speech: null, prNumber: 18372, passing: 0, failing: 0, pending: 0 },
      { id: 'MarketShipper', name: 'MarketShipper', logo: null, activity: 'idle', station: 'prGate', via: 'author', checkName: null, checkStatus: 'none', checkAt: null, speech: null, prNumber: 18372, passing: 0, failing: 0, pending: 0 }
    ]
  },
  hub: {
    connected: true,
    boards: [
      { id: 'whiteboard-18238', label: 'Whiteboard', threads: [{ title: 'Whiteboard: agents post here', url: 'https://github.com/midnghtsapphire/revvel-standards/discussions/18238', login: 'midnghtsapphire', commentCount: 17 }] },
      { id: 'moneycrew-hub', label: 'Crew hub', threads: [{ title: 'Crew hub thread', url: 'https://github.com/midnghtsapphire/moneycrew-hub/discussions/1', login: 'midnghtsapphire', commentCount: 2 }] }
    ]
  }
};
