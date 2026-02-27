import React, { useEffect, useMemo, useState } from 'react';

import { useBootstrap } from '../../../state/bootstrap.jsx';
import { reportingService } from '../../../services/reportingService.js';

import { ReportPageShell, SimpleRangeFilter, TableShell, canAccessFinanceReports, fmtMoney } from './_reportUi.jsx';

export function FinanceReceivablesPage() {
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
        const payload = await reportingService.receivables({
          from: range.from,
          to: range.to,
          groupBy: 'DIVISION'
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
      division: r.division_name || '—',
      due: Number(r.due_amount || 0),
      total: Number(r.total_amount || 0),
      received: Number(r.paid_amount || 0)
    }));
  }, [data]);

  const canAccess = canAccessFinanceReports(roles);

  return (
    <ReportPageShell
      title="Receivables"
      subtitle={status === 'forbidden' ? (error?.message || 'Access denied') : 'Outstanding customer payments (live)'}
      status={status}
      canAccess={canAccess}
      filter={<SimpleRangeFilter range={range} onChange={setRange} />}
    >
      <TableShell
        title="Receivables table"
        subtitle="Due amounts by division"
        columns={[
          { key: 'division', label: 'Division' },
          { key: 'total', label: 'Total', align: 'right', render: (r) => fmtMoney(r.total) },
          { key: 'received', label: 'Received', align: 'right', render: (r) => fmtMoney(r.received) },
          { key: 'due', label: 'Due', align: 'right', render: (r) => fmtMoney(r.due) }
        ]}
        rows={rows}
        rowKey={(r) => r.division}
      />
    </ReportPageShell>
  );
}
