import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Link,
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
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { useTodayReview } from '../hooks/useTodayReview';
import type { TodayReviewCandidate, TodayReviewGroups, TodayReviewRun } from '../types';

const groupTabs: Array<{ key: keyof TodayReviewGroups; label: string }> = [
  { key: 'longReview', label: 'Long Review' },
  { key: 'exitRiskReview', label: 'Exit Risk / Short Review' },
  { key: 'watchOnly', label: 'Watch Only' },
  { key: 'blocked', label: 'Blocked' },
];

export function TodayReviewPage() {
  const { data, loading, running, error, reload, runReview, scope } = useTodayReview();
  const [tab, setTab] = useState<keyof TodayReviewGroups>('longReview');
  const run = data?.run || null;
  const groups = data?.groups || emptyGroups();
  const activeCandidates = candidatesForTab(groups, tab);
  const totals = useMemo(() => ({
    long: groups.longReview.length,
    exit: groups.exitRiskReview.length + groups.shortReview.length,
    watch: groups.watchOnly.length + groups.unproven.length + groups.insufficientData.length,
    blocked: groups.blocked.length + groups.avoid.length,
    warnings: run?.warnings.length || 0,
  }), [groups, run?.warnings.length]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Today's Trade Review"
        subtitle="Before-market research support shortlist built from trusted OHLCV coverage, supporting evidence, and trade-plan geometry."
        badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
        primaryAction={
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={() => void runReview()}
            disabled={running}
          >
            {running ? 'Running review' : "Run Today's Review"}
          </Button>
        }
        secondaryActions={<Button onClick={() => void reload()} disabled={loading || running}>Refresh</Button>}
      />

      {loading && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Loading Today's Trade Review for {scope.region} / {scope.assetType}.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void reload()}>Retry</Button>}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && !run && (
        <Alert
          severity="info"
          action={<Button color="inherit" size="small" onClick={() => void runReview()} disabled={running}>Run review</Button>}
        >
          No Today review has been published for {scope.region} / {scope.assetType}. Run the review to create a persisted shortlist snapshot.
        </Alert>
      )}

      {run && (
        <>
          <RunStatusPanel run={run} />
          <CoveragePanel run={run} />
          {run.warnings.length > 0 && (
            <Alert severity={run.status === 'PARTIAL' ? 'warning' : 'info'}>
              {run.warnings.join(' ')}
            </Alert>
          )}
          <Grid container spacing={2}>
            <SummaryCard label="Long review candidates" value={totals.long} tone="success" />
            <SummaryCard label="Exit-risk review candidates" value={totals.exit} tone="warning" />
            <SummaryCard label="Watch only" value={totals.watch} tone="info" />
            <SummaryCard label="Blocked" value={totals.blocked} tone="error" />
            <SummaryCard label="Data gaps/warnings" value={totals.warnings} tone="default" />
          </Grid>
          <ExclusionExplainabilityPanel run={run} />

          <Alert severity="info">
            Signals and calibration are supporting evidence only. Promoted review candidates require trusted price data, enough OHLCV history, and valid trade-plan geometry.
          </Alert>

          {groups.longReview.length === 0 && (
            <Alert severity="warning">
              No long review candidates are currently promoted. Trusted instruments scanned: {formatNumber(run.scanFunnel?.trustedInstrumentsScanned ?? (run.sourceSnapshot as any)?.scanFunnel?.trustedInstrumentsScanned ?? 0)}; setups detected: {formatNumber(run.scanFunnel?.setupsDetected ?? (run.sourceSnapshot as any)?.scanFunnel?.setupsDetected ?? 0)}; watch/unproven: {formatNumber((run.scanFunnel?.watchOnly ?? (run.sourceSnapshot as any)?.scanFunnel?.watchOnly ?? 0) + (run.scanFunnel?.unproven ?? (run.sourceSnapshot as any)?.scanFunnel?.unproven ?? 0))}.
            </Alert>
          )}

          <Card variant="outlined">
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
              {groupTabs.map((item) => (
                <Tab key={item.key} value={item.key} label={`${item.label} (${candidatesForTab(groups, item.key).length})`} />
              ))}
            </Tabs>
            <CardContent>
              {activeCandidates.length === 0 ? (
                <Typography color="text.secondary">
                  No candidates in this section for the current persisted run.
                </Typography>
              ) : (
                <CandidateTable candidates={activeCandidates} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}

function RunStatusPanel({ run }: { run: TodayReviewRun | null }) {
  if (!run) return null;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Chip label={`Run status: ${run.status}`} color={run.status === 'COMPLETED' ? 'success' : run.status === 'PARTIAL' ? 'warning' : 'error'} />
          <Chip label={`Trust: ${run.trustStatus}`} color={run.trustStatus === 'OK' ? 'success' : run.trustStatus === 'FAILED' ? 'error' : 'warning'} variant="outlined" />
          <Typography variant="body2" color="text.secondary">Last run: {formatDateTime(run.finishedAt || run.startedAt)}</Typography>
          <Typography variant="body2" color="text.secondary">Data-through: {formatDate(run.dataThroughDate)}</Typography>
          <Typography variant="body2" color="text.secondary">Scope: {run.region} / {run.assetType}</Typography>
          <Typography variant="body2" color="text.secondary">Review mode: {coverageValue(run, 'mode')}</Typography>
          <Typography variant="body2" color="text.secondary">Trusted universe: {formatNumber(Number(coverageValue(run, 'trustedCount') || 0))} / Catalog {formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CoveragePanel({ run }: { run: TodayReviewRun }) {
  const reviewUniverse = (run.sourceSnapshot as any)?.reviewUniverse || {};
  const reviewReadiness = (run.sourceSnapshot as any)?.reviewReadiness || {};
  const scanFunnel = run.scanFunnel || (run.sourceSnapshot as any)?.scanFunnel || {};
  const warnings = run.coverageWarnings || reviewUniverse.warnings || [];
  const trustedLoadStatus = scanFunnel.trustedLoadStatus || (scanFunnel.scanComplete === false ? 'CONFIGURED_PARTIAL' : 'COMPLETE');
  const membershipFailureReason = scanFunnel.membershipLoadFailureReason;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Review mode: ${coverageValue(run, 'mode')}`} color={coverageValue(run, 'mode') === 'FULL_REVIEW' ? 'success' : coverageValue(run, 'mode') === 'LIMITED_REVIEW' ? 'warning' : 'default'} />
            <Chip label={`Trusted universe: ${formatNumber(Number(coverageValue(run, 'trustedCount') || 0))}`} variant="outlined" />
            <Chip label={`Catalog: ${formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}`} variant="outlined" />
            <Chip label={`Target session: ${reviewUniverse.targetTradingDate || 'Unavailable'}`} variant="outlined" />
            <Chip label={`Required data-through: ${reviewUniverse.requiredDataThroughDate || 'Unavailable'}`} variant="outlined" />
            <Chip label={`Stored data-through: ${reviewUniverse.storedDataThroughDate || reviewUniverse.dataThroughDate || formatDate(run.dataThroughDate)}`} variant="outlined" />
            <Chip label={`Readiness decision: ${reviewReadiness.userDecision || 'WAIT'}`} variant="outlined" />
          </Stack>
          {reviewReadiness.reviewMode && reviewReadiness.reviewMode !== coverageValue(run, 'mode') && (
            <Alert severity="error">
              Today Review readiness mode does not match the Market Data summary snapshot.
            </Alert>
          )}
          {reviewReadiness.reviewMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              <Typography variant="caption">Market Data summary mode: {reviewReadiness.reviewMode}</Typography>
              <Typography variant="caption">Trust status: {reviewReadiness.trustStatus || 'UNKNOWN'}</Typography>
              <Typography variant="caption">Next bounded action: {reviewReadiness.nextAction?.label || 'none'}</Typography>
              <Typography variant="caption">Batch size: {reviewReadiness.nextAction?.boundedRequest?.batchSize || 'n/a'}</Typography>
            </Stack>
          )}
          {coverageValue(run, 'mode') === 'LIMITED_REVIEW' && (
            <Alert severity="warning">
              Limited review mode: candidates are generated only from stocks with current price, sufficient OHLCV history, and recent volume. Missing sector/market-cap data is shown as context gaps.
            </Alert>
          )}
          {coverageValue(run, 'mode') === 'NO_REVIEW' && (
            <Alert severity="warning">
              No review mode: trusted price-action universe is unavailable or below the lite threshold. Today review cannot publish candidates until the trusted-universe evidence is ready.
            </Alert>
          )}
          {trustedLoadStatus === 'LOAD_FAILED' && (
            <Alert severity="error">
              Trusted universe membership unavailable. {membershipFailureReason || 'Today review cannot publish candidates until membership can be loaded reliably.'}
            </Alert>
          )}
          {trustedLoadStatus === 'CONFIGURED_PARTIAL' && (
            <Alert severity="warning">
              Partial trusted-universe scan: scanned {formatNumber(scanFunnel.trustedInstrumentsScanned)} of {formatNumber(scanFunnel.trustedUniverseCount)} instruments using {scanFunnel.scanOrdering || 'configured'} ordering.
            </Alert>
          )}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
            <Typography variant="caption">Trusted available: {formatNumber(scanFunnel.trustedUniverseCount ?? coverageValue(run, 'trustedCount'))}</Typography>
            <Typography variant="caption">Scanned: {formatNumber(scanFunnel.trustedInstrumentsScanned)}</Typography>
            <Typography variant="caption">Scan complete: {scanFunnel.scanComplete === false ? 'no' : 'yes'}</Typography>
            <Typography variant="caption">Membership load: {trustedLoadStatus}</Typography>
            <Typography variant="caption">Setups detected: {formatNumber(scanFunnel.setupsDetected)}</Typography>
            <Typography variant="caption">Promoted: {formatNumber(scanFunnel.promotedCandidates)}</Typography>
            <Typography variant="caption">Watch/unproven: {formatNumber((scanFunnel.watchOnly || 0) + (scanFunnel.unproven || 0))}</Typography>
            <Typography variant="caption">Blocked: {formatNumber(scanFunnel.blocked)}</Typography>
            <Typography variant="caption">Strategy outside trusted universe: {formatNumber(scanFunnel.outsideTrustedUniverse)}</Typography>
          </Stack>
          {warnings.slice(0, 3).map((warning: string) => (
            <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ExclusionExplainabilityPanel({ run }: { run: TodayReviewRun }) {
  const explainability = run.explainability || (run.sourceSnapshot as any)?.explainability;
  if (!explainability) return null;
  const summaries = explainability.exclusionSummaries || [];
  const examples = explainability.inspectableExcludedExamples || [];
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Typography variant="h6">Exclusion reasons</Typography>
            <Chip label={`Excluded ${formatNumber(explainability.excludedCount)}`} color="warning" />
            <Chip label={`Promoted ${formatNumber(explainability.promotedCount)}`} color="success" variant="outlined" />
            <Chip label={`Watch ${formatNumber(explainability.watchCount)}`} color="info" variant="outlined" />
            <Chip label={`Blocked ${formatNumber(explainability.blockedCount)}`} color="error" variant="outlined" />
            <Chip label={`Unproven ${formatNumber(explainability.unprovenCount)}`} variant="outlined" />
            <Chip label={`Insufficient data ${formatNumber(explainability.insufficientDataCount)}`} variant="outlined" />
          </Stack>
          {summaries.length === 0 ? (
            <Typography color="text.secondary">No exclusion summary was stored for this run.</Typography>
          ) : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
              {summaries.slice(0, 8).map((summary: any) => (
                <Chip
                  key={`${summary.category}:${summary.code}`}
                  label={`${summary.category}: ${summary.count} - ${summary.label}`}
                  color={summary.blocking ? 'warning' : 'default'}
                  variant={summary.blocking ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          )}
          {examples.length > 0 && (
            <TableContainer>
              <Table size="small" aria-label="Today review excluded examples">
                <TableHead>
                  <TableRow>
                    <TableCell>Excluded example</TableCell>
                    <TableCell>Primary reason</TableCell>
                    <TableCell>Categories</TableCell>
                    <TableCell>Promotion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {examples.map((example: any) => (
                    <TableRow key={`${example.instrumentId}:${example.primaryReasonCode}`}>
                      <TableCell>
                        <Typography fontWeight={700}>{example.symbol}</Typography>
                        <Typography variant="caption" color="text.secondary">{example.companyName || example.instrumentId}</Typography>
                      </TableCell>
                      <TableCell>{example.primaryReasonLabel}</TableCell>
                      <TableCell>{(example.reasonCategories || []).join(', ')}</TableCell>
                      <TableCell>{example.promoted ? 'Promoted' : 'Not promoted'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'info' | 'error' | 'default' }) {
  const color = tone === 'default' ? 'text.primary' : `${tone}.main`;
  return (
    <Grid item xs={12} sm={6} md={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h4" sx={{ color, mt: 0.5 }}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function CandidateTable({ candidates }: { candidates: TodayReviewCandidate[] }) {
  return (
    <TableContainer>
      <Table size="small" aria-label="Today review candidates">
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Direction</TableCell>
            <TableCell>Setup</TableCell>
            <TableCell>Entry zone or trigger</TableCell>
            <TableCell>Stop / invalidation</TableCell>
            <TableCell>Target / reward</TableCell>
            <TableCell>Reward/risk</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Grade</TableCell>
            <TableCell>Data freshness</TableCell>
            <TableCell>Data quality</TableCell>
            <TableCell>Proof rating</TableCell>
            <TableCell>Market/regime</TableCell>
            <TableCell>Sector alignment</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Blocker</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {candidates.map((candidate) => {
            const plan = candidate.tradePlanSnapshot as any;
            const dq = candidate.dataQualitySnapshot as any;
            const proof = candidate.strategyProofSnapshot as any;
            const market = candidate.marketContextSnapshot as any;
            return (
              <TableRow key={candidate.id} hover>
                <TableCell>{candidate.rank}</TableCell>
                <TableCell>
                  <Link component={RouterLink} to={`/today-review/candidates/${candidate.id}`} fontWeight={700}>
                    {candidate.symbol}
                  </Link>
                  <Typography variant="caption" color="text.secondary" display="block">{candidate.companyName || 'Company unavailable'}</Typography>
                </TableCell>
                <TableCell>{stateLabel(candidate.state)}</TableCell>
                <TableCell>{candidate.setupType || candidate.strategyCode}</TableCell>
                <TableCell>{formatEntry(plan)}</TableCell>
                <TableCell>{formatStop(plan, candidate)}</TableCell>
                <TableCell>{formatTarget(plan)}</TableCell>
                <TableCell>{formatRatio(plan?.rewardRiskRatio)}</TableCell>
                <TableCell>{candidate.confidenceScore}</TableCell>
                <TableCell><Chip label={candidate.grade} size="small" color={gradeColor(candidate.grade) as any} /></TableCell>
                <TableCell>{formatDate(plan?.marketDataSnapshot?.latestStoredTradingDate || plan?.latestPriceTimestamp)}</TableCell>
                <TableCell>{dq?.coverageStatus || dq?.signalReadinessStatus || 'Missing'}</TableCell>
                <TableCell>{proof?.strategyRating?.ratingGrade || plan?.strategyRating || 'Unproven'}</TableCell>
                <TableCell>{market?.regime?.regime || 'Unknown'}</TableCell>
                <TableCell>{sectorAlignment(candidate)}</TableCell>
                <TableCell>{candidate.reasonSummary}</TableCell>
                <TableCell>{candidate.blockers[0] || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function candidatesForTab(groups: TodayReviewGroups, tab: keyof TodayReviewGroups) {
  if (tab === 'exitRiskReview') return [...groups.exitRiskReview, ...groups.shortReview];
  if (tab === 'watchOnly') return [...groups.watchOnly, ...groups.unproven, ...groups.insufficientData];
  if (tab === 'blocked') return [...groups.blocked, ...groups.avoid];
  return groups[tab] || [];
}

function emptyGroups(): TodayReviewGroups {
  return {
    longReview: [],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    blocked: [],
    avoid: [],
    insufficientData: [],
    unproven: [],
  };
}

function stateLabel(state: string) {
  return state.toLowerCase().split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function coverageValue(run: TodayReviewRun, key: 'mode' | 'trustedCount' | 'catalogCount') {
  const reviewUniverse = (run.sourceSnapshot as any)?.reviewUniverse || {};
  if (key === 'mode') return run.reviewUniverseMode || reviewUniverse.mode || 'NO_REVIEW';
  if (key === 'trustedCount') return run.trustedUniverseCount ?? reviewUniverse.trustedCount ?? 0;
  return run.catalogCount ?? reviewUniverse.catalogCount ?? 0;
}

function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  return `INR ${value.toFixed(2)}`;
}

function formatEntry(plan: any) {
  if (!plan?.entryZone) return 'Unavailable';
  const min = formatCurrency(Number(plan.entryZone.preferredEntryMin));
  const max = formatCurrency(Number(plan.entryZone.preferredEntryMax));
  return `${min} - ${max}`;
}

function formatStop(plan: any, candidate?: TodayReviewCandidate) {
  if (candidate?.blockers?.[0]) return candidate.blockers[0];
  if (!plan?.stopLoss) return 'Unavailable';
  return `${formatCurrency(Number(plan.stopLoss.price))}; ${plan.invalidationRules?.[0] || 'Invalidation unavailable'}`;
}

function formatTarget(plan: any) {
  if (!plan?.target) return 'Unavailable';
  return formatCurrency(Number(plan.target.price));
}

function formatRatio(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'Unavailable';
}

function gradeColor(grade: string) {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'primary';
  if (grade === 'C' || grade === 'UNPROVEN') return 'warning';
  return 'error';
}

function sectorAlignment(candidate: TodayReviewCandidate) {
  const sector = (candidate.dataQualitySnapshot as any)?.sector || (candidate.sourceSignalSnapshot as any)?.rawSignal?.sector;
  return sector || 'Unknown';
}
