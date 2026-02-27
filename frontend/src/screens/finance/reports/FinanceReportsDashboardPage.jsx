import React, { useEffect, useMemo, useState } from 'react';

import { useBootstrap } from '../../../state/bootstrap.jsx';
import { LoadingState, EmptyState, ForbiddenState } from '../../../components/States.jsx';
import { reportingService } from '../../../services/reportingService.js';

function fmtMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function canAccessFinanceReports(roles) {
  const r = Array.isArray(roles) ? roles : [];
  return r.includes('SUPER_ADMIN') || r.includes('FINANCE_ADMIN') || r.includes('FINANCE_HEAD');
}

export function FinanceReportsDashboardPage() {
  const { bootstrap } = useBootstrap();
  const roles = bootstrap?.rbac?.roles || [];

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [range, setRange] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { from: `${yyyy}-${mm}-01`, to: `${yyyy}-${mm}-28` };
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setStatus('loading');
        setError(null);

        const filter = { from: range.from, to: range.to, groupBy: 'DIVISION' };

        const [rev, exp, pnl, cf] = await Promise.all([
          reportingService.revenue(filter),
          reportingService.expense(filter),
          reportingService.pnl({ ...filter, includePayroll: true }),
          reportingService.cashflow({ from: range.from, to: range.to, includePayroll: true })
        ]);

        if (!alive) return;
        setPayload({ rev, exp, pnl, cf });

        const hasAny =
          (Array.isArray(rev?.items) && rev.items.length > 0) ||
          (Array.isArray(exp?.items) && exp.items.length > 0) ||
          (Array.isArray(pnl?.items) && pnl.items.length > 0) ||
          (Array.isArray(cf?.items) && cf.items.length > 0);

        setStatus(hasAny ? 'ready' : 'empty');
      } catch (err) {
        if (!alive) return;
        setError(err);
        setStatus(err?.status === 403 ? 'forbidden' : 'empty');
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  const summaryCards = useMemo(() => {
    const revItems = Array.isArray(payload?.rev?.items) ? payload.rev.items : [];
    const expItems = Array.isArray(payload?.exp?.items) ? payload.exp.items : [];
    const pnlItems = Array.isArray(payload?.pnl?.items) ? payload.pnl.items : [];
    const cfItems = Array.isArray(payload?.cf?.items) ? payload.cf.items : [];

    const totalRevenue = revItems.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
    const totalExpense = expItems.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
    const totalProfit = pnlItems.reduce((acc, r) => acc + Number(r.profit || 0), 0);
    const totalCashIn = cfItems.reduce((acc, r) => acc + Number(r.inflow || 0), 0);

    return [
      { label: 'Revenue', value: totalRevenue },
      { label: 'Expense', value: totalExpense },
      { label: 'Net Profit', value: totalProfit },
      { label: 'Cash Inflow', value: totalCashIn }
    ];
  }, [payload]);

  const divisionRows = useMemo(() => {
    const pnlItems = Array.isArray(payload?.pnl?.items) ? payload.pnl.items : [];
    return pnlItems
      .filter((r) => r.division_name || r.division_id)
      .map((r) => ({
        division: r.division_name || '—',
        revenue: Number(r.revenue || 0),
        expense: Number(r.expense || 0),
        profit: Number(r.profit || 0)
      }));
  }, [payload]);

  if (!canAccessFinanceReports(roles)) {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: 'Access denied' }} />
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="p-6">
        <ForbiddenState error={{ message: error?.message || 'Access denied' }} />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="p-6">
        <LoadingState message="Loading reports dashboard…" />
      </div>
    );
  }

  const items = summaryCards;
  if (!items.length) {
    return (
      <div className="p-6">
        <EmptyState title="No report data" description="No dashboard metrics available for the selected range." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600 mt-1">Financial overview.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setRange((r) => ({ ...r }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-sm font-semibold text-slate-900">Division Profitability</div>
          <div className="text-xs text-slate-500 mt-1">Overview by division (live)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Expense</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {divisionRows.map((r) => (
                <tr key={r.division} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.division}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold text-right">{fmtMoney(r.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold text-right">{fmtMoney(r.expense)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700 font-bold text-right">{fmtMoney(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
