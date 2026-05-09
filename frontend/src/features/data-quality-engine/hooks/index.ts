import { useCallback, useEffect, useState } from 'react';
import { fetchDataQualityEvaluations, fetchDataQualitySummary } from '../api/dataQualityEngineService';
import type { DataQualityEvaluation, DataQualityFilters, DataQualitySummary } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export function useDataQualityEngine(filters: DataQualityFilters = {}) {
  const { scope } = useMarketScope();
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [items, setItems] = useState<DataQualityEvaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextItems] = await Promise.all([
        fetchDataQualitySummary({ region: scope.region, assetType: scope.assetType }),
        fetchDataQualityEvaluations({ ...filters, region: scope.region, assetType: scope.assetType }),
      ]);
      setSummary(nextSummary);
      setItems(nextItems.items);
      setTotal(nextItems.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data quality');
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.readinessStatus, filters.liquidityStatus, filters.sector, filters.country, filters.eligibleForSignals, filters.eligibleForBacktesting, filters.minCoverageScore, filters.minReadinessScore, filters.limit, filters.offset, filters.sortBy, filters.sortOrder, scope.region, scope.assetType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, items, total, loading, error, reload };
}
