import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function SystemConfigPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.systemConfig?.title || 'System Config';

  const [page] = useState(1);
  const [pageSize] = useState(200);

  const permissions = bootstrap?.rbac?.permissions || [];
  const canWrite = useMemo(() => permissions.includes('GOV_SYSTEM_CONFIG_WRITE'), [permissions]);

  const [modalOpen, setModalOpen] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  const list = usePagedQuery({ path: '/api/v1/governance/system-config', page, pageSize, enabled: true });

  const upsertMutation = useMutation(async () => {
    return apiFetch(`/api/v1/governance/system-config/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, description: description || null, reason: reason || null }
    });
  });

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-50">
          <PageHeader title={title} />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} />
        <ErrorState error={list.error} />
      </div>
    );
  }

  const items = list.data?.items || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={title} subtitle="Central system configuration controls." />

      {/* Warning Banner */}
      <div className="mx-4 mt-4 mb-2 md:mx-6 lg:mx-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <div>
            <p className="text-sm font-medium text-amber-800">System Config is critical</p>
            <p className="text-xs text-amber-700 mt-1">Changes can impact enforcement and features. Use a clear reason for any update.</p>
          </div>
        </div>
      </div>

      <div className="mx-4 md:mx-6 lg:mx-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Write access</div>
              <div className="mt-1 text-sm text-slate-600">
                {canWrite ? 'You can update configuration values.' : 'Read-only: GOV_SYSTEM_CONFIG_WRITE is required to update values.'}
              </div>
            </div>
            {canWrite ? (
              <button
                type="button"
                className="w-full sm:w-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  setKey('');
                  setValue('');
                  setDescription('');
                  setReason('');
                  setModalOpen(true);
                }}
              >
                Add / Update
              </button>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Config Entries</div>
          </div>

          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No config entries" />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((c) => (
                  <div key={c.key} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="font-mono text-sm text-slate-900">{c.key}</div>
                    <div className="mt-1 text-sm text-slate-700">{c.value}</div>
                    <div className="mt-1 text-sm text-slate-600">{c.description || '-'}</div>
                    {canWrite ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setKey(c.key);
                          setValue(c.value);
                          setDescription(c.description || '');
                          setReason('');
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table
                  columns={[
                    { key: 'key', header: 'Key', render: (d) => <span className="font-mono">{d.key}</span> },
                    { key: 'value', header: 'Value', render: (d) => d.value },
                    { key: 'desc', header: 'Description', render: (d) => d.description || '' },
                    ...(canWrite ? [{
                      key: 'actions',
                      header: 'Actions',
                      render: (d) => (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            setKey(d.key);
                            setValue(d.value);
                            setDescription(d.description || '');
                            setReason('');
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                      )
                    }] : [])
                  ]}
                  rows={items.map((c) => ({ key: c.key, data: c }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (upsertMutation.status === 'loading') return;
              setModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Update System Config</div>
            <div className="mt-1 text-sm text-slate-600">Reason is required for any write.</div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Key</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="PROJECTS_ENABLED"
                  disabled={upsertMutation.status === 'loading'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Value</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="true"
                  disabled={upsertMutation.status === 'loading'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Description (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={upsertMutation.status === 'loading'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Reason (required)</label>
                <textarea
                  className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={upsertMutation.status === 'loading'}
                  placeholder="Explain why this change is needed"
                />
                {reason.trim().length === 0 ? (
                  <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
                ) : null}
              </div>
            </div>

            {upsertMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={upsertMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={upsertMutation.status === 'loading'}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={upsertMutation.status === 'loading' || !key.trim() || reason.trim().length === 0}
                onClick={async () => {
                  await upsertMutation.run();
                  setModalOpen(false);
                  list.refresh();
                }}
              >
                {upsertMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
