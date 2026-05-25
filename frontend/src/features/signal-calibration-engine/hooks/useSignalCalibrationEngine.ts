import { useCallback, useEffect, useState } from 'react';
import { fetchCalibrationHealth, fetchCalibrationModel, fetchTopCalibratedSignals } from '../api/signalCalibrationEngineService';
import type { CalibrationModelInfo, PaginatedCalibrationResponse } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export interface CalibrationFilters {
  direction?: string;
  confidence?: string;
  calibrationConfidence?: string;
  evidenceStatus?: string;
  minAbsDelta?: number;
  hasDataGaps?: boolean;
}

export function useSignalCalibrationEngine() {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  
  const [data, setData] = useState<PaginatedCalibrationResponse>({
    items: [],
    totalCount: 0,
    limit: 25,
    offset: 0,
    hasMore: false,
    sortBy: 'calibratedScore',
    sortDirection: 'desc'
  });
  
  const [model, setModel] = useState<CalibrationModelInfo | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CalibrationFilters>({});
  const [horizon, setHorizon] = useState('20D');
  
  const loadModelAndHealth = useCallback(async () => {
    try {
      const [nextModel, nextHealth] = await Promise.all([
        fetchCalibrationModel(),
        fetchCalibrationHealth(),
      ]);
      setModel(nextModel);
      setHealth(nextHealth);
    } catch (err: any) {
      console.error('Failed to load calibration model or health', err);
    }
  }, []);

  const fetchTableData = useCallback(async (params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const nextFilters = params.filters !== undefined ? params.filters : filters;
      const nextSearch = params.search !== undefined ? params.search : search;
      const result = await fetchTopCalibratedSignals({
        region,
        assetType,
        horizon: params.horizon || horizon,
        search: nextSearch || undefined,
        limit: params.limit || data.limit,
        offset: params.offset ?? data.offset,
        sortBy: params.sortBy || data.sortBy,
        sortDirection: params.sortDirection || data.sortDirection,
        ...nextFilters
      });
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load signal calibration');
      setData((prev) => ({ ...prev, items: [], totalCount: 0 }));
    } finally {
      setLoading(false);
    }
  }, [region, assetType, horizon, search, data.limit, data.offset, data.sortBy, data.sortDirection, filters]);

  const reload = useCallback(() => {
    loadModelAndHealth();
    return fetchTableData({});
  }, [loadModelAndHealth, fetchTableData]);

  // Refetch when scope changes, reset pagination
  useEffect(() => {
    loadModelAndHealth();
    fetchTableData({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, assetType]);

  const setPagination = (limit: number, offset: number) => fetchTableData({ limit, offset });
  const setSorting = (sortBy: string, sortDirection: 'asc' | 'desc') => fetchTableData({ sortBy, sortDirection, offset: 0 });
  const applySearch = (term: string) => {
    setSearch(term);
    fetchTableData({ search: term, offset: 0 });
  };
  const applyFilters = (newFilters: CalibrationFilters) => {
    setFilters(newFilters);
    fetchTableData({ filters: newFilters, offset: 0 });
  };
  const resetFilters = () => {
    setSearch('');
    setFilters({});
    fetchTableData({ search: '', filters: {}, offset: 0 });
  };
  const changeHorizon = (nextHorizon: string) => {
    setHorizon(nextHorizon);
    fetchTableData({ horizon: nextHorizon, offset: 0 });
  };

  return { 
    data, 
    model, 
    health, 
    loading, 
    error, 
    reload,
    setPagination,
    setSorting,
    applySearch,
    applyFilters,
    resetFilters,
    changeHorizon,
    search,
    filters,
    horizon,
    scope,
  };
}
