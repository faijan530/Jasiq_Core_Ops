import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../api/client.js';

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-2xl font-semibold text-slate-900">Change Password</div>
        <div className="mt-1 text-sm text-slate-600">You must change your password to continue.</div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            <div className="mt-1 text-xs text-slate-500">Minimum 8 characters.</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
            disabled={!canSubmit || loading}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
