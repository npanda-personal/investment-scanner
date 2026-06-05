/**
 * SignalTrackRecordPanel
 *
 * Surfaces the signal track-record scorecard on the Signals dashboard so
 * traders can answer "can I trust this signal engine?".
 *
 * Data source: GET /api/v1/signals/quality/scorecard (task #12 persisted-read API).
 * Persisted-read only — no live recompute is triggered here.
 *
 * Honesty rules enforced:
 *  - Sample sizes shown alongside every win-rate figure.
 *  - WinRateConfidence badge: HIGH (>=100 samples), MEDIUM (>=30), LOW (<30).
 *  - When confidence is LOW the win-rate is visually de-emphasised and a
 *    "small sample — interpret with caution" note is shown.
 *  - Research-support disclaimer footer (never forecasting language).
 *  - If evidenceUsability is UNAVAILABLE or the API returns no summary rows,
 *    an honest "insufficient data" notice is displayed instead of zeroes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
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
import { ExpandLess, ExpandMore, InfoOutlined } from '@mui/icons-material';
import { fetchSignalScorecard } from '@/features/signal-quality-lab/api/signalQualityLabService';
import type { ScorecardRow, ScorecardSummary, WinRateConfidence } from '@/features/signal-quality-lab/types';
import { changeColor } from '@/shared/format/money';

// ---------------------------------------------------------------------------
// Constants matching backend thresholds (signal-quality-lab.types.ts)
// ---------------------------------------------------------------------------
const WIN_RATE_CONFIDENCE_HIGH_THRESHOLD = 100;
const WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function retPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function confidenceColor(c: WinRateConfidence | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (c === 'HIGH') return 'success';
  if (c === 'MEDIUM') return 'warning';
  if (c === 'LOW') return 'error';
  return 'default';
}

function confidenceLabel(c: WinRateConfidence | null | undefined): string {
  if (c === 'HIGH') return 'High confidence';
  if (c === 'MEDIUM') return 'Medium confidence';
  if (c === 'LOW') return 'Low confidence — small sample';
  return 'No data';
}

function reliabilityTierLabel(directionalSampleSize: number): string {
  if (directionalSampleSize >= WIN_RATE_CONFIDENCE_HIGH_THRESHOLD) return 'Reliable';
  if (directionalSampleSize >= WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD) return 'Indicative';
  return 'Preliminary';
}

function reliabilityTierColor(directionalSampleSize: number): 'success' | 'warning' | 'error' {
  if (directionalSampleSize >= WIN_RATE_CONFIDENCE_HIGH_THRESHOLD) return 'success';
  if (directionalSampleSize >= WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD) return 'warning';
  return 'error';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const HorizonSummaryRow: React.FC<{ row: ScorecardSummary }> = ({ row }) => {
  const isLowSample = (row.winRateConfidence === 'LOW' || row.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD);
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>{row.horizon}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color="text.secondary">{row.directionalSampleSize.toLocaleString()}</Typography>
      </TableCell>
      <TableCell align="right">
        <Tooltip
          title={
            isLowSample
              ? `${confidenceLabel(row.winRateConfidence)} — ${row.directionalSampleSize} directional samples. Interpret with caution.`
              : `${confidenceLabel(row.winRateConfidence)} — ${row.directionalSampleSize} directional samples.`
          }
          arrow
        >
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, opacity: isLowSample ? 0.6 : 1 }}>
            <Typography
              variant="body2"
              fontWeight={isLowSample ? 400 : 600}
              color={isLowSample ? 'text.secondary' : changeColor(row.winRate !== null ? row.winRate - 0.5 : null)}
            >
              {pct(row.winRate)}
            </Typography>
            <Chip
              label={row.winRateConfidence ?? '—'}
              size="small"
              color={confidenceColor(row.winRateConfidence)}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color={changeColor(row.avgReturnPercent)}>{retPct(row.avgReturnPercent)}</Typography>
      </TableCell>
      <TableCell align="right">
        {row.avgAlphaPercent === null || row.avgAlphaPercent === undefined ? (
          <Tooltip title="Benchmark-relative not yet available" arrow>
            <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2" color={changeColor(row.avgAlphaPercent)}>
            {retPct(row.avgAlphaPercent)}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color={changeColor(row.expectancy)}>{retPct(row.expectancy)}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color="text.secondary">
          {row.profitFactor !== null && row.profitFactor !== undefined ? row.profitFactor.toFixed(2) : '—'}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Chip
          label={reliabilityTierLabel(row.directionalSampleSize)}
          size="small"
          color={reliabilityTierColor(row.directionalSampleSize)}
          variant="outlined"
          sx={{ fontSize: '0.65rem' }}
        />
      </TableCell>
    </TableRow>
  );
};

const DirectionBreakdownRow: React.FC<{ row: ScorecardRow }> = ({ row }) => {
  const isLowSample = (row.winRateConfidence === 'LOW' || row.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD);
  return (
    <TableRow hover sx={{ '& td': { py: 0.5 } }}>
      <TableCell sx={{ pl: 4 }}>
        <Typography variant="caption" color="text.secondary">{row.groupKey}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" color="text.secondary">{row.directionalSampleSize.toLocaleString()}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" color={isLowSample ? 'text.secondary' : changeColor(row.winRate !== null ? row.winRate - 0.5 : null)} sx={{ opacity: isLowSample ? 0.6 : 1 }}>
          {pct(row.winRate)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" color={changeColor(row.avgReturnPercent)}>{retPct(row.avgReturnPercent)}</Typography>
      </TableCell>
      <TableCell align="right">
        {row.avgAlphaPercent === null || row.avgAlphaPercent === undefined ? (
          <Tooltip title="Benchmark-relative not yet available" arrow>
            <Typography variant="caption" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
          </Tooltip>
        ) : (
          <Typography variant="caption" color={changeColor(row.avgAlphaPercent)}>
            {retPct(row.avgAlphaPercent)}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" color={changeColor(row.expectancy)}>{retPct(row.expectancy)}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" color="text.secondary">
          {row.profitFactor !== null && row.profitFactor !== undefined ? row.profitFactor.toFixed(2) : '—'}
        </Typography>
      </TableCell>
      <TableCell />
    </TableRow>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SignalTrackRecordPanelProps {
  /** Optional scope filters forwarded to the scorecard endpoint. */
  modelVersion?: string;
}

const HORIZONS_ORDER: string[] = ['1D', '5D', '10D', '20D', '60D'];

export const SignalTrackRecordPanel: React.FC<SignalTrackRecordPanelProps> = ({ modelVersion }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScorecardSummary[]>([]);
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchSignalScorecard({ groupBy: 'direction', modelVersion })
      .then((data) => {
        // Sort summary by canonical horizon order
        const ordered = [...(data.summary ?? [])].sort(
          (a, b) => HORIZONS_ORDER.indexOf(a.horizon) - HORIZONS_ORDER.indexOf(b.horizon)
        );
        setSummary(ordered);
        setRows(data.rows ?? []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load track record';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [modelVersion]);

  useEffect(() => { load(); }, [load]);

  const totalSamples = summary.reduce((acc, s) => Math.max(acc, s.directionalSampleSize), 0);
  const hasData = summary.length > 0 && totalSamples > 0;
  const allLowSample = summary.length > 0 && summary.every((s) => s.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD);

  return (
    <Paper sx={{ mb: 2 }}>
      {/* Header — always visible */}
      <Box
        sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>Signal Track Record</Typography>
          <Tooltip title="Historical win-rates and return statistics computed from persisted signal outcomes. Research support only — not a forecast." arrow>
            <InfoOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
          </Tooltip>
          {!loading && hasData && (
            <Chip
              size="small"
              label={`${totalSamples.toLocaleString()} directional samples`}
              variant="outlined"
              sx={{ fontSize: '0.65rem' }}
            />
          )}
          {!loading && allLowSample && (
            <Chip size="small" label="Low sample — interpret with caution" color="warning" sx={{ fontSize: '0.65rem' }} />
          )}
        </Stack>
        <IconButton size="small" aria-label={expanded ? 'Collapse track record' : 'Expand track record'}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Loading track record…</Typography>
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
          )}

          {!loading && !error && !hasData && (
            <Alert severity="info" sx={{ mb: 1 }}>
              No track-record data available yet. Signal outcomes are built up over time as signals mature.
            </Alert>
          )}

          {!loading && !error && hasData && (
            <>
              {allLowSample && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  All horizons have fewer than {WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD} directional samples.
                  Win-rates at this sample depth are preliminary — do not rely on them for sizing decisions.
                </Alert>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Alpha = signal return − same-horizon Nifty 50 return. Green = outperformed index; red = underperformed.
              </Typography>

              <Table size="small" sx={{ mb: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Horizon</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Number of BULLISH + BEARISH signal outcomes with complete forward price data" arrow>
                        <span>Samples</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Win rate: BULLISH win = forwardReturn > 0; BEARISH win = forwardReturn < 0. Confidence badge reflects sample depth." arrow>
                        <span>Win Rate</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Average forward return % over the horizon window" arrow>
                        <span>Avg Return</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Alpha vs Nifty 50: signal avg forward return minus Nifty 50 return over the same horizon. Green = signal beat the index; red = underperformed. '—' means benchmark data not yet available for this horizon." arrow>
                        <span>Alpha vs Nifty</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Expectancy = (winRate × avgWin) + ((1 − winRate) × avgLoss). Positive means the edge is in your favour on average." arrow>
                        <span>Expectancy</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Profit factor = sum(positive returns) / |sum(negative returns)|. >1 means gross profits exceed gross losses." arrow>
                        <span>Profit Factor</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">Tier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.map((s) => (
                    <HorizonSummaryRow key={s.horizon} row={s} />
                  ))}
                </TableBody>
              </Table>

              {/* Direction breakdown (collapsible) */}
              {rows.length > 0 && (
                <>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: 0.5 }}
                    onClick={() => setDetailExpanded((v) => !v)}
                    role="button"
                    aria-expanded={detailExpanded}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {detailExpanded ? 'Hide' : 'Show'} breakdown by direction
                    </Typography>
                    {detailExpanded ? <ExpandLess fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} /> : <ExpandMore fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />}
                  </Box>
                  <Collapse in={detailExpanded} unmountOnExit>
                    <Table size="small" sx={{ mb: 1 }}>
                      <TableHead>
                        <TableRow sx={{ '& th': { py: 0.5 } }}>
                          <TableCell sx={{ pl: 4 }}>Direction</TableCell>
                          <TableCell align="right"><Typography variant="caption">Samples</Typography></TableCell>
                          <TableCell align="right"><Typography variant="caption">Win Rate</Typography></TableCell>
                          <TableCell align="right"><Typography variant="caption">Avg Return</Typography></TableCell>
                          <TableCell align="right">
                            <Tooltip title="Alpha vs Nifty 50: signal return minus same-horizon Nifty 50 return" arrow>
                              <Typography variant="caption" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.disabled' }}>Alpha vs Nifty</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right"><Typography variant="caption">Expectancy</Typography></TableCell>
                          <TableCell align="right"><Typography variant="caption">Profit Factor</Typography></TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {HORIZONS_ORDER.flatMap((horizon) =>
                          rows
                            .filter((r) => r.horizon === horizon)
                            .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
                            .map((r) => <DirectionBreakdownRow key={`${r.horizon}-${r.groupKey}`} row={r} />)
                        )}
                      </TableBody>
                    </Table>
                  </Collapse>
                </>
              )}
            </>
          )}

          {/* Disclaimer — always shown when panel is open */}
          <Alert severity="info" icon={false} sx={{ mt: 1, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Research support only — this is not a forecast or investment advice.
              Past performance does not guarantee future results.
              Sample sizes are shown for all figures; low-sample metrics (below {WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD} samples) are flagged and should not be used for position sizing.
            </Typography>
          </Alert>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SignalTrackRecordPanel;
