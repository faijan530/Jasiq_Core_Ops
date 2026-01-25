import React from 'react';

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-xl font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
