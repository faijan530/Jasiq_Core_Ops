import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState, EmptyState } from '../../../components/States.jsx';

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm">Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function FinanceExpenseCategoriesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [patchCode, setPatchCode] = useState('');
  const [patchName, setPatchName] = useState('');
  const [patchDescription, setPatchDescription] = useState('');
  const [patchIsActive, setPatchIsActive] = useState(true);

  const [actionStatus, setActionStatus] = useState('idle');
  const [actionError, setActionError] = useState(null);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await apiFetch('/api/v1/expenses/categories');
      setItems(Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <LoadingState message="Loading categories…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'EXPENSE_CATEGORY_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  async function doCreate() {
    try {
      setActionStatus('loading');
      setActionError(null);
      await apiFetch('/api/v1/expenses/categories', {
        method: 'POST',
        body: { code, name, description }
      });
      setCreateOpen(false);
      setCode('');
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setActionStatus('idle');
    }
  }

  function openEdit(item) {
    setEditItem(item);
    setPatchCode(item.code || '');
    setPatchName(item.name || '');
    setPatchDescription(item.description || '');
    setPatchIsActive(Boolean(item.isActive));
    setEditOpen(true);
  }

  async function doEdit() {
    try {
      setActionStatus('loading');
      setActionError(null);
      await apiFetch(`/api/v1/expenses/categories/${editItem.id}`, {
        method: 'PATCH',
        body: {
          code: patchCode,
          name: patchName,
          description: patchDescription,
          isActive: patchIsActive,
          version: editItem.version
        }
      });
      setEditOpen(false);
      setEditItem(null);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setActionStatus('idle');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Categories</h1>
          <p className="text-slate-600 mt-1">Manage active categories used for expense capture.</p>
        </div>
        <button
          onClick={() => {
            setActionError(null);
            setCreateOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium"
        >
          Add Category
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No categories" description="Create your first expense category." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{c.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{c.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={createOpen} title="Add category" onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
        {actionError ? <div className="mt-3 text-sm text-red-700">{String(actionError.message || actionError)}</div> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium">Cancel</button>
          <button
            disabled={actionStatus === 'loading'}
            onClick={doCreate}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edit category" onClose={() => setEditOpen(false)}>
        {editItem ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                <input value={patchCode} onChange={(e) => setPatchCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input value={patchName} onChange={(e) => setPatchName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea value={patchDescription} onChange={(e) => setPatchDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Active</label>
                <select value={patchIsActive ? 'true' : 'false'} onChange={(e) => setPatchIsActive(e.target.value === 'true')} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                <input value={String(editItem.version || '')} disabled className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50" />
              </div>
            </div>

            {actionError ? <div className="mt-3 text-sm text-red-700">{String(actionError.message || actionError)}</div> : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium">Cancel</button>
              <button
                disabled={actionStatus === 'loading'}
                onClick={doEdit}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
