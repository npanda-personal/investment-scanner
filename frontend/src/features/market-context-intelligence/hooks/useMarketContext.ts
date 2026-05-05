import { useCallback, useEffect, useState } from 'react';
import { fetchMarketContextSummary } from '../api/marketContextIntelligenceService';
import type { MarketContextSummary } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export function useMarketContext() {
  const { scope } = useMarketScope();
  const [summary, setSummary] = useState<MarketContextSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchMarketContextSummary({ region: scope.region }));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load market context');
    } finally {
      setLoading(false);
    }
  }, [scope.region]);
  useEffect(() => { void reload(); }, [reload]);
  return { summary, loading, error, reload };
}
