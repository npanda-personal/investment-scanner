import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useDailyOverviewDashboard } from '../hooks/useDailyOverviewDashboard';
import type {
  CandidateGroupKey,
  CandidateGroupSummary,
  DailyPulseState,
  DashboardDrilldownRoute,
  TodayReviewCandidateGroupSet,
} from '../types';

const candidateGroupOrder: CandidateGroupKey[] = ['bullishReview', 'bearishReview', 'exitRiskReview'];
const candidateGroupLabels: Record<CandidateGroupKey, string> = {
  bullishReview: 'Bullish review',
  bearishReview: 'Bearish review',
  exitRiskReview: 'Exit-risk review',
};

const pulseLabel: Record<DailyPulseState, string> = {
  REVIEW_SUPPORTED: 'Review supported',
  REVIEW_LIMITED: 'Review limited',
  REVIEW_BLOCKED: 'Review blocked',
  MIXED_EVIDENCE: 'Mixed evidence',
  UNAVAILABLE: 'Unavailable',
};

const pulseColor: Record<DailyPulseState, 'success' | 'warning' | 'error' | 'default'> = {
  REVIEW_SUPPORTED: 'success',
  REVIEW_LIMITED: 'warning',
  REVIEW_BLOCKED: 'error',
  MIXED_EVIDENCE: 'warning',
  UNAVAILABLE: 'default',
};

const unavailableLabel = 'Unavailable';

export function DailyOverviewDashboardPage() {
  const dashboard = useDailyOverviewDashboard();
  const [candidateGroup, setCandidateGroup] = useState<CandidateGroupKey>('bullishReview');

  const todayReview = dashboard.critical.todayReview.data;
  const research = dashboard.critical.researchOverview.data;
  const reviewReadiness = dashboard.critical.reviewReadiness.data;
  const marketContext = dashboard.deferred.marketContext.data;
  const dataQualitySummary = dashboard.deferred.dataQualitySummary.data;
  const latestSignalRun = dashboard.deferred.latestSignalRun.data;
  const pipelineStatus = dashboard.deferred.pipelineStatus.data;

  const todayReviewGroups: TodayReviewCandidateGroupSet = useMemo(() => ({
    bullishReview: todayReview?.groups.longReview ?? [],
    bearishReview: todayReview?.groups.shortReview ?? [],
    exitRiskReview: todayReview?.groups.exitRiskReview ?? [],
    watchOnly: todayReview?.groups.watchOnly ?? [],
    blocked: todayReview?.groups.blocked ?? [],
    insufficientData: todayReview?.groups.insufficientData ?? [],
    unproven: todayReview?.groups.unproven ?? [],
  }), [todayReview]);

  const candidateSummaries: Record<CandidateGroupKey, CandidateGroupSummary> = useMemo(() => ({
    bullishReview: {
      key: 'bullishReview',
      label: candidateGroupLabels.bullishReview,
      count: todayReviewGroups.bullishReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.bullishReview),
    },
    bearishReview: {
      key: 'bearishReview',
      label: candidateGroupLabels.bearishReview,
      count: todayReviewGroups.bearishReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.bearishReview),
    },
    exitRiskReview: {
      key: 'exitRiskReview',
      label: candidateGroupLabels.exitRiskReview,
      count: todayReviewGroups.exitRiskReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.exitRiskReview),
    },
  }), [todayReviewGroups]);

  const watchBlockedRows = useMemo(() => [
    ...todayReviewGroups.watchOnly.map((item) => ({ group: 'Watch only', item })),
    ...todayReviewGroups.insufficientData.map((item) => ({ group: 'Insufficient evidence', item })),
    ...todayReviewGroups.unproven.map((item) => ({ group: 'Unproven evidence', item })),
    ...todayReviewGroups.blocked.map((item) => ({ group: 'Blocked', item })),
  ], [todayReviewGroups]);

  const pulseState = useMemo<DailyPulseState>(() => {
    const runTrust = todayReview?.run?.trustStatus;
    const runStatus = todayReview?.run?.status;
    const readinessTrust = reviewReadiness?.trustStatus;
    const reviewMode = reviewReadiness?.reviewMode || todayReview?.run?.sourceSnapshot.reviewReadiness?.reviewMode;

    if (!todayReview?.run && !reviewReadiness) return 'UNAVAILABLE';
    if (reviewMode === 'NO_REVIEW' || readinessTrust === 'NOT_TRUSTWORTHY' || runStatus === 'FAILED' || runTrust === 'FAILED') {
      return 'REVIEW_BLOCKED';
    }
    if ((runTrust === 'OK' && readinessTrust === 'PARTIAL') || (runTrust === 'PARTIAL' && readinessTrust === 'OK')) {
      return 'MIXED_EVIDENCE';
    }
    if (runTrust === 'PARTIAL' || runStatus === 'PARTIAL' || reviewMode === 'LIMITED_REVIEW' || readinessTrust === 'PARTIAL') {
      return 'REVIEW_LIMITED';
    }
    if (runTrust === 'OK' || readinessTrust === 'OK') return 'REVIEW_SUPPORTED';
    return 'UNAVAILABLE';
  }, [reviewReadiness, todayReview?.run]);

  const topWarning = todayReview?.run?.warnings?.[0]
    || todayReview?.run?.coverageWarnings?.[0]
    || reviewReadiness?.blockers?.[0]?.nextActionLabel
    || research?.marketReadiness?.blockers?.[0]
    || research?.dataGaps?.[0]
    || null;
  const nextActionLabel = todayReview?.run?.sourceSnapshot?.reviewReadiness?.nextAction?.label
    || reviewReadiness?.nextAction?.label
    || research?.nextActions?.[0]?.label
    || 'Open Today Review for scoped diagnostics.';
  const nextActionRoute = research?.nextActions?.[0]?.targetRoute || '/today-review';
  const activeCandidateGroup = candidateSummaries[candidateGroup];
  const pipelineRun = pipelineStatus?.activeRun || pipelineStatus?.lastRun || null;
  const marketBreadth = research?.confirmationSummary?.marketContextSummary?.breadthStatus
    || unavailableLabel;

  const supportingRoutes: DashboardDrilldownRoute[] = [
    { label: 'Today Review', to: '/today-review', context: todayReview?.run ? `Run ${todayReview.run.status}` : null },
    { label: 'Research Command Center', to: '/research', context: research?.nextActions?.[0]?.priority ? `${research.nextActions[0].priority} priority` : null },
    { label: 'Market Context', to: '/market-context', context: marketContext?.regime?.regime || null },
    { label: 'Raw Signals', to: '/signals', context: latestSignalRun?.status || null },
    { label: 'Signal Calibration', to: '/signals/calibration', context: 'Evidence-through placeholder' },
    { label: 'Data Quality', to: '/data-quality', context: reviewReadiness?.trustStatus || null },
    { label: 'Smart Money', to: '/smart-money', context: research ? formatSmartMoneyContext(research.confirmationSummary?.smartMoneySummary) : null },
    { label: 'Pipeline Ops', to: '/pipeline-ops', context: pipelineRun?.status || null },
    { label: 'Backtests', to: '/backtests', context: research ? `${formatNumber(research.strategyProofSummary?.missingBacktestCount)} missing proof` : null },
  ];

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1.5}>
              <Box>
                <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700 }}>
                  Daily Overview
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Investor and trader review workspace for scoped market evidence.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => void dashboard.refresh()}
                disabled={dashboard.refreshing}
              >
                {dashboard.refreshing ? 'Refreshing dashboard' : 'Refresh dashboard'}
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${dashboard.scope.region} / ${dashboard.scope.assetType}`} color="primary" variant="outlined" />
              <Chip label={pulseLabel[pulseState]} color={pulseColor[pulseState]} />
              <Chip label={`Dashboard refetched: ${formatDateTime(dashboard.latestDashboardFetchedAt)}`} variant="outlined" />
              {dashboard.latestSourceTimestamp && (
                <Chip label={`Latest source timestamp: ${formatDateTime(dashboard.latestSourceTimestamp)}`} variant="outlined" />
              )}
              <Chip label="Research-support context only" variant="outlined" />
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Market Pulse</Typography>
            {dashboard.criticalLoading && (
              <Stack spacing={1}>
                <Skeleton variant="rounded" height={36} />
                <Skeleton variant="rounded" height={24} />
                <Skeleton variant="rounded" height={24} width="65%" />
              </Stack>
            )}
            {!dashboard.criticalLoading && (dashboard.critical.todayReview.error || dashboard.critical.reviewReadiness.error) && (
              <Alert severity="warning">
                {dashboard.critical.todayReview.error || dashboard.critical.reviewReadiness.error}
              </Alert>
            )}
            {!dashboard.criticalLoading && dashboard.critical.researchOverview.error && (
              <Alert severity="warning">
                Research overview is unavailable for supporting market context: {dashboard.critical.researchOverview.error}
              </Alert>
            )}
            {dashboard.deferred.marketContext.error && (
              <Alert severity="warning">
                {dashboard.deferred.marketContext.error}
              </Alert>
            )}
            {!dashboard.criticalLoading && (
              <>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Today Review run: ${formatStatus(todayReview?.run?.status)}`} variant="outlined" />
                  <Chip label={`Trust status: ${formatStatus(todayReview?.run?.trustStatus ?? reviewReadiness?.trustStatus)}`} variant="outlined" />
                  <Chip label={`Review mode: ${formatStatus(reviewReadiness?.reviewMode ?? todayReview?.run?.sourceSnapshot?.reviewReadiness?.reviewMode)}`} variant="outlined" />
                  <Chip label={`Trusted universe: ${formatRatio(reviewReadiness?.reviewUniverse?.trustedCount ?? todayReview?.run?.trustedUniverseCount, reviewReadiness?.reviewUniverse?.catalogCount ?? todayReview?.run?.catalogCount)}`} variant="outlined" />
                  <Chip label={`Required data-through: ${formatDate(reviewReadiness?.reviewUniverse?.requiredDataThroughDate ?? todayReview?.run?.sourceSnapshot?.reviewReadiness?.requiredDataThroughDate ?? null)}`} variant="outlined" />
                  <Chip label={`Stored data-through: ${formatDate(reviewReadiness?.reviewUniverse?.storedDataThroughDate ?? todayReview?.run?.sourceSnapshot?.reviewReadiness?.storedDataThroughDate ?? null)}`} variant="outlined" />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Market gate: ${formatStatus(research?.marketReadiness?.marketGate)}`} variant="outlined" />
                  <Chip label={`Market condition: ${formatStatus(research?.marketReadiness?.marketCondition)}`} variant="outlined" />
                  <Chip label={`Region context: ${formatStatus(marketContext?.regime?.regime)}`} variant="outlined" />
                  <Chip label={`Breadth: ${marketBreadth}`} variant="outlined" />
                </Stack>
                <Typography color="text.secondary">
                  {research?.marketReadiness?.headline || 'Use Today Review and readiness evidence to decide whether this scope is ready for deeper research.'}
                </Typography>
                <Alert severity="info">
                  Market context is region-level for this scope; asset-type specific context is still limited.
                </Alert>
                {topWarning ? (
                  <Alert severity={pulseState === 'REVIEW_BLOCKED' ? 'error' : 'warning'} icon={<WarningAmberIcon />}>
                    {topWarning}
                  </Alert>
                ) : (
                  <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                    No current blockers were reported by Today Review or review-readiness snapshots.
                  </Alert>
                )}
                <Button component={RouterLink} to={nextActionRoute} endIcon={<OpenInNewIcon />} sx={{ alignSelf: 'flex-start' }}>
                  {nextActionLabel}
                </Button>
              </>
            )}
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">High-Priority Review Candidates</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
                  {candidateGroupOrder.map((groupKey) => (
                    <Chip
                      key={groupKey}
                      label={`${candidateGroupLabels[groupKey]}: ${formatNumber(candidateSummaries[groupKey].count)}`}
                      variant="outlined"
                    />
                  ))}
                </Stack>
                <ToggleButtonGroup
                  value={candidateGroup}
                  exclusive
                  onChange={(_event, value: CandidateGroupKey | null) => {
                    if (value) setCandidateGroup(value);
                  }}
                  size="small"
                  sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                  {candidateGroupOrder.map((groupKey) => (
                    <ToggleButton key={groupKey} value={groupKey}>
                      {candidateGroupLabels[groupKey]} ({formatNumber(candidateSummaries[groupKey].count)})
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {dashboard.criticalLoading && <LinearProgress />}
                {!dashboard.criticalLoading && activeCandidateGroup.rows.length === 0 && (
                  <Alert severity="info">
                    No {activeCandidateGroup.label.toLowerCase()} rows are currently published for this scope. Open Today Review to inspect scan coverage and blocker reasons.
                  </Alert>
                )}
                {!dashboard.criticalLoading && activeCandidateGroup.rows.length > 0 && (
                  <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {activeCandidateGroup.rows.slice(0, 6).map((row, index) => (
                      <Box key={row.id}>
                        <ListItem disablePadding>
                          <ListItemButton component={RouterLink} to={row.targetRoute}>
                            <ListItemText
                              primary={`${row.symbol} - ${row.subLabel}`}
                              secondary={row.reasonSummary}
                              primaryTypographyProps={{ fontWeight: 700 }}
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < Math.min(activeCandidateGroup.rows.length, 6) - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                )}
                {dashboard.critical.researchOverview.error ? (
                  <Alert severity="warning">
                    Research priorities are unavailable as supporting context: {dashboard.critical.researchOverview.error}
                  </Alert>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Research Hub is supporting context only here. Today Review candidate groups are the source of truth for these lanes.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Watch And Blocked</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Watch only: ${formatNumber(todayReviewGroups.watchOnly.length)}`} variant="outlined" />
                  <Chip label={`Insufficient evidence: ${formatNumber(todayReviewGroups.insufficientData.length)}`} variant="outlined" />
                  <Chip label={`Unproven evidence: ${formatNumber(todayReviewGroups.unproven.length)}`} variant="outlined" />
                  <Chip label={`Blocked: ${formatNumber(todayReviewGroups.blocked.length)}`} variant="outlined" />
                </Stack>
                {dashboard.criticalLoading && <LinearProgress />}
                {!dashboard.criticalLoading && watchBlockedRows.length === 0 && (
                  <Alert severity="info">
                    No watch, insufficient, unproven, or blocked rows are published for this scope. Open Today Review for scan funnel details.
                  </Alert>
                )}
                {!dashboard.criticalLoading && watchBlockedRows.length > 0 && (
                  <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {watchBlockedRows.slice(0, 6).map(({ group, item }, index) => (
                      <Box key={`${group}-${item.id}`}>
                        <ListItem disablePadding>
                          <ListItemButton component={RouterLink} to="/today-review">
                            <ListItemText
                              primary={`${item.symbol} - ${group}`}
                              secondary={item.blockers[0] || item.watchReasons[0] || item.reasonSummary}
                              primaryTypographyProps={{ fontWeight: 700 }}
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < Math.min(watchBlockedRows.length, 6) - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Evidence Caveats</Typography>
                {(dashboard.deferredLoading || dashboard.criticalLoading) && <LinearProgress />}
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Review trust: ${formatStatus(reviewReadiness?.trustStatus)}`} variant="outlined" />
                  <Chip label={`Data quality: ${formatStatus(dataQualitySummary?.dataStatus)}`} variant="outlined" />
                  <Chip label={`Signal run: ${formatStatus(latestSignalRun?.status)}`} variant="outlined" />
                  <Chip label={`Pipeline: ${formatStatus(pipelineRun?.status)}`} variant="outlined" />
                  <Chip label="Market context: region-level" variant="outlined" />
                </Stack>
                {dashboard.deferred.dataQualitySummary.error && <Alert severity="warning">{dashboard.deferred.dataQualitySummary.error}</Alert>}
                {dashboard.deferred.latestSignalRun.error && <Alert severity="warning">{dashboard.deferred.latestSignalRun.error}</Alert>}
                {dashboard.deferred.pipelineStatus.error && <Alert severity="warning">{dashboard.deferred.pipelineStatus.error}</Alert>}
                {reviewReadiness?.blockers?.[0] && (
                  <Alert severity="warning">
                    {reviewReadiness.blockers[0].category}: {reviewReadiness.blockers[0].affectedCount} affected. {reviewReadiness.blockers[0].nextActionLabel}
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary">
                  Caveats are read-only snapshots from existing sources. Refresh refetches these reads without starting background workflows.
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Supporting Navigation</Typography>
                <Grid container spacing={1}>
                  {supportingRoutes.map((item) => (
                    <Grid key={item.label} item xs={12} sm={6}>
                      <Button
                        component={RouterLink}
                        to={item.to}
                        variant="outlined"
                        fullWidth
                        sx={{ justifyContent: 'space-between', textAlign: 'left', px: 1.5, py: 1.1 }}
                        endIcon={<OpenInNewIcon fontSize="small" />}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{item.label}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {item.context || 'Open details'}
                          </Typography>
                        </Box>
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="h6">Coming soon - Market Movers</Typography>
                <Typography color="text.secondary">
                  Placeholder only. No approved Daily Overview source exposes truthful mover rows for this scope yet.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="h6">Coming soon - FII/DII Activity</Typography>
                <Typography color="text.secondary">
                  Placeholder only. No approved read source exposes FII/DII activity for this dashboard slice yet.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

function mapTodayReviewRows(rows: TodayReviewCandidateGroupSet[CandidateGroupKey]): CandidateGroupSummary['rows'] {
  return rows.map((item) => ({
    id: item.id,
    symbol: item.symbol,
    reasonSummary: item.reasonSummary,
    subLabel: `${formatStateLabel(item.state)} - ${item.strategyCode}${item.strategyVersion ? ` v${item.strategyVersion}` : ''}`,
    targetRoute: '/today-review',
  }));
}

function formatSmartMoneyContext(summary: {
  accumulationCount?: number;
  distributionCount?: number;
} | null | undefined) {
  if (!summary) return null;
  return `Acc ${formatNumber(summary.accumulationCount)} / Dist ${formatNumber(summary.distributionCount)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return unavailableLabel;
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return unavailableLabel;
  return new Date(value).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return unavailableLabel;
  return new Intl.NumberFormat().format(value);
}

function formatStatus(value: string | null | undefined) {
  return value || unavailableLabel;
}

function formatRatio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (typeof numerator !== 'number' || Number.isNaN(numerator) || typeof denominator !== 'number' || Number.isNaN(denominator)) {
    return unavailableLabel;
  }
  return `${formatNumber(numerator)} / ${formatNumber(denominator)}`;
}

function formatStateLabel(value: string) {
  return value.replace(/_/g, ' ');
}
