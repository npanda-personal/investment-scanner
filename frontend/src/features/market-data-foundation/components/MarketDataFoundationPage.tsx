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
  backfillCatalogMetadata,
  cancelCatalogSyncRun,
  fetchCatalogSyncRunStatus,
  fetchCatalogSources,
  fetchInstruments,
  fetchMarketDataSchedulerStatus,
  fetchSourceFileImports,
  fetchExchangeHistoricalBackfillRun,
  importManualVerifiedFundamental,
  importCatalog,
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
  type CatalogSourceInfo,
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
const formatBytes = (value?: number) => value === undefined ? 'n/a' : `${(value / 1024).toFixed(1)} KB`;
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

type BatchProgressState = {
  label: string;
  processed: number;
  total: number | null;
};

type CatalogTab = 'catalog' | 'import' | 'health';
type BackfillInputMode = 'DATE_RANGE' | 'YEAR';
type ManualFundamentalField = 'revenue' | 'eps' | 'netIncome' | 'peRatio' | 'marketCap';
type SourceFileImportSortBy = 'importedAt' | 'tradingDate';
type SourceFileImportSortDirection = 'asc' | 'desc';

const formatBatchProgressLabel = (progress: BatchProgressState) => {
  const total = progress.total && progress.total > 0 ? progress.total : null;
  return `${progress.label}: ${progress.processed}${total ? ` / ${total}` : ''}`;
};
const fallbackCatalogSources: CatalogSourceInfo[] = [
  {
    catalogSource: 'NSE_EQUITY_SECURITIES',
    displayName: 'NSE Equity Securities',
    enabled: true,
    region: 'IN',
    assetType: 'STOCK',
    segmentClass: 'CASH',
    fileType: 'CSV',
    parserType: 'NSE_EQUITY_SECURITIES',
    importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
    urlConfigured: true,
    urlSource: 'DEFAULT',
    setupHint: 'Uses the built-in public NSE equity security list by default.',
    supportsManualCsv: true,
    supportsConfiguredUrl: true,
    supportsInternalSeed: false,
    lastImportedAt: null,
  },
  {
    catalogSource: 'NSE_INDEX_SECURITIES',
    displayName: 'NSE Indices',
    enabled: true,
    region: 'IN',
    assetType: 'INDEX',
    segmentClass: 'INDEX',
    fileType: 'JSON',
    parserType: 'NSE_ALL_INDICES_JSON',
    importModes: ['CONFIGURED_URL'],
    urlConfigured: true,
    urlSource: 'DEFAULT',
    setupHint: 'Uses the built-in public NSE all-indices JSON endpoint by default.',
    supportsManualCsv: false,
    supportsConfiguredUrl: true,
    supportsInternalSeed: false,
    lastImportedAt: null,
  },
  {
    catalogSource: 'BSE_INDEX_SECURITIES',
    displayName: 'BSE Indices',
    enabled: true,
    region: 'IN',
    assetType: 'INDEX',
    segmentClass: 'INDEX',
    fileType: 'HTML',
    parserType: 'BSE_INDICES_HTML',
    importModes: ['CONFIGURED_URL'],
    urlConfigured: true,
    urlSource: 'DEFAULT',
    setupHint: 'Uses the built-in public BSE mobile index-watch page by default.',
    supportsManualCsv: false,
    supportsConfiguredUrl: true,
    supportsInternalSeed: false,
    lastImportedAt: null,
  },
  {
    catalogSource: 'NSE_INDEX_SEED',
    displayName: 'NSE/BSE Index Seed',
    enabled: true,
    region: 'IN',
    assetType: 'INDEX',
    segmentClass: 'INDEX',
    fileType: 'CSV',
    parserType: 'NSE_INDEX_SEED',
    importModes: ['INTERNAL_SEED'],
    urlConfigured: false,
    urlSource: 'INTERNAL_SEED',
    setupHint: 'Uses the small built-in fallback index seed. For broader catalogs, import NSE Indices and BSE Indices.',
    supportsManualCsv: false,
    supportsConfiguredUrl: false,
    supportsInternalSeed: true,
    lastImportedAt: null,
  },
  {
    catalogSource: 'NSE_ETF_SECURITIES',
    displayName: 'NSE ETF Securities',
    enabled: true,
    region: 'IN',
    assetType: 'ETF',
    segmentClass: 'ETF',
    fileType: 'CSV',
    parserType: 'NSE_ETF_SECURITIES',
    importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
    urlConfigured: true,
    urlSource: 'DEFAULT',
    setupHint: 'Uses the built-in public NSE ETF security list by default.',
    supportsManualCsv: true,
    supportsConfiguredUrl: true,
    supportsInternalSeed: false,
    lastImportedAt: null,
  },
  {
    catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
    displayName: 'NSE F&O Underlyings',
    enabled: true,
    region: 'IN',
    segmentClass: 'CASH',
    fileType: 'CSV',
    parserType: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
    importModes: ['MANUAL_CSV'],
    urlConfigured: false,
    urlSource: 'NONE',
    setupHint: 'Set MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL or use Manual CSV. Underlyings do not create futures contracts.',
    supportsManualCsv: true,
    supportsConfiguredUrl: false,
    supportsInternalSeed: false,
    lastImportedAt: null,
  },
];

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
  const [importSource, setImportSource] = useState('NSE_EQUITY_SECURITIES');
  const [importMode, setImportMode] = useState<'CONFIGURED_URL' | 'MANUAL_CSV' | 'INTERNAL_SEED'>('CONFIGURED_URL');
  const [catalogSources, setCatalogSources] = useState<CatalogSourceInfo[]>([]);
  const [catalogCsv, setCatalogCsv] = useState('');
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [backfillingCatalog, setBackfillingCatalog] = useState(false);
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
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
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

  useEffect(() => {
    fetchCatalogSources()
      .then((result) => setCatalogSources(result.sources))
      .catch(() => setCatalogSources([]));
  }, []);

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
          setActiveTab('import');
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
    const source = catalogSources.find((item) => item.catalogSource === importSource);
    if (!source) return;
    if (!source.importModes.includes(importMode)) {
      if (source.supportsConfiguredUrl) setImportMode('CONFIGURED_URL');
      else if (source.supportsInternalSeed) setImportMode('INTERNAL_SEED');
      else setImportMode('MANUAL_CSV');
    }
  }, [catalogSources, importMode, importSource]);

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

  const handleCatalogImport = async () => {
    if (operatorBackgroundActive) {
      setError('A background market-data load is already running. Wait for it to finish before importing catalog data.');
      return;
    }
    setImportingCatalog(true);
    setError(null);
    setSuccess(null);
    setBatchProgress(null);
    try {
      const aggregate = {
        inserted: 0,
        updated: 0,
        noOp: 0,
        invalid: 0,
        processed: 0,
        total: 0,
        downloadedBytes: 0,
        tempCleanupFailed: false,
      };
      let offset = 0;
      let hasMore = true;
      const batchSize = 100;
      while (hasMore) {
        const result = await importCatalog({
          catalogSource: importSource,
          importMode,
          csvText: importMode === 'MANUAL_CSV' ? catalogCsv : undefined,
          batchSize,
          offset,
        });
        if (!result.success) {
          throw new Error(result.message || 'Catalog import failed');
        }
        aggregate.inserted += result.insertedCount ?? result.inserted ?? 0;
        aggregate.updated += result.updatedCount ?? result.updated ?? 0;
        aggregate.noOp += result.noOpCount ?? result.noOp ?? 0;
        aggregate.invalid += result.invalidCount ?? result.invalid ?? 0;
        aggregate.processed += result.processedCount ?? 0;
        aggregate.total = result.totalCount ?? result.sourceRows ?? aggregate.total;
        aggregate.downloadedBytes += result.fileSizeBytes ?? 0;
        aggregate.tempCleanupFailed = aggregate.tempCleanupFailed || result.tempFileDeleted === false && result.downloaded === true;
        setBatchProgress({
          label: 'Importing catalog',
          processed: Math.min(aggregate.processed, aggregate.total || aggregate.processed),
          total: aggregate.total || null,
        });
        hasMore = result.hasMore === true && result.nextOffset !== null && result.nextOffset !== undefined;
        offset = result.nextOffset ?? 0;
      }
      const download = aggregate.downloadedBytes > 0 ? ` Downloaded ${formatBytes(aggregate.downloadedBytes)} across batches; temp cleanup: ${aggregate.tempCleanupFailed ? 'check server logs' : 'ok'}.` : '';
      setSuccess(`${importSource}: ${aggregate.inserted} inserted, ${aggregate.updated} updated, ${aggregate.noOp} no-op, ${aggregate.invalid} invalid. Processed ${aggregate.processed}/${aggregate.total || aggregate.processed}.${download}`);
      await loadInstruments();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog import failed');
    } finally {
      setImportingCatalog(false);
      setBatchProgress(null);
    }
  };

  const handleImportSourceChange = (nextSource: string) => {
    setImportSource(nextSource);
    const source = (catalogSources.length > 0 ? catalogSources : fallbackCatalogSources).find((item) => item.catalogSource === nextSource);
    if (!source) return;
    if (source.supportsConfiguredUrl) setImportMode('CONFIGURED_URL');
    else if (source.supportsInternalSeed) setImportMode('INTERNAL_SEED');
    else setImportMode('MANUAL_CSV');
  };

  const handleCatalogBackfill = async () => {
    if (operatorBackgroundActive) {
      setError('A background market-data load is already running. Wait for it to finish before backfilling metadata.');
      return;
    }
    setBackfillingCatalog(true);
    setError(null);
    setSuccess(null);
    setBatchProgress(null);
    try {
      const aggregate = {
        processed: 0,
        total: 0,
        updated: 0,
        noOp: 0,
        skipped: 0,
        validated: 0,
        warningCount: 0,
      };
      let offset = 0;
      let hasMore = true;
      const batchSize = 100;
      const backfillSource = selectedCatalogSource;
      while (hasMore) {
        const result = await backfillCatalogMetadata({
          region: backfillSource?.region || scope.region,
          assetType: backfillSource?.assetType || assetType.trim() || undefined,
          catalogSource: importSource,
          batchSize,
          offset,
        });
        if (!result.success) {
          throw new Error(result.message || 'Catalog metadata backfill failed');
        }
        aggregate.processed += result.processedCount ?? 0;
        aggregate.total = result.totalCount ?? aggregate.total;
        aggregate.updated += result.updated ?? 0;
        aggregate.noOp += result.noOp ?? 0;
        aggregate.skipped += result.skipped ?? 0;
        aggregate.validated += result.validated ?? 0;
        aggregate.warningCount += result.warnings?.length ?? 0;
        setBatchProgress({
          label: 'Backfilling metadata',
          processed: Math.min(aggregate.processed, aggregate.total || aggregate.processed),
          total: aggregate.total || null,
        });
        hasMore = result.hasMore === true && result.nextOffset !== null && result.nextOffset !== undefined;
        offset = result.nextOffset ?? 0;
      }
      setSuccess(`Backfill processed ${aggregate.processed}/${aggregate.total || aggregate.processed}: ${aggregate.updated} updated, ${aggregate.noOp} no-op, ${aggregate.skipped} skipped.${aggregate.warningCount ? ` ${aggregate.warningCount} warnings.` : ''}`);
      await loadInstruments();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog metadata backfill failed');
    } finally {
      setBackfillingCatalog(false);
      setBatchProgress(null);
    }
  };

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
  // Region isolation: only show catalog sources for the selected market. The IN-only
  // fallback is therefore used solely when IN is selected; US/EU/Crypto honestly show
  // their own sources (or an empty state) rather than India's NSE/BSE sources.
  const scopedSourceRegion = scopeRegionUpper;
  const availableCatalogSources = (catalogSources.length > 0 ? catalogSources : fallbackCatalogSources)
    .filter((source) => !scopedSourceRegion
      || String(source.region || '').toUpperCase() === scopedSourceRegion);
  const selectedCatalogSource = availableCatalogSources.find((source) => source.catalogSource === importSource);
  const importAvailable = importMode === 'MANUAL_CSV' && catalogCsv.trim().length > 0
    || (importMode === 'CONFIGURED_URL' && selectedCatalogSource?.supportsConfiguredUrl === true)
    || (importMode === 'INTERNAL_SEED' && selectedCatalogSource?.supportsInternalSeed === true);
  const hasCatalogSources = scopedSourceRegion === 'IN' && availableCatalogSources.length > 0; // catalog-file import/backfill is NSE/BSE-only machinery
  const hasManualFundamentals = !isCryptoScope;
  const hasAnyIngestionControl = hasCatalogSources || hasExchangeFiles || hasManualFundamentals;
  const ingestionCapability = {
    region: scopeRegionUpper,
    isCryptoScope,
    hasCatalogSources,
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
      {batchProgress && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">{formatBatchProgressLabel(batchProgress)}</Typography>
            <LinearProgress
              variant={batchProgress.total && batchProgress.total > 0 ? 'determinate' : 'indeterminate'}
              value={batchProgress.total && batchProgress.total > 0 ? Math.min(100, (batchProgress.processed / batchProgress.total) * 100) : undefined}
            />
          </Stack>
        </Alert>
      )}
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
          availableCatalogSources={availableCatalogSources}
          selectedCatalogSource={selectedCatalogSource}
          importMode={importMode}
          catalogCsv={catalogCsv}
          importAvailable={importAvailable}
          importingCatalog={importingCatalog}
          backfillingCatalog={backfillingCatalog}
          operatorBackgroundActive={operatorBackgroundActive}
          onImportModeChange={setImportMode}
          onImportSourceChange={handleImportSourceChange}
          onCatalogCsvChange={setCatalogCsv}
          onImportCatalog={handleCatalogImport}
          onBackfillCatalog={handleCatalogBackfill}
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
          instrumentSegment={instrumentSegment}
          derivativesEligible={derivativesEligible}
          catalogSource={catalogSource}
          loading={loading}
          hasLocalFilters={hasLocalFilters}
          onSearchChange={setSearch}
          onExchangeChange={setExchange}
          onInstrumentSegmentChange={setInstrumentSegment}
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
