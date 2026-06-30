import React, { useMemo, useState } from 'react';
import { Box, Paper, Stack, TextField, Typography } from '@mui/material';
import type { SignalPositionLedgerActiveRow } from '../types';

const pctFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Close date used for the date filter — the candle the exit criterion was met. */
function closedDateIso(row: SignalPositionLedgerActiveRow): string | null {
  const raw = row.closedAt ?? row.exitTriggerTimestamp ?? null;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function hasRealizedReturn(row: SignalPositionLedgerActiveRow): boolean {
  return row.currentReturnStatus === 'CURRENT'
    && typeof row.currentReturnPercent === 'number'
    && Number.isFinite(row.currentReturnPercent);
}

type Stat = { label: string; value: string; helper: string; tone?: 'positive' | 'negative' | 'neutral' };

type ClosedTradesReturnsCardProps = {
  rows: SignalPositionLedgerActiveRow[];
  scopeLabel: string;
  loading: boolean;
  error: string | null;
};

export const ClosedTradesReturnsCard: React.FC<ClosedTradesReturnsCardProps> = ({ rows, scopeLabel, loading, error }) => {
  const today = todayIso();
  const [fromDate, setFromDate] = useState<string>('');

  const summary = useMemo(() => {
    const realized = rows.filter(hasRealizedReturn);
    const inWindow = realized.filter((row) => {
      const closed = closedDateIso(row);
      if (!closed) return false;
      if (fromDate && closed < fromDate) return false;
      return closed <= today;
    });
    const returns = inWindow.map((row) => row.currentReturnPercent as number);
    const count = returns.length;
    const cumulative = returns.reduce((sum, value) => sum + value, 0);
    const average = count > 0 ? cumulative / count : 0;
    const winners = returns.filter((value) => value >= 0).length;
    const winRate = count > 0 ? (winners / count) * 100 : 0;
    const excluded = rows.length - realized.length;
    return { count, cumulative, average, winRate, excluded };
  }, [rows, fromDate, today]);

  const tone = (value: number): Stat['tone'] => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral');
  const toneColor = (t: Stat['tone']): string => (t === 'positive' ? 'success.main' : t === 'negative' ? 'error.main' : 'text.primary');
  const signed = (value: number): string => `${value >= 0 ? '+' : ''}${pctFormatter.format(value)}%`;

  const stats: Stat[] = [
    {
      label: 'Cumulative realized return',
      value: summary.count > 0 ? signed(summary.cumulative) : '—',
      helper: 'Sum of closed-trade returns',
      tone: tone(summary.cumulative),
    },
    {
      label: 'Closed trades counted',
      value: summary.count.toLocaleString(),
      helper: summary.excluded > 0 ? `${summary.excluded.toLocaleString()} excluded (no source-proven return)` : 'In selected window',
    },
    {
      label: 'Average per trade',
      value: summary.count > 0 ? signed(summary.average) : '—',
      helper: 'Mean realized return',
      tone: tone(summary.average),
    },
    {
      label: 'Positive-return share',
      value: summary.count > 0 ? `${pctFormatter.format(summary.winRate)}%` : '—',
      helper: 'Trades closed at or above entry',
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }} gap={1.5} sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Closed-trade cumulative returns</Typography>
          <Typography variant="caption" color="text.secondary">
            Research-support evidence — realized returns across closed entry-trigger trades for {scopeLabel}.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          <TextField
            label="Since (from date)"
            type="date"
            size="small"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: today }}
            sx={{ minWidth: 170 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            To: today ({today})
          </Typography>
        </Stack>
      </Stack>

      {error ? (
        <Typography variant="body2" color="error.main">Closed-trade return summary could not be loaded. {error}</Typography>
      ) : loading ? (
        <Typography variant="body2" color="text.secondary">Loading closed-trade returns for {scopeLabel}.</Typography>
      ) : summary.count === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No closed trades with source-proven returns {fromDate ? `closed on or after ${fromDate}` : 'are available'} for {scopeLabel}.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {stats.map((stat) => (
            <Box key={stat.label} sx={{ minWidth: 0 }}>
              <Typography color="text.secondary" variant="caption">{stat.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: toneColor(stat.tone) }}>{stat.value}</Typography>
              <Typography color="text.secondary" variant="caption">{stat.helper}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};
