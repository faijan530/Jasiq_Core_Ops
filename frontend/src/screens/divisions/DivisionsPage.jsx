import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

export function DivisionsPage() {
  const { bootstrap } = useBootstrap();
  const title = bootstrap?.ui?.screens?.divisions?.title || 'Divisions';

  const [mode, setMode] = useState('list'); // list | create | view
  const [selectedId, setSelectedId] = useState(null);

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return window.localStorage.getItem('divisions_context_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [divisionType, setDivisionType] = useState('INTERNAL');
  const [description, setDescription] = useState('');
  const [createReason, setCreateReason] = useState('');

  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationTarget, setActivationTarget] = useState(null);
  const [activationIsActive, setActivationIsActive] = useState(false);
  const [activationReason, setActivationReason] = useState('');

  const [notificationCount, setNotificationCount] = useState(() => {
    try {
      const v = window.localStorage.getItem('divisions_notification_count');
      const n = v ? Number(v) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });

  const incrementNotifications = () => {
    setNotificationCount((prev) => {
      const next = (Number(prev) || 0) + 1;
      try {
        window.localStorage.setItem('divisions_notification_count', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const list = usePagedQuery({ path: '/api/v1/governance/divisions', page, pageSize, enabled: true });

  const detail = usePagedQuery({
    path: selectedId ? `/api/v1/governance/divisions/${selectedId}` : '/api/v1/governance/divisions/__none__',
    page: 1,
    pageSize: 1,
    enabled: mode === 'view' && Boolean(selectedId)
  });

  const createMutation = useMutation(async () => {
    return apiFetch('/api/v1/governance/divisions', {
      method: 'POST',
      body: {
        code: code.trim(),
        name: name.trim(),
        type: divisionType,
        description: description.trim() || null,
        reason: createReason || null
      }
    });
  });

  const toggleMutation = useMutation(async ({ id, isActive, reason }) => {
    return apiFetch(`/api/v1/governance/divisions/${id}/activation`, {
      method: 'PATCH',
      body: { isActive, reason }
    });
  });

  const canCreate = useMemo(() => code.trim().length > 0 && name.trim().length > 0, [code, name]);

  const items = list.data?.items || [];
  const total = list.data?.total || 0;

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => {
      const codeStr = String(d?.code || '').toLowerCase();
      const nameStr = String(d?.name || '').toLowerCase();
      return codeStr.includes(q) || nameStr.includes(q);
    });
  }, [items, searchTerm]);

  const selectedItem = useMemo(() => {
    if (mode !== 'view' || !selectedId) return null;
    return detail.data?.item || items.find((x) => x.id === selectedId) || null;
  }, [detail.data, items, mode, selectedId]);

  const openDivision = (divisionId) => {
    setMode('view');
    setSelectedId(divisionId);
  };

  const headerMonthLabel = useMemo(() => {
    const createdAt = selectedItem?.createdAt;
    const date = createdAt ? new Date(createdAt) : null;
    if (date && !Number.isNaN(date.getTime())) {
      const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
      return monthYear;
    }
    return '';
  }, [selectedItem]);

  const createdOn = (d) => {
    const s = String(d?.createdAt || '');
    return s ? s.slice(0, 10) : '';
  };

  const typeBadge = (d) => {
    const t = d?.type;
    if (t === 'REVENUE') return 'Revenue';
    if (t === 'INTERNAL') return 'Internal';
    return '—';
  };

  if (list.status === 'loading' && !list.data) {
    return (
      <div className="min-h-screen bg-slate-100">
        <PageHeader title={title} subtitle="Manage immutable divisions (activation only)." />
        <LoadingState />
      </div>
    );
  }

  if (list.status === 'error') {
    if (list.error?.status === 403) {
      return (
        <div className="min-h-screen bg-slate-100">
          <PageHeader title={title} variant="divisions" />
          <ForbiddenState />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100">
        <PageHeader title={title} variant="divisions" />
        <ErrorState error={list.error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {selectedItem?.id && selectedItem?.name ? (
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-2">
                  <img 
                    src="/image.png" 
                    alt="JASIQ" 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
                </div>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  className="text-sm font-medium text-white hover:text-slate-200 transition-colors truncate max-w-[120px] md:max-w-none"
                  onClick={() => openDivision(selectedItem.id)}
                >
                  {selectedItem.name}
                </button>
              </div>
              <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                <span className="text-white">{headerMonthLabel}</span>
                <span className="mx-2">·</span>
                <span className="text-emerald-400">OPEN</span>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="JASIQ" 
                  className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
                />
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
              </div>
              {headerMonthLabel ? (
                <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
                  <span className="text-white">{headerMonthLabel}</span>
                  <span className="mx-2">·</span>
                  <span className="text-emerald-400">OPEN</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="pt-32 sm:pt-32 lg:pt-16">
      <PageHeader
        title="Divisions"
        subtitle="Root of financial attribution"
        variant="divisions"
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <input
                className="h-9 w-64 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
                placeholder="Search divisions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400 whitespace-nowrap"
              onClick={() => {
                setMode('create');
                setSelectedId(null);
                setCode('');
                setName('');
                setDivisionType('INTERNAL');
                setDescription('');
                setCreateReason('');
              }}
              disabled={createMutation.status === 'loading' || toggleMutation.status === 'loading'}
            >
              <span className="hidden sm:inline">+ Add Division</span>
              <span className="sm:hidden">+ Add</span>
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        {!bannerDismissed ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm text-slate-700">
                <div>Divisions define financial truth.</div>
                <div>Every salary, expense, and income is ultimately attributed here.</div>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-indigo-800 hover:underline"
                onClick={() => {
                  setBannerDismissed(true);
                  try {
                    window.localStorage.setItem('divisions_context_banner_dismissed', '1');
                  } catch {
                    // ignore
                  }
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'list' ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Divisions</div>
              <div className="text-xs text-slate-500">Total: {total}</div>
            </div>

            <div className="p-4">
              {items.length === 0 ? (
                <EmptyState title="No divisions" description="No divisions found." />
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {filteredItems.map((d) => (
                      <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        {/* Division name and created date header */}
                        <div className="mb-4 pb-3 border-b border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              type="button"
                              className="text-base font-semibold text-slate-900 hover:text-indigo-800 transition-colors text-left"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              {d.name}
                            </button>
                            <div>
                              {d.isActive ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Created {createdOn(d)}
                          </div>
                        </div>
                        
                        {/* Division details */}
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Code</span>
                            <span className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded">{d.code}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Type</span>
                            <span className="inline-flex rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">
                              {typeBadge(d)}
                            </span>
                          </div>
                        </div>
                        
                        {/* View action */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors"
                            onClick={() => {
                              openDivision(d.id);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table layout */}
                  <div className="hidden md:block">
                    <Table
                      columns={[
                        {
                          key: 'code',
                          title: 'Division Code',
                          render: (_v, d) => <span className="font-mono text-sm text-slate-900">{d.code}</span>
                        },
                        {
                          key: 'name',
                          title: 'Division Name',
                          render: (_v, d) => (
                            <button
                              type="button"
                              className="text-sm text-indigo-800 hover:underline"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              {d.name}
                            </button>
                          )
                        },
                        {
                          key: 'type',
                          title: 'Type',
                          render: (_v, d) => (
                            <span className="inline-flex rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">
                              {typeBadge(d)}
                            </span>
                          )
                        },
                        {
                          key: 'status',
                          title: 'Status',
                          render: (_v, d) =>
                            d.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                                Inactive
                              </span>
                            )
                        },
                        {
                          key: 'createdOn',
                          title: 'Created On',
                          render: (_v, d) => <span className="text-sm text-slate-700">{createdOn(d)}</span>
                        },
                        {
                          key: 'action',
                          title: 'Action',
                          render: (_v, d) => (
                            <button
                              type="button"
                              className="text-sm font-medium text-indigo-800 hover:underline"
                              onClick={() => {
                                openDivision(d.id);
                              }}
                            >
                              View
                            </button>
                          )
                        }
                      ]}
                      data={filteredItems.map((d) => ({
                        ...d,
                        type: d.type,
                        status: d.isActive,
                        createdOn: createdOn(d),
                        action: d.id
                      }))}
                      empty="No divisions found"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[640px]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {mode === 'create' ? 'Add Division' : 'Division'}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Root of financial attribution. Changes must be explicit and auditable.
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-400 bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  onClick={() => {
                    setMode('list');
                    setSelectedId(null);
                  }}
                >
                  ← Back
                </button>
              </div>

              {mode === 'view' && detail.status === 'loading' && !detail.data ? (
                <div className="mt-4">
                  <LoadingState />
                </div>
              ) : null}

              {mode === 'view' && detail.status === 'error' ? (
                <div className="mt-4">
                  {detail.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={detail.error} />}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Division Code</label>
                  <div className="mt-1 relative">
                    <input
                      className="w-full rounded-md border-slate-300 text-sm font-mono bg-white disabled:bg-slate-50"
                      value={mode === 'view' ? String(selectedItem?.code || '') : code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={mode === 'view'}
                      maxLength={bootstrap?.validation?.rules?.division?.codeMax || 20}
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Division codes are permanent. Choose carefully.</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Division Name</label>
                  <input
                    className="mt-1 w-full rounded-md border-slate-300 text-sm bg-white disabled:bg-slate-50"
                    value={mode === 'view' ? String(selectedItem?.name || '') : name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={mode === 'view'}
                    maxLength={bootstrap?.validation?.rules?.division?.nameMax || 100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="mt-1 w-full h-24 rounded-md border-slate-300 text-sm bg-white disabled:bg-slate-50"
                    value={mode === 'create' ? description : String(selectedItem?.description || '')}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={mode !== 'create'}
                  />
                </div>

                <div>
                  <div className="block text-sm font-medium text-slate-700">Division Type</div>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        className="border-slate-300"
                        checked={mode === 'create' ? divisionType === 'REVENUE' : selectedItem?.type === 'REVENUE'}
                        onChange={() => setDivisionType('REVENUE')}
                        disabled={mode !== 'create'}
                      />
                      Revenue Generating
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        className="border-slate-300"
                        checked={mode === 'create' ? divisionType === 'INTERNAL' : selectedItem?.type === 'INTERNAL'}
                        onChange={() => setDivisionType('INTERNAL')}
                        disabled={mode !== 'create'}
                      />
                      Internal / Support
                    </label>
                  </div>
                </div>

                <div>
                  <div className="block text-sm font-medium text-slate-700">Status</div>
                  <div className={(selectedItem?.isActive ?? true) ? 'mt-1 text-sm text-emerald-700' : 'mt-1 text-sm text-slate-500'}>
                    {(selectedItem?.isActive ?? true) ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {mode === 'create' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                    <input
                      className="mt-1 w-full rounded-md border-slate-300 text-sm bg-white"
                      value={createReason}
                      onChange={(e) => setCreateReason(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {createMutation.status === 'error' ? (
                <div className="mt-3">
                  <ErrorState error={createMutation.error} />
                </div>
              ) : null}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                {mode === 'create' ? (
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400"
                    disabled={!canCreate || createMutation.status === 'loading'}
                    onClick={async () => {
                      await createMutation.run();
                      incrementNotifications();
                      setMode('list');
                      setSelectedId(null);
                      setCode('');
                      setName('');
                      setDivisionType('INTERNAL');
                      setDescription('');
                      setCreateReason('');
                      list.refresh();
                    }}
                  >
                    {createMutation.status === 'loading' ? 'Creating…' : 'Create Division'}
                  </button>
                ) : null}

                {mode === 'view' && selectedItem ? (
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                    disabled={
                      toggleMutation.status === 'loading' ||
                      (selectedItem.isActive && selectedItem.canDeactivate === false)
                    }
                    onClick={() => {
                      setActivationTarget(selectedItem);
                      setActivationIsActive(!selectedItem.isActive);
                      setActivationReason('');
                      setActivationModalOpen(true);
                    }}
                  >
                    {selectedItem.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                ) : null}

                {mode === 'view' && selectedItem?.isActive && selectedItem?.canDeactivate === false ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-600">
                    <div className="text-sm">Cannot deactivate division:</div>
                    <div className="mt-1 text-sm">
                      {Array.isArray(selectedItem.blockedReasons) && selectedItem.blockedReasons.length > 0 ? (
                        <div className="space-y-0.5">
                          {selectedItem.blockedReasons.map((r, idx) => (
                            <div key={idx}>{r}</div>
                          ))}
                        </div>
                      ) : (
                        <div>Blocked by system rules</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {activationModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => {
                if (toggleMutation.status === 'loading') return;
                setActivationModalOpen(false);
                setActivationTarget(null);
                setActivationReason('');
              }}
            />
            <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-base font-semibold text-slate-900">
                {activationIsActive ? 'Activate Division' : 'Deactivate Division'}
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
                  className="mt-1 w-full h-28 rounded-md border-slate-300 text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  value={activationReason}
                  onChange={(e) => setActivationReason(e.target.value)}
                  placeholder="Explain why this activation change is needed"
                />
                {activationReason.trim().length === 0 ? (
                  <div className="mt-1 text-xs text-rose-700">Reason is required.</div>
                ) : null}
              </div>

              {toggleMutation.status === 'error' ? (
                <div className="mt-3">
                  <ErrorState error={toggleMutation.error} />
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
                  disabled={toggleMutation.status === 'loading'}
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
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:bg-slate-400"
                  disabled={toggleMutation.status === 'loading' || activationReason.trim().length === 0 || !activationTarget}
                  onClick={async () => {
                    await toggleMutation.run({
                      id: activationTarget.id,
                      isActive: activationIsActive,
                      reason: activationReason.trim()
                    });
                    if (activationIsActive === false) {
                      incrementNotifications();
                    }
                    setActivationModalOpen(false);
                    setActivationTarget(null);
                    setActivationReason('');
                    list.refresh();
                    if (mode === 'view') detail.refresh();
                  }}
                >
                  {toggleMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">Page {page}</div>
          <button
            type="button"
            className="w-full sm:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:bg-slate-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      </div>
    </div>
  );
}
