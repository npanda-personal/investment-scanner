import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { ingestSymbol, fetchPrices, HistoricalPrice } from '../../services/dataService';

const DataIngestion: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [prices, setPrices] = useState<HistoricalPrice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleIngest = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    setIngestResult(null);
    try {
      const result = await ingestSymbol(symbol);
      setIngestResult(result);
      // After ingestion, fetch prices
      await handleFetchPrices();
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPrices = async () => {
    if (!symbol.trim()) return;
    try {
      const result = await fetchPrices(symbol);
      setPrices(result.prices);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch prices: ' + err.message);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Data Ingestion from Yahoo Finance
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Enter a stock symbol (e.g., AAPL, VOW.DE) to ingest historical price data and display the latest prices.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 4 }}>
        <TextField
          label="Symbol"
          variant="outlined"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL"
          disabled={loading}
          sx={{ width: 200 }}
        />
        <Button
          variant="contained"
          onClick={handleIngest}
          disabled={loading || !symbol.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Ingesting...' : 'Ingest Data'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleFetchPrices}
          disabled={loading || !symbol.trim()}
        >
          Refresh Prices
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {ingestResult && (
        <Alert severity={ingestResult.success ? 'success' : 'info'} sx={{ mb: 3 }}>
          {ingestResult.message}
        </Alert>
      )}

      {prices.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Latest Prices for {symbol}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Open</TableCell>
                  <TableCell align="right">High</TableCell>
                  <TableCell align="right">Low</TableCell>
                  <TableCell align="right">Close</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Exchange</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prices.map((price, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(price.timestamp).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{price.open.toFixed(2)}</TableCell>
                    <TableCell align="right">{price.high.toFixed(2)}</TableCell>
                    <TableCell align="right">{price.low.toFixed(2)}</TableCell>
                    <TableCell align="right">{price.close.toFixed(2)}</TableCell>
                    <TableCell align="right">{price.volume.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={price.region} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={price.exchange} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">
            Showing {prices.length} most recent price ticks.
          </Typography>
        </>
      )}

      {prices.length === 0 && !loading && ingestResult && (
        <Typography variant="body2" color="text.secondary">
          No price data found for {symbol}. Try ingesting first.
        </Typography>
      )}
    </Box>
  );
};

export default DataIngestion;