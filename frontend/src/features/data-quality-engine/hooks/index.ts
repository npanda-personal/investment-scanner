import { useCallback, useEffect, useState } from 'react';
import { fetchDataQualityEvaluations, fetchDataQualityReviewReadiness, fetchDataQualitySummary } from '../api/dataQualityEngineService';
import type { DataQualityEvaluation, DataQualityFilters, DataQualityReviewReadinessSummary, DataQualitySummary } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export function useDataQualityEngine(filters: DataQualityFilters = {}) {
  const { scope } = useMarketScope();
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [reviewReadiness, setReviewReadiness] = useState<DataQualityReviewReadinessSummary | null>(null);
  const [items, setItems] = useState<DataQualityEvaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scopedFilters = { ...filters, region: scope.region, assetType: scope.assetType };
      const nextItems = await fetchDataQualityEvaluations(scopedFilters);
      setItems(nextItems.items);
      setTotal(nextItems.pagination.total);
      setLoading(false);

      void Promise.allSettled([
        fetchDataQualitySummary({ region: scope.region, assetType: scope.assetType }),
        fetchDataQualityReviewReadiness({ region: scope.region, assetType: scope.assetType }),
      ]).then(([summaryResult, reviewResult]) => {
        if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
        if (reviewResult.status === 'fulfilled') setReviewReadiness(reviewResult.value);
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data quality');
      setLoading(false);
    }
  }, [filters.search, filters.status, filters.readinessStatus, filters.liquidityStatus, filters.sector, filters.country, filters.eligibleForSignals, filters.eligibleForBacktesting, filters.minCoverageScore, filters.minReadinessScore, filters.limit, filters.offset, filters.sortBy, filters.sortOrder, scope.region, scope.assetType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, reviewReadiness, items, total, loading, error, reload };
}
