const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem('jasiq_token');
}

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem('jasiq_token');
    return;
  }
  localStorage.setItem('jasiq_token', token);
}

async function parseErrorResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: { code: 'HTTP_ERROR', message: text || res.statusText } };
  }
}

export async function apiFetch(path, { method, body, headers } = {}) {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (res.ok) {
    if (!isJson) return null;
    return await res.json();
  }

  const errPayload = isJson ? await res.json().catch(() => null) : await parseErrorResponse(res);
  const err = new Error(errPayload?.error?.message || `Request failed (${res.status})`);
  err.status = res.status;
  err.payload = errPayload;
  throw err;
}
