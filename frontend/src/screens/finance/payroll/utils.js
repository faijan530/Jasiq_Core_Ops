export function formatMonthLabel(monthIso) {
  if (!monthIso) return '-';

  const raw = String(monthIso);

  // If backend returns a timestamp (e.g. 2026-01-31T18:30:00.000Z),
  // rely on the local timezone month so it reflects the intended payroll month.
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const m = raw.slice(0, 7);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(m)) return raw;

  const [y, mm] = m.split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, mm - 1, 1));
  if (Number.isNaN(d.getTime())) return raw;

  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function formatDateTime(dateIso) {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return String(dateIso);
  return d.toLocaleString();
}

export function formatCurrency(amount) {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safe);
}

export function computeInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'U';
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (a + b).toUpperCase();
}

export function getRunStatusStyle(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'DRAFT' || s === 'REVIEWED') return 'bg-slate-100 text-slate-800 border-slate-200';
  if (s === 'LOCKED') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s === 'PAID') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'CLOSED') return 'bg-slate-900 text-white border-slate-900';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

export function isClosedStatus(status) {
  return String(status || '').toUpperCase() === 'CLOSED';
}

export function isLockedOrAfter(status) {
  const s = String(status || '').toUpperCase();
  return s === 'LOCKED' || s === 'PAID' || s === 'CLOSED';
}
