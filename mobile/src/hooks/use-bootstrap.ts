import { useEffect, useState } from 'react';
import { getDb } from '@/db/client';

export function useBootstrap() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getDb()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Bootstrap failed.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, error };
}
