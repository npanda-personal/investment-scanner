import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchSignalPositionLedgerClosedRows } from '../api/signalPositionLedgerApi';
import type { SignalPositionLedgerActiveListResponse } from '../types';

const DEFAULT_LIMIT = 25;

function emptyResponse(region: string, assetType: string, limit = DEFAULT_LIMIT, offset = 0): SignalPositionLedgerActiveListResponse {
  return {
    items: [],
    totalCount: 0,
    limit,
    offset,
    nextOffset: null,
    hasMore: false,
    scope: { region, assetType },
    refresh: {
      runId: null,
      status: 'IDLE',
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      materializedRowCount: 0,
      startedAt: null,
      completedAt: null,
      updatedAt: null,
      warnings: [],
      errors: [],
    },
    warnings: [],
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Closed signal-position data could not be loaded.';
}

export function useSignalPositionLedgerClosedRows() {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  const scopeKey = `${region}:${assetType}`;
  const [paging, setPaging] = useState({ scopeKey, limit: DEFAULT_LIMIT, offset: 0 });
  const [data, setData] = useState<SignalPositionLedgerActiveListResponse>(() => emptyResponse(region, assetType));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    const requestId = ++latestRequestRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const nextData = await fetchSignalPositionLedgerClosedRows({
        region,
        assetType,
        limit: paging.limit,
        offset: paging.offset,
      });
      if (requestId !== latestRequestRef.current) return;
      setData(nextData);
    } catch (caught) {
      if (requestId !== latestRequestRef.current) return;
      setError(toErrorMessage(caught));
      if (!silent) setData(emptyResponse(region, assetType, paging.limit, paging.offset));
    } finally {
      if (requestId !== latestRequestRef.current) return;
      if (!silent) setLoading(false);
    }
  }, [assetType, paging.limit, paging.offset, region]);

  useEffect(() => {
    setPaging((current) => (current.scopeKey === scopeKey ? current : { ...current, scopeKey, offset: 0 }));
    latestRequestRef.current += 1;
    setError(null);
    setLoading(true);
  }, [scopeKey]);

  useEffect(() => {
    if (paging.scopeKey !== scopeKey) return;
    void load();
  }, [load, paging.scopeKey, scopeKey]);

  const isCurrentScopeData = data.scope.region === region && data.scope.assetType === assetType;
  const scopedData = useMemo(
    () => (isCurrentScopeData ? data : emptyResponse(region, assetType, paging.limit, paging.offset)),
    [assetType, data, isCurrentScopeData, paging.limit, paging.offset, region],
  );

  const setPage = useCallback((page: number) => {
    setPaging((current) => ({
      ...current,
      offset: Math.max(0, page) * current.limit,
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPaging((current) => ({
      ...current,
      limit: pageSize,
      offset: 0,
    }));
  }, []);

  return {
    data: scopedData,
    loading: loading || !isCurrentScopeData,
    error: isCurrentScopeData ? error : null,
    page: Math.floor(paging.offset / paging.limit),
    pageSize: paging.limit,
    setPage,
    setPageSize,
    reload: () => void load(),
  };
}
