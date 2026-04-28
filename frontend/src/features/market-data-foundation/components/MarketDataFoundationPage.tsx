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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import {
  fetchInstruments,
  syncAllStocks,
  syncMarketData,
  type V1Instrument,
} from '../api/marketDataFoundationService';
import MarketDataStatusPanel from './MarketDataStatusPanel';

const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();

const MarketDataFoundationPage: React.FC = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<V1Instrument[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
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
      const response = await fetchInstruments(search.trim() || undefined);
      setInstruments(response.instruments);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

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

  const visibleInstruments = instruments.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Market Data Foundation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Explore instruments, prices, fundamentals, corporate actions, and manual data sync status.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/market-data-foundation/add')}>
            Add Instrument
          </Button>
        </Box>
      </Box>

      <MarketDataStatusPanel />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            fullWidth
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
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            onClick={loadInstruments}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell>Exchange</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Asset Type</TableCell>
              <TableCell>Data Status</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : visibleInstruments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No instruments found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleInstruments.map((instrument) => (
                <TableRow
                  key={instrument.id}
                  hover
                  onClick={() => navigate(`/market-data-foundation/${instrument.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography fontWeight={700}>{instrument.symbol}</Typography>
                  </TableCell>
                  <TableCell>{instrument.company_name}</TableCell>
                  <TableCell><Chip label={instrument.exchange || 'UNKNOWN'} size="small" variant="outlined" /></TableCell>
                  <TableCell>{instrument.currency}</TableCell>
                  <TableCell>{instrument.asset_type}</TableCell>
                  <TableCell><Chip label={instrument.data_status} size="small" color={instrument.data_status === 'COMPLETE' ? 'success' : 'warning'} variant="outlined" /></TableCell>
                  <TableCell>{formatTimestamp(instrument.last_updated_timestamp)}</TableCell>
                  <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                    <Tooltip title="Sync market data">
                      <span>
                        <IconButton
                          color="primary"
                          disabled={syncingId === instrument.id}
                          onClick={() => handleSync(instrument)}
                        >
                          {syncingId === instrument.id ? <CircularProgress size={22} /> : <SyncIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total || instruments.length}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setPageSize(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default MarketDataFoundationPage;
