import React, { useMemo, useState, useEffect } from 'react';
import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/States.jsx';

export function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const [submitting, setSubmitting] = useState(false);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const data = await apiFetch('/api/v1/auth/admins');
      setAdmins(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function handleAddAdmin(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch('/api/v1/auth/admins', {
        method: 'POST',
        body: form
      });
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      setShowAddForm(false);
      fetchAdmins();
    } catch (err) {
      alert(err.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (d) => <span className="font-medium text-slate-900">{d.email}</span>
    },
    {
      key: 'role',
      header: 'Role',
      render: (d) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          d.role_name === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {d.role_name}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <span className={`inline-flex items-center gap-1.5 ${d.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${d.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
          {d.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'created',
      header: 'Created At',
      render: (d) => <span className="text-slate-500">{new Date(d.created_at).toLocaleDateString()}</span>
    }
  ];

  const content = useMemo(() => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (admins.length === 0) return <EmptyState title="No admins found" description="There are no administrators registered in the system." />;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          rows={admins.map(a => ({ key: a.id, data: a }))}
        />
      </div>
    );
  }, [loading, error, admins]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Manage Admins" 
        actions={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
          >
            {showAddForm ? 'Cancel' : 'Add New Admin'}
          </button>
        }
      />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        {showAddForm && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Administrator</h2>
            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-xl border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full rounded-xl border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 chars, 1 upper, 1 digit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  className="w-full rounded-xl border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
