import AddAlertIcon from '@mui/icons-material/AddAlert';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { AddToWatchlistDialog } from '@/features/watchlist-management';
import { CreateAlertDialog } from '@/features/alerts-monitoring';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { useTodayReviewCandidate } from '../hooks/useTodayReview';
import type { TodayReviewCandidate, TodayReviewCandidateDataQualitySnapshot } from '../types';
import { safeReviewText, stateLabel } from './todayReviewTableFormat';
import {
  detailTierContext,
  detailConfidenceDisplay,
  tierDetailLabel,
  formatEntryTrigger,
  formatExitCondition,
  formatInvalidationCondition,
  dataQualityStatus,
  formatReadinessLabel,
  formatDecisionLabel,
  formatNumber,
  formatPercent,
  formatDateTime,
  reasonCategoryLabel,
  reasonSourceLabel,
} from './todayReviewCandidateDetailFormat';

export function TodayReviewCandidateDetailPage() {
  const { candidateId } = useParams();
  const { candidate, loading, error, reload } = useTodayReviewCandidate(candidateId);
  const { profile } = useMarketScope();
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  if (loading) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Daily Review Candidate" backTo="/today-review" backLabel="Daily Review" />
        <Alert severity="info" icon={<CircularProgress size={18} />}>Loading candidate details.</Alert>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Daily Review Candidate" backTo="/today-review" backLabel="Daily Review" />
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void reload()}>Retry</Button>}>{error}</Alert>
      </Stack>
    );
  }

  if (!candidate) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Daily Review Candidate" backTo="/today-review" backLabel="Daily Review" />
        <Alert severity="warning">Candidate not found.</Alert>
      </Stack>
    );
  }

  const plan = candidate.tradePlanSnapshot as any;
  const proof = candidate.strategyProofSnapshot as any;
  const market = candidate.marketContextSnapshot as any;
  const dataQuality = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  const signals = candidate.sourceSignalSnapshot as any;
  const explainability = candidate.explainability;
  const dqTierContext = detailTierContext(dataQuality);
  const confidence = detailConfidenceDisplay(candidate.confidenceScore, dqTierContext.missingTierContext);
  const priceBehaviourText = buildPriceBehaviourText(candidate);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`${candidate.symbol} research review`}
        subtitle={candidate.companyName || 'Company unavailable'}
        backTo="/today-review"
        backLabel="Today Review"
        badges={<Stack direction="row" spacing={1} flexWrap="wrap"><Chip label={stateLabel(candidate.state)} color={candidate.state === 'BLOCKED' ? 'error' : 'primary'} /><Chip label={`Grade ${candidate.grade}`} variant="outlined" /></Stack>}
        secondaryActions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<BookmarkAddIcon />} variant="outlined" size="small" onClick={() => setWatchlistOpen(true)}>Add to Watchlist</Button>
            <Button startIcon={<AddAlertIcon />} variant="outlined" size="small" onClick={() => setAlertOpen(true)}>Set Alert</Button>
            <Button startIcon={<RefreshIcon />} onClick={() => void reload()}>Refresh</Button>
          </Stack>
        }
      />
      <AddToWatchlistDialog
        open={watchlistOpen}
        instrumentId={candidate.instrumentId}
        symbol={candidate.symbol}
        companyName={candidate.companyName}
        onClose={() => setWatchlistOpen(false)}
      />
      <CreateAlertDialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        defaults={{ scope: 'STOCK', instrumentId: candidate.instrumentId }}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Business reason</Typography>
            <Typography>{safeReviewText(candidate.reasonSummary)}</Typography>
            <Divider />
            <Grid container spacing={2}>
              <Fact label="Direction" value={stateLabel(candidate.direction)} />
              <Fact label="Setup type" value={candidate.setupType || candidate.strategyCode} />
              <Fact label="Confidence score (conservative view)" value={confidence} />
              <Fact label="Entry trigger context" value={formatEntryTrigger(candidate, plan, profile.currency)} />
              <Fact label="Exit condition" value={formatExitCondition(plan)} />
              <Fact label="Invalidation condition" value={formatInvalidationCondition(plan, candidate, profile.currency)} />
              <Fact label="Data quality status" value={dataQualityStatus(dataQuality)} />
              <Fact label="Failure condition" value={safeReviewText(candidate.blockers[0] || plan?.invalidationRules?.[0] || 'Evidence weakens or invalidation is reached.')} />
              <Fact label="Do nothing unless" value={safeReviewText(plan?.doNothingUnless || (candidate.state === 'LONG_REVIEW' ? 'The entry trigger, invalidation condition, proof, and data quality remain valid.' : 'Blockers or data gaps are resolved in a later review.'))} />
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {priceBehaviourText && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Price behaviour</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
              Summary based on available data. Descriptive context only — not investment advice.
            </Typography>
            <Typography>{priceBehaviourText}</Typography>
          </CardContent>
        </Card>
      )}

      {(candidate.blockers.length > 0 || candidate.watchReasons.length > 0) && (
        <Alert severity={candidate.blockers.length > 0 ? 'error' : 'warning'}>
          {[...candidate.blockers, ...candidate.watchReasons].map(safeReviewText).join(' ')}
        </Alert>
      )}
      {dqTierContext.missingTierContext && (
        <Alert severity="warning">
          Data Quality tier context is missing for this candidate. Confidence is shown conservatively and readiness is not assumed.
        </Alert>
      )}
      {(dqTierContext.dailyReview.status === 'LIMITED' || dqTierContext.dailyReview.status === 'BLOCKED') && (
        <Alert severity={dqTierContext.dailyReview.status === 'BLOCKED' ? 'error' : 'warning'}>
          Daily review tier constraint: {dqTierContext.dailyReview.reason || `Daily review tier is ${dqTierContext.dailyReview.status}.`}
        </Alert>
      )}
      <Alert severity={dqTierContext.automation.status === 'BLOCKED' ? 'info' : 'warning'}>
        Automated trading is not enabled in Today Review.
      </Alert>

      {explainability && (
        <Grid container spacing={2}>
          <Panel title="Ranking components">
            <FactStack items={[
              ['Strategy proof', formatNumber(explainability.rankingComponents.strategyProof)],
              ['Exit/invalidation evidence', formatNumber(explainability.rankingComponents.tradePlan)],
              ['Market regime', formatNumber(explainability.rankingComponents.marketRegime)],
              ['Sector alignment', formatNumber(explainability.rankingComponents.sectorAlignment)],
              ['Signal calibration', formatNumber(explainability.rankingComponents.signalCalibration)],
              ['Data quality', formatNumber(explainability.rankingComponents.dataQuality)],
              ['Smart money', formatNumber(explainability.rankingComponents.smartMoney)],
              ['Hard blocker override', explainability.rankingComponents.hardBlockerOverride ? 'Yes' : 'No'],
            ]} />
          </Panel>
          <Panel title="Reason categories">
            <ReasonList reasons={[...explainability.blockers, ...explainability.watchReasons, ...explainability.promotionReasons]} />
          </Panel>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Panel title="Strategy proof">
          <FactStack items={[
            ['Strategy', proof?.strategyCode || candidate.strategyCode],
            ['Framework-backed', proof?.frameworkBacked ? 'Yes' : 'No'],
            ['Proof rating', proof?.strategyRating?.ratingGrade || proof?.evidenceLabel || plan?.strategyRating || 'Unproven'],
            ['Sample size', formatNumber(proof?.sampleSize)],
            ['Readiness', formatReadinessLabel(proof?.readinessLabel || plan?.readinessLabel)],
            ['Decision', formatDecisionLabel(proof?.decision)],
          ]} />
        </Panel>
        <Panel title="Market context">
          <FactStack items={[
            ['Regime', market?.regime?.regime || 'Unknown'],
            ['Regime score', formatNumber(market?.regime?.score)],
            ['Breadth above SMA50', formatPercent(market?.breadth?.percentAboveSma50)],
            ['Breadth above SMA200', formatPercent(market?.breadth?.percentAboveSma200)],
            ['Context status', market?.dataStatus || 'Unavailable'],
          ]} />
        </Panel>
        <Panel title="Data quality">
          <FactStack items={[
            ['Coverage', dataQuality?.coverageStatus || 'Missing'],
            ['Signal readiness', dataQuality?.signalReadinessStatus || 'Missing'],
            ['Liquidity', dataQuality?.liquidityStatus || 'Missing'],
            ['Context gaps', Array.isArray(dataQuality?.contextGaps) ? dataQuality.contextGaps.join(', ') || 'None' : 'Unavailable'],
            ['Last evaluated', formatDateTime(dataQuality?.lastEvaluatedAt)],
          ]} />
        </Panel>
        <Panel title="Data quality tiers">
          <FactStack items={[
            ['Daily review tier', tierDetailLabel(dqTierContext.dailyReview.status, dqTierContext.dailyReview.reason)],
            ['Signal tier', tierDetailLabel(dqTierContext.signal.status, dqTierContext.signal.reason)],
            ['Backtest tier', tierDetailLabel(dqTierContext.backtest.status, dqTierContext.backtest.reason)],
            ['Calibration tier', tierDetailLabel(dqTierContext.calibration.status, dqTierContext.calibration.reason)],
            ['Automation tier', tierDetailLabel(dqTierContext.automation.status, dqTierContext.automation.reason)],
            ['Trusted baseline residual', dataQuality?.tierEvidence?.trustedBaselineResidualState || 'Unavailable'],
            ['Required history status', dataQuality?.tierEvidence?.requiredHistoryStatus || 'Unavailable'],
            ['Listing-date status', dataQuality?.tierEvidence?.listingDateStatus || 'Unavailable'],
            ['Signal history present', typeof dataQuality?.tierEvidence?.hasSignalHistory === 'boolean' ? (dataQuality.tierEvidence.hasSignalHistory ? 'Yes' : 'No') : 'Unavailable'],
            ['Trusted baseline blocker codes', dataQuality?.tierEvidence?.trustedBaselineBlockerCodes?.join(', ') || 'Unavailable'],
          ]} />
        </Panel>
        <Panel title="Exit/invalidation evidence">
          <FactStack items={[
            ['Snapshot status', formatReadinessLabel(plan?.planStatus)],
            ['Risk warning', plan?.riskGrade || 'Unavailable'],
            ['Entry trigger context', formatEntryTrigger(candidate, plan, profile.currency)],
            ['Exit condition', formatExitCondition(plan)],
            ['Invalidation condition', formatInvalidationCondition(plan, candidate, profile.currency)],
          ]} />
        </Panel>
      </Grid>

        <Panel title="Supporting evidence">
        <FactStack items={[
          ['Raw signal support', signals?.rawSignal?.direction || 'Unavailable'],
          ['Calibration support', signals?.calibration?.calibratedDirection || 'Unavailable'],
          ['Smart-money support', signals?.smartMoney?.status || 'Unavailable'],
          ['Readiness evidence', explainability?.upstreamEvidence?.readiness ? 'Available' : 'Unavailable'],
          ['Strategy proof evidence', explainability?.upstreamEvidence?.strategyProof ? 'Available' : 'Unavailable'],
          ['Exit/invalidation evidence', explainability?.upstreamEvidence?.tradePlanProofChain ? 'Available' : 'Unavailable'],
        ]} />
      </Panel>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Drilldowns</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Link component={RouterLink} to={`/stocks/${candidate.symbol}`}>{candidate.symbol} Stock Page</Link>
            <Link component={RouterLink} to={`/stocks/${candidate.instrumentId}`}>Instrument Workspace</Link>
            <Link component={RouterLink} to="/watchlists">Watchlists</Link>
            <Link component={RouterLink} to="/alerts">Alerts</Link>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Grid item xs={12} md={6}>
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          {children}
        </CardContent>
      </Card>
    </Grid>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
    </Grid>
  );
}

function FactStack({ items }: { items: Array<[string, string]> }) {
  return (
    <List dense disablePadding>
      {items.map(([label, value]) => (
        <ListItem key={label} disableGutters>
          <ListItemText primary={label} secondary={value} secondaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }} />
        </ListItem>
      ))}
    </List>
  );
}

function ReasonList({ reasons }: { reasons: Array<{ code: string; label: string; category: string; severity: string; sourceModule: string; evidenceDate?: string | null }> }) {
  if (reasons.length === 0) return <Typography color="text.secondary">No reasons available.</Typography>;
  return (
    <List dense disablePadding>
      {reasons.map((reason, i) => {
        const category = reasonCategoryLabel(reason.category);
        const source = reasonSourceLabel(reason.sourceModule);
        return (
          <ListItem key={`${reason.severity}:${reason.code}:${i}`} disableGutters>
            <ListItemText
              primary={`${category} / ${reason.severity}`}
              secondary={`${safeReviewText(reason.label)} Source: ${source}${reason.evidenceDate ? `; Evidence: ${formatDateTime(reason.evidenceDate)}` : ''}`}
              secondaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
            />
          </ListItem>
        );
      })}
    </List>
  );
}


/**
 * Assembles a deterministic "Price behaviour" sentence from fields already
 * present in the candidate snapshot.  Returns null when no useful data is
 * available (so the card is omitted rather than rendered empty).
 *
 * Clause order:
 *   1. Recent return (3-day or daily change)
 *   2. Volume context
 *   3. Delivery context (strategy-backed path only)
 *   4. Earnings proximity (from watchReasons caveat string)
 *   5. Sector context
 *
 * Never fabricates — each clause is omitted when its source field is null.
 */
function buildPriceBehaviourText(candidate: TodayReviewCandidate): string | null {
  const signals = candidate.sourceSignalSnapshot as any;
  const pb = signals?.priceBehaviour as {
    recentReturn3D?: number | null;
    dailyChangePercent?: number | null;
    volumeVsAvg20D?: number | null;
    deliveryPercent?: number | null;
    deliveryEvidence?: string | null;
    sector?: string | null;
  } | null | undefined;

  const market = candidate.marketContextSnapshot as any;
  const dataQuality = candidate.dataQualitySnapshot as any;

  const clauses: string[] = [];

  // 1. Recent return
  const ret3D = typeof pb?.recentReturn3D === 'number' && Number.isFinite(pb.recentReturn3D) ? pb.recentReturn3D : null;
  const dailyPct = typeof pb?.dailyChangePercent === 'number' && Number.isFinite(pb.dailyChangePercent) ? pb.dailyChangePercent : null;
  if (ret3D !== null) {
    const sign = ret3D >= 0 ? '+' : '';
    clauses.push(`Price moved ${sign}${ret3D.toFixed(1)}% over the last 3 trading days`);
  } else if (dailyPct !== null) {
    const sign = dailyPct >= 0 ? '+' : '';
    clauses.push(`Price moved ${sign}${dailyPct.toFixed(1)}% in the latest session`);
  }

  // 2. Volume context
  const volRatio = typeof pb?.volumeVsAvg20D === 'number' && pb.volumeVsAvg20D > 0 ? pb.volumeVsAvg20D : null;
  const hasRecentVolume = dataQuality?.hasRecentVolume;
  if (volRatio !== null) {
    if (volRatio >= 1.5) {
      clauses.push(`on above-average volume (${volRatio.toFixed(1)}x 20-day average)`);
    } else if (volRatio >= 0.8) {
      clauses.push(`on near-average volume (${volRatio.toFixed(1)}x 20-day average)`);
    } else {
      clauses.push(`on below-average volume (${volRatio.toFixed(1)}x 20-day average)`);
    }
  } else if (typeof hasRecentVolume === 'boolean') {
    clauses.push(hasRecentVolume ? 'with recent volume activity confirmed' : 'with no recent volume activity noted');
  }

  // 3. Delivery context (strategy-backed path — available when rawSignal is present)
  const deliveryPct = typeof pb?.deliveryPercent === 'number' && Number.isFinite(pb.deliveryPercent) ? pb.deliveryPercent : null;
  if (deliveryPct !== null) {
    clauses.push(`delivery ${deliveryPct.toFixed(0)}%`);
  }

  // 4. Earnings proximity — parse from watchReasons
  const earningsWatchReason = candidate.watchReasons.find((reason) =>
    reason.toLowerCase().includes('earnings result') || reason.toLowerCase().includes('earnings in')
  );
  if (earningsWatchReason) {
    // Extract the lead clause up to the em-dash for brevity
    const brief = earningsWatchReason.split(' — ')[0] ?? earningsWatchReason;
    clauses.push(brief);
  }

  // 5. Sector context
  const sector = pb?.sector ?? dataQuality?.sector ?? null;
  const sectorLeadership: string | null = market?.sectorLeadershipStatus ?? null;
  if (sector) {
    if (sectorLeadership) {
      clauses.push(`sector ${sector} is ${sectorLeadership.toUpperCase()}`);
    } else {
      clauses.push(`sector ${sector}`);
    }
  }

  if (clauses.length === 0) return null;

  // Compose: first clause starts the sentence; subsequent clauses are appended
  const [first, ...rest] = clauses;
  if (rest.length === 0) return `${first}.`;
  return `${first}, ${rest.join('; ')}.`;
}

