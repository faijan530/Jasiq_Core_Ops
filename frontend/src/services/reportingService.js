import { apiFetch, getApiBaseUrl, getAuthToken } from '../api/client.js';

function toIsoDateOnly(v) {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function buildReportParams({ from, to, divisionId, categoryId, groupBy, includePayroll } = {}) {
  const p = new URLSearchParams();
  if (from) p.set('from', toIsoDateOnly(from));
  if (to) p.set('to', toIsoDateOnly(to));
  if (divisionId) p.set('divisionId', String(divisionId));
  if (categoryId) p.set('categoryId', String(categoryId));
  if (groupBy) p.set('groupBy', String(groupBy));
  if (typeof includePayroll === 'boolean') p.set('includePayroll', includePayroll ? 'true' : 'false');
  return p;
}

async function fetchBlobWithAuth(path) {
  const token = getAuthToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(text || `Download failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { blob, contentType };
}

function downloadBlob({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'report.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const reportingService = {
  revenue(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/revenue?${p.toString()}`);
  },

  expense(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/expense?${p.toString()}`);
  },

  pnl(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/pnl?${p.toString()}`);
  },

  receivables(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/receivables?${p.toString()}`);
  },

  payables(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/payables?${p.toString()}`);
  },

  cashflow(filter) {
    const p = buildReportParams(filter);
    return apiFetch(`/api/v1/reports/cashflow?${p.toString()}`);
  },

  exportCsv({ reportType, filter }) {
    return apiFetch('/api/v1/reports/exports/csv', {
      method: 'POST',
      body: {
        reportType,
        filter: {
          ...filter,
          from: toIsoDateOnly(filter?.from),
          to: toIsoDateOnly(filter?.to)
        }
      }
    });
  },

  async downloadExport({ downloadUrl, fileName }) {
    const { blob } = await fetchBlobWithAuth(downloadUrl);
    downloadBlob({ blob, fileName });
  }
};
