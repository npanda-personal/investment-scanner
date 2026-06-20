import { type FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
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
import { ExpandLess, ExpandMore, HistoryOutlined } from '@mui/icons-material';
import { fetchSignalScorecard } from '@/features/signal-quality-lab/api/signalQualityLabService';
import type { ScorecardRow, ScorecardSummary, WinRateConfidence } from '@/features/signal-quality-lab/types';
import { changeColor } from '@/shared/format/money';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD = 30;

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

function confidenceTooltip(c: WinRateConfidence | null | undefined, samples: number): string {
  if (c === 'HIGH') return `High confidence — ${samples} directional samples.`;
  if (c === 'MEDIUM') return `Medium confidence — ${samples} directional samples.`;
  if (c === 'LOW') return `Low confidence — ${samples} directional samples. Interpret with caution.`;
  return 'No data';
}

function tierLabel(samples: number): string {
  if (samples >= 100) return 'Reliable';
  if (samples >= 30) return 'Indicative';
  return 'Preliminary';
}

function tierColor(samples: number): 'success' | 'warning' | 'error' {
  if (samples >= 100) return 'success';
  if (samples >= 30) return 'warning';
  return 'error';
}

const HORIZONS_ORDER = ['1D', '5D', '10D', '20D', '60D'];

const SummaryRow: FC<{ row: ScorecardSummary; benchmarkLabel: string }> = ({ row, benchmarkLabel }) => {
  const low = row.winRateConfidence === 'LOW' || row.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD;
  return (
    <TableRow hover>
      <TableCell><Typography variant="body2" fontWeight={600}>{row.horizon}</Typography></TableCell>
      <TableCell align="right"><Typography variant="body2" color="text.secondary">{row.directionalSampleSize.toLocaleString()}</Typography></TableCell>
      <TableCell align="right">
        <Tooltip title={confidenceTooltip(row.winRateConfidence, row.directionalSampleSize)} arrow>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, opacity: low ? 0.6 : 1 }}>
            <Typography variant="body2" fontWeight={low ? 400 : 600} color={low ? 'text.secondary' : changeColor(row.winRate != null ? row.winRate - 0.5 : null)}>
              {pct(row.winRate)}
            </Typography>
            <Chip label={row.winRateConfidence ?? '—'} size="small" color={confidenceColor(row.winRateConfidence)} sx={{ height: 18, fontSize: '0.65rem' }} />
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell align="right"><Typography variant="body2" color={changeColor(row.avgReturnPercent)}>{retPct(row.avgReturnPercent)}</Typography></TableCell>
      <TableCell align="right">
        {row.avgAlphaPercent == null ? (
          <Tooltip title={`${benchmarkLabel} data not yet available for this horizon`} arrow>
            <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2" color={changeColor(row.avgAlphaPercent)}>{retPct(row.avgAlphaPercent)}</Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Chip label={tierLabel(row.directionalSampleSize)} size="small" color={tierColor(row.directionalSampleSize)} variant="outlined" sx={{ fontSize: '0.65rem' }} />
      </TableCell>
    </TableRow>
  );
};

const BreakdownRow: FC<{ row: ScorecardRow }> = ({ row }) => {
  const low = row.winRateConfidence === 'LOW' || row.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD;
  return (
    <TableRow hover sx={{ '& td': { py: 0.5 } }}>
      <TableCell sx={{ pl: 4 }}><Typography variant="caption" color="text.secondary">{row.groupKey}</Typography></TableCell>
      <TableCell align="right"><Typography variant="caption" color="text.secondary">{row.directionalSampleSize.toLocaleString()}</Typography></TableCell>
      <TableCell align="right">
        <Typography variant="caption" color={low ? 'text.secondary' : changeColor(row.winRate != null ? row.winRate - 0.5 : null)} sx={{ opacity: low ? 0.6 : 1 }}>
          {pct(row.winRate)}
        </Typography>
      </TableCell>
      <TableCell align="right"><Typography variant="caption" color={changeColor(row.avgReturnPercent)}>{retPct(row.avgReturnPercent)}</Typography></TableCell>
      <TableCell align="right">
        {row.avgAlphaPercent == null ? (
          <Typography variant="caption" color="text.disabled">—</Typography>
        ) : (
          <Typography variant="caption" color={changeColor(row.avgAlphaPercent)}>{retPct(row.avgAlphaPercent)}</Typography>
        )}
      </TableCell>
      <TableCell />
    </TableRow>
  );
};

export const SignalTrackRecordPanel: FC = () => {
  const { profile, scope } = useMarketScope();
  const trackRecordRegion = String(scope.region || '').toUpperCase();
  const shouldRender = !profile.isCrypto && (!trackRecordRegion || trackRecordRegion === 'IN');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScorecardSummary[]>([]);
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const load = useCallback(() => {
    if (!shouldRender) return;
    setLoading(true);
    setError(null);
    fetchSignalScorecard({ groupBy: 'direction' })
      .then((data) => {
        const ordered = [...(data.summary ?? [])].sort(
          (a, b) => HORIZONS_ORDER.indexOf(a.horizon) - HORIZONS_ORDER.indexOf(b.horizon),
        );
        setSummary(ordered);
        setRows(data.rows ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load signal track record.');
      })
      .finally(() => setLoading(false));
  }, [shouldRender]);

  useEffect(() => { load(); }, [load]);

  if (!shouldRender) return null;

  const totalSamples = summary.reduce((acc, s) => Math.max(acc, s.directionalSampleSize), 0);
  const hasData = summary.length > 0 && totalSamples > 0;
  const allLow = summary.length > 0 && summary.every((s) => s.directionalSampleSize < WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <HistoryOutlined color="action" />
        <Typography variant="h6" fontWeight={700}>Signal Track Record</Typography>
        {!loading && hasData && (
          <Chip size="small" label={`${totalSamples.toLocaleString()} samples`} variant="outlined" sx={{ fontSize: '0.65rem' }} />
        )}
        {!loading && allLow && (
          <Chip size="small" label="Low sample — interpret with caution" color="warning" sx={{ fontSize: '0.65rem' }} />
        )}
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
      )}

      {!loading && error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}

      {!loading && !error && !hasData && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Not enough signal history yet to show track record metrics. Check back after more signals have matured.
        </Typography>
      )}

      {!loading && !error && hasData && (
        <>
          {allLow && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              All horizons have fewer than {WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD} directional samples.
              Win rates at this sample depth are preliminary — do not rely on them for sizing decisions.
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Alpha = signal return minus same-horizon {profile.benchmarkLabel} return. Green = outperformed; red = underperformed.
          </Typography>

          <Table size="small" sx={{ mb: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell>Horizon</TableCell>
                <TableCell align="right">
                  <Tooltip title="Directional signal outcomes with complete forward price data" arrow><span>Samples</span></Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Bullish win = forward return > 0; bearish win = forward return < 0. Badge reflects sample depth." arrow><span>Win Rate</span></Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Average forward return % over the horizon window" arrow><span>Avg Return</span></Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`Signal return minus ${profile.benchmarkLabel} return over the same horizon`} arrow>
                    <span>Alpha vs {profile.benchmarkLabel}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">Tier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((s) => <SummaryRow key={s.horizon} row={s} benchmarkLabel={profile.benchmarkLabel} />)}
            </TableBody>
          </Table>

          {rows.length > 0 && (
            <>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: 0.5 }}
                onClick={() => setBreakdownOpen((v) => !v)}
                role="button"
                aria-expanded={breakdownOpen}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {breakdownOpen ? 'Hide' : 'Show'} breakdown by direction
                </Typography>
                {breakdownOpen ? <ExpandLess fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} /> : <ExpandMore fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />}
              </Box>
              <Collapse in={breakdownOpen} unmountOnExit>
                <Table size="small" sx={{ mb: 1 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5 } }}>
                      <TableCell sx={{ pl: 4 }}>Direction</TableCell>
                      <TableCell align="right"><Typography variant="caption">Samples</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">Win Rate</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">Avg Return</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">Alpha</Typography></TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {HORIZONS_ORDER.flatMap((horizon) =>
                      rows
                        .filter((r) => r.horizon === horizon)
                        .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
                        .map((r) => <BreakdownRow key={`${r.horizon}-${r.groupKey}`} row={r} />),
                    )}
                  </TableBody>
                </Table>
              </Collapse>
            </>
          )}
        </>
      )}

      <Divider sx={{ mt: 2, mb: 1.5 }} />
      <Typography variant="caption" color="text.disabled" display="block">
        For research support only, not financial advice. Past performance does not guarantee future results.
      </Typography>
    </Paper>
  );
};

export default SignalTrackRecordPanel;
