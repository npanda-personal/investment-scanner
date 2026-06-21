import { useCallback, useEffect, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { todayTradeReviewApi } from '../api/todayTradeReviewApi';
import type { TodayReviewRun, TodayReviewRunsResponse } from '../types';

export function useTodayReviewRuns(params: { limit?: number; offset?: number } = {}) {
  const { scope } = useMarketScope();
  const [runs, setRuns] = useState<TodayReviewRun[]>([]);
  const [pagination, setPagination] = useState<TodayReviewRunsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await todayTradeReviewApi.runs({
        region: scope.region,
        assetType: scope.assetType,
        limit: params.limit,
        offset: params.offset,
      });
      setRuns(response.items);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load review history.');
    } finally {
      setLoading(false);
    }
  }, [scope.region, scope.assetType, params.limit, params.offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return { runs, loading, error, pagination, reload: load };
}
