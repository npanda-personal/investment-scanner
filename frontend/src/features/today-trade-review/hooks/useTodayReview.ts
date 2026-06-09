import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { todayTradeReviewApi } from '../api/todayTradeReviewApi';
import type { TodayReviewCandidate, TodayReviewResponse } from '../types';

export function useTodayReview() {
  const { scope } = useMarketScope();
  const [data, setData] = useState<TodayReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<TodayReviewResponse>('/api/v1/today-review/latest', {
        params: { region: scope.region, assetType: scope.assetType },
        signal: controller.signal,
        timeout: 20000,
      });
      setData(response.data);
    } catch (err: any) {
      if (!axios.isCancel(err)) setError(err.response?.data?.error || err.message || 'Failed to load Today review.');
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [scope.region, scope.assetType]);

  const runReview = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await todayTradeReviewApi.run({ region: scope.region, assetType: scope.assetType });
      setData(response);
      return response;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run Today review.');
      return null;
    } finally {
      setRunning(false);
    }
  }, [scope.region, scope.assetType]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    axios.get<TodayReviewResponse>('/api/v1/today-review/latest', {
      params: { region: scope.region, assetType: scope.assetType },
      timeout: 20000,
    })
      .then((response) => {
        if (!canceled) setData(response.data);
      })
      .catch((err: any) => {
        if (!canceled) setError(err.response?.data?.error || err.message || 'Failed to load Today review.');
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => { canceled = true; };
  }, [scope.region, scope.assetType]);

  return { data, loading, running, error, reload: load, runReview, scope };
}

export function useTodayReviewCandidate(candidateId?: string) {
  const [candidate, setCandidate] = useState<TodayReviewCandidate | null>(null);
  const [loading, setLoading] = useState(Boolean(candidateId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      setCandidate(await todayTradeReviewApi.candidate(candidateId));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load Today review candidate.');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { candidate, loading, error, reload: load };
}
