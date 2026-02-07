import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { EmptyState, ForbiddenState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

export function AdminManagementPage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];

  const canManage = permissions.includes('AUTH_ADMIN_MANAGE');
  const canCreateSuperAdmin = roles.includes('SUPER_ADMIN') || roles.includes('COREOPS_ADMIN');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const allowedRoles = useMemo(() => {
    return canCreateSuperAdmin ? ['ADMIN', 'SUPER_ADMIN'] : ['ADMIN'];
  }, [canCreateSuperAdmin]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 1 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      allowedRoles.includes(role) &&
      status !== 'loading'
    );
  }, [name, email, password, role, allowedRoles, status]);

  if (!canManage) return <ForbiddenState />;

  const handleCreate = async () => {
    setError('');
    setCreated(null);
    setStatus('loading');

    try {
      const payload = { name: name.trim(), email: email.trim(), password, role };
      const res = await apiFetch('/api/v1/auth/admins', { method: 'POST', body: payload });
      setCreated(res);
      setName('');
      setEmail('');
      setPassword('');
      setRole('ADMIN');
      setStatus('ready');
    } catch (err) {
      const msg = err.payload?.error?.issues?.map((i) => i.message).join(', ') || err.message || 'Create admin failed';
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <div>
      <PageHeader title="Admin Management" subtitle="Create another admin user" />

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading'}
            />
            <div className="mt-1 text-xs text-slate-500">Min 8 chars, must include upper, lower, number.</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              className="mt-1 w-full rounded-md border-slate-300 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={status === 'loading'}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        ) : null}

        {created ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Created admin: {created.email} ({created.role})
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              canSubmit ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400'
            }`}
            disabled={!canSubmit}
            onClick={handleCreate}
          >
            {status === 'loading' ? 'Creating…' : 'Create Admin'}
          </button>
        </div>
      </div>

      {!created && status === 'ready' ? (
        <div className="mt-4">
          <EmptyState title="No recent actions" description="Create an admin to see confirmation here." />
        </div>
      ) : null}
    </div>
  );
}
