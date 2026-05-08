import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
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
    setupHint: 'Uses the built-in index seed list. No URL is required.',
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
  const [catalogImportProgress, setCatalogImportProgress] = useState<string | null>(null);
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
    setCatalogImportProgress(null);
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
        setCatalogImportProgress(`Imported ${Math.min(aggregate.processed, aggregate.total || aggregate.processed)} / ${aggregate.total || '...'} rows`);
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
      setCatalogImportProgress(null);
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
    try {
      const result = await backfillCatalogMetadata({
        region: scope.region,
        assetType: assetType.trim() || undefined,
        batchSize: 100,
        offset: 0,
        validateProvider,
      });
      if (!result.success) {
        setError(result.message || 'Catalog metadata backfill failed');
      } else {
        setSuccess(`Backfill processed ${result.processedCount}/${result.totalCount}: ${result.updated} updated, ${result.noOp} no-op, ${result.skipped} skipped, ${result.providerUnsupported} unsupported.${result.hasMore ? ` More rows available at offset ${result.nextOffset}.` : ''}`);
        await loadInstruments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog metadata backfill failed');
    } finally {
      setBackfillingCatalog(false);
    }
  };

  const columns: DataTableColumn<V1Instrument>[] = [
    {
      id: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (instrument) => <Typography fontWeight={700}>{instrument.symbol}</Typography>,
    },
    { id: 'name', label: 'Company', sortable: true, render: (instrument) => instrument.company_name },
    { id: 'providerSymbol', label: 'Provider Symbol', render: (instrument) => instrument.provider_symbol || instrument.symbol },
    { id: 'exchange', label: 'Exchange', sortable: true, render: (instrument) => <StatusBadge label={instrument.exchange || 'UNKNOWN'} /> },
    { id: 'assetType', label: 'Asset Type', sortable: true, render: (instrument) => <StatusBadge label={formatAssetType(instrument.asset_type)} /> },
    { id: 'instrumentSegment', label: 'Segment/Class', render: (instrument) => <StatusBadge label={instrument.instrument_segment || 'UNKNOWN'} /> },
    { id: 'derivativesEligible', label: 'F&O Eligible', render: (instrument) => <StatusBadge label={instrument.derivatives_eligible ? 'YES' : 'NO'} /> },
    {
      id: 'providerSupport',
      label: 'Provider Support',
      render: (instrument) => (
        <Tooltip title={(instrument.provider_support_status || 'UNKNOWN') === 'UNKNOWN' ? 'Provider support has not been validated yet.' : instrument.provider_error || ''} arrow>
          <span><StatusBadge label={instrument.provider_support_status || 'UNKNOWN'} /></span>
        </Tooltip>
      ),
    },
    { id: 'catalogSource', label: 'Catalog Source', render: (instrument) => formatCatalogSource(instrument.catalog_source) },
    { id: 'currency', label: 'Currency', sortable: true, render: (instrument) => instrument.currency },
    { id: 'sector', label: 'Sector', sortable: true, render: (instrument) => instrument.sector || 'Missing' },
    { id: 'industry', label: 'Industry', sortable: true, render: (instrument) => instrument.industry || 'Missing' },
    { id: 'marketCap', label: 'Market Cap', sortable: true, align: 'right', render: (instrument) => formatMarketCap(instrument.market_cap) },
    {
      id: 'metadata',
      label: 'Metadata',
      render: (instrument) => {
        const missing = instrument.missing_metadata_fields || [];
        return (
          <Tooltip title={missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Metadata complete'} arrow>
            <Chip size="small" label={`${instrument.metadata_completeness_score ?? 0}%`} color={missing.length > 0 ? 'warning' : 'success'} variant="outlined" />
          </Tooltip>
        );
      },
    },
    { id: 'dataStatus', label: 'Status', render: (instrument) => <StatusBadge label={instrument.data_status} /> },
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

  const activeFilters = [
    search.trim() ? `Search = ${search.trim()}` : null,
    exchange.trim() ? `Exchange = ${exchange.trim().toUpperCase()}` : null,
    assetType.trim() ? `Asset Type = ${assetType.trim().toUpperCase()}` : null,
    instrumentSegment.trim() ? `Segment = ${instrumentSegment.trim().toUpperCase()}` : null,
    currency.trim() ? `Currency = ${currency.trim().toUpperCase()}` : null,
    sector.trim() ? `Sector contains "${sector.trim()}"` : null,
    industry.trim() ? `Industry contains "${industry.trim()}"` : null,
    dataStatus.trim() ? `Status = ${dataStatus.trim().toUpperCase()}` : null,
    catalogSource.trim() ? `Catalog Source = ${catalogSource.trim().toUpperCase()}` : null,
    providerSupportStatus.trim() ? `Provider Support = ${providerSupportStatus.trim().toUpperCase()}` : null,
    derivativesEligible ? `F&O Eligible = ${derivativesEligible === 'true' ? 'YES' : 'NO'}` : null,
  ].filter((item): item is string => Boolean(item));
  const hasLocalFilters = activeFilters.length > 0;
  const availableCatalogSources = catalogSources.length > 0 ? catalogSources : fallbackCatalogSources;
  const selectedCatalogSource = availableCatalogSources.find((source) => source.catalogSource === importSource);
  const importAvailable = importMode === 'MANUAL_CSV'
    || (importMode === 'CONFIGURED_URL' && selectedCatalogSource?.supportsConfiguredUrl === true)
    || (importMode === 'INTERNAL_SEED' && selectedCatalogSource?.supportsInternalSeed === true);
  const scopeLabel = `${scope.region === 'GLOBAL' ? 'Global / All' : scope.region} / All asset types`;
  const emptyMessage = hasLocalFilters
    ? `No instruments match ${activeFilters.join(', ')} in ${scopeLabel}.`
    : `No instruments found for ${scopeLabel}.`;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
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

      <MarketDataStatusPanel region={scope.region} />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Market is controlled by the global header selector: <strong>{scope.region === 'GLOBAL' ? 'Global / All' : scope.region}</strong>
          {normalizedMarket ? ` (${normalizedMarket})` : ' (all markets)'}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField select size="small" label="Import Mode" value={importMode} onChange={(event) => setImportMode(event.target.value as 'CONFIGURED_URL' | 'MANUAL_CSV' | 'INTERNAL_SEED')} sx={{ minWidth: 180 }}>
              {(!selectedCatalogSource || selectedCatalogSource.supportsConfiguredUrl) && <MenuItem value="CONFIGURED_URL">Configured URL</MenuItem>}
              {selectedCatalogSource?.supportsInternalSeed && <MenuItem value="INTERNAL_SEED">Internal Seed</MenuItem>}
              {(!selectedCatalogSource || selectedCatalogSource.supportsManualCsv) && <MenuItem value="MANUAL_CSV">Manual CSV</MenuItem>}
            </TextField>
            <TextField select size="small" label="Catalog Source" value={importSource} onChange={(event) => handleImportSourceChange(event.target.value)} sx={{ minWidth: 260 }}>
              {availableCatalogSources.map((item) => <MenuItem key={item.catalogSource} value={item.catalogSource}>{item.displayName || item.catalogSource}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Provider Validation" value={validateProvider ? 'true' : 'false'} onChange={(event) => setValidateProvider(event.target.value === 'true')} sx={{ minWidth: 180 }}>
              <MenuItem value="false">Skip validation</MenuItem>
              <MenuItem value="true">Validate batch</MenuItem>
            </TextField>
            <Button variant="outlined" startIcon={importingCatalog ? <CircularProgress size={18} /> : <SyncIcon />} onClick={handleCatalogImport} disabled={importingCatalog || !importAvailable}>
              {importingCatalog ? 'Importing...' : 'Import Catalog'}
            </Button>
            <Button variant="outlined" startIcon={backfillingCatalog ? <CircularProgress size={18} /> : <SyncIcon />} onClick={handleCatalogBackfill} disabled={backfillingCatalog}>
              {backfillingCatalog ? 'Backfilling...' : 'Backfill Metadata'}
            </Button>
          </Stack>
          {selectedCatalogSource && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={selectedCatalogSource.region} />
              {selectedCatalogSource.assetType && <Chip size="small" label={selectedCatalogSource.assetType} />}
              {selectedCatalogSource.segmentClass && <Chip size="small" label={selectedCatalogSource.segmentClass} />}
              {selectedCatalogSource.supportsInternalSeed ? (
                <Chip size="small" color="success" label="Uses built-in seed list" />
              ) : (
                <Chip size="small" color={selectedCatalogSource.urlConfigured ? 'success' : 'warning'} label={`URL configured: ${selectedCatalogSource.urlConfigured ? 'Yes' : 'No'}`} />
              )}
              <Chip size="small" label={`Source: ${selectedCatalogSource.urlSource === 'ENV' ? 'Env' : selectedCatalogSource.urlSource === 'DEFAULT' ? 'Default' : selectedCatalogSource.urlSource === 'INTERNAL_SEED' ? 'Internal Seed' : 'Manual setup'}`} />
            </Stack>
          )}
          {importMode === 'CONFIGURED_URL' && selectedCatalogSource && !selectedCatalogSource.urlConfigured && (
            <Alert severity="warning">{selectedCatalogSource.setupHint || 'No configured URL for this source. Use Manual CSV or configure the source URL.'}</Alert>
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

      <Box sx={{ mb: 2 }}>
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
          <TextField size="small" label="Sector" value={sector} onChange={(event) => { setSector(event.target.value); setPage(0); }} />
          <TextField size="small" label="Industry" value={industry} onChange={(event) => { setIndustry(event.target.value); setPage(0); }} />
          <TextField select size="small" label="Status" value={dataStatus} onChange={(event) => { setDataStatus(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['COMPLETE', 'PARTIAL', 'DELAYED', 'MISSING', 'ERROR'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Provider Support" value={providerSupportStatus} onChange={(event) => { setProviderSupportStatus(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN', 'VALIDATION_FAILED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Catalog Source" value={catalogSource} onChange={(event) => { setCatalogSource(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['MANUAL', 'LEGACY_NIFTY500', 'LEGACY_DATABASE', 'NSE_EQUITY_SECURITIES', 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS', 'NSE_INDEX_SEED', 'NSE_ETF_SECURITIES', 'BSE_EQUITY_SECURITIES', 'BROKER_SCRIP_MASTER', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{formatCatalogSource(item)}</MenuItem>)}
          </TextField>
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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {catalogImportProgress && <Alert severity="info" sx={{ mb: 2 }}>{catalogImportProgress}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

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
        onRowClick={(instrument) => navigate(`/stocks/${instrument.id}`)}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(0);
        }}
      />
    </Box>
  );
};

export default MarketDataFoundationPage;
