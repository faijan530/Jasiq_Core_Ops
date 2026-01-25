import React from 'react';

export function LoadingState({ label }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
      {label || 'Loading…'}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="text-sm font-medium text-slate-900">{title || 'No data'}</div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
    </div>
  );
}

export function ForbiddenState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="text-sm font-medium text-slate-900">Forbidden</div>
      <div className="mt-1 text-sm text-slate-600">You don’t have access to this screen.</div>
    </div>
  );
}

export function ErrorState({ error }) {
  const message = error?.payload?.error?.message || error?.message || 'Request failed';
  const requestId = error?.payload?.error?.requestId;

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
      <div className="text-sm font-medium text-rose-900">Error</div>
      <div className="mt-1 text-sm text-rose-800">{message}</div>
      {requestId ? <div className="mt-2 text-xs text-rose-700">requestId: {requestId}</div> : null}
    </div>
  );
}
