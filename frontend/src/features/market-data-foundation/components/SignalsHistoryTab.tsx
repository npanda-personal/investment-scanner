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

function EquitySignalsHistoryTab({ instrumentId }: { instrumentId?: string }) {
  const [history, setHistory] = useState<SignalHistoryRow[]>([]);
  const [aggregate, setAggregate] = useState<InstrumentOutcomeAggregate | null>(null);
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

    Promise.all([
      fetchInstrumentSignalHistory(instrumentId),
      fetchInstrumentOutcomes(instrumentId, '20D'),
    ])
      .then(([histRes, outRes]) => {
        if (canceled) return;
        const items = histRes.items ?? [];
        setHistory(items);
        setLatestSignal(items[0] ?? null);
        setAggregate(outRes.aggregate ?? null);
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

  const confidence = aggregate ? sampleConfidence(aggregate.directionalSampleSize) : null;

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

      {/* Track record strip */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Track Record (20-day horizon)
          </Typography>
          {confidence && (
            <Tooltip title={`Based on ${aggregate?.directionalSampleSize ?? 0} directional signals with completed outcomes. HIGH ≥ 100, MEDIUM ≥ 30, LOW < 30.`}>
              <Chip
                label={`${confidence} confidence`}
                size="small"
                color={confidenceChipColor(confidence)}
                variant="outlined"
              />
            </Tooltip>
          )}
        </Stack>

        {aggregate ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Win Rate</Typography>
              <Typography variant="h6">{formatWinRate(aggregate.winRate)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {aggregate.directionalSampleSize} directional signals
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Avg Forward Return</Typography>
              <Typography
                variant="h6"
                color={
                  aggregate.avgForwardReturn === null ? 'text.primary'
                    : aggregate.avgForwardReturn >= 0 ? 'success.main'
                    : 'error.main'
                }
              >
                {formatPct(aggregate.avgForwardReturn)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Absolute return, not vs benchmark
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Completed Signals</Typography>
              <Typography variant="h6">{aggregate.matureCount}</Typography>
              <Typography variant="caption" color="text.secondary">
                with price data
              </Typography>
            </Box>
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
