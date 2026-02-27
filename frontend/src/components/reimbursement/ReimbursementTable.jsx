import React, { useMemo } from 'react';

import { Table } from '../Table.jsx';
import { StatusBadge } from './StatusBadge.jsx';

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function dt(v) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

export function ReimbursementTable({ rows, loading, empty, onRowClick, variant }) {
  const columns = useMemo(() => {
    if (variant === 'manager') {
      return [
        { key: 'employeeName', title: 'Employee', render: (v, r) => <span className="text-slate-900 font-medium">{v || '—'}</span> },
        { key: 'title', title: 'Title', render: (v) => <span className="text-slate-900 font-medium">{v || '—'}</span> },
        { key: 'totalAmount', title: 'Amount', render: (v) => <span className="text-slate-700">{money(v)}</span> },
        { key: 'scope', title: 'Scope', render: (v) => <span className="text-slate-700">{String(v || '—')}</span> },
        { key: 'submittedAt', title: 'Submitted', render: (v) => <span className="text-slate-700">{dt(v)}</span> },
        { key: 'receiptCount', title: 'Receipts', render: (v) => <span className="text-slate-700">{v ?? '—'}</span> },
        { key: 'status', title: 'Status', render: (v) => <StatusBadge status={v} /> }
      ];
    }

    // default (employee/finance/super-admin)
    return [
      { key: 'claimDate', title: 'Claim Date', render: (v) => <span className="text-slate-700">{dt(v)}</span> },
      { key: 'title', title: 'Title', render: (v) => <span className="text-slate-900 font-medium">{v || '—'}</span> },
      { key: 'totalAmount', title: 'Amount', render: (v) => <span className="text-slate-700">{money(v)}</span> },
      { key: 'status', title: 'Status', render: (v) => <StatusBadge status={v} /> },
      { key: 'dueAmount', title: 'Due', render: (v) => <span className="text-slate-700">{money(v)}</span> }
    ];
  }, [variant]);

  return <Table columns={columns} data={rows || []} loading={loading} empty={empty} onRowClick={onRowClick} />;
}
