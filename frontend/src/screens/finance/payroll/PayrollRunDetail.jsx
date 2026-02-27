import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiFetch, getApiBaseUrl, getAuthToken } from '../../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/States.jsx';

import { formatCurrency, formatMonthLabel, getRunStatusStyle, isClosedStatus, isLockedOrAfter } from './utils.js';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function Button({ children, variant = 'secondary', disabled, onClick, type = 'button' }) {
  const base =
    'inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors';
  const styles = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant] || styles.secondary} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-inherit' : ''}`}
    >
      {children}
    </button>
  );
}

function ModalFrame({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function AdjustmentsPanel({ open, employee, items, disabled, onClose, onAdd }) {
  const [itemType, setItemType] = useState('ADJUSTMENT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const gross = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      if (!it.is_system_generated) return sum;
      const t = String(it.item_type || '').toUpperCase();
      if (t === 'BASE_PAY' || t === 'ALLOWANCE' || t === 'BONUS') return sum + Number(it.amount || 0);
      return sum;
    }, 0);
  }, [items]);

  const adjustments = useMemo(() => {
    return (items || []).filter((it) => !it.is_system_generated);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const n = Number(amount);
      if (!Number.isFinite(n) || n === 0) {
        setFormError('Amount must be a number and cannot be 0');
        return;
      }
      if (!String(reason || '').trim()) {
        setFormError('Reason is required');
        return;
      }

      await onAdd({ itemType, amount: n, reason: String(reason).trim() });
      setAmount('');
      setReason('');
    } catch (err) {
      setFormError(err?.message || 'Failed to add adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-xl">
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Adjustments</div>
            <div className="text-xs text-slate-600 mt-0.5">{employee?.name || 'Employee'}</div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-auto">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-600">Gross Pay</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">{formatCurrency(gross)}</div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900 mb-2">Existing adjustments</div>
            {adjustments.length === 0 ? (
              <div className="text-sm text-slate-600">No manual adjustments.</div>
            ) : (
              <div className="space-y-2">
                {adjustments.map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900 truncate">{a.description}</div>
                      <div className="text-sm text-slate-800">{formatCurrency(a.amount)}</div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{String(a.item_type || '').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900 mb-2">Add adjustment</div>
            {disabled ? (
              <div className="text-sm text-slate-600">Adjustments are disabled for this payroll status.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ALLOWANCE">Allowance</option>
                    <option value="BONUS">Bonus</option>
                    <option value="DEDUCTION">Deduction</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Required"
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" disabled={submitting} type="submit">
                    {submitting ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PayrollRunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [employeesById, setEmployeesById] = useState({});

  const [payslipsByEmployeeId, setPayslipsByEmployeeId] = useState({});
  const [downloadingEmployeeId, setDownloadingEmployeeId] = useState(null);

  const [generatingPayslips, setGeneratingPayslips] = useState(false);
  const [generatePayslipsError, setGeneratePayslipsError] = useState(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const [lockOpen, setLockOpen] = useState(false);
  const [lockConfirm, setLockConfirm] = useState('');
  const [locking, setLocking] = useState(false);

  const [paidOpen, setPaidOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [referenceId, setReferenceId] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidError, setPaidError] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setItemsLoading(true);
      setError(null);

      const [runRes, itemsRes] = await Promise.all([
        apiFetch(`/api/v1/payroll/runs/${runId}`),
        apiFetch(`/api/v1/payroll/runs/${runId}/items`)
      ]);

      const runItem = runRes?.item || null;
      const runItems = itemsRes?.items || [];

      const empMap = {};
      for (const it of runItems) {
        const empId = it.employee_id;
        if (!empId || empMap[empId]) continue;
        const name =
          it.employee_name ||
          it.employeeName ||
          `${it.first_name || ''} ${it.last_name || ''}`.trim() ||
          it.employee_code ||
          it.employeeCode ||
          empId;
        empMap[empId] = { id: empId, name };
      }

      setRun(runItem);
      setItems(runItems);
      setEmployeesById(empMap);

      try {
        const slipsRes = await apiFetch(`/api/v1/payroll/runs/${runId}/payslips`);
        const slips = slipsRes?.items || [];
        const map = {};
        for (const s of slips) {
          if (!s?.employee_id) continue;
          map[s.employee_id] = s;
        }
        setPayslipsByEmployeeId(map);
      } catch (e) {
        setPayslipsByEmployeeId({});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load payroll run');
    } finally {
      setLoading(false);
      setItemsLoading(false);
    }
  };

  const downloadPayslip = async (employeeId) => {
    const slip = payslipsByEmployeeId?.[employeeId] || null;
    if (!slip?.id) return;

    try {
      setDownloadingEmployeeId(employeeId);
      const token = getAuthToken();
      const res = await fetch(`${getApiBaseUrl()}/api/v1/payroll/payslips/${slip.id}/download`, {
        method: 'GET',
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slip.file_name || `payslip-${employeeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setDownloadingEmployeeId(null);
    }
  };

  const handleGeneratePayslips = async () => {
    if (!runId) return;
    try {
      setGeneratePayslipsError(null);
      setGeneratingPayslips(true);
      await apiFetch(`/api/v1/payroll/runs/${runId}/payslips/generate`, { method: 'POST' });
      await fetchAll();
    } catch (e) {
      setGeneratePayslipsError(e?.message || 'Failed to generate payslips');
    } finally {
      setGeneratingPayslips(false);
    }
  };

  useEffect(() => {
    if (!runId) return;
    fetchAll();
  }, [runId]);

  const status = String(run?.status || '').toUpperCase();
  const closed = isClosedStatus(status);
  const readOnly = isLockedOrAfter(status) || closed;

  const grouped = useMemo(() => {
    const byEmp = {};
    for (const it of items || []) {
      const empId = it.employee_id;
      if (!byEmp[empId]) byEmp[empId] = [];
      byEmp[empId].push(it);
    }

    const rows = Object.entries(byEmp).map(([employeeId, empItems]) => {
      let gross = 0;
      let deductions = 0;
      let adjustments = 0;
      for (const it of empItems) {
        const t = String(it.item_type || '').toUpperCase();
        const amt = Number(it.amount || 0);

        if (it.is_system_generated) {
          if (t === 'BASE_PAY' || t === 'ALLOWANCE' || t === 'BONUS') gross += amt;
          else if (t === 'DEDUCTION') deductions += amt;
          continue;
        }

        if (t === 'DEDUCTION') adjustments -= amt;
        else adjustments += amt;
      }

      const net = gross + adjustments - deductions;

      const divisionId = empItems.find((x) => x.division_id)?.division_id || null;
      const scope = divisionId ? 'DIVISION' : 'COMPANY';

      const divisionName =
        empItems.find((x) => x.division_name)?.division_name ||
        empItems.find((x) => x.divisionName)?.divisionName ||
        null;

      const employeeName =
        empItems.find((x) => x.employee_name)?.employee_name ||
        empItems.find((x) => x.employeeName)?.employeeName ||
        null;

      return {
        employeeId,
        employeeName,
        scope,
        divisionId,
        divisionName,
        gross,
        deductions,
        adjustments,
        net,
        status
      };
    });

    rows.sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId)));
    return rows;
  }, [items, status]);

  const selectedEmployee = selectedEmployeeId ? employeesById[selectedEmployeeId] : null;
  const selectedEmployeeItems = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return (items || []).filter((it) => it.employee_id === selectedEmployeeId);
  }, [items, selectedEmployeeId]);

  const lockDisabled = closed || status === 'LOCKED' || status === 'PAID' || status === 'CLOSED' || grouped.length === 0;

  if (itemsLoading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  const handleLock = async () => {
    try {
      setLocking(true);
      setError(null);

      if (status === 'DRAFT') {
        await apiFetch(`/api/v1/payroll/runs/${runId}/review`, { method: 'POST' });
      }

      await apiFetch(`/api/v1/payroll/runs/${runId}/lock`, { method: 'POST' });
      setLockOpen(false);
      setLockConfirm('');
      await fetchAll();
    } catch (e) {
      setError(e?.message || 'Failed to lock payroll');
    } finally {
      setLocking(false);
    }
  };

  const handleAddAdjustment = async ({ itemType, amount, reason }) => {
    if (!selectedEmployeeId) return;

    const desc =
      itemType === 'ALLOWANCE'
        ? 'Manual Allowance'
        : itemType === 'BONUS'
          ? 'Manual Bonus'
          : itemType === 'DEDUCTION'
            ? 'Manual Deduction'
            : 'Manual Adjustment';

    await apiFetch(`/api/v1/payroll/runs/${runId}/items`, {
      method: 'POST',
      body: {
        employeeId: selectedEmployeeId,
        itemType,
        description: desc,
        amount,
        reason
      }
    });

    await fetchAll();
  };

  const canMarkPaid = status === 'LOCKED' && !closed;

  const handleMarkPaidAll = async () => {
    try {
      setMarkingPaid(true);
      setPaidError(null);

      const paidAtIso = `${String(paidAt).slice(0, 10)}T00:00:00.000Z`;

      for (const row of grouped) {
        await apiFetch(`/api/v1/payroll/runs/${runId}/payments`, {
          method: 'POST',
          body: {
            employeeId: row.employeeId,
            paidAmount: Number(row.net || 0),
            paidAt: paidAtIso,
            method,
            referenceId: referenceId ? String(referenceId).trim() : ''
          }
        });
      }

      window.dispatchEvent(new Event('finance:refresh'));
      setPaidOpen(false);
      setReferenceId('');
      await fetchAll();
    } catch (err) {
      setPaidError(err?.message || 'Failed to mark payroll as paid');
      if (err?.status === 403) {
        setPaidError('You do not have the required permission (PAYROLL_MARK_PAID) to mark payroll as paid.');
      }
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-6">
        <EmptyState title="Payroll run not found" description="This payroll run does not exist." />
      </div>
    );
  }

  if ((items || []).length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Payroll — {formatMonthLabel(run.month)}</h1>
              <span className={cx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', getRunStatusStyle(run.status))}>
                {String(run.status || '-').toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 mt-1">Run ID: {run.id}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/finance/payroll')}>Back</Button>
          </div>
        </div>

        <EmptyState
          title="No eligible employees found for this month."
          description="Ensure compensation profiles are configured."
        />
      </div>
    );
  }

  return (
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Payroll — {formatMonthLabel(run.month)}</h1>
              <span
                className={cx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                  getRunStatusStyle(run.status)
                )}
              >
                {String(run.status || '-').toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 mt-1">Run ID: {run.id}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/finance/payroll')}>Back</Button>
            <Button variant="secondary" disabled={generatingPayslips} onClick={handleGeneratePayslips}>
              {generatingPayslips ? 'Generating Payslips…' : 'Generate Payslips'}
            </Button>
            <Button variant="primary" disabled={lockDisabled} onClick={() => setLockOpen(true)}>
              Lock Payroll
            </Button>
            <Button variant="secondary" disabled={!canMarkPaid} onClick={() => setPaidOpen(true)}>
              Mark as Paid
            </Button>
          </div>
        </div>

        {generatePayslipsError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {generatePayslipsError}
          </div>
        )}

        <div className={cx('bg-white border border-slate-200 rounded-lg overflow-hidden', selectedEmployeeId ? 'pr-0' : '')}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Adjustments</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Payslip</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {grouped.map((row) => {
                  const emp = employeesById[row.employeeId];
                  const resolvedDivisionName = row.scope === 'DIVISION' ? row.divisionName || row.divisionId : 'Company Overhead';
                  const isCompany = row.scope === 'COMPANY';
                  const employeeLabel = row.employeeName || emp?.name || row.employeeId;
                  return (
                    <tr
                      key={row.employeeId}
                      className={cx('hover:bg-slate-50 cursor-pointer', selectedEmployeeId === row.employeeId ? 'bg-blue-50/40' : '')}
                      onClick={() => setSelectedEmployeeId(row.employeeId)}
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{employeeLabel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{row.scope}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{resolvedDivisionName || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-slate-900">{formatCurrency(row.gross)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-slate-900">{formatCurrency(row.adjustments)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-slate-900">{formatCurrency(row.net)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{String(row.status || '-').toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {payslipsByEmployeeId?.[row.employeeId]?.id ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          disabled={downloadingEmployeeId === row.employeeId}
                          onClick={() => downloadPayslip(row.employeeId)}
                        >
                          {downloadingEmployeeId === row.employeeId ? 'Downloading…' : 'Download'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      <AdjustmentsPanel
        open={Boolean(selectedEmployeeId)}
        employee={selectedEmployee}
        items={selectedEmployeeItems}
        disabled={readOnly}
        onClose={() => setSelectedEmployeeId(null)}
        onAdd={handleAddAdjustment}
      />

      {lockOpen && (
        <ModalFrame title="Lock Payroll" onClose={() => setLockOpen(false)}>
          <div className="space-y-4">
            <div className="text-sm text-slate-700">
              Type <span className="font-semibold">LOCK PAYROLL {formatMonthLabel(run.month).toUpperCase()}</span> to confirm.
            </div>

            <input
              value={lockConfirm}
              onChange={(e) => setLockConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="LOCK PAYROLL ..."
            />

            <div className="flex justify-end gap-2">
              <Button onClick={() => setLockOpen(false)} disabled={locking}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={locking || lockConfirm.trim().toUpperCase() !== `LOCK PAYROLL ${formatMonthLabel(run.month).toUpperCase()}`}
                onClick={handleLock}
              >
                {locking ? 'Locking…' : 'Lock'}
              </Button>
            </div>
          </div>
        </ModalFrame>
      )}

      {paidOpen && (
        <ModalFrame title="Mark as Paid" onClose={() => setPaidOpen(false)}>
          <div className="space-y-4">
            {paidError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{paidError}</div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
                <input
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="text-sm text-slate-600">This will record payments for all employees in this run.</div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setPaidOpen(false)} disabled={markingPaid}>
                Cancel
              </Button>
              <Button variant="primary" disabled={markingPaid} onClick={handleMarkPaidAll}>
                {markingPaid ? 'Submitting…' : 'Mark Paid'}
              </Button>
            </div>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}
