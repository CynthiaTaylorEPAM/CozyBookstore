import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Fetches a list or record from the API and lets the page ask for a refresh. */
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!path) return;
    api<T>(path)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [path]);

  useEffect(reload, [reload]);

  return { data, error, reload };
}
