import { useState, useEffect, useCallback } from 'react';
import { fetchResearchOverview, type ResearchOverview } from '../api/researchHubApi';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export const useResearchOverview = () => {
  const { scope } = useMarketScope();
  const [data, setData] = useState<ResearchOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchResearchOverview({ region: scope.region, assetType: scope.assetType });
      setData(overview);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load research overview');
    } finally {
      setLoading(false);
    }
  }, [scope.region, scope.assetType]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};
