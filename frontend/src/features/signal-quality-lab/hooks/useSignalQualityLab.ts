import { useCallback, useEffect, useState } from 'react';
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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSignalQualityDashboard(horizon, filters, { region: scope.region, assetType: scope.assetType });
      setSummary(data.summary);
      setByType(data.byType);
      setBySector(data.bySector);
      setByRegime(data.byRegime);
      setByDataQuality(data.byDataQuality);
      setNoisy(data.noisy);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load signal quality');
    } finally {
      setLoading(false);
    }
  }, [horizon, filters.readinessStatus, filters.coverageStatus, filters.liquidityStatus, filters.onlySignalReady, filters.excludePoorQuality, scope.region, scope.assetType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, byType, bySector, byRegime, byDataQuality, noisy, loading, error, reload };
}
