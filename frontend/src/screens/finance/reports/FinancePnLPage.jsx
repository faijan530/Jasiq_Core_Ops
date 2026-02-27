import React, { useEffect, useMemo, useState } from 'react';

import { useBootstrap } from '../../../state/bootstrap.jsx';
import { apiFetch } from '../../../api/client.js';
import { reportingService } from '../../../services/reportingService.js';

import { ReportPageShell, SimpleRangeFilter, TableShell, canAccessPnlOnly, fmtMoney } from './_reportUi.jsx';

function formatMonthLabel(v, fallbackFrom) {
  const raw = String(v || '').trim();
  const base = raw || String(fallbackFrom || '').slice(0, 7);
  if (!base) return '—';
  const d = new Date(`${base}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return base;
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d);
}

function downloadTextFile({ content, fileName, mime = 'text/csv;charset=utf-8' }) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'report.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function openPrintPdf({ title, subtitle, columns, rows, fileName }) {
  const w = window.open('', '_blank');
  if (!w) return;

  const head = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fileName || title || 'Report')}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #0f172a; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .sub { color: #475569; font-size: 12px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; }
      th { background: #f8fafc; text-align: left; }
      td.num { text-align: right; }
      .footer { margin-top: 16px; color: #64748b; font-size: 11px; }
      @media print { body { padding: 0; } }
    </style>
  `;

  const thead = `<tr>${columns
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join('')}</tr>`;

  const tbody = rows
    .map((r) => {
      return `<tr>${columns
        .map((c) => {
          const value = c.renderText ? c.renderText(r) : r?.[c.key];
          const isNum = c.align === 'right';
          return `<td class="${isNum ? 'num' : ''}">${escapeHtml(value ?? '—')}</td>`;
        })
        .join('')}</tr>`;
    })
    .join('');

  w.document.open();
  w.document.write(`<!doctype html><html><head>${head}</head><body>`);
  w.document.write(`<h1>${escapeHtml(title || 'Report')}</h1>`);
  if (subtitle) w.document.write(`<p class="sub">${escapeHtml(subtitle)}</p>`);
  w.document.write(`<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`);
  w.document.write(`<div class="footer">Tip: In the print dialog choose “Save as PDF”.</div>`);
  w.document.write(`</body></html>`);
  w.document.close();

  w.focus();
  setTimeout(() => {
    w.print();
  }, 50);
}

export function FinancePnLPage({
  hideConsolidated = false,
  hideExport = false,
  forceDivisionOnly = false,
  initialDivisionId = null
} = {}) {
  const { bootstrap } = useBootstrap();
  const roles = bootstrap?.rbac?.roles || [];

  const [range, setRange] = useState(() => {
    const sp = new URLSearchParams(window.location.search || '');
    const qFrom = sp.get('from');
    const qTo = sp.get('to');
    if (qFrom && qTo) {
      return { from: qFrom, to: qTo };
    }
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { from: `${yyyy}-${mm}-01`, to: `${yyyy}-${mm}-28` };
  });

  const [divisionId, setDivisionId] = useState(initialDivisionId || '');
  const [view, setView] = useState('DIVISION');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadDivisions() {
      try {
        const res = await apiFetch('/api/v1/governance/divisions');
        if (!alive) return;
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        setDivisions(items);

        if (!forceDivisionOnly && !divisionId && items.length > 0) {
          // Keep empty as "All divisions"; don't auto-select.
        }
      } catch {
        if (!alive) return;
        setDivisions([]);
      }
    }

    loadDivisions();
    return () => {
      alive = false;
    };
  }, [divisionId, forceDivisionOnly]);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setStatus('loading');
        setError(null);

        const groupBy = view === 'CONSOLIDATED' ? 'CONSOLIDATED' : 'DIVISION';

        const payload = await reportingService.pnl({
          from: range.from,
          to: range.to,
          divisionId: groupBy === 'CONSOLIDATED' ? null : divisionId || null,
          groupBy,
          includePayroll: true
        });

        if (!alive) return;
        setData(payload);
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setStatus('ready');
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
  }, [range.from, range.to, divisionId, view]);

  const canAccess = canAccessPnlOnly(roles);

  const rows = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const base = items.map((r) => {
      const revenue = Number(r.revenue || 0);
      const expense = Number(r.expense || 0);
      const payroll = Number(r.payroll || 0);
      const profit = Number.isFinite(Number(r.profit)) ? Number(r.profit) : revenue - expense - payroll;
      return {
        month: r.month || null,
        division: r.division_name || r.divisionName || '—',
        revenue,
        expense,
        payroll,
        profit
      };
    });

    if (base.length === 0) {
      return [
        {
          month: range.from.slice(0, 7),
          division: '—',
          revenue: 0,
          expense: 0,
          payroll: 0,
          profit: 0
        }
      ];
    }

    if (forceDivisionOnly) return base;

    // If backend didn't consolidate, keep client-side consolidated view as a fallback.
    if (view === 'CONSOLIDATED' && base.length > 1) {
      const sum = base.reduce(
        (acc, r) => ({
          revenue: acc.revenue + r.revenue,
          expense: acc.expense + r.expense,
          payroll: acc.payroll + r.payroll,
          profit: acc.profit + r.profit
        }),
        { revenue: 0, expense: 0, payroll: 0, profit: 0 }
      );
      return [
        {
          month: range.from.slice(0, 7),
          division: 'All',
          revenue: sum.revenue,
          expense: sum.expense,
          payroll: sum.payroll,
          profit: sum.profit
        }
      ];
    }

    return base;
  }, [data, forceDivisionOnly, range.from, view]);

  async function onExport() {
    if (hideExport) return;
    try {
      setExporting(true);
      const monthLabel = formatMonthLabel(rows?.[0]?.month, range.from);

      openPrintPdf({
        title: 'Profit & Loss',
        subtitle: `Month: ${monthLabel} | From: ${range.from} | To: ${range.to}`,
        fileName: `pnl_${monthLabel.replace(' ', '_')}.pdf`,
        columns: [
          { key: 'month', label: 'Month', renderText: (r) => formatMonthLabel(r.month, range.from) },
          { key: 'division', label: 'Division', renderText: (r) => r.division || '—' },
          { key: 'revenue', label: 'Revenue', align: 'right', renderText: (r) => fmtMoney(r.revenue) },
          { key: 'expense', label: 'Expense', align: 'right', renderText: (r) => fmtMoney(r.expense) },
          { key: 'payroll', label: 'Payroll', align: 'right', renderText: (r) => fmtMoney(r.payroll) },
          {
            key: 'profit',
            label: 'Profit',
            align: 'right',
            renderText: (r) => {
              const p = Number.isFinite(Number(r.profit))
                ? Number(r.profit)
                : Number(r.revenue) - Number(r.expense) - Number(r.payroll);
              return fmtMoney(p);
            }
          }
        ],
        rows
      });
    } finally {
      setExporting(false);
    }
  }

  const filterUi = (
    <div className="space-y-4">
      <SimpleRangeFilter range={range} onChange={setRange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Division</label>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            disabled={forceDivisionOnly}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {!forceDivisionOnly ? <option value="">All divisions</option> : null}
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.code || d.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">View</label>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            disabled={hideConsolidated}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white disabled:bg-slate-50"
          >
            <option value="DIVISION">Division</option>
            {!hideConsolidated ? <option value="CONSOLIDATED">Consolidated</option> : null}
          </select>
        </div>

        <div className="flex items-end">
          {!hideExport ? (
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium"
            >
              {exporting ? 'Preparing…' : 'Export PDF'}
            </button>
          ) : (
            <div className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium text-center">Export hidden</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ReportPageShell
      title="Profit & Loss"
      subtitle={status === 'forbidden' ? (error?.message || 'Access denied') : 'P&L overview (live)'}
      status={status}
      canAccess={canAccess}
      filter={filterUi}
    >
      <TableShell
        title="P&L table"
        subtitle="Revenue - Expense - Payroll"
        columns={[
          { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month, range.from) },
          { key: 'division', label: 'Division' },
          { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtMoney(r.revenue) },
          { key: 'expense', label: 'Expense', align: 'right', render: (r) => fmtMoney(r.expense) },
          { key: 'payroll', label: 'Payroll', align: 'right', render: (r) => fmtMoney(r.payroll) },
          {
            key: 'profit',
            label: 'Profit',
            align: 'right',
            render: (r) => {
              const p = Number.isFinite(Number(r.profit))
                ? Number(r.profit)
                : Number(r.revenue) - Number(r.expense) - Number(r.payroll);
              const cls = p >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold';
              return <span className={cls}>{fmtMoney(p)}</span>;
            }
          }
        ]}
        rows={rows}
        rowKey={(r) => `${r.month}-${r.division}`}
      />
    </ReportPageShell>
  );
}
