import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../api/client.js';

export function usePagedQuery({ path, page, pageSize, enabled = true }) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((x) => x + 1);
  }, []);

  const url = useMemo(() => {
    const u = new URL(path, 'http://local');
    u.searchParams.set('page', String(page));
    u.searchParams.set('pageSize', String(pageSize));
    return u.pathname + u.search;
  }, [path, page, pageSize]);

  useEffect(() => {
    if (!enabled) return;

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
  }, [url, enabled, refreshIndex]);

  return { status, data, error, url, refresh };
}
