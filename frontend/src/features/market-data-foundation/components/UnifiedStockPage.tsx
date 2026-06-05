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
import { useReadModelSnapshot } from '@/features/market-intelligence/hooks/useMarketIntelligenceSnapshot';
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
            <MarketContextRail />
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

function MarketContextRail() {
  const { data, loading } = useReadModelSnapshot(fetchInstrumentContextSnapshot);
  const snapshot = data?.snapshot ?? null;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Market Context Rail</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Context here must come from persisted read models only. Missing evidence is shown
          instead of triggering data-production work.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={800}>
            Instrument context snapshot
          </Typography>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              Loading context snapshot.
            </Typography>
          )}
          {!loading && !snapshot && (
            <Alert severity="info">
              Instrument context not available yet.
            </Alert>
          )}
          <Chip
            label={`Market Pulse State: ${snapshot?.marketState || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Sector State: ${snapshot?.sectorState || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Relative Strength: ${snapshot?.relativeStrength || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Earnings Status: ${snapshot?.earningsStatus || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Compounder Status: ${snapshot?.compounderStatus || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Setup Status: ${snapshot?.setupStatus || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Risk Status: ${snapshot?.riskStatus || 'Unavailable'}`}
            variant="outlined"
          />
          <Chip
            label={`Freshness: ${snapshot?.freshness?.label || 'Unavailable'}`}
            variant="outlined"
          />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Instrument context not available yet.
          </Typography>
        </Stack>
      </Paper>
      <Alert severity="info">
        Personal actions remain available through Watchlists, Alerts, and Portfolios. Shared
        market data sync, repair, and generation actions are Admin / Data Ops workflows.
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
