import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import * as api from '../lib/api';

export function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.loginWithPassword(password);
      onAuthenticated();
    } catch (err) {
      // Deliberately generic: never confirm whether a password merely "exists".
      setError(err instanceof api.ApiError && err.status === 401
        ? 'Incorrect password.'
        : err instanceof Error ? err.message : 'Could not sign in.');
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bb-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bb-gradient flex items-center justify-center text-white mb-3">
            <Sparkles size={22} />
          </div>
          <h1 className="font-heading font-bold text-xl">Content Pro Agent</h1>
          <p className="text-sm text-bb-muted mt-1">Sign in to continue</p>
        </div>

        <div className="bb-card p-5">
          <span className="block text-xs font-semibold text-bb-muted uppercase tracking-wide mb-1.5">Password</span>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bb-muted" />
            <input
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="Enter workspace password"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-bb-border text-sm focus:outline-none focus:border-bb-primary bg-white"
            />
          </div>

          {error && <div className="mt-3 text-sm text-bb-error bg-red-50 rounded-xl px-3 py-2">{error}</div>}

          <button
            onClick={submit}
            disabled={!password || submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 bb-gradient text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting
              ? <><div className="bb-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in…</>
              : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
