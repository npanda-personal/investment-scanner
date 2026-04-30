import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { fetchCalibrationComparison, runSignalCalibration } from '../api/signalCalibrationEngineService';
import { useSignalCalibrationEngine } from '../hooks';
import type { CalibrationComparison, SignalCalibrationResult } from '../types';
import { InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';

const delta = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const DEFAULT_BATCH_SIZE = 25;

const DirectionChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={value} color={value === 'BULLISH' ? 'success' : value === 'BEARISH' ? 'error' : 'default'} />
);

const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5">{value}</Typography>
  </Paper>
);

const TopTable: React.FC<{ rows: SignalCalibrationResult[] }> = ({ rows }) => (
  <Paper sx={{ p: 2, overflowX: 'auto' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Top Calibrated Signals</Typography>
    {rows.length === 0 ? (
      <Typography color="text.secondary">No calibrated signals yet. Run calibration to populate this view.</Typography>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Raw</TableCell>
            <TableCell>Calibrated</TableCell>
            <TableCell>Delta</TableCell>
            <TableCell>Direction</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Top Boost</TableCell>
            <TableCell>Top Penalty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id || row.instrumentId} hover>
              <TableCell><Button component={Link} to={row.researchUrl} size="small">{row.symbol}</Button></TableCell>
              <TableCell>{row.rawScore}</TableCell>
              <TableCell>{row.calibratedScore}</TableCell>
              <TableCell><Chip size="small" label={delta(row.scoreDelta)} color={row.scoreDelta > 0 ? 'success' : row.scoreDelta < 0 ? 'warning' : 'default'} /></TableCell>
              <TableCell><DirectionChip value={row.calibratedDirection} /></TableCell>
              <TableCell>{row.calibratedConfidence}</TableCell>
              <TableCell>{row.boosts[0]?.label || 'None'}</TableCell>
              <TableCell>{row.penalties[0]?.label || 'None'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
);

const SignalCalibrationEnginePage: React.FC = () => {
  const { top, model, health, loading, error, reload } = useSignalCalibrationEngine();
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [runLimit, setRunLimit] = useState('25');
  const [comparison, setComparison] = useState<CalibrationComparison | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const summary = useMemo(() => {
    const upgraded = top.filter((item) => item.scoreDelta > 0).length;
    const downgraded = top.filter((item) => item.scoreDelta < 0).length;
    const avgDelta = top.length ? top.reduce((sum, item) => sum + item.scoreDelta, 0) / top.length : 0;
    return {
      calibrated: health?.calibratedSignals ?? top.length,
      upgraded,
      downgraded,
      avgDelta: avgDelta.toFixed(1),
      highConfidence: top.filter((item) => item.calibratedConfidence === 'HIGH').length,
      dataGaps: top.reduce((sum, item) => sum + item.dataGaps.length, 0),
    };
  }, [health, top]);

  const run = async () => {
    setFormError(null);
    setActionMessage(null);
    setRunning(true);
    let offset = 0;
    let batch = 0;
    let calibratedTotal = 0;
    let failedTotal = 0;
    try {
      const batchSize = Number(runLimit) || DEFAULT_BATCH_SIZE;
      while (true) {
        const result = await runSignalCalibration({ batchSize, offset });
        batch += 1;
        calibratedTotal += result.calibratedCount;
        failedTotal += result.failedCount;
        setActionMessage(
          `Batch ${batch} complete. Processed ${Math.min(result.offset + result.processedCount, result.totalCount)} / ${result.totalCount} instruments. ` +
          `Calibrated ${result.calibratedCount}, skipped ${result.skippedCount}, failed ${result.failedCount}.`
        );
        await reload();
        if (!result.hasMore || result.nextOffset === null) {
          setActionMessage(`Calibration complete. Calibrated ${calibratedTotal} instruments with ${failedTotal} failures.`);
          break;
        }
        offset = result.nextOffset;
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to run calibration');
    } finally {
      setRunning(false);
    }
  };

  const compare = async () => {
    setFormError(null);
    try {
      setComparison(await fetchCalibrationComparison(selectedInstrument?.id || ''));
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to compare signal');
    }
  };

  if (loading && !model) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Calibration Engine"
        subtitle="Explainable historical calibration. Raw signal scores remain visible and unchanged."
        primaryAction={
          <Button
            variant="contained"
            onClick={run}
            disabled={running}
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {running ? 'Running' : 'Run Calibration'}
          </Button>
        }
        secondaryActions={
          <>
          <Button component={Link} to="/signals/quality" variant="outlined">Signal Quality Lab</Button>
          </>
        }
      />

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }}>{actionMessage}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>Calibration uses historical evidence and context snapshots. It is not a prediction or trading recommendation.</Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
        <MetricCard label="Calibrated Signals" value={summary.calibrated} />
        <MetricCard label="Avg Delta" value={summary.avgDelta} />
        <MetricCard label="Upgraded" value={summary.upgraded} />
        <MetricCard label="Downgraded" value={summary.downgraded} />
        <MetricCard label="High Confidence" value={summary.highConfidence} />
        <MetricCard label="Data Gaps" value={summary.dataGaps} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 3, mb: 3 }}>
        <TopTable rows={top} />
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Calibration Model Rules</Typography>
          {model ? (
            <Stack spacing={1}>
              <Chip label={model.calibrationModelVersion} color="primary" />
              <Typography variant="body2">Window: {model.qualityMetricWindow}, min sample size: {model.minSampleSize}</Typography>
              <Typography variant="body2">Delta caps: +/-{model.perAdjustmentDeltaCap} per adjustment, +/-{model.totalDeltaCap} total.</Typography>
              {model.rules.map((rule) => <Typography key={rule} variant="body2" color="text.secondary">- {rule}</Typography>)}
            </Stack>
          ) : <Typography color="text.secondary">Model details unavailable.</Typography>}
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Raw vs Calibrated Comparison</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <InstrumentSearchSelect value={selectedInstrument} onChange={setSelectedInstrument} />
          </Box>
          <TextField label="Batch size" size="small" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 120 }} />
          <Button variant="outlined" disabled={!selectedInstrument} onClick={compare}>Compare</Button>
        </Stack>
        {comparison ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Raw Signal</Typography>
              <Typography>{comparison.rawSignal.symbol}: {comparison.rawSignal.score} / {comparison.rawSignal.direction} / {comparison.rawSignal.confidence}</Typography>
              <Typography color="text.secondary" variant="body2">{comparison.rawSignal.explanation}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Calibrated Signal</Typography>
              <Typography>{comparison.calibratedSignal.calibratedScore} ({delta(comparison.calibratedSignal.scoreDelta)}) / {comparison.calibratedSignal.calibratedDirection} / {comparison.calibratedSignal.calibratedConfidence}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>Boosts: {comparison.calibratedSignal.boosts.map((item) => item.label).join('; ') || 'None'}</Typography>
              <Typography variant="body2">Penalties: {comparison.calibratedSignal.penalties.map((item) => item.label).join('; ') || 'None'}</Typography>
              {comparison.calibratedSignal.dataQuality && (
                <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                  <Typography variant="body2" fontWeight={700}>Data Quality</Typography>
                  <Typography variant="body2">
                    Coverage {comparison.calibratedSignal.dataQuality.coverageScore} {comparison.calibratedSignal.dataQuality.coverageStatus};
                    {' '}Readiness {comparison.calibratedSignal.dataQuality.signalReadinessScore} {comparison.calibratedSignal.dataQuality.signalReadinessStatus};
                    {' '}Liquidity {comparison.calibratedSignal.dataQuality.liquidityStatus}.
                  </Typography>
                  {comparison.calibratedSignal.dataQuality.readinessBlockers.length > 0 && (
                    <Typography color="text.secondary" variant="body2">Blockers: {comparison.calibratedSignal.dataQuality.readinessBlockers.join('; ')}</Typography>
                  )}
                </Paper>
              )}
              {comparison.calibratedSignal.dataGaps.length > 0 && <Typography color="text.secondary" variant="body2">Gaps: {comparison.calibratedSignal.dataGaps.join('; ')}</Typography>}
            </Paper>
          </Box>
        ) : <Typography color="text.secondary">Select an instrument to compare raw and calibrated outputs.</Typography>}
      </Paper>
    </Box>
  );
};

export default SignalCalibrationEnginePage;
