import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { syncMarketData, type V1SyncResponse } from '../api/marketDataFoundationService';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const DataIngestion: React.FC = () => {
  const { scope } = useMarketScope();
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<V1SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!symbol.trim()) {
      setError('Symbol is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await syncMarketData({
        symbol: symbol.trim().toUpperCase(),
        region: scope.region,
        exchange: exchange.trim().toUpperCase() || undefined,
        asset_type: scope.assetType,
      });
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Market data sync failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Market Data Ingestion
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Trigger a manual sync from the configured free market data provider for the global header market: {scope.region}.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            required
            label="Symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="AAPL"
            disabled={loading}
          />
          <TextField
            label="Exchange"
            value={exchange}
            onChange={(event) => setExchange(event.target.value.toUpperCase())}
            placeholder="NASDAQ"
            disabled={loading}
          />
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={loading || !symbol.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            sx={{ minWidth: 150, height: 56 }}
          >
            {loading ? 'Syncing...' : 'Sync'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {result && (
        <Alert severity={result.success ? 'success' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">{result.message}</Typography>
          {result.instrument && (
            <Typography variant="caption" display="block">
              {result.instrument.symbol} | prices: {result.pricesStored ? 'stored' : 'not stored'} | fundamentals: {result.fundamentalsAvailable ? 'available' : 'not available'} | actions: {result.corporateActionsAvailable ? 'available' : 'not available'}
            </Typography>
          )}
          {result.syncSummary && (
            <Typography variant="caption" display="block">
              rows received: {result.syncSummary.rowsReceived} | inserted: {result.syncSummary.rowsInserted} | updated: {result.syncSummary.rowsUpdated} | skipped: {result.syncSummary.rowsSkipped} | warnings: {result.syncSummary.warningCount}
            </Typography>
          )}
          {result.errors?.map((item) => (
            <Typography key={item} variant="caption" display="block">{item}</Typography>
          ))}
        </Alert>
      )}
    </Box>
  );
};

export default DataIngestion;
