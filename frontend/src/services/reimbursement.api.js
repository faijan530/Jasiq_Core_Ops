import { apiFetch, getApiBaseUrl, getAuthToken } from '../api/client.js';

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

function buildQuery(params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export const reimbursementApi = {
  getMyReimbursements(params = {}) {
    const { page = 1, pageSize = 20, status, month } = params;
    const q = buildQuery({ page, pageSize, status, month });
    return apiFetch(`/api/v1/reimbursements/my${q}`);
  },

  getAllReimbursements(params = {}) {
    const { page = 1, pageSize = 20, status, divisionId, month } = params;
    const q = buildQuery({ page, pageSize, status, divisionId, month });
    return apiFetch(`/api/v1/reimbursements${q}`);
  },

  createDraft(data) {
    return apiFetch('/api/v1/reimbursements/draft', { method: 'POST', body: data });
  },

  updateDraft(id, data) {
    return apiFetch(`/api/v1/reimbursements/${id}`, { method: 'PATCH', body: data });
  },

  submitReimbursement(id, body = {}) {
    return apiFetch(`/api/v1/reimbursements/${id}/submit`, { method: 'POST', body });
  },

  approveReimbursement(id, body = {}) {
    return apiFetch(`/api/v1/reimbursements/${id}/approve`, { method: 'POST', body });
  },

  rejectReimbursement(id, reason, body = {}) {
    return apiFetch(`/api/v1/reimbursements/${id}/reject`, {
      method: 'POST',
      body: { ...body, decisionReason: String(reason || '') }
    });
  },

  addReimbursementPayment(id, data) {
    return apiFetch(`/api/v1/reimbursements/${id}/payments`, { method: 'POST', body: data });
  },

  closeReimbursement(id, body = {}) {
    return apiFetch(`/api/v1/reimbursements/${id}/close`, { method: 'POST', body });
  },

  getReimbursementById(id) {
    return apiFetch(`/api/v1/reimbursements/${id}`);
  },

  async uploadReceipt(id, file, { monthCloseOverrideReason } = {}) {
    const fileName = file?.name || 'receipt';
    const contentType = file?.type || 'application/octet-stream';
    const fileBase64 = await toBase64(file);

    return apiFetch(`/api/v1/reimbursements/${id}/receipts`, {
      method: 'POST',
      body: {
        fileName,
        contentType,
        fileBase64,
        monthCloseOverrideReason: monthCloseOverrideReason || null
      }
    });
  },

  async downloadReceipt(id, receiptId, fileName) {
    const path = `/api/v1/reimbursements/${id}/receipts/${receiptId}/download`;
    const { blob } = await fetchBlobWithAuth(path);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'receipt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listReceipts(id) {
    return apiFetch(`/api/v1/reimbursements/${id}/receipts`);
  },

  listPayments(id, { page = 1, pageSize = 50 } = {}) {
    const q = buildQuery({ page, pageSize });
    return apiFetch(`/api/v1/reimbursements/${id}/payments${q}`);
  }
};
