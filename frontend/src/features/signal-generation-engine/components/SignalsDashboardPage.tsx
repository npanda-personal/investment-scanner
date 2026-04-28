import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { fetchSignalScreener, fetchTopSignals, runSignals } from '../api/signalGenerationEngineService';
import { SignalCard } from './SignalCard';
import type { SignalDirection, SignalResult } from '../types';
import { MarketRegimeWidget } from '@/features/market-context-intelligence';

const SignalSection: React.FC<{ title: string; signals: SignalResult[] }> = ({ title, signals }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    {signals.length === 0 ? (
      <Typography color="text.secondary">No signals generated yet.</Typography>
    ) : (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
        {signals.map((signal) => <SignalCard key={signal.id || `${signal.instrument_id}-${signal.generated_at}`} signal={signal} />)}
      </Box>
    )}
  </Paper>
);

const SignalsDashboardPage: React.FC = () => {
  const [bullish, setBullish] = useState<SignalResult[]>([]);
  const [bearish, setBearish] = useState<SignalResult[]>([]);
  const [momentum, setMomentum] = useState<SignalResult[]>([]);
  const [recent, setRecent] = useState<SignalResult[]>([]);
  const [screener, setScreener] = useState<SignalResult[]>([]);
  const [direction, setDirection] = useState<SignalDirection | ''>('');
  const [minScore, setMinScore] = useState('60');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [runLimit, setRunLimit] = useState('25');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTopSignals({ direction: 'BULLISH', limit: 6 }),
      fetchTopSignals({ direction: 'BEARISH', limit: 6 }),
      fetchSignalScreener({ signalType: 'MOMENTUM', minScore: 60, limit: 6 }),
      fetchTopSignals({ limit: 8 }),
      fetchSignalScreener({
        direction: direction || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        sector: sector || undefined,
        country: country || undefined,
        limit: 20,
      }),
    ])
      .then(([bullishSignals, bearishSignals, momentumSignals, recentSignals, screenerSignals]) => {
        setBullish(bullishSignals);
        setBearish(bearishSignals);
        setMomentum(momentumSignals);
        setRecent(recentSignals);
        setScreener(screenerSignals);
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load signals'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [direction, minScore, sector, country]);

  const runManualSignals = () => {
    setRunning(true);
    setError(null);
    runSignals({ limit: Number(runLimit) || 25 })
      .then(load)
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to run signals'))
      .finally(() => setRunning(false));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography variant="h4">Signal Generation Engine</Typography>
          <Typography color="text.secondary">Daily explainable bullish, neutral, and bearish stock signals.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="Run limit" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 110 }} />
          <Button variant="contained" onClick={runManualSignals} disabled={running}>{running ? 'Running...' : 'Run Signals'}</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <MarketRegimeWidget />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <TextField select label="Direction" value={direction} onChange={(event) => setDirection(event.target.value as SignalDirection | '')}>
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="BULLISH">Bullish</MenuItem>
            <MenuItem value="NEUTRAL">Neutral</MenuItem>
            <MenuItem value="BEARISH">Bearish</MenuItem>
          </TextField>
          <TextField label="Min score" value={minScore} onChange={(event) => setMinScore(event.target.value)} />
          <TextField label="Sector" value={sector} onChange={(event) => setSector(event.target.value)} />
          <TextField label="Country" value={country} onChange={(event) => setCountry(event.target.value)} />
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 3 }}>
            <SignalSection title="Top Bullish Signals" signals={bullish} />
            <SignalSection title="Top Bearish Signals" signals={bearish} />
            <SignalSection title="Momentum Leaders" signals={momentum} />
            <SignalSection title="Recently Generated Signals" signals={recent} />
          </Box>
          <SignalSection title="Screener Results" signals={screener} />
        </Box>
      )}
    </Box>
  );
};

export default SignalsDashboardPage;
