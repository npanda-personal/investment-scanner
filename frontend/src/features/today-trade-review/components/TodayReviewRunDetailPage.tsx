import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { useTodayReviewRunById } from '../hooks/useTodayReviewRunById';
import type { TodayReviewGroups } from '../types';
import { CandidateTable } from './TodayReviewCandidateTable';
import {
  BoardSelectionPanel,
  CoveragePanel,
  EmptyTabState,
  ExclusionReasonsPanel,
  PostureStrip,
  RunStatusPanel,
  SummaryCard,
} from './TodayReviewPanels';
import {
  candidatesForTab,
  derivePostureStripText,
  emptyGroups,
  formatDate,
  hasMissingTierContext,
  sourceSnapshotForRun,
} from './todayReviewTableFormat';

const groupTabs: Array<{ key: keyof TodayReviewGroups; label: string }> = [
  { key: 'longReview', label: 'Long Review' },
  { key: 'exitRiskReview', label: 'Exit Risk / Short Review' },
  { key: 'watchOnly', label: 'Watch Only' },
  { key: 'specialCases', label: 'Special Cases' },
  { key: 'blocked', label: 'Blocked' },
];

export function TodayReviewRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const { scope } = useMarketScope();
  const { data, loading, error } = useTodayReviewRunById(runId);
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

  const sourceSnapshot = run ? sourceSnapshotForRun(run) : null;
  const runRegime: string | null = (sourceSnapshot as any)?.marketContext?.regime?.regime ?? null;
  const postureLabel = marketPosture?.availability === 'READY' && marketPosture.postureLabel
    ? marketPosture.postureLabel : null;
  const postureStripText = derivePostureStripText(runRegime, postureLabel);
  const dataThroughLabel = run?.dataThroughDate ? `Data through ${formatDate(run.dataThroughDate)}` : null;
  const showDegradedWarning = run && (run.status === 'PARTIAL' || run.status === 'FAILED');
  const degradedWarningText = showDegradedWarning
    ? (run.warnings[0] || `Review status: ${run.status} — some data may be incomplete.`) : null;

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={2}>
        <PageHeader
          title={run ? `Review — ${formatDate(run.runDate)}` : 'Review Run'}
          subtitle="Historical review run details."
          backTo="/today-review/runs"
          backLabel="Review History"
          badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
        />

        {loading && (
          <Alert severity="info" icon={<CircularProgress size={18} />}>
            Loading review run...
          </Alert>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && !run && (
          <Alert severity="info">No data found for this review run.</Alert>
        )}

        {run && (
          <>
            <PostureStrip
              text={postureStripText}
              dataThroughLabel={dataThroughLabel}
              runRegime={runRegime}
              postureLabel={postureLabel}
              totals={totals}
            />

            {degradedWarningText && (
              <Alert severity="warning" sx={{ py: 0.5 }}>{degradedWarningText}</Alert>
            )}

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
                  <CandidateTable key={tab} candidates={activeCandidates} run={run} activeTab={tab} />
                )}
              </CardContent>
            </Card>

            <Accordion variant="outlined" disableGutters defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">How this list was built</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <RunStatusPanel run={run} marketPosture={marketPosture} />
                  <CoveragePanel run={run} />
                  <BoardSelectionPanel run={run} />
                  <ExclusionReasonsPanel run={run} />
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
