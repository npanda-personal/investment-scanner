import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchSignalHistory, fetchSignalOutcomes, recalculateSignalQuality } from '../api/signalQualityLabService';
import { useSignalQualityLab } from '../hooks';
import type { QualityHorizon, QualityMetricGroup, SignalHistoryItem, SignalOutcomeSet, SignalTypePerformance } from '../types';

const horizons: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
const percent = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(2)}%`;
const number = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : value.toLocaleString();

const MetricCard: React.FC<{ label: string; value: string; tone?: 'success' | 'warning' | 'error' }> = ({ label, value, tone }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5" color={tone ? `${tone}.main` : 'text.primary'} sx={{ mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const MetricTable: React.FC<{ title: string; rows: (QualityMetricGroup | SignalTypePerformance)[]; nameKey?: 'group' | 'signalType' }> = ({ title, rows, nameKey = 'group' }) => (
  <Paper sx={{ p: 2, overflowX: 'auto' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    {rows.length === 0 ? (
      <Typography color="text.secondary">No evaluated samples yet. Generate older signals and keep price history current to measure this view.</Typography>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Samples</TableCell>
            <TableCell>Win Rate</TableCell>
            <TableCell>Avg Return</TableCell>
            <TableCell>Median</TableCell>
            <TableCell>Best</TableCell>
            <TableCell>Worst</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, 10).map((row: any) => (
            <TableRow key={`${row[nameKey]}-${row.horizon}`}>
              <TableCell>{row[nameKey]} {row.sampleSize < 5 && <Chip size="small" label="small sample" color="warning" variant="outlined" />}</TableCell>
              <TableCell>{row.sampleSize}</TableCell>
              <TableCell>{percent(row.winRate)}</TableCell>
              <TableCell>{percent(row.averageForwardReturn)}</TableCell>
              <TableCell>{percent(row.medianForwardReturn)}</TableCell>
              <TableCell>{percent(row.bestReturn)}</TableCell>
              <TableCell>{percent(row.worstReturn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
);

const SignalQualityLabPage: React.FC = () => {
  const [horizon, setHorizon] = useState<QualityHorizon>('20D');
  const [instrumentId, setInstrumentId] = useState('');
  const [history, setHistory] = useState<SignalHistoryItem[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcomeSet[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { summary, byType, bySector, byRegime, noisy, loading, error, reload } = useSignalQualityLab(horizon);

  const loadInstrument = async () => {
    setFormError(null);
    try {
      const [nextHistory, nextOutcomes] = await Promise.all([
        fetchSignalHistory(instrumentId),
        fetchSignalOutcomes(instrumentId),
      ]);
      setHistory(nextHistory);
      setOutcomes(nextOutcomes);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to load instrument history');
    }
  };

  const recalculate = async () => {
    const result = await recalculateSignalQuality();
    setActionMessage(result.message);
    await reload();
  };

  if (loading && !summary) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Signal Quality Lab</Typography>
          <Typography color="text.secondary">Historical signal measurement. Outcomes describe past forward returns, not predictions or trading advice.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" label="Horizon" value={horizon} onChange={(event) => setHorizon(event.target.value as QualityHorizon)}>
            {horizons.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <Button variant="outlined" onClick={recalculate}>Recalculate</Button>
        </Stack>
      </Stack>

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {actionMessage && <Alert severity="info" sx={{ mb: 2 }}>{actionMessage}</Alert>}

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <MetricCard label="Total Signals" value={number(summary.totalSignals)} />
          <MetricCard label="Evaluated Signals" value={number(summary.evaluatedSignals)} />
          <MetricCard label="Bullish Win Rate" value={percent(summary.overallBullishWinRate)} tone="success" />
          <MetricCard label="Bearish Win Rate" value={percent(summary.overallBearishWinRate)} tone="warning" />
          <MetricCard label="Average 5D Return" value={percent(summary.average5DReturn)} />
          <MetricCard label="Average 20D Return" value={percent(summary.average20DReturn)} />
          <MetricCard label="Noisy Signals" value={number(summary.noisySignalCount)} tone={summary.noisySignalCount > 0 ? 'warning' : undefined} />
          <MetricCard label="Data Status" value={summary.dataStatus} />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <MetricTable title="Performance by Signal Type" rows={byType} nameKey="signalType" />
        <MetricTable title="Performance by Sector" rows={bySector} />
        <MetricTable title="Performance by Regime" rows={byRegime} />
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Noisy Signals</Typography>
          {noisy.length === 0 ? (
            <Typography color="text.secondary">No noisy signal patterns detected for the selected horizon.</Typography>
          ) : (
            <Stack spacing={1}>
              {noisy.slice(0, 12).map((item, index) => (
                <Paper key={`${item.instrumentId}-${item.issueType}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Button component={Link} to={item.researchUrl} size="small">{item.symbol}</Button>
                    <Chip size="small" label={item.severity} color={item.severity === 'HIGH' ? 'error' : item.severity === 'MEDIUM' ? 'warning' : 'default'} />
                  </Stack>
                  <Typography variant="body2" fontWeight={600}>{item.issueType}</Typography>
                  <Typography color="text.secondary" variant="body2">{item.description}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Instrument Signal History</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField label="Instrument ID" size="small" value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)} fullWidth />
          <Button variant="contained" onClick={loadInstrument} disabled={!instrumentId.trim()}>Load</Button>
        </Stack>
        {history.length === 0 ? (
          <Typography color="text.secondary">Enter a Market Data Foundation instrument ID to review signal history and forward outcomes.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Selected Outcome</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => {
                const outcome = outcomes.find((entry) => entry.signalResultId === item.signalResultId)?.outcomes.find((entry) => entry.horizon === horizon);
                return (
                  <TableRow key={item.signalResultId}>
                    <TableCell>{new Date(item.generated_at).toLocaleString()}</TableCell>
                    <TableCell><Button component={Link} to={item.researchUrl} size="small">{item.symbol}</Button></TableCell>
                    <TableCell>{item.score}</TableCell>
                    <TableCell>{item.direction}</TableCell>
                    <TableCell>{item.confidence}</TableCell>
                    <TableCell>{item.modelVersion || 'signal-engine-v1'}</TableCell>
                    <TableCell>{outcome?.available ? percent(outcome.forwardReturnPercent) : 'Insufficient future data'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default SignalQualityLabPage;
