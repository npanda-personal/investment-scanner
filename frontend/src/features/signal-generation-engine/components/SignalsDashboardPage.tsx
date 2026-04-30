import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Tab, Tabs, TextField } from '@mui/material';
import { fetchSignalScreener, fetchTopSignals, runSignals } from '../api/signalGenerationEngineService';
import type { SignalConfidence, SignalDirection, SignalResult } from '../types';
import { MarketRegimeWidget } from '@/features/market-context-intelligence';
import { Link } from 'react-router-dom';
import { SignalTable } from './SignalTable';
import { FilterBar, PageHeader, type SortDirection } from '@/shared/components';

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
  const [bullish, setBullish] = useState<SignalResult[]>([]);
  const [bearish, setBearish] = useState<SignalResult[]>([]);
  const [momentum, setMomentum] = useState<SignalResult[]>([]);
  const [recent, setRecent] = useState<SignalResult[]>([]);
  const [screener, setScreener] = useState<SignalResult[]>([]);
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
  const [runLimit, setRunLimit] = useState('25');
  const [useDataQualityFilter, setUseDataQualityFilter] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTopSignals({ direction: 'BULLISH', limit: 100 }),
      fetchTopSignals({ direction: 'BEARISH', limit: 100 }),
      fetchTopSignals({ direction: 'NEUTRAL', limit: 100 }),
      fetchSignalScreener({ signalType: 'MOMENTUM', minScore: 60, limit: 100 }),
      fetchTopSignals({ limit: 100 }),
      fetchSignalScreener({
        direction: direction || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        sector: sector || undefined,
        country: country || undefined,
        confidence: confidence || undefined,
        signalType: signalType || undefined,
        search: search || undefined,
        limit: 100,
      }),
    ])
      .then(([bullishSignals, bearishSignals, neutralSignals, momentumSignals, recentSignals, screenerSignals]) => {
        setBullish(bullishSignals);
        setBearish(bearishSignals);
        setNeutral(neutralSignals);
        setMomentum(momentumSignals);
        setRecent(recentSignals);
        setScreener(screenerSignals);
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load signals'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [direction, minScore, sector, country, confidence, signalType, search]);

  const runManualSignals = () => {
    setRunning(true);
    setError(null);
    setRunMessage(null);
    runSignals({ limit: Number(runLimit) || 25, useDataQualityFilter, minSignalReadinessScore: 70 })
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

  const [neutral, setNeutral] = useState<SignalResult[]>([]);
  const activeSignals = {
    bullish,
    bearish,
    neutral,
    momentum,
    recent,
    screener,
  }[activeTab];

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Generation Engine"
        subtitle="Daily explainable bullish, neutral, and bearish stock signals."
        primaryAction={<Button variant="contained" onClick={runManualSignals} disabled={running}>{running ? 'Running...' : 'Run Signals'}</Button>}
        secondaryActions={
          <>
          <TextField size="small" label="Run limit" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 110 }} />
          <FormControlLabel
            control={<Checkbox checked={useDataQualityFilter} onChange={(event) => setUseDataQualityFilter(event.target.checked)} />}
            label="Use data quality filter"
          />
          <Button component={Link} to="/signals/quality" variant="outlined">View Signal Quality Lab</Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {runMessage && <Alert severity="info" sx={{ mb: 2 }}>{runMessage}</Alert>}

      <MarketRegimeWidget />

      <Box sx={{ mb: 3 }}>
        <FilterBar onReset={() => { setDirection(''); setMinScore('60'); setSector(''); setCountry(''); setConfidence(''); setSignalType(''); setSearch(''); }}>
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
        </FilterBar>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
        </Tabs>
      </Paper>

      <SignalTable
        signals={activeSignals}
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
