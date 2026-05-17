import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import {
  fetchActiveMarketDataPriceBackfillRun,
  fetchMarketDataSchedulerStatus,
  syncMarketData,
  type V1SyncResponse,
} from '../api/marketDataFoundationService';
import type {
  MarketDataCatalogSyncRunStatus,
  MarketDataPriceBackfillRunResponse,
  MarketDataSchedulerStatus,
} from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const activeBackgroundStatuses: MarketDataCatalogSyncRunStatus[] = ['PENDING', 'RUNNING'];
const isBackgroundRunActive = (status?: MarketDataCatalogSyncRunStatus) => Boolean(status && activeBackgroundStatuses.includes(status));

const DataIngestion: React.FC = () => {
  const { scope } = useMarketScope();
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<MarketDataSchedulerStatus | null>(null);
  const [activePriceBackfillRun, setActivePriceBackfillRun] = useState<MarketDataPriceBackfillRunResponse | null>(null);
  const [result, setResult] = useState<V1SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const priceBackfillActive = isBackgroundRunActive(activePriceBackfillRun?.status);
  const schedulerActive = schedulerStatus?.activeRun === true;
  const backgroundLoadActive = priceBackfillActive || schedulerActive;

  const loadBackgroundStatus = useCallback(async () => {
    const [nextSchedulerStatus, nextPriceBackfillRun] = await Promise.all([
      fetchMarketDataSchedulerStatus().catch(() => undefined),
      fetchActiveMarketDataPriceBackfillRun({
        region: scope.region,
        assetType: scope.assetType,
      }).catch(() => undefined),
    ]);
    if (nextSchedulerStatus !== undefined) setSchedulerStatus(nextSchedulerStatus);
    if (nextPriceBackfillRun !== undefined) setActivePriceBackfillRun(nextPriceBackfillRun);
  }, [scope.assetType, scope.region]);

  useEffect(() => {
    let canceled = false;
    const refresh = async () => {
      if (canceled) return;
      await loadBackgroundStatus();
    };
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [loadBackgroundStatus]);

  const handleSync = async () => {
    if (!symbol.trim()) {
      setError('Symbol is required.');
      return;
    }
    if (backgroundLoadActive) {
      setError('Background market-data load is running. Manual sync is disabled until it completes.');
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
            disabled={loading || backgroundLoadActive}
          />
          <TextField
            label="Exchange"
            value={exchange}
            onChange={(event) => setExchange(event.target.value.toUpperCase())}
            placeholder="NASDAQ"
            disabled={loading || backgroundLoadActive}
          />
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={loading || backgroundLoadActive || !symbol.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            sx={{ minWidth: 150, height: 56 }}
          >
            {loading ? 'Syncing...' : backgroundLoadActive ? 'Data Load Running' : 'Sync'}
          </Button>
        </Box>
      </Paper>

      {backgroundLoadActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              Background market-data load is running. Manual ingestion is disabled to avoid duplicate provider requests.
            </Typography>
            {priceBackfillActive && activePriceBackfillRun && (
              <>
                <Typography variant="caption">
                  Price backfill {activePriceBackfillRun.status}: processed {activePriceBackfillRun.processedCount} / {activePriceBackfillRun.totalCount}; remaining {activePriceBackfillRun.remainingCandidates}; batch {activePriceBackfillRun.currentBatchNumber}.
                </Typography>
                <LinearProgress
                  aria-label="Background price backfill progress"
                  variant={(activePriceBackfillRun.totalCount ?? 0) > 0 ? 'determinate' : 'indeterminate'}
                  value={(activePriceBackfillRun.totalCount ?? 0) > 0 ? Math.min(100, Math.max(0, activePriceBackfillRun.percentComplete ?? 0)) : undefined}
                />
              </>
            )}
            {schedulerActive && (
              <>
                <Typography variant="caption">
                  Latest-day candle scheduler is checking market data. Last run {schedulerStatus?.lastRunAt || 'starting'}.
                </Typography>
                <LinearProgress aria-label="Latest-day candle scheduler progress" />
              </>
            )}
          </Stack>
        </Alert>
      )}

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
