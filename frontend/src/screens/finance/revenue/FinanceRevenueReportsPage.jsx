import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { incomeService } from '../../../services/incomeService.js';
import { ErrorState, ForbiddenState, LoadingState } from '../../../components/States.jsx';

function Card({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  );
}

export function FinanceRevenueReportsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await incomeService.listIncome({ page: 1, size: 200, status: '' });
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const totalRevenue = items.reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const paid = items.filter((x) => String(x.status || '').toUpperCase() === 'PAID').reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const outstanding = Math.max(0, totalRevenue - paid);

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthRevenue = items
      .filter((x) => String(x.incomeDate || '').slice(0, 7) === ym)
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);

    return { totalRevenue, paid, outstanding, thisMonthRevenue };
  }, [items]);

  function money(n) {
    const v = Number(n || 0);
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  }

  if (status === 'loading') return <LoadingState message="Loading reports…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'INCOME_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Revenue Reports</h2>
            <p className="text-sm text-slate-500 mt-1">Summary and trends (UI only).</p>
          </div>
          <Link
            to="/finance/revenue"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Total Revenue" value={money(totals.totalRevenue)} sub="All time" />
          <Card label="Paid" value={money(totals.paid)} sub="PAID status totals" />
          <Card label="Outstanding" value={money(totals.outstanding)} sub="Derived" />
          <Card label="This Month" value={money(totals.thisMonthRevenue)} sub="Current month" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-sm font-bold text-slate-900">Revenue Trend</div>
            <div className="mt-4 h-56 rounded-xl bg-white border border-dashed border-slate-300" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-sm font-bold text-slate-900">Paid vs Outstanding</div>
            <div className="mt-4 h-56 rounded-xl bg-white border border-dashed border-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
