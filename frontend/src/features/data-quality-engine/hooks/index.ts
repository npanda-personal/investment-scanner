import { useCallback, useEffect, useState } from 'react';
import { fetchDataQualityEvaluations, fetchDataQualitySummary } from '../api/dataQualityEngineService';
import type { DataQualityEvaluation, DataQualityFilters, DataQualitySummary } from '../types';

export function useDataQualityEngine(filters: DataQualityFilters = {}) {
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [items, setItems] = useState<DataQualityEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextItems] = await Promise.all([
        fetchDataQualitySummary(),
        fetchDataQualityEvaluations(filters),
      ]);
      setSummary(nextSummary);
      setItems(nextItems);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data quality');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.readinessStatus, filters.liquidityStatus, filters.sector, filters.country]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, items, loading, error, reload };
}
