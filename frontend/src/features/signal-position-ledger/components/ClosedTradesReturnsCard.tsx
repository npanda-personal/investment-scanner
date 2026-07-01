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
  // Currently-open (ACTIVE) entry-trigger candidates for the same scope. Their
  // currentReturnPercent is the unrealized mark-to-market move — combined with the
  // closed realized returns to surface a cumulative open + closed figure.
  openRows?: SignalPositionLedgerActiveRow[];
  scopeLabel: string;
  loading: boolean;
  error: string | null;
};

export const ClosedTradesReturnsCard: React.FC<ClosedTradesReturnsCardProps> = ({ rows, openRows = [], scopeLabel, loading, error }) => {
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

    // Flats (exactly 0%) are neither winners nor losers: exclude them from the
    // per-trade averages and the win rate so a wall of 0% closes cannot masquerade
    // as "positive". Their count is surfaced separately.
    const wins = returns.filter((value) => value > 0);
    const losses = returns.filter((value) => value < 0);
    const flats = count - wins.length - losses.length;
    const decided = wins.length + losses.length;

    const cumulative = returns.reduce((sum, value) => sum + value, 0);
    const average = decided > 0 ? returns.reduce((sum, value) => sum + value, 0) / decided : 0;
    const winRate = decided > 0 ? (wins.length / decided) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, value) => sum + value, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0;
    const payoff = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

    // Benchmark / alpha: mean over the trades that carry a source-proven benchmark
    // return for the same holding window (null where a region has no benchmark series).
    const benchVals = inWindow
      .map((row) => row.benchmarkReturnPercent)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const alphaVals = inWindow
      .map((row) => row.alphaPercent)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const benchmark = benchVals.length > 0 ? benchVals.reduce((sum, value) => sum + value, 0) / benchVals.length : null;
    const alpha = alphaVals.length > 0 ? alphaVals.reduce((sum, value) => sum + value, 0) / alphaVals.length : null;

    const excluded = rows.length - realized.length;

    // Open (ACTIVE) candidates carry an unrealized mark-to-market move in
    // currentReturnPercent. They have no close date, so the "since" window (which
    // filters on close date) does not apply — every current open candidate counts.
    const openReturns = openRows.filter(hasRealizedReturn).map((row) => row.currentReturnPercent as number);
    const openCount = openReturns.length;
    const openCumulative = openReturns.reduce((sum, value) => sum + value, 0);
    // Cumulative across the whole book: realized (closed) + unrealized (open).
    const combinedCumulative = cumulative + openCumulative;

    return {
      count,
      decided,
      flats,
      cumulative,
      average,
      winRate,
      avgWin,
      avgLoss,
      payoff,
      benchmark,
      alpha,
      excluded,
      openCount,
      openCumulative,
      combinedCumulative,
    };
  }, [rows, openRows, fromDate, today]);

  const tone = (value: number): Stat['tone'] => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral');
  const toneColor = (t: Stat['tone']): string => (t === 'positive' ? 'success.main' : t === 'negative' ? 'error.main' : 'text.primary');
  const signed = (value: number): string => `${value >= 0 ? '+' : ''}${pctFormatter.format(value)}%`;

  const countHelperParts: string[] = [];
  if (summary.flats > 0) countHelperParts.push(`${summary.flats.toLocaleString()} flat excluded`);
  if (summary.excluded > 0) countHelperParts.push(`${summary.excluded.toLocaleString()} no source-proven return`);
  const countHelper = countHelperParts.length > 0 ? countHelperParts.join(' · ') : 'In selected window';

  const stats: Stat[] = [
    {
      label: 'Avg simple return / trade',
      value: summary.decided > 0 ? signed(summary.average) : '—',
      helper: 'Mean per decided trade (flats excluded)',
      tone: tone(summary.average),
    },
    {
      label: 'Win rate',
      value: summary.decided > 0 ? `${pctFormatter.format(summary.winRate)}%` : '—',
      helper: 'Winners ÷ decided (non-flat) trades',
    },
    {
      label: 'Avg win / avg loss',
      value: summary.decided > 0 ? `${signed(summary.avgWin)} / ${signed(summary.avgLoss)}` : '—',
      helper: 'Mean winning vs. losing trade',
    },
    {
      label: 'Payoff ratio',
      value: summary.payoff !== null ? `${pctFormatter.format(summary.payoff)}×` : '—',
      helper: 'Avg win ÷ avg loss (>1 favours winners)',
    },
    {
      label: 'Benchmark return',
      value: summary.benchmark !== null ? signed(summary.benchmark) : '—',
      helper: 'Mean region benchmark over same windows',
      tone: summary.benchmark !== null ? tone(summary.benchmark) : 'neutral',
    },
    {
      label: 'Alpha vs. benchmark',
      value: summary.alpha !== null ? signed(summary.alpha) : '—',
      helper: 'Return − benchmark (percentage points)',
      tone: summary.alpha !== null ? tone(summary.alpha) : 'neutral',
    },
    {
      label: 'Cumulative return (closed)',
      value: summary.count > 0 ? signed(summary.cumulative) : '—',
      helper: 'Sum of realized closed-trade returns (not compounded)',
      tone: tone(summary.cumulative),
    },
    {
      label: 'Open unrealized (mark-to-market)',
      value: summary.openCount > 0 ? signed(summary.openCumulative) : '—',
      helper: `Sum of ${summary.openCount.toLocaleString()} open candidate mark-to-market moves`,
      tone: summary.openCount > 0 ? tone(summary.openCumulative) : 'neutral',
    },
    {
      label: 'Cumulative return (open + closed)',
      value: summary.count > 0 || summary.openCount > 0 ? signed(summary.combinedCumulative) : '—',
      helper: 'Realized closed + unrealized open, combined',
      tone: tone(summary.combinedCumulative),
    },
    {
      label: 'Closed trades counted',
      value: summary.count.toLocaleString(),
      helper: countHelper,
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }} gap={1.5} sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Returns</Typography>
          <Typography variant="caption" color="text.secondary">
            Research-support evidence — realized returns across closed entry-trigger trades plus unrealized mark-to-market on open candidates for {scopeLabel}, with benchmark/alpha context.
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
      ) : summary.count === 0 && summary.openCount === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No closed trades with source-proven returns {fromDate ? `closed on or after ${fromDate}` : 'are available'} for {scopeLabel}, and no open candidates carry a mark-to-market return.
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
