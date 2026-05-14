import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Tab, Tabs, FormControlLabel, Switch, FormControl, InputLabel, MenuItem, Select, Stack, Grid, Paper, Chip, List, ListItem, ListItemText, CircularProgress, LinearProgress } from '@mui/material';
import { TradePlanApi } from '../api';
import { TradePlanTable } from './TradePlanTable';
import { CountItem, PaperReadinessProofChain, TradePlanFunnelDiagnostics, TradePlanResultDto } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { SortDirection } from '@/shared/components/DataTable';

const mergeCountItems = (left: CountItem[], right: CountItem[]): CountItem[] => {
  const counts = new Map<string, number>();
  [...left, ...right].forEach((item) => counts.set(item.reason, (counts.get(item.reason) || 0) + item.count));
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
};

const stageLabel = (stage: string) => stage.split('_').map((item) => item[0] + item.slice(1).toLowerCase()).join(' ');
const statusColor = (status: string) => {
  if (status === 'PASS') return 'success';
  if (status === 'LIMITED' || status === 'UNPROVEN') return 'warning';
  return 'error';
};

const ProofChainSummary: React.FC<{ chain?: PaperReadinessProofChain }> = ({ chain }) => {
  if (!chain) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Paper Readiness Proof Chain</Typography>
        <Chip size="small" label={`${chain.generatedPlanCount} generated`} />
        <Chip size="small" color={chain.paperReadyCount > 0 ? 'success' : 'default'} label={`${chain.paperReadyCount} paper-ready`} />
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {chain.stages.map((stage) => (
              <Chip
                key={stage.stage}
                size="small"
                color={statusColor(stage.status) as any}
                variant={stage.status === 'PASS' ? 'outlined' : 'filled'}
                label={`${stageLabel(stage.stage)}: ${stage.status}${stage.affectedCount > 0 ? ` (${stage.affectedCount})` : ''}`}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} md={5}>
          <List dense disablePadding>
            {chain.prioritizedBlockers.slice(0, 4).map((blocker) => (
              <ListItem key={blocker.category} disablePadding>
                <ListItemText primary={`${blocker.priority}. ${blocker.count} ${blocker.nextActionLabel}`} secondary={blocker.sourceModule} />
              </ListItem>
            ))}
            {chain.prioritizedBlockers.length === 0 && <ListItem disablePadding><ListItemText primary="All proof-chain stages pass for current generated plans." /></ListItem>}
          </List>
        </Grid>
      </Grid>
    </Box>
  );
};

export const TradePlanDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TradePlanResultDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    total: number;
    generated: number;
    failed: number;
    requests: number;
    timeframe: string;
  } | null>(null);
  const [funnel, setFunnel] = useState<TradePlanFunnelDiagnostics | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [paperReadyOnly, setPaperReadyOnly] = useState(false);
  const [paperReadinessStatus, setPaperReadinessStatus] = useState('');
  const [backtestTimeframe, setBacktestTimeframe] = useState('');
  const [generateTimeframe, setGenerateTimeframe] = useState('3Y');
  const [strategyRating, setStrategyRating] = useState('');
  const [readinessLabel, setReadinessLabel] = useState('');
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>('generatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { scope } = useMarketScope();

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = { 
        region: scope.region,
        assetType: scope.assetType,
        limit: pageSize,
        offset: page * pageSize,
      };
      if (paperReadyOnly) params.paperReadyOnly = true;
      if (paperReadinessStatus) params.paperReadinessStatus = paperReadinessStatus;
      if (backtestTimeframe) params.backtestTimeframe = backtestTimeframe;
      if (strategyRating) params.strategyRating = strategyRating;
      if (readinessLabel) params.readinessLabel = readinessLabel;
      if (sortBy) params.sortBy = sortBy;
      if (sortDirection) params.sortDirection = sortDirection;

      const data = await TradePlanApi.listCandidates(params);
      setPlans(data.results);
      setTotalCount(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchFunnel = async () => {
    setFunnelLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        region: scope.region,
        assetType: scope.assetType,
      };
      if (backtestTimeframe) params.backtestTimeframe = backtestTimeframe;
      const data = await TradePlanApi.getFunnel(params);
      setFunnel(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trade plan funnel');
    } finally {
      setFunnelLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    setBatchSummary(null);
    setBatchProgress({
      processed: 0,
      total: 0,
      generated: 0,
      failed: 0,
      requests: 0,
      timeframe: generateTimeframe,
    });
    try {
      const batchSize = 25;
      const workerCount = 3;
      const first = await TradePlanApi.batchGenerate({ region: scope.region, assetType: scope.assetType, batchSize, offset: 0, backtestTimeframe: generateTimeframe });
      const totals = {
        generated: first.generatedCount,
        failed: first.failedCount || 0,
        processed: first.candidateCount || first.count || 0,
        discovered: first.rawCandidateCount || first.totalCount || 0,
        eligible: first.eligibleCandidateCount || first.candidateCount || 0,
        skipped: first.skippedCount || 0,
        paperReady: first.paperReadinessSummary?.READY_FOR_PAPER_REVIEW || 0,
        topBlockers: first.topBlockers || [] as CountItem[],
        requests: 1,
      };
      const updateProgress = () => setBatchProgress({
        processed: totals.processed,
        total: totals.discovered,
        generated: totals.generated,
        failed: totals.failed,
        requests: totals.requests,
        timeframe: generateTimeframe,
      });
      updateProgress();

      const offsets: number[] = [];
      for (let offset = batchSize; offset < (first.totalCount || 0); offset += batchSize) {
        offsets.push(offset);
      }

      let nextOffsetIndex = 0;
      const runWorker = async () => {
        while (nextOffsetIndex < offsets.length) {
          const offset = offsets[nextOffsetIndex];
          nextOffsetIndex += 1;
          const result = await TradePlanApi.batchGenerate({ region: scope.region, assetType: scope.assetType, batchSize, offset, backtestTimeframe: generateTimeframe });
          totals.generated += result.generatedCount;
          totals.failed += result.failedCount || 0;
          totals.processed += result.candidateCount || result.count || 0;
          totals.discovered = Math.max(totals.discovered, result.rawCandidateCount || result.totalCount || 0);
          totals.eligible += result.eligibleCandidateCount || result.candidateCount || 0;
          totals.skipped += result.skippedCount || 0;
          totals.paperReady += result.paperReadinessSummary?.READY_FOR_PAPER_REVIEW || 0;
          totals.topBlockers = mergeCountItems(totals.topBlockers, result.topBlockers || []);
          totals.requests += 1;
          updateProgress();
        }
      };

      await Promise.all(Array.from({ length: Math.min(workerCount, offsets.length) }, () => runWorker()));
      const blockerText = totals.topBlockers.slice(0, 3).map((item) => `${item.count} ${item.reason}`).join(', ') || 'none';
      setBatchSummary(`Batch complete: ${totals.generated} plans generated from ${totals.eligible} eligible Strategy Decision review candidates (${totals.discovered} discovered, ${totals.skipped} skipped). ${totals.paperReady} are paper-ready. Proof timeframe: ${generateTimeframe}. Top blockers: ${blockerText}. Failed: ${totals.failed}.`);
      setPage(0);
      await fetchPlans();
      await fetchFunnel();
    } catch (err: any) {
      setError(err.message || 'Failed to batch generate plans');
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [scope.region, scope.assetType, page, pageSize, sortBy, sortDirection, paperReadyOnly, paperReadinessStatus, backtestTimeframe, strategyRating, readinessLabel]);

  useEffect(() => {
    fetchFunnel();
  }, [scope.region, scope.assetType, backtestTimeframe]);

  const metricCards = funnel ? [
    { label: 'Raw Bullish Signals', value: funnel.rawSignals.bullish },
    { label: 'Strategy Decisions', value: funnel.strategyDecisions.total },
    { label: 'Eligible Review Candidates', value: funnel.tradePlanCandidateDiscovery.eligibleForPlanGeneration },
    { label: 'Generated Plans', value: funnel.generatedPlans.total },
    { label: 'Paper Ready', value: funnel.paperReadiness.readyForPaperReview },
    { label: 'Blocked / Watch / Insufficient', value: funnel.paperReadiness.blocked + funnel.paperReadiness.watchOnly + funnel.paperReadiness.insufficientData },
  ] : [];

  return (
    <Box className="page-container page-container--workspace">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Trade Plans</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Backtest Proof</InputLabel>
            <Select label="Backtest Proof" value={generateTimeframe} onChange={(event) => setGenerateTimeframe(event.target.value)}>
              {['1Y', '3Y', '5Y', '10Y', '15Y'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleBatchGenerate} disabled={batchGenerating}>
            {batchGenerating ? 'Generating...' : 'Generate Plans'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {batchProgress && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              {batchProgress.total > 0
                ? `Generating plans: ${Math.min(batchProgress.processed, batchProgress.total)} / ${batchProgress.total} review candidates processed across ${batchProgress.requests} batch${batchProgress.requests === 1 ? '' : 'es'}. Generated ${batchProgress.generated}, failed ${batchProgress.failed}. Proof timeframe: ${batchProgress.timeframe}.`
                : `Generating plans: discovering eligible Strategy Decision review candidates. Proof timeframe: ${batchProgress.timeframe}.`}
            </Typography>
            <LinearProgress
              variant={batchProgress.total > 0 ? 'determinate' : 'indeterminate'}
              value={batchProgress.total > 0 ? Math.min(100, (batchProgress.processed / batchProgress.total) * 100) : undefined}
            />
          </Stack>
        </Alert>
      )}
      {batchSummary && <Alert severity="success" sx={{ mb: 2 }}>{batchSummary}</Alert>}
      {funnel && funnel.generatedPlans.total > 0 && funnel.paperReadiness.readyForPaperReview === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No plans are paper-ready yet. This is usually caused by weak strategy proof, high risk grade, missing backtest summary, or insufficient data. Review the blocker breakdown below.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Backtest proof timeframe affects proof, rating, and paper-readiness checks. Entry, stop, target, and position sizing are current-market risk levels from the latest price and recent daily candles, so they can remain the same across proof timeframes.
      </Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Generation Funnel</Typography>
          <Chip size="small" label={`${scope.region}/${scope.assetType}`} />
          {funnelLoading && <CircularProgress size={18} />}
        </Stack>
        <Grid container spacing={2}>
          {metricCards.map((card) => (
            <Grid item xs={6} md={2} key={card.label}>
              <Box>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                <Typography variant="h5">{card.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        {funnel && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Top Paper Readiness Blockers</Typography>
              <List dense disablePadding>
                {funnel.paperReadiness.topBlockers.slice(0, 5).map((item) => (
                  <ListItem key={item.reason} disablePadding>
                    <ListItemText primary={`${item.count} ${item.reason}`} />
                  </ListItem>
                ))}
                {funnel.paperReadiness.topBlockers.length === 0 && <ListItem disablePadding><ListItemText primary="No blockers found." /></ListItem>}
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Skipped Before Generation</Typography>
              <List dense disablePadding>
                {funnel.tradePlanCandidateDiscovery.skipReasons.slice(0, 5).map((item) => (
                  <ListItem key={item.reason} disablePadding>
                    <ListItemText primary={`${item.count} ${item.reason}`} />
                  </ListItem>
                ))}
                {funnel.tradePlanCandidateDiscovery.skipReasons.length === 0 && <ListItem disablePadding><ListItemText primary="No skipped review candidates in the current filter." /></ListItem>}
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Recommendations</Typography>
              <List dense disablePadding>
                {funnel.recommendations.slice(0, 5).map((item) => (
                  <ListItem key={item} disablePadding>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
                {funnel.recommendations.length === 0 && <ListItem disablePadding><ListItemText primary="No action required from current diagnostics." /></ListItem>}
              </List>
            </Grid>
          </Grid>
        )}
        <ProofChainSummary chain={funnel?.paperReadinessProofChain} />
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="flex-end" sx={{ mb: 2 }}>
        <FormControlLabel
          control={<Switch checked={paperReadyOnly} onChange={(event) => { setPaperReadyOnly(event.target.checked); setPage(0); }} />}
          label="Paper-ready only"
        />
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Readiness</InputLabel>
          <Select label="Readiness" value={paperReadinessStatus} onChange={(event) => { setPaperReadinessStatus(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="READY_FOR_PAPER_REVIEW">Paper Review Candidate</MenuItem>
            <MenuItem value="WATCH_ONLY">Watch Only</MenuItem>
            <MenuItem value="BLOCKED">Blocked</MenuItem>
            <MenuItem value="INSUFFICIENT_DATA">Insufficient Data</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Backtest Proof</InputLabel>
          <Select label="Backtest Proof" value={backtestTimeframe} onChange={(event) => { setBacktestTimeframe(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['1Y', '3Y', '5Y', '10Y', '15Y'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Rating</InputLabel>
          <Select label="Rating" value={strategyRating} onChange={(event) => { setStrategyRating(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['EXCELLENT', 'GOOD', 'AVERAGE', 'WEAK', 'UNPROVEN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Proof Label</InputLabel>
          <Select label="Proof Label" value={readinessLabel} onChange={(event) => { setReadinessLabel(event.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['PAPER_TEST_CANDIDATE', 'WATCHLIST_CANDIDATE', 'RESEARCH_ONLY', 'NOT_AUTOMATION_READY'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Latest Plans" />
        </Tabs>
      </Box>

      {tab === 0 && (
         <Box>
            <TradePlanTable 
              plans={plans} 
              loading={loading}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(0);
              }}
              onSortChange={(newSortBy, newSortDir) => {
                setSortBy(newSortBy);
                setSortDirection(newSortDir);
                setPage(0);
              }}
              emptyMessage={`No trade plans found for ${scope.region}/${scope.assetType}. Run Generate Plans after Strategy Decision has review candidates, or loosen the readiness/proof filters.`}
            />
         </Box>
      )}
    </Box>
  );
};
