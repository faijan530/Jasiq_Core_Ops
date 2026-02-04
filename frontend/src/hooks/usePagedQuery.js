import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch, getAuthToken } from '../api/client.js';

export function usePagedQuery({ path, page, pageSize, enabled = true }) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [token, setToken] = useState(null);

  const refresh = useCallback(() => {
    setRefreshIndex((x) => x + 1);
  }, []);

  const url = useMemo(() => {
    const u = new URL(path, 'http://local');
    u.searchParams.set('page', String(page));
    u.searchParams.set('pageSize', String(pageSize));
    return u.pathname + u.search;
  }, [path, page, pageSize]);

  // Sync token from localStorage
  useEffect(() => {
    const t = localStorage.getItem('jasiq_token');
    setToken(t);
  }, [refreshIndex]);

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'jasiq_token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!token) return; // Don't fetch if no token

    let alive = true;

    async function run() {
      setStatus('loading');
      setError(null);
      try {
        const payload = await apiFetch(url);
        if (!alive) return;
        setData(payload);
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err);
        setStatus('error');
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [url, enabled, refreshIndex, getAuthToken()]);

  return { status, data, error, url, refresh };
}
