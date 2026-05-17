'use client';

import { useMemo, useState } from 'react';

const NEWSLETTER_SUBSCRIBERS_KEY = 'life-insurance-lead-engine:newsletter-subscribers';
const NEWSLETTER_OPT_OUTS_KEY = 'life-insurance-lead-engine:newsletter-opt-outs';

type FormMode = 'subscribe' | 'optOut';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function readStoredEmails(key: string): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredEmails(key: string, emails: string[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(emails)).sort()));
    return true;
  } catch {
    return false;
  }
}

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<FormMode>('subscribe');
  const [optOuts, setOptOuts] = useState<string[]>(() => readStoredEmails(NEWSLETTER_OPT_OUTS_KEY));
  const [message, setMessage] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isSuppressed = normalizedEmail.length > 0 && optOuts.includes(normalizedEmail);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizedEmail) return;

    if (mode === 'optOut') {
      const subscribers = readStoredEmails(NEWSLETTER_SUBSCRIBERS_KEY);
      const nextOptOuts = Array.from(new Set([...optOuts, normalizedEmail])).sort();

      const removedSubscriber = writeStoredEmails(
        NEWSLETTER_SUBSCRIBERS_KEY,
        subscribers.filter((item) => item !== normalizedEmail),
      );
      const savedOptOut = writeStoredEmails(NEWSLETTER_OPT_OUTS_KEY, nextOptOuts);
      if (!removedSubscriber || !savedOptOut) {
        setMessage('Opt-out could not be saved because browser storage is unavailable.');
        return;
      }
      setOptOuts(nextOptOuts);
      setMessage('Opt-out saved. This email is blocked from newsletter capture in this browser.');
      return;
    }

    if (isSuppressed) {
      setMessage('This email is opted out and was not subscribed.');
      return;
    }

    const saved = writeStoredEmails(NEWSLETTER_SUBSCRIBERS_KEY, [
      ...readStoredEmails(NEWSLETTER_SUBSCRIBERS_KEY),
      normalizedEmail,
    ]);
    setMessage(
      saved
        ? 'Subscription preference saved locally.'
        : 'Subscription could not be saved because browser storage is unavailable.',
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow border">
      <h3 className="text-xl font-bold mb-2">Weekly Lead-Gen Playbook</h3>
      <p className="text-sm text-slate-600 mb-4">
        Get one battle-tested prospecting script + one closing tactic every Monday. Free.
      </p>

      <div className="mb-4 flex rounded border border-slate-200 p-1 text-sm" aria-label="Newsletter preference mode">
        <button
          type="button"
          onClick={() => {
            setMode('subscribe');
            setMessage(null);
          }}
          className={`flex-1 rounded px-3 py-2 font-medium ${
            mode === 'subscribe' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          aria-pressed={mode === 'subscribe'}
        >
          Subscribe
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('optOut');
            setMessage(null);
          }}
          className={`flex-1 rounded px-3 py-2 font-medium ${
            mode === 'optOut' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          aria-pressed={mode === 'optOut'}
        >
          Opt out
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="newsletter-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage(null);
            }}
            placeholder="agent@example.com"
            aria-describedby={message ? 'newsletter-privacy newsletter-status' : 'newsletter-privacy'}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={mode === 'subscribe' && isSuppressed}
        >
          {mode === 'optOut' ? 'Save opt-out' : 'Subscribe'}
        </button>
      </form>

      {message && (
        <p id="newsletter-status" role="status" className="mt-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      )}

      {isSuppressed && mode === 'subscribe' && (
        <p className="mt-3 text-sm text-amber-700">
          This address is on the local opt-out list, so newsletter capture is disabled.
        </p>
      )}

      <p id="newsletter-privacy" className="mt-3 text-xs text-slate-500">
        Opt-out requests are stored in this browser and suppress this app&apos;s local newsletter capture for the
        submitted email.
      </p>
    </div>
  );
}
