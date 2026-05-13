import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSignalQualityDashboard } from '../api/signalQualityLabService';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { NoisySignalItem, QualityFilters, QualityHorizon, QualityMetricGroup, QualitySummary, SignalTypePerformance } from '../types';

export function useSignalQualityLab(horizon: QualityHorizon, filters: QualityFilters = {}) {
  const { scope } = useMarketScope();
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [byType, setByType] = useState<SignalTypePerformance[]>([]);
  const [bySector, setBySector] = useState<QualityMetricGroup[]>([]);
  const [byRegime, setByRegime] = useState<QualityMetricGroup[]>([]);
  const [byDataQuality, setByDataQuality] = useState<QualityMetricGroup[]>([]);
  const [noisy, setNoisy] = useState<NoisySignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSignalQualityDashboard(horizon, filters, { region: scope.region, assetType: scope.assetType }, { signal: controller.signal });
      if (requestIdRef.current !== requestId) return;
      setSummary(data.summary);
      setByType(data.byType);
      setBySector(data.bySector);
      setByRegime(data.byRegime);
      setByDataQuality(data.byDataQuality);
      setNoisy(data.noisy);
    } catch (err: any) {
      if (requestIdRef.current !== requestId || controller.signal.aborted) return;
      const timedOut = err.code === 'ECONNABORTED' || String(err.message || '').toLowerCase().includes('timeout');
      const canceled = axios.isCancel?.(err);
      if (!canceled) {
        setError(timedOut
          ? 'Signal Quality dashboard request timed out. Retry or reduce filters while the local dataset is checked.'
          : err.response?.data?.error || err.message || 'Failed to load Signal Quality dashboard');
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }, [horizon, filters.readinessStatus, filters.coverageStatus, filters.liquidityStatus, filters.modelVersion, filters.onlySignalReady, filters.excludePoorQuality, scope.region, scope.assetType]);

  useEffect(() => {
    void reload();
    return () => abortRef.current?.abort();
  }, [reload]);

  return { summary, byType, bySector, byRegime, byDataQuality, noisy, loading, error, reload };
}
