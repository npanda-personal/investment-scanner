import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Tab, Tabs, FormControlLabel, Switch, FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { TradePlanApi } from '../api';
import { TradePlanTable } from './TradePlanTable';
import { TradePlanResultDto } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { SortDirection } from '@/shared/components/DataTable';

export const TradePlanDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TradePlanResultDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [paperReadyOnly, setPaperReadyOnly] = useState(false);
  const [paperReadinessStatus, setPaperReadinessStatus] = useState('');
  const [backtestTimeframe, setBacktestTimeframe] = useState('');
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

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    setBatchSummary(null);
    try {
      const batchSize = 25;
      const workerCount = 3;
      const first = await TradePlanApi.batchGenerate({ region: scope.region, assetType: scope.assetType, batchSize, offset: 0 });
      const totals = {
        generated: first.generatedCount,
        failed: first.failedCount || 0,
        processed: first.candidateCount || first.count || 0,
        requests: 1,
      };

      const offsets: number[] = [];
      for (let offset = batchSize; offset < (first.totalCount || 0); offset += batchSize) {
        offsets.push(offset);
      }

      let nextOffsetIndex = 0;
      const runWorker = async () => {
        while (nextOffsetIndex < offsets.length) {
          const offset = offsets[nextOffsetIndex];
          nextOffsetIndex += 1;
          const result = await TradePlanApi.batchGenerate({ region: scope.region, assetType: scope.assetType, batchSize, offset });
          totals.generated += result.generatedCount;
          totals.failed += result.failedCount || 0;
          totals.processed += result.candidateCount || result.count || 0;
          totals.requests += 1;
        }
      };

      await Promise.all(Array.from({ length: Math.min(workerCount, offsets.length) }, () => runWorker()));
      setBatchSummary(`Batch complete: ${totals.generated} generated, ${totals.failed} failed across ${totals.processed} candidates using ${totals.requests} requests.`);
      setPage(0);
      await fetchPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to batch generate plans');
    } finally {
      setBatchGenerating(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [scope.region, scope.assetType, page, pageSize, sortBy, sortDirection, paperReadyOnly, paperReadinessStatus, backtestTimeframe, strategyRating, readinessLabel]);

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Trade Plans</Typography>
        <Button variant="contained" onClick={handleBatchGenerate} disabled={batchGenerating}>
          {batchGenerating ? 'Generating...' : 'Batch Generate Plans'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {batchSummary && <Alert severity="success" sx={{ mb: 2 }}>{batchSummary}</Alert>}

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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select label="Timeframe" value={backtestTimeframe} onChange={(event) => { setBacktestTimeframe(event.target.value); setPage(0); }}>
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
            />
         </Box>
      )}
    </Box>
  );
};
