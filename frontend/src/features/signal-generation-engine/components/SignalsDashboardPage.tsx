import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { fetchLatestSignalRun, fetchSignalScreener, fetchTopSignals, runSignals } from '../api/signalGenerationEngineService';
import type { SignalConfidence, SignalDirection, SignalGenerationRunAudit, SignalResult, SignalRunResponse } from '../types';
import { MarketRegimeWidget } from '@/features/market-context-intelligence';
import { Link } from 'react-router-dom';
import { SignalTable } from './SignalTable';
import { BatchProgressBar, FilterBar, PageHeader, type SortDirection } from '@/shared/components';
import { useBatchRunner } from '@/shared/hooks';
import { FactCheckOutlined } from '@mui/icons-material';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  signal_generation_engine_batch_size,
  signal_generation_engine_batch_request_workers_count,
  signal_generation_engine_workers_count,
} from '../config';

type SignalTab = 'bullish' | 'bearish' | 'neutral' | 'momentum' | 'recent' | 'screener';

const tabs: Array<{ value: SignalTab; label: string }> = [
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'momentum', label: 'Momentum Leaders' },
  { value: 'recent', label: 'Recent' },
  { value: 'screener', label: 'Screener' },
];

const SignalsDashboardPage: React.FC = () => {
  const { scope } = useMarketScope();
  const batchRunner = useBatchRunner<SignalRunResponse>();
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [directionCounts, setDirectionCounts] = useState<Record<SignalDirection, number>>({ BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
  const [activeTab, setActiveTab] = useState<SignalTab>('bullish');
  const [pageByTab, setPageByTab] = useState<Record<SignalTab, number>>({ bullish: 0, bearish: 0, neutral: 0, momentum: 0, recent: 0, screener: 0 });
  const [pageSizeByTab, setPageSizeByTab] = useState<Record<SignalTab, number>>({ bullish: 25, bearish: 25, neutral: 25, momentum: 25, recent: 25, screener: 25 });
  const [sortBy, setSortBy] = useState('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [direction, setDirection] = useState<SignalDirection | ''>('');
  const [minScore, setMinScore] = useState('60');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [confidence, setConfidence] = useState<SignalConfidence | ''>('');
  const [signalType, setSignalType] = useState('');
  const [search, setSearch] = useState('');
  const [strategyCode, setStrategyCode] = useState('');
  const [onlyStrategyEligible, setOnlyStrategyEligible] = useState(false);
  const [excludeNoiseFiltered, setExcludeNoiseFiltered] = useState(false);
  const [hasBlockedStrategies, setHasBlockedStrategies] = useState(false);
  const [showStrategyContext, setShowStrategyContext] = useState(false);
  const [useDataQualityFilter, setUseDataQualityFilter] = useState(true);
  const [runIncludeStrategyMatches, setRunIncludeStrategyMatches] = useState(false);
  const [latestRun, setLatestRun] = useState<SignalGenerationRunAudit | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetPages = () => setPageByTab({ bullish: 0, bearish: 0, neutral: 0, momentum: 0, recent: 0, screener: 0 });

  const load = (forcedPage?: number) => {
    setLoading(true);
    setError(null);
    const limit = pageSizeByTab[activeTab];
    const offset = (forcedPage ?? pageByTab[activeTab]) * limit;

    let fetchPromise;
    const shouldLoadStrategyContext = showStrategyContext || Boolean(strategyCode) || onlyStrategyEligible || excludeNoiseFiltered || hasBlockedStrategies;
    const strategyParams = {
      includeStrategyMatches: shouldLoadStrategyContext || undefined,
      strategyCode: strategyCode || undefined,
      onlyStrategyEligible: onlyStrategyEligible || undefined,
      excludeNoiseFiltered: excludeNoiseFiltered || undefined,
      hasBlockedStrategies: hasBlockedStrategies || undefined,
    };
    const baseParams = { limit, offset, sortBy, sortDirection, region: scope.region, assetType: scope.assetType, ...strategyParams };

    switch (activeTab) {
      case 'bullish': fetchPromise = fetchTopSignals({ ...baseParams, direction: 'BULLISH' }); break;
      case 'bearish': fetchPromise = fetchTopSignals({ ...baseParams, direction: 'BEARISH' }); break;
      case 'neutral': fetchPromise = fetchTopSignals({ ...baseParams, direction: 'NEUTRAL' }); break;
      case 'momentum': fetchPromise = fetchSignalScreener({ ...baseParams, signalType: 'MOMENTUM', minScore: 60 }); break;
      case 'recent': fetchPromise = fetchTopSignals(baseParams); break;
      case 'screener': fetchPromise = fetchSignalScreener({
        ...baseParams,
        direction: direction || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        sector: sector || undefined,
        country: country || undefined,
        confidence: confidence || undefined,
        signalType: signalType || undefined,
        search: search || undefined,
      }); break;
    }

    fetchPromise
      .then((response) => {
        setSignals(response.signals);
        setTotalCount(response.totalCount ?? response.total);
        if (response.directionCounts) setDirectionCounts(response.directionCounts);
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load signals'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab, pageByTab[activeTab], pageSizeByTab[activeTab], sortBy, sortDirection, direction, minScore, sector, country, confidence, signalType, search, strategyCode, onlyStrategyEligible, excludeNoiseFiltered, hasBlockedStrategies, showStrategyContext, scope.region, scope.assetType]);

  useEffect(() => {
    // Reset pages when scope changes
    resetPages();
  }, [scope.region, scope.assetType]);

  useEffect(() => {
    fetchLatestSignalRun({ region: scope.region, assetType: scope.assetType, modelVersion: 'signal-engine-v1' })
      .then(setLatestRun)
      .catch(() => setLatestRun(null));
  }, [scope.region, scope.assetType]);

  useEffect(() => {
    resetPages();
  }, [direction, minScore, sector, country, confidence, signalType, search, strategyCode, onlyStrategyEligible, excludeNoiseFiltered, hasBlockedStrategies, showStrategyContext]);

  const runManualSignals = async () => {
    if (batchRunner.running) return;
    setError(null);
    setRunMessage(null);
    batchRunner.reset();
    try {
      const completedRun = await batchRunner.run({
        batchSize: signal_generation_engine_batch_size,
        parallelism: signal_generation_engine_batch_request_workers_count,
        runBatch: ({ offset, batchSize }) => runSignals({
          batchSize,
          limit: batchSize,
          offset,
          maxConcurrency: signal_generation_engine_workers_count,
          useDataQualityFilter,
          minSignalReadinessScore: 70,
          region: scope.region,
          assetType: scope.assetType,
          includeStrategyMatches: runIncludeStrategyMatches,
          strategyCode: strategyCode || undefined,
          onlyStrategyEligible: onlyStrategyEligible || undefined,
          excludeNoiseFiltered: excludeNoiseFiltered || undefined,
        }),
      });
      setPageByTab({ bullish: 0, bearish: 0, neutral: 0, momentum: 0, recent: 0, screener: 0 });
      const finalState = completedRun?.aggregate;
      const finalSummary = completedRun ? (completedRun as { finalSummary: SignalRunResponse | null }).finalSummary : null;
      if (finalSummary?.runAudit) setLatestRun(finalSummary.runAudit);
      setRunMessage(
        `Signal generation complete. Processed ${finalState?.processedCount ?? 0} instruments across ${finalState?.batchCount ?? 0} batches. ` +
        `Generated ${finalState?.generatedCount ?? 0}, updated ${finalState?.updatedCount ?? 0}, unchanged ${finalState?.noOpCount ?? 0}, skipped ${finalState?.skippedCount ?? 0}, failed ${finalState?.failedCount ?? 0}.`
      );
      load(0);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run signals');
    }
  };

  const tabLabel = (tab: { value: SignalTab; label: string }) => {
    if (tab.value === 'bullish') return `${tab.label} (${directionCounts.BULLISH})`;
    if (tab.value === 'bearish') return `${tab.label} (${directionCounts.BEARISH})`;
    if (tab.value === 'neutral') return `${tab.label} (${directionCounts.NEUTRAL})`;
    if (tab.value === 'recent') return `${tab.label} (${directionCounts.BULLISH + directionCounts.BEARISH + directionCounts.NEUTRAL})`;
    return tab.label;
  };

  const emptyMessage = () => {
    const selectedDirection = activeTab === 'bullish' ? 'BULLISH' : activeTab === 'bearish' ? 'BEARISH' : activeTab === 'neutral' ? 'NEUTRAL' : null;
    const otherTotal = directionCounts.BULLISH + directionCounts.BEARISH + directionCounts.NEUTRAL - (selectedDirection ? directionCounts[selectedDirection] : 0);
    if (selectedDirection && directionCounts[selectedDirection] === 0 && otherTotal > 0) {
      return `No ${selectedDirection.toLowerCase()} signals found for ${scope.region} / ${scope.assetType}. Generated signals exist in other directions: Neutral ${directionCounts.NEUTRAL}, Bearish ${directionCounts.BEARISH}, Bullish ${directionCounts.BULLISH}.`;
    }
    if (batchRunner.complete) return 'Signal generation completed, but no rows match the current filters. Reset filters or check run diagnostics.';
    return `No signals match this view for ${scope.region} / ${scope.assetType}.`;
  };

  return (
    <Box className="page-container page-container--workspace" sx={{ minWidth: 0 }}>
      <PageHeader
        title="Signal Generation Engine"
        subtitle="Raw bullish, neutral, and bearish confirmation inputs with Strategy Framework match context."
      />

      <Paper sx={{ p: 2, mb: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            maxWidth: '100%',
            '& .MuiFormControlLabel-root': { flex: { xs: '1 1 220px', md: '0 1 auto' }, minWidth: 0, mr: 0 },
            '& .MuiFormControlLabel-label': { whiteSpace: 'normal' },
            '& .MuiButton-root': { flex: { xs: '1 1 180px', md: '0 1 auto' }, minWidth: 0 },
          }}
        >
          <FormControlLabel
            control={<Checkbox checked={useDataQualityFilter} onChange={(event) => setUseDataQualityFilter(event.target.checked)} />}
            label="Use data quality filter"
          />
          <FormControlLabel
            control={<Checkbox checked={runIncludeStrategyMatches} onChange={(event) => setRunIncludeStrategyMatches(event.target.checked)} />}
            label="Attach strategy matches"
          />
          <FormControlLabel
            control={<Checkbox checked={showStrategyContext} onChange={(event) => setShowStrategyContext(event.target.checked)} />}
            label="Show strategy context"
          />
          <Button variant="contained" onClick={runManualSignals} disabled={batchRunner.running} startIcon={batchRunner.running ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {batchRunner.running ? 'Running...' : 'Run Signals'}
          </Button>
          <Button component={Link} to="/signals/quality" variant="outlined">View Signal Quality Lab</Button>
          <Button component={Link} to="/strategy" variant="outlined" startIcon={<FactCheckOutlined />}>View Strategy Decisions</Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {runMessage && <Alert severity="info" sx={{ mb: 2 }}>{runMessage}</Alert>}
      <BatchProgressBar
        running={batchRunner.running}
        complete={batchRunner.complete}
        label={`${batchRunner.complete ? 'Signal generation complete for' : 'Running signal generation for'} ${scope.region} / ${scope.assetType}`}
        processedCount={batchRunner.processedCount}
        totalCount={batchRunner.totalCount}
        batchCount={batchRunner.batchCount}
        estimatedBatchTotal={batchRunner.totalCount ? Math.ceil(batchRunner.totalCount / signal_generation_engine_batch_size) : undefined}
        generatedCount={batchRunner.generatedCount}
        updatedCount={batchRunner.updatedCount}
        skippedCount={batchRunner.skippedCount}
        failedCount={batchRunner.failedCount}
        warningsCount={batchRunner.warnings.length}
        error={batchRunner.error}
      />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="overline" color="text.secondary">Latest Run Audit</Typography>
            <Typography variant="h6" fontWeight={700}>
              {latestRun ? `${latestRun.scope.region} / ${latestRun.scope.assetType}` : `${scope.region} / ${scope.assetType}`}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={latestRun?.status || 'No run'} color={latestRun?.status === 'FAILED' ? 'error' : latestRun?.status === 'PARTIAL' ? 'warning' : 'default'} />
              <Chip size="small" variant="outlined" label={`Model ${latestRun?.modelVersion || 'signal-engine-v1'}`} />
              <Chip size="small" variant="outlined" label={`Ruleset ${latestRun?.rulesetVersion || 'signal-engine-v1'}`} />
              <Chip size="small" variant="outlined" label={`Source ${latestRun?.sourceDataDate ? new Date(latestRun.sourceDataDate).toLocaleDateString() : 'N/A'}`} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ maxWidth: { md: 720 } }}>
            {[
              ['Batch', latestRun?.batchSize],
              ['Generated', latestRun?.generatedCount],
              ['Updated', latestRun?.updatedCount],
              ['No-op', latestRun?.noOpCount],
              ['Skipped', latestRun?.skippedCount],
              ['Failed', latestRun?.failedCount],
              ['DQ excluded', latestRun?.excludedByDataQuality],
              ['Missing DQ', latestRun?.missingQualityEvaluationCount],
              ['Duration ms', latestRun?.durationMs],
            ].map(([label, value]) => (
              <Chip key={label} size="small" variant="outlined" label={`${label}: ${value ?? 0}`} />
            ))}
          </Stack>
        </Stack>
      </Paper>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Raw signals are confirmation inputs. Use Strategy Decision for candidate review and risk context.
        </Typography>
      </Alert>

      <MarketRegimeWidget />

      {activeTab === 'screener' && (
        <Box sx={{ mb: 3 }}>
          <FilterBar onReset={() => { setDirection(''); setMinScore('60'); setSector(''); setCountry(''); setConfidence(''); setSignalType(''); setSearch(''); setStrategyCode(''); setOnlyStrategyEligible(false); setExcludeNoiseFiltered(false); setHasBlockedStrategies(false); setShowStrategyContext(false); }}>
            <TextField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
            <TextField select label="Direction" value={direction} onChange={(event) => setDirection(event.target.value as SignalDirection | '')}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="BULLISH">Bullish</MenuItem>
              <MenuItem value="NEUTRAL">Neutral</MenuItem>
              <MenuItem value="BEARISH">Bearish</MenuItem>
            </TextField>
            <TextField select label="Confidence" value={confidence} onChange={(event) => setConfidence(event.target.value as SignalConfidence | '')}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </TextField>
            <TextField label="Min score" value={minScore} onChange={(event) => setMinScore(event.target.value)} />
            <TextField label="Signal type" value={signalType} onChange={(event) => setSignalType(event.target.value)} />
            <TextField label="Sector" value={sector} onChange={(event) => setSector(event.target.value)} />
            <TextField label="Country" value={country} onChange={(event) => setCountry(event.target.value)} />
            <TextField select label="Strategy" value={strategyCode} onChange={(event) => setStrategyCode(event.target.value)}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="TREND_MOMENTUM">Trend Momentum</MenuItem>
              <MenuItem value="PULLBACK_IN_UPTREND">Pullback In Uptrend</MenuItem>
              <MenuItem value="DEFENSIVE_EXIT">Defensive Exit</MenuItem>
            </TextField>
            <FormControlLabel control={<Checkbox checked={onlyStrategyEligible} onChange={(event) => setOnlyStrategyEligible(event.target.checked)} />} label="Only strategy-eligible" />
            <FormControlLabel control={<Checkbox checked={excludeNoiseFiltered} onChange={(event) => setExcludeNoiseFiltered(event.target.checked)} />} label="Exclude noise-filtered" />
            <FormControlLabel control={<Checkbox checked={hasBlockedStrategies} onChange={(event) => setHasBlockedStrategies(event.target.checked)} />} label="Has blocked strategies" />
          </FilterBar>
        </Box>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_event, value) => { setActiveTab(value); setPageByTab({ ...pageByTab, [value]: 0 }); }} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tabLabel(tab)} />)}
        </Tabs>
      </Paper>

      <SignalTable
        signals={signals}
        totalCount={totalCount}
        loading={loading}
        page={pageByTab[activeTab]}
        pageSize={pageSizeByTab[activeTab]}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(nextSortBy, nextDirection) => {
          setSortBy(nextSortBy);
          setSortDirection(nextDirection);
          setPageByTab({ ...pageByTab, [activeTab]: 0 });
        }}
        onPageChange={(nextPage) => setPageByTab({ ...pageByTab, [activeTab]: nextPage })}
        onPageSizeChange={(nextPageSize) => {
          setPageSizeByTab({ ...pageSizeByTab, [activeTab]: nextPageSize });
          setPageByTab({ ...pageByTab, [activeTab]: 0 });
        }}
        strategyContextLoaded={showStrategyContext || Boolean(strategyCode) || onlyStrategyEligible || excludeNoiseFiltered || hasBlockedStrategies}
        emptyMessage={emptyMessage()}
      />
    </Box>
  );
};

export default SignalsDashboardPage;
