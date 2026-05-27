import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchSignalPositionLedgerActiveRows, refreshSignalPositionLedgerActiveRows } from '../api/signalPositionLedgerApi';
import type { SignalPositionLedgerActiveListResponse } from '../types';

const DEFAULT_LIMIT = 25;

type PagingState = {
  scopeKey: string;
  limit: number;
  offset: number;
};

type LoadRequest = {
  region: string;
  assetType: string;
  limit: number;
  offset: number;
  silent?: boolean;
};

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
  return 'Active signal-position data could not be loaded.';
}

export function useSignalPositionLedgerActiveRows() {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  const scopeKey = `${region}:${assetType}`;
  const [paging, setPaging] = useState<PagingState>(() => ({ scopeKey, limit: DEFAULT_LIMIT, offset: 0 }));
  const [data, setData] = useState<SignalPositionLedgerActiveListResponse>(() => emptyResponse(region, assetType));
  const [loading, setLoading] = useState(true);
  const [refreshingLedger, setRefreshingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const load = useCallback(async ({ region: requestRegion, assetType: requestAssetType, limit, offset, silent = false }: LoadRequest) => {
    const requestId = ++latestRequestRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const nextData = await fetchSignalPositionLedgerActiveRows({
        region: requestRegion,
        assetType: requestAssetType,
        limit,
        offset,
      });
      if (requestId !== latestRequestRef.current) return;
      setData(nextData);
    } catch (caught) {
      if (requestId !== latestRequestRef.current) return;
      setError(toErrorMessage(caught));
      if (!silent) setData(emptyResponse(requestRegion, requestAssetType, limit, offset));
    } finally {
      if (requestId !== latestRequestRef.current) return;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPaging((current) => (current.scopeKey === scopeKey ? current : { ...current, scopeKey, offset: 0 }));
    latestRequestRef.current += 1;
    setError(null);
    setLoading(true);
  }, [scopeKey]);

  useEffect(() => {
    if (paging.scopeKey !== scopeKey) return;
    void load({ region, assetType, limit: paging.limit, offset: paging.offset });
  }, [assetType, load, paging.limit, paging.offset, paging.scopeKey, region, scopeKey]);

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

  const reload = useCallback(() => {
    void load({ region, assetType, limit: paging.limit, offset: paging.offset });
  }, [assetType, load, paging.limit, paging.offset, region]);

  const refreshLedger = useCallback(async () => {
    setRefreshingLedger(true);
    setError(null);
    try {
      await refreshSignalPositionLedgerActiveRows({
        region,
        assetType,
        limit: paging.limit,
        offset: paging.offset,
      });
      await load({ region, assetType, limit: paging.limit, offset: paging.offset, silent: true });
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setRefreshingLedger(false);
    }
  }, [assetType, load, paging.limit, paging.offset, region]);

  useEffect(() => {
    if (scopedData.refresh.status !== 'RUNNING') return;
    const interval = window.setInterval(() => {
      void load({ region, assetType, limit: paging.limit, offset: paging.offset, silent: true });
    }, 2000);
    return () => window.clearInterval(interval);
  }, [assetType, load, paging.limit, paging.offset, region, scopedData.refresh.status]);

  return {
    data: scopedData,
    loading: loading || !isCurrentScopeData,
    refreshingLedger,
    error: isCurrentScopeData ? error : null,
    scope,
    page: Math.floor(paging.offset / paging.limit),
    pageSize: paging.limit,
    setPage,
    setPageSize,
    reload,
    refreshLedger,
  };
}
