import React, { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import {
  fetchMarketDataHealth,
  fetchMarketDataSchedulerStatus,
  type MarketDataHealth,
  type MarketDataSchedulerRegionStatus,
} from '../api/marketDataFoundationService';
import { normalizeMarketForApi } from '../api/marketScopeApi';

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return 'No market data loaded';
  return new Date(timestamp).toLocaleString();
};

const formatCandleStatus = (status: MarketDataSchedulerRegionStatus | null) => {
  if (!status) return 'Unavailable';
  if (status.candleSyncStatus === 'CURRENT') return `Current through ${status.latestCompletedTradingDate}`;
  if (status.candleSyncStatus === 'MISSING_LATEST_COMPLETED') return `Missing ${status.latestCompletedTradingDate}`;
  if (status.candleSyncStatus === 'NO_STORED_CANDLES') return 'No candles stored';
  if (status.candleSyncStatus === 'TODAY_STORED_PENDING_FINAL_CONFIRMATION') return `Today stored, pending final`;
  return 'Unknown';
};

interface MarketDataStatusPanelProps {
  region?: string;
  assetType?: string;
}

const MarketDataStatusPanel: React.FC<MarketDataStatusPanelProps> = ({ region, assetType }) => {
  const [status, setStatus] = useState<MarketDataHealth | null>(null);
  const [candleStatus, setCandleStatus] = useState<MarketDataSchedulerRegionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    Promise.all([
      fetchMarketDataHealth({ region, assetType }),
      fetchMarketDataSchedulerStatus().catch(() => null),
    ])
      .then(([result, schedulerStatus]) => {
        if (!mounted) return;
        setStatus(result);
        const normalizedRegion = normalizeMarketForApi(region);
        setCandleStatus(schedulerStatus?.regionStatuses.find((item) => item.region === normalizedRegion) ?? null);
      })
      .catch((err: any) => {
        if (mounted) setError(err.response?.data?.error || err.message || 'Unable to load market data status');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [region, assetType]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">Loading market data status...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">System Status</Typography>
        <Typography variant="h6">{status?.status === 'ok' ? 'Healthy' : 'Unknown'}</Typography>
        <Typography variant="caption" color="text.secondary">Trust: {status?.data_status || 'MISSING'}</Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Scoped Instruments</Typography>
        <Typography variant="h6">{status?.instrumentCount ?? 0}</Typography>
        <Typography variant="caption" color="text.secondary">
          {status?.region || region || 'GLOBAL'} / {status?.assetType || assetType || 'ALL'}, before local filters
        </Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Last Updated</Typography>
        <Typography variant="body1">{formatTimestamp(status?.latestDataTimestamp ?? null)}</Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Daily Candle</Typography>
        <Typography variant="body1">{formatCandleStatus(candleStatus)}</Typography>
        <Typography variant="caption" color="text.secondary">
          Stored: {candleStatus?.latestStoredTradingDate || 'none'}
        </Typography>
      </Paper>
    </Box>
  );
};

export default MarketDataStatusPanel;
