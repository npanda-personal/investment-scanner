import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import {
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
import { humanizeCode, humanizeEmbedded } from '@/shared/format/enumLabels';
import { useTodayReview } from '../hooks/useTodayReview';
import type {
  TodayReviewCandidate,
  TodayReviewCandidateDataQualitySnapshot,
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

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={3}>
      <PageHeader
        title="Daily Review"
        subtitle="Persisted research support shortlist built from trusted OHLCV coverage, entry trigger context, exit/invalidation evidence, data quality, and supporting evidence. This page does not run review generation."
        badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
      />

      {loading && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Loading Daily Review for {scope.region} / {scope.assetType}.
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && !run && (
        <Alert severity="info">
          No Daily Review snapshot has been published for {scope.region} / {scope.assetType}. Data-production workflows are handled in Admin / Data Ops.
        </Alert>
      )}

      {run && (
        <>
          <RunStatusPanel run={run} marketPosture={marketPosture} />
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
            <SummaryCard label="Special cases" value={totals.special} tone="info" />
            <SummaryCard label="Strategy-backed" value={totals.strategyBacked} tone="success" />
            <SummaryCard label="Lite discovery" value={totals.lite} tone="default" />
            <SummaryCard label="Suppressed" value={totals.suppressed} tone="warning" />
            <SummaryCard label="Blocked" value={totals.blocked} tone="error" />
            <SummaryCard label="Data gaps/warnings" value={totals.warnings} tone="default" />
            <SummaryCard label="Missing DQ tier context" value={totals.missingTierContext} tone="warning" />
          </Grid>
          <BoardSelectionPanel run={run} />
          <ExclusionExplainabilityPanel run={run} />

          <Alert severity="info">
            Signals and calibration are supporting evidence only. Promoted review candidates require trusted price data, enough OHLCV history, entry trigger context, exit/invalidation evidence, and data quality.
          </Alert>
          <Alert severity="info">
            Data Quality tiers are read-only context from Data Quality Engine and never change Today Review ranking or promotion in this view.
          </Alert>

          {groups.longReview.length === 0 && (
            <Alert severity="warning">
              No long review candidates are currently promoted. Trusted instruments scanned: {formatNumber(run.scanFunnel?.trustedInstrumentsScanned ?? sourceSnapshotForRun(run).scanFunnel?.trustedInstrumentsScanned ?? 0)}; setups detected: {formatNumber(run.scanFunnel?.setupsDetected ?? sourceSnapshotForRun(run).scanFunnel?.setupsDetected ?? 0)}; watch/unproven: {formatNumber((run.scanFunnel?.watchOnly ?? sourceSnapshotForRun(run).scanFunnel?.watchOnly ?? 0) + (run.scanFunnel?.unproven ?? sourceSnapshotForRun(run).scanFunnel?.unproven ?? 0))}.
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
                  {emptySectionExplanation(tab, run)}
                </Typography>
              ) : (
                <CandidateTable candidates={activeCandidates} />
              )}
            </CardContent>
          </Card>
        </>
      )}
      </Stack>
    </Box>
  );
}

function RunStatusPanel({ run, marketPosture }: { run: TodayReviewRun | null; marketPosture: TodayReviewMarketPosture | null }) {
  if (!run) return null;
  const sourceSnapshot = sourceSnapshotForRun(run);
  const reviewReadiness = sourceSnapshot.reviewReadiness || {};
  const reviewUniverse = sourceSnapshot.reviewUniverse || {};
  const postureLabel = marketPosture?.availability === 'READY' && marketPosture.postureLabel
    ? marketPosture.postureLabel
    : null;
  const postureColor = postureLabel === 'RISK_ON' ? 'success' : postureLabel === 'RISK_OFF' ? 'error' : postureLabel ? 'warning' : 'default';
  const postureBandText = marketPosture?.suggestedExposureBand
    ? ` (${marketPosture.suggestedExposureBand.minPct}–${marketPosture.suggestedExposureBand.maxPct}%)`
    : '';
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Chip label={`Run status: ${run.status}`} color={run.status === 'COMPLETED' ? 'success' : run.status === 'PARTIAL' ? 'warning' : 'error'} />
          <Chip label={`Trust: ${run.trustStatus}`} color={run.trustStatus === 'OK' ? 'success' : run.trustStatus === 'FAILED' ? 'error' : 'warning'} variant="outlined" />
          <Chip label={`Market Data trust: ${reviewReadiness.trustStatus || 'UNKNOWN'}`} variant="outlined" />
          {marketPosture ? (
            <Tooltip title={marketPosture.availability !== 'READY' ? 'Capital posture data is unavailable for this run.' : `Suggested exposure band${postureBandText}`} arrow>
              <Chip
                label={`Capital Posture: ${postureLabel ?? 'Unavailable'}`}
                color={postureColor as any}
                variant="outlined"
              />
            </Tooltip>
          ) : null}
          <Typography variant="body2" color="text.secondary">Last run: {formatDateTime(run.finishedAt || run.startedAt)}</Typography>
          <Typography variant="body2" color="text.secondary">Data-through: {formatDate(run.dataThroughDate)}</Typography>
          <Typography variant="body2" color="text.secondary">Scope: {run.region} / {run.assetType}</Typography>
          <Typography variant="body2" color="text.secondary">Review mode: {humanizeCode(coverageValue(run, 'mode'))}</Typography>
          <Typography variant="body2" color="text.secondary">Trusted universe: {formatNumber(Number(coverageValue(run, 'trustedCount') || 0))} / Catalog {formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}</Typography>
          <Typography variant="body2" color="text.secondary">Required data-through: {reviewUniverse.requiredDataThroughDate || reviewReadiness.requiredDataThroughDate || 'Unavailable'}</Typography>
          <Typography variant="body2" color="text.secondary">Stored data-through: {reviewUniverse.storedDataThroughDate || reviewReadiness.storedDataThroughDate || reviewUniverse.dataThroughDate || 'Unavailable'}</Typography>
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
          <Typography variant="subtitle2">Trusted baseline context (read-only source: Market Data Foundation)</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Review mode: ${humanizeCode(coverageValue(run, 'mode'))}`} color={coverageValue(run, 'mode') === 'FULL_REVIEW' ? 'success' : coverageValue(run, 'mode') === 'LIMITED_REVIEW' ? 'warning' : 'default'} />
            <Chip label={`Trusted universe: ${formatNumber(Number(coverageValue(run, 'trustedCount') || 0))}`} variant="outlined" />
            <Chip label={`Catalog: ${formatNumber(Number(coverageValue(run, 'catalogCount') || 0))}`} variant="outlined" />
            <Chip label={`Review session: ${reviewUniverse.targetTradingDate || 'Unavailable'}`} variant="outlined" />
            <Chip label={`Required data-through: ${reviewUniverse.requiredDataThroughDate || 'Unavailable'}`} variant="outlined" />
            <Chip label={`Stored data-through: ${reviewUniverse.storedDataThroughDate || reviewUniverse.dataThroughDate || formatDate(run.dataThroughDate)}`} variant="outlined" />
            <Chip label={`Readiness decision: ${humanizeCode(reviewReadiness.userDecision || 'WAIT')}`} variant="outlined" />
          </Stack>
          {missingReadiness && (
            <Alert severity="warning">
              Market Data readiness snapshot is missing from this run. Conservative context mode is active for run-level evidence.
            </Alert>
          )}
          {reviewModeMismatch && (
            <Alert severity="error">
              Today Review readiness mode does not match the Market Data summary snapshot.
            </Alert>
          )}
          {reviewReadiness.reviewMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              <Typography variant="caption">Market Data summary mode: {humanizeCode(reviewReadiness.reviewMode)}</Typography>
              <Typography variant="caption">Trust status: {humanizeCode(reviewReadiness.trustStatus || 'UNKNOWN')}</Typography>
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
            <Typography variant="caption">Trusted available: {formatNumber(Number(scanFunnel.trustedUniverseCount ?? coverageValue(run, 'trustedCount') ?? 0))}</Typography>
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
            <Typography color="text.secondary">No exclusion summary was stored for this run.</Typography>
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
        Board contract metadata is unavailable for this persisted run. Legacy snapshots still use state-based grouping.
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
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="h6">Board Contract</Typography>
            <Chip label={boardSelection.contractVersion} size="small" variant="outlined" />
          </Stack>
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
  const csv = `\uFEFF${header}\r\n${body}`;
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

function CandidateTable({ candidates }: { candidates: TodayReviewCandidate[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [readinessFilter, setReadinessFilter] = useState('ALL');
  const [dataQualityFilter, setDataQualityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  const columns = useMemo<CandidateColumn[]>(() => [
    {
      id: 'rank',
      label: 'Rank',
      width: 72,
      align: 'right',
      value: (candidate) => candidate.rank,
      render: (candidate) => <EllipsisCell fullText={String(candidate.rank)} align="right" strong />,
    },
    {
      id: 'symbol',
      label: 'Symbol',
      width: 150,
      value: (candidate) => `${candidate.symbol} ${candidate.companyName || ''}`,
      render: (candidate) => (
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
      ),
    },
    {
      id: 'state',
      label: 'State',
      width: 160,
      value: (candidate) => stateLabel(candidate.state),
      render: (candidate) => <EllipsisCell fullText={stateLabel(candidate.state)} />,
    },
    {
      id: 'setup',
      label: 'Setup',
      width: 170,
      value: (candidate) => humanizeCode(candidate.setupType || candidate.strategyCode),
      render: (candidate) => <EllipsisCell fullText={humanizeCode(candidate.setupType || candidate.strategyCode)} />,
    },
    {
      id: 'board',
      label: 'Board',
      width: 230,
      value: (candidate) => `${boardSectionLabel(candidate)} ${boardSourceLabel(candidate)} ${humanizeEmbedded(candidate.boardReason) || ''}`,
      render: (candidate) => <EllipsisCell fullText={`${boardSectionLabel(candidate)} / ${boardSourceLabel(candidate)} - ${humanizeEmbedded(candidate.boardReason) || 'Standard board selection.'}`} />,
    },
    {
      id: 'entry',
      label: 'Entry evidence',
      width: 190,
      value: (candidate) => formatEntry(candidate.tradePlanSnapshot as any),
      render: (candidate) => <EllipsisCell fullText={formatEntry(candidate.tradePlanSnapshot as any)} />,
    },
    {
      id: 'exit',
      label: 'Exit / invalidation',
      width: 240,
      value: (candidate) => formatStop(candidate.tradePlanSnapshot as any, candidate),
      render: (candidate) => <EllipsisCell fullText={formatStop(candidate.tradePlanSnapshot as any, candidate)} />,
    },
    {
      id: 'confidence',
      label: 'Confidence',
      width: 140,
      align: 'right',
      value: (candidate) => Number(candidate.confidenceScore || 0),
      render: (candidate) => {
        const confidence = confidenceDisplay(candidate);
        return <EllipsisCell fullText={confidence.note ? `${confidence.label} - ${confidence.note}` : confidence.label} align="right" strong />;
      },
    },
    {
      id: 'grade',
      label: 'Grade',
      width: 104,
      value: (candidate) => gradeSortValue(candidate.grade),
      render: (candidate) => <Chip label={candidate.grade} size="small" color={gradeColor(candidate.grade) as any} sx={chipNoWrapSx} />,
    },
    {
      id: 'dailyReview',
      label: 'Daily tier',
      width: 150,
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
      value: (candidate) => latestDataDate(candidate),
      render: (candidate) => <EllipsisCell fullText={formatDate(latestDataDate(candidate))} />,
    },
    {
      id: 'dataQuality',
      label: 'DQ',
      width: 150,
      value: dataQualityLabel,
      render: (candidate) => <EllipsisCell fullText={dataQualityLabel(candidate)} />,
    },
    {
      id: 'proof',
      label: 'Proof',
      width: 130,
      value: proofLabel,
      render: (candidate) => <EllipsisCell fullText={proofLabel(candidate)} />,
    },
    {
      id: 'market',
      label: 'Regime',
      width: 140,
      value: marketLabel,
      render: (candidate) => <EllipsisCell fullText={marketLabel(candidate)} />,
    },
    {
      id: 'sector',
      label: 'Sector',
      width: 180,
      value: sectorAlignment,
      render: (candidate) => <EllipsisCell fullText={sectorAlignment(candidate)} />,
    },
    {
      id: 'reason',
      label: 'Reason',
      width: 320,
      value: (candidate) => safeReviewText(candidate.reasonSummary),
      render: (candidate) => <EllipsisCell fullText={safeReviewText(candidate.reasonSummary)} />,
    },
    {
      id: 'blocker',
      label: 'Blocker',
      width: 300,
      value: (candidate) => safeReviewText(blockerLabel(candidate)),
      render: (candidate) => <EllipsisCell fullText={safeReviewText(blockerLabel(candidate))} />,
    },
  ], []);
  const tableMinWidth = useMemo(() => columns.reduce((total, column) => total + column.width, 0), [columns]);

  const sortedCandidates = useMemo(() => {
    const column = columns.find((item) => item.id === sortBy) || columns[0];
    return [...filteredCandidates].sort((a, b) => compareValues(column.value(a), column.value(b), sortDirection));
  }, [columns, filteredCandidates, sortBy, sortDirection]);

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
    setActionMessage(`Exported ${sortedCandidates.length} Today Review rows as an Excel-compatible CSV.`);
  };

  const missingTierCount = useMemo(() => candidates.filter(hasMissingTierContext).length, [candidates]);

  return (
    <Stack spacing={1.5}>
      {actionMessage && <Alert severity="success">{actionMessage}</Alert>}
      {missingTierCount > 0 && (
        <Alert severity="info">
          Confidence scores are conservatively downgraded where DQ tier context is missing ({missingTierCount} of {candidates.length} candidates in this view). Scores shown as &ldquo;X (from Y)&rdquo; are display-only adjustments and do not affect ranking.
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.2fr) repeat(3, minmax(150px, 0.55fr)) auto auto' },
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
        <Tooltip title="Clear table filters" arrow>
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
          Showing {filteredCandidates.length === 0 ? 0 : page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredCandidates.length)} of {filteredCandidates.length} filtered candidates.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Hover any clipped cell to read the full value.
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
                  <Typography color="text.secondary">No candidates match the current table filters.</Typography>
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

function searchableCandidateText(candidate: TodayReviewCandidate) {
  const context = tierContextForCandidate(candidate);
  const plan = candidate.tradePlanSnapshot as any;
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

function marketLabel(candidate: TodayReviewCandidate) {
  const market = candidate.marketContextSnapshot as any;
  return market?.regime?.regime || '—';
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
  const missingTierBlocker = 'Data Quality use-case tier context is missing; confidence view is conservatively downgraded.';
  const upstreamAutomationStatus = automation?.status || null;

  return {
    dailyReview: {
      status: dailyReviewStatus,
      label: dailyReview ? `Daily: ${dailyReview.status}` : '—',
      reason: dailyReview?.reasons?.[0] || (dailyReview ? null : 'Daily review tier not available in this run snapshot.'),
    },
    automation: {
      status: automationStatus,
      label: automation ? 'Automation: BLOCKED' : '—',
      reason: !automation
        ? 'Automation tier not available; execution remains policy-blocked.'
        : upstreamAutomationStatus !== 'BLOCKED'
          ? `Upstream tier reported ${upstreamAutomationStatus}; Today Review keeps automation policy-blocked (PHASE0_AUTOMATION_NOT_AUTHORIZED).`
          : automation.reasons?.[0] || 'PHASE0_AUTOMATION_NOT_AUTHORIZED',
    },
    blocker: !tiers
      ? missingTierBlocker
      : dailyReviewStatus === 'LIMITED' || dailyReviewStatus === 'BLOCKED'
        ? dailyReview?.reasons?.[0] || `Daily review tier is ${dailyReviewStatus}.`
        : null,
  };
}

function confidenceDisplay(candidate: TodayReviewCandidate) {
  const score = Number(candidate.confidenceScore || 0);
  const hasContext = !hasMissingTierContext(candidate);
  if (hasContext) return { label: String(score), note: null as string | null };
  const conservative = Math.max(0, Math.round(score * 0.8));
  return { label: `${conservative} (from ${score})`, note: 'Conservative display-only downgrade: missing DQ tier context' };
}

function candidatesForTab(groups: TodayReviewGroups, tab: keyof TodayReviewGroups) {
  if (tab === 'exitRiskReview') return [...groups.exitRiskReview, ...groups.shortReview];
  if (tab === 'watchOnly') return [...groups.watchOnly, ...groups.unproven, ...groups.insufficientData];
  if (tab === 'specialCases') return groups.specialCases;
  if (tab === 'blocked') return [...groups.blocked, ...groups.avoid];
  return groups[tab] || [];
}

function emptySectionExplanation(tab: keyof TodayReviewGroups, run: TodayReviewRun) {
  const boardSelection = sourceSnapshotForRun(run).boardSelection || null;
  const eligibleCounts = boardSelection?.eligibleCounts || {};
  if (tab === 'longReview') return `No Long Review rows were displayed. Eligible Long Review candidates: ${formatNumber((eligibleCounts as any).LONG_REVIEW || 0)}.`;
  if (tab === 'watchOnly') return `No Watch Only rows were displayed. Eligible Watch Only candidates: ${formatNumber((eligibleCounts as any).WATCH_ONLY || 0)}.`;
  if (tab === 'exitRiskReview') return `No Exit Risk or Short Review rows were displayed. Eligible exit/short-risk candidates: ${formatNumber((eligibleCounts as any).EXIT_RISK || 0)}.`;
  if (tab === 'specialCases') return `No SPECIAL_CASES rows matched existing overlap, ledger, Stock Interest, newly appeared, or high-quality missing-evidence rules. Eligible special cases: ${formatNumber((eligibleCounts as any).SPECIAL_CASES || 0)}.`;
  return 'No candidates in this section for the current persisted run.';
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
  const sector = (candidate.dataQualitySnapshot as TodayReviewCandidateDataQualitySnapshot | null)?.sector || (candidate.sourceSignalSnapshot as any)?.rawSignal?.sector;
  return sector || '—';
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
