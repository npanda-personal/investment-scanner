import { useEffect, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchMarketIntelligenceSnapshot } from '../api/marketIntelligenceService';
import type { MarketIntelligenceSnapshot } from '../types';

export function useMarketIntelligenceSnapshot() {
  const { scope } = useMarketScope();
  const requestRef = useRef(0);
  const [snapshot, setSnapshot] = useState<MarketIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    fetchMarketIntelligenceSnapshot(scope)
      .then((next) => {
        if (requestRef.current === requestId) setSnapshot(next);
      })
      .catch((caught) => {
        if (requestRef.current !== requestId) return;
        const message = caught instanceof Error ? caught.message : 'Market intelligence snapshot unavailable.';
        setError(message);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
  }, [scope]);

  return { scope, snapshot, loading, error };
}
