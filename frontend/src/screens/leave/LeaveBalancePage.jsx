import React, { useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Table } from '../../components/Table.jsx';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { useBootstrap } from '../../state/bootstrap.jsx';

function employeeLabel(e) {
  if (!e) return '';
  const name = `${String(e.firstName || '').trim()} ${String(e.lastName || '').trim()}`.trim();
  const code = String(e.employeeCode || '').trim();
  const email = String(e.email || '').trim();
  const parts = [];
  if (name) parts.push(name);
  if (email) parts.push(email);
  if (code) parts.push(code);
  return parts.join(' • ');
}

function employeeName(e) {
  if (!e) return '';
  return `${String(e.firstName || '').trim()} ${String(e.lastName || '').trim()}`.trim();
}

function isTruthyConfig(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled' || s === 'on';
}

function parseIntConfig(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function fmtUnits(units) {
  const n = Number(units || 0);
  if (!Number.isFinite(n)) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function LeaveBalancePage() {
  const { bootstrap } = useBootstrap();

  const permissions = bootstrap?.rbac?.permissions || [];
  const canRead = permissions.includes('LEAVE_BALANCE_READ');
  const canGrant = permissions.includes('LEAVE_BALANCE_GRANT');
  const canReadTypes = permissions.includes('LEAVE_TYPE_READ');

  const systemConfig = bootstrap?.systemConfig || {};
  const leaveEnabled = isTruthyConfig(systemConfig?.LEAVE_ENABLED?.value ?? systemConfig?.LEAVE_ENABLED);

  const defaultYear = useMemo(() => {
    const y = parseIntConfig(systemConfig?.LEAVE_DEFAULT_YEAR?.value ?? systemConfig?.LEAVE_DEFAULT_YEAR, 0);
    if (y >= 2000 && y <= 2100) return y;
    return new Date().getFullYear();
  }, [systemConfig]);

  const [employeeId, setEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [year, setYear] = useState(String(defaultYear));

  const types = usePagedQuery({ path: '/api/v1/leave/types?includeInactive=true', page: 1, pageSize: 200, enabled: leaveEnabled && canReadTypes });
  const typeItems = types.data?.items || [];

  // Fetch employees for dropdown
  const employees = usePagedQuery({ path: '/api/v1/employees', page: 1, pageSize: 200, enabled: leaveEnabled && canGrant });
  const employeeItems = employees.data?.items || [];

  const employeeById = useMemo(() => {
    const m = new Map();
    for (const e of employeeItems) {
      if (e?.id != null) m.set(String(e.id), e);
    }
    return m;
  }, [employeeItems]);

  // Filter employees based on search input
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employeeItems;
    const q = employeeSearch.toLowerCase();
    return employeeItems.filter((emp) => {
      const name = employeeName(emp).toLowerCase();
      const email = String(emp.email || '').toLowerCase();
      const code = String(emp.employeeCode || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [employeeItems, employeeSearch]);

  const list = usePagedQuery({ path: '/api/v1/leave/balances', page: 1, pageSize: 200, enabled: leaveEnabled && canRead });
  const items = useMemo(() => {
    let filtered = [...(list.data?.items || [])];
    if (employeeId.trim()) {
      filtered = filtered.filter(item => String(item.employeeId) === employeeId.trim());
    }
    if (year.trim()) {
      filtered = filtered.filter(item => String(item.year) === year.trim());
    }
    return filtered;
  }, [list.data, employeeId, year]);

  const grantMutation = useMutation(async (payload) => {
    return apiFetch('/api/v1/leave/balances/grant', { method: 'POST', body: payload });
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [grantEmployeeId, setGrantEmployeeId] = useState('');
  const [grantLeaveTypeId, setGrantLeaveTypeId] = useState('');
  const [grantYear, setGrantYear] = useState(String(defaultYear));
  const [openingBalance, setOpeningBalance] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [reason, setReason] = useState('');
  const [grantSelectedEmployee, setGrantSelectedEmployee] = useState(null);
  const [grantEmployeeSearch, setGrantEmployeeSearch] = useState('');
  const [grantShowDropdown, setGrantShowDropdown] = useState(false);
  const [grantEmployeeError, setGrantEmployeeError] = useState('');

  const filteredGrantEmployees = useMemo(() => {
    if (!grantEmployeeSearch.trim()) return employeeItems;
    const q = grantEmployeeSearch.toLowerCase();
    return employeeItems.filter((emp) => {
      const name = employeeName(emp).toLowerCase();
      const email = String(emp.email || '').toLowerCase();
      const code = String(emp.employeeCode || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [employeeItems, grantEmployeeSearch]);

  const openGrantModal = () => {
    const nextEmployeeId = employeeId.trim() || '';
    setGrantEmployeeId(nextEmployeeId);
    const emp = employeeItems.find((e) => String(e.id) === nextEmployeeId) || null;
    setGrantSelectedEmployee(emp);
    setGrantEmployeeSearch('');
    setGrantShowDropdown(false);
    setGrantEmployeeError('');
    setGrantLeaveTypeId('');
    setGrantYear(year.trim() || String(defaultYear));
    setOpeningBalance('');
    setGrantAmount('');
    setReason('');
    setModalOpen(true);
  };

  const content = useMemo(() => {
    if (!canRead) return <ForbiddenState />;

    if (!leaveEnabled) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm font-medium text-slate-900">Leave is disabled</div>
          <div className="mt-1 text-sm text-slate-600">LEAVE_ENABLED must be enabled in system config.</div>
        </div>
      );
    }

    if ((types.status === 'loading' && !types.data) || (list.status === 'loading' && !list.data)) return <LoadingState />;

    if (types.status === 'error') return types.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={types.error} />;

    if (list.status === 'error') return list.error?.status === 403 ? <ForbiddenState /> : <ErrorState error={list.error} />;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Leave Balances</div>
              <div className="mt-1 text-xs text-slate-500">Search and grant balances. Grant requires a reason.</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={list.refresh}
                disabled={list.status === 'loading'}
              >
                Refresh
              </button>
              {canGrant ? (
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
                  onClick={openGrantModal}
                  disabled={grantMutation.status === 'loading'}
                >
                  Grant Balance
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Employee (optional)</label>
              <div className="relative mt-1">
                {/* Dropdown button */}
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-300 text-sm bg-white px-3 py-2 text-left flex items-center justify-between hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {selectedEmployee ? (
                    <div className="flex items-center">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{employeeName(selectedEmployee) || '—'}</div>
                        <div className="text-xs text-slate-500 truncate">{String(selectedEmployee.email || '').trim() || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400">Select employee...</div>
                  )}
                  
                  {/* Dropdown arrow */}
                  <svg className="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7m0 0l7-7" />
                  </svg>
                </button>

                {/* Dropdown options */}
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-200">
                      <input
                        type="text"
                        className="w-full rounded-md border-slate-300 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search employees..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    {/* Employee options */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">No employees found</div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 border-b border-slate-100 last:border-b-0"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEmployeeId(emp.id);
                              setEmployeeError('');
                              setShowDropdown(false);
                              setEmployeeSearch('');
                            }}
                          >
                            <div className="flex flex-col">
                              <div className="font-medium text-slate-900">{employeeName(emp) || '—'}</div>
                              <div className="text-xs text-slate-500">{String(emp.email || '').trim() || '—'}</div>
                              {String(emp.employeeCode || '').trim() ? (
                                <div className="text-xs text-slate-400">Code: {String(emp.employeeCode || '').trim()}</div>
                              ) : null}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* Click outside to close */}
                {showDropdown && (
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowDropdown(false)}
                  />
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">If blank, returns balances across all employees you can access.</div>
              {employeeError ? (
                <div className="mt-1 text-xs text-rose-600">{employeeError}</div>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Year (optional)</label>
              <input
                className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono min-h-[44px]"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
              />
            </div>
          </div>

          <div className="p-4 pt-0">
            {items.length === 0 ? (
              <EmptyState title="No balances" description="No balances found for the selected filters." />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table
                    columns={[
                      {
                        key: 'employeeId',
                        title: 'Employee',
                        render: (_v, d) => {
                          const emp = employeeById.get(String(d.employeeId));
                          const name = employeeName(emp);
                          const email = String(emp?.email || '').trim();
                          if (!name) {
                            return <span className="font-mono text-xs text-slate-700">{String(d.employeeId).slice(0, 8)}…</span>;
                          }
                          return (
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
                              {email ? <div className="text-xs text-slate-500 truncate">{email}</div> : null}
                            </div>
                          );
                        }
                      },
                      { key: 'type', title: 'Leave Type', render: (_v, d) => <span className="text-sm font-medium text-slate-900">{d.leaveTypeCode} — {d.leaveTypeName}</span> },
                      { key: 'year', title: 'Year', render: (_v, d) => <span className="text-sm text-slate-700">{d.year}</span> },
                      { key: 'opening', title: 'Opening', render: (_v, d) => <span className="text-sm text-slate-700">{fmtUnits(d.openingBalance)}</span> },
                      { key: 'granted', title: 'Granted', render: (_v, d) => <span className="text-sm text-slate-700">{fmtUnits(d.grantedBalance)}</span> },
                      { key: 'consumed', title: 'Consumed', render: (_v, d) => <span className="text-sm text-slate-700">{fmtUnits(d.consumedBalance)}</span> },
                      { key: 'available', title: 'Available', render: (_v, d) => <span className="text-sm font-semibold text-slate-900">{fmtUnits(d.availableBalance)}</span> }
                    ]}
                    data={items.map((x) => ({
                      employeeId: x.employeeId,
                      type: `${x.leaveTypeCode} — ${x.leaveTypeName}`,
                      year: x.year,
                      openingBalance: x.openingBalance,
                      grantedBalance: x.grantedBalance,
                      consumedBalance: x.consumedBalance,
                      availableBalance: x.availableBalance,
                      leaveTypeCode: x.leaveTypeCode,
                      leaveTypeName: x.leaveTypeName
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {items.map((x) => (
                    <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">{x.leaveTypeCode} — {x.leaveTypeName}</div>
                          <div className="mt-1 text-xs text-slate-500">Employee: {String(x.employeeId).slice(0, 8)}…</div>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">{fmtUnits(x.availableBalance)}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-slate-500">Year</div>
                          <div className="text-slate-700">{x.year}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Available</div>
                          <div className="font-semibold text-slate-900">{fmtUnits(x.availableBalance)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Opening</div>
                          <div className="text-slate-700">{fmtUnits(x.openingBalance)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Granted</div>
                          <div className="text-slate-700">{fmtUnits(x.grantedBalance)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Consumed</div>
                          <div className="text-slate-700">{fmtUnits(x.consumedBalance)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }, [canGrant, canRead, employeeId, grantMutation.status, items, leaveEnabled, list, types, year]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Leave Balances" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-4">{content}</div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => {
              if (grantMutation.status === 'loading') return;
              setModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-sm p-5 max-h-[90vh] overflow-y-auto">
            <div className="text-base font-semibold text-slate-900">Grant Leave Balance</div>
            <div className="mt-1 text-sm text-slate-600">Grant adds to granted balance. Opening balance can also be set.</div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee</label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    className="w-full rounded-md border border-slate-300 text-sm bg-white px-3 py-2 text-left flex items-center justify-between hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                    onClick={() => {
                      setGrantShowDropdown((v) => !v);
                      setGrantEmployeeError('');
                    }}
                  >
                    {grantSelectedEmployee ? (
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 truncate">{employeeName(grantSelectedEmployee) || '—'}</div>
                        <div className="text-xs text-slate-500 truncate">{String(grantSelectedEmployee.email || '').trim() || '—'}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400">Select employee...</div>
                    )}
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7m0 0l7-7" />
                    </svg>
                  </button>

                  {grantShowDropdown ? (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-200">
                        <input
                          type="text"
                          className="w-full rounded-md border-slate-300 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Search employees..."
                          value={grantEmployeeSearch}
                          onChange={(e) => setGrantEmployeeSearch(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto">
                        {filteredGrantEmployees.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">No employees found</div>
                        ) : (
                          filteredGrantEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 border-b border-slate-100 last:border-b-0"
                              onClick={() => {
                                setGrantSelectedEmployee(emp);
                                setGrantEmployeeId(String(emp.id));
                                setGrantEmployeeError('');
                                setGrantShowDropdown(false);
                                setGrantEmployeeSearch('');
                              }}
                            >
                              <div className="flex flex-col">
                                <div className="font-medium text-slate-900">{employeeName(emp) || '—'}</div>
                                <div className="text-xs text-slate-500">{String(emp.email || '').trim() || '—'}</div>
                                {String(emp.employeeCode || '').trim() ? (
                                  <div className="text-xs text-slate-400">Code: {String(emp.employeeCode || '').trim()}</div>
                                ) : null}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}

                  {grantShowDropdown ? (
                    <div className="fixed inset-0 z-0" onClick={() => setGrantShowDropdown(false)} />
                  ) : null}
                </div>

                {grantEmployeeError ? <div className="mt-1 text-xs text-rose-600">{grantEmployeeError}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Year</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono min-h-[44px]" value={grantYear} onChange={(e) => setGrantYear(e.target.value)} placeholder="2026" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Leave Type</label>
                <select className="mt-1 w-full rounded-md border-slate-300 text-sm min-h-[44px]" value={grantLeaveTypeId} onChange={(e) => setGrantLeaveTypeId(e.target.value)}>
                  <option value="">Select…</option>
                  {typeItems.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}{t.isActive ? '' : ' (Inactive)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Opening Balance (optional)</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono min-h-[44px]" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Grant Amount</label>
                <input className="mt-1 w-full rounded-md border-slate-300 text-sm font-mono min-h-[44px]" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <textarea
                  className="mt-1 w-full rounded-md border-slate-300 text-sm"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a clear reason for granting this balance"
                />
              </div>
            </div>

            {grantMutation.status === 'error' ? (
              <div className="mt-3">
                <ErrorState error={grantMutation.error} />
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
                onClick={() => {
                  if (grantMutation.status === 'loading') return;
                  setModalOpen(false);
                }}
                disabled={grantMutation.status === 'loading'}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-400 min-h-[44px]"
                disabled={
                  grantMutation.status === 'loading' ||
                  !grantSelectedEmployee ||
                  grantLeaveTypeId.trim().length === 0 ||
                  grantYear.trim().length === 0 ||
                  grantAmount.trim().length === 0 ||
                  reason.trim().length === 0
                }
                onClick={async () => {
                  try {
                    if (!grantSelectedEmployee) {
                      setGrantEmployeeError('Please select an employee');
                      return;
                    }
                    await grantMutation.run({
                      employeeId: String(grantSelectedEmployee.id),
                      leaveTypeId: grantLeaveTypeId.trim(),
                      year: Number(grantYear),
                      openingBalance: openingBalance.trim().length > 0 ? Number(openingBalance) : undefined,
                      grantAmount: Number(grantAmount),
                      reason: reason.trim()
                    });
                    setModalOpen(false);
                    list.refresh();
                  } catch {
                    // handled by hook
                  }
                }}
              >
                {grantMutation.status === 'loading' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
