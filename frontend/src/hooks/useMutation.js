import { useCallback, useState } from 'react';

export function useMutation(fn) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setStatus('loading');
      setError(null);
      try {
        const result = await fn(...args);
        setStatus('success');
        return result;
      } catch (err) {
        setError(err);
        setStatus('error');
        throw err;
      }
    },
    [fn]
  );

  return { status, error, run };
}
