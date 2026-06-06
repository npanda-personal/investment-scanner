import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  CheckCircleOutline,
  LockOutlined,
  WarningAmberOutlined,
  TrendingUpOutlined,
  ShieldOutlined,
  LocalFireDepartmentOutlined,
  SearchOutlined,
  ArrowForwardOutlined,
  UpdateOutlined,
  GppGoodOutlined,
  BugReportOutlined,
  FlashOnOutlined,
  TimelineOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { humanizeCode } from '@/shared/format/enumLabels';
import { useResearchOverview } from '../hooks/useResearchOverview';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { ActionabilityDimension, ActionabilityStatus, ResearchOverview, NextAction, ResearchPriorityCandidate, ResearchWhatChangedDelta } from '../api/researchHubApi';
import { ResearchDrilldownTabs } from './ResearchDrilldownTabs';

const ResearchOverviewPage: React.FC = () => {
  const { scope } = useMarketScope();
  const { data, loading, error, reload } = useResearchOverview();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
          {error || 'Unable to load research overview'}
        </Alert>
      </Box>
    );
  }

  const {
    actionability = defaultActionability(),
    marketReadiness = {
      marketGate: 'UNKNOWN',
      marketCondition: 'UNKNOWN',
      headline: '',
      allowedActions: [],
      reasons: [],
      blockers: [],
      dataStatus: 'MISSING'
    },
    researchPriorities = {
      tradeCandidates: [],
      watchCandidates: [],
      avoidCandidates: [],
      exitCandidates: []
    },
    strategyProofSummary = {
      strategiesProducingCandidates: [],
      provenCandidateCount: 0,
      unprovenCandidateCount: 0,
      blockedByMarketGateCount: 0,
      missingBacktestCount: 0,
      notes: []
    },
    confirmationSummary = {
      signalSummary: { topBullishCount: 0, topBearishCount: 0, reliabilityAvailable: false, notes: [] },
      smartMoneySummary: { accumulationCount: 0, distributionCount: 0, topConfirmations: [], topContradictions: [] },
      marketContextSummary: { leadingSectors: [], weakSectors: [], breadthStatus: '', notes: [] }
    },
    whatChanged = {
      newTradeCandidates: [],
      droppedCandidates: [],
      downgradedCandidates: [],
      upgradedCandidates: [],
      demotedCandidates: [],
      marketGateChange: null,
      warnings: []
    },
    nextActions = [],
    dataGaps = []
  } = data;

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title="Research Command Center"
        subtitle={`Prioritized market intelligence for ${scope.region} / ${scope.assetType}.`}
        primaryAction={<Button variant="outlined" onClick={reload} startIcon={<UpdateOutlined />}>Reload Snapshot</Button>}
      />

      {data.generatedAt && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 3,
            py: 0.75,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <UpdateOutlined fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            As of {new Date(data.generatedAt).toLocaleString()}
          </Typography>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <ActionabilitySummary actionability={actionability} />
        </Grid>

        {/* 1. Market Readiness Hero */}
        <Grid item xs={12}>
          <MarketReadinessHero readiness={marketReadiness} actionability={actionability} nextActions={nextActions} />
        </Grid>

        {/* 2. Research Priority Board */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalFireDepartmentOutlined color="primary" /> Research Priority Board
          </Typography>
          <ResearchPriorityBoard priorities={researchPriorities} generatedAt={data.generatedAt} />
        </Grid>

        {/* 3. Confirmation & What Changed Panel */}
        <Grid item xs={12} md={4}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GppGoodOutlined color="primary" /> Strategy Proof
              </Typography>
              <StrategyProofPanel summary={strategyProofSummary} />
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GppGoodOutlined color="success" /> Confirmation Layers
              </Typography>
              <ConfirmationPanel summary={confirmationSummary} />
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineOutlined color="info" /> What Changed
              </Typography>
              <WhatChangedPanel whatChanged={whatChanged} generatedAt={data.generatedAt} />
            </Box>

          </Stack>
        </Grid>

        {/* 4. Drilldown Tabs — full width */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineOutlined color="info" /> Drilldown Analysis
          </Typography>
          <ResearchDrilldownTabs />
        </Grid>
      </Grid>

      {dataGaps.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">
            <Typography variant="body2" fontWeight={700}>Partial Data Available</Typography>
            <Typography variant="caption">{dataGaps.join('. ')}</Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

const ActionabilitySummary: React.FC<{ actionability: ResearchOverview['actionability'] }> = ({ actionability }) => {
  const dimensions = Object.values(actionability.dimensions);
  const nextBestAction = actionability.nextBestAction;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={800}>Actionability</Typography>
              <Chip size="small" label={formatStatus(actionability.overallStatus)} color={statusColor(actionability.overallStatus)} />
              <Chip
                size="small"
                label={actionability.canReviewActionableSetups ? 'Reviewable setups confirmed' : 'Reviewable setups not confirmed'}
                color={actionability.canReviewActionableSetups ? 'success' : 'warning'}
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {actionability.headline}
            </Typography>
          </Box>
          {nextBestAction && (
            <Button
              component={Link}
              to={nextBestAction.targetRoute}
              variant={nextBestAction.priority === 'HIGH' ? 'contained' : 'outlined'}
              endIcon={<ArrowForwardOutlined />}
            >
              {nextBestAction.label}
            </Button>
          )}
        </Stack>

        <Grid container spacing={1.5}>
          {dimensions.map((dimension) => (
            <Grid item xs={12} sm={6} md={3} key={`${dimension.sourceModule}-${dimension.label}`}>
              <ActionabilityDimensionTile dimension={dimension} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Paper>
  );
};

const ActionabilityDimensionTile: React.FC<{ dimension: ActionabilityDimension }> = ({ dimension }) => (
  <Paper variant="outlined" sx={{ p: 1.5, height: '100%', bgcolor: 'background.paper' }}>
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
        <Typography variant="subtitle2" fontWeight={700}>{dimension.label}</Typography>
        <Chip size="small" label={formatStatus(dimension.status)} color={statusColor(dimension.status)} variant={dimension.blocking ? 'filled' : 'outlined'} />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        {dimension.sourceModule}
      </Typography>
      <Typography variant="body2">{dimension.message}</Typography>
    </Stack>
  </Paper>
);

const MarketReadinessHero: React.FC<{
  readiness: ResearchOverview['marketReadiness'];
  actionability: ResearchOverview['actionability'];
  nextActions: NextAction[];
}> = ({ readiness, actionability, nextActions = [] }) => {
  const gateColor = readiness?.marketGate === 'OPEN' ? 'success' : readiness?.marketGate === 'CLOSED' ? 'error' : 'warning';
  const gateIcon = readiness?.marketGate === 'OPEN' ? <CheckCircleOutline fontSize="large" /> : readiness?.marketGate === 'CLOSED' ? <LockOutlined fontSize="large" /> : <WarningAmberOutlined fontSize="large" />;
  const canShowMarketActions = Boolean(actionability?.canReviewActionableSetups);
  const marketEnvironmentMessage = actionability?.dimensions?.marketEnvironment?.message;
  const headline = canShowMarketActions
    ? readiness?.headline
    : marketEnvironmentMessage || 'Market environment is one input; setup readiness is not confirmed.';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 2,
        borderLeft: '8px solid',
        borderColor: `${gateColor}.main`,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)'
      }}
    >
      <Grid container spacing={4} alignItems="center">
        <Grid item xs={12} md={8}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ color: `${gateColor}.main`, display: 'flex' }}>
              {gateIcon}
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Market is {readiness?.marketGate || 'UNKNOWN'}
            </Typography>
          </Stack>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
            {headline}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1, mb: 3 }}>
            {canShowMarketActions && (readiness?.allowedActions || []).map(action => (
              <Chip key={action} label={action.replace(/_/g, ' ')} color="primary" variant="outlined" size="small" />
            ))}
            {!canShowMarketActions && (
              <>
                <Chip label="Market input only" color="default" variant="outlined" size="small" />
                <Chip label="Review actionability evidence" color="warning" variant="outlined" size="small" />
              </>
            )}
          </Stack>

          {(readiness?.blockers?.length ?? 0) > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BugReportOutlined fontSize="small" /> ACTIVE BLOCKERS
              </Typography>
              <Typography variant="body2">{readiness.blockers[0]}</Typography>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.secondary' }}>
            Recommended Next Actions
          </Typography>
          <Stack spacing={1}>
            {nextActions.map((action, idx) => (
              <Button
                key={idx}
                component={Link}
                to={action.targetRoute}
                variant={action.priority === 'HIGH' ? 'contained' : 'outlined'}
                color={action.priority === 'HIGH' ? 'primary' : 'inherit'}
                size="small"
                fullWidth
                endIcon={<ArrowForwardOutlined />}
                sx={{ justifyContent: 'space-between', textAlign: 'left', px: 2 }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

const ResearchPriorityBoard: React.FC<{ priorities: ResearchOverview['researchPriorities']; generatedAt?: string }> = ({ priorities, generatedAt }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <PriorityCard
          title="Review Candidates"
          items={priorities?.tradeCandidates || []}
          type="candidate"
          emptyMsg="No framework-backed candidates meet the proof threshold yet."
          snapshotDate={generatedAt}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <PriorityCard title="Exit / Reduce Risk" items={priorities?.exitCandidates || []} type="exit" emptyMsg="No active exit candidates found." />
      </Grid>
      <Grid item xs={12} sm={6}>
        <PriorityCard title="Watch / Wait" items={priorities?.watchCandidates || []} type="watch" emptyMsg="No candidates in the watch zone." />
      </Grid>
      <Grid item xs={12} sm={6}>
        <PriorityCard title="Avoid / Risk" items={priorities?.avoidCandidates || []} type="avoid" emptyMsg="No immediate risk warnings." />
      </Grid>
    </Grid>
  );
};

const PriorityCard: React.FC<{ title: string; items: ResearchPriorityCandidate[]; type: 'candidate' | 'exit' | 'watch' | 'avoid'; emptyMsg: string; snapshotDate?: string }> = ({ title, items = [], type, emptyMsg, snapshotDate }) => {
  const getHeaderColor = () => {
    if (type === 'candidate') return 'primary.main';
    if (type === 'exit') return 'error.main';
    if (type === 'watch') return 'info.main';
    return 'warning.main';
  };

  const snapshotTs = snapshotDate ? new Date(snapshotDate) : null;
  const ageMs = snapshotTs ? Date.now() - snapshotTs.getTime() : null;
  const isStale = ageMs !== null && ageMs > 24 * 60 * 60 * 1000;

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: getHeaderColor() }}>
          {title}
        </Typography>
        <Chip size="small" label={items.length} />
      </Box>
      <CardContent sx={{ p: 0, flexGrow: 1 }}>
        {items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{emptyMsg}</Typography>
            {snapshotTs && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Evaluation snapshot: {snapshotTs.toLocaleString()}
                </Typography>
                {isStale && (
                  <Chip
                    label="Stale — over 1 day old"
                    size="small"
                    color="warning"
                    variant="filled"
                    sx={{ mt: 0.75, fontWeight: 700, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            )}
          </Box>
        ) : (
          <List disablePadding>
            {items.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                <ListItem
                  disablePadding
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                  secondaryAction={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {type === 'candidate' && (
                        <Button size="small" variant="outlined" component={Link} to="/today-review">Daily Review</Button>
                      )}
                      <IconButton edge="end" size="small" component={Link} to={item.stockRoute || `/stocks/${item.instrumentId}`}>
                        <ArrowForwardOutlined fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemButton component={Link} to={item.targetRoute || `/strategy?instrumentId=${item.instrumentId}`} sx={{ py: 1.5, px: 2 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {type === 'candidate' ? <FlashOnOutlined color="primary" /> : type === 'exit' ? <ShieldOutlined color="error" /> : <SearchOutlined />}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body1" fontWeight={700}>{item.symbol}</Typography>
                          <Typography variant="caption" sx={{ px: 0.5, borderRadius: 0.5, bgcolor: 'action.selected' }}>{item.decisionScore}</Typography>
                          <Chip size="small" label={humanizeCode(item.backtestSummary?.ratingGrade || item.strategyRating?.ratingGrade || 'UNPROVEN')} />
                          <Chip size="small" label={humanizeCode(safeReadiness(item.readinessLabel))} />
                        </Stack>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {item.strategy}{item.strategyVersion ? ` v${item.strategyVersion}` : ''} - {item.confidence}
                          </Typography>
                          {item.backtestSummary && (
                            <Typography variant="caption" display="block">
                              {item.backtestSummary.timeframe}: CAGR {fmtPercent(item.backtestSummary.cagr)}, DD {fmtPercent(item.backtestSummary.maxDrawdown)}, Sharpe {fmtNumber(item.backtestSummary.sharpe)}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" color={item.proofWarnings?.length ? 'warning.main' : 'text.secondary'}>
                            {item.proofWarnings?.[0] || item.reasons?.[0] || item.primaryNextAction}
                          </Typography>
                        </Box>
                      }
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItemButton>
                </ListItem>
                {idx < items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Paper>
  );
};

const ConfirmationPanel: React.FC<{ summary: ResearchOverview['confirmationSummary'] }> = ({ summary }) => {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <List disablePadding>
          {/* Signal Confirmation */}
          <ListItem sx={{ py: 2, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}><FlashOnOutlined /></ListItemIcon>
            <ListItemText
              primary="Signal Pulse"
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`${summary?.signalSummary?.topBullishCount || 0} Bullish`} color="success" variant="outlined" />
                    <Chip size="small" label={`${summary?.signalSummary?.topBearishCount || 0} Bearish`} color="error" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>{summary?.signalSummary?.notes?.[0]}</Typography>
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
          <Divider />

          {/* Smart Money Confirmation */}
          <ListItem sx={{ py: 2, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}><GppGoodOutlined /></ListItemIcon>
            <ListItemText
              primary="Smart Money Alignment"
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  {(summary?.smartMoneySummary?.topConfirmations?.length || 0) > 0 ? (
                    <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleOutline fontSize="inherit" /> {summary.smartMoneySummary.topConfirmations[0]}
                    </Typography>
                  ) : (
                    <Typography variant="caption">No direct smart money confirmations detected.</Typography>
                  )}
                  {(summary?.smartMoneySummary?.topContradictions?.length || 0) > 0 && (
                    <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningAmberOutlined fontSize="inherit" /> {summary.smartMoneySummary.topContradictions[0]}
                    </Typography>
                  )}
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
          <Divider />

          {/* Market Context */}
          <ListItem sx={{ py: 2, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}><TrendingUpOutlined /></ListItemIcon>
            <ListItemText
              primary="Sector Tailwinds"
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" fontWeight={700}>Leading: </Typography>
                  <Typography variant="caption">{(summary?.marketContextSummary?.leadingSectors || []).slice(0, 3).join(', ') || 'None'}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{summary?.marketContextSummary?.breadthStatus}</Typography>
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
};

const StrategyProofPanel: React.FC<{ summary: ResearchOverview['strategyProofSummary'] }> = ({ summary }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6}><ProofMetric label="Proven" value={summary.provenCandidateCount} /></Grid>
          <Grid item xs={6}><ProofMetric label="Unproven" value={summary.unprovenCandidateCount} /></Grid>
          <Grid item xs={6}><ProofMetric label="Missing Backtests" value={summary.missingBacktestCount} /></Grid>
          <Grid item xs={6}><ProofMetric label="Market Blocked" value={summary.blockedByMarketGateCount} /></Grid>
        </Grid>
        {summary.strategiesProducingCandidates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No framework-backed strategies are producing review candidates yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {summary.strategiesProducingCandidates.map((item) => (
              <Paper key={item.strategy} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{item.strategy}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.candidateCount} review candidate(s){item.topCandidateSymbol ? ` - top ${item.topCandidateSymbol}` : ''}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Chip size="small" label={humanizeCode(item.bestRating)} />
                    <Chip size="small" label={humanizeCode(safeReadiness(item.readinessLabel))} />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
        {summary.notes.length > 0 && <Alert severity="warning" sx={{ mt: 2 }}>{summary.notes[0]}</Alert>}
      </CardContent>
    </Card>
  );
};

const ProofMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" fontWeight={700}>{value}</Typography>
  </Box>
);

const DeltaChip: React.FC<{ delta: ResearchWhatChangedDelta }> = ({ delta }) => {
  const sign = delta.scoreDelta > 0 ? '+' : '';
  const color = delta.scoreDelta > 0 ? 'success' : delta.scoreDelta < 0 ? 'error' : 'default';
  const readinessLabel = delta.readinessChange !== 'UNCHANGED' ? ` (${delta.readinessChange.toLowerCase()})` : '';
  return (
    <Chip
      key={delta.symbol}
      size="small"
      label={`${delta.symbol} ${sign}${delta.scoreDelta}${readinessLabel}`}
      color={color as any}
      variant="outlined"
      component={Link}
      to={`/instrument-workspace/${delta.symbol}`}
      sx={{ cursor: 'pointer', fontWeight: 700 }}
    />
  );
};

const WhatChangedPanel: React.FC<{
  whatChanged: ResearchOverview['whatChanged'];
  generatedAt?: string;
}> = ({ whatChanged, generatedAt }) => {
  const snapshotDate = generatedAt ? new Date(generatedAt) : null;
  const ageMs = snapshotDate ? Date.now() - snapshotDate.getTime() : null;
  const isStale = ageMs !== null && ageMs > 24 * 60 * 60 * 1000; // older than 1 day

  const hasNoPriorSnapshot = (whatChanged?.warnings || []).some(
    (w) => typeof w === 'string' && w.toLowerCase().includes('no prior snapshot')
  );

  const droppedCandidates = whatChanged?.droppedCandidates || [];
  const upgradedCandidates = whatChanged?.upgradedCandidates || [];
  const demotedCandidates = whatChanged?.demotedCandidates || [];
  const hasAnyChange =
    (whatChanged?.newTradeCandidates?.length || 0) > 0 ||
    droppedCandidates.length > 0 ||
    upgradedCandidates.length > 0 ||
    demotedCandidates.length > 0;

  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
      <CardContent>
        {/* Snapshot timestamp + stale indicator */}
        {snapshotDate && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Snapshot: {snapshotDate.toLocaleString()}
            </Typography>
            {isStale && (
              <Chip
                label="Stale — over 1 day old"
                size="small"
                color="warning"
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
              />
            )}
          </Stack>
        )}

        {hasNoPriorSnapshot ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              No prior snapshot — a second pipeline run is needed to compute the diff.
            </Typography>
            <Button
              component={Link}
              to="/admin/strategy-evaluation"
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardOutlined />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Run strategy evaluation
            </Button>
          </Stack>
        ) : hasAnyChange ? (
          <Stack spacing={1.5}>
            {/* Newly appeared */}
            {(whatChanged?.newTradeCandidates?.length || 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                  <FlashOnOutlined fontSize="inherit" /> NEW
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {whatChanged.newTradeCandidates.map(symbol => (
                    <Chip key={symbol} label={symbol} size="small" color="success" component={Link} to={`/instrument-workspace/${symbol}`} sx={{ cursor: 'pointer' }} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Dropped */}
            {droppedCandidates.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                  <WarningAmberOutlined fontSize="inherit" /> DROPPED
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {droppedCandidates.map(symbol => (
                    <Chip key={symbol} label={symbol} size="small" color="error" variant="outlined" component={Link} to={`/instrument-workspace/${symbol}`} sx={{ cursor: 'pointer' }} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Upgraded (score/readiness improved) */}
            {upgradedCandidates.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                  <TrendingUpOutlined fontSize="inherit" /> IMPROVED
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {upgradedCandidates.map(d => <DeltaChip key={d.symbol} delta={d} />)}
                </Stack>
              </Box>
            )}

            {/* Demoted (score/readiness worsened but still present) */}
            {demotedCandidates.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                  <WarningAmberOutlined fontSize="inherit" /> WEAKENED
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {demotedCandidates.map(d => <DeltaChip key={d.symbol} delta={d} />)}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No changes since the last snapshot.</Typography>
        )}

        {(whatChanged?.marketGateChange) && (
          <Box sx={{ mt: 1.5 }}>
            <Chip
              size="small"
              label={`Market gate: ${whatChanged.marketGateChange.from} → ${whatChanged.marketGateChange.to}`}
              color="warning"
              variant="outlined"
            />
          </Box>
        )}

        {(whatChanged?.warnings?.length || 0) > 0 && !hasNoPriorSnapshot && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="warning.main">{whatChanged.warnings[0]}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ResearchOverviewPage;

function defaultActionability(): ResearchOverview['actionability'] {
  const unavailable = (label: string, sourceModule: string): ActionabilityDimension => ({
    status: 'INSUFFICIENT_DATA',
    label,
    sourceModule,
    blocking: true,
    message: `${label} is not available in this Research Hub response.`,
  });

  return {
    overallStatus: 'INSUFFICIENT_DATA',
    canReviewActionableSetups: false,
    headline: 'Actionable setup review is not confirmed because required readiness evidence is unavailable.',
    researchSupportOnly: true,
    dimensions: {
      marketEnvironment: unavailable('Market Environment', 'strategy-decision-engine'),
      dataReadiness: unavailable('Data Readiness', 'research-hub'),
      signalEvidence: unavailable('Signal Evidence', 'signal-quality-lab'),
      calibrationReadiness: unavailable('Calibration Readiness', 'signal-calibration-engine'),
      strategyProof: unavailable('Strategy Proof', 'strategy-decision-engine'),
      todayReviewReadiness: unavailable('Today Review Readiness', 'today-trade-review'),
      tradePlanReadiness: unavailable('Trade Plan Readiness', 'trade-plan-risk-engine'),
    },
    nextBestAction: null,
    blockers: [],
  };
}

function statusColor(status: ActionabilityStatus): 'success' | 'warning' | 'error' | 'default' | 'info' {
  if (status === 'READY') return 'success';
  if (status === 'BLOCKED') return 'error';
  if (status === 'LIMITED' || status === 'UNPROVEN') return 'warning';
  if (status === 'INSUFFICIENT_DATA') return 'info';
  return 'default';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function safeReadiness(label?: string | null) {
  if (label === 'PAPER_TEST_CANDIDATE' || label === 'WATCHLIST_CANDIDATE' || label === 'NOT_AUTOMATION_READY') return label;
  return 'RESEARCH_ONLY';
}

function fmtPercent(value: number | null | undefined) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

function fmtNumber(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(2) : 'N/A';
}
