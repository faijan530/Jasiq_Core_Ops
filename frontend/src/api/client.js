const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const inflightGetRequests = new Map();

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

async function tryRefreshToken() {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({})
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const token = data?.accessToken;
  if (!token) return null;
  setAuthToken(token);
  return token;
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

  async function doFetch(currentToken) {
    return fetch(`${API_BASE_URL}${path}`, {
      method: method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(currentToken ? { authorization: `Bearer ${currentToken}` } : {}),
        ...(headers || {})
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  const resolvedMethod = String(method || 'GET').toUpperCase();
  const canDedupe = resolvedMethod === 'GET' && !body;
  const requestKey = canDedupe
    ? JSON.stringify({
        m: resolvedMethod,
        u: `${API_BASE_URL}${path}`,
        h: {
          ...(token ? { authorization: 'Bearer **redacted**' } : {}),
          ...(headers || {})
        }
      })
    : null;

  const exec = async () => {
    let res = await doFetch(token);

    if (res.status === 204) return null;

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (res.ok) {
      if (!isJson) return null;
      return await res.json();
    }

    // Handle 401 Unauthorized
    if (res.status === 401) {
      const url = String(path || '');
      const isLoginEndpoint =
        url.includes('/api/v1/auth/admin/login') || url.includes('/api/v1/auth/employee/login');

      const isRefreshEndpoint = url.includes('/api/v1/auth/refresh');

      if (isLoginEndpoint) {
        const errPayload = isJson ? await res.json().catch(() => null) : await parseErrorResponse(res);
        const err = new Error(errPayload?.error?.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.payload = errPayload;
        throw err;
      }

      // Attempt refresh once (unless this was already a refresh request)
      if (!isRefreshEndpoint) {
        const nextToken = await tryRefreshToken();
        if (nextToken) {
          res = await doFetch(nextToken);

          if (res.status === 204) return null;

          const ct2 = res.headers.get('content-type') || '';
          const isJson2 = ct2.includes('application/json');
          if (res.ok) {
            if (!isJson2) return null;
            return await res.json();
          }
        }
      }

      // Refresh failed -> clear token and redirect to login
      setAuthToken(null);
      // Clear any stored bootstrap data
      localStorage.removeItem('jasiq_bootstrap');
      // Redirect to login page
      window.location.hash = '#/';
      window.location.reload();
      return null;
    }

    const errPayload = isJson ? await res.json().catch(() => null) : await parseErrorResponse(res);
    const err = new Error(errPayload?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = errPayload;
    throw err;
  };

  if (canDedupe) {
    const existing = inflightGetRequests.get(requestKey);
    if (existing) return await existing;

    const p = exec().finally(() => inflightGetRequests.delete(requestKey));
    inflightGetRequests.set(requestKey, p);
    return await p;
  }

  return await exec();
}
