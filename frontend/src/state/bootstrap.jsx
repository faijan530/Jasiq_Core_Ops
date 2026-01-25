import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, getAuthToken, setAuthToken } from '../api/client.js';

const BootstrapContext = createContext(null);

function normalizeBootstrap(payload) {
  const navigationItems = payload?.navigation?.items || [];

  const byPath = {};
  for (const item of navigationItems) {
    byPath[item.path] = item;
  }

  return {
    ...payload,
    navigation: {
      items: navigationItems,
      byPath
    }
  };
}

export function BootstrapProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState(null);

  const [token, setTokenState] = useState(getAuthToken());

  const refresh = useCallback(async () => {
    if (!token) {
      setBootstrap(null);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const payload = await apiFetch('/api/v1/app/bootstrap');
      setBootstrap(normalizeBootstrap(payload));
      setStatus('ready');
    } catch (err) {
      if (err.status === 401) {
        setAuthToken(null);
        setTokenState(null);
        setBootstrap(null);
        setStatus('idle');
        return;
      }

      setError(err);
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setToken = useCallback((next) => {
    setAuthToken(next);
    setTokenState(next || null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      bootstrap,
      error,
      refresh,
      setToken,
      token
    }),
    [status, bootstrap, error, refresh, setToken, token]
  );

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error('BootstrapProvider missing');
  return ctx;
}
