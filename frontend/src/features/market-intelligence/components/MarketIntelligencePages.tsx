import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
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
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import { humanizeCode, indexLabel, isHeadlineIndex } from '@/shared/format/enumLabels';
import {
  fetchCompounderRadarSnapshot,
  fetchEarningsIntelligenceSnapshot,
  fetchInstrumentContextSnapshot,
  fetchMarketPulseSnapshot,
  fetchRiskRadarSnapshot,
  fetchSectorIntelligenceSnapshot,
  fetchStockInterestRadarSnapshot,
  fetchTraderSetupRadarSnapshot,
} from '../api/marketIntelligenceService';
import { useReadModelSnapshot } from '../hooks/useMarketIntelligenceSnapshot';
import type {
  CompounderSnapshot,
  EarningsIntelligenceSnapshot,
  InstrumentContextSnapshot,
  MarketPulseSnapshot,
  RiskRadarSnapshot,
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
  { label: 'Pre-Result Interest', value: 'PRE_RESULT_INTEREST' },
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

export function MarketPulsePage() {
  const view = useReadModelSnapshot(fetchMarketPulseSnapshot);
  const sectorView = useReadModelSnapshot(fetchSectorIntelligenceSnapshot);
  const snapshot = view.data?.snapshot ?? null;

  return (
    <SnapshotPageShell
      title="Market Pulse"
      subtitle="Is the market healthy enough to take risk? This page presents only persisted Market Pulse snapshot fields."
      loading={view.loading}
      error={view.error}
      envelope={view.data}
      missingTitle="Market Pulse backend not available yet."
    >
      {snapshot && <MarketPulseSnapshotView snapshot={snapshot} shownWarnings={view.data?.warnings ?? []} />}
      <SectorIntelligencePanel envelope={sectorView.data} loading={sectorView.loading} error={sectorView.error} />
    </SnapshotPageShell>
  );
}

export function StockInterestRadarPage() {
  const view = useReadModelSnapshot(fetchStockInterestRadarSnapshot);
  return (
    <RadarPage
      title="Stock Interest Radar"
      subtitle="Which stocks deserve attention now? Rows are displayed in backend snapshot order."
      tabs={stockInterestTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Stock Interest Radar backend not available yet."
      getRowCategories={(row) => [(row as StockInterestSnapshot).category]}
      renderTable={(rows) => <StockInterestTable rows={rows as StockInterestSnapshot[]} />}
    />
  );
}

export function EarningsIntelligencePage() {
  const view = useReadModelSnapshot(fetchEarningsIntelligenceSnapshot);
  return (
    <RadarPage
      title="Earnings Intelligence"
      subtitle="Which result-related stocks deserve attention?"
      tabs={earningsTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Earnings Intelligence backend not available yet."
      getRowCategories={(row) => (row as EarningsIntelligenceSnapshot).categories}
      renderTable={(rows) => <EarningsTable rows={rows as EarningsIntelligenceSnapshot[]} />}
    />
  );
}

const deadEndSuggestionLink = { to: '/stock-interest-radar', label: 'Open Stock Interest Radar (available now)' };

export function CompounderRadarPage() {
  const view = useReadModelSnapshot(fetchCompounderRadarSnapshot);
  return (
    <RadarPage
      title="Compounder Radar"
      subtitle="Which companies show durable long-term growth? The page uses compounder candidates, not multibagger language."
      tabs={compounderTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Compounder Radar backend not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <CompounderTable rows={rows as CompounderSnapshot[]} />}
    />
  );
}

export function TraderSetupRadarPage() {
  const view = useReadModelSnapshot(fetchTraderSetupRadarSnapshot);
  return (
    <RadarPage
      title="Trader Setup Radar"
      subtitle="Which setups are actionable for swing review? Timeframes are limited to 1D and above."
      tabs={traderSetupTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Trader Setup Radar backend not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <TraderSetupTable rows={rows as TraderSetupSnapshot[]} />}
    />
  );
}

export function RiskRadarPage() {
  const view = useReadModelSnapshot(fetchRiskRadarSnapshot);
  return (
    <RadarPage
      title="Risk Radar"
      subtitle="What should be avoided? Risk rows are displayed from persisted risk snapshots only."
      tabs={riskTabs}
      envelope={view.data}
      loading={view.loading}
      error={view.error}
      missingTitle="Risk Radar backend not available yet."
      suggestionLink={deadEndSuggestionLink}
      getRowCategories={() => []}
      renderTable={(rows) => <RiskTable rows={rows as RiskRadarSnapshot[]} />}
    />
  );
}

export function InstrumentWorkspaceLandingPage() {
  const navigate = useNavigate();
  const view = useReadModelSnapshot(fetchInstrumentContextSnapshot);

  return (
    <SnapshotPageShell
      title="Instrument Workspace"
      subtitle="Open a stock workspace and review backend-provided instrument context. Shared market-data production actions stay out of this trader workflow."
      loading={view.loading}
      error={view.error}
      envelope={view.data}
      missingTitle="Instrument Context backend not available yet."
    >
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Open Instrument</Typography>
          <InstrumentSearchSelect
            value={null}
            onChange={(instrument: V1Instrument | null) => {
              if (instrument?.id) navigate(`/stocks/${instrument.id}`);
            }}
          />
          <Typography variant="body2" color="text.secondary">
            Search only opens existing local catalog entries. Shared data jobs stay outside this trader workflow.
          </Typography>
        </Stack>
      </Paper>
      {view.data?.snapshot && <InstrumentContextRail snapshot={view.data.snapshot} />}
    </SnapshotPageShell>
  );
}

export function MarketIntelligenceCompatibilityPage({ title }: { title: string }) {
  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle="Compatibility route retained for localhost history. This page is not part of primary trader navigation."
      />
      <DataUnavailableState
        title={`${title} read model is not available in the trader revamp.`}
        message="Use the primary trader workflow pages for snapshot-based review. Backend dependencies are documented for future persisted read APIs."
        warnings={['No fake rows are shown.']}
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
  const showUnavailable = !loading
    && !error
    && envelope
    && ['EMPTY', 'BACKEND_UNAVAILABLE', 'ERROR'].includes(envelope.availability)
    && (Array.isArray(envelope.snapshot) ? envelope.snapshot.length === 0 : envelope.snapshot === null);
  const showWarnings = !loading && !error && envelope && !showUnavailable && envelope.warnings.length > 0;

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle={subtitle}
        badges={envelope ? (
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${envelope.scope.region} / ${envelope.scope.assetType}`} color="primary" variant="outlined" size="small" />
            <Chip label={formatEnum(envelope.availability)} color={envelope.availability === 'ERROR' ? 'error' : envelope.availability === 'STALE' || envelope.availability === 'PARTIAL' ? 'warning' : 'default'} variant="outlined" size="small" />
          </Stack>
        ) : undefined}
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && envelope && <SnapshotMetadata envelope={envelope} />}
      {showWarnings && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {envelope?.warnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}
        </Stack>
      )}
      {showUnavailable && (
        <DataUnavailableState
          title={missingTitle}
          message={envelope?.message && envelope.message !== missingTitle ? envelope.message : 'This radar requires a persisted read API that has not been produced yet.'}
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
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? '');
  const activeLabel = tabs.find((tab) => tab.value === activeTab)?.label ?? activeTab;
  const rows = envelope?.snapshot ?? [];
  const filteredRows = rows.filter((row) => getRowCategories(row).includes(activeTab));

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
          : <EmptyState title="No persisted rows for this tab." message={`No ${activeLabel} rows were present in the backend snapshot.`} />
      )}
    </SnapshotPageShell>
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
  if (!latestCompletedTradingDate) return 'Unavailable';
  const snapshotMs = new Date(snapshotDataThroughDate).getTime();
  const latestMs = new Date(latestCompletedTradingDate).getTime();
  if (!Number.isFinite(snapshotMs) || !Number.isFinite(latestMs)) return 'Unavailable';
  const diffDays = Math.round((latestMs - snapshotMs) / 86_400_000);
  if (diffDays > 1) return `Stale (${diffDays}d behind)`;
  return 'Fresh';
}

function MarketPulseSnapshotView({
  snapshot,
  shownWarnings,
}: {
  snapshot: MarketPulseSnapshot;
  /** Warnings already displayed at the envelope level — excluded here to avoid duplicates. */
  shownWarnings: string[];
}) {
  // Fix 1: Curate indices — prefer headline (Nifty 50, Bank Nifty, Sensex …) over
  // obscure inverse/midsmall niche indices.  Fall back to whatever exists if fewer
  // than 5 headline rows, but always prefer headline rows when available.
  const headlineIndices = snapshot.topIndices.filter((row) => isHeadlineIndex(row.symbol));
  const displayIndices = (headlineIndices.length > 0 ? headlineIndices : snapshot.topIndices).slice(0, 5);

  const latestCompletedTradingDate = snapshot.sourceSummary?.latestCompletedTradingDate;

  // Fix 4: De-duplicate snapshot.warnings against warnings already shown at the
  // envelope/shell level so the same message does not appear twice.
  const shownSet = new Set(shownWarnings);
  const uniqSnapshotWarnings = snapshot.warnings.filter((w) => !shownSet.has(w));

  return (
    <Stack spacing={2}>
      <SectionHeader title="Market Health" subtitle="Displayed exactly as provided by the Market Pulse read model." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <ScoreCard label="Health Label" value={snapshot.marketHealthLabel} />
        <ScoreCard label="Health Score" value={formatOptional(snapshot.marketHealthScore)} />
        <ScoreCard label="Snapshot Status" value={formatEnum(snapshot.status)} />
        <ScoreCard label="Data Through" value={formatDate(snapshot.dataThroughDate)} />
        <ScoreCard label="Generated At" value={formatDateTime(snapshot.generatedAt)} />
        <ScoreCard label="Candidate Count" value={formatOptional(snapshot.candidateCount)} />
      </Box>
      <SectionPanel title="Top 5 Indices">
        {displayIndices.length === 0 ? <EmptyState title="No index rows in snapshot." /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Index</TableCell><TableCell align="right">Value</TableCell><TableCell align="right">Move</TableCell><TableCell>Freshness</TableCell></TableRow></TableHead>
              <TableBody>
                {displayIndices.map((row) => (
                  <TableRow key={row.symbol}>
                    {/* Fix 1: display friendly name via indexLabel instead of raw code */}
                    <TableCell>{indexLabel(row.symbol)}</TableCell>
                    <TableCell align="right">{formatOptional(row.value)}</TableCell>
                    <TableCell align="right">{formatRatioPercent(row.changePercent)}</TableCell>
                    {/* Fix 3: derive freshness from dates, not from the backend's cached status string */}
                    <TableCell>{computeIndexFreshness(snapshot.dataThroughDate, latestCompletedTradingDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionPanel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
        {/* Fix 2: render sector names via indexLabel (handles ^CNXMETAL etc.) */}
        <SectionPanel title="Strong Sectors"><TagList values={snapshot.strongSectors.map(indexLabel)} emptyLabel="No strong sectors in snapshot." /></SectionPanel>
        <SectionPanel title="Weak Sectors"><TagList values={snapshot.weakSectors.map(indexLabel)} emptyLabel="No weak sectors in snapshot." tone="warning" /></SectionPanel>
        <SectionPanel title="Breadth Summary"><Typography>{snapshot.breadthSummary || 'Unavailable'}</Typography></SectionPanel>
        <SectionPanel title="Delivery Participation Summary"><Typography>{snapshot.deliverySummary || 'Unavailable'}</Typography></SectionPanel>
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

function SectorIntelligencePanel({
  envelope,
  loading,
  error,
}: {
  envelope: SnapshotEnvelope<SectorIntelligenceSnapshot[]> | null;
  loading: boolean;
  error: string | null;
}) {
  const rows = envelope?.snapshot ?? [];

  return (
    <SectionPanel title="Sector Intelligence">
      <Stack spacing={1.25}>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {envelope && <SnapshotMetadata envelope={envelope} compact />}
        {!loading && !error && envelope?.warnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title="No persisted sector rows for this scope/date." message={envelope?.message || 'No persisted Sector Intelligence rows are available for this scope.'} />
        )}
        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sector</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell align="right">Sector Score</TableCell>
                  <TableCell align="right">1W</TableCell>
                  <TableCell align="right">1M</TableCell>
                  <TableCell align="right">3M</TableCell>
                  <TableCell>Reasons</TableCell>
                  <TableCell>Warnings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.sector}>
                    {/* Fix 2: render sector code as friendly name */}
                    <TableCell>{indexLabel(row.sector)}</TableCell>
                    <TableCell>{formatEnum(row.classification)}</TableCell>
                    <TableCell align="right">{formatOptional(row.sectorScore)}</TableCell>
                    <TableCell align="right">{formatPercentPoints(row.return1W)}</TableCell>
                    <TableCell align="right">{formatPercentPoints(row.return1M)}</TableCell>
                    <TableCell align="right">{formatPercentPoints(row.return3M)}</TableCell>
                    {/* Fix 2: humanize reason / warning codes (STRONG, TOP_RELATIVE_RANK …) */}
                    <TableCell><ReasonTags tags={row.reasonTags.map(humanizeCode)} /></TableCell>
                    <TableCell><RiskTags tags={row.warnings.map(humanizeCode)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </SectionPanel>
  );
}

function StockInterestTable({ rows }: { rows: StockInterestSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Company', 'Sector', 'Interest Score', 'Direction', 'Reasons', 'Risks', 'Freshness', 'Data Through', 'Workspace']}
      renderRow={(row) => [
        row.symbol,
        row.company,
        row.sector || 'Unavailable',
        formatOptional(row.score),
        row.direction,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
        formatDate(row.dataThroughDate),
        <Button key="workspace" size="small" component={RouterLink} to={`/stocks/${encodeURIComponent(row.symbol)}`}>Open</Button>,
      ]}
    />
  );
}

function EarningsTable({ rows }: { rows: EarningsIntelligenceSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Result Date', 'Date Source', 'Period End', 'Validated At', 'Days To Result', 'Revenue Growth', 'Profit Growth', 'EPS Growth', 'Margin Trend', 'Consistency', 'Acceleration', 'Freshness', 'Reasons', 'Risks', 'Warnings']}
      renderRow={(row) => [
        row.symbol,
        formatDate(row.resultDate),
        formatEnum(row.resultDateSource),
        formatDate(row.periodEndDate),
        formatDate(row.validatedAt),
        formatOptional(row.daysToResult),
        formatPercentPoints(row.revenueGrowth),
        formatPercentPoints(row.profitGrowth),
        formatPercentPoints(row.epsGrowth),
        formatPercentPoints(row.marginTrend),
        formatOptional(row.consistencyScore),
        formatOptional(row.accelerationScore),
        row.freshness || 'Unavailable',
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        <RiskTags key="warnings" tags={row.warnings || []} />,
      ]}
    />
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

function InstrumentContextRail({ snapshot }: { snapshot: InstrumentContextSnapshot }) {
  return (
    <SectionPanel title="Instrument Context Snapshot">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <ScoreCard label="Market Pulse State" value={snapshot.marketState} />
        <ScoreCard label="Sector State" value={snapshot.sectorState} />
        <ScoreCard label="Relative Strength" value={snapshot.relativeStrength} />
        <ScoreCard label="Earnings Status" value={snapshot.earningsStatus} />
        <ScoreCard label="Compounder Status" value={snapshot.compounderStatus} />
        <ScoreCard label="Setup Status" value={snapshot.setupStatus} />
        <ScoreCard label="Risk Status" value={snapshot.riskStatus} />
        <ScoreCard label="Freshness" value={snapshot.freshness.label} />
      </Box>
    </SectionPanel>
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
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800}>{value}</Typography>
    </Paper>
  );
}

function SnapshotMetadata({ envelope, compact = false }: { envelope: SnapshotEnvelope<unknown>; compact?: boolean }) {
  const items = [
    ['Status', envelope.status || envelope.availability],
    ['Freshness', envelope.freshness],
    ['Snapshot Date', formatDate(envelope.snapshotDate)],
    ['Data Through', formatDate(envelope.dataThroughDate)],
    ['Generated At', formatDateTime(envelope.generatedAt)],
  ].filter(([, value]) => value && value !== 'Unavailable');

  if (items.length === 0) return null;

  return (
    <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap sx={{ mb: compact ? 0 : 2 }}>
      {items.map(([label, value]) => (
        // Fix 3: Freshness is already a derived human string ("Fresh" / "Stale (Nd behind)") —
        // do not pass it through formatEnum which would corrupt "Stale (2d behind)" etc.
        <Chip key={label} size="small" variant="outlined" label={`${label}: ${label === 'Status' ? formatEnum(String(value)) : value}`} />
      ))}
    </Stack>
  );
}

function HealthBadge({ label }: { label: string }) {
  return <Chip label={label} color={label.toLowerCase().includes('risk') ? 'warning' : 'primary'} variant="outlined" />;
}

function ReasonTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No reasons in snapshot." />;
}

function RiskTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No risks in snapshot." tone="warning" />;
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

function SectionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <SectionHeader title={title} />
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
