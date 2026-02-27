import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../../../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../../../components/States.jsx';
import { useBootstrap } from '../../../state/bootstrap.jsx';

import { getRunStatusStyle, isClosedStatus } from './utils.js';

function monthOptionValue(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function toMonthStartIso(monthYYYYMM) {
  const s = String(monthYYYYMM || '').trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  return `${s}-01`;
}

function addMonthsUtc(date, amount) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + amount, 1));
}

function getCurrentMonthKeyUtc() {
  const now = new Date();
  return monthOptionValue(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

function monthLabelUtc(monthKeyYYYYMM) {
  const s = String(monthKeyYYYYMM || '').trim();
  if (!/^[0-9]{4}-[0-9]{2}$/.test(s)) return s;
  const [y, m] = s.split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toRunMonthKey(runMonth) {
  const raw = String(runMonth || '').trim();
  if (!raw) return '';

  if (raw.includes('T')) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw.slice(0, 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  return raw.slice(0, 7);
}

function resolveAction(run) {
  if (!run) return { label: 'Generate', variant: 'primary', kind: 'generate' };
  const status = String(run.status || '').toUpperCase();
  if (!status) return { label: 'Generate', variant: 'primary', kind: 'generate' };
  if (status === 'DRAFT' || status === 'REVIEWED') return { label: 'Open', variant: 'secondary', kind: 'open' };
  if (status === 'LOCKED' || status === 'PAID' || status === 'CLOSED') return { label: 'View', variant: 'secondary', kind: 'view' };
  return { label: 'View', variant: 'secondary', kind: 'view' };
}

function Button({ children, variant = 'secondary', disabled, onClick }) {
  const base =
    'inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors';
  const styles = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant] || styles.secondary} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-inherit' : ''}`}
    >
      {children}
    </button>
  );
}

export function PayrollMonthList() {
  const { bootstrap } = useBootstrap();
  const navigate = useNavigate();
  const [activeMonthKey, setActiveMonthKey] = useState(() => getCurrentMonthKeyUtc());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listForbidden, setListForbidden] = useState(false);

  const permissions = bootstrap?.rbac?.permissions || [];
  const canReadRuns = permissions.includes('PAYROLL_RUN_READ');
  const canGenerate = permissions.includes('PAYROLL_GENERATE');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      setListForbidden(false);
      const res = await apiFetch('/api/v1/payroll/runs?page=1&pageSize=200');
      setItems(res?.items || []);
    } catch (e) {
      if (e?.status === 403) {
        setItems([]);
        setListForbidden(true);
        return;
      }
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canReadRuns) {
      setLoading(false);
      setItems([]);
      setListForbidden(true);
      return;
    }
    fetchRuns();
  }, []);

  useEffect(() => {
    const currentKey = getCurrentMonthKeyUtc();

    const currentRun = (items || []).find((r) => String(r.month || '').slice(0, 7) === currentKey) || null;
    if (currentRun && isClosedStatus(currentRun.status)) {
      const nextKey = monthOptionValue(addMonthsUtc(new Date(), 1));
      setActiveMonthKey(nextKey);
    } else {
      setActiveMonthKey(currentKey);
    }
  }, [items]);

  const activeRun = useMemo(() => {
    return (items || []).find((r) => toRunMonthKey(r.month) === String(activeMonthKey)) || null;
  }, [items, activeMonthKey]);

  const activeMonthClosed = isClosedStatus(activeRun?.status);

  const previousRuns = useMemo(() => {
    const activeKey = String(activeMonthKey || '');
    const prev = (items || [])
      .filter((r) => {
        const key = toRunMonthKey(r.month);
        return key && key < activeKey;
      })
      .sort((a, b) => String(toRunMonthKey(b.month) || '').localeCompare(String(toRunMonthKey(a.month) || '')));
    return prev;
  }, [items, activeMonthKey]);

  const handleGenerateForMonth = async (monthValue) => {
    if (!canGenerate) return;
    const mIso = toMonthStartIso(monthValue);
    if (!mIso) return;

    try {
      setBusy(true);
      setError(null);
      const created = await apiFetch('/api/v1/payroll/runs', {
        method: 'POST',
        body: { month: mIso }
      });
      const runId = created?.runId || created?.item?.id || created?.id;
      if (runId) {
        await apiFetch(`/api/v1/payroll/runs/${runId}/compute`, { method: 'POST' });
        navigate(`/finance/payroll/${runId}`);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const mIso = toMonthStartIso(activeMonthKey);
    if (!mIso) return;

    try {
      setBusy(true);
      setError(null);
      const created = await apiFetch('/api/v1/payroll/runs', {
        method: 'POST',
        body: { month: mIso }
      });
      const runId = created?.runId || created?.item?.id || created?.id;
      if (runId) {
        await apiFetch(`/api/v1/payroll/runs/${runId}/compute`, { method: 'POST' });
        navigate(`/finance/payroll/${runId}`);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenOrView = (run) => {
    if (!run?.id) return;
    navigate(`/finance/payroll/${run.id}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    const message =
      error?.payload?.error?.message ||
      error?.message ||
      'Failed to load payroll runs';
    return (
      <div className="p-6">
        <ErrorState error={{ ...error, message }} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-600 mt-1">Finance Payroll module.</p>
        </div>
      </div>

      <div className="mb-4 text-sm font-semibold text-slate-900">Active Payroll Month</div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payroll Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Finance Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(() => {
                const run = activeRun;
                const action = resolveAction(run);
                const status = run ? String(run.status || '').toUpperCase() : '';
                const financeStatus = status ? (status === 'DRAFT' ? 'Pending Draft' : status === 'REVIEWED' ? 'Under Review' : status) : '-';
                const canShowGenerate = action.kind === 'generate' && !activeMonthClosed;

                return (
                  <tr key={activeMonthKey} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{monthLabelUtc(activeMonthKey)}</div>
                      {run?.id && <div className="text-xs text-slate-500 mt-0.5">Run: {run.id}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRunStatusStyle(run.status)}`}>
                          {String(run.status || '-').toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">Not generated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-700">{financeStatus}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {canShowGenerate ? (
                        canGenerate ? (
                          <Button variant="primary" disabled={busy} onClick={handleGenerate}>
                            {busy ? 'Generating…' : 'Generate'}
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-500">No access</span>
                        )
                      ) : run?.id ? (
                        <Button variant="secondary" onClick={() => handleOpenOrView(run)}>
                          {action.label}
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 mb-4 text-sm font-semibold text-slate-900">Previous Payrolls</div>
      {listForbidden ? (
        <EmptyState title="Payroll runs are not accessible" description="You do not have permission to view payroll runs." />
      ) : previousRuns.length === 0 ? (
        <EmptyState title="No previous payrolls" description="No previous payroll runs found." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payroll Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Finance Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {previousRuns.map((run) => {
                  const key = toRunMonthKey(run.month);
                  const action = resolveAction(run);
                  const status = run ? String(run.status || '').toUpperCase() : '';
                  const financeStatus = status ? (status === 'DRAFT' ? 'Pending Draft' : status === 'REVIEWED' ? 'Under Review' : status) : '-';

                  return (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{monthLabelUtc(key)}</div>
                        {run?.id && <div className="text-xs text-slate-500 mt-0.5">Run: {run.id}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRunStatusStyle(run.status)}`}>
                          {String(run.status || '-').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-700">{financeStatus}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button variant="secondary" onClick={() => handleOpenOrView(run)}>
                          {action.label === 'Generate' ? 'Open' : action.label}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
