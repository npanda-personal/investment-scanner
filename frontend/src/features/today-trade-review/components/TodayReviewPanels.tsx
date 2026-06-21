import {
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
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
import { humanizeCode, humanizeEmbedded } from '@/shared/format/enumLabels';
import type {
  TodayReviewGroups,
  TodayReviewMarketPosture,
  TodayReviewRun,
  TodayReviewScanFunnel,
} from '../types';
import {
  coverageValue,
  formatDate,
  formatDateTime,
  formatNumber,
  sourceSnapshotForRun,
} from './todayReviewTableFormat';

export function PostureStrip({
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
        {totals.long} candidates{totals.exit > 0 ? ` · ${totals.exit} exit risk` : ''} · {totals.watch} watch · {totals.blocked} excluded
      </Typography>
    </Stack>
  );
}

/** Calm thin-day empty state — A4 */
export function EmptyTabState({ tab, run, groups }: { tab: keyof TodayReviewGroups; run: TodayReviewRun; groups: TodayReviewGroups }) {
  const boardSelection = sourceSnapshotForRun(run).boardSelection || null;
  const eligibleCounts = boardSelection?.eligibleCounts || {};
  const sourceSnapshot = sourceSnapshotForRun(run);
  const runRegime: string | null = (sourceSnapshot as any).marketContext?.regime?.regime ?? null;
  const watchCount = groups.watchOnly.length + groups.unproven.length + groups.insufficientData.length;
  const scanFunnel: Partial<TodayReviewScanFunnel> = run.scanFunnel || sourceSnapshot.scanFunnel || {};

  if (tab === 'longReview') {
    const regimeIsQuiet = runRegime === 'RISK_OFF' || runRegime === 'NEUTRAL' || runRegime === null;
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

export function RunStatusPanel({ run, marketPosture }: { run: TodayReviewRun | null; marketPosture: TodayReviewMarketPosture | null }) {
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

export function CoveragePanel({ run }: { run: TodayReviewRun }) {
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
          {(scanFunnel.strategyCandidatesSeen != null || scanFunnel.noSetup != null) && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              {scanFunnel.strategyCandidatesSeen != null && <Typography variant="caption">Strategy candidates seen: {formatNumber(scanFunnel.strategyCandidatesSeen)}</Typography>}
              {scanFunnel.strategyCandidatesEligible != null && <Typography variant="caption">Eligible: {formatNumber(scanFunnel.strategyCandidatesEligible)}</Typography>}
              {scanFunnel.strategyCandidatesExcluded != null && <Typography variant="caption">Excluded: {formatNumber(scanFunnel.strategyCandidatesExcluded)}</Typography>}
              {scanFunnel.outsideTrustedUniverse != null && <Typography variant="caption">Outside universe: {formatNumber(scanFunnel.outsideTrustedUniverse)}</Typography>}
              {scanFunnel.noSetup != null && <Typography variant="caption">No setup: {formatNumber(scanFunnel.noSetup)}</Typography>}
            </Stack>
          )}
          {scanFunnel.topNoPromotionReasons && Object.keys(scanFunnel.topNoPromotionReasons).length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Top exclusion reasons (Lite path)</Typography>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {Object.entries(scanFunnel.topNoPromotionReasons)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([reason, count]) => (
                    <Chip key={reason} label={`${humanizeCode(reason)}: ${count}`} size="small" variant="outlined" />
                  ))}
              </Stack>
            </>
          )}
          {warnings.slice(0, 3).map((warning: string, warningIndex: number) => (
            <Typography key={`warning-${warningIndex}-${warning}`} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ExclusionReasonsPanel({ run }: { run: TodayReviewRun }) {
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

export function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'info' | 'error' | 'default' }) {
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

export function BoardSelectionPanel({ run }: { run: TodayReviewRun }) {
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
