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
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { useTodayReviewCandidate } from '../hooks/useTodayReview';
import type { TodayReviewCandidateDataQualitySnapshot } from '../types';

export function TodayReviewCandidateDetailPage() {
  const { candidateId } = useParams();
  const { candidate, loading, error, reload } = useTodayReviewCandidate(candidateId);

  if (loading) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Daily Review Candidate" backTo="/today-review" backLabel="Daily Review" />
        <Alert severity="info" icon={<CircularProgress size={18} />}>Loading candidate research snapshot.</Alert>
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
        <Alert severity="warning">Candidate snapshot was not found.</Alert>
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

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`${candidate.symbol} research support`}
        subtitle={candidate.companyName || 'Company unavailable'}
        backTo="/today-review"
        backLabel="Today Review"
        badges={<Stack direction="row" spacing={1} flexWrap="wrap"><Chip label={stateLabel(candidate.state)} color={candidate.state === 'BLOCKED' ? 'error' : 'primary'} /><Chip label={`Grade ${candidate.grade}`} variant="outlined" /></Stack>}
        secondaryActions={<Button startIcon={<RefreshIcon />} onClick={() => void reload()}>Refresh</Button>}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Business reason</Typography>
            <Typography>{candidate.reasonSummary}</Typography>
            <Divider />
            <Grid container spacing={2}>
              <Fact label="Direction" value={stateLabel(candidate.direction)} />
              <Fact label="Setup type" value={candidate.setupType || candidate.strategyCode} />
              <Fact label="Confidence score (conservative view)" value={confidence} />
              <Fact label="Preferred entry zone" value={formatEntry(plan)} />
              <Fact label="Stop / invalidation" value={formatStop(plan)} />
              <Fact label="Target 1 / Target 2 or reward range" value={formatTarget(plan)} />
              <Fact label="Reward/risk" value={formatRatio(plan?.rewardRiskRatio)} />
              <Fact label="Failure condition" value={candidate.blockers[0] || plan?.invalidationRules?.[0] || 'Evidence weakens or invalidation is reached.'} />
              <Fact label="Do nothing unless" value={plan?.doNothingUnless || (candidate.state === 'LONG_REVIEW' ? 'The entry zone, invalidation, proof, and data quality remain valid.' : 'Blockers or data gaps are resolved in a later review.')} />
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {(candidate.blockers.length > 0 || candidate.watchReasons.length > 0) && (
        <Alert severity={candidate.blockers.length > 0 ? 'error' : 'warning'}>
          {[...candidate.blockers, ...candidate.watchReasons].join(' ')}
        </Alert>
      )}
      {dqTierContext.missingTierContext && (
        <Alert severity="warning">
          Data Quality use-case tier context is missing for this candidate snapshot. This detail view applies conservative read-only confidence downgrade and does not assume readiness.
        </Alert>
      )}
      {(dqTierContext.dailyReview.status === 'LIMITED' || dqTierContext.dailyReview.status === 'BLOCKED') && (
        <Alert severity={dqTierContext.dailyReview.status === 'BLOCKED' ? 'error' : 'warning'}>
          Daily review tier constraint: {dqTierContext.dailyReview.reason || `Daily review tier is ${dqTierContext.dailyReview.status}.`}
        </Alert>
      )}
      <Alert severity={dqTierContext.automation.status === 'BLOCKED' ? 'info' : 'warning'}>
        Automation is policy-blocked in Today Review and is never broker-authorized in this phase.
      </Alert>

      {explainability && (
        <Grid container spacing={2}>
          <Panel title="Ranking components">
            <FactStack items={[
              ['Strategy proof', formatNumber(explainability.rankingComponents.strategyProof)],
              ['Trade plan', formatNumber(explainability.rankingComponents.tradePlan)],
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
            ['Readiness', proof?.readinessLabel || plan?.readinessLabel || 'Unavailable'],
            ['Decision', proof?.decision || 'Unavailable'],
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
        <Panel title="Use-case tiers (read-only)">
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
        <Panel title="Trade plan">
          <FactStack items={[
            ['Plan status', plan?.planStatus || 'Unavailable'],
            ['Risk grade', plan?.riskGrade || 'Unavailable'],
            ['Entry trigger', formatEntry(plan)],
            ['Stop / invalidation', formatStop(plan)],
            ['Reward range', formatTarget(plan)],
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
          ['Trade-plan proof-chain', explainability?.upstreamEvidence?.tradePlanProofChain ? 'Available' : 'Unavailable'],
        ]} />
      </Panel>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Drilldowns</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
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
  if (reasons.length === 0) return <Typography color="text.secondary">No candidate reasons were stored for this panel.</Typography>;
  return (
    <List dense disablePadding>
      {reasons.map((reason) => (
        <ListItem key={`${reason.severity}:${reason.code}`} disableGutters>
          <ListItemText
            primary={`${reason.category} / ${reason.severity}`}
            secondary={`${reason.label} Source: ${reason.sourceModule}${reason.evidenceDate ? `; Evidence: ${formatDateTime(reason.evidenceDate)}` : ''}`}
            secondaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
          />
        </ListItem>
      ))}
    </List>
  );
}

type DetailTierStatus = 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';

interface DetailTier {
  status: DetailTierStatus;
  reason: string | null;
}

interface DetailTierContext {
  dailyReview: DetailTier;
  signal: DetailTier;
  backtest: DetailTier;
  calibration: DetailTier;
  automation: DetailTier;
  missingTierContext: boolean;
}

function detailTierContext(dataQuality: TodayReviewCandidateDataQualitySnapshot | null): DetailTierContext {
  const tiers = dataQuality?.useCaseTiers;
  const missingTierContext = !tiers?.dailyReview || !tiers?.automation;

  const normalizeTier = (
    tier: { status: 'READY' | 'LIMITED' | 'BLOCKED'; reasons: string[] } | undefined,
  ): DetailTier => ({
    status: tier?.status || 'MISSING',
    reason: tier?.reasons?.[0] || (tier ? null : 'Missing from snapshot'),
  });

  const automationTier = normalizeTier(tiers?.automation);
  return {
    dailyReview: normalizeTier(tiers?.dailyReview),
    signal: normalizeTier(tiers?.signal),
    backtest: normalizeTier(tiers?.backtest),
    calibration: normalizeTier(tiers?.calibration),
    automation: {
      status: tiers?.automation ? 'BLOCKED' : 'MISSING',
      reason: !tiers?.automation
        ? 'Missing from snapshot; policy remains blocked.'
        : tiers.automation.status !== 'BLOCKED'
          ? `Upstream status ${tiers.automation.status}; Today Review policy remains BLOCKED (PHASE0_AUTOMATION_NOT_AUTHORIZED).`
          : automationTier.reason || 'PHASE0_AUTOMATION_NOT_AUTHORIZED',
    },
    missingTierContext,
  };
}

function detailConfidenceDisplay(score: number, missingTierContext: boolean) {
  if (!missingTierContext) return String(score);
  const conservative = Math.max(0, Math.round(Number(score || 0) * 0.8));
  return `${conservative} (from ${score}; conservative due to missing DQ tiers)`;
}

function tierDetailLabel(status: DetailTierStatus, reason: string | null) {
  return reason ? `${status} (${reason})` : status;
}

function stateLabel(value: string) {
  return value.toLowerCase().split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  return `INR ${value.toFixed(2)}`;
}

function formatEntry(plan: any) {
  if (!plan?.entryZone) return 'Unavailable';
  return `${formatCurrency(Number(plan.entryZone.preferredEntryMin))} - ${formatCurrency(Number(plan.entryZone.preferredEntryMax))}`;
}

function formatStop(plan: any) {
  if (!plan?.stopLoss) return 'Unavailable';
  return `${formatCurrency(Number(plan.stopLoss.price))}; ${plan.invalidationRules?.[0] || 'Invalidation unavailable'}`;
}

function formatTarget(plan: any) {
  if (!plan?.target) return 'Unavailable';
  const target2 = typeof plan.target.target2 === 'number' ? ` / ${formatCurrency(plan.target.target2)}` : '';
  return `${formatCurrency(Number(plan.target.price))}${target2}; ${formatNumber(plan.target.expectedReturnPercent)}% modeled reward`;
}

function formatRatio(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'Unavailable';
}

function formatNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : 'Unavailable';
}

function formatPercent(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Unavailable';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}
