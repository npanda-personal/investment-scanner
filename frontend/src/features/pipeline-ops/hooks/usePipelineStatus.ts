import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPipelineStatus } from '../api/pipelineOpsService';
import type { PipelineStatusSnapshot } from '../types';

type UsePipelineStatusResult = {
  data: PipelineStatusSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);

export function usePipelineStatus(region: string, assetType: string): UsePipelineStatusResult {
  const [data, setData] = useState<PipelineStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasActiveWork = useMemo(() => {
    if (!data) return false;
    if (data.activeRun && ACTIVE_STATUSES.has(data.activeRun.status)) return true;
    return data.stages.some((stage) => stage.activeStage && ACTIVE_STATUSES.has(stage.activeStage.status));
  }, [data]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const snapshot = await fetchPipelineStatus({
        region,
        assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        limit: 100,
      });
      setData(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assetType, region]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => void load('refresh'), hasActiveWork ? 15_000 : 60_000);
    return () => window.clearInterval(interval);
  }, [hasActiveWork, load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load('refresh'),
  };
}
