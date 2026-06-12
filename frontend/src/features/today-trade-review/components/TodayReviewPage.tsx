import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { humanizeCode, humanizeEmbedded } from '@/shared/format/enumLabels';
import SignalTrackRecordPanel from '@/features/research-hub/components/SignalTrackRecordPanel';
import { useTodayReview } from '../hooks/useTodayReview';
import type {
  TodayReviewCandidate,
  TodayReviewCandidateDataQualitySnapshot,
  TodayReviewEarningsProximity,
  TodayReviewGroups,
  TodayReviewMarketPosture,
  TodayReviewRun,
  TodayReviewScanFunnel,
  TodayReviewSourceSnapshot,
} from '../types';

const groupTabs: Array<{ key: keyof TodayReviewGroups; label: string }> = [
  { key: 'longReview', label: 'Long Review' },
  { key: 'exitRiskReview', label: 'Exit Risk / Short Review' },
  { key: 'watchOnly', label: 'Watch Only' },
  { key: 'specialCases', label: 'Special Cases' },
  { key: 'blocked', label: 'Blocked' },
];

export function TodayReviewPage() {
  const { profile } = useMarketScope();
  const { data, loading, error, scope } = useTodayReview();
  const [tab, setTab] = useState<keyof TodayReviewGroups>('longReview');
  const run = data?.run || null;
  const groups = data?.groups || emptyGroups();
  const marketPosture = data?.marketPosture ?? null;
  const boardSelection = run ? sourceSnapshotForRun(run).boardSelection || null : null;
  const activeCandidates = candidatesForTab(groups, tab);
  const totals = useMemo(() => ({
    long: groups.longReview.length,
    exit: groups.exitRiskReview.length + groups.shortReview.length,
    watch: groups.watchOnly.length + groups.unproven.length + groups.insufficientData.length,
    special: groups.specialCases.length,
    blocked: groups.blocked.length + groups.avoid.length,
    strategyBacked: boardSelection?.strategyBackedCount || 0,
    lite: boardSelection?.liteCount || 0,
    suppressed: boardSelection?.suppressedCount || 0,
    warnings: run?.warnings.length || 0,
    missingTierContext: [
      ...groups.longReview,
      ...groups.shortReview,
      ...groups.exitRiskReview,
      ...groups.watchOnly,
      ...groups.specialCases,
      ...groups.blocked,
      ...groups.avoid,
      ...groups.insufficientData,
      ...groups.unproven,
    ].filter(hasMissingTierContext).length,
  }), [boardSelection, groups, run?.warnings.length]);

  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--workspace">
        <Stack spacing={3}>
          <PageHeader
            title="Today's Review"
            subtitle="Today's research candidates, ranked. Updated daily after market close."
            badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
          />
          <NotApplicableForAssetClass
            feature="Today Review"
            detail="Crypto coverage in this release is available on Market Scans and the Instrument workspace. This view will support crypto in a later update."
          />
        </Stack>
      </Box>
    );
  }

  // Derive posture strip text from run's persisted regime + marketPosture
  const sourceSnapshot = run ? sourceSnapshotForRun(run) : null;
  const runRegime: string | null = (sourceSnapshot as any)?.marketContext?.regime?.regime ?? null;
  const postureLabel = marketPosture?.availability === 'READY' && marketPosture.postureLabel
    ? marketPosture.postureLabel
    : null;
  const postureStripText = derivePostureStripText(runRegime, postureLabel);
  const dataThroughLabel = run?.dataThroughDate ? `Data through ${formatDate(run.dataThroughDate)}` : null;

  // Only show the compact warning line above the fold when run is genuinely degraded
  const showDegradedWarning = run && (run.status === 'PARTIAL' || run.status === 'FAILED');
  const degradedWarningText = showDegradedWarning
    ? (run.warnings[0] || `Review status: ${run.status} — some data may be incomplete.`)
    : null;

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={2}>
        <PageHeader
          title="Today's Review"
          subtitle="Today's research candidates, ranked. Updated daily after market close."
          badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
        />

        {loading && (
          <Alert severity="info" icon={<CircularProgress size={18} />}>
            Loading Today's Review for {scope.region} / {scope.assetType}.
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {!loading && !error && !run && (
          <Alert severity="info">
            No review data is available yet for {scope.region} / {scope.assetType}.
          </Alert>
        )}

        {run && (
          <>
            {/* A1: Market posture strip — answer-first, single line */}
            <PostureStrip
              text={postureStripText}
              dataThroughLabel={dataThroughLabel}
              runRegime={runRegime}
              postureLabel={postureLabel}
              totals={totals}
            />

            {/* Only show a compact degraded warning above the fold if genuinely broken */}
            {degradedWarningText && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                {degradedWarningText}
              </Alert>
            )}

            {/* A1: Candidate table immediately below posture strip */}
            <Card variant="outlined">
              <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                {groupTabs.map((item) => (
                  <Tab key={item.key} value={item.key} label={`${item.label} (${candidatesForTab(groups, item.key).length})`} />
                ))}
              </Tabs>
              <CardContent>
                {activeCandidates.length === 0 ? (
                  <EmptyTabState tab={tab} run={run} groups={groups} />
                ) : (
                  <CandidateTable candidates={activeCandidates} run={run} />
                )}
              </CardContent>
            </Card>

            {/* C1: Track record section */}
            <SignalTrackRecordPanel />

            {/* A1: Methodology / details accordion — collapsed by default */}
            <Accordion variant="outlined" disableGutters defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">How today's list was built</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <RunStatusPanel run={run} marketPosture={marketPosture} />
                  <CoveragePanel run={run} />
                  <BoardSelectionPanel run={run} />
                  <ExclusionReasonsPanel run={run} />
                  <Alert severity="info">
                    Signals and calibration are supporting evidence only. Review candidates require trusted price data, entry trigger context, exit/invalidation evidence, and data quality.
                  </Alert>
                  <Alert severity="info">
                    Data quality tiers shown here are context only and do not affect ranking or promotion.
                  </Alert>
                  {run.warnings.length > 0 && (
                    <Alert severity={run.status === 'PARTIAL' ? 'warning' : 'info'}>
                      {run.warnings.join(' ')}
                    </Alert>
                  )}
                  <Grid container spacing={2}>
                    <SummaryCard label="Long review candidates" value={totals.long} tone="success" />
                    <SummaryCard label="Exit-risk review candidates" value={totals.exit} tone="warning" />
                    <SummaryCard label="Watch only" value={totals.watch} tone="info" />
                    <SummaryCard label="Special cases" value={totals.special} tone="info" />
                    <SummaryCard label="Strategy-backed" value={totals.strategyBacked} tone="success" />
                    <SummaryCard label="Lite discovery" value={totals.lite} tone="default" />
                    <SummaryCard label="Suppressed" value={totals.suppressed} tone="warning" />
                    <SummaryCard label="Blocked" value={totals.blocked} tone="error" />
                    <SummaryCard label="Data gaps / warnings" value={totals.warnings} tone="default" />
                    <SummaryCard label="Missing DQ tier context" value={totals.missingTierContext} tone="warning" />
                  </Grid>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Stack>
    </Box>
  );
}

/** Derives a plain-English posture strip label from persisted regime + capital posture. */
function derivePostureStripText(regime: string | null, postureLabel: string | null): string {
  const label = postureLabel || regime;
  if (!label) return 'Market context unavailable';
  if (label === 'RISK_ON') return 'Risk-on — broad participation supported';
  if (label === 'RISK_OFF') return 'Risk-off — favor caution; selective entries only';
  if (label === 'NEUTRAL') return 'Neutral — selective participation';
  // Fallback: humanize whatever code we have
  return humanizeCode(label);
}

function PostureStrip({
  text,
  dataThroughLabel,
  runRegime,
  postureLabel,
  totals,
}: {
  text: string;
  dataThroughLabel: string | null;
  runRegime: string | null;
  postureLabel: string | null;
  totals: { long: number; watch: number; exit: number; blocked: number };
}) {
  const regimeOrPosture = postureLabel || runRegime;
  const chipColor = regimeOrPosture === 'RISK_ON' ? 'success' : regimeOrPosture === 'RISK_OFF' ? 'error' : regimeOrPosture ? 'warning' : 'default';

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" useFlexGap>
      <Chip
        label={text}
        color={chipColor as any}
        variant="filled"
        sx={{ fontWeight: 600, fontSize: 13 }}
      />
      {dataThroughLabel && (
        <Typography variant="body2" color="text.secondary">
          {dataThroughLabel}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">·</Typography>
      <Typography variant="body2" color="text.secondary">
        {totals.long} candidates · {totals.watch} watch · {totals.blocked} excluded
      </Typography>
    </Stack>
  );
}

/** Calm thin-day empty state — A4 */
function EmptyTabState({ tab, run, groups }: { tab: keyof TodayReviewGroups; run: TodayReviewRun; groups: TodayReviewGroups }) {
  const boardSelection = sourceSnapshotForRun(run).boardSelection || null;
  const eligibleCounts = boardSelection?.eligibleCounts || {};
  const sourceSnapshot = sourceSnapshotForRun(run);
  const runRegime: string | null = (sourceSnapshot as any).marketContext?.regime?.regime ?? null;
  const watchCount = groups.watchOnly.length + groups.unproven.length + groups.insufficientData.length;
  const scanFunnel: Partial<TodayReviewScanFunnel> = run.scanFunnel || sourceSnapshot.scanFunnel || {};

  if (tab === 'longReview') {
    const regimeIsQuiet = runRegime === 'RISK_OFF' || runRegime === 'NEUTRAL';
    if (regimeIsQuiet && watchCount > 0) {
      return (
        <Typography color="text.secondary">
          Quiet market — {watchCount} {watchCount === 1 ? 'name' : 'names'} worth watching, nothing high-conviction today.
        </Typography>
      );
    }
    const eligible = (eligibleCounts as any).LONG_REVIEW || 0;
    if (eligible > 0) {
      return (
        <Typography color="text.secondary">
          No long review candidates reached the board this session. {eligible} {eligible === 1 ? 'name was' : 'names were'} eligible but fell below the quota threshold.
        </Typography>
      );
    }
    const scanned = scanFunnel.trustedInstrumentsScanned ?? 0;
    const setupsFound = scanFunnel.setupsDetected ?? 0;
    return (
      <Typography color="text.secondary">
        No setups reached review today.{scanned > 0 ? ` Scanned ${formatNumber(scanned)} instruments — ${formatNumber(setupsFound)} ${setupsFound === 1 ? 'setup' : 'setups'} detected, none promoted.` : ''}
      </Typography>
    );
  }
  if (tab === 'watchOnly') {
    const eligible = (eligibleCounts as any).WATCH_ONLY || 0;
    return (
      <Typography color="text.secondary">
        {eligible > 0
          ? `No watch names on the board this session. ${eligible} ${eligible === 1 ? 'name was' : 'names were'} eligible.`
          : 'No names in the watch-only section for this session.'}
      </Typography>
    );
  }
  if (tab === 'exitRiskReview') {
    return (
      <Typography color="text.secondary">
        No exit-risk or short review names this session.
      </Typography>
    );
  }
  if (tab === 'specialCases') {
    return (
      <Typography color="text.secondary">
        No special cases this session.
      </Typography>
    );
  }
  return (
    <Typography color="text.secondary">
      No candidates in this section for the current session.
    </Typography>
  );
}

function RunStatusPanel({ run, marketPosture }: { run: TodayReviewRun | null; marketPosture: TodayReviewMarketPosture | null }) {
  if (!run) return null;
  const sourceSnapshot = sourceSnapshotForRun(run);
  const reviewReadiness = sourceSnapshot.reviewReadiness || {};
  const postureLabel = marketPosture?.availability === 'READY' && marketPosture.postureLabel
    ? marketPosture.postureLabel
    : null;
  const postureColor = postureLabel === 'RISK_ON' ? 'success' : postureLabel === 'RISK_OFF' ? 'error' : postureLabel ? 'warning' : 'default';
  const postureBandText = marketPosture?.suggestedExposureBand
    ? ` (${marketPosture.suggestedExposureBand.minPct}–${marketPosture.suggestedExposureBand.maxPct}%)`
    : '';
  const runRegime: string | null = (sourceSnapshot as any).marketContext?.regime?.regime ?? null;
  const regimeColor = runRegime === 'RISK_ON' ? 'success' : runRegime === 'RISK_OFF' ? 'error' : runRegime ? 'warning' : 'default';
  const runGeneratedAt = run.finishedAt || run.startedAt;
  const runGeneratedLabel = runGeneratedAt ? new Date(runGeneratedAt).toLocaleString() : null;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">Session status</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Chip label={`Status: ${run.status}`} color={run.status === 'COMPLETED' ? 'success' : run.status === 'PARTIAL' ? 'warning' : 'error'} />
            <Chip label={`Trust: ${run.trustStatus}`} color={run.trustStatus === 'OK' ? 'success' : run.trustStatus === 'FAILED' ? 'error' : 'warning'} variant="outlined" />
            <Chip label={`Market data trust: ${reviewReadiness.trustStatus || 'UNKNOWN'}`} variant="outlined" />
            {runRegime ? (
              <Tooltip
                title={`Regime (as of ${runGeneratedLabel ?? 'session'}): ${humanizeCode(runRegime)}. Captured when the session was generated — may differ from current live regime.`}
                arrow
              >
                <Chip
                  label={`Regime: ${humanizeCode(runRegime)}`}
                  color={regimeColor as any}
                  variant="filled"
                  size="small"
                />
              </Tooltip>
            ) : null}
            {marketPosture ? (
              <Tooltip title={marketPosture.availability !== 'READY' ? 'Capital posture data is unavailable for this session.' : `Suggested exposure band${postureBandText}`} arrow>
                <Chip
                  label={`Capital posture: ${postureLabel ?? 'Unavailable'}`}
                  color={postureColor as any}
                  variant="outlined"
                />
              </Tooltip>
            ) : null}
            <Typography variant="body2" color="text.secondary">Last updated: {formatDateTime(run.finishedAt || run.startedAt)}</Typography>
            <Typography variant="body2" color="text.secondary">Data through: {formatDate(run.dataThroughDate)}</Typography>
            <Typography variant="body2" color="text.secondary">Scope: {run.region} / {run.assetType}</Typography>
            <Typography variant="body2" color="text.secondary">Mode: {humanizeCode(coverageValue(run, 'mode'))}</Typography>
            <Typography variant="body2" color="text.secondary">Trusted universe: {formatNumber(Number(coverageValue(run, 'trustedCount') || 0))} / Catalog {formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}</Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CoveragePanel({ run }: { run: TodayReviewRun }) {
  const sourceSnapshot = sourceSnapshotForRun(run);
  const reviewUniverse = sourceSnapshot.reviewUniverse || {};
  const reviewReadiness = sourceSnapshot.reviewReadiness || {};
  const scanFunnel: Partial<TodayReviewScanFunnel> = run.scanFunnel || sourceSnapshot.scanFunnel || {};
  const warnings = run.coverageWarnings || reviewUniverse.warnings || [];
  const trustedLoadStatus = scanFunnel.trustedLoadStatus || (scanFunnel.scanComplete === false ? 'CONFIGURED_PARTIAL' : 'COMPLETE');
  const membershipFailureReason = scanFunnel.membershipLoadFailureReason;
  const reviewModeMismatch = Boolean(reviewReadiness.reviewMode && reviewReadiness.reviewMode !== coverageValue(run, 'mode'));
  const missingReadiness = !reviewReadiness.reviewMode;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Price data coverage</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Mode: ${humanizeCode(coverageValue(run, 'mode'))}`} color={coverageValue(run, 'mode') === 'FULL_REVIEW' ? 'success' : coverageValue(run, 'mode') === 'LIMITED_REVIEW' ? 'warning' : 'default'} />
            <Chip label={`Trusted: ${formatNumber(Number(coverageValue(run, 'trustedCount') || 0))}`} variant="outlined" />
            <Chip label={`Catalog: ${formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}`} variant="outlined" />
            <Chip label={`Session date: ${reviewUniverse.targetTradingDate || 'Unavailable'}`} variant="outlined" />
            <Chip label={`Data through: ${reviewUniverse.storedDataThroughDate || reviewUniverse.dataThroughDate || formatDate(run.dataThroughDate)}`} variant="outlined" />
          </Stack>
          {missingReadiness && (
            <Alert severity="warning">
              Some market context was unavailable when this list was built; a conservative view is shown.
            </Alert>
          )}
          {reviewModeMismatch && (
            <Alert severity="error">
              Today Review readiness mode does not match the market data summary.
            </Alert>
          )}
          {reviewReadiness.reviewMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              <Typography variant="caption">Market data mode: {humanizeCode(reviewReadiness.reviewMode)}</Typography>
              <Typography variant="caption">Trust status: {humanizeCode(reviewReadiness.trustStatus || 'UNKNOWN')}</Typography>
            </Stack>
          )}
          {coverageValue(run, 'mode') === 'LIMITED_REVIEW' && (
            <Alert severity="warning">
              Limited review mode: candidates are generated only from stocks with current price, enough price history, and recent volume. Missing sector/market-cap data is shown as context gaps.
            </Alert>
          )}
          {coverageValue(run, 'mode') === 'NO_REVIEW' && (
            <Alert severity="warning">
              No review mode: trusted price-action universe is unavailable. Review cannot publish candidates until price data is ready.
            </Alert>
          )}
          {trustedLoadStatus === 'LOAD_FAILED' && (
            <Alert severity="error">
              Price data universe unavailable. {membershipFailureReason || 'Review cannot publish candidates until the universe can be loaded reliably.'}
            </Alert>
          )}
          {trustedLoadStatus === 'CONFIGURED_PARTIAL' && (
            <Alert severity="warning">
              Partial scan: scanned {formatNumber(scanFunnel.trustedInstrumentsScanned)} of {formatNumber(scanFunnel.trustedUniverseCount)} instruments.
            </Alert>
          )}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
            <Typography variant="caption">Scanned: {formatNumber(scanFunnel.trustedInstrumentsScanned)}</Typography>
            <Typography variant="caption">Setups detected: {formatNumber(scanFunnel.setupsDetected)}</Typography>
            <Typography variant="caption">Promoted: {formatNumber(scanFunnel.promotedCandidates)}</Typography>
            <Typography variant="caption">Watch/unproven: {formatNumber((scanFunnel.watchOnly || 0) + (scanFunnel.unproven || 0))}</Typography>
            <Typography variant="caption">Blocked: {formatNumber(scanFunnel.blocked)}</Typography>
          </Stack>
          {warnings.slice(0, 3).map((warning: string, warningIndex: number) => (
            <Typography key={`warning-${warningIndex}-${warning}`} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ExclusionReasonsPanel({ run }: { run: TodayReviewRun }) {
  const explainability = run.explainability || sourceSnapshotForRun(run).explainability;
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
            <Typography color="text.secondary">No exclusion summary was stored for this session.</Typography>
          ) : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
              {summaries.slice(0, 8).map((summary: any) => (
                <Chip
                  key={`${summary.category}:${summary.code}`}
                  label={`${humanizeCode(summary.category)}: ${summary.count} - ${humanizeCode(summary.label)}`}
                  color={summary.blocking ? 'warning' : 'default'}
                  variant={summary.blocking ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          )}
          {examples.length > 0 && (
            <TableContainer>
              <Table size="small" aria-label="Excluded examples">
                <TableHead>
                  <TableRow>
                    <TableCell>Excluded example</TableCell>
                    <TableCell>Primary reason</TableCell>
                    <TableCell>Categories</TableCell>
                    <TableCell>Promoted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {examples.map((example: any) => (
                    <TableRow key={`${example.instrumentId}:${example.primaryReasonCode}`}>
                      <TableCell>
                        <Typography fontWeight={700}>{example.symbol}</Typography>
                        <Typography variant="caption" color="text.secondary">{example.companyName || example.instrumentId}</Typography>
                      </TableCell>
                      <TableCell>{humanizeCode(example.primaryReasonLabel)}</TableCell>
                      <TableCell>{(example.reasonCategories || []).map((c: string) => humanizeCode(c)).join(', ')}</TableCell>
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

function BoardSelectionPanel({ run }: { run: TodayReviewRun }) {
  const boardSelection = sourceSnapshotForRun(run).boardSelection || null;
  if (!boardSelection) {
    return (
      <Alert severity="info">
        List layout metadata is unavailable for this session. Older saved data uses state-based grouping.
      </Alert>
    );
  }
  const sections: Array<{ key: keyof typeof boardSelection.quotas; label: string }> = [
    { key: 'LONG_REVIEW', label: 'Long Review' },
    { key: 'WATCH_ONLY', label: 'Watch Only' },
    { key: 'EXIT_RISK', label: 'Exit / Short Risk' },
    { key: 'SPECIAL_CASES', label: 'Special Cases' },
  ];
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6">How today's list was built</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {sections.map((section) => (
              <Chip
                key={section.key}
                label={`${section.label}: ${boardSelection.displayedCounts[section.key] || 0}/${boardSelection.eligibleCounts[section.key] || 0} eligible; quota ${boardSelection.quotas[section.key] || 0}`}
                variant="outlined"
              />
            ))}
            <Chip label={`Strategy-backed: ${boardSelection.strategyBackedCount}`} color="success" variant="outlined" />
            <Chip label={`Lite: ${boardSelection.liteCount}`} variant="outlined" />
            <Chip label={`Suppressed: ${boardSelection.suppressedCount}`} color="warning" variant="outlined" />
          </Stack>
          {boardSelection.fillBackfillReasons.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {humanizeEmbedded(boardSelection.fillBackfillReasons.join(' '))}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// --- A3: Updated column definitions ---
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'rank'
  | 'symbol'
  | 'state'
  | 'setup'
  | 'board'
  | 'entry'
  | 'exit'
  | 'confidence'
  | 'grade'
  | 'dailyReview'
  | 'automation'
  | 'dataFreshness'
  | 'dataQuality'
  | 'proof'
  | 'market'
  | 'sector'
  | 'reason'
  | 'blocker';

interface CandidateColumn {
  id: SortKey;
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  primary?: boolean; // shown by default; false = in "More" secondary set
  value: (candidate: TodayReviewCandidate) => string | number;
  render: (candidate: TodayReviewCandidate) => ReactNode;
}

const todayReviewExportColumns: Array<{ label: string; value: (candidate: TodayReviewCandidate) => string | number | null | undefined }> = [
  { label: 'Rank', value: (candidate) => candidate.rank },
  { label: 'Symbol', value: (candidate) => candidate.symbol },
  { label: 'Company', value: (candidate) => candidate.companyName },
  { label: 'State', value: (candidate) => stateLabel(candidate.state) },
  { label: 'Setup', value: (candidate) => candidate.setupType || candidate.strategyCode },
  { label: 'Board Section', value: (candidate) => boardSectionLabel(candidate) },
  { label: 'Board Source', value: (candidate) => boardSourceLabel(candidate) },
  { label: 'Board Reason', value: (candidate) => humanizeEmbedded(candidate.boardReason) },
  { label: 'Entry Evidence', value: (candidate) => formatEntry(candidate.tradePlanSnapshot as any) },
  { label: 'Confidence', value: (candidate) => confidenceDisplay(candidate).label },
  { label: 'Grade', value: (candidate) => candidate.grade },
  { label: 'Daily Tier', value: (candidate) => tierContextForCandidate(candidate).dailyReview.status },
  { label: 'Data Through', value: (candidate) => latestDataDate(candidate) },
  { label: 'Data Quality', value: dataQualityLabel },
  { label: 'Reason Summary', value: (candidate) => safeReviewText(candidate.reasonSummary) },
  { label: 'Blocker', value: (candidate) => safeReviewText(blockerLabel(candidate)) },
  { label: 'Strategy Code', value: (candidate) => candidate.strategyCode },
];

function csvCell(value: string | number | null | undefined): string {
  const text = typeof value === 'number' ? String(value) : String(value ?? '').replace(/^[=+@-]/, "'$&");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTodayReviewCsv(rows: TodayReviewCandidate[], tabLabel: string) {
  const header = todayReviewExportColumns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((candidate) => todayReviewExportColumns.map((column) => csvCell(column.value(candidate))).join(',')).join('\r\n');
  const csv = `﻿${header}\r\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const tabSlug = tabLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'candidates';
  link.href = url;
  link.download = `today-review-${tabSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function CandidateTable({ candidates, run }: { candidates: TodayReviewCandidate[]; run: TodayReviewRun | null }) {
  const navigate = useNavigate();
  const runRegime: string | null = run ? ((sourceSnapshotForRun(run) as any).marketContext?.regime?.regime ?? null) : null;
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [readinessFilter, setReadinessFilter] = useState('ALL');
  const [dataQualityFilter, setDataQualityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecondaryColumns, setShowSecondaryColumns] = useState(false);
  const candidateKey = useMemo(() => candidates.map((candidate) => candidate.id).join('|'), [candidates]);

  useEffect(() => {
    setPage(0);
  }, [candidateKey]);

  const filterOptions = useMemo(() => {
    const grades = Array.from(new Set(candidates.map((candidate) => candidate.grade))).sort();
    const dataQuality = Array.from(new Set(candidates.map((candidate) => dataQualityLabel(candidate)))).sort();
    return { grades, dataQuality };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const context = tierContextForCandidate(candidate);
      const matchesQuery = !normalizedQuery || searchableCandidateText(candidate).includes(normalizedQuery);
      const matchesGrade = gradeFilter === 'ALL' || candidate.grade === gradeFilter;
      const matchesReadiness = readinessFilter === 'ALL' || context.dailyReview.status === readinessFilter;
      const matchesDataQuality = dataQualityFilter === 'ALL' || dataQualityLabel(candidate) === dataQualityFilter;
      return matchesQuery && matchesGrade && matchesReadiness && matchesDataQuality;
    });
  }, [candidates, dataQualityFilter, gradeFilter, query, readinessFilter]);

  // A3: primary columns (answer-first) + secondary ("More") columns
  const allColumns = useMemo<CandidateColumn[]>(() => [
    // --- Primary columns ---
    {
      id: 'rank',
      label: 'Rank',
      width: 72,
      align: 'right',
      primary: true,
      value: (candidate) => candidate.rank,
      render: (candidate) => <EllipsisCell fullText={String(candidate.rank)} align="right" strong />,
    },
    {
      id: 'symbol',
      label: 'Symbol / Company',
      width: 190,
      primary: true,
      value: (candidate) => `${candidate.symbol} ${candidate.companyName || ''}`,
      render: (candidate) => (
        <Stack spacing={0.5} alignItems="flex-start">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={`${candidate.symbol} - ${candidate.companyName || 'Company unavailable'}`} arrow enterDelay={350}>
              <Link
                component={RouterLink}
                to={`/today-review/candidates/${candidate.id}`}
                fontWeight={700}
                onClick={(event) => event.stopPropagation()}
                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {candidate.symbol}
              </Link>
            </Tooltip>
            {candidate.instrumentId && (
              <Tooltip title="Open stock workspace" arrow enterDelay={200}>
                <Link
                  component={RouterLink}
                  to={`/stocks/${candidate.instrumentId}`}
                  onClick={(event) => event.stopPropagation()}
                  sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                  <OpenInNewIcon sx={{ fontSize: 13 }} />
                </Link>
              </Tooltip>
            )}
          </Stack>
          {candidate.companyName && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {candidate.companyName}
            </Typography>
          )}
          <EarningsProximityChip earningsProximity={candidate.earningsProximity} />
          <FnoBanChip inFnoBan={candidate.inFnoBan} />
          <SmartMoneyChip status={candidate.smartMoneyStatus} score={candidate.smartMoneyScore} />
          <RangePositionIndicator candidate={candidate} />
        </Stack>
      ),
    },
    {
      id: 'state',
      label: 'Direction / State',
      width: 140,
      primary: true,
      value: (candidate) => stateLabel(candidate.state),
      render: (candidate) => <EllipsisCell fullText={stateLabel(candidate.state)} />,
    },
    {
      id: 'confidence',
      label: 'Score',
      width: 100,
      align: 'right',
      primary: true,
      value: (candidate) => Number(candidate.confidenceScore || 0),
      render: (candidate) => {
        const confidence = confidenceDisplay(candidate);
        return <EllipsisCell fullText={confidence.note ? `${confidence.label} - ${confidence.note}` : confidence.label} align="right" strong />;
      },
    },
    {
      id: 'reason',
      label: 'Why',
      width: 280,
      primary: true,
      value: (candidate) => safeReviewText(candidate.reasonSummary),
      render: (candidate) => (
        <Tooltip title={safeReviewText(candidate.reasonSummary)} arrow enterDelay={200} placement="top">
          <Typography
            component="span"
            sx={{ display: 'block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'inherit' }}
          >
            {safeReviewText(candidate.reasonSummary) || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'entry',
      label: 'Entry zone',
      width: 190,
      primary: true,
      value: (candidate) => formatEntry(candidate.tradePlanSnapshot as any),
      render: (candidate) => <EllipsisCell fullText={formatEntry(candidate.tradePlanSnapshot as any)} />,
    },
    {
      id: 'exit',
      label: 'Invalidation',
      width: 240,
      primary: true,
      value: (candidate) => formatStop(candidate.tradePlanSnapshot as any, candidate),
      render: (candidate) => <EllipsisCell fullText={formatStop(candidate.tradePlanSnapshot as any, candidate)} />,
    },
    {
      id: 'sector',
      label: 'Sector',
      width: 200,
      primary: true,
      value: sectorAlignment,
      render: (candidate) => <SectorCell candidate={candidate} />,
    },
    {
      id: 'market',
      label: 'Regime',
      width: 120,
      primary: true,
      value: (candidate) => marketLabel(candidate, runRegime),
      render: (candidate) => <EllipsisCell fullText={marketLabel(candidate, runRegime)} />,
    },

    // --- Secondary (operator / "More") columns ---
    {
      id: 'setup',
      label: 'Setup',
      width: 170,
      primary: false,
      value: (candidate) => humanizeCode(candidate.setupType || candidate.strategyCode),
      render: (candidate) => <EllipsisCell fullText={humanizeCode(candidate.setupType || candidate.strategyCode)} />,
    },
    {
      id: 'board',
      label: 'Source',
      width: 230,
      primary: false,
      value: (candidate) => `${boardSectionLabel(candidate)} ${boardSourceLabel(candidate)} ${humanizeEmbedded(candidate.boardReason) || ''}`,
      render: (candidate) => <EllipsisCell fullText={`${boardSectionLabel(candidate)} / ${boardSourceLabel(candidate)} - ${humanizeEmbedded(candidate.boardReason) || 'Standard selection.'}`} />,
    },
    {
      id: 'grade',
      label: 'Grade',
      width: 104,
      primary: false,
      value: (candidate) => gradeSortValue(candidate.grade),
      render: (candidate) => <Chip label={candidate.grade} size="small" color={gradeColor(candidate.grade) as any} sx={chipNoWrapSx} />,
    },
    {
      id: 'dailyReview',
      label: 'Daily tier',
      width: 150,
      primary: false,
      value: (candidate) => tierContextForCandidate(candidate).dailyReview.status,
      render: (candidate) => {
        const tier = tierContextForCandidate(candidate).dailyReview;
        return <TierChip tier={tier} />;
      },
    },
    {
      id: 'automation',
      label: 'Automation',
      width: 150,
      primary: false,
      value: (candidate) => tierContextForCandidate(candidate).automation.status,
      render: (candidate) => {
        const tier = tierContextForCandidate(candidate).automation;
        return <TierChip tier={tier} />;
      },
    },
    {
      id: 'dataFreshness',
      label: 'Data through',
      width: 140,
      primary: false,
      value: (candidate) => latestDataDate(candidate),
      render: (candidate) => <EllipsisCell fullText={formatDate(latestDataDate(candidate))} />,
    },
    {
      id: 'dataQuality',
      label: 'DQ',
      width: 150,
      primary: false,
      value: dataQualityLabel,
      render: (candidate) => <EllipsisCell fullText={dataQualityLabel(candidate)} />,
    },
    {
      id: 'proof',
      label: 'Proof',
      width: 130,
      primary: false,
      value: proofLabel,
      render: (candidate) => <EllipsisCell fullText={proofLabel(candidate)} />,
    },
    {
      id: 'blocker',
      label: 'Blocker',
      width: 300,
      primary: false,
      value: (candidate) => safeReviewText(blockerLabel(candidate)),
      render: (candidate) => <EllipsisCell fullText={safeReviewText(blockerLabel(candidate))} />,
    },
  ], [runRegime]);

  const columns = useMemo(
    () => allColumns.filter((col) => col.primary || showSecondaryColumns),
    [allColumns, showSecondaryColumns]
  );

  const tableMinWidth = useMemo(() => columns.reduce((total, column) => total + column.width, 0), [columns]);

  const sortedCandidates = useMemo(() => {
    const column = allColumns.find((item) => item.id === sortBy) || allColumns[0];
    return [...filteredCandidates].sort((a, b) => compareValues(column.value(a), column.value(b), sortDirection));
  }, [allColumns, filteredCandidates, sortBy, sortDirection]);

  const pagedCandidates = useMemo(() => {
    const start = page * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [page, pageSize, sortedCandidates]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredCandidates.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredCandidates.length, page, pageSize]);

  const hasFilters = Boolean(query || gradeFilter !== 'ALL' || readinessFilter !== 'ALL' || dataQualityFilter !== 'ALL');

  const handleSort = (columnId: SortKey) => {
    setPage(0);
    if (sortBy === columnId) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(columnId);
    setSortDirection(columnId === 'rank' ? 'asc' : 'desc');
  };

  const clearFilters = () => {
    setQuery('');
    setGradeFilter('ALL');
    setReadinessFilter('ALL');
    setDataQualityFilter('ALL');
    setPage(0);
    setActionMessage(null);
  };

  const exportTable = () => {
    downloadTodayReviewCsv(sortedCandidates, 'current-table');
    setActionMessage(`Exported ${sortedCandidates.length} rows as CSV.`);
  };

  const missingTierCount = useMemo(() => candidates.filter(hasMissingTierContext).length, [candidates]);

  return (
    <Stack spacing={1.5}>
      {actionMessage && <Alert severity="success">{actionMessage}</Alert>}
      {missingTierCount > 0 && (
        <Alert severity="info">
          {missingTierCount} of {candidates.length} candidates in this view are missing data-quality tier context — read their confidence scores with that caveat. This is a data-pipeline limitation, not a per-stock judgement, and does not affect ranking.
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.2fr) repeat(3, minmax(150px, 0.55fr)) auto auto auto' },
          gap: 1.25,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Search rows"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small">
          <InputLabel id="today-review-grade-filter-label">Grade</InputLabel>
          <Select
            labelId="today-review-grade-filter-label"
            value={gradeFilter}
            label="Grade"
            onChange={(event) => {
              setGradeFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All grades</MenuItem>
            {filterOptions.grades.map((grade) => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="today-review-readiness-filter-label">Daily tier</InputLabel>
          <Select
            labelId="today-review-readiness-filter-label"
            value={readinessFilter}
            label="Daily tier"
            onChange={(event) => {
              setReadinessFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All daily tiers</MenuItem>
            <MenuItem value="READY">READY</MenuItem>
            <MenuItem value="LIMITED">LIMITED</MenuItem>
            <MenuItem value="BLOCKED">BLOCKED</MenuItem>
            <MenuItem value="MISSING">MISSING</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="today-review-dq-filter-label">Data quality</InputLabel>
          <Select
            labelId="today-review-dq-filter-label"
            value={dataQualityFilter}
            label="Data quality"
            onChange={(event) => {
              setDataQualityFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All DQ states</MenuItem>
            {filterOptions.dataQuality.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Clear filters" arrow>
          <span>
            <IconButton
              aria-label="Clear table filters"
              onClick={clearFilters}
              disabled={!hasFilters}
              size="small"
              sx={{ justifySelf: { xs: 'start', md: 'end' } }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          variant={showSecondaryColumns ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setShowSecondaryColumns((prev) => !prev)}
          sx={{ justifySelf: { xs: 'start', md: 'end' }, whiteSpace: 'nowrap' }}
        >
          {showSecondaryColumns ? 'Fewer columns' : 'More columns'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportTable}
          disabled={sortedCandidates.length === 0}
          sx={{ justifySelf: { xs: 'start', md: 'end' }, whiteSpace: 'nowrap' }}
        >
          Export CSV
        </Button>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Showing {filteredCandidates.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click any row to open detail. Hover clipped cells for full text.
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          maxHeight: 620,
          overflowX: 'auto',
          '& .MuiTableCell-root': {
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Table
          stickyHeader
          size="small"
          aria-label="Today review candidates"
          sx={{
            tableLayout: 'fixed',
            minWidth: tableMinWidth,
            '& .MuiTableCell-head': {
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.2,
              py: 1,
            },
            '& .MuiTableCell-body': {
              fontSize: 13,
              py: 0.85,
              verticalAlign: 'middle',
            },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align} sx={{ width: column.width }}>
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortDirection : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No candidates match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : pagedCandidates.map((candidate) => (
              <TableRow
                key={candidate.id}
                hover
                onClick={() => navigate(`/today-review/candidates/${candidate.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>{column.render(candidate)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredCandidates.length}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '.MuiTablePagination-toolbar': {
            minHeight: 44,
          },
        }}
      />
    </Stack>
  );
}

const chipNoWrapSx = {
  maxWidth: '100%',
  '& .MuiChip-label': {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

function EllipsisCell({
  fullText,
  children,
  align,
  strong = false,
}: {
  fullText: string;
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  strong?: boolean;
}) {
  const text = fullText || '-';
  const isAbsent = text === '—';
  const tooltipTitle = isAbsent ? 'not available' : text !== '-' ? text : '';
  return (
    <Tooltip title={tooltipTitle} arrow enterDelay={350}>
      <Typography
        component="span"
        color={isAbsent ? 'text.disabled' : 'inherit'}
        sx={{
          display: 'block',
          maxWidth: '100%',
          overflow: 'hidden',
          textAlign: align,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: strong ? 700 : 400,
        }}
      >
        {children ?? text}
      </Typography>
    </Tooltip>
  );
}

function TierChip({ tier }: { tier: TierCellContext }) {
  const isAbsent = tier.label === '—';
  const title = isAbsent
    ? 'not available'
    : tier.reason
      ? `${tier.label} - ${tier.reason}`
      : tier.label;
  return (
    <Tooltip title={title} arrow enterDelay={350}>
      <span>
        <Chip
          size="small"
          label={tier.label}
          color={isAbsent ? 'default' : tierColor(tier.status)}
          variant={tier.status === 'READY' ? 'outlined' : 'filled'}
          sx={chipNoWrapSx}
        />
      </span>
    </Tooltip>
  );
}

/**
 * Small amber chip shown on candidate list rows when results are within the
 * earnings-blackout window. Only renders when structured earningsProximity is present.
 */
function EarningsProximityChip({ earningsProximity }: { earningsProximity?: TodayReviewEarningsProximity | null }) {
  if (!earningsProximity || earningsProximity.daysToResult === null) return null;
  const days = earningsProximity.daysToResult;
  const label = days === 0 ? 'Earnings today' : days === 1 ? 'Earnings in 1d' : `Earnings in ${days}d`;
  const dateStr = earningsProximity.resultDate ? earningsProximity.resultDate.slice(0, 10) : null;
  const sourceLabel = earningsProximity.resultDateLabel ?? (earningsProximity.resultDateSource === 'OFFICIAL_CALENDAR' ? 'Official' : 'Estimated');
  const tooltip = dateStr
    ? `${label} (${dateStr}) [${sourceLabel}] — earnings reaction window. Consider waiting for post-result price discovery.`
    : `${label} [${sourceLabel}] — earnings reaction window. Consider waiting for post-result price discovery.`;
  return (
    <Tooltip title={tooltip} arrow enterDelay={200}>
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-100: Small amber "F&O Ban" chip — shown only when inFnoBan is true.
 * Derivatives trading is restricted for this symbol (OI > 95% MWPL).
 */
function FnoBanChip({ inFnoBan }: { inFnoBan?: boolean }) {
  if (!inFnoBan) return null;
  return (
    <Tooltip
      title="F&O ban: this symbol's derivatives open-interest has crossed 95% of the market-wide position limit. New F&O positions are restricted until OI drops below the threshold — elevated derivatives risk."
      arrow
      enterDelay={200}
    >
      <Chip
        label="F&O Ban"
        size="small"
        sx={{
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-101: Small chip showing the smart-money accumulation/distribution status.
 * Green for ACCUMULATION, red for DISTRIBUTION.
 */
function SmartMoneyChip({ status, score }: { status?: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' | null; score?: number | null }) {
  if (!status) return null;
  const label = status === 'ACCUMULATION' ? 'Accumulation' : status === 'DISTRIBUTION' ? 'Distribution' : 'Neutral';
  const scoreText = typeof score === 'number' ? ` (${score})` : '';
  const tooltipText = `Smart-money: ${label}${scoreText} — derived from price-volume analysis of the latest 3-month snapshot. Research-support context only.`;
  const bgColor = status === 'ACCUMULATION' ? 'success.main' : status === 'DISTRIBUTION' ? 'error.main' : 'text.secondary';
  return (
    <Tooltip title={tooltipText} arrow enterDelay={200}>
      <Chip
        label={`SM: ${label}${scoreText}`}
        size="small"
        sx={{
          bgcolor: bgColor,
          color: '#fff',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-85 / NR-95: Reads 52-week range position.
 */
function range52wFromCandidate(candidate: TodayReviewCandidate): { positionPct: number; high: number; low: number; current: number } | null {
  if (
    typeof candidate.range52wPositionPct === 'number' &&
    typeof candidate.range52wHigh === 'number' &&
    typeof candidate.range52wLow === 'number' &&
    typeof candidate.range52wCurrentClose === 'number'
  ) {
    return {
      positionPct: candidate.range52wPositionPct,
      high: candidate.range52wHigh,
      low: candidate.range52wLow,
      current: candidate.range52wCurrentClose,
    };
  }
  const signal = candidate.sourceSignalSnapshot as any;
  const pb = signal?.priceBehaviour;
  if (!pb) return null;
  const positionPct = typeof pb.price52wPositionPct === 'number' ? pb.price52wPositionPct : null;
  const high = typeof pb.price52wHigh === 'number' ? pb.price52wHigh : null;
  const low = typeof pb.price52wLow === 'number' ? pb.price52wLow : null;
  const current = typeof pb.price52wCurrentClose === 'number' ? pb.price52wCurrentClose : null;
  if (positionPct === null || high === null || low === null || current === null) return null;
  return { positionPct, high, low, current };
}

/**
 * NR-85: Small inline 52-week range position indicator shown below the symbol.
 */
function RangePositionIndicator({ candidate }: { candidate: TodayReviewCandidate }) {
  const range = range52wFromCandidate(candidate);
  if (!range) {
    return (
      <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: 10, lineHeight: 1 }}>
        52w —
      </Typography>
    );
  }
  const pct = Math.max(0, Math.min(100, range.positionPct));
  const barColor = pct >= 70 ? '#2e7d32' : pct >= 35 ? '#ed6c02' : '#d32f2f';
  const tooltipText = `52w range: low ${range.low.toFixed(2)} – high ${range.high.toFixed(2)} · current ${range.current.toFixed(2)} · ${pct.toFixed(1)}% above 52w low`;
  return (
    <Tooltip title={tooltipText} arrow enterDelay={200}>
      <Box sx={{ width: 110, userSelect: 'none' }}>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, display: 'block' }}>
          {pct.toFixed(1)}% of 52w range
        </Typography>
        <Box sx={{ height: 3, borderRadius: 1.5, bgcolor: 'action.disabledBackground', mt: 0.25, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, bgcolor: barColor, borderRadius: 1.5, transition: 'width 0.2s' }} />
        </Box>
      </Box>
    </Tooltip>
  );
}

type SectorLeadershipStatus = 'LEADING' | 'IMPROVING' | 'NEUTRAL' | 'WEAKENING' | 'LAGGING';

function sectorLeadershipColor(status: SectorLeadershipStatus | null): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'LEADING' || status === 'IMPROVING') return 'success';
  if (status === 'WEAKENING' || status === 'LAGGING') return 'error';
  return 'default';
}

function SectorCell({ candidate }: { candidate: TodayReviewCandidate }) {
  const sector = sectorAlignment(candidate);
  const market = candidate.marketContextSnapshot as any;
  const leadership: SectorLeadershipStatus | null = market?.sectorLeadershipStatus ?? null;
  if (sector === '—') {
    return <EllipsisCell fullText="—" />;
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
      <Tooltip title={sector} arrow enterDelay={350}>
        <Typography
          component="span"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'inherit', flexShrink: 1 }}
        >
          {sector}
        </Typography>
      </Tooltip>
      {leadership ? (
        <Tooltip title={`Sector leadership: ${humanizeCode(leadership)}`} arrow enterDelay={200}>
          <Chip
            label={humanizeCode(leadership)}
            size="small"
            color={sectorLeadershipColor(leadership)}
            variant="outlined"
            sx={{ ...chipNoWrapSx, flexShrink: 0, fontSize: 10, height: 18, '& .MuiChip-label': { px: 0.5 } }}
          />
        </Tooltip>
      ) : null}
    </Stack>
  );
}

function searchableCandidateText(candidate: TodayReviewCandidate) {
  const context = tierContextForCandidate(candidate);
  const plan = candidate.tradePlanSnapshot as any;
  const ep = candidate.earningsProximity;
  return [
    candidate.symbol,
    candidate.companyName,
    candidate.state,
    stateLabel(candidate.state),
    candidate.setupType,
    candidate.strategyCode,
    candidate.strategyVersion,
    boardSectionLabel(candidate),
    boardSourceLabel(candidate),
    candidate.boardReason,
    candidate.grade,
    candidate.reasonSummary,
    candidate.blockers.join(' '),
    candidate.watchReasons.join(' '),
    formatEntry(plan),
    formatStop(plan, candidate),
    context.dailyReview.label,
    context.dailyReview.reason,
    context.automation.label,
    context.automation.reason,
    dataQualityLabel(candidate),
    proofLabel(candidate),
    marketLabel(candidate),
    sectorAlignment(candidate),
    ep ? `earnings ${ep.daysToResult}d` : null,
  ].filter(Boolean).join(' ').toLowerCase();
}

function compareValues(a: string | number, b: string | number, direction: SortDirection) {
  const modifier = direction === 'asc' ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * modifier;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * modifier;
}

function gradeSortValue(grade: string) {
  const order: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, UNPROVEN: 5 };
  return order[grade] ?? 99;
}

function latestDataDate(candidate: TodayReviewCandidate) {
  const plan = candidate.tradePlanSnapshot as any;
  return plan?.marketDataSnapshot?.latestStoredTradingDate || plan?.latestPriceTimestamp || '';
}

function dataQualityLabel(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  return dq?.coverageStatus || dq?.signalReadinessStatus || '—';
}

function proofLabel(candidate: TodayReviewCandidate) {
  const plan = candidate.tradePlanSnapshot as any;
  const proof = candidate.strategyProofSnapshot as any;
  return proof?.strategyRating?.ratingGrade || plan?.strategyRating || '—';
}

function marketLabel(candidate: TodayReviewCandidate, runRegime?: string | null) {
  const market = candidate.marketContextSnapshot as any;
  const regime = market?.regime?.regime || runRegime || null;
  return regime ? humanizeCode(regime) : '—';
}

function blockerLabel(candidate: TodayReviewCandidate) {
  return tierContextForCandidate(candidate).blocker || candidate.blockers[0] || '-';
}

type TierStatus = 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';

interface TierCellContext {
  status: TierStatus;
  label: string;
  reason: string | null;
}

interface CandidateTierContext {
  dailyReview: TierCellContext;
  automation: TierCellContext;
  blocker: string | null;
}

function sourceSnapshotForRun(run: TodayReviewRun): TodayReviewSourceSnapshot {
  return (run.sourceSnapshot || {}) as TodayReviewSourceSnapshot;
}

function tierContextForCandidate(candidate: TodayReviewCandidate): CandidateTierContext {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  const tiers = dq?.useCaseTiers;
  const dailyReview = tiers?.dailyReview;
  const automation = tiers?.automation;

  const dailyReviewStatus: TierStatus = dailyReview?.status || 'MISSING';
  const automationStatus: TierStatus = automation ? 'BLOCKED' : 'MISSING';
  const missingTierBlocker = 'Data quality tier context is missing; confidence is shown conservatively.';
  const upstreamAutomationStatus = automation?.status || null;

  return {
    dailyReview: {
      status: dailyReviewStatus,
      label: dailyReview ? `Daily: ${dailyReview.status}` : '—',
      reason: dailyReview?.reasons?.[0] || (dailyReview ? null : 'Daily review tier not available for this session.'),
    },
    automation: {
      status: automationStatus,
      label: automation ? 'Automation: BLOCKED' : '—',
      reason: !automation
        ? 'Automation tier not available; trading is not enabled.'
        : upstreamAutomationStatus !== 'BLOCKED'
          ? `Upstream tier reported ${upstreamAutomationStatus}; automated trading is not enabled in this phase.`
          : automation.reasons?.[0] || 'Automated trading is not enabled.',
    },
    blocker: !tiers
      ? missingTierBlocker
      : dailyReviewStatus === 'LIMITED' || dailyReviewStatus === 'BLOCKED'
        ? dailyReview?.reasons?.[0] || `Daily review tier is ${dailyReviewStatus}.`
        : null,
  };
}

function confidenceDisplay(candidate: TodayReviewCandidate) {
  // Show the real per-stock score. The data-quality tier-context caveat is a
  // pipeline-wide condition surfaced once as a banner — not a fake per-row
  // "(from N)" penalty repeated identically on every row (G-IN1).
  const score = Number(candidate.confidenceScore || 0);
  return { label: String(score), note: null as string | null };
}

function candidatesForTab(groups: TodayReviewGroups, tab: keyof TodayReviewGroups) {
  if (tab === 'exitRiskReview') return [...groups.exitRiskReview, ...groups.shortReview];
  if (tab === 'watchOnly') return [...groups.watchOnly, ...groups.unproven, ...groups.insufficientData];
  if (tab === 'specialCases') return groups.specialCases;
  if (tab === 'blocked') return [...groups.blocked, ...groups.avoid];
  return groups[tab] || [];
}

function emptyGroups(): TodayReviewGroups {
  return {
    longReview: [],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    specialCases: [],
    blocked: [],
    avoid: [],
    insufficientData: [],
    unproven: [],
  };
}

function stateLabel(state: string) {
  return state.toLowerCase().split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

function boardSectionLabel(candidate: TodayReviewCandidate) {
  return candidate.boardSection ? stateLabel(candidate.boardSection) : 'Legacy';
}

function boardSourceLabel(candidate: TodayReviewCandidate) {
  if (!candidate.boardSourceType) return 'Unknown source';
  if (candidate.boardSourceType === 'STRATEGY_BACKED') return 'Strategy-backed';
  if (candidate.boardSourceType === 'LITE') return 'Lite';
  if (candidate.boardSourceType === 'MIXED') return 'Mixed';
  return 'Other';
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
  const reviewUniverse = sourceSnapshotForRun(run).reviewUniverse || {};
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
  if (candidate?.blockers?.[0]) return safeReviewText(candidate.blockers[0]);
  if (!plan?.stopLoss) return 'Unavailable';
  const stopPrice = Number(plan.stopLoss.price);
  const entryRef = Number(plan.entryZone?.preferredEntryMin || plan.entryZone?.preferredEntryMax || 0);
  const stopText = formatCurrency(stopPrice);
  const ruleText = safeReviewText(plan.invalidationRules?.[0] || 'Invalidation unavailable');
  const isLong = !candidate?.direction || candidate.direction === 'LONG' || String(candidate?.state ?? '').includes('LONG');
  const isShort = candidate?.direction === 'SHORT' || String(candidate?.state ?? '').includes('SHORT');
  const suspectStop =
    (isLong && entryRef > 0 && stopPrice > 0 && stopPrice < entryRef * 0.6) ||
    (isShort && entryRef > 0 && stopPrice > 0 && stopPrice > entryRef * 1.4);
  const warning = suspectStop ? ' ⚠ Possible unadjusted stop — verify' : '';
  return `${stopText}; ${ruleText}${warning}`;
}

function gradeColor(grade: string) {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'primary';
  if (grade === 'C' || grade === 'UNPROVEN') return 'warning';
  return 'error';
}

function sectorAlignment(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  const signal = candidate.sourceSignalSnapshot as any;
  const sector = candidate.catalogSector
    || dq?.sector
    || signal?.rawSignal?.sector
    || signal?.priceBehaviour?.sector
    || null;
  return sector ? humanizeCode(sector) : '—';
}

function hasMissingTierContext(candidate: TodayReviewCandidate) {
  const dq = candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null;
  return !dq?.useCaseTiers?.dailyReview || !dq?.useCaseTiers?.automation;
}

function tierColor(status: TierStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'READY') return 'success';
  if (status === 'LIMITED') return 'warning';
  if (status === 'BLOCKED' || status === 'MISSING') return 'error';
  return 'default';
}

function safeReviewText(value: string) {
  return String(value || '')
    .replace(/PAPER_TEST_CANDIDATE/g, 'RESEARCH_REVIEW_CANDIDATE')
    .replace(/READY_FOR_PAPER_REVIEW/g, 'RESEARCH_REVIEW_READY')
    .replace(/Trade-plan proof-chain snapshot supports paper-review research\./gi, 'Exit and invalidation evidence is available for research review.')
    .replace(/Paper review readiness is BLOCKED by the trade-plan snapshot\./gi, 'Exit/invalidation evidence is BLOCKED by the risk snapshot.')
    .replace(/Reward\/risk is below the paper review threshold\./gi, 'Exit/invalidation evidence is incomplete for research review.')
    .replace(/Reward\/risk is incomplete for paper review\./gi, 'Exit/invalidation evidence is incomplete for research review.')
    .replace(/Trade-plan snapshot/gi, 'Exit/invalidation evidence snapshot')
    .replace(/Trade plan has active blockers/gi, 'Exit/invalidation evidence has active blockers')
    .replace(/Trade plan status/gi, 'Risk snapshot status')
    .replace(/Trade plan/gi, 'Risk evidence')
    .replace(/trade plan/gi, 'risk evidence')
    .replace(/trade-plan/gi, 'risk-evidence')
    .replace(/Stop loss/gi, 'Invalidation level')
    .replace(/stop loss/gi, 'invalidation level')
    .replace(/stop level/gi, 'invalidation level')
    .replace(/paper-readiness/gi, 'research-readiness')
    .replace(/paper review/gi, 'research review')
    .replace(/paper-review/gi, 'research-review')
    .replace(/reward\/risk/gi, 'exit/invalidation evidence')
    .replace(/modeled reward/gi, 'modeled compatibility range')
    .replace(/target\/reward/gi, 'exit/invalidation')
    .replace(/target price/gi, 'compatibility price')
    .replace(/price target/gi, 'compatibility price');
}
