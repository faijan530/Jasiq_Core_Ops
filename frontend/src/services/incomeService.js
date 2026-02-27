import { apiFetch, getApiBaseUrl, getAuthToken } from '../api/client.js';

function toIsoDateOnly(v) {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

export function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
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

export async function downloadIncomeDocument({ incomeId, docId, fileName }) {
  const path = `/api/v1/income/${incomeId}/documents/${docId}/download`;
  const { blob } = await fetchBlobWithAuth(path);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const incomeService = {
  listIncome({ page = 1, size = 20, status, divisionId, categoryId, clientId, from, to, search }) {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(size));
    if (status) p.set('status', String(status));
    if (divisionId) p.set('divisionId', String(divisionId));
    if (categoryId) p.set('categoryId', String(categoryId));
    if (clientId) p.set('clientId', String(clientId));
    if (from) p.set('from', toIsoDateOnly(from));
    if (to) p.set('to', toIsoDateOnly(to));
    if (search) p.set('search', String(search));
    return apiFetch(`/api/v1/income?${p.toString()}`);
  },

  getIncome(id) {
    return apiFetch(`/api/v1/income/${id}`);
  },

  createIncome(body) {
    return apiFetch('/api/v1/income', { method: 'POST', body });
  },

  updateIncome(id, body) {
    return apiFetch(`/api/v1/income/${id}`, { method: 'PATCH', body });
  },

  submitIncome(id) {
    return apiFetch(`/api/v1/income/${id}/submit`, { method: 'POST', body: {} });
  },

  approveIncome(id) {
    return apiFetch(`/api/v1/income/${id}/approve`, { method: 'POST', body: {} });
  },

  rejectIncome(id, reason) {
    return apiFetch(`/api/v1/income/${id}/reject`, { method: 'POST', body: { reason } });
  },

  markPaid(id, payment) {
    return apiFetch(`/api/v1/income/${id}/mark-paid`, { method: 'POST', body: payment });
  },

  listPayments(id) {
    return apiFetch(`/api/v1/income/${id}/payments`);
  },

  listDocuments(id) {
    return apiFetch(`/api/v1/income/${id}/documents`);
  },

  uploadDocument(id, body) {
    return apiFetch(`/api/v1/income/${id}/documents`, { method: 'POST', body });
  },

  listCategories() {
    return apiFetch('/api/v1/income/categories');
  },

  createCategory(body) {
    return apiFetch('/api/v1/income/categories', { method: 'POST', body });
  },

  updateCategory(id, body) {
    return apiFetch(`/api/v1/income/categories/${id}`, { method: 'PATCH', body });
  },

  listClients({ page = 1, size = 50, active, search } = {}) {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(size));
    if (active !== undefined) p.set('active', String(Boolean(active)));
    if (search) p.set('search', String(search));
    return apiFetch(`/api/v1/income/clients?${p.toString()}`);
  },

  createClient(body) {
    return apiFetch('/api/v1/income/clients', { method: 'POST', body });
  },

  updateClient(id, body) {
    return apiFetch(`/api/v1/income/clients/${id}`, { method: 'PATCH', body });
  }
};
