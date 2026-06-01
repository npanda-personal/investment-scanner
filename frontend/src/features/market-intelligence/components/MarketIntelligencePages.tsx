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
import {
  fetchCompounderRadarSnapshot,
  fetchEarningsIntelligenceSnapshot,
  fetchInstrumentContextSnapshot,
  fetchMarketPulseSnapshot,
  fetchRiskRadarSnapshot,
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
  SnapshotEnvelope,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';

const stockInterestTabs = [
  "Today's Top Interest",
  'Upcoming Results',
  'Result Winners',
  'Growth Consistency',
  'Growth Acceleration',
  'Sector Leaders',
  'Accumulation',
  'Breakouts / Bases',
  'Risk / Avoid',
];

const earningsTabs = ['Upcoming Results', 'Pre-Result Interest', 'Result Winners', 'Result Disappointments', 'Result Reaction History', 'Earnings Watchlist'];
const compounderTabs = ['Consistent Growth', 'Quality + Growth', 'Growth + Momentum', 'Margin Expansion', 'Ownership Support'];
const traderSetupTabs = ['Breakouts', 'Base Breakouts', 'Pullbacks', '52W Highs', 'Relative Strength Leaders', 'Low Volatility Squeeze', 'Delivery Expansion'];
const riskTabs = ['Weak Sector Stocks', 'Breakdown Candidates', 'Poor Result Reaction', 'Low Liquidity', 'Stale Data', 'Portfolio Risk'];

export function MarketPulsePage() {
  const view = useReadModelSnapshot(fetchMarketPulseSnapshot);
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
      {snapshot && <MarketPulseSnapshotView snapshot={snapshot} />}
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
      renderTable={(rows) => <EarningsTable rows={rows as EarningsIntelligenceSnapshot[]} />}
    />
  );
}

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
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  envelope: SnapshotEnvelope<unknown> | null;
  missingTitle: string;
  children: ReactNode;
}) {
  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle={subtitle}
        badges={envelope ? <Chip label={`${envelope.scope.region} / ${envelope.scope.assetType}`} color="primary" variant="outlined" size="small" /> : undefined}
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && envelope?.availability !== 'READY' && (
        <DataUnavailableState
          title={missingTitle}
          message={envelope?.message && envelope.message !== missingTitle ? envelope.message : 'Future persisted read API capability is required before this page can show snapshot rows.'}
          warnings={envelope?.warnings ?? []}
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
  renderTable,
}: {
  title: string;
  subtitle: string;
  tabs: string[];
  envelope: SnapshotEnvelope<T[]> | null;
  loading: boolean;
  error: string | null;
  missingTitle: string;
  renderTable: (rows: T[]) => ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const rows = envelope?.snapshot ?? [];
  const filteredRows = rows.filter((row) => {
    const category = typeof row === 'object' && row !== null && 'category' in row ? String((row as { category?: string }).category) : activeTab;
    return category === activeTab;
  });

  return (
    <SnapshotPageShell title={title} subtitle={subtitle} loading={loading} error={error} envelope={envelope} missingTitle={missingTitle}>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab} value={tab} label={tab} />)}
        </Tabs>
      </Paper>
      {envelope?.availability === 'READY' && (
        filteredRows.length > 0
          ? renderTable(filteredRows)
          : <EmptyState title="No persisted rows for this scope/date." message={`No ${activeTab} rows were present in the backend snapshot.`} />
      )}
    </SnapshotPageShell>
  );
}

function MarketPulseSnapshotView({ snapshot }: { snapshot: MarketPulseSnapshot }) {
  return (
    <Stack spacing={2}>
      <SectionHeader title="Market Health" subtitle="Displayed exactly as provided by the Market Pulse read model." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <ScoreCard label="Health Label" value={snapshot.marketHealthLabel} />
        <ScoreCard label="Health Score" value={formatOptional(snapshot.marketHealthScore)} />
        <ScoreCard label="Data Through" value={formatDate(snapshot.dataThroughDate)} />
        <ScoreCard label="Candidate Count" value={formatOptional(snapshot.candidateCount)} />
      </Box>
      <SectionPanel title="Top 5 Indices">
        {snapshot.topIndices.length === 0 ? <EmptyState title="No index rows in snapshot." /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Index</TableCell><TableCell align="right">Value</TableCell><TableCell align="right">Move</TableCell><TableCell>Freshness</TableCell></TableRow></TableHead>
              <TableBody>
                {snapshot.topIndices.slice(0, 5).map((row) => (
                  <TableRow key={row.symbol}>
                    <TableCell>{row.label || row.symbol}</TableCell>
                    <TableCell align="right">{formatOptional(row.value)}</TableCell>
                    <TableCell align="right">{formatPercent(row.changePercent)}</TableCell>
                    <TableCell>{row.freshness || 'Unavailable'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionPanel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
        <SectionPanel title="Strong Sectors"><TagList values={snapshot.strongSectors} emptyLabel="No strong sectors in snapshot." /></SectionPanel>
        <SectionPanel title="Weak Sectors"><TagList values={snapshot.weakSectors} emptyLabel="No weak sectors in snapshot." tone="warning" /></SectionPanel>
        <SectionPanel title="Breadth Summary"><Typography>{snapshot.breadthSummary || 'Unavailable'}</Typography></SectionPanel>
        <SectionPanel title="Delivery Participation Summary"><Typography>{snapshot.deliverySummary || 'Unavailable'}</Typography></SectionPanel>
      </Box>
      {snapshot.warnings.length > 0 && (
        <SectionPanel title="Missing Data Warnings">
          <Stack spacing={1}>{snapshot.warnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}</Stack>
        </SectionPanel>
      )}
    </Stack>
  );
}

function StockInterestTable({ rows }: { rows: StockInterestSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Company', 'Sector', 'Interest Score', 'Direction', 'Reasons', 'Risks', 'Freshness', 'Returns', 'Workspace']}
      renderRow={(row) => [
        row.symbol,
        row.company,
        row.sector || 'Unavailable',
        formatOptional(row.score),
        row.direction,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
        row.returns || 'Unavailable',
        <Button key="workspace" size="small" component={RouterLink} to={`/stocks/${encodeURIComponent(row.symbol)}`}>Open</Button>,
      ]}
    />
  );
}

function EarningsTable({ rows }: { rows: EarningsIntelligenceSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Result Date', 'Revenue Growth', 'Profit Growth', 'EPS Growth', 'Margin Trend', 'Consistency', 'Acceleration', 'Reasons', 'Risks']}
      renderRow={(row) => [
        row.symbol,
        row.resultDate || 'Unavailable',
        formatPercent(row.revenueGrowth),
        formatPercent(row.profitGrowth),
        formatPercent(row.epsGrowth),
        row.marginTrend || 'Unavailable',
        formatOptional(row.consistencyScore),
        formatOptional(row.accelerationScore),
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
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
      {values.map((value) => <HealthBadge key={value} label={value} />)}
      {tone === 'warning' && null}
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

function DataUnavailableState({ title, message, warnings }: { title: string; message: string; warnings: string[] }) {
  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Stack spacing={0.75}>
        <Typography fontWeight={800}>{title}</Typography>
        <Typography variant="body2">{message}</Typography>
        <Typography variant="body2">No fake rows are shown.</Typography>
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

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleDateString() : value;
}
