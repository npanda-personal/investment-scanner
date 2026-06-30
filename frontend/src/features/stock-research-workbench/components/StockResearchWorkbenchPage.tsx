import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  PlaylistAddOutlined,
  NotificationsNoneOutlined
} from '@mui/icons-material';
import {
  Bar,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchStockResearchWorkbench, isWorkbenchNotYetComputed } from '../api/stockResearchWorkbenchService';
import type { ResearchRange, ResearchWorkbenchResponse, SignalEvidenceSection } from '../types';
import { money, compactByProfile, changeColor, stripSuffix } from '@/shared/format/money';
import { humanizeCode } from '@/shared/format/enumLabels';
import { SignalWidget } from '@/features/signal-generation-engine';
import { StrategyDecisionWidget } from '@/features/strategy-decision-engine';
import { AddToWatchlistDialog } from '@/features/watchlist-management';
import { CreateAlertDialog } from '@/features/alerts-monitoring';

const ranges: ResearchRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

const formatNumber = (value: unknown, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}` : String(value);
};

const formatPercent = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
};

const formatDateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'N/A';

const StatusChip: React.FC<{ status?: string }> = ({ status }) => (
  <Chip
    label={status || 'MISSING'}
    size="small"
    color={status === 'COMPLETE' ? 'success' : status === 'ERROR' ? 'error' : 'warning'}
    variant="outlined"
  />
);

// ── NR-18: Cap-tier derivation ────────────────────────────────────────────────
// Thresholds in rupees: Large ≥ ₹20,000 Cr (2e11), Mid ₹5,000–20,000 Cr (5e10–2e11), Small < ₹5,000 Cr (5e10)
// Circuit limits are approximate; disclosed as indicative only.
interface CapTier {
  label: string;
  circuit: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

function deriveCapTier(marketCap: number | null | undefined): CapTier | null {
  if (marketCap === null || marketCap === undefined || !Number.isFinite(Number(marketCap))) {
    return null;
  }
  const cap = Number(marketCap);
  if (cap >= 2e11) {
    return { label: 'Large Cap', circuit: '~5%', color: 'success' };
  }
  if (cap >= 5e10) {
    return { label: 'Mid Cap', circuit: '~10%', color: 'primary' };
  }
  return { label: 'Small Cap', circuit: '~20%', color: 'warning' };
}

// ── NR-2: SMA computation ─────────────────────────────────────────────────────
// Returns an array of the same length as `prices`. Values before the window is
// full are null so partial MAs are never drawn.
function computeSma(prices: number[], window: number): (number | null)[] {
  if (prices.length < window) {
    // Guard: series shorter than the window — return all nulls
    return prices.map(() => null);
  }
  return prices.map((_, i) => {
    if (i < window - 1) return null;
    const slice = prices.slice(i - window + 1, i + 1);
    const sum = slice.reduce((acc, v) => acc + v, 0);
    return sum / window;
  });
}

// ── NR-4: Corporate action label ─────────────────────────────────────────────
// Map action_type codes to brief chart labels via humanizeCode.
function corpActionLabel(action: Record<string, unknown>): string {
  const raw = String(action.action_type ?? '');
  // Shorten common types to keep the chart tidy
  const shortened: Record<string, string> = {
    BONUS: 'Bonus',
    SPLIT: 'Split',
    DIVIDEND: 'Div',
    RIGHTS: 'Rights',
  };
  const upper = raw.toUpperCase().replace(/^(BONUS|SPLIT|DIVIDEND|RIGHTS).*/, '$1');
  return shortened[upper] ?? humanizeCode(raw).split(' ').slice(0, 2).join(' ');
}

// ── NR-9: 52-week range computation ──────────────────────────────────────────
interface RangeInfo {
  high: number;
  low: number;
  positionPct: number; // 0–100, % above the low
  windowWeeks: number; // actual weeks in the loaded series
  isFullYear: boolean;
}

function compute52wRange(prices: { date: string; adjusted_close: number }[]): RangeInfo | null {
  if (prices.length < 2) return null;
  const closes = prices.map((p) => p.adjusted_close).filter(Number.isFinite);
  if (closes.length < 2) return null;

  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const current = closes[closes.length - 1];
  const positionPct = high === low ? 100 : ((current - low) / (high - low)) * 100;

  // How many weeks does the loaded series span?
  const dates = prices.map((p) => new Date(p.date).getTime()).filter((t) => !isNaN(t));
  const spanDays = dates.length >= 2 ? (Math.max(...dates) - Math.min(...dates)) / 86_400_000 : 0;
  const windowWeeks = Math.round(spanDays / 7);
  const isFullYear = windowWeeks >= 52;

  return { high, low, positionPct, windowWeeks, isFullYear };
}

const StockResearchWorkbenchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<ResearchRange>('1Y');
  const [data, setData] = useState<ResearchWorkbenchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notYetComputed, setNotYetComputed] = useState<string | null>(null);
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [successWatchlistId, setSuccessWatchlistId] = useState<string | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotYetComputed(null);
    fetchStockResearchWorkbench(id, range)
      .then((result) => {
        // Backend returns HTTP 202 + { _status: 'NOT_YET_COMPUTED' } when the
        // pipeline has not yet run for this instrument.  Treat this as a
        // friendly "data being prepared" state — NOT an error.
        if (isWorkbenchNotYetComputed(result)) {
          setNotYetComputed(result.message);
          setData(null);
        } else if (!result || !('chart' in result)) {
          setData(null);
        } else {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(anyErr.response?.data?.error || anyErr.message || 'Failed to load research workbench');
      })
      .finally(() => setLoading(false));
  }, [id, range]);

  // ── Chart data with SMA overlays (NR-2) ──────────────────────────────────
  const chartData = useMemo(() => {
    const prices = [...(data?.chart.prices || [])].reverse();
    const closes = prices.map((p) => p.adjusted_close);
    const sma50 = computeSma(closes, 50);
    const sma200 = computeSma(closes, 200);

    return prices.map((point, i) => ({
      date: new Date(point.date).toLocaleDateString(),
      adjusted_close: point.adjusted_close,
      volume: point.volume || 0,
      sma50: sma50[i],
      sma200: sma200[i],
    }));
  }, [data]);

  // ── Corporate action ex-date markers (NR-4) ──────────────────────────────
  // Build a set of local date strings matching the chart x-axis keys
  const corpActionDates = useMemo(() => {
    if (!data?.corporate_actions?.length) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const action of data.corporate_actions) {
      const rawDate = action.ex_date ?? action.effective_date;
      if (!rawDate) continue;
      const localDate = new Date(String(rawDate)).toLocaleDateString();
      const label = corpActionLabel(action);
      // If multiple actions on same date, join them
      map.set(localDate, map.has(localDate) ? `${map.get(localDate)}, ${label}` : label);
    }
    return map;
  }, [data]);

  // ── 52-week range (NR-9) ──────────────────────────────────────────────────
  const rangeInfo = useMemo(() => {
    if (!data?.chart.prices?.length) return null;
    const prices = [...data.chart.prices].reverse();
    return compute52wRange(prices);
  }, [data]);

  // ── Cap tier (NR-18) ──────────────────────────────────────────────────────
  const capTier = useMemo(() => deriveCapTier(data?.overview.market_cap), [data]);

  if (loading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  // Not-yet-computed: pipeline hasn't run for this instrument yet.  Show a
  // friendly informational state — never show an error or blank screen.
  if (notYetComputed) {
    return (
      <Box sx={{ p: 3, maxWidth: 700 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/research')} sx={{ mb: 2 }}>
          Back to Research Command Center
        </Button>
        <Alert severity="info">
          <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
            Data is being prepared by the daily pipeline
          </Typography>
          <Typography variant="body2">
            This stock's research workbench snapshot hasn't been computed yet. Check back after the
            next pipeline run. If you need it now, ask an admin to trigger WORKBENCH_REFRESH from
            the Pipeline Ops page.
          </Typography>
          {notYetComputed && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {notYetComputed}
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }

  if (error || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">{error || 'Research data unavailable'}</Alert></Box>;
  }

  const overview = data.overview;
  const fundamentals = data.fundamentals;
  const valuation = data.valuation;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/research')} sx={{ mb: 2 }}>
        Back to Research Command Center
      </Button>

      {/* ── Overview header ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box>
            <Typography variant="h4">{overview.company_name}</Typography>
            <Typography color="text.secondary">
              {stripSuffix(overview.symbol)} | {overview.exchange || 'UNKNOWN'} | {overview.country || 'N/A'} | {overview.currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overview.sector || 'N/A'} | {overview.industry || 'N/A'}
            </Typography>

            {/* NR-18: Cap-tier + circuit badge */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
              {capTier ? (
                <Tooltip
                  title={`Indicative circuit limit: ${capTier.circuit}. For research reference only — not investment advice.`}
                  arrow
                >
                  <Chip
                    label={`${capTier.label} · circuit ${capTier.circuit}`}
                    size="small"
                    color={capTier.color}
                    variant="outlined"
                  />
                </Tooltip>
              ) : (
                <Chip label="Cap tier: —" size="small" variant="outlined" color="default" />
              )}
              <Typography variant="caption" color="text.secondary">
                {compactByProfile(overview.market_cap, { currency: overview.currency || 'INR' })} mkt cap
              </Typography>
            </Stack>

            {/* NR-9: 52-week range */}
            {rangeInfo && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {rangeInfo.isFullYear ? '52w' : `~${rangeInfo.windowWeeks}w`} range:{' '}
                  <strong>{money(rangeInfo.low, overview.currency)}</strong> – <strong>{money(rangeInfo.high, overview.currency)}</strong>
                  {' · '}
                  <strong>{rangeInfo.positionPct.toFixed(1)}%</strong> above{' '}
                  {rangeInfo.isFullYear ? '52w' : `${rangeInfo.windowWeeks}w`} low
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="h4">{money(overview.latest_price, overview.currency)}</Typography>
            <Typography color={changeColor(overview.daily_change_percent)}>
              {money(overview.daily_change, overview.currency)} ({formatPercent(overview.daily_change_percent)})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overview.source} | {formatDateTime(overview.last_updated_timestamp)}
            </Typography>
            <Box sx={{ mt: 1 }}><StatusChip status={overview.data_status} /></Box>
            <Stack direction="row" spacing={0.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} sx={{ mt: 1 }}>
              <Tooltip title="Add to Watchlist" arrow>
                <IconButton size="small" onClick={() => setWatchlistDialogOpen(true)}>
                  <PlaylistAddOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Create Price Alert" arrow>
                <IconButton size="small" onClick={() => setAlertDialogOpen(true)}>
                  <NotificationsNoneOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>
      </Paper>

      <AddToWatchlistDialog
        open={watchlistDialogOpen}
        instrumentId={String(overview.instrument_id)}
        symbol={String(overview.symbol)}
        companyName={String(overview.company_name)}
        onClose={() => setWatchlistDialogOpen(false)}
        onAdded={(watchlistId) => setSuccessWatchlistId(watchlistId)}
      />
      <Snackbar open={Boolean(successWatchlistId)} autoHideDuration={5000} onClose={() => setSuccessWatchlistId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessWatchlistId(null)}>
          Added {String(overview.symbol)} to watchlist. <Button color="inherit" component={Link} to={successWatchlistId ? `/watchlists/${successWatchlistId}` : '/watchlists'} size="small">Open</Button>
        </Alert>
      </Snackbar>
      <CreateAlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        defaults={{
          name: `${stripSuffix(String(overview.symbol))} price above ${money(overview.latest_price, overview.currency)}`,
          type: 'PRICE_ABOVE',
          scope: 'STOCK',
          instrumentId: String(overview.instrument_id),
          condition: { threshold: typeof overview.latest_price === 'number' ? overview.latest_price : undefined },
        }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SignalWidget instrumentId={String(overview.instrument_id || '')} />
          {/* NR-59: Surface calibrated score inline from workbench signalEvidence when present.
              The /signals/:id endpoint returns a raw persisted DTO without calibration overlay,
              so calibrationStatus is never 'CALIBRATED' there. The workbench already reads
              calibration via a separate persisted-read; we surface it here as an honest
              supplement — shown only when a calibration row actually exists. */}
          {data.signalEvidence?.calibratedScore !== null && data.signalEvidence?.calibratedScore !== undefined && (
            <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 3, mt: -2, borderTop: 0, borderRadius: '0 0 4px 4px', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Calibrated score:
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {Number(data.signalEvidence.calibratedScore).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </Typography>
                {data.signalEvidence.calibratedDirection && (
                  <Chip
                    label={String(data.signalEvidence.calibratedDirection)}
                    size="small"
                    color={
                      data.signalEvidence.calibratedDirection === 'BULLISH' ? 'success'
                      : data.signalEvidence.calibratedDirection === 'BEARISH' ? 'error'
                      : 'default'
                    }
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                )}
                <Tooltip title="Calibrated score from this instrument's latest stored calibration, based on historical signal outcomes — for research reference only." arrow>
                  <Typography variant="caption" color="text.disabled" sx={{ cursor: 'help', ml: 'auto' }}>
                    calibrated from history
                  </Typography>
                </Tooltip>
              </Box>
            </Paper>
          )}
          {/* Show explicit "calibration pending" only when calibratedScore is truly absent */}
          {(data.signalEvidence?.calibratedScore === null || data.signalEvidence?.calibratedScore === undefined) && (
            <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 3, mt: -2, borderTop: 0, borderRadius: '0 0 4px 4px', bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.disabled">
                Calibration pending — no calibration record yet for this instrument.
              </Typography>
            </Paper>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <StrategyDecisionWidget instrumentId={String(overview.instrument_id || '')} />
        </Grid>
      </Grid>

      {/* ── Price chart with SMA overlays (NR-2) + CA markers (NR-4) ── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box>
            <Typography variant="h6">Price Chart</Typography>
            {data.chart.adjusted_close_fallback && (
              <Typography variant="caption" color="text.secondary">Adjusted close unavailable for some rows; close is used as fallback.</Typography>
            )}
            {data.chart.insufficient_range_bars && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                Insufficient price bars for the selected range — this instrument has a data gap in this period. Try a shorter range or MAX.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              SMA-50 and SMA-200 overlays shown when series length exceeds the window. For research reference only.
            </Typography>
          </Box>
          <ToggleButtonGroup size="small" value={range} exclusive onChange={(_event, value) => value && setRange(value)}>
            {ranges.map((item) => <ToggleButton key={item} value={item}>{item}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>
        {chartData.length === 0 ? (
          <Typography color="text.secondary">No price history available.</Typography>
        ) : (
          <Box sx={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <XAxis dataKey="date" minTickGap={28} />
                <YAxis yAxisId="price" domain={['auto', 'auto']} />
                <YAxis yAxisId="volume" orientation="right" hide />
                <ChartTooltip />
                <Legend verticalAlign="top" />

                {/* NR-4: Corporate action reference lines */}
                {Array.from(corpActionDates.entries()).map(([dateStr, label]) => (
                  <ReferenceLine
                    key={dateStr}
                    yAxisId="price"
                    x={dateStr}
                    stroke="#f57c00"
                    strokeDasharray="4 3"
                    label={{ value: label, position: 'insideTopRight', fontSize: 10, fill: '#f57c00' }}
                  />
                ))}

                <Bar yAxisId="volume" dataKey="volume" fill="#cfd8dc" name="Volume" />
                <Line yAxisId="price" type="monotone" dataKey="adjusted_close" stroke="#1976d2" strokeWidth={2} dot={false} name="Price" />
                {/* NR-2: SMA-50 overlay — only renders where non-null */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="sma50"
                  stroke="#e65100"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  name="SMA 50"
                />
                {/* NR-2: SMA-200 overlay — only renders where non-null */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="sma200"
                  stroke="#2e7d32"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  name="SMA 200"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Section title="Performance" status={data.trust.data_status} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          <MetricGrid items={{
            [`${range} Return`]: formatPercent(data.performance.selected_range_return),
            '1D Return': formatPercent(data.performance.return_1d),
            '1W Return': formatPercent(data.performance.return_1w),
            '1M Return': formatPercent(data.performance.return_1m),
            'YTD Return': formatPercent(data.performance.return_ytd),
            '1Y Return': formatPercent(data.performance.return_1y),
            '3Y CAGR': formatPercent(data.performance.cagr_3y),
            'Max Drawdown': formatPercent(data.performance.max_drawdown),
            Volatility: formatPercent(data.performance.volatility),
          }} />
        </Section>

        <Section
          title="Fundamental Snapshot"
          status={String(fundamentals?.data_status || 'MISSING')}
          source={String(fundamentals?.source || 'database')}
          updatedAt={typeof fundamentals?.last_updated_timestamp === 'string' ? fundamentals.last_updated_timestamp : null}
        >
          {fundamentals ? (
            <MetricGrid items={{
              Revenue: compactByProfile(fundamentals.revenue, { currency: fundamentals.currency || overview.currency || 'INR' }),
              EPS: money(fundamentals.eps, fundamentals.currency || overview.currency),
              'Net Income': compactByProfile(fundamentals.net_income, { currency: fundamentals.currency || overview.currency || 'INR' }),
              'P/E': <DerivedValue value={formatNumber(fundamentals.pe_ratio)} derived={!!fundamentals._pe_ratio_derived} />,
              'Dividend Yield': <DerivedValue value={formatPercent(fundamentals.dividend_yield)} derived={!!fundamentals._dividend_yield_derived} />,
              Shares: formatNumber(fundamentals.shares_outstanding),
              'Market Cap': <DerivedValue value={compactByProfile(fundamentals.market_cap, { currency: fundamentals.currency || overview.currency || 'INR' })} derived={!!fundamentals._market_cap_derived} />,
              Period: String(fundamentals.period_type || 'N/A'),
            }} />
          ) : <Typography color="text.secondary">No fundamentals available.</Typography>}
        </Section>

        <Section title="Valuation Context" status={data.trust.data_status} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          {!fundamentals && data.peers.length === 0 ? (
            <Typography color="text.secondary">No valuation context available because fundamentals and peers are missing.</Typography>
          ) : (
            <MetricGrid items={{
              'Stock P/E': formatNumber(valuation.pe_ratio),
              'Peer Avg P/E': formatNumber(valuation.peer_average_pe),
              'Dividend Yield': formatPercent(valuation.dividend_yield),
              'Peer Avg Yield': formatPercent(valuation.peer_average_dividend_yield),
              'Market Cap Rank': valuation.market_cap_rank ? `${valuation.market_cap_rank} of ${valuation.peer_count + 1}` : 'N/A',
            }} />
          )}
        </Section>

        <Section title="Relative Strength" status={String(data.relative_strength.data_status || 'MISSING')} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          {/* NR-58: when stock_return is null it is always a data-gap edge case (selectedPrices < 2
              for the chosen range). Show an honest explanation instead of a bare N/A grid. */}
          {data.relative_strength.stock_return === null ? (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Insufficient price history for the <strong>{range}</strong> range — this instrument has a data gap
              covering the selected period. Try a shorter range or MAX to see available data.
            </Alert>
          ) : (
            <MetricGrid items={{
              'Stock Return': formatPercent(data.relative_strength.stock_return),
              ...(data.relative_strength.benchmark_symbol
                ? {
                    [`Benchmark (${String(data.relative_strength.benchmark_symbol)})`]: formatPercent(data.relative_strength.benchmark_return),
                    'vs Benchmark': formatPercent(data.relative_strength.relative_to_benchmark),
                  }
                : {}),
              'Peer Avg Return': formatPercent(data.relative_strength.peer_average_return),
              'Relative to Peers': formatPercent(data.relative_strength.relative_to_peer_average),
              Basis: `${range} ${String(data.relative_strength.fallback_used || 'N/A')}`,
            }} />
          )}
        </Section>
      </Box>

      <Section title="Peer Comparison" status={data.peers.length > 0 ? 'PARTIAL' : 'MISSING'} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
        {data.peers.length === 0 ? (
          <Typography color="text.secondary">No peers available from the current instrument universe.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {data.peers.map((peer) => (
              <Paper
                key={String(peer.instrument_id)}
                variant="outlined"
                onClick={() => navigate(`/research/stocks/${String(peer.instrument_id)}`)}
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <Typography fontWeight={700}>{stripSuffix(String(peer.symbol))} | {String(peer.company_name)}</Typography>
                <Typography variant="body2" color="text.secondary">{String(peer.exchange || 'UNKNOWN')}</Typography>
                <Typography variant="body2">Price: {money(peer.latest_price, overview.currency)} | {range}: {formatPercent(peer.return_selected)}</Typography>
                <Typography variant="body2">P/E: {formatNumber(peer.pe_ratio)} | Yield: {formatPercent(peer.dividend_yield)}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Section>

      <Section
        title="Corporate Actions"
        status={data.corporate_actions.length > 0 ? 'COMPLETE' : 'MISSING'}
        source={String(data.corporate_actions[0]?.source || data.trust.source)}
        updatedAt={String(data.corporate_actions[0]?.last_updated_timestamp || data.trust.last_updated_timestamp || '') || null}
      >
        {data.corporate_actions.length === 0 ? (
          <Typography color="text.secondary">No corporate actions available.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {data.corporate_actions.map((action) => (
              <Paper key={`${action.action_type}-${action.effective_date}-${action.value}`} variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight={700}>{String(action.action_type)} | {new Date(String(action.effective_date)).toLocaleDateString()}</Typography>
                <Typography variant="body2">Amount: {money(action.amount, action.currency || overview.currency)} | Ratio: {formatNumber(action.ratio)} | {String(action.currency || overview.currency)}</Typography>
                <Typography variant="caption" color="text.secondary">{String(action.source)} | {String(action.data_status)}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Section>

      <SignalEvidencePanel evidence={data.signalEvidence} />
    </Box>
  );
};

const Section: React.FC<{ title: string; status?: string; source?: string; updatedAt?: string | null; children: React.ReactNode }> = ({ title, status, source, updatedAt, children }) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        {(source || updatedAt) && (
          <Typography variant="caption" color="text.secondary">
            {source || 'database'} | {formatDateTime(updatedAt)}
          </Typography>
        )}
      </Box>
      <StatusChip status={status} />
    </Box>
    {children}
  </Paper>
);

const MetricGrid: React.FC<{ items: Record<string, React.ReactNode> }> = ({ items }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
    {Object.entries(items).map(([label, value]) => (
      <Box key={label}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body1" fontWeight={700}>{value}</Typography>
      </Box>
    ))}
  </Box>
);

/** Wraps a formatted value with a small "derived" badge when the value was computed, not persisted. */
const DerivedValue: React.FC<{ value: string; derived: boolean }> = ({ value, derived }) =>
  derived ? (
    <Tooltip title="Computed from available inputs — not a value reported in the company's filings" arrow>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.4 }}>
        {value}
        <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 400 }}>
          derived
        </Typography>
      </Box>
    </Tooltip>
  ) : <>{value}</>;

/**
 * Signal Evidence / Track Record section.
 *
 * Shows persisted signal quality data only — nothing is live-recomputed on page load.
 * When no track record exists yet, says so honestly instead of hiding the section.
 */
const SignalEvidencePanel: React.FC<{ evidence?: SignalEvidenceSection }> = ({ evidence }) => {
  if (!evidence) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Signal Evidence / Track Record</Typography>
        <Typography color="text.secondary">Signal evidence not available for this instrument.</Typography>
      </Paper>
    );
  }

  const statusColor = evidence.status === 'AVAILABLE' ? 'success' : evidence.status === 'CALIBRATION_PENDING' ? 'warning' : 'default';
  const tierColor = evidence.reliabilityTier === 'FULL' ? 'success' : evidence.reliabilityTier === 'PARTIAL' ? 'warning' : 'default';

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Signal Evidence / Track Record</Typography>
          <Typography variant="caption" color="text.secondary">
            Based on stored signal outcomes and calibration records, updated after market close.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={evidence.status.replace(/_/g, ' ')}
            size="small"
            color={statusColor}
            variant="outlined"
          />
          {evidence.reliabilityTier && (
            <Chip
              label={`${evidence.reliabilityTier} reliability`}
              size="small"
              color={tierColor}
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      {evidence.status === 'NO_TRACK_RECORD' && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          No outcome track record yet — outcome data will populate as signals mature over time. This is expected for recently listed stocks or instruments with no recent signals.
        </Alert>
      )}

      {/* Always render calibration data when present, regardless of track-record status */}
      <MetricGrid items={{
        'Sample Size': evidence.outcomeDepth !== null ? String(evidence.outcomeDepth) : 'N/A',
        'Horizon': evidence.trackRecordHorizon ?? 'N/A',
        'Win Rate': evidence.winRate !== null ? formatPercent(evidence.winRate) : 'N/A',
        'Avg Forward Return': evidence.avgForwardReturn !== null ? formatPercent(evidence.avgForwardReturn) : 'N/A',
        'Calibrated Score': evidence.calibratedScore !== null ? formatNumber(evidence.calibratedScore) : 'N/A',
        'Calibrated Direction': evidence.calibratedDirection ?? 'N/A',
        'Reliability Tier': evidence.reliabilityTier ?? 'N/A',
      }} />

      {evidence.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {evidence.note}
        </Typography>
      )}
    </Paper>
  );
};

export default StockResearchWorkbenchPage;
