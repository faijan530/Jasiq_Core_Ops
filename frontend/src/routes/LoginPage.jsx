import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../api/client.js';
import { useBootstrap } from '../state/bootstrap.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const { setToken, refresh, bootstrap } = useBootstrap();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  async function handleLoginSuccess(data) {
    localStorage.setItem('accessToken', data.accessToken);
    setToken(data.accessToken);

    await refresh();

    if (data.forcePasswordChange) {
      navigate('/change-password');
      return;
    }

    // Get role from bootstrap data (rbac.roles[0]) instead of JWT token
    const role = bootstrap?.rbac?.roles?.[0];

    const roleRedirectMap = {
      SUPER_ADMIN: '/super-admin/dashboard',
      HR_ADMIN: '/hr/dashboard',
      FINANCE_ADMIN: '/finance/dashboard',
      MANAGER: '/manager/dashboard',
      EMPLOYEE: '/employee/dashboard'
    };

    const redirectPath = roleRedirectMap[role] || '/';

    navigate(redirectPath);
  }

  const api = {
    post: async (path, payload) => {
      const data = await apiFetch(path, { method: 'POST', body: payload });
      return { data };
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = { email, password };

    try {
      const adminRes = await api.post('/api/v1/auth/admin/login', payload);
      await handleLoginSuccess(adminRes.data);
      return;
    } catch (adminError) {
      try {
        const empRes = await api.post('/api/v1/auth/employee/login', payload);
        await handleLoginSuccess(empRes.data);
        return;
      } catch (empError) {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>
      
            
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Floating card with glass morphism */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Logo and branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">JASIQ CoreOps</h1>
              <p className="text-blue-100 text-sm">Welcome back! Sign in to access your dashboard</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 flex items-center space-x-2">
                  <svg className="h-5 w-5 text-red-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-100 text-sm">{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-blue-100 text-xs">
                Secure access to your CoreOps dashboard
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional visual elements */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            Powered by <span className="font-semibold">JASIQ</span>
          </p>
        </div>
      </div>
      
      {/* Custom styles for animation delays */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
