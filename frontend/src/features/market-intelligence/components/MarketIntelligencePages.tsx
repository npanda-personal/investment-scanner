import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader, StatusBadge } from '@/shared/components';
import type { MarketMoverRange, MarketMoverRow } from '@/features/daily-overview-dashboard/types';
import type { V1Instrument } from '@/features/market-data-foundation';
import { useMarketIntelligenceSnapshot } from '../hooks/useMarketIntelligenceSnapshot';
import type { MarketEnvironmentState, MarketIntelligenceSnapshot } from '../types';

const rangeOptions: MarketMoverRange[] = ['1D', '1W', '1M', '3M', '6M'];

export function MarketPulsePage() {
  const view = useMarketIntelligenceSnapshot();
  const snapshot = view.snapshot;
  const state = snapshot ? classifyEnvironment(snapshot) : 'UNAVAILABLE';
  const reviewGroups = snapshot?.todayReview.value?.groups;
  const candidateCount = (reviewGroups?.longReview.length ?? 0) + (reviewGroups?.shortReview.length ?? 0) + (reviewGroups?.exitRiskReview.length ?? 0);
  const moverRange = snapshot?.marketMovers.value?.ranges.find((item) => item.range === '1D') ?? snapshot?.marketMovers.value?.ranges[0] ?? null;
  const breadth = snapshot?.marketContext.value?.breadth ?? null;
  const sectors = snapshot?.marketContext.value?.topSectors ?? [];
  const weakSectors = snapshot?.marketContext.value?.weakSectors ?? [];

  return (
    <MarketPageShell
      title="Market Pulse"
      subtitle="Trader-facing market environment from persisted evidence only. This page never runs ingestion, generation, repair, calibration, or shared analysis pipelines."
      loading={view.loading}
      error={view.error}
      snapshot={snapshot}
    >
      {snapshot && (
        <Stack spacing={2}>
          <EnvironmentBanner state={state} snapshot={snapshot} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <MetricCard label="Review climate" value={labelize(state)} helper={environmentMessage(state)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard label="Review candidates" value={formatNumber(candidateCount)} helper="Bullish, bearish, and exit-risk candidates from the latest Today Review snapshot." />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard label="Trusted universe" value={formatNumber(snapshot.universeHealth.value?.counts.reviewReady ?? snapshot.todayReview.value?.run?.trustedUniverseCount ?? null)} helper="Data Quality gated stock count available to downstream review workflows." />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard label="Data trust" value={snapshot.universeHealth.value?.trustStatus ?? snapshot.todayReview.value?.run?.trustStatus ?? 'Unavailable'} helper={snapshot.universeHealth.value?.trustReasons?.[0] ?? 'Trust status is shown from persisted data readiness evidence.'} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={7}>
              <SectionCard title="Index Tape" subtitle="Persisted index snapshot status">
                <MissingEvidence
                  title="Index performance snapshot not wired yet"
                  message="Nifty 50, Bank Nifty, sector-index, and broad-market index read models are planned as IndexContextSnapshot. Until then, this user page does not call data-production endpoints."
                  source="NSE Indices"
                  sourceUrl="https://www.nseindia.com/nse-indices"
                />
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <SectionCard title="Breadth And Participation" subtitle="Market internal health">
                {breadth ? (
                  <Grid container spacing={1}>
                    <Grid item xs={6}><InlineMetric label="Above SMA50" value={formatPercent(breadth.percentAboveSma50)} /></Grid>
                    <Grid item xs={6}><InlineMetric label="Above SMA200" value={formatPercent(breadth.percentAboveSma200)} /></Grid>
                    <Grid item xs={6}><InlineMetric label="A/D ratio" value={formatRatio(breadth.advanceDeclineRatio)} /></Grid>
                    <Grid item xs={6}><InlineMetric label="Sample" value={formatNumber(breadth.instrumentCount)} /></Grid>
                  </Grid>
                ) : (
                  <MissingEvidence
                    title="Official breadth snapshot missing"
                    message="Advance, decline, unchanged, and denominator counts require a persisted BreadthSnapshot. Existing market-context reads are intentionally skipped until persisted-only reads are available."
                    source="NSE Advances/Declines"
                    sourceUrl="https://www.nseindia.com/market-data/advance"
                  />
                )}
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={4}>
              <SectionCard title="Sector Leadership" subtitle="Persisted sector context">
                {sectors.length || weakSectors.length ? (
                  <SectorList leading={sectors.map((item) => item.sector)} weak={weakSectors.map((item) => item.sector)} />
                ) : (
                  <MissingEvidence
                    title="Sector rotation snapshot unavailable"
                    message="Sector leadership will appear after a persisted-only market context read model is available."
                    source="Market Context Intelligence"
                  />
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <SectionCard title="Institutional Flow" subtitle="FII/FPI and DII context">
                <MissingEvidence
                  title="Institutional flow snapshot missing"
                  message="FII/FPI and DII buy, sell, net, and rolling-flow regime labels require InstitutionalFlowSnapshot. This page shows context only, not recommendations."
                  source="NSE FII/DII capital-market activity"
                  sourceUrl="https://www.nseindia.com/reports/fii-dii/"
                />
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <SectionCard title="Derivatives Sentiment" subtitle="Read-only derivatives context">
                <MissingEvidence
                  title="Product Owner approval required"
                  message="Option-chain, futures trend, PCR, OI change, strikes, and expiry context are marked as an expanded data domain and remain blocked until approval and a persisted read model exist."
                  source="NSE data sharing policy list"
                  sourceUrl="https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Data%20list%20under%20NSE%20Data%20Sharing%20Policy%20for%20Research%20and%20Analysis_20250728.pdf"
                />
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={7}>
              <SectionCard title="Price Movers" subtitle="Existing read-only mover evidence">
                <MoverTable rows={[...(moverRange?.gainers ?? []).slice(0, 5), ...(moverRange?.losers ?? []).slice(0, 5)]} />
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <SectionCard title="Candidate Review Queue" subtitle="Persisted Today Review only">
                <Stack spacing={1}>
                  <InlineMetric label="Bullish review" value={formatNumber(reviewGroups?.longReview.length ?? 0)} />
                  <InlineMetric label="Bearish / exit risk" value={formatNumber((reviewGroups?.shortReview.length ?? 0) + (reviewGroups?.exitRiskReview.length ?? 0))} />
                  <InlineMetric label="Blocked or insufficient" value={formatNumber((reviewGroups?.blocked.length ?? 0) + (reviewGroups?.insufficientData.length ?? 0))} />
                  <Button component={RouterLink} to="/today-review" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                    Open Daily Review
                  </Button>
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>
        </Stack>
      )}
    </MarketPageShell>
  );
}

export function IndicesWorkspacePage() {
  const view = useMarketIntelligenceSnapshot();
  const indices = view.snapshot?.indices.value?.instruments ?? [];

  return (
    <MarketPageShell
      title="Indices Workspace"
      subtitle="Index context for Nifty, sector, broad-market, and approved regional/global indices. Constituent and contribution analytics are read-model gaps until IndexContextSnapshot exists."
      loading={view.loading}
      error={view.error}
      snapshot={view.snapshot}
    >
      {view.snapshot && (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <SectionCard title="Index Catalog" subtitle="Available INDEX instruments from the local catalog">
              {indices.length ? (
                <InstrumentTable rows={indices} emptyMessage="No index catalog rows for this scope." />
              ) : (
                <MissingEvidence
                  title="No local index instruments found"
                  message="Index rows may not be imported yet. This page will not import, sync, or repair catalog data from a user workflow."
                  source="Local instrument catalog"
                />
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={4}>
            <SectionCard title="Index Context Gaps" subtitle="Required before implementation can be considered complete">
              <GapList items={[
                'constituents and weights',
                'top contributors and detractors',
                'index-level breadth',
                'sector weights',
                'watchlist and portfolio overlap',
                'stock-vs-index relative strength',
              ]} />
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </MarketPageShell>
  );
}

export function BreadthParticipationPage() {
  const view = useMarketIntelligenceSnapshot();
  const breadth = view.snapshot?.marketContext.value?.breadth ?? null;
  const health = view.snapshot?.universeHealth.value;

  return (
    <MarketPageShell
      title="Breadth And Participation"
      subtitle="Market internal health. Counts, denominator, freshness, and source limitations must be visible before a breadth signal is trusted."
      loading={view.loading}
      error={view.error}
      snapshot={view.snapshot}
    >
      {view.snapshot && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><MetricCard label="A/D ratio" value={formatRatio(breadth?.advanceDeclineRatio)} helper="Official advance, decline, unchanged counts are not yet persisted." /></Grid>
          <Grid item xs={12} md={3}><MetricCard label="Above SMA50" value={formatPercent(breadth?.percentAboveSma50)} helper={`Sample: ${formatNumber(breadth?.sma50SampleCount ?? breadth?.instrumentCount ?? null)}`} /></Grid>
          <Grid item xs={12} md={3}><MetricCard label="Above SMA200" value={formatPercent(breadth?.percentAboveSma200)} helper={`Sample: ${formatNumber(breadth?.sma200SampleCount ?? breadth?.instrumentCount ?? null)}`} /></Grid>
          <Grid item xs={12} md={3}><MetricCard label="Review-ready denominator" value={formatNumber(health?.counts.reviewReady ?? null)} helper={`Catalog: ${formatNumber(health?.counts.totalCatalogInstruments ?? null)}`} /></Grid>
          <Grid item xs={12} lg={7}>
            <SectionCard title="Official Advance/Decline" subtitle="Persisted BreadthSnapshot requirement">
              <MissingEvidence
                title="Advance, decline, and unchanged counts are not persisted yet"
                message="The user-facing page must show official counts, denominators, and freshness. Until those source rows are persisted, this page shows a gap instead of deriving confidence from incomplete data."
                source="NSE Advances/Declines"
                sourceUrl="https://www.nseindia.com/market-data/advance"
              />
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <SectionCard title="Data Denominators" subtitle="Current local readiness evidence">
              <Stack spacing={1}>
                <InlineMetric label="Active instruments" value={formatNumber(health?.counts.activeInstruments ?? null)} />
                <InlineMetric label="Price ready" value={formatNumber(health?.counts.priceReady ?? null)} />
                <InlineMetric label="Context ready" value={formatNumber(health?.counts.contextReady ?? null)} />
                <InlineMetric label="DQ trust" value={health?.trustStatus ?? 'Unavailable'} />
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </MarketPageShell>
  );
}

export function InstitutionalFlowPage() {
  const view = useMarketIntelligenceSnapshot();

  return (
    <MarketPageShell
      title="Institutional Flow"
      subtitle="Institutional flow context from FII/FPI and DII activity. This page must not imply a direct entry or exit recommendation."
      loading={view.loading}
      error={view.error}
      snapshot={view.snapshot}
    >
      {view.snapshot && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><MetricCard label="FII/FPI net flow" value="Missing" helper="Requires persisted daily capital-market activity rows." /></Grid>
          <Grid item xs={12} md={4}><MetricCard label="DII net flow" value="Missing" helper="Requires persisted daily capital-market activity rows." /></Grid>
          <Grid item xs={12} md={4}><MetricCard label="Flow regime" value="Unavailable" helper="Examples: FII_ACCUMULATION, DII_SUPPORT, INSTITUTIONAL_DISTRIBUTION." /></Grid>
          <Grid item xs={12}>
            <SectionCard title="Required Flow Evidence" subtitle="InstitutionalFlowSnapshot">
              <MissingEvidence
                title="FII/FPI and DII flow read model not implemented"
                message="Future implementation should show buy, sell, net values, 5/20-day rolling net flow, divergence versus index movement, and flow regime labels. Copy must stay institutional flow context, not a recommendation."
                source="NSE FII/DII capital-market activity"
                sourceUrl="https://www.nseindia.com/reports/fii-dii/"
              />
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </MarketPageShell>
  );
}

export function DerivativesContextPage() {
  const view = useMarketIntelligenceSnapshot();
  const rows = view.snapshot?.fnoUnderlyings.value?.instruments ?? [];

  return (
    <MarketPageShell
      title="Derivatives Context"
      subtitle="Read-only derivatives market context. Options strategy recommendations and trading instructions are out of scope."
      loading={view.loading}
      error={view.error}
      snapshot={view.snapshot}
    >
      {view.snapshot && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="warning">
              Product Owner approval is required before derivatives data implementation. This page currently displays only existing F&O eligibility flags when available.
            </Alert>
          </Grid>
          <Grid item xs={12} lg={7}>
            <SectionCard title="F&O Eligible Underlyings" subtitle="Catalog flag only, not option-chain evidence">
              {rows.length ? <InstrumentTable rows={rows} emptyMessage="No F&O eligible rows found." /> : (
                <MissingEvidence
                  title="No F&O eligibility rows found"
                  message="F&O eligibility may not be imported for this scope, or the catalog has no eligible underlyings."
                  source="Local instrument catalog"
                />
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <SectionCard title="Blocked Until Approved" subtitle="DerivativesContextSnapshot needs">
              <GapList items={[
                'index futures trend',
                'option-chain summary',
                'put-call ratio',
                'open-interest change',
                'top strikes by OI and OI change',
                'expiry proximity',
              ]} />
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </MarketPageShell>
  );
}

export function MarketMapPage() {
  const view = useMarketIntelligenceSnapshot();
  const snapshot = view.snapshot;
  const [range, setRange] = useState<MarketMoverRange>('1D');
  const moverRange = snapshot?.marketMovers.value?.ranges.find((item) => item.range === range) ?? null;
  const movers = [...(moverRange?.gainers ?? []), ...(moverRange?.losers ?? [])];
  const instruments = snapshot?.mapInstruments.value?.instruments ?? [];
  const rows = mergeMapRows(instruments, movers).slice(0, 60);

  return (
    <MarketPageShell
      title="Market Map"
      subtitle="Big-picture stock map by sector, industry, market cap, price performance, trigger density, data readiness, smart-money status, and F&O eligibility where evidence exists."
      loading={view.loading}
      error={view.error}
      snapshot={snapshot}
    >
      {snapshot && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1}>
            <ToggleButtonGroup
              value={range}
              exclusive
              size="small"
              onChange={(_event, value: MarketMoverRange | null) => value && setRange(value)}
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              {rangeOptions.map((item) => (
                <ToggleButton key={item} value={item}>{item}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Button component={RouterLink} to="/watchlists" variant="outlined">Track in Watchlists</Button>
              <Button component={RouterLink} to="/alerts" variant="outlined">Create Alert</Button>
            </Stack>
          </Stack>
          <Grid container spacing={1.25}>
            {rows.map((row) => (
              <Grid key={row.id} item xs={12} sm={6} md={4} lg={3}>
                <Paper
                  variant="outlined"
                  component={RouterLink}
                  to={`/stocks/${row.id}`}
                  sx={{
                    display: 'block',
                    height: '100%',
                    p: 1.5,
                    color: 'inherit',
                    textDecoration: 'none',
                    borderLeft: '4px solid',
                    borderLeftColor: toneForReturn(row.returnPercent),
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>{row.symbol}</Typography>
                      <Typography variant="body2" fontWeight={800} color={returnColor(row.returnPercent)}>{formatPercent(row.returnPercent)}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap>{row.companyName}</Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={row.sector || 'Sector missing'} variant="outlined" />
                      <Chip size="small" label={row.derivativesEligible ? 'F&O' : 'Cash'} variant="outlined" />
                      <StatusBadge label={row.dataStatus || 'DQ unknown'} />
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {rows.length === 0 && (
            <MissingEvidence
              title="No map rows available"
              message="Market map needs instrument catalog rows and persisted price evidence for the selected scope."
              source="Instrument catalog and market movers"
            />
          )}
        </Stack>
      )}
    </MarketPageShell>
  );
}

function MarketPageShell({
  title,
  subtitle,
  loading,
  error,
  snapshot,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  snapshot: MarketIntelligenceSnapshot | null;
  children: ReactNode;
}) {
  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title={title}
        subtitle={subtitle}
        badges={snapshot ? (
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${snapshot.scope.region} / ${snapshot.scope.assetType}`} color="primary" variant="outlined" size="small" />
            <Chip label={`View loaded ${formatDateTime(snapshot.fetchedAt)}`} variant="outlined" size="small" />
          </Stack>
        ) : undefined}
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && !snapshot && (
        <Alert severity="warning">Market intelligence snapshot is unavailable for this scope.</Alert>
      )}
      {snapshot && <FreshnessStrip snapshot={snapshot} />}
      {children}
    </Box>
  );
}

function FreshnessStrip({ snapshot }: { snapshot: MarketIntelligenceSnapshot }) {
  const resources = [
    snapshot.todayReview,
    snapshot.marketMovers,
    snapshot.universeHealth,
    snapshot.marketContext,
  ];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        {resources.map((resource) => (
          <Chip
            key={resource.source}
            size="small"
            color={resource.status === 'ready' ? 'success' : 'warning'}
            variant="outlined"
            label={`${resource.source}: ${resource.asOf ? formatDateTime(resource.asOf) : resource.status}`}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function EnvironmentBanner({ state, snapshot }: { state: MarketEnvironmentState; snapshot: MarketIntelligenceSnapshot }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: '6px solid', borderLeftColor: stateColor(state) }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Market is {labelize(state)}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>{environmentMessage(state)}</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap alignItems="center">
          <StatusBadge label={snapshot.universeHealth.value?.trustStatus ?? 'DQ unavailable'} />
          <StatusBadge label={snapshot.todayReview.value?.run?.reviewUniverseMode ?? 'Review mode unavailable'} />
          <StatusBadge label={snapshot.marketContext.status === 'ready' ? 'Market context ready' : 'Market context gap'} />
        </Stack>
      </Stack>
    </Paper>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" fontWeight={800}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{value}</Typography>
      {helper && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{helper}</Typography>}
    </Paper>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={800}>{value}</Typography>
    </Stack>
  );
}

function MissingEvidence({ title, message, source, sourceUrl }: { title: string; message: string; source: string; sourceUrl?: string }) {
  return (
    <Alert severity="info">
      <Stack spacing={0.75}>
        <Typography variant="body2" fontWeight={800}>{title}</Typography>
        <Typography variant="body2">{message}</Typography>
        <Typography variant="caption" color="text.secondary">
          Source basis: {sourceUrl ? <MuiLink href={sourceUrl} target="_blank" rel="noreferrer">{source}</MuiLink> : source}
        </Typography>
      </Stack>
    </Alert>
  );
}

function GapList({ items }: { items: string[] }) {
  return (
    <Stack divider={<Divider flexItem />} spacing={0.75}>
      {items.map((item) => (
        <Typography key={item} variant="body2">{item}</Typography>
      ))}
    </Stack>
  );
}

function SectorList({ leading, weak }: { leading: string[]; weak: string[] }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Leading</Typography>
      <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
        {leading.slice(0, 6).map((sector) => <Chip key={sector} size="small" label={sector} color="success" variant="outlined" />)}
      </Stack>
      <Typography variant="subtitle2">Weak</Typography>
      <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
        {weak.slice(0, 6).map((sector) => <Chip key={sector} size="small" label={sector} color="warning" variant="outlined" />)}
      </Stack>
    </Stack>
  );
}

function MoverTable({ rows }: { rows: MarketMoverRow[] }) {
  if (rows.length === 0) {
    return (
      <MissingEvidence
        title="Mover snapshot unavailable"
        message="No market mover rows were returned for this scope."
        source="Market Data Foundation movers"
      />
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Sector</TableCell>
            <TableCell align="right">Return</TableCell>
            <TableCell>Latest</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.instrumentId}-${row.returnPercent}`} hover>
              <TableCell>
                <Button component={RouterLink} to={`/stocks/${row.instrumentId}`} size="small">{row.symbol}</Button>
              </TableCell>
              <TableCell>{row.sector || 'N/A'}</TableCell>
              <TableCell align="right">
                <Typography color={returnColor(row.returnPercent)} fontWeight={800}>{formatPercent(row.returnPercent)}</Typography>
              </TableCell>
              <TableCell>{formatDate(row.latestDate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function InstrumentTable({ rows, emptyMessage }: { rows: V1Instrument[]; emptyMessage: string }) {
  if (rows.length === 0) return <Alert severity="info">{emptyMessage}</Alert>;

  return (
    <TableContainer sx={{ maxHeight: 460 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Segment</TableCell>
            <TableCell>Sector</TableCell>
            <TableCell>DQ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>
                <Button component={RouterLink} to={`/stocks/${row.id}`} size="small">{row.display_symbol || row.symbol}</Button>
              </TableCell>
              <TableCell>{row.company_name}</TableCell>
              <TableCell>{row.instrument_segment}</TableCell>
              <TableCell>{row.sector || 'N/A'}</TableCell>
              <TableCell><StatusBadge label={row.data_status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function classifyEnvironment(snapshot: MarketIntelligenceSnapshot): MarketEnvironmentState {
  const health = snapshot.universeHealth.value;
  const breadth = snapshot.marketContext.value?.breadth;
  const reviewMode = snapshot.todayReview.value?.run?.reviewUniverseMode;
  if (!snapshot.todayReview.value?.run && !health) return 'UNAVAILABLE';
  if (health?.trustStatus === 'NOT_TRUSTWORTHY' || reviewMode === 'NO_REVIEW') return 'BLOCKED';
  if (breadth?.percentAboveSma50 !== null && breadth?.percentAboveSma50 !== undefined && breadth.percentAboveSma50 < 0.35) return 'RISKY';
  if (breadth?.advanceDeclineRatio !== null && breadth?.advanceDeclineRatio !== undefined && breadth.advanceDeclineRatio < 0.9) return 'NARROW';
  if (health?.trustStatus === 'OK' || snapshot.todayReview.value?.run?.trustStatus === 'OK') return 'SUPPORTIVE';
  return 'NARROW';
}

function environmentMessage(state: MarketEnvironmentState) {
  if (state === 'SUPPORTIVE') return 'Persisted evidence is sufficient for candidate review. This is research context only.';
  if (state === 'NARROW') return 'Candidate review may be selective because participation evidence is limited or incomplete.';
  if (state === 'RISKY') return 'Market internals or data evidence indicate elevated review risk.';
  if (state === 'BLOCKED') return 'Trusted data or review-universe evidence blocks reliable candidate review.';
  return 'Persisted market evidence is unavailable for this scope.';
}

function mergeMapRows(instruments: V1Instrument[], movers: MarketMoverRow[]) {
  const moverByInstrumentId = new Map(movers.map((item) => [item.instrumentId, item]));
  return instruments.map((instrument) => {
    const mover = moverByInstrumentId.get(instrument.id);
    return {
      id: instrument.id,
      symbol: instrument.display_symbol || instrument.symbol,
      companyName: instrument.company_name,
      sector: instrument.sector,
      derivativesEligible: Boolean(instrument.derivatives_eligible),
      dataStatus: instrument.data_status,
      returnPercent: mover?.returnPercent ?? null,
    };
  });
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return value.toFixed(2);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleDateString();
}

function labelize(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function stateColor(state: MarketEnvironmentState) {
  if (state === 'SUPPORTIVE') return 'success.main';
  if (state === 'NARROW') return 'warning.main';
  if (state === 'RISKY' || state === 'BLOCKED') return 'error.main';
  return 'divider';
}

function returnColor(value: number | null) {
  if (typeof value !== 'number') return 'text.secondary';
  if (value > 0) return 'success.main';
  if (value < 0) return 'error.main';
  return 'text.secondary';
}

function toneForReturn(value: number | null) {
  if (typeof value !== 'number') return 'divider';
  if (value > 0) return 'success.main';
  if (value < 0) return 'error.main';
  return 'divider';
}
