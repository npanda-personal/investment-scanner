import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { MarketPulseAdvanceDeclineSummary, MarketPulseVixSummary } from '../types';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FreshnessChip, InstrumentSearchSelect, PageHeader, SortableTableCell } from '@/shared/components';
import { useTableSort, sortRows } from '@/shared/hooks';
import type { V1Instrument } from '@/features/market-data-foundation';
import { humanizeCode, indexLabel, isHeadlineIndex } from '@/shared/format/enumLabels';
import { money, changeColor } from '@/shared/format/money';
import {
  fetchCompounderRadarSnapshot,
  fetchEarningsIntelligenceSnapshot,
  fetchMarketPulseSnapshot,
  fetchRiskRadarSnapshot,
  fetchSectorConstituents,
  fetchSectorIntelligenceSnapshot,
  fetchStockInterestRadarSnapshot,
  fetchTraderSetupRadarSnapshot,
} from '../api/marketIntelligenceService';
import { useReadModelSnapshot } from '../hooks/useMarketIntelligenceSnapshot';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { instrumentWorkspaceSubtitle } from '@/shared/format/exchangeLabels';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import type {
  CompounderSnapshot,
  EarningsIntelligenceSnapshot,
  MarketPulseSnapshot,
  RiskRadarSnapshot,
  SectorConstituentRow,
  SectorConstituentsEnvelope,
  SectorIntelligenceSnapshot,
  SnapshotEnvelope,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';

type RadarTab = {
  label: string;
  value: string;
};

const stockInterestTabs = [
  { label: "Today's Top Interest", value: 'TODAY_TOP_INTEREST' },
  { label: 'Growth Consistency', value: 'GROWTH_CONSISTENCY' },
  { label: 'Growth Acceleration', value: 'GROWTH_ACCELERATION' },
  { label: 'Sector Leaders', value: 'SECTOR_LEADERS' },
  { label: 'Accumulation', value: 'ACCUMULATION' },
  { label: 'Breakouts', value: 'BREAKOUTS' },
  { label: 'Risk / Avoid', value: 'RISK_AVOID' },
];

const earningsTabs = [
  { label: 'Upcoming Results', value: 'UPCOMING_RESULTS' },
  { label: 'Growth', value: 'GROWTH' },
  { label: 'Result Winners', value: 'RESULT_WINNERS' },
  { label: 'Result Disappointments', value: 'RESULT_DISAPPOINTMENTS' },
  { label: 'Result Reaction History', value: 'RESULT_REACTION_HISTORY' },
  { label: 'Earnings Watchlist', value: 'EARNINGS_WATCHLIST' },
];

// The FE flattens every backend category bucket into one list and the generic
// RadarPage filters that single list per tab — so without this, every tab
// inherits the same flatten order (UPCOMING-first) and the overlapping stocks
// lead all of them with identical rows.  This sorts each tab's already-filtered
// rows by that tab's OWN relevance so the tabs no longer lead the same way.
// Membership is unchanged — a stock can still appear under several tabs.
const num = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// Forward-date reliability tier (mirrors the backend upcoming bucket order):
// official board-meeting date > estimated-from-cadence > no/past date.
function earningsUpcomingTier(row: EarningsIntelligenceSnapshot): number {
  if (row.daysToResult === null || row.daysToResult === undefined) return 0;
  if (row.resultDateSource === 'OFFICIAL_CALENDAR') return 2;
  if (row.resultDateSource === 'ESTIMATED_FROM_CADENCE') return 1;
  return 0;
}

// Map the categorical 50/200 SMA posture to a 0–100 constructiveness score so it
// can blend into the watchlist health score.  Null posture contributes nothing.
function smaPostureScore(posture: string | null | undefined): number | null {
  switch (posture) {
    case 'ABOVE_50_200': return 100;
    case 'ABOVE_50_BELOW_200': return 70;
    case 'ABOVE_200': return 65;
    case 'ABOVE_50': return 60;
    case 'BELOW_50_ABOVE_200': return 40;
    case 'BELOW_200': return 30;
    case 'BELOW_50': return 25;
    case 'BELOW_50_200': return 0;
    default: return null;
  }
}

// RSI-14 mapped to a 0–100 "health band": healthiest in the constructive 50–65
// zone, tapering toward overbought (>70) and oversold (<40) extremes.
function rsiHealthScore(rsi: number | null | undefined): number | null {
  if (typeof rsi !== 'number' || !Number.isFinite(rsi)) return null;
  const distanceFromIdeal = Math.abs(rsi - 57.5); // centre of the 50–65 band
  return Math.max(0, Math.round(100 - distanceFromIdeal * 2));
}

// Blended fundamentals+technicals health score (0–100) for the Earnings Watchlist
// ranking.  Averages only the components that are present, so it degrades
// gracefully where a component is null (e.g. US has no deliveryPercent, or a
// technicals warm-up window is unmet).  Returns null when nothing is available.
function earningsHealthScore(row: EarningsIntelligenceSnapshot): number | null {
  const components: number[] = [];
  const push = (value: number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) components.push(value);
  };
  push(row.consistencyScore);
  push(row.accelerationScore);
  push(row.pricePosition52w);
  if (typeof row.adx14 === 'number' && Number.isFinite(row.adx14)) push(Math.min(100, row.adx14));
  push(smaPostureScore(row.smaPosture));
  push(rsiHealthScore(row.rsi14));
  if (components.length === 0) return null;
  return components.reduce((acc, value) => acc + value, 0) / components.length;
}

// Tab membership for the Earnings view.  Backend categories drive most tabs as-is;
// the Watchlist tab is re-scoped here to exactly the upcoming-results population
// (owner spec: "best health score … only for upcoming results"), decoupled from
// the backend EARNINGS_WATCHLIST heuristic.
function earningsTabMembership(row: EarningsIntelligenceSnapshot): string[] {
  const categories = new Set(row.categories);
  categories.delete('EARNINGS_WATCHLIST');
  if (row.categories.includes('UPCOMING_RESULTS')) categories.add('EARNINGS_WATCHLIST');
  return [...categories];
}

function orderEarningsRowsForTab(
  rows: EarningsIntelligenceSnapshot[],
  tab: string,
): EarningsIntelligenceSnapshot[] {
  const sorted = [...rows];
  const FAR = Number.MAX_SAFE_INTEGER;
  switch (tab) {
    case 'UPCOMING_RESULTS':
      // Soonest, most-reliable forward date first.
      return sorted.sort((a, b) =>
        earningsUpcomingTier(b) - earningsUpcomingTier(a)
        || num(a.daysToResult, FAR) - num(b.daysToResult, FAR)
        || num(b.consistencyScore, 0) - num(a.consistencyScore, 0));
    case 'GROWTH':
      // Most consistently growing on top: recency-weighted QoQ-EPS trend score.
      // Rows without enough history (null score) sort last.
      return sorted.sort((a, b) =>
        num(b.epsGrowthTrendScore, -FAR) - num(a.epsGrowthTrendScore, -FAR)
        || num(b.consistencyScore, 0) - num(a.consistencyScore, 0));
    case 'RESULT_WINNERS':
      // Strongest sustained result first: avg of the last ≤4 QoQ profit-growth %s.
      return sorted.sort((a, b) =>
        num(b.avgProfitGrowthQoQ4q, -FAR) - num(a.avgProfitGrowthQoQ4q, -FAR)
        || num(b.profitGrowth, -FAR) - num(a.profitGrowth, -FAR));
    case 'RESULT_DISAPPOINTMENTS':
      // Weakest sustained result first: same avg-4-QoQ axis, ascending.
      return sorted.sort((a, b) =>
        num(a.avgProfitGrowthQoQ4q, FAR) - num(b.avgProfitGrowthQoQ4q, FAR)
        || num(a.profitGrowth, FAR) - num(b.profitGrowth, FAR));
    case 'RESULT_REACTION_HISTORY':
      // Most recent reported result first.
      return sorted.sort((a, b) => (b.resultDate ?? '').localeCompare(a.resultDate ?? ''));
    case 'EARNINGS_WATCHLIST':
      // Best blended health score (fundamentals + technicals) first; break ties
      // toward the soonest upcoming result.
      return sorted.sort((a, b) =>
        num(earningsHealthScore(b), -FAR) - num(earningsHealthScore(a), -FAR)
        || num(a.daysToResult, FAR) - num(b.daysToResult, FAR));
    default:
      return sorted;
  }
}

const compounderTabs = [
  { label: 'Consistent Growth', value: 'CONSISTENT_GROWTH' },
  { label: 'Quality + Growth', value: 'QUALITY_GROWTH' },
  { label: 'Growth + Momentum', value: 'GROWTH_MOMENTUM' },
  { label: 'Margin Expansion', value: 'MARGIN_EXPANSION' },
  { label: 'Ownership Support', value: 'OWNERSHIP_SUPPORT' },
];
const traderSetupTabs = [
  { label: 'Breakouts', value: 'BREAKOUTS' },
  { label: 'Base Breakouts', value: 'BASE_BREAKOUTS' },
  { label: 'Pullbacks', value: 'PULLBACKS' },
  { label: '52W Highs', value: '52W_HIGHS' },
  { label: 'Relative Strength Leaders', value: 'RELATIVE_STRENGTH_LEADERS' },
  { label: 'Low Volatility Squeeze', value: 'LOW_VOLATILITY_SQUEEZE' },
  { label: 'Delivery Expansion', value: 'DELIVERY_EXPANSION' },
];
const riskTabs = [
  { label: 'Weak Sector Stocks', value: 'WEAK_SECTOR_STOCKS' },
  { label: 'Breakdown Candidates', value: 'BREAKDOWN_CANDIDATES' },
  { label: 'Poor Result Reaction', value: 'POOR_RESULT_REACTION' },
  { label: 'Low Liquidity', value: 'LOW_LIQUIDITY' },
  { label: 'Stale Data', value: 'STALE_DATA' },
  { label: 'Portfolio Risk', value: 'PORTFOLIO_RISK' },
];

/** Count earnings rows with an upcoming result within 0–14 calendar days. */
function countUpcomingEarnings(rows: EarningsIntelligenceSnapshot[]): number {
  return rows.filter((row) => {
    const d = row.daysToResult;
    return typeof d === 'number' && d >= 0 && d <= 14;
  }).length;
}

export function MarketPulsePage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchMarketPulseSnapshot);
  const sectorView = useReadModelSnapshot(fetchSectorIntelligenceSnapshot);
  const earningsView = useReadModelSnapshot(fetchEarningsIntelligenceSnapshot);
  const snapshot = view.data?.snapshot ?? null;
  const earningsRows = earningsView.data?.snapshot ?? null;
  const upcomingEarningsCount = earningsRows !== null ? countUpcomingEarnings(earningsRows) : null;

  if (!profile.capabilities.hasMarketBreadth) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Market Pulse" subtitle="Is the market healthy enough to take risk?" />
        <NotApplicableForAssetClass feature="Market Pulse" />
      </Box>
    );
  }

  return (
    <SnapshotPageShell
      title="Market Pulse"
      subtitle="Is the market healthy enough to take risk?"
      loading={view.loading}
      error={view.error}
      envelope={view.data}
      missingTitle="Market Pulse data not available yet."
    >
      <EarningsSeasonBadge loading={earningsView.loading} upcomingCount={upcomingEarningsCount} />
      {snapshot && <MarketPulseSnapshotView snapshot={snapshot} shownWarnings={view.data?.warnings ?? []} />}
      <SectorIntelligencePanel envelope={sectorView.data} loading={sectorView.loading} error={sectorView.error} />
    </SnapshotPageShell>
  );
}

export function StockInterestRadarPage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchStockInterestRadarSnapshot);
  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Stock Interest Radar" subtitle="Which stocks deserve attention now?" />
        <NotApplicableForAssetClass
          feature="Stock Interest Radar"
          detail="Crypto coverage in this release is available on Market Scans and the Instrument workspace. This view will support crypto in a later update."
        />
      </Box>
    );
  }
  return (
    <RadarPage
      title="Stock Interest Radar"
      subtitle="Which stocks deserve attention now? Rows are shown in stored data order."
      tabs={stockInterestTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Stock Interest Radar data not available yet."
      getRowCategories={(row) => [(row as StockInterestSnapshot).category]}
      renderTable={(rows) => <StockInterestTable rows={rows as StockInterestSnapshot[]} />}
    />
  );
}

/** Per-category empty-state messages for the Earnings Intelligence screen. */
const EARNINGS_EMPTY_MESSAGES: Record<string, string> = {
  UPCOMING_RESULTS:
    'No stocks have a result date within the next 90 days in stored data. ' +
    'This category populates when an official earnings calendar is available or when ' +
    'period-cadence estimates fall within 90 days. Data updates on the next scheduled refresh.',
  GROWTH:
    'No stocks have enough consecutive quarterly EPS history to compute a growth trend yet. ' +
    'The Growth tab ranks instruments by their recent QoQ-EPS trend; rows appear once at least ' +
    'three EPS-bearing quarters are available. Data updates on the next scheduled refresh.',
  RESULT_WINNERS:
    'No stocks showed strong post-result growth in the last 60 days in stored data. ' +
    'Winners are identified from revenue, profit, and EPS growth with at least 2 positive metrics.',
  RESULT_DISAPPOINTMENTS:
    'No stocks showed a significant earnings miss or price drop in the last 60 days in stored data.',
  RESULT_REACTION_HISTORY:
    'No stocks have a price-reaction history calculated yet. ' +
    'This category requires an official earnings date and ' +
    'at least one price bar 5 trading sessions after the result date.',
  EARNINGS_WATCHLIST:
    'No upcoming-result stocks are available to rank by health score yet. ' +
    'The watchlist ranks the upcoming-results population by a blended fundamentals + technicals ' +
    'health score; it populates once upcoming results are in stored data.',
};

export function EarningsIntelligencePage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchEarningsIntelligenceSnapshot);
  if (!profile.capabilities.hasEarnings) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Earnings Intelligence" subtitle="Which result-related stocks deserve attention?" />
        <NotApplicableForAssetClass feature="Earnings intelligence" />
      </Box>
    );
  }
  return (
    <RadarPage
      title="Earnings Intelligence"
      subtitle="Which result-related stocks deserve attention?"
      tabs={earningsTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Earnings Intelligence data not available yet."
      getRowCategories={(row) => earningsTabMembership(row as EarningsIntelligenceSnapshot)}
      orderRowsForTab={(rows, tab) => orderEarningsRowsForTab(rows as EarningsIntelligenceSnapshot[], tab) as typeof rows}
      renderTable={(rows) => <EarningsTable rows={rows as EarningsIntelligenceSnapshot[]} />}
      tabEmptyMessages={EARNINGS_EMPTY_MESSAGES}
    />
  );
}

const deadEndSuggestionLink = { to: '/stock-interest-radar', label: 'Open Stock Interest Radar (available now)' };

export function CompounderRadarPage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchCompounderRadarSnapshot);
  if (!profile.capabilities.hasFundamentals) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Compounder Radar" subtitle="Which companies show durable long-term growth?" />
        <NotApplicableForAssetClass feature="Compounder radar" />
      </Box>
    );
  }
  return (
    <RadarPage
      title="Compounder Radar"
      subtitle="Which companies show durable long-term growth?"
      tabs={compounderTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Compounder Radar data not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <CompounderTable rows={rows as CompounderSnapshot[]} />}
    />
  );
}

export function TraderSetupRadarPage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchTraderSetupRadarSnapshot);
  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Trader Setup Radar" subtitle="Which setups are actionable for swing review?" />
        <NotApplicableForAssetClass
          feature="Trader Setup Radar"
          detail="Crypto coverage in this release is available on Market Scans and the Instrument workspace. This view will support crypto in a later update."
        />
      </Box>
    );
  }
  return (
    <RadarPage
      title="Trader Setup Radar"
      subtitle="Which setups are actionable for swing review? Timeframes are limited to 1D and above."
      tabs={traderSetupTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Trader Setup Radar data not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <TraderSetupTable rows={rows as TraderSetupSnapshot[]} />}
    />
  );
}

export function RiskRadarPage() {
  const { profile } = useMarketScope();
  const view = useReadModelSnapshot(fetchRiskRadarSnapshot);
  if (!profile.capabilities.hasFundamentals) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Risk Radar" subtitle="What should be avoided?" />
        <NotApplicableForAssetClass feature="Risk radar" />
      </Box>
    );
  }
  return (
    <RadarPage
      title="Risk Radar"
      subtitle="What should be avoided? Showing stored risk data."
      tabs={riskTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Risk Radar data not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <RiskTable rows={rows as RiskRadarSnapshot[]} />}
    />
  );
}

export function InstrumentWorkspaceLandingPage() {
  const navigate = useNavigate();
  const { scope, profile } = useMarketScope();

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title="Instrument Workspace"
        subtitle={instrumentWorkspaceSubtitle(scope)}
      />
      <Paper variant="outlined" sx={{ p: 2.5, maxWidth: 680 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Open a stock</Typography>
          <Typography variant="body2" color="text.secondary">
            Search the local catalog and pick a stock to open its workspace.
          </Typography>
          <InstrumentSearchSelect
            value={null}
            onChange={(instrument: V1Instrument | null) => {
              if (instrument?.id) navigate(`/stocks/${instrument.id}`);
            }}
          />
          <Typography variant="subtitle2" sx={{ pt: 1 }}>What the workspace shows once a stock is open</Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2" color="text.secondary">Market regime and breadth context for the current session.</Typography>
            <Typography component="li" variant="body2" color="text.secondary">The stock&apos;s sector strength and rotation standing.</Typography>
            <Typography component="li" variant="body2" color="text.secondary">Relative strength versus the benchmark.</Typography>
            {profile.capabilities.hasInstitutionalFlow && (
              <Typography component="li" variant="body2" color="text.secondary">Smart-money accumulation / distribution read and F&amp;O ban status.</Typography>
            )}
            <Typography component="li" variant="body2" color="text.secondary">The latest signal, shown as supporting evidence only — never an instruction.</Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

export function MarketIntelligenceCompatibilityPage({ title }: { title: string }) {
  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle="This page has moved. Use the main navigation to find the current view."
      />
      <DataUnavailableState
        title={`${title} is not available here.`}
        message="Use the main trader workflow pages to review stored data."
        warnings={['No placeholder rows are shown.']}
      />
    </Box>
  );
}

function SnapshotPageShell({
  title,
  subtitle,
  loading,
  error,
  envelope,
  missingTitle,
  suggestionLink,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  envelope: SnapshotEnvelope<unknown> | null;
  missingTitle: string;
  suggestionLink?: { to: string; label: string };
  children: ReactNode;
}) {
  const [dataStatusExpanded, setDataStatusExpanded] = useState(false);

  const showUnavailable = !loading
    && !error
    && envelope
    && ['EMPTY', 'BACKEND_UNAVAILABLE', 'ERROR'].includes(envelope.availability)
    && (Array.isArray(envelope.snapshot) ? envelope.snapshot.length === 0 : envelope.snapshot === null);

  const allWarnings = envelope?.warnings ?? [];
  // Genuinely stale: any warning present when data is available (not unavailable)
  const hasWarnings = !loading && !error && envelope && !showUnavailable && allWarnings.length > 0;
  // Auto-expand the disclosure only when data is significantly behind (>2 cal days)
  const dataThroughDate = envelope?.dataThroughDate;
  const isGenuinelyStale = dataThroughDate
    ? (() => {
        const asOf = dataThroughDate.slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        const diff = Math.round((Date.UTC(
          Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)),
        ) - Date.UTC(
          Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)) - 1, Number(asOf.slice(8, 10)),
        )) / 86_400_000);
        return diff > 2;
      })()
    : false;

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle={subtitle}
        badges={envelope ? (
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${envelope.scope.region} / ${envelope.scope.assetType}`} color="primary" variant="outlined" size="small" />
            {/* FreshnessChip replaces the duplicate Stale/Partial availability chip */}
            <FreshnessChip dataThrough={envelope.dataThroughDate} label={title} />
          </Stack>
        ) : undefined}
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {/* Data status disclosure — collapsed by default; auto-expands only when genuinely stale (>2 days) */}
      {hasWarnings && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setDataStatusExpanded((prev) => !prev)}
            startIcon={dataStatusExpanded || isGenuinelyStale ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ alignSelf: 'flex-start', mb: 0.5 }}
          >
            Data status
          </Button>
          <Collapse in={dataStatusExpanded || isGenuinelyStale} unmountOnExit>
            <Stack spacing={1}>
              {allWarnings.map((warning) => (
                <Alert key={warning} severity="warning">{humanizeCode(warning)}</Alert>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
      {showUnavailable && (
        <DataUnavailableState
          title={missingTitle}
          message={envelope?.message && envelope.message !== missingTitle ? envelope.message : 'Market data for this view is not available yet.'}
          warnings={envelope?.warnings ?? []}
          suggestionLink={suggestionLink}
        />
      )}
      {children}
    </Box>
  );
}

function RadarPage<T>({
  title,
  subtitle,
  tabs,
  envelope,
  loading,
  error,
  missingTitle,
  suggestionLink,
  getRowCategories,
  renderTable,
  tabEmptyMessages,
  orderRowsForTab,
}: {
  title: string;
  subtitle: string;
  tabs: RadarTab[];
  envelope: SnapshotEnvelope<T[]> | null;
  loading: boolean;
  error: string | null;
  missingTitle: string;
  suggestionLink?: { to: string; label: string };
  getRowCategories: (row: T) => string[];
  renderTable: (rows: T[]) => ReactNode;
  /** Optional per-tab empty-state messages keyed by tab value. */
  tabEmptyMessages?: Record<string, string>;
  /** Optional per-tab sort applied to the already-filtered rows so each tab
   *  leads with its own most-relevant rows instead of the shared flatten order. */
  orderRowsForTab?: (rows: T[], tabValue: string) => T[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? '');
  const activeLabel = tabs.find((tab) => tab.value === activeTab)?.label ?? activeTab;
  const rows = envelope?.snapshot ?? [];
  const matchedRows = rows.filter((row) => getRowCategories(row).includes(activeTab));
  const filteredRows = orderRowsForTab ? orderRowsForTab(matchedRows, activeTab) : matchedRows;
  const emptyMessage = tabEmptyMessages?.[activeTab]
    ?? `No ${activeLabel} rows in stored data.`;

  return (
    <SnapshotPageShell title={title} subtitle={subtitle} loading={loading} error={error} envelope={envelope} missingTitle={missingTitle} suggestionLink={suggestionLink}>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
        </Tabs>
      </Paper>
      {rows.length > 0 && (
        filteredRows.length > 0
          ? renderTable(filteredRows)
          : <EmptyState title={`No ${activeLabel} rows in stored data.`} message={emptyMessage} />
      )}
    </SnapshotPageShell>
  );
}

/**
 * Earnings-season heat badge: shows count of stocks with a result due in the
 * next 0–14 calendar days, derived from the persisted Earnings Intelligence
 * snapshot already fetched for this page (no extra API call).
 *
 * If the earnings backend is unavailable the component renders a neutral chip
 * so the layout stays consistent — no fabricated numbers.
 */
function EarningsSeasonBadge({ loading, upcomingCount }: { loading: boolean; upcomingCount: number | null }) {
  if (loading) return null;
  const label = upcomingCount === null
    ? 'Earnings season: —'
    : upcomingCount === 0
      ? 'No results due in next 2 weeks'
      : `Earnings season: ${upcomingCount} result${upcomingCount !== 1 ? 's' : ''} in next 2 weeks`;
  const color = upcomingCount !== null && upcomingCount > 0 ? 'warning' : 'default';
  const tooltipText = upcomingCount === null
    ? 'Earnings Intelligence data not available yet — result count cannot be shown.'
    : `${upcomingCount} stock${upcomingCount !== 1 ? 's' : ''} from saved Earnings Intelligence data have a result date within 0–14 calendar days.`;
  return (
    <Stack direction="row" sx={{ mb: 2 }}>
      <Tooltip title={tooltipText} arrow>
        <Chip label={label} color={color} variant={upcomingCount !== null && upcomingCount > 0 ? 'filled' : 'outlined'} />
      </Tooltip>
    </Stack>
  );
}

/**
 * Derive a human freshness label for a single index row.
 * Compares the snapshot's dataThroughDate against the expected latest trading date
 * (sourced from sourceSummary.latestCompletedTradingDate).  If the snapshot is
 * more than 1 calendar day behind the expected date it is considered Stale.
 */
function computeIndexFreshness(
  snapshotDataThroughDate: string,
  latestCompletedTradingDate: string | null | undefined,
): string {
  if (!latestCompletedTradingDate) return '—';
  const snapshotMs = new Date(snapshotDataThroughDate).getTime();
  const latestMs = new Date(latestCompletedTradingDate).getTime();
  if (!Number.isFinite(snapshotMs) || !Number.isFinite(latestMs)) return '—';
  const diffDays = Math.round((latestMs - snapshotMs) / 86_400_000);
  // When fresh, omit the cell content so the table stays quiet
  if (diffDays <= 1) return '';
  return `${diffDays}d behind`;
}

function SectorDrillChip({ rawSector, tone = 'default' }: { rawSector: string; tone?: 'default' | 'warning' }) {
  const navigate = useNavigate();
  const label = indexLabel(rawSector);
  return (
    <Chip
      key={rawSector}
      label={label}
      color={tone === 'warning' ? 'warning' : 'default'}
      variant="outlined"
      size="small"
      onClick={() => navigate(`/signals?sector=${encodeURIComponent(rawSector)}`)}
      sx={{ cursor: 'pointer' }}
      title={`View signals filtered by sector: ${label}`}
    />
  );
}

function MarketPulseSnapshotView({
  snapshot,
  shownWarnings,
}: {
  snapshot: MarketPulseSnapshot;
  /** Warnings already displayed at the envelope level — excluded here to avoid duplicates. */
  shownWarnings: string[];
}) {
  // Delivery participation is NSE/BSE-only — hide that panel for markets without it (US/EU/crypto).
  const { profile } = useMarketScope();
  // Fix 1: Curate indices — prefer headline rows (Nifty 50, Bank Nifty, Sensex …) over obscure
  // niche indices; fall back to whatever exists if fewer than 5 headline rows.
  const headlineIndices = snapshot.topIndices.filter((row) => isHeadlineIndex(row.symbol));
  const displayIndices = (headlineIndices.length > 0 ? headlineIndices : snapshot.topIndices).slice(0, 5);
  const latestCompletedTradingDate = snapshot.sourceSummary?.latestCompletedTradingDate;

  // Fix 4: De-duplicate snapshot.warnings against warnings already shown at the
  // envelope/shell level so the same message does not appear twice.
  const shownSet = new Set(shownWarnings);
  const uniqSnapshotWarnings = snapshot.warnings.filter((w) => !shownSet.has(w));

  // B3: detect if health was capped due to stale data (only if sourceSummary freshness is STALE)
  const healthCappedByStale =
    snapshot.sourceSummary?.status === 'STALE' || snapshot.sourceSummary?.status === 'FAILED';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" useFlexGap>
        {/* B3: label the section clearly + info tooltip distinguishing from top-bar Posture chip */}
        <Stack direction="row" spacing={0.75} alignItems="center">
          <SectionHeader title="Market health (data-quality weighted)" />
          <Tooltip
            title="Health blends index trend, sector strength, breadth, delivery and data freshness. The top-bar Posture chip is a broader risk stance (regime + breadth + health) — they can differ."
            arrow
          >
            <Chip label="?" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem', minWidth: 22, height: 22, cursor: 'help', borderRadius: '50%' }} />
          </Tooltip>
          {healthCappedByStale && (
            <Chip label="capped by stale data" size="small" variant="outlined" color="warning" sx={{ fontWeight: 600 }} />
          )}
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <ScoreCard label="Health Label" value={snapshot.marketHealthLabel} />
        <ScoreCard
          label="Health Score"
          value={
            <Stack spacing={0.5}>
              <Typography variant="h6" fontWeight={800}>{formatOptional(snapshot.marketHealthScore)}</Typography>
              {/* NR-21: health score trend + sparkline */}
              <HealthScoreTrend
                currentScore={snapshot.marketHealthScore ?? null}
                priorScore={snapshot.priorHealthScore ?? null}
                history={snapshot.healthScoreHistory}
              />
            </Stack>
          }
        />
        <ScoreCard label="Status" value={formatEnum(snapshot.status)} />
        <ScoreCard label="Data Through" value={formatDate(snapshot.dataThroughDate)} />
        <ScoreCard label="Generated At" value={formatDateTime(snapshot.generatedAt)} />
        <ScoreCard label="Candidate Count" value={formatOptional(snapshot.candidateCount)} />
      </Box>
      {/* NR-22 + NR-23: VIX and A/D headline row */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <VixWidget vix={snapshot.vixSummary} />
        <AdvanceDeclineWidget ad={snapshot.advanceDecline} />
      </Stack>
      {/* Heading reflects the actual count rather than promising 5 when data has fewer */}
      <SectionPanel title={displayIndices.length > 0 ? `Key Indices (${displayIndices.length})` : 'Key Indices'}>
        {displayIndices.length === 0 ? <EmptyState title="No index data available." /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Index</TableCell><TableCell align="right">Value</TableCell><TableCell align="right">Move</TableCell><TableCell>Age</TableCell></TableRow></TableHead>
              <TableBody>
                {displayIndices.map((row) => {
                  const freshnessText = computeIndexFreshness(snapshot.dataThroughDate, latestCompletedTradingDate);
                  return (
                    <TableRow key={row.symbol}>
                      <TableCell>{indexLabel(row.symbol)}</TableCell>
                      <TableCell align="right">{formatOptional(row.value)}</TableCell>
                      <TableCell align="right">{formatRatioPercent(row.changePercent)}</TableCell>
                      <TableCell>
                        {freshnessText
                          ? <Typography variant="caption" color="text.secondary">{freshnessText}</Typography>
                          : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionPanel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
        {/* Fix 2: render sector names via indexLabel (handles ^CNXMETAL etc.) — chips are drill-down links to the Signals screener */}
        <SectionPanel title="Strong Sectors">
          {snapshot.strongSectors.length === 0
            ? <Typography variant="body2" color="text.secondary">No strong sectors in stored data.</Typography>
            : <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>{snapshot.strongSectors.map((s) => <SectorDrillChip key={s} rawSector={s} />)}</Stack>}
        </SectionPanel>
        <SectionPanel title="Weak Sectors">
          {snapshot.weakSectors.length === 0
            ? <Typography variant="body2" color="text.secondary">No weak sectors in stored data.</Typography>
            : <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>{snapshot.weakSectors.map((s) => <SectorDrillChip key={s} rawSector={s} tone="warning" />)}</Stack>}
        </SectionPanel>
        <SectionPanel title="Breadth Summary"><Typography>{snapshot.breadthSummary || 'Unavailable'}</Typography></SectionPanel>
        {profile.capabilities.hasDelivery && <SectionPanel title="Delivery Participation Summary"><Typography>{snapshot.deliverySummary || 'Unavailable'}</Typography></SectionPanel>}
      </Box>
      {/* Fix 4: only show warnings not already displayed at the top (envelope) level */}
      {uniqSnapshotWarnings.length > 0 && (
        <SectionPanel title="Missing Data Warnings">
          <Stack spacing={1}>{uniqSnapshotWarnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}</Stack>
        </SectionPanel>
      )}
    </Stack>
  );
}

/**
 * NR-22: Volatility (VIX) widget.
 * Renders "VIX: 16.5 | 5D 14.9–16.7" with a color cue (label "India VIX" for IN).
 * If VIX data is absent, renders "<label>: —" honestly.
 */
function VixWidget({ vix }: { vix: MarketPulseVixSummary | null | undefined }) {
  const { scope, profile } = useMarketScope();
  // VIX surfaced where the region has a volatility index (IN: India VIX, US: ^VIX); hidden elsewhere (EU/crypto).
  if (!profile.capabilities.hasVix) return null;
  const vixLabel = scope.region === 'IN' ? 'India VIX' : 'VIX';
  const unavailable = !vix || vix.posture === 'UNAVAILABLE' || vix.latest === null;

  const postureColor = unavailable
    ? 'default'
    : vix!.posture === 'HIGH'
      ? 'error'
      : vix!.posture === 'ELEVATED'
        ? 'warning'
        : 'success';

  const postureLabel = unavailable
    ? ''
    : vix!.posture === 'HIGH'
      ? 'High fear — posture capped at Fragile'
      : vix!.posture === 'ELEVATED'
        ? 'Elevated volatility'
        : 'Calm';

  const vixText = unavailable
    ? `${vixLabel}: —`
    : `${vixLabel}: ${vix!.latest!.toFixed(1)}`;

  const rangeText = !unavailable && vix!.low5d !== null && vix!.high5d !== null
    ? ` | 5D ${vix!.low5d.toFixed(1)}–${vix!.high5d.toFixed(1)}`
    : '';

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      <Tooltip title={unavailable ? `${vixLabel} data is not available yet.` : `Posture: ${postureLabel}${vix?.asOf ? ` (as of ${vix.asOf})` : ''}`} arrow>
        <Chip
          label={`${vixText}${rangeText}`}
          color={postureColor as 'default' | 'error' | 'warning' | 'success'}
          variant="outlined"
          size="small"
        />
      </Tooltip>
    </Stack>
  );
}

/**
 * NR-23: Advance/Decline headline widget.
 * Renders "Advances: X / Declines: Y (A/D: Z.ZZ)".
 */
function AdvanceDeclineWidget({ ad }: { ad: MarketPulseAdvanceDeclineSummary | null | undefined }) {
  if (!ad || ad.asOf === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Advances/Declines: —
      </Typography>
    );
  }

  const ratioText = ad.ratio !== null ? ` (A/D: ${ad.ratio.toFixed(2)})` : '';
  const adColor = ad.ratio !== null ? (ad.ratio >= 1 ? 'success.main' : 'warning.main') : 'text.secondary';

  return (
    <Tooltip title={`Advance/Decline breadth from mainboard stock prices as of ${ad.asOf}`} arrow>
      <Typography variant="body2" color={adColor} fontWeight={600}>
        {`Advances: ${ad.advances.toLocaleString()} / Declines: ${ad.declines.toLocaleString()}${ratioText}`}
      </Typography>
    </Tooltip>
  );
}

/**
 * NR-21: Health score trend widget — shows delta from prior day and a 5-point sparkline.
 * Renders "43 ↓ from 51 yesterday" and a tiny inline SVG line.
 * Honest "no prior data" when <2 snapshots.
 */
function HealthScoreTrend({
  currentScore,
  priorScore,
  history,
}: {
  currentScore: number | null;
  priorScore: number | null;
  history: number[] | null | undefined;
}) {
  if (currentScore === null) return null;

  const hasPrior = priorScore !== null;
  const delta = hasPrior ? currentScore - priorScore! : null;
  const deltaLabel = delta === null
    ? 'No prior data available'
    : delta === 0
      ? 'unchanged from yesterday'
      : delta > 0
        ? `↑ ${delta > 0 ? '+' : ''}${delta} from ${priorScore} yesterday`
        : `↓ ${delta} from ${priorScore} yesterday`;
  const deltaColor = delta === null ? 'text.secondary' : delta > 0 ? 'success.main' : delta < 0 ? 'error.main' : 'text.secondary';

  const hasHistory = Array.isArray(history) && history.length >= 2;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Typography variant="body2" color={deltaColor} fontWeight={600}>
        {deltaLabel}
      </Typography>
      {hasHistory && <MiniSparkline values={history!} />}
    </Stack>
  );
}

/** Tiny inline SVG sparkline for health score history. */
function MiniSparkline({ values }: { values: number[] }) {
  const W = 72;
  const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <Tooltip title={`5-day health scores: ${values.join(', ')}`} arrow>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{ opacity: 0.7 }}
        />
        {pts.map((pt, i) => {
          const [x, y] = pt.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" style={{ opacity: 0.85 }} />;
        })}
      </svg>
    </Tooltip>
  );
}

/**
 * Hook: lazily load sector constituents the first time a sector row is expanded.
 * Fetches from the persisted-read endpoint; never generates on GET.
 */
function useSectorConstituents(sector: string | null, region: string, assetType: string) {
  const [data, setData] = useState<SectorConstituentsEnvelope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sector || data || loading) return;
    setLoading(true);
    setError(null);
    fetchSectorConstituents(sector, { region: region as any, assetType: assetType as any })
      .then((result) => { setData(result); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sector constituents.');
        setLoading(false);
      });
  }, [sector, data, loading, region, assetType]);

  useEffect(() => {
    if (sector) load();
  }, [sector, load]);

  return { data, loading, error };
}

/**
 * NR-64: Sector score chip with subtle color encoding.
 * Thresholds are tuned to the observed NSE sector score range (typically 0–100):
 *   >= 60 → green (strong / above neutral)
 *   40–59 → default / neutral
 *   < 40  → red (weak / below neutral)
 */
function SectorScoreCell({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <Typography variant="body2" color="text.secondary">Unavailable</Typography>;
  }
  const color: 'success' | 'default' | 'error' =
    score >= 60 ? 'success' : score < 40 ? 'error' : 'default';
  return (
    <Tooltip title="Sector strength score (0–100)" arrow>
      <Chip
        label={`${new Intl.NumberFormat().format(score)}/100`}
        color={color}
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600, minWidth: 52 }}
      />
    </Tooltip>
  );
}

/**
 * Expandable sector row — clicking expands a constituents sub-table below.
 */
function SectorRowWithDrillDown({
  row,
  region,
  assetType,
}: {
  row: SectorIntelligenceSnapshot;
  region: string;
  assetType: string;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useSectorConstituents(expanded ? row.sector : null, region, assetType);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const colSpan = 9; // matches number of header cells

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer' }}
        title={`Click expand to see constituent stocks, or use the signal link to filter signals`}
      >
        <TableCell padding="checkbox">
          <Tooltip title={expanded ? 'Hide constituents' : 'Show constituent stocks'} arrow>
            <IconButton size="small" onClick={handleExpandClick} aria-label={expanded ? 'collapse' : 'expand'}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </TableCell>
        {/* Sector name — click opens signal screener */}
        <TableCell
          onClick={() => navigate(`/signals?sector=${encodeURIComponent(row.sector)}`)}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          title={`View signals for ${indexLabel(row.sector)}`}
        >
          {indexLabel(row.sector)}
        </TableCell>
        <TableCell>{formatEnum(row.classification)}</TableCell>
        <TableCell align="right"><SectorScoreCell score={row.sectorScore} /></TableCell>
        <TableCell align="right">{formatPercentPoints(row.return1W)}</TableCell>
        <TableCell align="right">{formatPercentPoints(row.return1M)}</TableCell>
        <TableCell align="right">{formatPercentPoints(row.return3M)}</TableCell>
        <TableCell><ReasonTags tags={row.reasonTags.map(humanizeCode)} /></TableCell>
        <TableCell><RiskTags tags={row.warnings.map(humanizeCode)} /></TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={colSpan} sx={{ p: 0, borderBottom: 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <SectorConstituentsTable
                  sector={row.sector}
                  data={data}
                  loading={loading}
                  error={error}
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

type SectorConstituentSortKey = 'symbol' | 'company' | 'price' | 'return1W' | 'return1M' | 'signal' | 'score';

function sectorConstituentSortValue(row: SectorConstituentRow, key: SectorConstituentSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'price': return row.latestPrice;
    case 'return1W': return row.return1W;
    case 'return1M': return row.return1M;
    case 'signal': return row.signalDirection;
    case 'score': return row.signalScore;
  }
}

/** Constituents sub-table shown inside expanded sector row. */
function SectorConstituentsTable({
  sector,
  data,
  loading,
  error,
}: {
  sector: string;
  data: SectorConstituentsEnvelope | null;
  loading: boolean;
  error: string | null;
}) {
  const { profile } = useMarketScope();
  const { sortKey, sortDirection, handleSort } = useTableSort<SectorConstituentSortKey>(null, 'desc');
  if (loading) return <Stack spacing={1}><LinearProgress sx={{ mx: 1 }} /><Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Loading constituents for {indexLabel(sector)}…</Typography></Stack>;
  if (error) return <Alert severity="error" sx={{ mx: 0 }}>{error}</Alert>;
  if (!data) return null;
  if (data.availability !== 'READY' || data.constituents.length === 0) {
    return <Alert severity="info" sx={{ mx: 0 }}>{data.message || `No constituent stocks found for ${indexLabel(sector)}.`}</Alert>;
  }

  const sortedConstituents = sortRows(data.constituents, sortKey, sortDirection, sectorConstituentSortValue);
  const sortable = (label: ReactNode, columnKey: SectorConstituentSortKey, align?: 'left' | 'center' | 'right') => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} />
  );

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        {data.count} constituent stock{data.count !== 1 ? 's' : ''} — top by market cap, stored data
      </Typography>
      {data.warnings.map((w) => <Alert key={w} severity="warning" sx={{ py: 0 }}><Typography variant="caption">{w}</Typography></Alert>)}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              {sortable('Price', 'price', 'right')}
              {sortable('1W %', 'return1W', 'right')}
              {sortable('1M %', 'return1M', 'right')}
              {sortable('Signal', 'signal')}
              {sortable('Score', 'score', 'right')}
              <TableCell>Workspace</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedConstituents.map((row: SectorConstituentRow) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{row.symbol}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{row.companyName ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{row.latestPrice !== null ? money(row.latestPrice, profile.currency, { fractionDigits: 2 }) : '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={row.return1W !== null ? changeColor(row.return1W) : 'text.secondary'}>
                    {row.return1W !== null ? formatPercentPoints(row.return1W) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={row.return1M !== null ? changeColor(row.return1M) : 'text.secondary'}>
                    {row.return1M !== null ? formatPercentPoints(row.return1M) : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.signalDirection
                    ? <Chip label={humanizeCode(row.signalDirection)} size="small" color={row.signalDirection === 'BULLISH' ? 'success' : row.signalDirection === 'BEARISH' ? 'error' : 'default'} variant="outlined" />
                    : <Typography variant="body2" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{row.signalScore !== null ? row.signalScore.toFixed(1) : '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/instrument-workspace/${encodeURIComponent(row.symbol)}`}
                    variant="text"
                    sx={{ minWidth: 0, px: 0.75 }}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

type SectorSortKey = 'sector' | 'classification' | 'sectorScore' | 'return1W' | 'return1M' | 'return3M';

function sectorSortValue(row: SectorIntelligenceSnapshot, key: SectorSortKey): unknown {
  switch (key) {
    case 'sector': return row.sector;
    case 'classification': return row.classification;
    case 'sectorScore': return row.sectorScore;
    case 'return1W': return row.return1W;
    case 'return1M': return row.return1M;
    case 'return3M': return row.return3M;
  }
}

function SectorIntelligencePanel({
  envelope,
  loading,
  error,
}: {
  envelope: SnapshotEnvelope<SectorIntelligenceSnapshot[]> | null;
  loading: boolean;
  error: string | null;
}) {
  const { scope } = useMarketScope();
  const rows = envelope?.snapshot ?? [];

  const [sectorPage, setSectorPage] = useState(0);
  const [sectorRowsPerPage, setSectorRowsPerPage] = useState(5);
  const { sortKey, sortDirection, handleSort } = useTableSort<SectorSortKey>(null, 'desc', () => setSectorPage(0));

  // Default (no active sort) preserves the upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, sectorSortValue);
  const pagedRows = sortedRows.slice(sectorPage * sectorRowsPerPage, sectorPage * sectorRowsPerPage + sectorRowsPerPage);
  const sortable = (label: ReactNode, columnKey: SectorSortKey, align?: 'left' | 'center' | 'right') => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} />
  );

  return (
    <SectionPanel
      title="Sector Intelligence"
    >
      <Stack spacing={1.25}>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && envelope?.warnings.map((warning) => <Alert key={warning} severity="warning">{humanizeCode(warning)}</Alert>)}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title="No sector data saved for this scope/date." message={envelope?.message || 'No Sector Intelligence data is available for this scope yet.'} />
        )}
        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {/* expand toggle column */}
                  <TableCell padding="checkbox" />
                  {sortable('Sector', 'sector')}
                  {sortable('Classification', 'classification')}
                  {sortable('Sector Score', 'sectorScore', 'right')}
                  {sortable('1W', 'return1W', 'right')}
                  {sortable('1M', 'return1M', 'right')}
                  {sortable('3M', 'return3M', 'right')}
                  <TableCell>Reasons</TableCell>
                  <TableCell>Warnings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.map((row) => (
                  <SectorRowWithDrillDown
                    key={row.sector}
                    row={row}
                    region={scope.region}
                    assetType={scope.assetType}
                  />
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    count={rows.length}
                    rowsPerPage={sectorRowsPerPage}
                    page={sectorPage}
                    onPageChange={(_event, newPage) => setSectorPage(newPage)}
                    onRowsPerPageChange={(event) => {
                      setSectorRowsPerPage(parseInt(event.target.value, 10));
                      setSectorPage(0);
                    }}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </SectionPanel>
  );
}

type StockInterestSortKey = 'symbol' | 'company' | 'sector' | 'score' | 'direction' | 'freshness' | 'dataThrough';

function stockInterestSortValue(row: StockInterestSnapshot, key: StockInterestSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.company;
    case 'sector': return row.sector;
    case 'score': return row.score;
    case 'direction': return row.direction;
    case 'freshness': return row.freshness;
    case 'dataThrough': return row.dataThroughDate;
  }
}

function StockInterestTable({ rows }: { rows: StockInterestSnapshot[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { sortKey, sortDirection, handleSort } = useTableSort<StockInterestSortKey>(null, 'desc', () => setPage(0));

  // Reset to page 0 whenever the filtered row set changes (tab/scope change).
  useEffect(() => { setPage(0); }, [rows]);

  // Default (no active sort) preserves the per-tab upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, stockInterestSortValue);
  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columns: Array<{ label: string; align?: 'right' | 'left'; sortKey?: StockInterestSortKey }> = [
    { label: 'Symbol', sortKey: 'symbol' },
    { label: 'Company', sortKey: 'company' },
    { label: 'Sector', sortKey: 'sector' },
    { label: 'Interest Score', align: 'right', sortKey: 'score' },
    { label: 'Direction', sortKey: 'direction' },
    { label: 'Reasons' },
    { label: 'Risks' },
    { label: 'Freshness', sortKey: 'freshness' },
    { label: 'Data Through', sortKey: 'dataThrough' },
    { label: 'Workspace' },
  ];

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              col.sortKey
                ? (
                  <SortableTableCell
                    key={col.label}
                    label={col.label}
                    columnKey={col.sortKey}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                    align={col.align}
                  />
                )
                : <TableCell key={col.label} align={col.align}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.map((row, rowIndex) => {
            const sectorDisplay = (!row.sector || row.sector === 'Unavailable') ? '—' : row.sector;
            const sectorTitle = (!row.sector || row.sector === 'Unavailable') ? 'Sector metadata not available for this instrument' : undefined;
            return (
              <TableRow key={rowIndex}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.symbol}</TableCell>
                <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.company}>{row.company}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', color: sectorDisplay === '—' ? 'text.disabled' : undefined }} title={sectorTitle}>{sectorDisplay}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatOptional(row.score)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.direction}</TableCell>
                <TableCell><ReasonTags tags={row.reasonTags} /></TableCell>
                <TableCell><RiskTags tags={row.riskTags} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.freshness || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.dataThroughDate)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" component={RouterLink} to={`/instrument-workspace/${encodeURIComponent(row.symbol)}`}>Open</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

function ResultDateCell({ resultDate, resultDateLabel }: { resultDate: string | null; resultDateLabel?: 'Official' | 'TBA' | 'Estimated' | null }) {
  // Show a date only for an Official calendar date or a Phase 3 honest cadence
  // Estimate (clearly badged so it is never mistaken for an announced date).  TBA,
  // legacy estimates, or a missing basis show "Date TBA" — never a fabricated date.
  if (resultDate && (resultDateLabel === 'Official' || resultDateLabel === 'Estimated')) {
    const isEstimated = resultDateLabel === 'Estimated';
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <span>{formatDate(resultDate)}</span>
        <Chip
          label={isEstimated ? 'Estimated' : 'Official'}
          size="small"
          variant="outlined"
          color={isEstimated ? 'warning' : 'success'}
        />
      </Stack>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary" component="span">
      Date TBA
    </Typography>
  );
}

// Compact read-time signal posture for an earnings row.  Research-support framing:
// a candidate posture for review, never a buy/sell call.  null = no trusted signal
// for this instrument; undefined = the signal join was skipped for this snapshot.
function SignalCell({ signal }: { signal?: EarningsIntelligenceSnapshot['signal'] }) {
  if (signal === undefined) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  if (signal === null) return <Box component="span" sx={{ color: 'text.disabled' }}>No signal</Box>;
  const dir = (signal.direction || '').toUpperCase();
  const color: 'success' | 'error' | 'default' = dir === 'BULLISH' ? 'success' : dir === 'BEARISH' ? 'error' : 'default';
  const dirLabel = dir ? dir.charAt(0) + dir.slice(1).toLowerCase() : 'Neutral';
  const lifecycle = signal.lifecycleState ? humanizeCode(signal.lifecycleState) : null;
  const tooltip = [
    `Direction: ${dirLabel}`,
    `Signal quality: ${formatOptional(signal.score)}`,
    `Confidence: ${signal.confidence ? humanizeCode(signal.confidence) : '—'}`,
    lifecycle ? `Lifecycle: ${lifecycle}` : null,
    signal.triggerPrice != null ? `Trigger reference: ${money(signal.triggerPrice)}` : null,
  ].filter(Boolean).join('\n');
  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow>
      <Chip
        size="small"
        color={color}
        variant="outlined"
        label={`${dirLabel} · ${formatOptional(signal.score)}${lifecycle ? ` · ${lifecycle}` : ''}`}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
}

// Compact numeric-technicals posture for an earnings row (Phase 3).  Descriptive
// readings derived from persisted price/delivery history — research-support framing,
// never a buy/sell call.  All-null (warm-up not met / short history) renders a dash.
function TechnicalsCell({ row }: { row: EarningsIntelligenceSnapshot }) {
  const { rsi14, smaPosture, pricePosition52w, adx14, deliveryPercent } = row;
  const hasAny = [rsi14, smaPosture, pricePosition52w, adx14, deliveryPercent].some((value) => value !== null && value !== undefined);
  if (!hasAny) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  const postureColor: 'success' | 'error' | 'default' = smaPosture === 'ABOVE_50_200'
    ? 'success'
    : smaPosture === 'BELOW_50_200'
      ? 'error'
      : 'default';
  const tooltip = [
    rsi14 != null ? `RSI(14): ${formatOptional(rsi14)}` : null,
    smaPosture ? `SMA posture: ${humanizeCode(smaPosture)}` : null,
    pricePosition52w != null ? `52-week position: ${formatOptional(pricePosition52w)}%` : null,
    adx14 != null ? `ADX(14): ${formatOptional(adx14)}` : null,
    deliveryPercent != null ? `Delivery: ${formatOptional(deliveryPercent)}%` : null,
  ].filter(Boolean).join('\n');
  const label = `RSI ${rsi14 != null ? formatOptional(rsi14) : '—'}${pricePosition52w != null ? ` · ${formatOptional(pricePosition52w)}% 52w` : ''}`;
  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow>
      <Chip size="small" color={postureColor} variant="outlined" label={label} sx={{ fontWeight: 600 }} />
    </Tooltip>
  );
}

type EarningsSortKey =
  | 'symbol' | 'name' | 'resultDate' | 'daysToResult' | 'revQoQ' | 'profitQoQ' | 'epsQoQ' | 'consistency'
  | 'revYoY' | 'profitYoY' | 'epsYoY' | 'marginTrend' | 'acceleration'
  | 'periodEnd' | 'validatedAt';

function earningsSortValue(row: EarningsIntelligenceSnapshot, key: EarningsSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'name': return row.name ?? '';
    case 'resultDate': return row.resultDate;
    case 'daysToResult': return row.daysToResult;
    case 'revQoQ': return row.revenueGrowthQoQ ?? row.revenueGrowth;
    case 'profitQoQ': return row.profitGrowthQoQ ?? row.profitGrowth;
    case 'epsQoQ': return row.epsGrowthQoQ ?? row.epsGrowth;
    case 'consistency': return row.consistencyScore;
    case 'revYoY': return row.revenueGrowthYoY ?? null;
    case 'profitYoY': return row.profitGrowthYoY ?? null;
    case 'epsYoY': return row.epsGrowthYoY ?? null;
    case 'marginTrend': return row.marginTrend;
    case 'acceleration': return row.accelerationScore;
    case 'periodEnd': return row.periodEndDate;
    case 'validatedAt': return row.validatedAt;
  }
}

function EarningsTable({ rows }: { rows: EarningsIntelligenceSnapshot[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const { sortKey, sortDirection, handleSort } = useTableSort<EarningsSortKey>(null, 'desc', () => setPage(0));

  // Reset to page 0 whenever the filtered row set changes (tab/scope change).
  useEffect(() => { setPage(0); }, [rows]);

  // Default (no active sort) preserves the per-tab upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, earningsSortValue);
  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const numericCellSx = { whiteSpace: 'nowrap' as const };
  const sortable = (label: ReactNode, columnKey: EarningsSortKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell
      label={label}
      columnKey={columnKey}
      activeKey={sortKey}
      direction={sortDirection}
      onSort={handleSort}
      align={align}
      title={title}
    />
  );

  return (
    <TableContainer component={Paper} variant="outlined">
      <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>
        <Button size="small" onClick={() => setShowAllColumns((v) => !v)}>
          {showAllColumns ? 'Show fewer columns' : 'Show all columns'}
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            {sortable('Symbol', 'symbol')}
            {sortable('Full Name', 'name')}
            {sortable('Result Date', 'resultDate')}
            {sortable('Days To Result', 'daysToResult', 'right')}
            {sortable('Rev QoQ', 'revQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('Profit QoQ', 'profitQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('EPS QoQ', 'epsQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('Consistency', 'consistency', 'right')}
            <TableCell>Technicals</TableCell>
            <TableCell>Signal</TableCell>
            <TableCell>Reasons</TableCell>
            {showAllColumns && (
              <>
                <TableCell>Date Source</TableCell>
                {sortable('Period End', 'periodEnd')}
                {sortable('Validated At', 'validatedAt')}
                {sortable('Rev YoY', 'revYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('Profit YoY', 'profitYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('EPS YoY', 'epsYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('Margin Trend', 'marginTrend', 'right')}
                {sortable('Acceleration', 'acceleration', 'right')}
                <TableCell>Freshness</TableCell>
                <TableCell>Risks</TableCell>
                <TableCell>Warnings</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.map((row, rowIndex) => {
            const sourceFull = row.resultDateSource === 'DATE_TBA' || row.resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE'
              ? 'Awaiting official calendar'
              : formatEnum(row.resultDateSource);
            return (
              <TableRow key={rowIndex}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.symbol}</TableCell>
                <TableCell
                  sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={row.name ?? ''}
                >
                  {row.name ?? '—'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <ResultDateCell resultDate={row.resultDate} resultDateLabel={row.resultDateLabel} />
                </TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatOptional(row.daysToResult)}</TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.revenueGrowthQoQ ?? null)}</TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.profitGrowthQoQ ?? null)}</TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.epsGrowthQoQ ?? null)}</TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatOptional(row.consistencyScore)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><TechnicalsCell row={row} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><SignalCell signal={row.signal} /></TableCell>
                {(() => {
                  // Reasons collapsed to a single ellipsised line; full list on hover.
                  const reasons = row.reasonTags.map(humanizeCode);
                  const joined = reasons.join(', ');
                  return (
                    <TableCell
                      sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={joined}
                    >
                      {reasons.length > 0
                        ? joined
                        : <Typography variant="body2" color="text.secondary" component="span">No reasons.</Typography>}
                    </TableCell>
                  );
                })()}
                {showAllColumns && (
                  <>
                    <TableCell
                      sx={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={sourceFull}
                    >
                      {sourceFull}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.periodEndDate)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.validatedAt)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.revenueGrowthYoY ?? null)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.profitGrowthYoY ?? null)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.epsGrowthYoY ?? null)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.marginTrend)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatOptional(row.accelerationScore)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.freshness || '—'}</TableCell>
                    <TableCell><RiskTags tags={row.riskTags.map(humanizeCode)} /></TableCell>
                    <TableCell><RiskTags tags={(row.warnings || []).map(humanizeCode)} /></TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

function CompounderTable({ rows }: { rows: CompounderSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Compounder Score', 'Growth', 'Quality', 'Trend', 'Reasons', 'Risks', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        formatOptional(row.compounderScore),
        formatOptional(row.growthScore),
        formatOptional(row.qualityScore),
        formatOptional(row.trendScore),
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}

function TraderSetupTable({ rows }: { rows: TraderSetupSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Setup Type', 'Setup Score', 'Timeframe', 'Reasons', 'Risks', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        row.setupType,
        formatOptional(row.setupScore),
        row.timeframe,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}

function RiskTable({ rows }: { rows: RiskRadarSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Risk Score', 'Risk Category', 'Reasons', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        formatOptional(row.riskScore),
        row.riskCategory,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}

function RankingTable<T>({ rows, columns, renderRow }: { rows: T[]; columns: string[]; renderRow: (row: T) => ReactNode[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>{columns.map((column) => <TableCell key={column}>{column}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {renderRow(row).map((cell, cellIndex) => <TableCell key={`${rowIndex}:${cellIndex}`}>{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ScoreCard({ label, value }: { label: string; value: ReactNode }) {
  // If value is a Stack/Box already (NR-21 health trend), render it directly;
  // otherwise wrap in the standard h6 typography.
  const isComposite = value !== null && typeof value === 'object';
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {isComposite
        ? value
        : <Typography variant="h6" fontWeight={800}>{value}</Typography>}
    </Paper>
  );
}

function HealthBadge({ label }: { label: string }) {
  return <Chip label={label} color={label.toLowerCase().includes('risk') ? 'warning' : 'primary'} variant="outlined" />;
}

function ReasonTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No reasons." />;
}

function RiskTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No risks." tone="warning" />;
}

function TagList({ values, emptyLabel, tone = 'default' }: { values: string[]; emptyLabel: string; tone?: 'default' | 'warning' }) {
  if (values.length === 0) return <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>;
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
      {values.map((value) => (
        tone === 'warning'
          ? <Chip key={value} label={value} color="warning" variant="outlined" size="small" />
          : <HealthBadge key={value} label={value} />
      ))}
    </Stack>
  );
}

function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Alert severity="info">
      <Stack spacing={0.5}>
        <Typography fontWeight={800}>{title}</Typography>
        {message && <Typography variant="body2">{message}</Typography>}
      </Stack>
    </Alert>
  );
}

function DataUnavailableState({ title, message, warnings, suggestionLink }: { title: string; message: string; warnings: string[]; suggestionLink?: { to: string; label: string } }) {
  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Stack spacing={0.75}>
        <Typography fontWeight={800}>{title}</Typography>
        <Typography variant="body2">{message}</Typography>
        <Typography variant="body2">No placeholder rows are shown.</Typography>
        {suggestionLink && (
          <Button size="small" component={RouterLink} to={suggestionLink.to} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            {suggestionLink.label}
          </Button>
        )}
        {warnings.map((warning) => <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>)}
      </Stack>
    </Alert>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

function SectionPanel({ title, headerBadge, children }: { title: string; headerBadge?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        {headerBadge ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <SectionHeader title={title} />
            {headerBadge}
          </Stack>
        ) : (
          <SectionHeader title={title} />
        )}
        {children}
      </Stack>
    </Paper>
  );
}

function formatOptional(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (typeof value === 'number') return new Intl.NumberFormat().format(value);
  return value;
}

function formatRatioPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function formatPercentPoints(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatEnum(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleDateString() : value;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleString() : value;
}
