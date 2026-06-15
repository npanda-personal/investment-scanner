import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InstrumentDetailPage from './InstrumentDetailPage';
import StockResearchWorkbenchPage from '@/features/stock-research-workbench';
import { PageHeader } from '@/shared/components';
import { fetchInstrumentContextSnapshot, fetchInstrumentSignalHistory, fetchInstrumentOutcomes } from '@/features/market-intelligence/api/marketIntelligenceService';
import type { InstrumentOutcomeAggregate, SignalHistoryRow } from '@/features/market-intelligence/api/marketIntelligenceService';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { exchangeLabel } from '@/shared/format/exchangeLabels';
import { fetchInstruments, fetchInstrument } from '../api/marketDataFoundationService';
import CryptoInstrumentDetail from './CryptoInstrumentDetail';

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'research', label: 'Research' },
  { value: 'prices', label: 'Prices' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'signals-history', label: 'Signals & History' },
];

export default function UnifiedStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const activeTab = searchParams.get('tab') || 'overview';
  const { scope } = useMarketScope();

  // Fetch instrument record so we can pass derivativesEligible to the rail
  const [derivativesEligible, setDerivativesEligible] = useState<boolean | null>(null);
  useEffect(() => {
    if (!id) return;
    fetchInstrument(id, { region: scope.region, assetType: scope.assetType })
      .then((inst) => setDerivativesEligible(inst.derivatives_eligible ?? null))
      .catch(() => setDerivativesEligible(null));
  }, [id, scope.region, scope.assetType]);

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Stock Workspace"
        subtitle="Price history, market context, research tools, and signal track record for this stock."
        backTo="/instrument-workspace"
        backLabel="Instrument search"
      />
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) =>
            setSearchParams(value === 'overview' ? {} : { tab: value })
          }
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {activeTab === 'research' ? (
        <StockResearchWorkbenchPage />
      ) : activeTab === 'signals-history' ? (
        <SignalsHistoryTab instrumentId={id} />
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <InstrumentDetailPage activeTab={activeTab} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MarketContextRail instrumentId={id} derivativesEligible={derivativesEligible} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Signals & History tab
// ---------------------------------------------------------------------------

function confidenceChipColor(
  confidence: WinRateConfidence | null,
): 'success' | 'warning' | 'error' | 'default' {
  if (confidence === 'HIGH') return 'success';
  if (confidence === 'MEDIUM') return 'warning';
  if (confidence === 'LOW') return 'error';
  return 'default';
}

type WinRateConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

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

function SignalsHistoryTab({ instrumentId }: { instrumentId?: string }) {
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

// ---------------------------------------------------------------------------
// Market Context Rail helpers
// ---------------------------------------------------------------------------

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function regimeColor(regime: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!regime) return 'default';
  if (regime === 'RISK_ON') return 'success';
  if (regime === 'RISK_OFF') return 'error';
  if (regime === 'NEUTRAL') return 'warning';
  return 'default';
}

function signalColor(direction: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!direction) return 'default';
  if (direction === 'BULLISH') return 'success';
  if (direction === 'BEARISH') return 'error';
  return 'warning';
}

function sectorClassColor(cls: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!cls) return 'default';
  if (cls === 'STRONG') return 'success';
  if (cls === 'IMPROVING') return 'warning';
  if (cls === 'WEAK') return 'error';
  return 'default';
}

function ContextRow({ label, value, color, sub, tooltip }: {
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error' | 'default';
  sub?: string;
  tooltip?: string;
}) {
  const labelEl = (
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, pt: 0.4, cursor: tooltip ? 'help' : undefined }}>
      {label}
    </Typography>
  );
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      {tooltip ? (
        <Tooltip title={tooltip} placement="left">
          {labelEl}
        </Tooltip>
      ) : labelEl}
      <Stack alignItems="flex-end" spacing={0}>
        <Chip
          label={value}
          size="small"
          color={color ?? 'default'}
          variant={color && color !== 'default' ? 'filled' : 'outlined'}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {sub}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function MarketContextRail({
  instrumentId,
  derivativesEligible,
}: {
  instrumentId?: string;
  derivativesEligible?: boolean | null;
}) {
  const { scope, profile } = useMarketScope();

  const [snapshot, setSnapshot] = useState<import('@/features/market-intelligence/types').InstrumentContextSnapshot | null>(null);
  const [loading, setLoading] = useState(!!instrumentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instrumentId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    setError(null);
    fetchInstrumentContextSnapshot(scope, instrumentId)
      .then((result) => {
        if (!canceled) {
          setSnapshot(result.snapshot);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Failed to load context');
          setLoading(false);
        }
      });
    return () => { canceled = true; };
  }, [instrumentId, scope]);

  const ctx = snapshot;

  const regimeValue = ctx?.marketRegime.absent
    ? '—'
    : `${ctx?.marketRegime.value?.regime ?? '—'} (${ctx?.marketRegime.value?.score ?? '—'})`;

  const sectorValue = ctx?.sectorStrength.absent
    ? '—'
    : `${ctx?.sectorStrength.value?.sector ?? '—'}: ${ctx?.sectorStrength.value?.classification ?? '—'}`;

  const rsValue = ctx?.relativeStrength.absent
    ? '—'
    : (() => {
        const rs = ctx?.relativeStrength.value;
        if (!rs) return '—';
        if (rs.relativeReturn63d !== null && rs.relativeReturn63d !== undefined) {
          return `vs ${profile.benchmarkLabel} ${formatPercent(rs.relativeReturn63d)}`;
        }
        if (rs.stockReturn63d !== null && rs.stockReturn63d !== undefined) {
          return `63d: ${formatPercent(rs.stockReturn63d)}`;
        }
        return '—';
      })();

  const smValue = ctx?.smartMoney.absent
    ? '—'
    : `${ctx?.smartMoney.value?.status ?? '—'} (${ctx?.smartMoney.value?.score ?? '—'})`;

  const fnoBanValue = ctx?.fnoBan.absent
    ? '—'
    : ctx?.fnoBan.value?.banned
      ? `Banned (${ctx?.fnoBan.value?.banDate ?? ''})`
      : 'Not banned';

  const signalValue = ctx?.latestSignal.absent
    ? '—'
    : `${ctx?.latestSignal.value?.direction ?? '—'} (${ctx?.latestSignal.value?.score !== undefined ? Math.round(ctx?.latestSignal.value?.score ?? 0) : '—'})`;

  const fnoEligibleValue =
    derivativesEligible === true ? 'Yes'
    : derivativesEligible === false ? 'No'
    : '—';

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Market Context</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Assembled from saved data. Missing data shown clearly.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Instrument context
          </Typography>

          {!instrumentId && (
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              No instrument selected.
            </Alert>
          )}

          {instrumentId && loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Loading context…</Typography>
            </Box>
          )}

          {instrumentId && !loading && error && (
            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>{error}</Alert>
          )}

          {instrumentId && !loading && !ctx && !error && (
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              Context not available — instrument may not exist in catalog.
            </Alert>
          )}

          {ctx && (
            <>
              <ContextRow
                label="Market regime"
                value={regimeValue}
                color={regimeColor(ctx.marketRegime.value?.regime)}
                sub={ctx.marketRegime.asOf ? `as of ${ctx.marketRegime.asOf}` : undefined}
                tooltip="Broad market posture: RISK_ON = favorable conditions, NEUTRAL = mixed, RISK_OFF = unfavorable."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Sector strength"
                value={sectorValue}
                color={sectorClassColor(ctx.sectorStrength.value?.classification)}
                sub={ctx.sectorStrength.absent ? ctx.sectorStrength.source : undefined}
                tooltip="How this stock's sector is trending relative to its recent average."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Relative strength"
                value={rsValue}
                color={
                  ctx.relativeStrength.absent ? 'default'
                    : (ctx.relativeStrength.value?.relativeReturn63d ?? 0) >= 0.05 ? 'success'
                    : (ctx.relativeStrength.value?.relativeReturn63d ?? 0) <= -0.05 ? 'error'
                    : 'warning'
                }
                sub={ctx.relativeStrength.asOf ? `prices as of ${ctx.relativeStrength.asOf}` : undefined}
                tooltip="How this stock's 63-day return compares to the benchmark index."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Institutional flow"
                value={smValue}
                color={
                  ctx.smartMoney.absent ? 'default'
                    : ctx.smartMoney.value?.status === 'ACCUMULATION' ? 'success'
                    : ctx.smartMoney.value?.status === 'DISTRIBUTION' ? 'error'
                    : 'default'
                }
                sub={ctx.smartMoney.asOf ? `as of ${ctx.smartMoney.asOf}` : undefined}
                tooltip={`Institutional buying (ACCUMULATION) or selling (DISTRIBUTION) pattern from ${exchangeLabel(scope)} delivery data.`}
              />
              {/* F&O eligibility / ban are India NSE-only concepts — gate by capability. */}
              {profile.capabilities.hasDelivery && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <ContextRow
                    label="F&O eligible"
                    value={fnoEligibleValue}
                    color={
                      derivativesEligible === true ? 'success'
                        : derivativesEligible === false ? 'default'
                        : 'default'
                    }
                    tooltip="Whether this stock has futures and options contracts listed on NSE."
                  />
                  <Divider sx={{ my: 0.5 }} />
                  <ContextRow
                    label="F&O ban"
                    value={fnoBanValue}
                    color={
                      ctx.fnoBan.absent ? 'default'
                        : ctx.fnoBan.value?.banned ? 'error'
                        : 'success'
                    }
                    sub={ctx.fnoBan.asOf ? `ban list ${ctx.fnoBan.asOf}` : undefined}
                    tooltip="Stocks in the F&O ban period cannot have new derivative positions opened."
                  />
                </>
              )}
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Latest signal"
                value={signalValue}
                color={signalColor(ctx.latestSignal.value?.direction)}
                sub={ctx.latestSignal.asOf ? `as of ${ctx.latestSignal.asOf}` : undefined}
                tooltip="The most recent signal direction and score for this stock."
              />
            </>
          )}
        </Stack>
      </Paper>

      <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
        Watchlists, Alerts, and Portfolios are personal tools. Context data updates via the daily pipeline.
      </Alert>
    </Stack>
  );
}

/**
 * Handles deep-link URLs of the form /instrument-workspace/:symbol
 * (e.g. /instrument-workspace/RELIANCE).
 *
 * Looks up the symbol in the instrument catalog and redirects to
 * /stocks/:id once found. Shows a loading spinner during resolution
 * and an error if the symbol is not in the catalog.
 */
export function InstrumentWorkspaceSymbolRedirect() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setNotFound(true);
      return;
    }

    let canceled = false;
    fetchInstruments({
      search: symbol,
      page: 1,
      pageSize: 5,
      sortBy: 'symbol',
      sortOrder: 'asc',
    })
      .then((response) => {
        if (canceled) return;
        // Prefer an exact match on symbol (case-insensitive), fall back to first result.
        const upper = symbol.toUpperCase();
        const exact = response.instruments.find(
          (inst) =>
            inst.symbol.toUpperCase() === upper ||
            inst.display_symbol?.toUpperCase() === upper ||
            inst.source_symbol?.toUpperCase() === upper,
        );
        const match = exact ?? response.instruments[0] ?? null;
        if (match?.id) {
          setResolvedId(match.id);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!canceled) setNotFound(true);
      });

    return () => {
      canceled = true;
    };
  }, [symbol]);

  if (resolvedId) {
    return <Navigate to={`/stocks/${resolvedId}`} replace />;
  }

  if (notFound) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 6 }}>
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/instrument-workspace')}
            >
              Search
            </Button>
          }
        >
          <strong>{symbol}</strong> was not found in the local catalog. Use the search box to
          find the instrument.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}
    >
      <Stack alignItems="center" spacing={1}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Resolving {symbol}...
        </Typography>
      </Stack>
    </Box>
  );
}
