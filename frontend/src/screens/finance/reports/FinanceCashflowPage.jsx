import React, { useEffect, useMemo, useState } from 'react';

import { useBootstrap } from '../../../state/bootstrap.jsx';
import { reportingService } from '../../../services/reportingService.js';

import { ReportPageShell, SimpleRangeFilter, TableShell, canAccessFinanceReports, fmtMoney } from './_reportUi.jsx';

export function FinanceCashflowPage() {
  const { bootstrap } = useBootstrap();
  const roles = bootstrap?.rbac?.roles || [];

  const [range, setRange] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { from: `${yyyy}-${mm}-01`, to: `${yyyy}-${mm}-28` };
  });

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setStatus('loading');
        setError(null);
        const payload = await reportingService.cashflow({
          from: range.from,
          to: range.to,
          includePayroll: true
        });
        if (!alive) return;
        setData(payload);
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setStatus(items.length > 0 ? 'ready' : 'empty');
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

  const rows = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((r) => ({
      day: r.day,
      inflow: Number(r.inflow || 0),
      outflow: Number(r.outflow || 0)
    }));
  }, [data]);

  const canAccess = canAccessFinanceReports(roles);

  return (
    <ReportPageShell
      title="Cashflow"
      subtitle={status === 'forbidden' ? (error?.message || 'Access denied') : 'Cash inflow/outflow by day (live)'}
      status={status}
      canAccess={canAccess}
      filter={<SimpleRangeFilter range={range} onChange={setRange} />}
    >
      <TableShell
        title="Cashflow table"
        subtitle="Inflow - outflow"
        columns={[
          { key: 'day', label: 'Day' },
          { key: 'inflow', label: 'Inflow', align: 'right', render: (r) => fmtMoney(r.inflow) },
          { key: 'outflow', label: 'Outflow', align: 'right', render: (r) => fmtMoney(r.outflow) },
          {
            key: 'net',
            label: 'Net',
            align: 'right',
            render: (r) => {
              const net = Number(r.inflow) - Number(r.outflow);
              return fmtMoney(net);
            }
          }
        ]}
        rows={rows}
        rowKey={(r) => r.day}
      />
    </ReportPageShell>
  );
}
