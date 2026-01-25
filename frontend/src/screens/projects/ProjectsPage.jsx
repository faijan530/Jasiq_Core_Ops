import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function buildPath(divisionId) {
  const u = new URL('/api/v1/governance/projects', 'http://local');
  if (divisionId) u.searchParams.set('divisionId', divisionId);
  return u.pathname + u.search;
}

export function ProjectsPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.projects?.title || 'Projects';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [divisionId, setDivisionId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [createReason, setCreateReason] = useState('');

  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationTarget, setActivationTarget] = useState(null);
  const [activationIsActive, setActivationIsActive] = useState(false);
  const [activationReason, setActivationReason] = useState('');

  const divisions = usePagedQuery({ path: '/api/v1/governance/divisions', page: 1, pageSize: 200, enabled: true });

  const list = usePagedQuery({
    path: buildPath(divisionId || null),
    page,
    pageSize,
    enabled: true
  });

  const createMutation = useMutation(async () => {
    return apiFetch('/api/v1/governance/projects', {
      method: 'POST',
      body: {
        divisionId: divisionId,
        code: code.trim(),
        name: name.trim(),
        reason: createReason || null
      }
    });
  });

  const updateMutation = useMutation(async ({ id, isActive, reason }) => {
    return apiFetch(`/api/v1/governance/projects/${id}`, {
      method: 'PATCH',
      body: { isActive, reason }
    });
  });

  const canCreate = useMemo(
    () => divisionId.trim().length > 0 && code.trim().length > 0 && name.trim().length > 0,
    [divisionId, code, name]
  );

  const items = list.data?.items || [];
  const total = list.data?.total || 0;
  const divisionOptions = divisions.data?.items || [];

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={title} subtitle="Projects are scoped to a division." />
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

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={title} subtitle="Division-scoped projects." right={<div className="text-xs text-slate-500">Total: {total}</div>} />

      <div className="mx-4 md:mx-6 lg:mx-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-6">
          <div className="text-sm font-semibold text-slate-900 mb-3">Create Project</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Division</label>
              <select
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Select…</option>
                {divisionOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Code</label>
              <input
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={bootstrap?.validation?.rules?.project?.codeMax || 30}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Name</label>
              <input
                className="mt-1 w-full rounded-md border-slate-300 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={bootstrap?.validation?.rules?.project?.nameMax || 150}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Reason (optional)</label>
              <input className="mt-1 w-full rounded-md border-slate-300 text-sm" value={createReason} onChange={(e) => setCreateReason(e.target.value)} />
            </div>
          </div>

          <button
            type="button"
            className="mt-3 w-full sm:w-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            disabled={!canCreate || createMutation.status === 'loading'}
            onClick={async () => {
              await createMutation.run();
              setCode('');
              setName('');
              setCreateReason('');
              list.refresh();
            }}
          >
            {createMutation.status === 'loading' ? 'Creating…' : 'Create Project'}
          </button>

          {createMutation.status === 'error' ? <div className="mt-3"><ErrorState error={createMutation.error} /></div> : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Projects</div>
          </div>

          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No projects" description="Create a project after selecting a division." />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm text-slate-900">{p.code}</div>
                        <div className="mt-1 text-sm text-slate-700">{p.name}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                      disabled={updateMutation.status === 'loading'}
                      onClick={() => {
                        setActivationTarget(p);
                        setActivationIsActive(!p.isActive);
                        setActivationReason('');
                        setActivationModalOpen(true);
                      }}
                    >
                      Set {p.isActive ? 'Inactive' : 'Active'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table
                  columns={[
                    { key: 'code', header: 'Code', render: (d) => <span className="font-mono">{d.code}</span> },
                    { key: 'name', header: 'Name', render: (d) => d.name },
                    { key: 'active', header: 'Active', render: (d) => (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    )},
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (d) => (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                          disabled={updateMutation.status === 'loading'}
                          onClick={() => {
                            setActivationTarget(d);
                            setActivationIsActive(!d.isActive);
                            setActivationReason('');
                            setActivationModalOpen(true);
                          }}
                        >
                          Set {d.isActive ? 'Inactive' : 'Active'}
                        </button>
                      )
                    }
                  ]}
                  rows={items.map((p) => ({ key: p.id, data: p }))}
                />
              </div>
            </div>
          )}
        </div>

        {activationModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (updateMutation.status === 'loading') return;
              setActivationModalOpen(false);
              setActivationTarget(null);
              setActivationReason('');
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">
              {activationIsActive ? 'Activate Project' : 'Deactivate Project'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {activationTarget ? (
                <span>
                  {activationTarget.code} — {activationTarget.name}
                </span>
              ) : null}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Reason (required)</label>
              <textarea
                className="mt-1 w-full h-28 rounded-md border-slate-300 text-sm"
                value={activationReason}
                onChange={(e) => setActivationReason(e.target.value)}
                placeholder="Explain why this activation change is needed"
              />
              {activationReason.trim().length === 0 ? (
                <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
              ) : null}
            </div>

            {updateMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={updateMutation.error} />
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
                disabled={updateMutation.status === 'loading'}
                onClick={() => {
                  setActivationModalOpen(false);
                  setActivationTarget(null);
                  setActivationReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={updateMutation.status === 'loading' || activationReason.trim().length === 0 || !activationTarget}
                onClick={async () => {
                  await updateMutation.run({
                    id: activationTarget.id,
                    isActive: activationIsActive,
                    reason: activationReason.trim()
                  });
                  setActivationModalOpen(false);
                  setActivationTarget(null);
                  setActivationReason('');
                  list.refresh();
                }}
              >
                {updateMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">Page {page}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:bg-slate-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
