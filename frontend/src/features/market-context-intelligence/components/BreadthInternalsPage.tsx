/**
 * NR-104: Breadth Internals dashboard — market breadth TRENDS OVER TIME.
 * Persisted-read from market_context_snapshots history.
 * Charting: recharts (same lib as StockResearchWorkbenchPage).
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { fetchBreadthInternals } from '../api/marketContextIntelligenceService';
import type { BreadthInternalsEnvelope, BreadthInternalsPoint } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pct = (v: number | null) =>
  v === null ? 'N/A' : `${(v * 100).toFixed(1)}%`;

const num2 = (v: number | null) =>
  v === null ? 'N/A' : v.toFixed(2);

const deltaColor = (v: number | null): 'success.main' | 'error.main' | 'text.secondary' => {
  if (v === null || v === 0) return 'text.secondary';
  return v > 0 ? 'success.main' : 'error.main';
};

const deltaSign = (v: number | null) => {
  if (v === null) return '';
  return v > 0 ? '+' : '';
};

function formatXTick(date: string) {
  // Show short month+day label
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Sparkline chart ─────────────────────────────────────────────────────────

interface SparklineProps {
  data: BreadthInternalsPoint[];
  dataKey: keyof BreadthInternalsPoint;
  label: string;
  color: string;
  formatter?: (v: number) => string;
  referenceValue?: number;
}

const BreadthSparkline: React.FC<SparklineProps> = ({
  data,
  dataKey,
  label,
  color,
  formatter = num2,
  referenceValue,
}) => {
  const values = data.map((p) => p[dataKey] as number | null).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">No data for {label}</Typography>
      </Paper>
    );
  }

  const chartData = data.map((p) => ({
    date: p.date,
    value: p[dataKey] as number | null,
  }));

  const allVals = values;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const pad = (max - min) * 0.1 || 0.05;

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      <Box sx={{ mt: 0.5, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXTick}
              tick={{ fontSize: 9 }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={[min - pad, max + pad]}
              tick={{ fontSize: 9 }}
              tickFormatter={formatter}
              width={40}
              tickLine={false}
            />
            <ChartTooltip
              formatter={(v: number) => [formatter(v), label]}
              labelFormatter={(l: string) => l}
              contentStyle={{ fontSize: 11 }}
            />
            {referenceValue !== undefined && (
              <ReferenceLine y={referenceValue} stroke="#888" strokeDasharray="4 2" strokeWidth={1} />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${dataKey as string})`}
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

// ─── New-Highs vs New-Lows composed chart ────────────────────────────────────

const NewHighLowChart: React.FC<{ data: BreadthInternalsPoint[] }> = ({ data }) => {
  const hasData = data.some((p) => p.newHighCount !== null || p.newLowCount !== null);
  if (!hasData) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">No new-high/low data available</Typography>
      </Paper>
    );
  }

  const chartData = data.map((p) => ({
    date: p.date,
    newHighs: p.newHighCount,
    newLows: p.newLowCount ? -p.newLowCount : null, // mirror below zero for visual divergence
    net: p.newHighLowNet,
  }));

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>New 52W Highs vs Lows</Typography>
      <Box sx={{ mt: 0.5, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-highs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4caf50" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-lows" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="#f44336" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f44336" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="date" tickFormatter={formatXTick} tick={{ fontSize: 9 }} interval="preserveStartEnd" tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} width={32} />
            <ChartTooltip
              formatter={(v: number, name: string) => {
                if (name === 'newLows') return [String(Math.abs(v)), 'New Lows'];
                if (name === 'newHighs') return [String(v), 'New Highs'];
                return [String(v), name];
              }}
              labelFormatter={(l: string) => l}
              contentStyle={{ fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="#888" strokeWidth={1} />
            <Area type="monotone" dataKey="newHighs" stroke="#4caf50" strokeWidth={2} fill="url(#grad-highs)" dot={false} connectNulls />
            <Area type="monotone" dataKey="newLows" stroke="#f44336" strokeWidth={2} fill="url(#grad-lows)" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

// ─── Deltas table ─────────────────────────────────────────────────────────────

const DeltasTable: React.FC<{ envelope: BreadthInternalsEnvelope }> = ({ envelope }) => {
  if (envelope.deltas.length === 0) return null;
  const firstDate = envelope.series[0]?.date ?? '—';
  const lastDate = envelope.series[envelope.series.length - 1]?.date ?? '—';

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Period Deltas
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {firstDate} to {lastDate}
        </Typography>
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="caption" fontWeight={700}>Metric</Typography></TableCell>
            <TableCell align="right"><Typography variant="caption" fontWeight={700}>Current</Typography></TableCell>
            <TableCell align="right"><Typography variant="caption" fontWeight={700}>Period Start</Typography></TableCell>
            <TableCell align="right"><Typography variant="caption" fontWeight={700}>Change</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {envelope.deltas.map((row) => (
            <TableRow key={row.field}>
              <TableCell><Typography variant="body2">{row.field}</Typography></TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {row.field.includes('%') ? pct(row.current) : num2(row.current)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {row.field.includes('%') ? pct(row.nDaysAgo) : num2(row.nDaysAgo)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={deltaColor(row.delta)} fontWeight={600}>
                  {row.delta === null ? '—' : `${deltaSign(row.delta)}${row.field.includes('%') ? pct(row.delta) : num2(row.delta)}`}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [14, 30, 60, 90];

export const BreadthInternalsPage: React.FC = () => {
  const [days, setDays] = useState(60);
  const [envelope, setEnvelope] = useState<BreadthInternalsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchBreadthInternals({ days })
      .then(setEnvelope)
      .catch((err: unknown) => {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(anyErr.response?.data?.error || anyErr.message || 'Failed to load breadth internals');
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!envelope || envelope.status === 'missing') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Breadth Internals</Typography>
        <Alert severity="info">
          {envelope?.limitedHistoryNote ?? 'No breadth history is available yet. Run the market context pipeline to generate snapshots.'}
        </Alert>
      </Box>
    );
  }

  const { series, divergence } = envelope;
  const latest = series[series.length - 1] ?? null;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4">Breadth Internals</Typography>
          <Typography color="text.secondary">
            Market breadth trends over time. Breadth divergence is the key early-warning indicator for Indian market tops.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {DAYS_OPTIONS.map((d) => (
            <Chip
              key={d}
              label={`${d}d`}
              onClick={() => setDays(d)}
              variant={days === d ? 'filled' : 'outlined'}
              color={days === d ? 'primary' : 'default'}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          ))}
          {envelope.limitedHistory && (
            <Tooltip title={envelope.limitedHistoryNote ?? 'Limited history'} arrow>
              <Chip size="small" color="warning" label="Limited history" variant="outlined" />
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Divergence alert — descriptive, never advice */}
      {divergence.detected && divergence.description && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Breadth Divergence Detected</Typography>
          <Typography variant="body2">{divergence.description}</Typography>
        </Alert>
      )}

      {/* Latest snapshot summary row */}
      {latest && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Latest snapshot: {latest.date}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Above SMA50</Typography>
              <Typography fontWeight={700}>{pct(latest.percentAboveSma50)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">Above SMA200</Typography>
              <Typography fontWeight={700}>{pct(latest.percentAboveSma200)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">A/D Ratio</Typography>
              <Typography fontWeight={700}>{num2(latest.advanceDeclineRatio)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">52W High / Low</Typography>
              <Typography fontWeight={700}>
                {latest.newHighCount ?? '—'} / {latest.newLowCount ?? '—'}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">High-Low Net</Typography>
              <Typography fontWeight={700} color={latest.newHighLowNet !== null && latest.newHighLowNet >= 0 ? 'success.main' : 'error.main'}>
                {latest.newHighLowNet !== null ? (latest.newHighLowNet >= 0 ? `+${latest.newHighLowNet}` : String(latest.newHighLowNet)) : '—'}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" color="text.secondary">Regime</Typography>
              <Typography fontWeight={700}>{latest.regime ?? '—'} ({latest.regimeScore?.toFixed(1) ?? '—'})</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Sparkline charts grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <BreadthSparkline
          data={series}
          dataKey="percentAboveSma50"
          label="% Above SMA50"
          color="#2196f3"
          formatter={pct}
          referenceValue={0.5}
        />
        <BreadthSparkline
          data={series}
          dataKey="percentAboveSma200"
          label="% Above SMA200"
          color="#9c27b0"
          formatter={pct}
          referenceValue={0.5}
        />
        <BreadthSparkline
          data={series}
          dataKey="advanceDeclineRatio"
          label="Advance / Decline Ratio"
          color="#ff9800"
          formatter={num2}
          referenceValue={1}
        />
        <NewHighLowChart data={series} />
        <BreadthSparkline
          data={series}
          dataKey="newHighLowNet"
          label="New High-Low Net"
          color="#4caf50"
          formatter={(v) => String(Math.round(v))}
          referenceValue={0}
        />
        <BreadthSparkline
          data={series}
          dataKey="regimeScore"
          label="Regime Score"
          color="#607d8b"
          formatter={(v) => v.toFixed(1)}
          referenceValue={50}
        />
      </Box>

      {/* Deltas table */}
      <DeltasTable envelope={envelope} />

      {/* Disclaimer */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        All data sourced from persisted market context snapshots (NSE/BSE). For research purposes only — not financial advice.
        History deepens as the daily pipeline runs.
      </Typography>
    </Box>
  );
};

export default BreadthInternalsPage;
