import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../../components/States.jsx';
import { useBootstrap } from '../../state/bootstrap.jsx';

function formatMonthLabel(monthIso) {
  if (!monthIso) return '-';
  const d = new Date(`${String(monthIso).slice(0, 7)}-01T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return String(monthIso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatCurrency(amount) {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safe);
}

function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-800 border-slate-200',
    REVIEWED: 'bg-slate-100 text-slate-800 border-slate-200',
    LOCKED: 'bg-amber-100 text-amber-800 border-amber-200',
    PAID: 'bg-green-100 text-green-800 border-green-200',
    CLOSED: 'bg-slate-900 text-white border-slate-900'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[s] || styles.DRAFT}`}>
      {s || '-'}
    </span>
  );
}

export function EmployeeMyPayslipsPage() {
  const { bootstrap } = useBootstrap();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [forbidden, setForbidden] = useState(false);

  const userId = bootstrap?.user?.id || null;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setForbidden(false);

      if (!userId) {
        setPayslips([]);
        return;
      }

      const res = await apiFetch('/api/v1/employees/me/payslips');
      setPayslips(Array.isArray(res) ? res : []);
    } catch (e) {
      if (e?.status === 403) {
        setForbidden(true);
        setPayslips([]);
        return;
      }
      setError(e?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const downloadPayslip = async (payslipId) => {
    if (!payslipId) return;
    try {
      const token = localStorage.getItem('jasiq_token');
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

      const res = await fetch(`${apiBase}/api/v1/payroll/payslips/${payslipId}/download`, {
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const err = new Error(`Download failed (${res.status})`);
        err.status = res.status;
        throw err;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      if (e?.status === 403) {
        setForbidden(true);
        return;
      }
      setError(e?.message || 'Failed to download payslip');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Payslips</h1>
          <p className="text-slate-600 mt-1">View your payslips.</p>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Payslips</h1>
          <p className="text-slate-600 mt-1">View your payslips.</p>
        </div>
        <ErrorState error={error} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Payslips</h1>
          <p className="text-slate-600 mt-1">View your payslips.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="text-sm font-medium">You don’t have permission to view payslips.</div>
          <div className="text-xs text-amber-800 mt-1">Please contact HR/Payroll if you believe this is a mistake.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Payslips</h1>
        <p className="text-slate-600 mt-1">View your payslips.</p>
      </div>

      {payslips.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <div className="text-sm font-medium text-slate-900">No payslips available yet.</div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gross</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Download</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {payslips.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{formatMonthLabel(s.month)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatCurrency(s.gross)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatCurrency(s.total_deductions)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatCurrency(s.net)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(s.payment_status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => downloadPayslip(s.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
