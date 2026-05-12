import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  backfillCatalogMetadata,
  fetchCatalogSources,
  fetchInstruments,
  fetchMarketDataSchedulerStatus,
  importCatalog,
  syncAllStocks,
  syncMarketData,
  type MarketDataSchedulerRegionStatus,
  type CatalogSourceInfo,
  type V1Instrument,
} from '../api/marketDataFoundationService';
import MarketDataStatusPanel from './MarketDataStatusPanel';
import { DataTable, FilterBar, PageHeader, StatusBadge, type DataTableColumn, type SortDirection } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { normalizeMarketForApi } from '../api/marketScopeApi';

const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();
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

type FilterPreset = {
  id: string;
  label: string;
  description: string;
  value: 'all' | 'stocks' | 'fno' | 'needsValidation' | 'unsupported' | 'indices' | 'etfs';
  apply: () => void;
};

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
    return ` Latest completed candle ${status.latestCompletedTradingDate} is synced. Latest stored candle: ${status.latestStoredTradingDate}.`;
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
  const [providerSupportStatus, setProviderSupportStatus] = useState('');
  const [derivativesEligible, setDerivativesEligible] = useState('');
  const [importSource, setImportSource] = useState('NSE_EQUITY_SECURITIES');
  const [importMode, setImportMode] = useState<'CONFIGURED_URL' | 'MANUAL_CSV' | 'INTERNAL_SEED'>('CONFIGURED_URL');
  const [catalogSources, setCatalogSources] = useState<CatalogSourceInfo[]>([]);
  const [catalogCsv, setCatalogCsv] = useState('');
  const [validateProvider, setValidateProvider] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [backfillingCatalog, setBackfillingCatalog] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const normalizedMarket = normalizeMarketForApi(scope.region);

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV) {
        console.debug('[MarketDataFoundation] selected global market', {
          selectedGlobalMarket: scope.region,
          normalizedMarketValue: normalizedMarket || 'GLOBAL',
          selectedAssetType: scope.assetType,
        });
      }
      
      const response = await fetchInstruments({
        page: page + 1,
        pageSize,
        sortBy,
        sortOrder: sortDirection,
        region: scope.region,
        exchange: exchange.trim() || undefined,
        assetType: assetType.trim() || undefined,
        instrumentSegment: instrumentSegment.trim() || undefined,
        currency: currency.trim() || undefined,
        sector: sector.trim() || undefined,
        industry: industry.trim() || undefined,
        dataStatus: dataStatus.trim() || undefined,
        catalogSource: catalogSource.trim() || undefined,
        providerSupportStatus: providerSupportStatus.trim() || undefined,
        derivativesEligible: derivativesEligible === '' ? undefined : derivativesEligible === 'true',
        search: search.trim() || undefined,
      });
      setInstruments(response.instruments);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, [assetType, catalogSource, currency, dataStatus, derivativesEligible, exchange, industry, instrumentSegment, page, pageSize, providerSupportStatus, search, sector, sortBy, sortDirection, scope.region, normalizedMarket]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  useEffect(() => {
    fetchCatalogSources()
      .then((result) => setCatalogSources(result.sources))
      .catch(() => setCatalogSources([]));
  }, []);

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

  const handleSync = async (instrument: V1Instrument) => {
    setSyncingId(instrument.id);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncMarketData({ instrumentId: instrument.id, region: scope.region, asset_type: assetType.trim() || instrument.asset_type });
      if (!result.success) {
        setError(result.message);
      } else {
        setSuccess(`${instrument.symbol}: ${result.message}`);
        await loadInstruments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleCatalogSync = async () => {
    setCatalogSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncAllStocks(4, 4, 3000, { region: scope.region, assetType: assetType.trim() || undefined });
      if (!result.success) {
        setError(result.message || 'Catalog sync failed');
      } else {
        const schedulerStatus = await fetchMarketDataSchedulerStatus().catch(() => null);
        const regionStatus = schedulerStatus?.regionStatuses.find((item) => item.region === normalizedMarket);
        const candleStatusMessage = buildCandleStatusMessage(regionStatus);
        const summary = [
          result.noNewData ? null : result.succeeded !== undefined ? `${result.succeeded} succeeded` : null,
          result.noNewData ? null : result.failed !== undefined ? `${result.failed} failed` : null,
          result.providerFetchSkippedCount !== undefined ? `${result.providerFetchSkippedCount} provider fetches skipped` : null,
        ].filter(Boolean).join(', ');
        setSuccess(`${result.message}${candleStatusMessage}${summary ? ` (${summary})` : ''}`);
        await loadInstruments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog sync failed');
    } finally {
      setCatalogSyncing(false);
    }
  };

  const handleCatalogImport = async () => {
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
        providerValidated: 0,
        providerUnsupported: 0,
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
          validateProvider,
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
        aggregate.providerValidated += result.providerValidatedCount ?? result.providerValidated ?? 0;
        aggregate.providerUnsupported += result.providerUnsupportedCount ?? result.providerUnsupported ?? 0;
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
      setSuccess(`${importSource}: ${aggregate.inserted} inserted, ${aggregate.updated} updated, ${aggregate.noOp} no-op, ${aggregate.invalid} invalid, ${aggregate.providerUnsupported} unsupported. Processed ${aggregate.processed}/${aggregate.total || aggregate.processed}.${download}`);
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
        providerUnsupported: 0,
        warningCount: 0,
      };
      let offset = 0;
      let hasMore = true;
      const batchSize = 100;
      while (hasMore) {
        const result = await backfillCatalogMetadata({
          region: scope.region,
          assetType: assetType.trim() || undefined,
          batchSize,
          offset,
          validateProvider,
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
        aggregate.providerUnsupported += result.providerUnsupported ?? 0;
        aggregate.warningCount += result.warnings?.length ?? 0;
        setBatchProgress({
          label: 'Backfilling metadata',
          processed: Math.min(aggregate.processed, aggregate.total || aggregate.processed),
          total: aggregate.total || null,
        });
        hasMore = result.hasMore === true && result.nextOffset !== null && result.nextOffset !== undefined;
        offset = result.nextOffset ?? 0;
      }
      setSuccess(`Backfill processed ${aggregate.processed}/${aggregate.total || aggregate.processed}: ${aggregate.updated} updated, ${aggregate.noOp} no-op, ${aggregate.skipped} skipped, ${aggregate.providerUnsupported} unsupported.${aggregate.warningCount ? ` ${aggregate.warningCount} warnings.` : ''}`);
      await loadInstruments();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog metadata backfill failed');
    } finally {
      setBackfillingCatalog(false);
      setBatchProgress(null);
    }
  };

  const columns: DataTableColumn<V1Instrument>[] = [
    {
      id: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (instrument) => (
        <Tooltip title={instrument.symbol !== formatDisplaySymbol(instrument) ? `Stored symbol: ${instrument.symbol}` : ''} arrow>
          <Typography fontWeight={700} fontSize={13}>{formatDisplaySymbol(instrument)}</Typography>
        </Tooltip>
      ),
    },
    { id: 'name', label: 'Company', sortable: true, render: (instrument) => instrument.company_name },
    { id: 'providerSymbol', label: 'Provider Symbol', render: (instrument) => instrument.provider_symbol || instrument.symbol },
    { id: 'exchange', label: 'Exchange', sortable: true, render: (instrument) => <Typography sx={subtleCellText}>{instrument.exchange || 'UNKNOWN'}</Typography> },
    { id: 'assetType', label: 'Asset Type', sortable: true, render: (instrument) => <Typography sx={subtleCellText}>{formatAssetType(instrument.asset_type)}</Typography> },
    { id: 'instrumentSegment', label: 'Segment/Class', render: (instrument) => <Typography sx={subtleCellText}>{instrument.instrument_segment || 'UNKNOWN'}</Typography> },
    { id: 'derivativesEligible', label: 'F&O Eligible', render: (instrument) => <Typography sx={subtleCellText}>{instrument.derivatives_eligible ? 'YES' : 'NO'}</Typography> },
    {
      id: 'providerSupport',
      label: 'Provider Support',
      render: (instrument) => (
        <Tooltip title={(instrument.provider_support_status || 'UNKNOWN') === 'UNKNOWN' ? 'Provider support has not been validated yet.' : instrument.provider_error || ''} arrow>
          <Typography component="span" sx={{ ...subtleCellText, color: (instrument.provider_support_status || 'UNKNOWN') === 'UNSUPPORTED' ? 'error.main' : 'text.primary' }}>
            {instrument.provider_support_status || 'UNKNOWN'}
          </Typography>
        </Tooltip>
      ),
    },
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
                <Chip size="small" label={instrument.universe_state} color={instrument.universe_state === 'REVIEW_READY' ? 'success' : instrument.universe_state === 'CATALOG_ONLY' || instrument.universe_state === 'STALE_OR_INCOMPLETE' ? 'warning' : 'default'} variant="outlined" />
              </Tooltip>
            )}
            <StatusBadge label={instrument.data_status} />
          </Stack>
        );
      },
    },
    { id: 'lastSuccessfulDataLoadTimestamp', label: 'Last Updated', sortable: true, render: (instrument) => formatTimestamp(instrument.last_updated_timestamp) },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (instrument) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(event) => event.stopPropagation()}>
          <Tooltip title="View Instrument Details" arrow>
            <IconButton size="small" onClick={() => navigate(`/stocks/${instrument.id}`)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sync market data" arrow>
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={syncingId === instrument.id}
                onClick={() => void handleSync(instrument)}
              >
                {syncingId === instrument.id ? <CircularProgress size={18} /> : <SyncIcon fontSize="small" />}
              </IconButton>
            </span>
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
    setProviderSupportStatus('');
    setDerivativesEligible('');
    setPage(0);
  };

  const applyPreset = (preset: 'all' | 'stocks' | 'fno' | 'needsValidation' | 'unsupported' | 'indices' | 'etfs') => {
    resetFilters();
    if (preset === 'stocks') {
      setAssetType('STOCK');
      setInstrumentSegment('CASH');
    }
    if (preset === 'fno') {
      setAssetType('STOCK');
      setInstrumentSegment('CASH');
      setDerivativesEligible('true');
    }
    if (preset === 'needsValidation') {
      setProviderSupportStatus('UNKNOWN');
    }
    if (preset === 'unsupported') {
      setProviderSupportStatus('UNSUPPORTED');
    }
    if (preset === 'indices') {
      setAssetType('INDEX');
      setInstrumentSegment('INDEX');
    }
    if (preset === 'etfs') {
      setAssetType('ETF');
      setInstrumentSegment('ETF');
    }
    setPage(0);
  };

  const filterPresets: FilterPreset[] = [
    { id: 'all', value: 'all', label: 'All', description: 'All instruments in the current market scope.', apply: () => applyPreset('all') },
    { id: 'stocks', value: 'stocks', label: 'Stocks', description: 'Indian cash equity rows.', apply: () => applyPreset('stocks') },
    { id: 'fno', value: 'fno', label: 'F&O Eligible', description: 'Cash stocks that are known F&O underlyings.', apply: () => applyPreset('fno') },
    { id: 'indices', value: 'indices', label: 'Indices', description: 'Index catalog rows.', apply: () => applyPreset('indices') },
    { id: 'etfs', value: 'etfs', label: 'ETFs', description: 'ETF catalog rows.', apply: () => applyPreset('etfs') },
    { id: 'needsValidation', value: 'needsValidation', label: 'Needs Validation', description: 'Provider support has not been validated.', apply: () => applyPreset('needsValidation') },
    { id: 'unsupported', value: 'unsupported', label: 'Unsupported', description: 'Provider validation failed or is unsupported.', apply: () => applyPreset('unsupported') },
  ];

  const activePresetValue = (() => {
    if (!assetType && !instrumentSegment && !providerSupportStatus && !derivativesEligible) return 'all';
    if (assetType === 'STOCK' && instrumentSegment === 'CASH' && derivativesEligible === 'true') return 'fno';
    if (assetType === 'STOCK' && instrumentSegment === 'CASH' && !derivativesEligible && !providerSupportStatus) return 'stocks';
    if (providerSupportStatus === 'UNKNOWN' && !assetType && !instrumentSegment && !derivativesEligible) return 'needsValidation';
    if (providerSupportStatus === 'UNSUPPORTED' && !assetType && !instrumentSegment && !derivativesEligible) return 'unsupported';
    if (assetType === 'INDEX' && instrumentSegment === 'INDEX') return 'indices';
    if (assetType === 'ETF' && instrumentSegment === 'ETF') return 'etfs';
    return false;
  })();

  const activeFilters = [
    search.trim() ? `Search = ${search.trim()}` : null,
    exchange.trim() ? `Exchange = ${exchange.trim().toUpperCase()}` : null,
    assetType.trim() ? `Asset Type = ${assetType.trim().toUpperCase()}` : null,
    instrumentSegment.trim() ? `Segment = ${instrumentSegment.trim().toUpperCase()}` : null,
    currency.trim() ? `Currency = ${currency.trim().toUpperCase()}` : null,
    providerSupportStatus.trim() ? `Provider = ${providerSupportStatus.trim().toUpperCase()}` : null,
    derivativesEligible ? `F&O Eligible = ${derivativesEligible === 'true' ? 'YES' : 'NO'}` : null,
  ].filter((item): item is string => Boolean(item));
  const hasLocalFilters = activeFilters.length > 0;
  const availableCatalogSources = catalogSources.length > 0 ? catalogSources : fallbackCatalogSources;
  const selectedCatalogSource = availableCatalogSources.find((source) => source.catalogSource === importSource);
  const importAvailable = importMode === 'MANUAL_CSV' && catalogCsv.trim().length > 0
    || (importMode === 'CONFIGURED_URL' && selectedCatalogSource?.supportsConfiguredUrl === true)
    || (importMode === 'INTERNAL_SEED' && selectedCatalogSource?.supportsInternalSeed === true);
  const scopeLabel = `${scope.region === 'GLOBAL' ? 'Global / All' : scope.region} / All asset types`;
  const emptyMessage = hasLocalFilters
    ? `No instruments match ${activeFilters.join(', ')} in ${scopeLabel}.`
    : `No instruments found for ${scopeLabel}.`;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, width: '100%', minWidth: 0, boxSizing: 'border-box', mx: 'auto', overflowX: 'hidden' }}>
      <PageHeader
        title="Market Data Foundation"
        subtitle="Explore instruments, prices, fundamentals, corporate actions, and manual data sync status."
        primaryAction={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/market-data-foundation/add')}>
            Add Instrument
          </Button>
        }
        secondaryActions={
          <>
          <Button
            variant="outlined"
            startIcon={catalogSyncing ? <CircularProgress size={18} /> : <SyncIcon />}
            onClick={handleCatalogSync}
            disabled={catalogSyncing}
          >
            {catalogSyncing ? 'Syncing Catalog...' : 'Sync Catalog'}
          </Button>
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => navigate('/market-data-foundation/ingestion')}>
            Ingestion
          </Button>
          </>
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
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {activeTab === 'health' && (
        <MarketDataStatusPanel region={scope.region} assetType={scope.assetType} />
      )}

      {activeTab === 'import' && (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          width: { xs: 'calc(100vw - 48px)', sm: 'calc(100vw - 96px)', md: '100%' },
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(180px, 1fr)) auto' },
              gap: 1.5,
              alignItems: 'center',
              maxWidth: '100%',
              '& .MuiTextField-root': { minWidth: 0 },
            }}
          >
            <TextField select size="small" label="Import Mode" value={importMode} onChange={(event) => setImportMode(event.target.value as 'CONFIGURED_URL' | 'MANUAL_CSV' | 'INTERNAL_SEED')}>
              {(!selectedCatalogSource || selectedCatalogSource.supportsConfiguredUrl) && <MenuItem value="CONFIGURED_URL">Configured URL</MenuItem>}
              {selectedCatalogSource?.supportsInternalSeed && <MenuItem value="INTERNAL_SEED">Internal Seed</MenuItem>}
              {(!selectedCatalogSource || selectedCatalogSource.supportsManualCsv) && <MenuItem value="MANUAL_CSV">Manual CSV</MenuItem>}
            </TextField>
            <TextField select size="small" label="Catalog Source" value={importSource} onChange={(event) => handleImportSourceChange(event.target.value)}>
              {availableCatalogSources.map((item) => <MenuItem key={item.catalogSource} value={item.catalogSource}>{item.displayName || item.catalogSource}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Provider Validation" value={validateProvider ? 'true' : 'false'} onChange={(event) => setValidateProvider(event.target.value === 'true')}>
              <MenuItem value="false">Skip validation</MenuItem>
              <MenuItem value="true">Validate batch</MenuItem>
            </TextField>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ justifySelf: { xs: 'stretch', lg: 'end' }, minWidth: 0 }}
            >
              <Button
                variant="outlined"
                startIcon={importingCatalog ? <CircularProgress size={18} /> : <SyncIcon />}
                onClick={handleCatalogImport}
                disabled={importingCatalog || backfillingCatalog || !importAvailable}
                sx={{ flex: { xs: '1 1 auto', sm: '0 1 auto' }, whiteSpace: 'nowrap' }}
              >
                {importingCatalog ? 'Importing...' : 'Import Catalog'}
              </Button>
              <Button
                variant="outlined"
                startIcon={backfillingCatalog ? <CircularProgress size={18} /> : <SyncIcon />}
                onClick={handleCatalogBackfill}
                disabled={backfillingCatalog || importingCatalog}
                sx={{ flex: { xs: '1 1 auto', sm: '0 1 auto' }, whiteSpace: 'nowrap' }}
              >
                {backfillingCatalog ? 'Backfilling...' : 'Backfill Metadata'}
              </Button>
            </Stack>
          </Box>
          {selectedCatalogSource && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={selectedCatalogSource.region} />
              {selectedCatalogSource.assetType && <Chip size="small" label={selectedCatalogSource.assetType} />}
              {selectedCatalogSource.segmentClass && <Chip size="small" label={selectedCatalogSource.segmentClass} />}
              {selectedCatalogSource.supportsInternalSeed ? (
                <Chip size="small" color="success" label="Uses built-in seed list" />
              ) : importMode === 'MANUAL_CSV' && !selectedCatalogSource.urlConfigured ? (
                <Chip size="small" color="warning" label="Manual CSV required" />
              ) : (
                <Chip size="small" color={selectedCatalogSource.urlConfigured ? 'success' : 'warning'} label={`URL configured: ${selectedCatalogSource.urlConfigured ? 'Yes' : 'No'}`} />
              )}
              <Chip size="small" label={`Source: ${selectedCatalogSource.urlSource === 'ENV' ? 'Env' : selectedCatalogSource.urlSource === 'DEFAULT' ? 'Default' : selectedCatalogSource.urlSource === 'INTERNAL_SEED' ? 'Internal Seed' : 'Manual setup'}`} />
            </Stack>
          )}
          {importMode === 'CONFIGURED_URL' && selectedCatalogSource && !selectedCatalogSource.urlConfigured && (
            <Alert severity="warning">{selectedCatalogSource.setupHint || 'No configured URL for this source. Use Manual CSV or configure the source URL.'}</Alert>
          )}
          {importMode === 'MANUAL_CSV' && selectedCatalogSource && !selectedCatalogSource.urlConfigured && selectedCatalogSource.setupHint && (
            <Alert severity="info">{selectedCatalogSource.setupHint}</Alert>
          )}
          {importMode === 'INTERNAL_SEED' && selectedCatalogSource && (
            <Alert severity="info">{selectedCatalogSource.setupHint || 'Uses a built-in seed list. No URL is required.'}</Alert>
          )}
          {importMode === 'MANUAL_CSV' && (
            <TextField
              multiline
              minRows={3}
              size="small"
              label="Catalog CSV"
              value={catalogCsv}
              onChange={(event) => setCatalogCsv(event.target.value)}
              placeholder="Paste NSE securities or F&O underlyings CSV here. Index seed import does not require CSV."
            />
          )}
        </Stack>
      </Paper>
      )}

      {activeTab === 'catalog' && (
        <>
      <Box sx={{ mb: 2, width: { xs: 'calc(100vw - 48px)', sm: 'calc(100vw - 96px)', md: '100%' }, maxWidth: '100%', boxSizing: 'border-box' }}>
        <Paper
          variant="outlined"
          sx={{
            mb: 1.5,
            px: 1,
            bgcolor: 'background.paper',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={{ xs: 0.5, md: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1, pt: { xs: 1, md: 0 }, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}
            >
              Catalog Views
            </Typography>
            <Tabs
              value={activePresetValue}
              onChange={(_event, nextValue) => {
                const preset = filterPresets.find((item) => item.value === nextValue);
                preset?.apply();
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 48,
                '& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
                '& .MuiTab-root': {
                  minHeight: 48,
                  px: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                },
              }}
            >
              {filterPresets.map((preset) => (
                <Tab key={preset.id} value={preset.value} label={preset.label} title={preset.description} />
              ))}
            </Tabs>
          </Stack>
        </Paper>
        <FilterBar onReset={resetFilters} showReset={hasLocalFilters}>
          <TextField
            sx={{ flexBasis: { xs: '100%', md: 320 }, flexGrow: { md: 2 } }}
            size="small"
            label="Search by symbol or company"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField size="small" label="Exchange" value={exchange} onChange={(event) => { setExchange(event.target.value.toUpperCase()); setPage(0); }} />
          <TextField select size="small" label="Asset Type" value={assetType} onChange={(event) => { setAssetType(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['STOCK', 'ETF', 'INDEX', 'FUTURE', 'FOREX', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Segment/Class" value={instrumentSegment} onChange={(event) => { setInstrumentSegment(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['CASH', 'FUTURES', 'INDEX', 'ETF', 'CURRENCY', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Currency" value={currency} onChange={(event) => { setCurrency(event.target.value.toUpperCase()); setPage(0); }} />
          <TextField select size="small" label="F&O Eligible" value={derivativesEligible} onChange={(event) => { setDerivativesEligible(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            onClick={loadInstruments}
            disabled={loading}
          >
            Refresh
          </Button>
        </FilterBar>
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
              <StatusBadge label={selectedInstrument.derivatives_eligible ? 'F&O YES' : 'F&O NO'} />
              <StatusBadge label={selectedInstrument.provider_support_status || 'UNKNOWN'} />
            </Stack>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Identity</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Stored symbol:</strong> {selectedInstrument.symbol}</Typography>
                <Typography variant="body2"><strong>Display symbol:</strong> {selectedInstrument.display_symbol || formatDisplaySymbol(selectedInstrument)}</Typography>
                <Typography variant="body2"><strong>Source symbol:</strong> {selectedInstrument.source_symbol || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Provider symbol:</strong> {selectedInstrument.provider_symbol || 'Missing'}</Typography>
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
              <Typography variant="subtitle2" gutterBottom>Provider & Data</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Provider support:</strong> {selectedInstrument.provider_support_status || 'UNKNOWN'}</Typography>
                <Typography variant="body2"><strong>Provider error:</strong> {selectedInstrument.provider_error || 'None'}</Typography>
                <Typography variant="body2"><strong>Universe state:</strong> {selectedInstrument.universe_state || 'Not classified'}</Typography>
                <Typography variant="body2"><strong>Price history bars:</strong> {selectedInstrument.price_history_bars ?? 0}</Typography>
                <Typography variant="body2"><strong>Latest price date:</strong> {selectedInstrument.latest_price_date || 'Missing'}</Typography>
                <Typography variant="body2"><strong>Expected trading date:</strong> {selectedInstrument.expected_latest_trading_date || 'Unknown'}</Typography>
                <Typography variant="body2"><strong>Recent volume:</strong> {selectedInstrument.has_recent_volume ? 'Present' : 'Missing'}</Typography>
                <Typography variant="body2"><strong>Readiness blockers:</strong> {selectedInstrument.readiness_blockers?.length ? selectedInstrument.readiness_blockers.join(', ') : 'None'}</Typography>
                <Typography variant="body2"><strong>Data status:</strong> {selectedInstrument.data_status}</Typography>
                <Typography variant="body2"><strong>Last updated:</strong> {formatTimestamp(selectedInstrument.last_updated_timestamp)}</Typography>
              </Stack>
            </Box>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => navigate(`/stocks/${selectedInstrument.id}`)}>Open Workspace</Button>
              <Button variant="contained" onClick={() => void handleSync(selectedInstrument)} disabled={syncingId === selectedInstrument.id}>
                {syncingId === selectedInstrument.id ? 'Syncing...' : 'Sync Prices'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
};

export default MarketDataFoundationPage;
