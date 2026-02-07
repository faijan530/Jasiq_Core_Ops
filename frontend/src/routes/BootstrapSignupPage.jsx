import React, { useMemo, useState } from 'react';

import { apiFetch } from '../api/client.js';
import { useBootstrap } from '../state/bootstrap.jsx';

export function BootstrapSignupPage() {
  const { setToken, refresh } = useBootstrap();

  const [status, setStatus] = useState('loading');
  const [bootstrapEnabled, setBootstrapEnabled] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/v1/auth/bootstrap-status');
        if (!active) return;
        setBootstrapEnabled(Boolean(res.bootstrapSignupEnabled));
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load bootstrap status');
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return name.trim().length > 1 && email.trim().length > 0 && password.trim().length > 0;
  }, [name, email, password]);

  const handleSignup = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), password };
      const res = await apiFetch('/api/v1/auth/bootstrap-signup', {
        method: 'POST',
        body: payload
      });
      const { accessToken } = res;
      setToken(accessToken);
      await refresh();
      window.location.hash = '#/';
    } catch (err) {
      const msg = err.payload?.error?.issues?.map((i) => i.message).join(', ') || err.message || 'Signup failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading…</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6">
          <div className="text-lg font-semibold text-slate-900">Bootstrap status failed</div>
          <div className="mt-2 text-sm text-slate-600">{error || 'Please check backend connectivity.'}</div>
        </div>
      </div>
    );
  }

  if (!bootstrapEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6">
          <div className="text-lg font-semibold text-slate-900">Signup disabled</div>
          <div className="mt-2 text-sm text-slate-600">System is already bootstrapped.</div>
          <div className="mt-4">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                window.location.hash = '#/';
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-lg font-semibold text-slate-900">Initial Setup</div>
        <div className="mt-1 text-sm text-slate-600">Create the first super admin account.</div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <div className="mt-1 text-xs text-slate-500">Min 8 chars, must include upper, lower, number.</div>
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
          ) : null}

          <button
            type="button"
            className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white ${
              canSubmit && !submitting ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400'
            }`}
            disabled={!canSubmit || submitting}
            onClick={handleSignup}
          >
            {submitting ? 'Creating…' : 'Create Super Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
