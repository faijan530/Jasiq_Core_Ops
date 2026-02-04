import React, { useMemo, useState } from 'react';

import { useBootstrap } from '../state/bootstrap.jsx';
import { apiFetch } from '../api/client.js';

export function AdminLoginPage() {
  const { setToken, refresh } = useBootstrap();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = { email: email.trim(), password };
      const res = await apiFetch('/auth/admin/login', {
        method: 'POST',
        body: payload
      });
      const { accessToken } = res;
      setToken(accessToken);
      await refresh();
    } catch (err) {
      const msg = err.payload?.error?.issues?.map(i => i.message).join(', ') || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="text-xl font-semibold text-slate-900">JASIQ CoreOps</div>
        <div className="mt-1 text-sm text-slate-600">Admin Login</div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@coreops.dev"
            disabled={loading}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mt-3 text-sm text-rose-600">{error}</div>
        )}

        <button
          type="button"
          className="mt-4 w-full inline-flex justify-center items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
          onClick={handleLogin}
          disabled={!canSubmit || loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {import.meta.env.DEV && (
          <div className="mt-4 text-xs text-slate-500">
              <div>Default admin: <span className="font-mono">admin@coreops.dev / admin123</span></div>
            <div className="mt-1">
              <button
                type="button"
                className="underline text-slate-600 hover:text-slate-800"
                onClick={() => window.location.hash = '#/jwt-paste'}
              >
                Developer Access (Paste JWT)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
