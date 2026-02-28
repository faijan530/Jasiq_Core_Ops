import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../api/client.js';
import { useBootstrap } from '../state/bootstrap.jsx';

export function EmployeeLoginPage() {
  const navigate = useNavigate();
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
      const res = await apiFetch('/api/v1/auth/employee/login', {
        method: 'POST',
        body: { email: email.trim(), password }
      });

      const { accessToken, forcePasswordChange } = res;
      setToken(accessToken);
      await refresh(accessToken);

      if (forcePasswordChange) {
        navigate('/change-password');
        return;
      }

      navigate('/');
    } catch (err) {
      const msg = err.payload?.error?.issues?.map(i => i.message).join(', ') || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-2xl font-semibold text-slate-900">Employee Login</div>
        <div className="mt-1 text-sm text-slate-600">Sign in to continue.</div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <button
            type="button"
            className="w-full inline-flex justify-center items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
            onClick={handleLogin}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
