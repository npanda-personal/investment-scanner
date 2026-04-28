import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import PublicIcon from '@mui/icons-material/Public';
import CloseIcon from '@mui/icons-material/Close';
import {
  Stock,
  fetchStocks,
  deleteStock,
  toggleStockActive,
  syncStockData,
  syncAllStocks,
  externalSearch,
  createStock,
  yahooSearch,
} from '../api/marketDataFoundationService';


// Exchange-to-region mapping for determining which tab a stock belongs to.
// The exchange field from Yahoo Finance is more reliable than the region field.
const EXCHANGE_TO_REGION: Record<string, string> = {
  // Indian exchanges
  NSE: 'IN',
  BSE: 'IN',
  // US exchanges
  NYSE: 'US',
  NASDAQ: 'US',
  NYSEARCA: 'US',
  NYSEMKT: 'US',
  // Hong Kong
  HKG: 'HK',
  // European
  XETRA: 'EU',
  EURONEXT: 'EU',
  AMS: 'EU',
  LSE: 'UK',
  BORSA_ITALIANA: 'EU',
  // Canadian
  TSX: 'CA',
  TSXV: 'CA',
};

const EXCHANGE_REGION_LABELS: Record<string, string> = {
  IN: 'India (IN)',
  US: 'United States (US)',
  HK: 'Hong Kong (HK)',
  EU: 'Europe (EU)',
  UK: 'United Kingdom (UK)',
  CA: 'Canada (CA)',
};

/**
 * Map an exchange code to a region code.
 * Uses the exchange-to-region mapping first.
 * Falls back to the Yahoo Finance region field if exchange is unknown.
 */
function mapExchangeToRegion(exchange: string | undefined, _fallbackRegion: string | undefined): string {
  if (exchange) {
    const upperExchange = exchange.toUpperCase();
    if (EXCHANGE_TO_REGION[upperExchange]) {
      return EXCHANGE_TO_REGION[upperExchange];
    }
  }
  // If exchange is not in our mapping, return empty string (unmapped)
  return '';
}

const MarketDataFoundationPage: React.FC = () => {
  const theme = useTheme();

  // Tabs state
  const [tabValue, setTabValue] = useState(0);
  const [regions, setRegions] = useState<string[]>(['IN', 'US']);
  const regionLabels: Record<string, string> = { ...EXCHANGE_REGION_LABELS };

  // Table state
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkSyncLoading, setBulkSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Table search filter (local DB)
  const [search, setSearch] = useState('');

  // Global search (Yahoo Finance)
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSearched, setGlobalSearched] = useState(false);

  // Per-stock sync loading state (keyed by stock symbol)
  const [syncingStocks, setSyncingStocks] = useState<Record<string, boolean>>({});

  // Set of symbols already in DB (to disable "+" button)
  const [existingSymbols, setExistingSymbols] = useState<Set<string>>(new Set());

  // External search dialog (legacy)
  const [externalSearchOpen, setExternalSearchOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);

  const currentRegion = regions[tabValue];

  // Load all existing symbols from DB for "+" button disable logic
  const loadExistingSymbols = useCallback(async () => {
    try {
      const response = await fetchStocks({ pageSize: 10000 });
      const symbols = new Set<string>(response.stocks.map((s: Stock) => s.symbol));
      setExistingSymbols(symbols);
    } catch (err) {
      console.error('Failed to load existing symbols:', err);
    }
  }, []);

  const loadStocks = async (regionOverride?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStocks({
        page: page + 1, // backend uses 1-based page
        pageSize,
        sortBy,
        sortOrder,
        region: regionOverride ?? currentRegion,
        search: search.trim() || undefined,
      });
      setStocks(response.stocks);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, [page, pageSize, sortBy, sortOrder, currentRegion, search]);

  // Load existing symbols on mount and when stocks change
  useEffect(() => {
    loadExistingSymbols();
  }, [stocks, loadExistingSymbols]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // reset to first page when switching region
  };

  const handleSort = (property: string) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
    setPage(0);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stock?')) return;
    try {
      await deleteStock(id);
      await loadStocks(); // refresh
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleStockActive(id);
      await loadStocks();
    } catch (err: any) {
      setError(err.message || 'Toggle failed');
    }
  };

  const handleSync = async (id: string, symbol: string) => {
    setSyncingStocks(prev => ({ ...prev, [symbol]: true }));
    try {
      await syncStockData(id);
      await loadStocks();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncingStocks(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleBulkSync = async () => {
    setBulkSyncLoading(true);
    setError(null);
    try {
      const result = await syncAllStocks();
      if (result.success) {
        console.log(`Bulk sync completed: ${result.message}`);
        await loadStocks();
      } else {
        setError(result.message || 'Bulk sync failed');
      }
    } catch (err: any) {
      setError(err.message || 'Bulk sync failed');
    } finally {
      setBulkSyncLoading(false);
    }
  };

  // Global search handler - triggered by button click or Enter key
  const handleGlobalSearch = async () => {
    if (!globalQuery.trim()) return;
    setGlobalLoading(true);
    setGlobalSearched(true);
    setError(null);
    try {
      const results = await yahooSearch(globalQuery);
      setGlobalResults(results);
    } catch (err: any) {
      setError('Global search failed: ' + err.message);
      setGlobalResults([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Handle adding a stock from global search results
  const handleAddFromGlobal = async (result: any) => {
    // Use exchange-to-region mapping first, fall back to Yahoo's region field
    const region = mapExchangeToRegion(result.exchange, result.region);

    try {
      // Create the stock
      const newStock = await createStock({
        symbol: result.symbol,
        name: result.name || result.symbol,
        region,
        exchange: result.exchange || 'N/A',
      });

      // If region is not already in the tabs list, add a new tab
      if (!regions.includes(region)) {
        setRegions(prev => [...prev, region]);
      }

      // Switch to the appropriate tab
      const tabIndex = regions.indexOf(region);
      if (tabIndex >= 0) {
        setTabValue(tabIndex);
      } else {
        // Newly added region - switch to the last tab (after state update)
        setTabValue(regions.length);
      }

      // Mark this stock as syncing
      setSyncingStocks(prev => ({ ...prev, [result.symbol]: true }));

      // Auto-trigger historical price loading
      try {
        await syncStockData(newStock.id);
      } catch (syncErr: any) {
        console.error(`Sync failed for ${result.symbol}:`, syncErr);
      } finally {
        setSyncingStocks(prev => ({ ...prev, [result.symbol]: false }));
      }

      // Refresh the stock list using the target region directly (avoids stale closure bug)
      await loadStocks(region);
      await loadExistingSymbols();

      // Remove this result from the global results list
      setGlobalResults(prev => prev.filter(r => r.symbol !== result.symbol));

    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        // Stock already exists - just update existing symbols and disable the button
        await loadExistingSymbols();
      } else {
        setError('Failed to add stock: ' + err.message);
      }
    }
  };

  const handleExternalSearch = async () => {
    if (!externalQuery.trim()) return;
    setExternalLoading(true);
    try {
      const results = await externalSearch(externalQuery);
      setExternalResults(results);
    } catch (err: any) {
      setError('External search failed: ' + err.message);
    } finally {
      setExternalLoading(false);
    }
  };

  const handleAddFromExternal = async (result: any) => {
    try {
      await createStock({
        symbol: result.symbol,
        name: result.name || result.symbol,
        region: result.region || currentRegion,
        exchange: result.exchange || 'N/A',
      });
      setExternalSearchOpen(false);
      setExternalQuery('');
      setExternalResults([]);
      await loadStocks();
    } catch (err: any) {
      setError('Failed to add stock: ' + err.message);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRegionLabel = (region: string) => {
    return regionLabels[region] || `${region}`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Market Data Foundation
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage market instruments, end-of-day prices, historical data sync, and foundational market data coverage.
      </Typography>

      {/* Global Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PublicIcon color="primary" />
          <TextField
            fullWidth
            placeholder="Global Search - search for any stock..."
            variant="outlined"
            size="small"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGlobalSearch();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (globalQuery || globalSearched) ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setGlobalQuery('');
                      setGlobalResults([]);
                      setGlobalSearched(false);
                    }}
                    edge="end"
                    sx={{ mr: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
          <Button
            variant="contained"
            onClick={handleGlobalSearch}
            disabled={globalLoading || !globalQuery.trim()}
            startIcon={globalLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            sx={{ minWidth: 120, height: 40 }}
          >
            {globalLoading ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {/* Global Search Results */}
        {globalSearched && (
          <Box sx={{ mt: 2 }}>
            {globalLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : globalResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                No results found. Try a different search term.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Symbol</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Exchange</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Region</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {globalResults.map((result, idx) => {
                      const isAlreadyAdded = existingSymbols.has(result.symbol);
                      const isSyncing = syncingStocks[result.symbol];
                      const mappedRegion = mapExchangeToRegion(result.exchange, result.region);
                      const regionUnmapped = !mappedRegion;
                      return (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {result.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell>{result.name}</TableCell>
                          <TableCell>
                            <Chip label={result.exchange || 'N/A'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={mappedRegion || 'Unmapped'}
                              size="small"
                              color={mappedRegion === 'IN' ? 'success' : mappedRegion === 'US' ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {isSyncing ? (
                              <CircularProgress size={24} />
                            ) : (
                              <Tooltip title={regionUnmapped ? 'Cannot add: unknown region' : isAlreadyAdded ? 'Already in database' : 'Add this stock'}>
                                <span>
                                  <Button
                                    size="small"
                                    variant={isAlreadyAdded || regionUnmapped ? 'outlined' : 'contained'}
                                    color={isAlreadyAdded || regionUnmapped ? 'inherit' : 'primary'}
                                    disabled={isAlreadyAdded || regionUnmapped}
                                    onClick={() => handleAddFromGlobal(result)}
                                    startIcon={isAlreadyAdded || regionUnmapped ? undefined : <AddIcon />}
                                  >
                                    {isAlreadyAdded ? 'Added' : regionUnmapped ? 'N/A' : '+'}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* Region Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          {regions.map((region) => (
            <Tab key={region} label={getRegionLabel(region)} />
          ))}
        </Tabs>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
        <TextField
          placeholder="Search symbol or name..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={bulkSyncLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={handleBulkSync}
            disabled={bulkSyncLoading || loading}
            sx={{ mr: 2 }}
          >
            {bulkSyncLoading ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setExternalSearchOpen(true)}
          >
            Add Stock
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === 'symbol' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'symbol'}
                  direction={sortBy === 'symbol' ? sortOrder : 'asc'}
                  onClick={() => handleSort('symbol')}
                >
                  Symbol
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'name' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Exchange</TableCell>
              <TableCell>Last Data Load</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No stocks found. Try adding some.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((stock) => (
                <TableRow key={stock.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {stock.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>{stock.name}</TableCell>
                  <TableCell>
                    <Chip label={stock.exchange} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(stock.lastSuccessfulDataLoadTimestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Switch
                        checked={stock.isActive}
                        onChange={() => handleToggleActive(stock.id)}
                        size="small"
                      />
                      <Chip
                        label={stock.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={stock.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {syncingStocks[stock.symbol] ? (
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                    ) : (
                      <IconButton
                        color="primary"
                        title="Sync data"
                        onClick={() => handleSync(stock.id, stock.symbol)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <SyncIcon />
                      </IconButton>
                    )}
                    <IconButton
                      color="error"
                      title="Delete"
                      onClick={() => handleDelete(stock.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setPageSize(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Rows per page:"
      />

      {/* External Search Dialog */}
      <Dialog open={externalSearchOpen} onClose={() => setExternalSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Stock via External Search</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Search for stocks using Yahoo Finance API. Select a result to add it to the database.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Enter symbol or company name..."
              value={externalQuery}
              onChange={(e) => setExternalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
            />
            <Button
              variant="contained"
              onClick={handleExternalSearch}
              disabled={externalLoading}
              startIcon={externalLoading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              Search
            </Button>
          </Box>
          {externalResults.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Exchange</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {externalResults.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{result.symbol}</TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.exchange}</TableCell>
                      <TableCell>{result.type}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAddFromExternal(result)}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExternalSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MarketDataFoundationPage;
