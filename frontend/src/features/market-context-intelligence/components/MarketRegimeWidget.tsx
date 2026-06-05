import React from 'react';
import { Alert, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useMarketContext } from '../hooks';

const colorFor = (regime?: string) => regime === 'RISK_ON' ? 'success' : regime === 'RISK_OFF' ? 'error' : 'warning';

// NR-71: round long-decimal floats in backend explanation strings to 1 d.p.
const roundFloatsInText = (text: string): string =>
  text.replace(/\b(\d+\.\d{2,})\b/g, (_, n) => parseFloat(n).toFixed(1));

export const MarketRegimeWidget: React.FC = () => {
  const { summary, loading, error } = useMarketContext();
  if (loading) return <Paper sx={{ p: 2 }}><CircularProgress size={20} /></Paper>;
  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!summary) return null;

  const dataMissing = summary.dataStatus === 'MISSING' || (summary.breadth.sma50SampleCount !== undefined && summary.breadth.sma50SampleCount === 0);
  if (dataMissing) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
          <div>
            <Typography variant="h6">Current Market Regime</Typography>
            <Typography color="text.secondary">Insufficient market breadth data to determine regime.</Typography>
          </div>
          <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
            <Chip color="default" label="Data unavailable" variant="outlined" />
            <Typography variant="body2" color="text.secondary">{summary.dataStatus}</Typography>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
        <div>
          <Typography variant="h6">Current Market Regime</Typography>
          <Typography color="text.secondary">{roundFloatsInText(summary.regime.explanation)}</Typography>
        </div>
        <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
          <Chip color={colorFor(summary.regime.regime)} label={summary.regime.regime} />
          <Typography variant="body2" color="text.secondary">Score {summary.regime.score} · {summary.dataStatus}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
