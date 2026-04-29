import { useCallback, useEffect, useState } from 'react';
import {
  fetchNoisySignals,
  fetchSignalQualityByRegime,
  fetchSignalQualityByDataQuality,
  fetchSignalQualityBySector,
  fetchSignalQualityByType,
  fetchSignalQualitySummary,
} from '../api/signalQualityLabService';
import type { NoisySignalItem, QualityFilters, QualityHorizon, QualityMetricGroup, QualitySummary, SignalTypePerformance } from '../types';

export function useSignalQualityLab(horizon: QualityHorizon, filters: QualityFilters = {}) {
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
      const [nextSummary, nextByType, nextBySector, nextByRegime, nextByDataQuality, nextNoisy] = await Promise.all([
        fetchSignalQualitySummary(horizon, filters),
        fetchSignalQualityByType(horizon, filters),
        fetchSignalQualityBySector(horizon, filters),
        fetchSignalQualityByRegime(horizon, filters),
        fetchSignalQualityByDataQuality(horizon, filters),
        fetchNoisySignals(horizon, filters),
      ]);
      setSummary(nextSummary);
      setByType(nextByType);
      setBySector(nextBySector);
      setByRegime(nextByRegime);
      setByDataQuality(nextByDataQuality);
      setNoisy(nextNoisy);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load signal quality');
    } finally {
      setLoading(false);
    }
  }, [horizon, filters.readinessStatus, filters.coverageStatus, filters.liquidityStatus, filters.onlySignalReady, filters.excludePoorQuality]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, byType, bySector, byRegime, byDataQuality, noisy, loading, error, reload };
}
