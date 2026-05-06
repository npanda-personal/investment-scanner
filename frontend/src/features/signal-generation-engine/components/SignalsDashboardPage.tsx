import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material';
import { fetchSignalScreener, fetchTopSignals, runSignals } from '../api/signalGenerationEngineService';
import type { SignalConfidence, SignalDirection, SignalResult } from '../types';
import { MarketRegimeWidget } from '@/features/market-context-intelligence';
import { Link } from 'react-router-dom';
import { SignalTable } from './SignalTable';
import { FilterBar, PageHeader, type SortDirection } from '@/shared/components';
import { FactCheckOutlined } from '@mui/icons-material';
import { useMarketScope } from '@/contexts/MarketScopeContext';

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
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
  const [runLimit, setRunLimit] = useState('25');
  const [useDataQualityFilter, setUseDataQualityFilter] = useState(false);
  const [runIncludeStrategyMatches, setRunIncludeStrategyMatches] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const limit = pageSizeByTab[activeTab];
    const offset = pageByTab[activeTab] * limit;

    let fetchPromise;
    const strategyParams = {
      includeStrategyMatches: true,
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
        setTotalCount(response.total);
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load signals'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab, pageByTab[activeTab], pageSizeByTab[activeTab], sortBy, sortDirection, direction, minScore, sector, country, confidence, signalType, search, strategyCode, onlyStrategyEligible, excludeNoiseFiltered, hasBlockedStrategies, scope.region, scope.assetType]);

  useEffect(() => {
    // Reset pages when scope changes
    setPageByTab({ bullish: 0, bearish: 0, neutral: 0, momentum: 0, recent: 0, screener: 0 });
  }, [scope.region, scope.assetType]);

  const runManualSignals = () => {
    setRunning(true);
    setError(null);
    setRunMessage(null);
    runSignals({ 
      limit: Number(runLimit) || 25, 
      useDataQualityFilter, 
      minSignalReadinessScore: 70,
      region: scope.region,
      assetType: scope.assetType,
      includeStrategyMatches: runIncludeStrategyMatches,
      strategyCode: strategyCode || undefined,
      onlyStrategyEligible: onlyStrategyEligible || undefined,
      excludeNoiseFiltered: excludeNoiseFiltered || undefined,
    })
      .then((result) => {
        const dq = result.dataQuality;
        setRunMessage(dq?.filterApplied
          ? `Generated ${result.generated}; skipped ${result.skipped}. Data quality excluded ${dq.excludedByDataQuality}, missing evaluations ${dq.missingQualityEvaluationCount}.`
          : `Generated ${result.generated}; skipped ${result.skipped}.`);
        load();
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to run signals'))
      .finally(() => setRunning(false));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Generation Engine"
        subtitle="Raw bullish, neutral, and bearish confirmation inputs with Strategy Framework match context."
        primaryAction={<Button variant="contained" onClick={runManualSignals} disabled={running}>{running ? 'Running...' : 'Run Signals'}</Button>}
        secondaryActions={
          <>
          <TextField size="small" label="Run limit" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 110 }} />
          <FormControlLabel
            control={<Checkbox checked={useDataQualityFilter} onChange={(event) => setUseDataQualityFilter(event.target.checked)} />}
            label="Use data quality filter"
          />
          <FormControlLabel
            control={<Checkbox checked={runIncludeStrategyMatches} onChange={(event) => setRunIncludeStrategyMatches(event.target.checked)} />}
            label="Attach strategy matches"
          />
          <Button component={Link} to="/signals/quality" variant="outlined">View Signal Quality Lab</Button>
          <Button component={Link} to="/strategy" variant="outlined" startIcon={<FactCheckOutlined />}>View Strategy Decisions</Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {runMessage && <Alert severity="info" sx={{ mb: 2 }}>{runMessage}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Raw signals are confirmation inputs. Use Strategy Decision for candidate review and risk context.
        </Typography>
      </Alert>

      <MarketRegimeWidget />

      {activeTab === 'screener' && (
        <Box sx={{ mb: 3 }}>
          <FilterBar onReset={() => { setDirection(''); setMinScore('60'); setSector(''); setCountry(''); setConfidence(''); setSignalType(''); setSearch(''); setStrategyCode(''); setOnlyStrategyEligible(false); setExcludeNoiseFiltered(false); setHasBlockedStrategies(false); }}>
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
        <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
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
      />
    </Box>
  );
};

export default SignalsDashboardPage;
