/**
 * Market Pulse snapshot view: index table, VIX/AD widgets, health score trend, sparkline,
 * sector drill chips, and the earnings-season badge.
 */
import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { indexLabel, isHeadlineIndex } from '@/shared/format/enumLabels';
import type { MarketPulseAdvanceDeclineSummary, MarketPulseVixSummary, MarketPulseSnapshot } from '../types';
import {
  ScoreCard,
  SectionHeader,
  SectionPanel,
  EmptyState,
  formatDate,
  formatDateTime,
  formatEnum,
  formatOptional,
  formatRatioPercent,
} from './marketIntelligencePrimitives';

// ---------------------------------------------------------------------------
// EarningsSeasonBadge
// ---------------------------------------------------------------------------

/**
 * Earnings-season heat badge: shows count of stocks with a result due in the
 * next 0–14 calendar days, derived from the persisted Earnings Intelligence
 * snapshot already fetched for this page (no extra API call).
 *
 * If the earnings backend is unavailable the component renders a neutral chip
 * so the layout stays consistent — no fabricated numbers.
 */
export function EarningsSeasonBadge({ loading, upcomingCount }: { loading: boolean; upcomingCount: number | null }) {
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

// ---------------------------------------------------------------------------
// computeIndexFreshness
// ---------------------------------------------------------------------------

/**
 * Derive a human freshness label for a single index row.
 * Compares the snapshot's dataThroughDate against the expected latest trading date
 * (sourced from sourceSummary.latestCompletedTradingDate).  If the snapshot is
 * more than 1 calendar day behind the expected date it is considered Stale.
 */
export function computeIndexFreshness(
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

// ---------------------------------------------------------------------------
// SectorDrillChip
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// VixWidget
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AdvanceDeclineWidget
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HealthScoreTrend + MiniSparkline
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// MarketPulseSnapshotView (exported)
// ---------------------------------------------------------------------------

export function MarketPulseSnapshotView({
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
