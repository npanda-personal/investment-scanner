import { useCallback, useEffect, useState } from 'react';
import { todayTradeReviewApi } from '../api/todayTradeReviewApi';
import type { TodayReviewResponse } from '../types';

export function useTodayReviewRunById(runId?: string) {
  const [data, setData] = useState<TodayReviewResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(runId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await todayTradeReviewApi.runById(runId));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load review run.');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
