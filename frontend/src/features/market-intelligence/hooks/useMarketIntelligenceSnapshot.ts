import { useEffect, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { SnapshotEnvelope } from '../types';

export function useReadModelSnapshot<T>(loader: (scope: ReturnType<typeof useMarketScope>['scope']) => Promise<SnapshotEnvelope<T>>) {
  const { scope } = useMarketScope();
  const requestRef = useRef(0);
  const [data, setData] = useState<SnapshotEnvelope<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    loader(scope)
      .then((next) => {
        if (requestRef.current === requestId) setData(next);
      })
      .catch((caught) => {
        if (requestRef.current !== requestId) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : 'Read model snapshot unavailable.');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
  }, [loader, scope]);

  return { scope, data, loading, error };
}
