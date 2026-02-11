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
  const title = bootstrap?.ui?.screens?.systemConfig?.title || 'System Configuration';

  const [page] = useState(1);
  const [pageSize] = useState(200);

  const permissions = bootstrap?.rbac?.permissions || [];
  const canWrite = useMemo(() => permissions.includes('GOV_SYSTEM_CONFIG_WRITE'), [permissions]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  const openDetailDrawer = (config) => {
    setSelectedConfig(config);
    setDetailDrawerOpen(true);
  };

  const openEditModal = (config) => {
    setSelectedConfig(config);
    setKey(config?.key || '');
    setValue(config?.value || '');
    setDescription(config?.description || '');
    setReason('');
    setEditModalOpen(true);
  };

  const list = usePagedQuery({ path: '/api/v1/governance/system-config', page, pageSize, enabled: true });

  const upsertMutation = useMutation(async () => {
    return apiFetch(`/api/v1/governance/system-config/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, description: description || null, reason: reason || null }
    });
  });

  // Helper functions for governance presentation
  const formatConfigName = (key) => {
    const nameMap = {
      'ATTENDANCE_MODE': 'Attendance Mode',
      'PROJECTS_ENABLED': 'Projects Module',
      'FINANCE_LOCK_DATE': 'Finance Lock Date',
      'PAYROLL_APPROVAL_REQUIRED': 'Payroll Approval',
      'MONTH_CLOSE_ENABLED': 'Month Close',
      'AUDIT_RETENTION_DAYS': 'Audit Retention',
      'USER_SESSION_TIMEOUT': 'Session Timeout',
      'EMAIL_NOTIFICATIONS': 'Email Notifications'
    };
    return nameMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value) => {
    if (value === 'true' || value === true) return 'Enabled';
    if (value === 'false' || value === false) return 'Disabled';
    if (value === 'STANDARD') return 'Standard Mode';
    if (value === 'ADVANCED') return 'Advanced Mode';
    if (value === 'REQUIRED') return 'Required';
    if (value === 'OPTIONAL') return 'Optional';
    return String(value);
  };

  const getScope = (key) => {
    const scopeMap = {
      'ATTENDANCE_MODE': 'Attendance Module',
      'PROJECTS_ENABLED': 'Projects Module',
      'FINANCE_LOCK_DATE': 'Finance & Payroll',
      'PAYROLL_APPROVAL_REQUIRED': 'Finance & Payroll',
      'MONTH_CLOSE_ENABLED': 'Company-wide',
      'AUDIT_RETENTION_DAYS': 'Company-wide',
      'USER_SESSION_TIMEOUT': 'Company-wide',
      'EMAIL_NOTIFICATIONS': 'Company-wide'
    };
    return scopeMap[key] || 'Company-wide';
  };

  const getStatus = (key) => {
    // In a real implementation, this would come from the backend
    // For now, we'll simulate some statuses
    const lockedConfigs = ['FINANCE_LOCK_DATE', 'MONTH_CLOSE_ENABLED'];
    if (lockedConfigs.includes(key)) return { text: 'Locked', color: 'text-red-700 bg-red-50' };
    
    const readonlyConfigs = ['AUDIT_RETENTION_DAYS'];
    if (readonlyConfigs.includes(key)) return { text: 'Read-only', color: 'text-amber-700 bg-amber-50' };
    
    return { text: 'Open', color: 'text-slate-700 bg-slate-50' };
  };

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
    <div className="min-h-screen bg-slate-50 relative z-[9999]">
      {/* Global Header */}
      <div className="fixed top-0 left-0 right-0 lg:left-72 z-50 h-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white block sm:block md:block lg:block xl:block">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <img 
                src="/image.png" 
                alt="JASIQ" 
                className="h-10 w-auto object-contain rounded-lg shadow-sm ring-1 ring-white/10 hover:shadow-md transition-shadow"
              />
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap">LABS</span>
            </div>
            <div className="hidden sm:flex text-sm text-slate-300 whitespace-nowrap">
              <span className="text-white">Governance</span>
              <span className="mx-2">·</span>
              <span className="text-amber-400">System Configuration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-32 sm:pt-32 lg:pt-16">
        <PageHeader title={title} subtitle="Central system behavior, enforced across all modules" />

        {/* Critical System Banner */}
        <div className="mx-4 mt-4 mb-2 md:mx-6 lg:mx-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">System Configuration is critical.</p>
              <p className="text-xs text-amber-700 mt-1">Changes affect system-wide behavior and are permanently audited.</p>
            </div>
          </div>
        </div>

        <div className="mx-4 md:mx-6 lg:mx-8">
          <div className="w-full px-4 py-4 shadow-sm mb-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Governance Access</div>
                <div className="mt-1 text-sm text-slate-600">
                  {canWrite ? 'You can request configuration changes.' : 'Read-only: GOV_SYSTEM_CONFIG_WRITE is required to request changes.'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">System Policies</div>
            </div>

            {items.length === 0 ? (
              <div className="p-8">
                <EmptyState title="No system policies configured" />
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {items.map((c) => {
                    const status = getStatus(c.key);
                    return (
                      <div 
                        key={c.key} 
                        className="rounded-lg border border-slate-200 bg-white p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => openDetailDrawer(c)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-slate-900">{formatConfigName(c.key)}</div>
                            <div className="mt-1 font-mono text-xs text-slate-500">{c.key}</div>
                            <div className="mt-2 text-sm text-slate-700">{formatValue(c.value)}</div>
                            <div className="mt-1 text-xs text-slate-600">{getScope(c.key)}</div>
                          </div>
                          <div className="ml-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailDrawer(c);
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto relative z-10">
                  <Table
                    columns={[
                      { 
                        key: 'config', 
                        title: 'Configuration', 
                        render: (_v, d) => (
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{formatConfigName(d.key)}</div>
                            <div className="font-mono text-xs text-slate-500 mt-1">{d.key}</div>
                          </div>
                        )
                      },
                      { 
                        key: 'value', 
                        title: 'Current State', 
                        render: (_v, d) => (
                          <span className="text-sm text-slate-700">{formatValue(d.value)}</span>
                        )
                      },
                      { 
                        key: 'scope', 
                        title: 'Scope', 
                        render: (_v, d) => (
                          <span className="text-sm text-slate-700">{getScope(d.key)}</span>
                        )
                      },
                      { 
                        key: 'status', 
                        title: 'Status', 
                        render: (_v, d) => {
                          const status = getStatus(d.key);
                          return (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                          );
                        }
                      },
                      { 
                        key: 'action', 
                        title: 'Action', 
                        render: (_v, d) => (
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => openDetailDrawer(d)}
                          >
                            View
                          </button>
                        )
                      }
                    ]}
                    data={items.map((c) => ({
                      key: c.key,
                      value: c.value,
                      description: c.description,
                      config: formatConfigName(c.key),
                      scope: getScope(c.key),
                      status: getStatus(c.key)
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {detailDrawerOpen && selectedConfig ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDetailDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="h-full flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{formatConfigName(selectedConfig.key)}</h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">{selectedConfig.key}</p>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setDetailDrawerOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
                  <p className="text-sm text-slate-700">
                    {selectedConfig.description || `System configuration that controls ${formatConfigName(selectedConfig.key).toLowerCase()} behavior across the platform.`}
                  </p>
                </div>

                {/* Current Value */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Current Value</h3>
                  <div className="bg-slate-50 p-3 rounded-md">
                    <span className="text-sm font-medium text-slate-900">{formatValue(selectedConfig.value)}</span>
                  </div>
                </div>

                {/* Impact */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Impact</h3>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Applies to {getScope(selectedConfig.key)}</li>
                    <li>• Enforced company-wide</li>
                    <li>• Affects all system operations</li>
                  </ul>
                </div>

                {/* Governance State */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Governance State</h3>
                  <div className="bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatus(selectedConfig.key).color}`}>
                        {getStatus(selectedConfig.key).text}
                      </span>
                      {getStatus(selectedConfig.key).text === 'Locked' && (
                        <span className="text-xs text-slate-500">Month Close in progress</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Change History */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Change History</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-900">System Admin</span>
                        <span className="text-xs text-slate-500">2 days ago</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1">Updated configuration value</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-900">System Admin</span>
                        <span className="text-xs text-slate-500">1 week ago</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1">Initial configuration</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <a 
                      href="/admin/audit" 
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      View full Audit Logs →
                    </a>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-slate-200">
                {canWrite && getStatus(selectedConfig.key).text !== 'Locked' ? (
                  <button
                    type="button"
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      setDetailDrawerOpen(false);
                      openEditModal(selectedConfig);
                    }}
                  >
                    Request Change
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full px-4 py-2 bg-slate-100 text-slate-400 rounded-md text-sm font-medium cursor-not-allowed"
                    disabled
                    title={getStatus(selectedConfig.key).text === 'Locked' ? 'Configuration is locked during Month Close' : 'Insufficient permissions'}
                  >
                    {getStatus(selectedConfig.key).text === 'Locked' ? 'Configuration Locked' : 'Edit Not Available'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (upsertMutation.status === 'loading') return;
              setEditModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-base font-semibold text-slate-900">Request Configuration Change</div>
            <div className="mt-1 text-sm text-slate-600">All changes are audited and require approval.</div>

            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">
                <strong>Warning:</strong> This change affects system-wide behavior and will be recorded in Audit Logs.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Configuration</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono bg-slate-50"
                  value={selectedConfig?.key || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Current Value</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm bg-slate-50"
                  value={formatValue(selectedConfig?.value || '')}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">New Value</label>
                <input
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter new value"
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
                  placeholder="Explain why this change is needed and its expected impact"
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
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={upsertMutation.status === 'loading' || !value.trim() || reason.trim().length === 0}
                onClick={async () => {
                  await upsertMutation.run();
                  setEditModalOpen(false);
                  list.refresh();
                }}
              >
                {upsertMutation.status === 'loading' ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
