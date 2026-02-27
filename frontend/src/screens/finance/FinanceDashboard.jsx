import React, { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../api/client.js';
import { ErrorState, ForbiddenState, LoadingState } from '../../components/States.jsx';

function formatMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMonthLabel(month) {
  const s = String(month || '').trim();
  if (!s) return '—';
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  } catch {
    return s;
  }
}

function pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0%';
  return `${Math.round(v * 100)}%`;
}

function deltaLabel(curr, prev) {
  const c = Number(curr);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return { text: '—', tone: 'neutral' };
  if (p === 0) {
    if (c === 0) return { text: '0%', tone: 'neutral' };
    return { text: '+∞%', tone: 'up' };
  }
  const d = (c - p) / Math.abs(p);
  const t = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
  const sign = d > 0 ? '+' : '';
  return { text: `${sign}${Math.round(d * 100)}%`, tone: t };
}

function Sparkline({ points }) {
  const { d } = useMemo(() => {
    const w = 120;
    const h = 34;
    const pad = 2;
    const safe = Array.isArray(points) ? points : [];
    const vals = safe.map((p) => Number(p?.totalNet || 0));
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 0;
    const range = max - min || 1;
    const step = safe.length > 1 ? (w - pad * 2) / (safe.length - 1) : 0;
    const coords = safe.map((p, idx) => {
      const x = pad + idx * step;
      const v = Number(p?.totalNet || 0);
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return { x, y };
    });
    const path = coords
      .map((c, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
      })
      .join(' ');
    return { d: path };
  }, [points]);

  return (
    <svg viewBox="0 0 120 34" className="w-[120px] h-[34px]">
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="2.5" />
    </svg>
  );
}

function MiniTrendChart({ points }) {
  const { pathD, areaD, labels } = useMemo(() => {
    const w = 600;
    const h = 140;
    const padX = 12;
    const padY = 16;

    const safe = Array.isArray(points) ? points : [];
    const values = safe.map((p) => Number(p?.totalNet || 0));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const range = max - min || 1;

    const step = safe.length > 1 ? (w - padX * 2) / (safe.length - 1) : 0;

    const coords = safe.map((p, idx) => {
      const x = padX + idx * step;
      const v = Number(p?.totalNet || 0);
      const y = padY + (h - padY * 2) * (1 - (v - min) / range);
      return { x, y, v, month: String(p?.month || '') };
    });

    const d = coords
      .map((c, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
      })
      .join(' ');

    const area = coords.length
      ? `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${(h - padY).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(h - padY).toFixed(1)} Z`
      : '';

    const labelLeft = coords[0]?.month ? String(coords[0].month) : '';
    const labelRight = coords[coords.length - 1]?.month ? String(coords[coords.length - 1].month) : '';

    return { pathD: d, areaD: area, labels: { left: labelLeft, right: labelRight } };
  }, [points]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-900">Monthly Expense Trend</div>
        <div className="text-xs text-slate-500 mt-1">Last 6 months (net payroll)</div>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 600 140" className="w-full h-36">
          <defs>
            <linearGradient id="trendStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="600" height="140" fill="#ffffff" />
          {areaD ? <path d={areaD} fill="url(#trendFill)" /> : null}
          <path d={pathD} fill="none" stroke="url(#trendStroke)" strokeWidth="3" />
        </svg>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          <div>{labels.left}</div>
          <div>{labels.right}</div>
        </div>
      </div>
    </div>
  );
}

export function FinanceDashboard() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [expenseStats, setExpenseStats] = useState({ status: 'idle', error: null, submitted: 0, approved: 0, paid: 0 });

  async function load() {
    try {
      setStatus('loading');
      setError(null);
      const payload = await apiFetch('/api/v1/finance/dashboard');
      setData(payload);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  async function loadExpenseStats() {
    try {
      setExpenseStats((s) => ({ ...s, status: 'loading', error: null }));
      const [submitted, approved, paid] = await Promise.all([
        apiFetch('/api/v1/expenses?page=1&size=1&status=SUBMITTED'),
        apiFetch('/api/v1/expenses?page=1&size=1&status=APPROVED'),
        apiFetch('/api/v1/expenses?page=1&size=1&status=PAID')
      ]);
      setExpenseStats({
        status: 'ready',
        error: null,
        submitted: Number(submitted?.total || 0),
        approved: Number(approved?.total || 0),
        paid: Number(paid?.total || 0)
      });
    } catch (err) {
      setExpenseStats((s) => ({ ...s, status: 'error', error: err }));
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
      await loadExpenseStats();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onRefresh() {
      load();
      loadExpenseStats();
    }
    window.addEventListener('finance:refresh', onRefresh);
    return () => window.removeEventListener('finance:refresh', onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') return <LoadingState message="Loading dashboard…" />;

  if (status === 'error') {
    if (error?.status === 403) {
      return <ForbiddenState error={{ message: 'Forbidden', requiredPermission: 'FINANCE_REPORT_READ' }} />;
    }
    return <ErrorState error={error} onRetry={load} />;
  }

  const activeMonth = formatMonthLabel(data?.activePayrollMonth);
  const trend = Array.isArray(data?.monthlyExpenseTrend) ? data.monthlyExpenseTrend : [];

  const last = trend[trend.length - 1]?.totalNet ?? 0;
  const prev = trend.length >= 2 ? trend[trend.length - 2]?.totalNet ?? 0 : 0;
  const mom = deltaLabel(last, prev);
  const paidPct = (() => {
    const net = Number(data?.totalNet || 0);
    const paid = Number(data?.totalPaidThisMonth || 0);
    if (!Number.isFinite(net) || net <= 0) return 0;
    return Math.min(1, Math.max(0, paid / net));
  })();

  const insights = (() => {
    const points = Array.isArray(trend) ? trend : [];
    const vals = points.map((p) => Number(p?.totalNet || 0)).filter((v) => Number.isFinite(v));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const maxV = vals.length ? Math.max(...vals) : 0;
    const maxIdx = vals.length ? vals.indexOf(maxV) : -1;
    const maxMonth = maxIdx >= 0 ? String(points[maxIdx]?.month || '') : '';
    return { avg, maxV, maxMonth };
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Active payroll month: {activeMonth}</p>
        </div>
        <button
          onClick={() => {
            load();
            loadExpenseStats();
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Gross (Active Month)</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(data?.totalGross)}</div>
              <div className="text-xs text-slate-500 mt-1">Month: {activeMonth}</div>
            </div>
            <div className="pt-1">
              <Sparkline points={trend} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Net (Active Month)</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(data?.totalNet)}</div>
              <div className="mt-1 text-xs">
                <span
                  className={
                    mom.tone === 'up'
                      ? 'text-emerald-600 font-semibold'
                      : mom.tone === 'down'
                        ? 'text-rose-600 font-semibold'
                        : 'text-slate-500 font-semibold'
                  }
                >
                  {mom.text}
                </span>
                <span className="text-slate-500"> MoM</span>
              </div>
            </div>
            <div className="pt-1">
              <Sparkline points={trend} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employees Paid</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{Number(data?.totalEmployees || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">Paid amount this month: {formatMoney(data?.totalPaidThisMonth)}</div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Paid vs Net</span>
              <span className="font-semibold text-slate-800">{pct(paidPct)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                style={{ width: `${Math.round(paidPct * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending Payroll Runs</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{Number(data?.pendingPayrolls || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">Last month expense: {formatMoney(data?.lastMonthExpense)}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Expenses</div>
            <div className="text-xs text-slate-500 mt-1">Live counts from expense module</div>
          </div>
          <a
            href="/finance/expenses"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm"
          >
            View Expenses
          </a>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{expenseStats.status === 'ready' ? expenseStats.submitted : '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{expenseStats.status === 'ready' ? expenseStats.approved : '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{expenseStats.status === 'ready' ? expenseStats.paid : '—'}</div>
            </div>
          </div>

          {expenseStats.status === 'error' ? (
            <div className="mt-3 text-xs text-rose-700">{String(expenseStats.error?.message || expenseStats.error || 'Failed to load expenses')}</div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MiniTrendChart points={trend} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Smart Insights</div>
            <div className="text-xs text-slate-500 mt-1">Derived from last 6 months + active month totals</div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">6-Month Avg (Net)</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{formatMoney(insights.avg)}</div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Highest Month (Net)</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{formatMoney(insights.maxV)}</div>
                <div className="text-xs text-slate-500 mt-1">{insights.maxMonth || '—'}</div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current vs Prev Month</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{formatMoney(last)}</div>
                <div className="text-xs text-slate-500 mt-1">Prev: {formatMoney(prev)}</div>
              </div>
              <div
                className={
                  mom.tone === 'up'
                    ? 'px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold'
                    : mom.tone === 'down'
                      ? 'px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold'
                      : 'px-3 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold'
                }
              >
                {mom.text}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
