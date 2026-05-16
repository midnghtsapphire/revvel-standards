'use client';

import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // TODO: wire to Resend / ConvertKit / Beehiiv
    setSubmitted(true);
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow border">
      <h3 className="text-xl font-bold mb-2">📬 Weekly Lead-Gen Playbook</h3>
      <p className="text-sm text-slate-600 mb-4">
        Get one battle-tested prospecting script + one closing tactic every Monday. Free.
      </p>
      {submitted ? (
        <p className="text-emerald-600 font-semibold">✓ Check your inbox to confirm.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@example.com"
            className="flex-1 border rounded px-3 py-2"
          />
          <button type="submit" className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark">
            Subscribe
          </button>
        </form>
      )}
      <p className="text-xs text-slate-400 mt-2">Unsubscribe anytime. GDPR/CCPA compliant.</p>
    </div>
  );
}
