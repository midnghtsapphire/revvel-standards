'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('auditor@revvel.local');
  const [password, setPassword] = useState('auditor-demo-1');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Network error — try again');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card stack">
        <div className="brand">
          <div className="brand-badge">BT</div>
          <div>
            <div>Blue Team Audit Console</div>
            <div className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
              Greenfield-compatible agent trace auditor
            </div>
          </div>
        </div>

        <p className="muted" style={{ margin: 0 }}>
          Sign in to review processed agent traces, flag events, take notes, and
          export <span className="mono">AI_AUDIT.md</span> bundles.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="card" style={{ boxShadow: 'none', background: 'var(--bg-soft)' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Demo accounts
          </div>
          <div className="mono">
            auditor@revvel.local / auditor-demo-1
            <br />
            lead@revvel.local / lead-demo-12
            <br />
            viewer@revvel.local / viewer-demo1
          </div>
        </div>

        <p className="footer-note">
          Defensive blue-team tooling only. No red-team, exploit, or offensive
          capabilities are included.
        </p>
      </div>
    </div>
  );
}
