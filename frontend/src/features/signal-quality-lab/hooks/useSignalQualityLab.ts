import { useCallback, useEffect, useState } from 'react';
import {
  fetchNoisySignals,
  fetchSignalQualityByRegime,
  fetchSignalQualityBySector,
  fetchSignalQualityByType,
  fetchSignalQualitySummary,
} from '../api/signalQualityLabService';
import type { NoisySignalItem, QualityHorizon, QualityMetricGroup, QualitySummary, SignalTypePerformance } from '../types';

export function useSignalQualityLab(horizon: QualityHorizon) {
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [byType, setByType] = useState<SignalTypePerformance[]>([]);
  const [bySector, setBySector] = useState<QualityMetricGroup[]>([]);
  const [byRegime, setByRegime] = useState<QualityMetricGroup[]>([]);
  const [noisy, setNoisy] = useState<NoisySignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextByType, nextBySector, nextByRegime, nextNoisy] = await Promise.all([
        fetchSignalQualitySummary(horizon),
        fetchSignalQualityByType(horizon),
        fetchSignalQualityBySector(horizon),
        fetchSignalQualityByRegime(horizon),
        fetchNoisySignals(horizon),
      ]);
      setSummary(nextSummary);
      setByType(nextByType);
      setBySector(nextBySector);
      setByRegime(nextByRegime);
      setNoisy(nextNoisy);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load signal quality');
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, byType, bySector, byRegime, noisy, loading, error, reload };
}
