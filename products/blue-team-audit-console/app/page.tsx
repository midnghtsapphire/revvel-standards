'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AuditOverlay,
  ScreenId,
  SessionUser,
  TraceEvent,
  TracePackage,
} from './lib/types';
import { emptyOverlay } from './lib/types';
import { filterEvents, suspicionLabel } from './lib/audit';

interface TraceSummary {
  name: string;
  label: string;
  experiment: string;
  eventCount: number;
  threadCount: number;
  areaCount: number;
  createdAt: string;
  description: string;
}

interface Stats {
  visited: number;
  total: number;
  flags: number;
  notes: number;
  groups: number;
}

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 'timeline', label: 'timeline' },
  { id: 'threads', label: 'threads & groups' },
  { id: 'overview', label: 'overview' },
  { id: 'export', label: 'export' },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string>('');
  const [trace, setTrace] = useState<TracePackage | null>(null);
  const [overlay, setOverlay] = useState<AuditOverlay>(emptyOverlay());
  const [stats, setStats] = useState<Stats | null>(null);
  const [screen, setScreen] = useState<ScreenId>('timeline');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [suspectsOnly, setSuspectsOnly] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportPreview, setExportPreview] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const canWrite = user?.role === 'auditor' || user?.role === 'lead';

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);
    setError(null);
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        router.replace('/login');
        return;
      }
      const session = await sessionRes.json();
      setUser(session.user);

      const listRes = await fetch('/api/traces');
      if (!listRes.ok) {
        setError('Failed to load traces');
        setBootstrapping(false);
        return;
      }
      const list = await listRes.json();
      const items: TraceSummary[] = list.traces || [];
      setTraces(items);
      if (items.length) {
        setSelectedTrace(items[0].name);
      }
      setBootstrapping(false);
    } catch {
      setError('Failed to bootstrap session');
      setBootstrapping(false);
    }
  }, [router]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadTrace = useCallback(async (name: string) => {
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/traces/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to load trace');
        setBusy(false);
        return;
      }
      setTrace(data.trace);
      setOverlay(data.overlay || emptyOverlay());
      setStats(data.stats || null);
      setActiveEventId(data.trace.events[0]?.id || null);
      setExportPreview('');
    } catch {
      setError('Network error loading trace');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTrace) void loadTrace(selectedTrace);
  }, [selectedTrace, loadTrace]);

  const activeEvent: TraceEvent | null = useMemo(() => {
    if (!trace || !activeEventId) return null;
    return trace.events.find((e) => e.id === activeEventId) || null;
  }, [trace, activeEventId]);

  const visibleEvents = useMemo(() => {
    if (!trace) return [];
    return filterEvents(trace, {
      query,
      kind,
      flaggedOnly,
      suspectsOnly,
      overlay,
    });
  }, [trace, query, kind, flaggedOnly, suspectsOnly, overlay]);

  async function mutate(body: Record<string, unknown>) {
    if (!selectedTrace) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/traces/${encodeURIComponent(selectedTrace)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Action failed');
        setBusy(false);
        return;
      }
      setOverlay(data.overlay);
      if (data.stats) setStats(data.stats);
      setNotice('Saved');
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  async function onFlag() {
    if (!activeEventId || !canWrite) return;
    await mutate({ action: 'flag', eventId: activeEventId });
  }

  async function onVisit() {
    if (!activeEventId || !canWrite) return;
    await mutate({ action: 'visit', eventId: activeEventId });
  }

  async function onAddNote() {
    if (!activeEventId || !canWrite || !noteText.trim()) return;
    await mutate({ action: 'note', eventId: activeEventId, text: noteText });
    setNoteText('');
  }

  async function onCreateGroup() {
    if (!canWrite || !groupName.trim()) return;
    await mutate({ action: 'create_group', name: groupName });
    setGroupName('');
  }

  async function onTag(groupId: string) {
    if (!activeEventId || !canWrite) return;
    await mutate({ action: 'tag', eventId: activeEventId, groupId });
  }

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  async function onExport(format: 'markdown' | 'json' | 'bundle') {
    if (!selectedTrace) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/audit/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trace: selectedTrace, format }),
      });
      if (format === 'markdown') {
        const text = await res.text();
        if (!res.ok) {
          setError('Export failed');
          setBusy(false);
          return;
        }
        setExportPreview(text);
        downloadBlob(text, 'AI_AUDIT.md', 'text/markdown');
      } else {
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || 'Export failed');
          setBusy(false);
          return;
        }
        if (format === 'json') {
          const text = JSON.stringify(data.model, null, 2);
          setExportPreview(text);
          downloadBlob(text, 'audit-model.json', 'application/json');
        } else {
          const text = JSON.stringify(data.files, null, 2);
          setExportPreview(
            data.files?.['AI_AUDIT.md'] ||
              `# bundle\n\n${Object.keys(data.files || {}).join('\n')}`
          );
          downloadBlob(text, 'audit-bundle.json', 'application/json');
        }
      }
      setNotice(`Exported ${format}`);
    } catch {
      setError('Export network error');
    } finally {
      setBusy(false);
    }
  }

  function selectEvent(id: string) {
    setActiveEventId(id);
    if (canWrite) {
      void mutate({ action: 'visit', eventId: id });
    }
  }

  if (bootstrapping) {
    return (
      <div className="login-wrap">
        <div className="card">Loading blue-team console…</div>
      </div>
    );
  }

  const coveragePct =
    stats && stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="row">
          <div className="brand">
            <div className="brand-badge">BT</div>
            <div>
              Blue Team Audit
              <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                greenfield-ui compatible
              </div>
            </div>
          </div>
          <label className="field" style={{ minWidth: 220 }}>
            <span className="muted" style={{ fontSize: 11 }}>
              input / trace
            </span>
            <select
              value={selectedTrace}
              onChange={(e) => setSelectedTrace(e.target.value)}
              aria-label="Select trace"
            >
              {traces.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label} ({t.eventCount})
                </option>
              ))}
            </select>
          </label>
          <div className="tabs" role="tablist" aria-label="Screens">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                className="tab"
                role="tab"
                aria-selected={screen === s.id}
                onClick={() => setScreen(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="pill ok">
            {user?.name} · {user?.role}
          </span>
          <button className="btn" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div style={{ padding: '10px 18px' }}>
          {error ? <div className="error">{error}</div> : null}
          {notice ? <div className="success">{notice}</div> : null}
        </div>
      )}

      <div className="main">
        <aside className="sidebar stack">
          <div className="card stack">
            <strong>Filters</strong>
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="file, command, flag…"
              />
            </div>
            <div className="field">
              <label htmlFor="kind">Kind</label>
              <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">all</option>
                <option value="bash">bash</option>
                <option value="file_edit">file_edit</option>
                <option value="file_create">file_create</option>
                <option value="file_delete">file_delete</option>
                <option value="tool">tool</option>
                <option value="read">read</option>
                <option value="other">other</option>
              </select>
            </div>
            <label className="row muted">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
              />
              flagged only
            </label>
            <label className="row muted">
              <input
                type="checkbox"
                checked={suspectsOnly}
                onChange={(e) => setSuspectsOnly(e.target.checked)}
              />
              suspects / deterministic flags
            </label>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Timeline</strong>
              <span className="muted mono">
                {visibleEvents.length}/{trace?.events.length || 0}
              </span>
            </div>
            <div className="event-list" style={{ marginTop: 10 }}>
              {visibleEvents.map((ev) => {
                const flagged = !!overlay.flagged[ev.id];
                const sus = suspicionLabel(ev.suspicion);
                return (
                  <button
                    key={ev.id}
                    className={`event-item${activeEventId === ev.id ? ' active' : ''}${flagged ? ' flagged' : ''}`}
                    onClick={() => selectEvent(ev.id)}
                  >
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="mono">{ev.sha.slice(0, 7)}</span>
                      <span className={`pill ${sus === 'high' ? 'high' : sus === 'medium' ? 'medium' : 'ok'}`}>
                        {ev.kind}
                      </span>
                    </div>
                    <div style={{ marginTop: 4 }}>{ev.summary}</div>
                    {ev.file ? (
                      <div className="muted mono" style={{ marginTop: 4 }}>
                        {ev.file}
                      </div>
                    ) : null}
                    {flagged ? <div className="pill high" style={{ marginTop: 6 }}>flagged</div> : null}
                  </button>
                );
              })}
              {!visibleEvents.length ? (
                <div className="muted">No events match filters.</div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="panel stack">
          {screen === 'timeline' && activeEvent ? (
            <>
              <div className="card stack">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="muted mono">{activeEvent.id}</div>
                    <h2 style={{ margin: '4px 0' }}>{activeEvent.summary}</h2>
                  </div>
                  <div className="row">
                    <span className={`pill ${suspicionLabel(activeEvent.suspicion) === 'high' ? 'high' : 'ok'}`}>
                      suspicion {activeEvent.suspicion ?? '—'}
                    </span>
                    {overlay.flagged[activeEvent.id] ? (
                      <span className="pill high">flagged</span>
                    ) : null}
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat">
                    <div className="muted">SHA</div>
                    <div className="mono">{activeEvent.sha}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">Kind</div>
                    <div>{activeEvent.kind}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">Timestamp</div>
                    <div className="mono">{activeEvent.timestamp}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">File</div>
                    <div className="mono">{activeEvent.file || '—'}</div>
                  </div>
                </div>
                {activeEvent.command ? (
                  <div>
                    <div className="muted">Command</div>
                    <div className="pre">{activeEvent.command}</div>
                  </div>
                ) : null}
                {activeEvent.annotation ? (
                  <div>
                    <div className="muted">Annotation</div>
                    <div>{activeEvent.annotation}</div>
                  </div>
                ) : null}
                {activeEvent.deterministicFlags?.length ? (
                  <div className="row">
                    {activeEvent.deterministicFlags.map((f) => (
                      <span key={f} className="pill high">
                        {f}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="row">
                  <button className="btn primary" disabled={!canWrite || busy} onClick={() => void onFlag()}>
                    {overlay.flagged[activeEvent.id] ? 'Unflag' : 'Flag event'}
                  </button>
                  <button className="btn" disabled={!canWrite || busy} onClick={() => void onVisit()}>
                    Mark visited
                  </button>
                </div>

                <div className="field">
                  <label htmlFor="note">Auditor note</label>
                  <textarea
                    id="note"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={canWrite ? 'What looks wrong or needs follow-up?' : 'Read-only viewer'}
                    disabled={!canWrite}
                  />
                </div>
                <button className="btn primary" disabled={!canWrite || busy || !noteText.trim()} onClick={() => void onAddNote()}>
                  Add note
                </button>

                {(overlay.notes[activeEvent.id] || []).length > 0 ? (
                  <div className="stack">
                    <strong>Notes</strong>
                    {(overlay.notes[activeEvent.id] || []).map((n) => (
                      <div key={n.id} className="card" style={{ boxShadow: 'none', background: 'var(--bg-soft)' }}>
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {n.createdAt} · {n.author || 'auditor'}
                        </div>
                        <div>{n.text}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {screen === 'threads' && trace ? (
            <div className="stack">
              <div className="card stack">
                <strong>Semantic threads</strong>
                {trace.threads.map((t) => (
                  <div key={t.id} className="card" style={{ boxShadow: 'none', background: 'var(--bg-soft)' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <div>{t.title}</div>
                        <div className="muted mono">
                          {t.id} · {t.category || 'n/a'} · {t.eventIds.length} events
                        </div>
                      </div>
                      <span className="pill">{t.theme || 'thread'}</span>
                    </div>
                  </div>
                ))}
                {!trace.threads.length ? <div className="muted">No threads in this trace.</div> : null}
              </div>

              <div className="card stack">
                <strong>Semantic areas</strong>
                {trace.areas.map((a) => (
                  <div key={a.id} className="card" style={{ boxShadow: 'none', background: 'var(--bg-soft)' }}>
                    <div>{a.title}</div>
                    <div className="muted mono">
                      {a.id} · {a.category || 'n/a'} · anchor {a.anchorSha?.slice(0, 7) || '—'}
                    </div>
                  </div>
                ))}
                {!trace.areas.length ? <div className="muted">No areas in this trace.</div> : null}
              </div>

              <div className="card stack">
                <strong>User groups</strong>
                <div className="row">
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="New group name"
                    disabled={!canWrite}
                    style={{
                      flex: 1,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text)',
                      padding: '10px 12px',
                    }}
                  />
                  <button className="btn primary" disabled={!canWrite || busy || !groupName.trim()} onClick={() => void onCreateGroup()}>
                    Create group
                  </button>
                </div>
                {Object.values(overlay.groups).map((g) => (
                  <div key={g.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ color: g.color || 'var(--accent)' }}>●</span> {g.name}
                      <div className="muted mono">
                        {g.id} · {(g.memberKeys || []).length} members
                      </div>
                    </div>
                    <button
                      className="btn"
                      disabled={!canWrite || !activeEventId || busy}
                      onClick={() => void onTag(g.id)}
                    >
                      Tag active event
                    </button>
                  </div>
                ))}
                {!Object.keys(overlay.groups).length ? (
                  <div className="muted">No groups yet — create one to tag related events.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {screen === 'overview' ? (
            <div className="stack">
              <div className="card stack">
                <strong>Session overview</strong>
                <div className="stat-grid">
                  <div className="stat">
                    <div className="muted">Events</div>
                    <div className="value">{stats?.total ?? 0}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">Visited</div>
                    <div className="value">{stats?.visited ?? 0}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">Flags</div>
                    <div className="value">{stats?.flags ?? 0}</div>
                  </div>
                  <div className="stat">
                    <div className="muted">Notes</div>
                    <div className="value">{stats?.notes ?? 0}</div>
                  </div>
                </div>
                <div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="muted">Coverage</span>
                    <span className="mono">{coveragePct}%</span>
                  </div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <span style={{ width: `${coveragePct}%` }} />
                  </div>
                </div>
                {trace ? (
                  <div className="muted">
                    <div>
                      <strong style={{ color: 'var(--text)' }}>{trace.meta.uiName || trace.meta.name}</strong>
                    </div>
                    <div>{trace.meta.description}</div>
                    <div className="mono" style={{ marginTop: 6 }}>
                      experiment={trace.meta.experiment} · created={trace.meta.createdAt}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="card stack">
                <strong>High-suspicion events</strong>
                {(trace?.events || [])
                  .filter((e) => (e.suspicion || 0) >= 0.5 || (e.deterministicFlags || []).length > 0)
                  .map((e) => (
                    <button key={e.id} className="event-item" onClick={() => { setScreen('timeline'); selectEvent(e.id); }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span>{e.summary}</span>
                        <span className="pill high">{e.suspicion ?? 'flag'}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ) : null}

          {screen === 'export' ? (
            <div className="card stack">
              <strong>Export audit bundle</strong>
              <p className="muted" style={{ margin: 0 }}>
                Produces greenfield-ui-public compatible artifacts (
                <span className="mono">AI_AUDIT.md</span>,{' '}
                <span className="mono">manifest.json</span>,{' '}
                <span className="mono">items/*.jsonl</span>).
              </p>
              <div className="row">
                <button className="btn primary" disabled={busy} onClick={() => void onExport('markdown')}>
                  Download AI_AUDIT.md
                </button>
                <button className="btn" disabled={busy} onClick={() => void onExport('json')}>
                  Download model JSON
                </button>
                <button className="btn" disabled={busy} onClick={() => void onExport('bundle')}>
                  Download full bundle
                </button>
              </div>
              {exportPreview ? <div className="pre">{exportPreview}</div> : (
                <div className="muted">Export preview will appear here.</div>
              )}
            </div>
          ) : null}

          {!trace && !busy ? (
            <div className="card muted">Select a trace to begin the audit.</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
