import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InstrumentDetailPage from './InstrumentDetailPage';
import StockResearchWorkbenchPage from '@/features/stock-research-workbench';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchInstruments, fetchInstrument } from '../api/marketDataFoundationService';
import { SignalsHistoryTab } from './SignalsHistoryTab';
import { MarketContextRail } from './MarketContextRail';
import InstrumentPriceChart from '@/shared/components/InstrumentPriceChart';
import SourceListRail from '@/shared/workspace/SourceListRail';
import { buildTradingViewSymbol } from '@/shared/format/tradingViewSymbol';

const tabs = [
  { value: 'chart', label: 'Chart' },
  { value: 'overview', label: 'Overview' },
  { value: 'research', label: 'Research' },
  { value: 'prices', label: 'Prices' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'signals-history', label: 'Signals & History' },
];

// Tall, viewport-relative height so the chart reads like a real trading chart (and the
// rail aligns to the same height) instead of a short strip with empty space below.
const CHART_HEIGHT = { xs: '64vh', lg: '78vh' };

export default function UnifiedStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const activeTab = searchParams.get('tab') || 'chart';
  const { scope } = useMarketScope();

  // Fetch instrument record so we can pass derivativesEligible + symbol to the rail,
  // and build the TradingView symbol for the Chart tab.
  const [derivativesEligible, setDerivativesEligible] = useState<boolean | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [tvSymbol, setTvSymbol] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    fetchInstrument(id, { region: scope.region, assetType: scope.assetType })
      .then((inst) => {
        setDerivativesEligible(inst.derivatives_eligible ?? null);
        setSymbol(inst.symbol ?? null);
        setTvSymbol(
          buildTradingViewSymbol({
            symbol: inst.symbol,
            exchange: inst.exchange,
            asset_type: inst.asset_type,
            // Fall back to the active market so an instrument with a missing region still
            // gets the correct exchange prefix (e.g. NSE: for an IN-market stock).
            region: inst.region ?? scope.region,
          }),
        );
      })
      .catch(() => {
        setDerivativesEligible(null);
        setSymbol(null);
        setTvSymbol(undefined);
      });
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
            setSearchParams(value === 'chart' ? {} : { tab: value })
          }
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {activeTab === 'chart' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={9}>
            <InstrumentPriceChart
              instrumentId={id}
              region={scope.region}
              assetType={scope.assetType}
              tvSymbol={tvSymbol}
              height={CHART_HEIGHT}
            />
          </Grid>
          <Grid item xs={12} lg={3}>
            <SourceListRail activeInstrumentId={id} height={CHART_HEIGHT} />
          </Grid>
        </Grid>
      ) : activeTab === 'research' ? (
        <StockResearchWorkbenchPage />
      ) : activeTab === 'signals-history' ? (
        <SignalsHistoryTab instrumentId={id} />
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <InstrumentDetailPage />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MarketContextRail instrumentId={id} symbol={symbol} derivativesEligible={derivativesEligible} />
          </Grid>
        </Grid>
      )}
    </Box>
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
