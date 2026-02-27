import React, { useMemo } from 'react';

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return String(n);
}

export function ReimbursementForm({ value, onChange, disabled, errors }) {
  const v = value || {};
  const e = errors || {};

  const set = (patch) => onChange && onChange({ ...v, ...patch });

  const inputCls = useMemo(
    () =>
      `mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${
        disabled
          ? 'border-slate-200 text-slate-400'
          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
      }`,
    [disabled]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Claim Date</label>
          <input
            type="date"
            className={inputCls}
            value={v.claimDate || ''}
            disabled={disabled}
            onChange={(ev) => set({ claimDate: ev.target.value })}
          />
          {e.claimDate ? <p className="text-xs text-rose-600 mt-1">{e.claimDate}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">Amount</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={money(v.totalAmount)}
            disabled={disabled}
            onChange={(ev) => set({ totalAmount: ev.target.value })}
          />
          {e.totalAmount ? <p className="text-xs text-rose-600 mt-1">{e.totalAmount}</p> : null}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700">Title</label>
        <input
          type="text"
          className={inputCls}
          value={v.title || ''}
          disabled={disabled}
          onChange={(ev) => set({ title: ev.target.value })}
        />
        {e.title ? <p className="text-xs text-rose-600 mt-1">{e.title}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700">Description</label>
        <textarea
          rows={4}
          className={inputCls}
          value={v.description || ''}
          disabled={disabled}
          onChange={(ev) => set({ description: ev.target.value })}
        />
        {e.description ? <p className="text-xs text-rose-600 mt-1">{e.description}</p> : null}
      </div>
    </div>
  );
}
