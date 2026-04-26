import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { ErrorState, LoadingState } from '../../components/States.jsx';
import { useBootstrap } from '../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function formatMonthLabel(monthIso) {
  if (!monthIso) return '-';
  const d = new Date(`${String(monthIso).slice(0, 7)}-01T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return String(monthIso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatCurrency(amount, bootstrap) {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const currency = bootstrap?.systemConfig?.CURRENCY?.value || 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(safe);
}

function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-800 border-slate-200',
    LOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-900 text-white border-slate-900'
  };

  return (
    <span className={cx('inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest', styles[s] || styles.DRAFT)}>
      {s || 'PENDING'}
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!userId) { setPayslips([]); return; }
        const res = await apiFetch('/api/v1/employees/me/payslips');
        setPayslips(Array.isArray(res) ? res : []);
      } catch (e) {
        if (e?.status === 403) setForbidden(true);
        else setError(e?.message || 'Failed to load payslips');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const downloadPayslip = async (payslipId) => {
    if (!payslipId) return;
    try {
      const token = localStorage.getItem('jasiq_token');
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/v1/payroll/payslips/${payslipId}/download`, {
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
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
      setError(e?.message || 'Failed to download payslip');
    }
  };

  if (loading) return <div className="p-8"><LoadingState message="Fetching payroll records..." /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Payroll History</h1>
            <p className="text-emerald-50 font-medium">View and download your monthly compensation statements.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Statements</div>
              <div className="text-2xl font-black">{payslips.length}</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-xl">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {forbidden ? (
        <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 text-center space-y-3">
          <div className="text-3xl">🔒</div>
          <h3 className="text-lg font-bold text-amber-900">Access Restricted</h3>
          <p className="text-amber-800 font-medium max-w-md mx-auto">You don't have permission to view payroll data. Please contact your HR administrator if you believe this is an error.</p>
        </div>
      ) : payslips.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300">
           <div className="p-6 bg-slate-50 rounded-full mb-4">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           </div>
           <h3 className="text-xl font-bold text-slate-900">No records found</h3>
           <p className="text-slate-500 font-medium mt-1">Your monthly payslips will appear here once finalized.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statement Month</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deductions</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Payable</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payslips.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{formatMonthLabel(s.month)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{formatCurrency(s.gross, bootstrap)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-rose-600">{formatCurrency(s.total_deductions, bootstrap)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg inline-block">{formatCurrency(s.net, bootstrap)}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(s.payment_status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => downloadPayslip(s.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold">Have questions about your pay?</h3>
            <p className="text-slate-400 font-medium">For any discrepancies in earnings or deductions, please reach out to the Payroll team.</p>
          </div>
          <button className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
            Raise Payroll Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
