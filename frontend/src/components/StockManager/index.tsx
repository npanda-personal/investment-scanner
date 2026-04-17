import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Stock,
  fetchStocks,
  deleteStock,
  toggleStockActive,
  syncStockData,
  externalSearch,
  createStock,
} from '../../services/stockService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const StockManager: React.FC = () => {
  // Tabs state
  const [tabValue, setTabValue] = useState(0);
  const regions = ['IN', 'US'];
  const regionLabels = ['India (IN)', 'United States (US)'];

  // Table state
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Search filter
  const [search, setSearch] = useState('');

  // External search dialog
  const [externalSearchOpen, setExternalSearchOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);

  const currentRegion = regions[tabValue];

  const loadStocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStocks({
        page: page + 1, // backend uses 1-based page
        pageSize,
        sortBy,
        sortOrder,
        region: currentRegion,
        search: search.trim() || undefined,
      });
      setStocks(response.stocks);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, [page, pageSize, sortBy, sortOrder, currentRegion, search]);

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

  const handleSync = async (id: string) => {
    try {
      await syncStockData(id);
      await loadStocks();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
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
        name: result.name || result.symbol, // fallback to symbol if name empty
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

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Stock Management Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage stocks from different markets. Toggle active status, trigger data sync, or add new stocks via external search.
      </Typography>

      {/* Region Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          {regions.map((region, idx) => (
            <Tab key={region} label={regionLabels[idx]} />
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
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStocks}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
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
                    <IconButton
                      color="primary"
                      title="Sync data"
                      onClick={() => handleSync(stock.id)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <SyncIcon />
                    </IconButton>
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
              onKeyPress={(e) => e.key === 'Enter' && handleExternalSearch()}
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

export default StockManager;