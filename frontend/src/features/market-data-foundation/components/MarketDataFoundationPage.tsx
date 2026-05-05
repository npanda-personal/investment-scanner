import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tabs,
  Tab,
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
  fetchInstruments,
  syncAllStocks,
  syncMarketData,
  type V1Instrument,
} from '../api/marketDataFoundationService';
import MarketDataStatusPanel from './MarketDataStatusPanel';
import { DataTable, FilterBar, PageHeader, StatusBadge, type DataTableColumn, type SortDirection } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();
const formatMarketCap = (value: number | null) => value === null ? 'N/A' : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const marketTabs = [
  { label: 'Default', value: 'SCOPE' },
  { label: 'All / Global', value: 'GLOBAL' },
  { label: 'US', value: 'US' },
  { label: 'India', value: 'IN' },
  { label: 'Europe', value: 'EU' },
];

const MarketDataFoundationPage: React.FC = () => {
  const navigate = useNavigate();
  const { scope } = useMarketScope();
  const [instruments, setInstruments] = useState<V1Instrument[]>([]);
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('SCOPE');
  const [exchange, setExchange] = useState('');
  const [assetType, setAssetType] = useState('');
  const [currency, setCurrency] = useState('');
  const [sector, setSector] = useState('');
  const [industry, setIndustry] = useState('');
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

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedRegion = market === 'SCOPE' ? scope.region : (market === 'GLOBAL' ? undefined : market);
      
      const response = await fetchInstruments({
        page: page + 1,
        pageSize,
        sortBy,
        sortOrder: sortDirection,
        region: selectedRegion,
        exchange: exchange.trim() || undefined,
        assetType: assetType.trim() || scope.assetType,
        currency: currency.trim() || undefined,
        sector: sector.trim() || undefined,
        industry: industry.trim() || undefined,
        search: search.trim() || undefined,
      });
      setInstruments(response.instruments);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, [assetType, currency, exchange, industry, market, page, pageSize, search, sector, sortBy, sortDirection, scope.region, scope.assetType]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  useEffect(() => {
    // Reset page when global scope changes
    setPage(0);
  }, [scope.region, scope.assetType]);

  const handleSync = async (instrument: V1Instrument) => {
    setSyncingId(instrument.id);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncMarketData({ instrumentId: instrument.id });
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
      const result = await syncAllStocks(4, 4, 3000);
      if (!result.success) {
        setError(result.message || 'Catalog sync failed');
      } else {
        const summary = [
          result.succeeded !== undefined ? `${result.succeeded} succeeded` : null,
          result.failed !== undefined ? `${result.failed} failed` : null,
        ].filter(Boolean).join(', ');
        setSuccess(summary ? `${result.message} (${summary})` : result.message);
        await loadInstruments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Catalog sync failed');
    } finally {
      setCatalogSyncing(false);
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
    { id: 'exchange', label: 'Exchange', sortable: true, render: (instrument) => <StatusBadge label={instrument.exchange || 'UNKNOWN'} /> },
    { id: 'country', label: 'Country', sortable: true, render: (instrument) => instrument.country || 'N/A' },
    { id: 'currency', label: 'Currency', sortable: true, render: (instrument) => instrument.currency },
    { id: 'assetType', label: 'Asset Type', sortable: true, render: (instrument) => instrument.asset_type },
    { id: 'sector', label: 'Sector', sortable: true, render: (instrument) => instrument.sector || 'N/A' },
    { id: 'marketCap', label: 'Market Cap', sortable: true, align: 'right', render: (instrument) => formatMarketCap(instrument.market_cap) },
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
    setMarket('');
    setExchange('');
    setAssetType('');
    setCurrency('');
    setSector('');
    setIndustry('');
    setPage(0);
  };

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

      <MarketDataStatusPanel />

      <Paper sx={{ mb: 2 }}>
        <Tabs value={market} onChange={(_event, value) => { setMarket(value); setPage(0); }} variant="scrollable" scrollButtons="auto">
          {marketTabs.map((tab) => <Tab key={tab.label} label={tab.label} value={tab.value} />)}
        </Tabs>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <FilterBar onReset={resetFilters}>
          <TextField
            sx={{ minWidth: { md: 320 }, flex: 1 }}
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
          <TextField size="small" label="Exchange" value={exchange} onChange={(event) => { setExchange(event.target.value); setPage(0); }} sx={{ minWidth: 140 }} />
          <TextField select size="small" label="Asset Type" value={assetType} onChange={(event) => { setAssetType(event.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['EQUITY', 'ETF', 'INDEX', 'FX'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Currency" value={currency} onChange={(event) => { setCurrency(event.target.value.toUpperCase()); setPage(0); }} sx={{ minWidth: 120 }} />
          <TextField size="small" label="Sector" value={sector} onChange={(event) => { setSector(event.target.value); setPage(0); }} sx={{ minWidth: 180 }} />
          <TextField size="small" label="Industry" value={industry} onChange={(event) => { setIndustry(event.target.value); setPage(0); }} sx={{ minWidth: 180 }} />
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            onClick={loadInstruments}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Refresh
          </Button>
        </FilterBar>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <DataTable
        columns={columns}
        rows={instruments}
        getRowId={(instrument) => instrument.id}
        loading={loading}
        emptyMessage="No instruments found for the selected market and filters."
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
