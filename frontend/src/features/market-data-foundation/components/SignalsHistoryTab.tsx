/**
 * SignalsHistoryTab — the "Signals & History" tab of the Stock Workspace.
 *
 * Extracted verbatim from UnifiedStockPage.tsx (which is over the source-file line cap)
 * so this self-contained tab — latest signal, 20-day track record, and recent-signal
 * table — lives in one cohesive place. Crypto instruments get the persisted-read crypto
 * detail layout instead. Renders from saved signal/outcome reads only; research-support
 * language throughout, not advice.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchInstrumentSignalHistory, fetchInstrumentOutcomes } from '@/features/market-intelligence/api/marketIntelligenceService';
import type { InstrumentOutcomeAggregate, SignalHistoryRow } from '@/features/market-intelligence/api/marketIntelligenceService';
import CryptoInstrumentDetail from './CryptoInstrumentDetail';

type WinRateConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

function confidenceChipColor(
  confidence: WinRateConfidence | null,
): 'success' | 'warning' | 'error' | 'default' {
  if (confidence === 'HIGH') return 'success';
  if (confidence === 'MEDIUM') return 'warning';
  if (confidence === 'LOW') return 'error';
  return 'default';
}

function sampleConfidence(sampleSize: number): WinRateConfidence {
  if (sampleSize >= 100) return 'HIGH';
  if (sampleSize >= 30) return 'MEDIUM';
  return 'LOW';
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatWinRate(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(Math.round(Number(value)));
}

function directionColor(direction: string): 'success' | 'error' | 'default' {
  if (direction === 'BULLISH') return 'success';
  if (direction === 'BEARISH') return 'error';
  return 'default';
}

export function SignalsHistoryTab({ instrumentId }: { instrumentId?: string }) {
  const { profile } = useMarketScope();
  // Crypto gets a persisted-read crypto layout (signal evidence + indicators +
  // catalog + DeFi + futures) sourced from GET /crypto/assets/:id/detail.
  if (profile.isCrypto) {
    return <CryptoInstrumentDetail instrumentId={instrumentId} />;
  }
  return <EquitySignalsHistoryTab instrumentId={instrumentId} />;
}

const HORIZONS = ['1D', '5D', '10D', '20D', '60D'] as const;

type HorizonAggregate = { horizon: string; aggregate: InstrumentOutcomeAggregate | null };

function EquitySignalsHistoryTab({ instrumentId }: { instrumentId?: string }) {
  const [history, setHistory] = useState<SignalHistoryRow[]>([]);
  const [horizonAggregates, setHorizonAggregates] = useState<HorizonAggregate[]>([]);
  const [loading, setLoading] = useState(!!instrumentId);
  const [error, setError] = useState<string | null>(null);
  const [latestSignal, setLatestSignal] = useState<SignalHistoryRow | null>(null);

  useEffect(() => {
    if (!instrumentId) {
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    setError(null);

    const outcomePromises = HORIZONS.map((h) =>
      fetchInstrumentOutcomes(instrumentId, h)
        .then((r) => ({ horizon: h, aggregate: r.aggregate ?? null }))
        .catch(() => ({ horizon: h, aggregate: null })),
    );

    Promise.all([
      fetchInstrumentSignalHistory(instrumentId),
      ...outcomePromises,
    ])
      .then(([histRes, ...outcomeResults]) => {
        if (canceled) return;
        const items = (histRes as { items?: SignalHistoryRow[] }).items ?? [];
        setHistory(items);
        setLatestSignal(items[0] ?? null);
        setHorizonAggregates(outcomeResults as HorizonAggregate[]);
        setLoading(false);
      })
      .catch((err) => {
        if (canceled) return;
        setError(err instanceof Error ? err.message : 'Failed to load signal data');
        setLoading(false);
      });

    return () => { canceled = true; };
  }, [instrumentId]);

  if (!instrumentId) {
    return (
      <Alert severity="info">No instrument selected.</Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 3 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading signal data…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="warning">{error}</Alert>;
  }

  const primaryAggregate = horizonAggregates.find((a) => a.horizon === '20D')?.aggregate ?? null;
  const confidence = primaryAggregate ? sampleConfidence(primaryAggregate.directionalSampleSize) : null;
  const hasAnyOutcomes = horizonAggregates.some((a) => a.aggregate !== null);

  return (
    <Stack spacing={2}>
      {/* Latest signal card */}
      {latestSignal ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Latest Signal</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={latestSignal.direction}
              color={directionColor(latestSignal.direction)}
              size="small"
            />
            <Chip
              label={`Score ${formatScore(latestSignal.score)}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={latestSignal.confidence}
              size="small"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              Generated {latestSignal.generatedAt ? new Date(latestSignal.generatedAt).toLocaleDateString() : '—'}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Latest Signal</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            No signals available for this stock yet.
          </Typography>
        </Paper>
      )}

      {/* Multi-horizon track record */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Track Record</Typography>
          {confidence && (
            <Tooltip title={`Based on ${primaryAggregate?.directionalSampleSize ?? 0} directional signals with completed 20D outcomes. HIGH ≥ 100, MEDIUM ≥ 30, LOW < 30.`}>
              <Chip label={`${confidence} confidence`} size="small" color={confidenceChipColor(confidence)} variant="outlined" />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Win rate and average forward return across horizons. Returns are absolute, not benchmark-adjusted.
        </Typography>

        {hasAnyOutcomes ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: `repeat(${HORIZONS.length}, 1fr)` }, gap: 2 }}>
            {HORIZONS.map((h) => {
              const agg = horizonAggregates.find((a) => a.horizon === h)?.aggregate;
              return (
                <Box key={h} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{h}</Typography>
                  <Typography variant="h6">{formatWinRate(agg?.winRate)}</Typography>
                  <Typography variant="caption" color={agg?.avgForwardReturn != null ? (agg.avgForwardReturn >= 0 ? 'success.main' : 'error.main') : 'text.secondary'}>
                    {formatPct(agg?.avgForwardReturn)}
                  </Typography>
                  {agg?.matureCount != null && (
                    <Typography variant="caption" color="text.secondary" display="block">{agg.matureCount} signals</Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No completed signal outcomes yet for this stock. Track record is built as signals mature over time.
          </Typography>
        )}
      </Paper>

      {/* Recent signal table */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Recent Signals
          </Typography>
        </Box>
        {history.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">No signal history available.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.slice(0, 20).map((row, i) => (
                  <TableRow key={row.signalResultId || row.id || i}>
                    <TableCell>
                      <Typography variant="caption">
                        {row.generatedAt ? new Date(row.generatedAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.direction}
                        color={directionColor(row.direction)}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{formatScore(row.score)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.confidence}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5 }}>
        For research support only, not financial advice. Returns shown are absolute and not benchmark-adjusted.
      </Typography>
    </Stack>
  );
}
