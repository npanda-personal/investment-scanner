import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FreshnessChip, InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import { humanizeCode } from '@/shared/format/enumLabels';
import {
  fetchCompounderRadarSnapshot,
  fetchEarningsIntelligenceSnapshot,
  fetchMarketPulseSnapshot,
  fetchRiskRadarSnapshot,
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
  RiskRadarSnapshot,
  SnapshotEnvelope,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';
import { DataUnavailableState, EmptyState } from './marketIntelligencePrimitives';
import {
  earningsTabMembership,
  orderEarningsRowsForTab,
  EARNINGS_EMPTY_MESSAGES,
  countUpcomingEarnings,
} from './earningsTabModel';
import { EarningsTable } from './EarningsTable';
import { SectorIntelligencePanel } from './SectorIntelligencePanel';
import { EarningsSeasonBadge, MarketPulseSnapshotView } from './MarketPulseSnapshotView';
import {
  StockInterestTable,
  CompounderTable,
  TraderSetupTable,
  RiskTable,
} from './marketIntelligenceRankingTables';

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

const deadEndSuggestionLink = { to: '/stock-interest-radar', label: 'Open Stock Interest Radar (available now)' };

// ---------------------------------------------------------------------------
// Page components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared shells
// ---------------------------------------------------------------------------

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
