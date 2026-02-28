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
      const res = await apiFetch('/api/v1/auth/admin/login', {
        method: 'POST',
        body: payload
      });
      const { accessToken } = res;
      setToken(accessToken);
      await refresh(accessToken);
    } catch (err) {
      const msg = err.payload?.error?.issues?.map(i => i.message).join(', ') || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
      
      {/* Main card */}
      <div className="max-w-md w-full relative">
        <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
          {/* Subtle border glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">JASIQ CoreOps</h1>
              <p className="text-slate-600 font-medium">Admin Portal</p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@coreops.dev"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-rose-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-rose-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${
                  canSubmit && !loading
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                onClick={handleLogin}
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 p-4 bg-slate-50/50 border border-slate-200 rounded-xl backdrop-blur-sm">
                <div className="text-xs text-slate-600 space-y-2">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono">admin@coreops.dev / admin123</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition-colors"
                      onClick={() => window.location.hash = '#/jwt-paste'}
                    >
                      Developer Access (Paste JWT)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>Secure Admin Portal</p>
        </div>
      </div>
    </div>
  );
}
