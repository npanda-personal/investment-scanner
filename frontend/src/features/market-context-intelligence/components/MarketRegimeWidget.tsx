import React from 'react';
import { Alert, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useMarketContext } from '../hooks';

const colorFor = (regime?: string) => regime === 'RISK_ON' ? 'success' : regime === 'RISK_OFF' ? 'error' : 'warning';

export const MarketRegimeWidget: React.FC = () => {
  const { summary, loading, error } = useMarketContext();
  if (loading) return <Paper sx={{ p: 2 }}><CircularProgress size={20} /></Paper>;
  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!summary) return null;
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
        <div>
          <Typography variant="h6">Current Market Regime</Typography>
          <Typography color="text.secondary">{summary.regime.explanation}</Typography>
        </div>
        <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
          <Chip color={colorFor(summary.regime.regime)} label={summary.regime.regime} />
          <Typography variant="body2" color="text.secondary">Score {summary.regime.score} · {summary.dataStatus}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
