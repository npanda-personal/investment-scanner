import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowForwardOutlined } from '@mui/icons-material';
import InstrumentDetailPage from './InstrumentDetailPage';
import StockResearchWorkbenchPage from '@/features/stock-research-workbench';
import { PageHeader } from '@/shared/components';
import { fetchInstrumentContextSnapshot } from '@/features/market-intelligence/api/marketIntelligenceService';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchInstruments } from '../api/marketDataFoundationService';

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'research', label: 'Research' },
  { value: 'prices', label: 'Prices' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'signals', label: 'Signals' },
  { value: 'quality', label: 'Signal Quality' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'smart-money', label: 'Smart Money' },
];

/**
 * Map of module tab values to their admin dashboard base paths.
 * Each link is deep-linked with ?instrumentId=<id> so the dashboard
 * can pre-filter to this instrument.
 */
const MODULE_TAB_LINKS: Record<
  string,
  { label: string; path: string; description: string; detail: string }
> = {
  signals: {
    label: 'Signal Generation Engine',
    path: '/signal-generation-engine',
    description: 'Signal results and outcome history for this instrument.',
    detail:
      'The Signal Generation Engine computes directional signals (BULLISH / BEARISH / NEUTRAL) from price action, momentum, fundamentals, and regime context. Opening this instrument there shows its full signal history, current signal state, and any active exit candidates.',
  },
  quality: {
    label: 'Signal Quality Lab',
    path: '/signal-quality-lab',
    description: 'Outcome accuracy, win rates, and track-record depth for this instrument.',
    detail:
      'The Signal Quality Lab scores each signal against its forward return. For this instrument you can review win rates by signal direction, sample depth, calibrated conviction scores, and reliability tier (FULL / PARTIAL). Low-sample signals are flagged with a confidence interval warning.',
  },
  calibration: {
    label: 'Signal Calibration Engine',
    path: '/signal-calibration-engine',
    description: 'Calibration results, score distribution, and per-bucket confidence.',
    detail:
      'Calibration maps raw composite scores to empirical win-rate buckets. For this instrument the dashboard shows the score distribution across historical signals, calibration curve quality, and how the current score compares to the calibrated expectation.',
  },
  'smart-money': {
    label: 'Smart Money Intelligence',
    path: '/smart-money-intelligence',
    description: 'Institutional flow and smart money signals for this instrument.',
    detail:
      'The Smart Money Intelligence module tracks institutional delivery data (NSE/BSE) to identify accumulation or distribution patterns. This dashboard shows net institutional flow, price correlation, and any active smart money signals for this instrument.',
  },
};

export default function UnifiedStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const activeTab = searchParams.get('tab') || 'overview';

  const moduleTabLink = id ? MODULE_TAB_LINKS[activeTab] : null;

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Instrument Workspace"
        subtitle="Read-only instrument evidence, market context gaps, personal research workflow links, and source freshness."
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
      ) : activeTab === 'overview' || activeTab === 'prices' || activeTab === 'fundamentals' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <InstrumentDetailPage />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MarketContextRail instrumentId={id} />
          </Grid>
        </Grid>
      ) : moduleTabLink ? (
        <ModuleTabCard
          tabLabel={tabs.find((tab) => tab.value === activeTab)?.label ?? activeTab}
          link={moduleTabLink}
          instrumentId={id}
        />
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">
            {tabs.find((tab) => tab.value === activeTab)?.label}
          </Typography>
          <Typography color="text.secondary">
            This tab is reserved for the module-owned view. Use the main module dashboards for
            full analysis.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/**
 * Renders an informative call-to-action card for a module tab that lives in
 * a separate dashboard. Shows a short description, contextual detail, and a
 * prominent link button rather than a bare URL stub.
 */
function ModuleTabCard({
  tabLabel,
  link,
  instrumentId,
}: {
  tabLabel: string;
  link: { label: string; path: string; description: string; detail: string };
  instrumentId: string | undefined;
}) {
  const deepLinkHref = instrumentId
    ? `${link.path}?instrumentId=${instrumentId}`
    : link.path;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {tabLabel}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {link.description}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {link.detail}
            </Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              This analysis lives in a dedicated dashboard. Use the link below to open
              {instrumentId ? ' this instrument' : ' the dashboard'} there.
            </Typography>
            <Button
              component={Link}
              to={deepLinkHref}
              variant="contained"
              endIcon={<ArrowForwardOutlined />}
              size="large"
            >
              Open in {link.label}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

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

function ContextRow({ label, value, color, sub }: {
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error' | 'default';
  sub?: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, pt: 0.4 }}>
        {label}
      </Typography>
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

function MarketContextRail({ instrumentId }: { instrumentId?: string }) {
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

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Market Context Rail</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Assembled from persisted read models only — no live generation on GET.
          Missing evidence shown honestly.
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
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Sector strength"
                value={sectorValue}
                color={sectorClassColor(ctx.sectorStrength.value?.classification)}
                sub={ctx.sectorStrength.absent ? ctx.sectorStrength.source : undefined}
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
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Smart money"
                value={smValue}
                color={
                  ctx.smartMoney.absent ? 'default'
                    : ctx.smartMoney.value?.status === 'ACCUMULATION' ? 'success'
                    : ctx.smartMoney.value?.status === 'DISTRIBUTION' ? 'error'
                    : 'default'
                }
                sub={ctx.smartMoney.asOf ? `as of ${ctx.smartMoney.asOf}` : undefined}
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
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Latest signal"
                value={signalValue}
                color={signalColor(ctx.latestSignal.value?.direction)}
                sub={ctx.latestSignal.asOf ? `as of ${ctx.latestSignal.asOf}` : undefined}
              />
            </>
          )}
        </Stack>
      </Paper>

      <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
        Personal actions: Watchlists, Alerts, and Portfolios. Context updates via daily data pipeline.
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
