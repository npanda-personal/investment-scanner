import React, { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { fetchMarketDataHealth, type MarketDataHealth } from '../api/marketDataFoundationService';

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return 'No market data loaded';
  return new Date(timestamp).toLocaleString();
};

interface MarketDataStatusPanelProps {
  region?: string;
  assetType?: string;
}

const MarketDataStatusPanel: React.FC<MarketDataStatusPanelProps> = ({ region, assetType }) => {
  const [status, setStatus] = useState<MarketDataHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    fetchMarketDataHealth({ region, assetType })
      .then((result) => {
        if (mounted) setStatus(result);
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
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">System Status</Typography>
        <Typography variant="h6">{status?.status === 'ok' ? 'Healthy' : 'Unknown'}</Typography>
        <Typography variant="caption" color="text.secondary">Trust: {status?.data_status || 'MISSING'}</Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Instruments</Typography>
        <Typography variant="h6">{status?.instrumentCount ?? 0}</Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Last Updated</Typography>
        <Typography variant="body1">{formatTimestamp(status?.latestDataTimestamp ?? null)}</Typography>
      </Paper>
    </Box>
  );
};

export default MarketDataStatusPanel;
