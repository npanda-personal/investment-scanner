import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  cancelCatalogSyncRun,
  fetchCatalogSyncRunStatus,
  fetchInstruments,
  fetchMarketDataSchedulerStatus,
  fetchSourceFileImports,
  fetchExchangeHistoricalBackfillRun,
  importManualVerifiedFundamental,
  runExchangeHistoricalBackfill,
  resumeExchangeHistoricalBackfillRun,
  retryFailedExchangeHistoricalBackfillRun,
  cancelExchangeHistoricalBackfillRun,
  startCatalogSyncRun,
  type MarketDataCatalogSyncRunResponse,
  type MarketDataCatalogSyncRunStatus,
  type MarketDataSchedulerRegionStatus,
  type MarketDataSchedulerStatus,
  type MarketDataSourceFileImportRecord,
  type ExchangeHistoricalBackfillResponse,
  type V1Instrument,
} from '../api/marketDataFoundationService';
import MarketDataStatusPanel from './MarketDataStatusPanel';
import CatalogFilterControls from './CatalogFilterControls'; import MarketDataImportPanel from './MarketDataImportPanel';
import { DataTable, PageHeader, StatusBadge, statusColor, type DataTableColumn, type SortDirection } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { normalizeAssetTypeForMarketDataApi, normalizeMarketForApi } from '../api/marketScopeApi';
import { humanizeCode } from '@/shared/format/enumLabels';

const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();
const formatDateOnly = (date?: string | null) => date ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString() : 'No candle';
const dataThroughDate = (instrument: V1Instrument) => instrument.stored_data_through_date || instrument.latest_price_date || null;
const formatMarketCap = (value: number | null) => value === null ? 'N/A' : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const formatAssetType = (value: string) => value === 'EQUITY' ? 'STOCK' : value;
const formatCatalogSource = (value?: string | null) => {
  if (!value || value.toLowerCase() === 'database' || value === 'LEGACY_DATABASE') return 'Legacy/Database';
  if (value === 'LEGACY_NIFTY500') return 'Legacy NIFTY 500';
  return value;
};
const formatDisplaySymbol = (instrument: V1Instrument) =>
  (instrument.display_symbol || instrument.source_symbol || instrument.symbol).replace(/\.(NS|BO|BS)$/i, '');
const subtleCellText = {
  fontSize: 13,
  color: 'text.primary',
  whiteSpace: 'nowrap',
};

type CatalogTab = 'catalog' | 'import' | 'health';
type BackfillInputMode = 'DATE_RANGE' | 'YEAR';
type ManualFundamentalField = 'revenue' | 'eps' | 'netIncome' | 'peRatio' | 'marketCap';
type SourceFileImportSortBy = 'importedAt' | 'tradingDate';
type SourceFileImportSortDirection = 'asc' | 'desc';

const buildCandleStatusMessage = (status?: MarketDataSchedulerRegionStatus) => {
  if (!status) return '';
  if (status.candleSyncStatus === 'CURRENT') {
    return ` Latest completed candle ${status.latestCompletedTradingDate}; latest stored candle observed: ${status.latestStoredTradingDate}.`;
  }
  if (status.candleSyncStatus === 'MISSING_LATEST_COMPLETED') {
    return ` Latest completed candle ${status.latestCompletedTradingDate} is missing. Latest stored candle: ${status.latestStoredTradingDate || 'none'}.`;
  }
  if (status.candleSyncStatus === 'NO_STORED_CANDLES') {
    return ' No daily candles are stored yet for this market.';
  }
  if (status.candleSyncStatus === 'TODAY_STORED_PENDING_FINAL_CONFIRMATION') {
    return ` Today's candle ${status.todayTradingDate} is stored but still pending final confirmation.`;
  }
  return '';
};

const CATALOG_SYNC_DEFAULTS = {
  batchSize: 25,
  workerCount: 1,
  workerConcurrency: 2,
  delayBetweenBatchesMs: 3000,
  maxBatches: 20,
};

const activeCatalogSyncStatuses: MarketDataCatalogSyncRunStatus[] = ['PENDING', 'RUNNING'];
const terminalCatalogSyncStatuses: MarketDataCatalogSyncRunStatus[] = ['PARTIAL', 'COMPLETED', 'FAILED', 'CANCELED'];
const activeHistoricalBackfillStatuses = ['PENDING', 'RUNNING'];
const storedHistoricalBackfillStatuses = ['PENDING', 'RUNNING', 'BLOCKED', 'PARTIAL', 'FAILED'];
const historicalBackfillStorageKeyPrefix = 'market_data_historical_backfill_run';

const isCatalogSyncActive = (status?: MarketDataCatalogSyncRunStatus) => Boolean(status && activeCatalogSyncStatuses.includes(status));
const isCatalogSyncTerminal = (status?: MarketDataCatalogSyncRunStatus) => Boolean(status && terminalCatalogSyncStatuses.includes(status));
const isHistoricalBackfillActive = (status?: string | null) => Boolean(status && activeHistoricalBackfillStatuses.includes(status));
const shouldStoreHistoricalBackfillRun = (status?: string | null) => Boolean(status && storedHistoricalBackfillStatuses.includes(status));
const countValue = (value?: number) => value ?? 0;
const formatCount = (value?: number) => new Intl.NumberFormat().format(countValue(value));

const formatCatalogSyncSummary = (run: MarketDataCatalogSyncRunResponse) => {
  const scope = `${run.region}/${run.assetType}`;
  const processed = formatCount(run.processedCount);
  const total = run.totalCount !== undefined ? formatCount(run.totalCount) : 'unknown';
  const incomplete = run.status === 'PARTIAL' || run.hasMore || countValue(run.processedCount) < countValue(run.totalCount);
  const coverageNote = incomplete
    ? ' Universe coverage is incomplete; more eligible instruments remain.'
    : '';
  return `Catalog sync ${run.status} for ${scope}: processed ${processed} of ${total}, succeeded ${formatCount(run.succeededCount)}, failed ${formatCount(run.failedCount)}, skipped ${formatCount(run.skippedCount)}, no-op ${formatCount(run.noOpCount)}.${coverageNote}`;
};

const readStoredHistoricalBackfillRunId = (storageKey: string) => {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const storeHistoricalBackfillRunId = (storageKey: string, runId: string) => {
  try {
    window.localStorage.setItem(storageKey, runId);
  } catch {
    // Local storage may be unavailable in constrained browser contexts.
  }
};

const clearStoredHistoricalBackfillRunId = (storageKey: string) => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Local storage may be unavailable in constrained browser contexts.
  }
};

const MarketDataFoundationPage: React.FC = () => {
  const navigate = useNavigate();
  const { scope } = useMarketScope();
  const [instruments, setInstruments] = useState<V1Instrument[]>([]);
  const [activeTab, setActiveTab] = useState<CatalogTab>('catalog');
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [search, setSearch] = useState('');
  const [exchange, setExchange] = useState('');
  const [assetType, setAssetType] = useState('');
  const [instrumentSegment, setInstrumentSegment] = useState('');
  const [currency, setCurrency] = useState('');
  const [sector, setSector] = useState('');
  const [industry, setIndustry] = useState('');
  const [dataStatus, setDataStatus] = useState('');
  const [catalogSource, setCatalogSource] = useState('');
  const [derivativesEligible, setDerivativesEligible] = useState('');
  const [historicalBackfillInputMode, setHistoricalBackfillInputMode] = useState<BackfillInputMode>('DATE_RANGE');
  const [historicalStartDate, setHistoricalStartDate] = useState('');
  const [historicalEndDate, setHistoricalEndDate] = useState('');
  const defaultHistoricalBackfillYear = String(new Date().getFullYear() - 1);
  const [historicalBackfillStartYear, setHistoricalBackfillStartYear] = useState(defaultHistoricalBackfillYear);
  const [historicalBackfillEndYear, setHistoricalBackfillEndYear] = useState(defaultHistoricalBackfillYear);
  const [historicalBackfillRunning, setHistoricalBackfillRunning] = useState(false);
  const [historicalBackfillResult, setHistoricalBackfillResult] = useState<ExchangeHistoricalBackfillResponse | null>(null);
  const [manualFundamental, setManualFundamental] = useState({
    stockId: '',
    periodType: 'ANNUAL',
    periodEndDate: '',
    revenue: '',
    eps: '',
    netIncome: '',
    peRatio: '',
    marketCap: '',
    sourceNote: '',
    sourceUrl: '',
    validatedBy: '',
  });
  const [manualFundamentalRunning, setManualFundamentalRunning] = useState(false);
  const [sourceImports, setSourceImports] = useState<MarketDataSourceFileImportRecord[]>([]);
  const [sourceImportsLoading, setSourceImportsLoading] = useState(false);
  const [sourceImportsLoaded, setSourceImportsLoaded] = useState(false);
  const [sourceImportSortBy, setSourceImportSortBy] = useState<SourceFileImportSortBy>('importedAt');
  const [sourceImportSortDirection, setSourceImportSortDirection] = useState<SourceFileImportSortDirection>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [catalogSyncStarting, setCatalogSyncStarting] = useState(false);
  const [catalogSyncCanceling, setCatalogSyncCanceling] = useState(false);
  const [catalogSyncRun, setCatalogSyncRun] = useState<MarketDataCatalogSyncRunResponse | null>(null);
  const [catalogSyncError, setCatalogSyncError] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<MarketDataSchedulerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const previousHistoricalBackfillStatusRef = useRef<string | null>(null);
  const normalizedMarket = normalizeMarketForApi(scope.region);
  const latestSelectableBackfillDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const historicalBackfillYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 16 }, (_item, index) => String(currentYear - index));
  }, []);
  const selectedHistoricalBackfillRange = useMemo(() => {
    if (historicalBackfillInputMode === 'YEAR') {
      const startYear = Math.min(Number(historicalBackfillStartYear), Number(historicalBackfillEndYear));
      const endYear = Math.max(Number(historicalBackfillStartYear), Number(historicalBackfillEndYear));
      const yearEndDate = `${endYear}-12-31`;
      return {
        startDate: `${startYear}-01-01`,
        endDate: yearEndDate > latestSelectableBackfillDate ? latestSelectableBackfillDate : yearEndDate,
      };
    }
    return {
      startDate: historicalStartDate,
      endDate: historicalEndDate > latestSelectableBackfillDate ? latestSelectableBackfillDate : historicalEndDate,
    };
  }, [
    historicalBackfillEndYear,
    historicalBackfillInputMode,
    historicalBackfillStartYear,
    historicalEndDate,
    historicalStartDate,
    latestSelectableBackfillDate,
  ]);
  const historicalBackfillStorageKey = useMemo(() => {
    const region = normalizeMarketForApi(scope.region) || scope.region || 'GLOBAL';
    const storedAssetType = normalizeAssetTypeForMarketDataApi(assetType.trim() || scope.assetType) || 'STOCK';
    return `${historicalBackfillStorageKeyPrefix}:${region}:${storedAssetType}`;
  }, [assetType, scope.assetType, scope.region]);

  const handleHistoricalBackfillStartYearChange = (year: string) => {
    setHistoricalBackfillStartYear(year);
    if (Number(year) > Number(historicalBackfillEndYear)) {
      setHistoricalBackfillEndYear(year);
    }
  };

  const handleHistoricalBackfillEndYearChange = (year: string) => {
    setHistoricalBackfillEndYear(year);
    if (Number(year) < Number(historicalBackfillStartYear)) {
      setHistoricalBackfillStartYear(year);
    }
  };

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV) {
        console.debug('[MarketDataFoundation] scope', { region: scope.region, normalized: normalizedMarket || 'GLOBAL', assetType: scope.assetType });
      }
      // Catalog list is locked to the GLOBAL header scope (region + assetType). IN-stock
      // refinements are sent only for Indian equity; otherwise omitted so US/EU/crypto
      // never inherit India's filters.
      const scopeIsCrypto = String(scope.assetType || '').toUpperCase() === 'CRYPTO';
      const scopeIsIndiaEquity = String(scope.region || '').toUpperCase() === 'IN' && String(scope.assetType || '').toUpperCase() === 'STOCK';
      const response = await fetchInstruments({
        page: page + 1,
        pageSize,
        sortBy,
        sortOrder: sortDirection,
        region: scope.region,
        assetType: scope.assetType,
        exchange: scopeIsCrypto ? undefined : (exchange.trim() || undefined),
        instrumentSegment: scopeIsIndiaEquity ? (instrumentSegment.trim() || undefined) : undefined,
        currency: currency.trim() || undefined,
        sector: sector.trim() || undefined,
        industry: industry.trim() || undefined,
        dataStatus: dataStatus.trim() || undefined,
        catalogSource: scopeIsIndiaEquity ? (catalogSource.trim() || undefined) : undefined,
        derivativesEligible: scopeIsIndiaEquity && derivativesEligible !== '' ? derivativesEligible === 'true' : undefined,
        search: search.trim() || undefined,
      });
      setInstruments(response.instruments);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, [catalogSource, currency, dataStatus, derivativesEligible, exchange, industry, instrumentSegment, page, pageSize, search, sector, sortBy, sortDirection, scope.region, scope.assetType, normalizedMarket]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  const refreshBackgroundServices = useCallback(async () => {
    const [scheduler] = await Promise.all([
      fetchMarketDataSchedulerStatus({ region: scope.region, assetType: scope.assetType }).catch(() => undefined),
    ]);
    if (scheduler !== undefined) setSchedulerStatus(scheduler);
  }, [scope.region, scope.assetType]);

  const loadSourceImports = useCallback(async () => {
    setSourceImportsLoading(true);
    try {
      const result = await fetchSourceFileImports({
        region: scope.region,
        assetType: scope.assetType,
        limit: 10,
        sortBy: sourceImportSortBy,
        sortDirection: sourceImportSortDirection,
      });
      setSourceImports(result.imports.slice(0, 10));
    } catch {
      setSourceImports([]);
    } finally {
      setSourceImportsLoaded(true);
      setSourceImportsLoading(false);
    }
  }, [scope.region, scope.assetType, sourceImportSortBy, sourceImportSortDirection]);

  const handleSourceImportSortChange = useCallback((nextSortBy: SourceFileImportSortBy) => {
    if (sourceImportSortBy === nextSortBy) {
      setSourceImportSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSourceImportSortBy(nextSortBy);
    setSourceImportSortDirection('desc');
  }, [sourceImportSortBy]);

  const loadHistoricalBackfillRun = useCallback(async (runId: string) => {
    setHistoricalBackfillRunning(true);
    try {
      const result = await fetchExchangeHistoricalBackfillRun(runId);
      setHistoricalBackfillResult(result);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill status failed');
      return null;
    } finally {
      setHistoricalBackfillRunning(false);
    }
  }, []);

  useEffect(() => {
    const storedRunId = readStoredHistoricalBackfillRunId(historicalBackfillStorageKey);
    if (!storedRunId) return undefined;

    let canceled = false;
    setHistoricalBackfillRunning(true);
    fetchExchangeHistoricalBackfillRun(storedRunId)
      .then((result) => {
        if (canceled) return;
        if (shouldStoreHistoricalBackfillRun(result.status)) {
          setHistoricalBackfillResult(result);
          if (isHistoricalBackfillActive(result.status)) setActiveTab('import'); // only jump tabs for a genuinely in-progress backfill, not a stored terminal/partial run
        } else {
          clearStoredHistoricalBackfillRunId(historicalBackfillStorageKey);
        }
      })
      .catch((err: any) => {
        if (canceled) return;
        if (err.response?.status === 404) {
          clearStoredHistoricalBackfillRunId(historicalBackfillStorageKey);
          return;
        }
        setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill status restore failed');
      })
      .finally(() => {
        if (!canceled) setHistoricalBackfillRunning(false);
      });

    return () => {
      canceled = true;
    };
  }, [historicalBackfillStorageKey]);

  useEffect(() => {
    if (!historicalBackfillResult?.runId) return;
    if (shouldStoreHistoricalBackfillRun(historicalBackfillResult.status)) {
      storeHistoricalBackfillRunId(historicalBackfillStorageKey, historicalBackfillResult.runId);
    } else {
      clearStoredHistoricalBackfillRunId(historicalBackfillStorageKey);
    }
  }, [historicalBackfillResult?.runId, historicalBackfillResult?.status, historicalBackfillStorageKey]);

  useEffect(() => {
    void refreshBackgroundServices();
  }, [refreshBackgroundServices]);

  useEffect(() => {
    if (activeTab !== 'import') return undefined;
    void loadSourceImports();
    return undefined;
  }, [activeTab, loadSourceImports]);

  useEffect(() => {
    if (activeTab !== 'import' || !isHistoricalBackfillActive(historicalBackfillResult?.status)) return undefined;
    const interval = window.setInterval(() => {
      void loadSourceImports();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [activeTab, historicalBackfillResult?.status, loadSourceImports]);

  useEffect(() => {
    const previousStatus = previousHistoricalBackfillStatusRef.current;
    const currentStatus = historicalBackfillResult?.status || null;
    previousHistoricalBackfillStatusRef.current = currentStatus;
    if (
      activeTab === 'import'
      && previousStatus
      && isHistoricalBackfillActive(previousStatus)
      && currentStatus
      && !isHistoricalBackfillActive(currentStatus)
    ) {
      void loadSourceImports();
    }
  }, [activeTab, historicalBackfillResult?.status, loadSourceImports]);

  useEffect(() => {
    if (!historicalBackfillResult?.runId || !isHistoricalBackfillActive(historicalBackfillResult.status)) return undefined;
    const interval = window.setInterval(() => {
      void loadHistoricalBackfillRun(historicalBackfillResult.runId);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [historicalBackfillResult?.runId, historicalBackfillResult?.status, loadHistoricalBackfillRun]);

  useEffect(() => {
    // Reset page when global scope changes
    setPage(0);
  }, [scope.region, scope.assetType]);

  const refreshCatalogAfterTerminalSync = useCallback(async (run: MarketDataCatalogSyncRunResponse) => {
    const schedulerStatus = await fetchMarketDataSchedulerStatus({ region: run.region || scope.region, assetType: scope.assetType }).catch(() => null);
    const regionStatus = schedulerStatus?.regionStatuses.find((item) => item.region === run.region || item.region === normalizedMarket);
    const candleStatusMessage = buildCandleStatusMessage(regionStatus);
    const summary = `${formatCatalogSyncSummary(run)}${candleStatusMessage}`;
    if (run.status === 'FAILED') {
      setError(run.message ? `${summary} ${run.message}` : summary);
    } else {
      setSuccess(run.message ? `${summary} ${run.message}` : summary);
    }
    await loadInstruments();
  }, [loadInstruments, normalizedMarket, scope.region, scope.assetType]);

  const buildCatalogSyncRequest = (run?: MarketDataCatalogSyncRunResponse | null) => ({
    ...CATALOG_SYNC_DEFAULTS,
    region: run?.region || normalizeMarketForApi(scope.region) || 'GLOBAL',
    assetType: run?.assetType || normalizeAssetTypeForMarketDataApi(assetType.trim() || scope.assetType) || 'STOCK',
  });

  const handleCatalogSync = async (runToContinue?: MarketDataCatalogSyncRunResponse | null) => {
    if (operatorBackgroundActive && !catalogSyncActive) {
      setError('A background market-data load is already running. Wait for it to finish before starting catalog sync.');
      return;
    }
    const request = buildCatalogSyncRequest(runToContinue);
    setCatalogSyncStarting(true);
    setCatalogSyncError(null);
    setError(null);
    setSuccess(null);
    setCatalogSyncRun({
      success: true,
      runId: 'starting',
      status: 'PENDING',
      message: 'Starting catalog sync run.',
      region: request.region,
      assetType: request.assetType,
      scopeType: 'CATALOG',
      processedCount: 0,
      totalCount: runToContinue?.totalCount,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      noOpCount: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      warningCount: 0,
      hasMore: runToContinue?.hasMore ?? true,
      ...CATALOG_SYNC_DEFAULTS,
    });
    try {
      const result = await startCatalogSyncRun(request);
      if (!result.success) {
        setError(result.message || 'Catalog sync failed');
      } else {
        const nextRun = { ...request, ...result };
        setCatalogSyncRun(nextRun);
        if (result.alreadyRunning && result.message) {
          setCatalogSyncError(result.message);
        }
        if (isCatalogSyncTerminal(result.status)) {
          await refreshCatalogAfterTerminalSync(nextRun);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog sync failed');
    } finally {
      setCatalogSyncStarting(false);
    }
  };

  const handleCancelCatalogSync = async () => {
    if (!catalogSyncRun?.runId || catalogSyncRun.runId === 'starting') return;
    setCatalogSyncCanceling(true);
    setCatalogSyncError(null);
    try {
      const result = await cancelCatalogSyncRun(catalogSyncRun.runId);
      const nextRun = { ...catalogSyncRun, ...result };
      setCatalogSyncRun(nextRun);
      if (isCatalogSyncTerminal(nextRun.status)) {
        await refreshCatalogAfterTerminalSync(nextRun);
      }
    } catch (err: any) {
      setCatalogSyncError(err.response?.data?.message || err.message || 'Cancel catalog sync failed');
    } finally {
      setCatalogSyncCanceling(false);
    }
  };

  useEffect(() => {
    if (catalogSyncStarting || !catalogSyncRun?.runId || catalogSyncRun.runId === 'starting' || !isCatalogSyncActive(catalogSyncRun.status)) return;
    let canceled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await fetchCatalogSyncRunStatus(catalogSyncRun.runId);
        if (canceled) return;
        const nextRun = { ...catalogSyncRun, ...result };
        setCatalogSyncRun(nextRun);
        setCatalogSyncError(null);
        if (isCatalogSyncTerminal(nextRun.status)) {
          await refreshCatalogAfterTerminalSync(nextRun);
        }
      } catch (err: any) {
        if (canceled) return;
        const responseData = err.response?.data;
        const message = responseData?.code === 'RUN_NOT_FOUND'
          ? responseData.message || 'Catalog sync run state was lost. It may have expired or the server restarted.'
          : err.message || 'Unable to load catalog sync status';
        setCatalogSyncError(message);
        setCatalogSyncRun((current) => current ? { ...current, status: 'FAILED', message } : current);
      }
    }, 1500);
    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [catalogSyncRun, catalogSyncStarting, refreshCatalogAfterTerminalSync]);

  const handleHistoricalBackfill = async () => {
    if (!selectedHistoricalBackfillRange.startDate || !selectedHistoricalBackfillRange.endDate) {
      setError('Historical exchange backfill requires start and end dates.');
      return;
    }
    setHistoricalBackfillRunning(true);
    setHistoricalBackfillResult(null);
    setError(null);
    setSuccess(null);
    try {
      const result = await runExchangeHistoricalBackfill({
        region: scope.region,
        assetType: assetType.trim() || scope.assetType || 'STOCK',
        startDate: selectedHistoricalBackfillRange.startDate,
        endDate: selectedHistoricalBackfillRange.endDate,
        includeBseFill: true,
      });
      setHistoricalBackfillResult(result);
      setSuccess(`Historical exchange backfill ${result.status}: ${formatCount(result.totalDates)} dates queued with ${formatCount(result.workerCount)} parallel workers.`);
      await loadInstruments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill failed');
    } finally {
      setHistoricalBackfillRunning(false);
    }
  };

  const handleResumeHistoricalBackfill = async () => {
    if (!historicalBackfillResult) return;
    setHistoricalBackfillRunning(true);
    setError(null);
    try {
      const result = await resumeExchangeHistoricalBackfillRun(historicalBackfillResult.runId);
      setHistoricalBackfillResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill resume failed');
    } finally {
      setHistoricalBackfillRunning(false);
    }
  };

  const handleRetryHistoricalBackfill = async () => {
    if (!historicalBackfillResult) return;
    setHistoricalBackfillRunning(true);
    setError(null);
    try {
      const result = await retryFailedExchangeHistoricalBackfillRun(historicalBackfillResult.runId);
      setHistoricalBackfillResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill retry failed');
    } finally {
      setHistoricalBackfillRunning(false);
    }
  };

  const handleCancelHistoricalBackfill = async () => {
    if (!historicalBackfillResult) return;
    setHistoricalBackfillRunning(true);
    setError(null);
    try {
      const result = await cancelExchangeHistoricalBackfillRun(historicalBackfillResult.runId);
      setHistoricalBackfillResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Historical exchange backfill cancel failed');
    } finally {
      setHistoricalBackfillRunning(false);
    }
  };

  const updateManualFundamentalField = (field: keyof typeof manualFundamental, value: string) => {
    setManualFundamental((current) => ({ ...current, [field]: value }));
  };

  const numericManualFundamental = (field: ManualFundamentalField) => {
    const value = manualFundamental[field].trim();
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleManualFundamentalImport = async () => {
    if (!manualFundamental.stockId.trim() || !manualFundamental.periodEndDate.trim()) {
      setError('Manual verified fundamentals require stock id and period end date.');
      return;
    }
    setManualFundamentalRunning(true);
    setError(null);
    setSuccess(null);
    try {
      await importManualVerifiedFundamental({
        stockId: manualFundamental.stockId.trim(),
        region: scope.region,
        assetType: assetType.trim() || scope.assetType || 'STOCK',
        periodType: manualFundamental.periodType.trim() || 'ANNUAL',
        periodEndDate: manualFundamental.periodEndDate,
        revenue: numericManualFundamental('revenue'),
        eps: numericManualFundamental('eps'),
        netIncome: numericManualFundamental('netIncome'),
        peRatio: numericManualFundamental('peRatio'),
        marketCap: numericManualFundamental('marketCap'),
        sourceNote: manualFundamental.sourceNote.trim() || null,
        sourceUrl: manualFundamental.sourceUrl.trim() || null,
        validatedBy: manualFundamental.validatedBy.trim() || null,
        validatedAt: new Date().toISOString(),
      });
      setSuccess('Manual verified fundamentals imported.');
      setManualFundamental((current) => ({
        ...current,
        revenue: '',
        eps: '',
        netIncome: '',
        peRatio: '',
        marketCap: '',
      }));
      await loadInstruments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Manual verified fundamentals import failed');
    } finally {
      setManualFundamentalRunning(false);
    }
  };

  const scopeAssetType = String(scope.assetType || '').toUpperCase();
  const scopeRegionUpper = String(scope.region || '').toUpperCase();
  const isCryptoScope = scopeAssetType === 'CRYPTO';
  const isIndiaEquity = scopeRegionUpper === 'IN' && scopeAssetType === 'STOCK';
  const hasExchangeFiles = scopeRegionUpper === 'IN';
  const showIsinColumn = !isCryptoScope;
  const columns: DataTableColumn<V1Instrument>[] = [
    {
      id: 'symbol', label: 'Symbol', sortable: true,
      render: (instrument) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={instrument.symbol !== formatDisplaySymbol(instrument) ? `Stored symbol: ${instrument.symbol}` : ''} arrow><Typography fontWeight={700} fontSize={13}>{formatDisplaySymbol(instrument)}</Typography></Tooltip>
          {instrument.catalog_source === 'NSE_SME_EQUITY_SECURITIES' && (
            <Tooltip title="NSE SME segment" arrow><Chip size="small" label="SME" color="warning" sx={{ height: 18, fontSize: 11, fontWeight: 700, cursor: 'default' }} /></Tooltip>
          )}
        </Stack>
      ),
    },
    { id: 'name', label: 'Company', sortable: true, render: (instrument) => instrument.company_name },
    ...(showIsinColumn ? [{ id: 'isin', label: 'ISIN', render: (instrument: V1Instrument) => (
      <Typography sx={{ ...subtleCellText, fontFamily: 'monospace', fontSize: 12 }}>{instrument.isin || '—'}</Typography>
    ) } as DataTableColumn<V1Instrument>] : []),
    { id: 'exchange', label: 'Exchange', sortable: true, render: (instrument) => <Typography sx={subtleCellText}>{instrument.exchange || 'UNKNOWN'}</Typography> },
    { id: 'assetType', label: 'Asset Type', sortable: true, render: (instrument) => <Typography sx={subtleCellText}>{formatAssetType(instrument.asset_type)}</Typography> },
    { id: 'instrumentSegment', label: 'Segment/Class', render: (instrument) => <Typography sx={subtleCellText}>{instrument.instrument_segment || 'UNKNOWN'}</Typography> },
    ...(isIndiaEquity ? [{ id: 'derivativesEligible', label: 'F&O Eligible', render: (instrument: V1Instrument) => <Typography sx={subtleCellText}>{instrument.derivatives_eligible ? 'YES' : 'NO'}</Typography> } as DataTableColumn<V1Instrument>] : []),
    {
      id: 'dataHealth',
      label: 'Data Health',
      render: (instrument) => {
        const missing = instrument.missing_metadata_fields || [];
        return (
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            <Tooltip title={missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Metadata complete'} arrow>
              <Chip size="small" label={`${instrument.metadata_completeness_score ?? 0}%`} color={missing.length > 0 ? 'warning' : 'success'} variant="outlined" />
            </Tooltip>
            {instrument.universe_state && (
              <Tooltip title={instrument.readiness_blockers?.length ? instrument.readiness_blockers.join(', ') : 'Strict universe state'} arrow>
                <Chip size="small" label={humanizeCode(instrument.universe_state)} color={instrument.universe_state === 'REVIEW_READY' ? 'success' : instrument.universe_state === 'CATALOG_ONLY' || instrument.universe_state === 'STALE_OR_INCOMPLETE' ? 'warning' : 'default'} variant="outlined" />
              </Tooltip>
            )}
            <Chip size="small" label={humanizeCode(instrument.data_status)} color={statusColor(instrument.data_status)} variant="outlined" />
          </Stack>
        );
      },
    },
    {
      id: 'lastSuccessfulDataLoadTimestamp',
      label: 'Data Through',
      sortable: true,
      render: (instrument) => (
        <Tooltip title={`Catalog row last changed ${formatTimestamp(instrument.last_updated_timestamp)}`} arrow>
          <Typography component="span" sx={subtleCellText}>
            {formatDateOnly(dataThroughDate(instrument))}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (instrument) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Inspect instrument metadata" arrow>
            <IconButton size="small" onClick={() => setSelectedInstrument(instrument)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const resetFilters = () => {
    setSearch('');
    setExchange('');
    setAssetType('');
    setInstrumentSegment('');
    setCurrency('');
    setSector('');
    setIndustry('');
    setDataStatus('');
    setCatalogSource('');
    setDerivativesEligible('');
    setPage(0);
  };

  const activeFilters = [
    search.trim() ? `Search = ${search.trim()}` : null,
    !isCryptoScope && exchange.trim() ? `Exchange = ${exchange.trim().toUpperCase()}` : null,
    isIndiaEquity && instrumentSegment.trim() ? `Segment = ${instrumentSegment.trim().toUpperCase()}` : null,
    currency.trim() ? `Currency = ${currency.trim().toUpperCase()}` : null,
    isIndiaEquity && derivativesEligible ? `F&O Eligible = ${derivativesEligible === 'true' ? 'YES' : 'NO'}` : null,
    isIndiaEquity && catalogSource.trim() === 'NSE_SME_EQUITY_SECURITIES' ? 'SME only' : isIndiaEquity && catalogSource.trim() === 'NSE_EQUITY_SECURITIES' ? 'Main Board only' : null,
  ].filter((item): item is string => Boolean(item));
  const hasLocalFilters = activeFilters.length > 0;
  const hasManualFundamentals = !isCryptoScope;
  const hasAnyIngestionControl = hasExchangeFiles || hasManualFundamentals;
  const ingestionCapability = {
    region: scopeRegionUpper,
    isCryptoScope,
    hasExchangeFiles,
    hasManualFundamentals,
    hasAnyIngestionControl,
  };
  const scopeLabel = `${scope.region === 'GLOBAL' ? 'Global' : scope.region} / ${scope.assetType}`;
  const emptyMessage = hasLocalFilters
    ? `No instruments match ${activeFilters.join(', ')} in ${scopeLabel}.`
    : `No instruments found for ${scopeLabel}.`;
  const catalogSyncActive = catalogSyncStarting || isCatalogSyncActive(catalogSyncRun?.status);
  const schedulerActive = schedulerStatus?.activeRun === true;
  const historicalBackfillActive = historicalBackfillRunning || isHistoricalBackfillActive(historicalBackfillResult?.status);
  const operatorBackgroundActive = catalogSyncActive || historicalBackfillActive || manualFundamentalRunning || schedulerActive;
  const catalogSyncTotal = catalogSyncRun?.totalCount ?? 0;
  const catalogSyncProcessed = catalogSyncRun?.processedCount ?? 0;
  const catalogSyncPercent = catalogSyncRun?.percentComplete ?? (catalogSyncTotal > 0 ? (catalogSyncProcessed / catalogSyncTotal) * 100 : 0);
  const catalogSyncDeterminate = catalogSyncTotal > 0;
  const catalogSyncScope = catalogSyncRun ? `${catalogSyncRun.region}/${catalogSyncRun.assetType}` : '';
  const catalogSyncBatch = catalogSyncRun?.currentBatchNumber || catalogSyncRun?.batchesExecuted;
  const showCatalogSyncContinue = catalogSyncRun?.status === 'PARTIAL' && catalogSyncRun.hasMore === true;

  return (
    <Box className="page-container page-container--workspace" sx={{ minWidth: 0 }}>
      <PageHeader
        title="Market Data Foundation"
        subtitle="Admin & maintenance: catalog management, ingestion control, backfill, source-file evidence, and data-health monitoring."
        primaryAction={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/market-data-foundation/add')}>
            Add Instrument
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, nextTab: CatalogTab) => setActiveTab(nextTab)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="catalog" label="Catalog" />
          <Tab value="import" label="Import & Backfill" />
          <Tab value="health" label="Data Health" />
        </Tabs>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Market is controlled by the global header selector: <strong>{scope.region === 'GLOBAL' ? 'Global / All' : scope.region}</strong>
          {normalizedMarket ? ` (${normalizedMarket})` : ' (all markets)'}
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {catalogSyncRun && (
        <Alert
          severity={catalogSyncRun.status === 'FAILED' ? 'error' : showCatalogSyncContinue ? 'warning' : isCatalogSyncTerminal(catalogSyncRun.status) ? 'success' : 'info'}
          sx={{ mb: 2 }}
        >
          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2">Catalog sync progress</Typography>
                <Typography variant="body2" color="text.secondary">
                  Scope: {catalogSyncScope}; status {catalogSyncRun.status}; batch size {catalogSyncRun.batchSize ?? CATALOG_SYNC_DEFAULTS.batchSize}; worker slots {(catalogSyncRun.workerCount ?? CATALOG_SYNC_DEFAULTS.workerCount) * (catalogSyncRun.workerConcurrency ?? CATALOG_SYNC_DEFAULTS.workerConcurrency)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {catalogSyncActive && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    aria-label="Cancel catalog sync"
                    onClick={() => void handleCancelCatalogSync()}
                    disabled={catalogSyncCanceling || catalogSyncRun.runId === 'starting'}
                  >
                    {catalogSyncCanceling ? 'Canceling...' : 'Cancel'}
                  </Button>
                )}
                {showCatalogSyncContinue && (
                  <Button
                    size="small"
                    variant="contained"
                    aria-label="Continue catalog sync"
                    onClick={() => void handleCatalogSync(catalogSyncRun)}
                    disabled={catalogSyncStarting || operatorBackgroundActive}
                  >
                    Continue Sync
                  </Button>
                )}
              </Stack>
            </Stack>
            <LinearProgress
              aria-label="Catalog sync progress"
              variant={catalogSyncDeterminate ? 'determinate' : 'indeterminate'}
              value={catalogSyncDeterminate ? Math.min(100, Math.max(0, catalogSyncPercent)) : undefined}
            />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={`Processed ${formatCount(catalogSyncRun.processedCount)} / ${catalogSyncRun.totalCount !== undefined ? formatCount(catalogSyncRun.totalCount) : 'unknown'}`} />
              <Chip size="small" label={`Succeeded ${formatCount(catalogSyncRun.succeededCount)}`} />
              <Chip size="small" label={`Failed ${formatCount(catalogSyncRun.failedCount)}`} />
              <Chip size="small" label={`Skipped ${formatCount(catalogSyncRun.skippedCount)}`} />
              <Chip size="small" label={`No-op ${formatCount(catalogSyncRun.noOpCount)}`} />
              <Chip size="small" label={`Rows inserted ${formatCount(catalogSyncRun.rowsInserted)}`} />
              <Chip size="small" label={`Rows updated ${formatCount(catalogSyncRun.rowsUpdated)}`} />
              <Chip size="small" label={`Rows skipped ${formatCount(catalogSyncRun.rowsSkipped)}`} />
              <Chip size="small" label={`Warnings ${formatCount(catalogSyncRun.warningCount ?? catalogSyncRun.warnings?.length)}`} />
              {catalogSyncBatch && <Chip size="small" label={`Batch ${catalogSyncBatch}${catalogSyncRun.batchesPlanned ? ` of ${catalogSyncRun.batchesPlanned}` : ''}`} />}
            </Stack>
            {(catalogSyncRun.message || catalogSyncError || catalogSyncRun.warnings?.length || catalogSyncRun.recentErrors?.length) && (
              <Box>
                {catalogSyncRun.message && <Typography variant="body2">{catalogSyncRun.message}</Typography>}
                {catalogSyncError && <Typography variant="body2">{catalogSyncError}</Typography>}
                {catalogSyncRun.warnings?.slice(0, 2).map((warning) => <Typography key={warning} variant="body2">Warning: {warning}</Typography>)}
                {catalogSyncRun.recentErrors?.slice(0, 2).map((item) => (
                  <Typography key={`${item.symbol || 'run'}-${item.timestamp || item.message}`} variant="body2">
                    Error{item.symbol ? ` ${item.symbol}` : ''}: {item.message}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>
        </Alert>
      )}
      {schedulerActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              Background market-data load is running. Operator actions are disabled until this run completes.
            </Typography>
            <Typography variant="caption">
              Latest-day candle scheduler is active. Last checked {schedulerStatus?.lastRunAt || 'starting'}.
            </Typography>
            <LinearProgress aria-label="Latest-day candle scheduler progress" />
          </Stack>
        </Alert>
      )}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {activeTab === 'health' && (
        <MarketDataStatusPanel region={scope.region} assetType={scope.assetType} />
      )}

      {activeTab === 'import' && (
        <MarketDataImportPanel
          capability={ingestionCapability}
          operatorBackgroundActive={operatorBackgroundActive}
          historicalBackfillInputMode={historicalBackfillInputMode}
          historicalStartDate={historicalStartDate}
          historicalEndDate={historicalEndDate}
          historicalBackfillStartYear={historicalBackfillStartYear}
          historicalBackfillEndYear={historicalBackfillEndYear}
          historicalBackfillYearOptions={historicalBackfillYearOptions}
          latestSelectableBackfillDate={latestSelectableBackfillDate}
          selectedHistoricalBackfillRange={selectedHistoricalBackfillRange}
          historicalBackfillRunning={historicalBackfillRunning}
          historicalBackfillResult={historicalBackfillResult}
          onHistoricalBackfillInputModeChange={setHistoricalBackfillInputMode}
          onHistoricalStartDateChange={setHistoricalStartDate}
          onHistoricalEndDateChange={setHistoricalEndDate}
          onHistoricalBackfillStartYearChange={handleHistoricalBackfillStartYearChange}
          onHistoricalBackfillEndYearChange={handleHistoricalBackfillEndYearChange}
          onRunHistoricalBackfill={() => void handleHistoricalBackfill()}
          onResumeHistoricalBackfill={() => void handleResumeHistoricalBackfill()}
          onRetryHistoricalBackfill={() => void handleRetryHistoricalBackfill()}
          onCancelHistoricalBackfill={() => void handleCancelHistoricalBackfill()}
          manualFundamental={manualFundamental}
          manualFundamentalRunning={manualFundamentalRunning}
          onManualFundamentalFieldChange={updateManualFundamentalField}
          onManualFundamentalImport={() => void handleManualFundamentalImport()}
          sourceImports={sourceImports}
          sourceImportsLoaded={sourceImportsLoaded}
          sourceImportsLoading={sourceImportsLoading}
          sourceImportSortBy={sourceImportSortBy}
          sourceImportSortDirection={sourceImportSortDirection}
          onLoadSourceImports={() => void loadSourceImports()}
          onSourceImportSortChange={handleSourceImportSortChange}
        />
      )}

      {activeTab === 'catalog' && (
        <>
      <Box sx={{ mb: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CatalogFilterControls
          capability={{ isIndiaEquity, isCryptoScope, region: scopeRegionUpper }}
          search={search}
          exchange={exchange}
          derivativesEligible={derivativesEligible}
          catalogSource={catalogSource}
          loading={loading}
          hasLocalFilters={hasLocalFilters}
          onSearchChange={setSearch}
          onExchangeChange={setExchange}
          onDerivativesEligibleChange={setDerivativesEligible}
          onCatalogSourceChange={setCatalogSource}
          onResetPage={() => setPage(0)}
          onReset={resetFilters}
          onRefresh={loadInstruments}
        />
      </Box>

      {hasLocalFilters && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          {activeFilters.map((filter) => <Chip key={filter} size="small" label={filter} />)}
          <Chip size="small" variant="outlined" label={`${total} matching ${total === 1 ? 'instrument' : 'instruments'}`} />
        </Stack>
      )}

      <DataTable
        columns={columns}
        rows={instruments}
        getRowId={(instrument) => instrument.id}
        loading={loading}
        emptyMessage={emptyMessage}
        page={page}
        pageSize={pageSize}
        totalCount={total}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(nextSortBy, nextDirection) => {
          setSortBy(nextSortBy);
          setSortDirection(nextDirection);
          setPage(0);
        }}
        onRowClick={(instrument) => setSelectedInstrument(instrument)}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(0);
        }}
        />
        </>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedInstrument)}
        onClose={() => setSelectedInstrument(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%', p: 3 } }}
      >
        {selectedInstrument && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Instrument</Typography>
              <Typography variant="h5" fontWeight={700}>{formatDisplaySymbol(selectedInstrument)}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedInstrument.company_name}</Typography>
            </Box>
            <Divider />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <StatusBadge label={formatAssetType(selectedInstrument.asset_type)} />
              <StatusBadge label={selectedInstrument.instrument_segment || 'UNKNOWN'} />
              {isIndiaEquity && <StatusBadge label={selectedInstrument.derivatives_eligible ? 'F&O YES' : 'F&O NO'} />}
            </Stack>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Identity</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Stored symbol:</strong> {selectedInstrument.symbol}</Typography>
                <Typography variant="body2"><strong>Display symbol:</strong> {selectedInstrument.display_symbol || formatDisplaySymbol(selectedInstrument)}</Typography>
                <Typography variant="body2"><strong>Source symbol:</strong> {selectedInstrument.source_symbol || 'Missing'}</Typography>
                {showIsinColumn && (
                  <Typography variant="body2"><strong>ISIN:</strong>{' '}<span style={{ fontFamily: 'monospace' }}>{selectedInstrument.isin || '—'}</span></Typography>
                )}
                {selectedInstrument.catalog_source === 'NSE_SME_EQUITY_SECURITIES' && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip size="small" label="SME" color="warning" />
                    <Typography variant="caption" color="text.secondary">NSE SME segment</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Catalog</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Exchange:</strong> {selectedInstrument.exchange || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Region:</strong> {selectedInstrument.region || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Country:</strong> {selectedInstrument.country || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Currency:</strong> {selectedInstrument.currency || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Catalog source:</strong> {formatCatalogSource(selectedInstrument.catalog_source)}</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Metadata</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Sector:</strong> {selectedInstrument.sector || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Industry:</strong> {selectedInstrument.industry || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Market cap:</strong> {formatMarketCap(selectedInstrument.market_cap)}</Typography>
                <Typography variant="body2"><strong>Completeness:</strong> {selectedInstrument.metadata_completeness_score ?? 0}%</Typography>
                <Typography variant="body2"><strong>Missing fields:</strong> {selectedInstrument.missing_metadata_fields?.length ? selectedInstrument.missing_metadata_fields.join(', ') : 'None'}</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Exchange Data</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Universe state:</strong> {selectedInstrument.universe_state || 'Not classified'}</Typography>
                <Typography variant="body2"><strong>Price history bars:</strong> {selectedInstrument.price_history_bars ?? 0}</Typography>
                <Typography variant="body2"><strong>Latest price date:</strong> {selectedInstrument.latest_price_date || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Data through:</strong> {formatDateOnly(dataThroughDate(selectedInstrument))}</Typography>
                <Typography variant="body2"><strong>Expected trading date:</strong> {selectedInstrument.expected_latest_trading_date || 'Unknown'}</Typography>
                <Typography variant="body2"><strong>Recent volume:</strong> {selectedInstrument.has_recent_volume ? 'Present' : 'Missing'}</Typography>
                <Typography variant="body2"><strong>Readiness blockers:</strong> {selectedInstrument.readiness_blockers?.length ? selectedInstrument.readiness_blockers.join(', ') : 'None'}</Typography>
                <Typography variant="body2"><strong>Data status:</strong> {selectedInstrument.data_status}</Typography>
                <Typography variant="body2"><strong>Catalog row updated:</strong> {formatTimestamp(selectedInstrument.last_updated_timestamp)}</Typography>
              </Stack>
            </Box>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
};

export default MarketDataFoundationPage;
