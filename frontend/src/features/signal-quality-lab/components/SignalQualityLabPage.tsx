import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { 
  VisibilityOutlined, 
  LaunchOutlined 
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { fetchSignalHistory, fetchSignalOutcomes, recalculateSignalQuality } from '../api/signalQualityLabService';
import { useSignalQualityLab } from '../hooks';
import { InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import type { QualityFilters, QualityHorizon, QualityMetricGroup, SignalHistoryItem, SignalOutcomeSet, SignalTypePerformance } from '../types';

const horizons: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
const DEFAULT_BATCH_SIZE = 25;
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
  const [filters, setFilters] = useState<QualityFilters>({});
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [history, setHistory] = useState<SignalHistoryItem[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcomeSet[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const { summary, byType, bySector, byRegime, byDataQuality, noisy, loading, error, reload } = useSignalQualityLab(horizon, filters);

  const loadInstrument = async () => {
    setFormError(null);
    try {
      const [nextHistory, nextOutcomes] = await Promise.all([
        fetchSignalHistory(selectedInstrument?.id || ''),
        fetchSignalOutcomes(selectedInstrument?.id || ''),
      ]);
      setHistory(nextHistory);
      setOutcomes(nextOutcomes);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to load instrument history');
    }
  };

  const recalculate = async () => {
    setFormError(null);
    setActionMessage(null);
    setRecalculating(true);
    let offset = 0;
    let batch = 0;
    let processedTotal = 0;
    try {
      while (true) {
        const result = await recalculateSignalQuality({ batchSize: DEFAULT_BATCH_SIZE, offset });
        batch += 1;
        processedTotal = result.offset + result.processedCount;
        setActionMessage(
          `Batch ${batch} complete. Processed ${Math.min(processedTotal, result.totalCount)} / ${result.totalCount} signal records. ` +
          `Skipped ${result.skipped}. Warnings: ${result.warnings.length}.`
        );
        await reload();
        if (!result.hasMore || result.nextOffset === null) {
          setActionMessage(`Signal quality recalculation complete. Processed ${Math.min(processedTotal, result.totalCount)} / ${result.totalCount} signal records.`);
          break;
        }
        offset = result.nextOffset;
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Signal quality recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && !summary) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Quality Lab"
        subtitle="Historical signal measurement. Outcomes describe past forward returns, not predictions or trading advice."
        primaryAction={
          <Button
            variant="outlined"
            onClick={recalculate}
            disabled={recalculating}
            startIcon={recalculating ? <CircularProgress size={16} /> : undefined}
          >
            {recalculating ? 'Recalculating' : 'Recalculate'}
          </Button>
        }
        secondaryActions={
          <>
          <TextField select size="small" label="Horizon" value={horizon} onChange={(event) => setHorizon(event.target.value as QualityHorizon)}>
            {horizons.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <Button component={Link} to="/signals/calibration" variant="outlined">Calibration Engine</Button>
          </>
        }
      />

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {actionMessage && <Alert severity="info" sx={{ mb: 2 }}>{actionMessage}</Alert>}
      {summary?.dataQualityFilterSummary?.filterApplied && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Data quality filter applied: {summary.dataQualityFilterSummary.totalSignalsAfterFilter} / {summary.dataQualityFilterSummary.totalSignalsBeforeFilter} signals included,
          excluded {summary.dataQualityFilterSummary.excludedByDataQuality}, missing evaluations {summary.dataQualityFilterSummary.missingQualityEvaluationCount}.
        </Alert>
      )}
      {summary && summary.totalSignals === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No signal results are available for quality measurement yet. Run Signal Generation first, then rerun this page after enough future price data exists.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Readiness" value={filters.readinessStatus || ''} onChange={(event) => setFilters({ ...filters, readinessStatus: event.target.value as any })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['READY', 'LIMITED', 'NOT_READY'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Coverage" value={filters.coverageStatus || ''} onChange={(event) => setFilters({ ...filters, coverageStatus: event.target.value as any })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Liquidity" value={filters.liquidityStatus || ''} onChange={(event) => setFilters({ ...filters, liquidityStatus: event.target.value as any })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Checkbox checked={Boolean(filters.onlySignalReady)} onChange={(event) => setFilters({ ...filters, onlySignalReady: event.target.checked })} />} label="Only signal-ready" />
          <FormControlLabel control={<Checkbox checked={Boolean(filters.excludePoorQuality)} onChange={(event) => setFilters({ ...filters, excludePoorQuality: event.target.checked })} />} label="Exclude poor quality" />
        </Stack>
      </Paper>

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
        <MetricTable title="Performance by Data Quality" rows={byDataQuality} />
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Noisy Signals</Typography>
          {noisy.length === 0 ? (
            <Typography color="text.secondary">No noisy signal patterns detected for the selected horizon.</Typography>
          ) : (
            <Stack spacing={1}>
              {noisy.slice(0, 12).map((item, index) => (
                <Paper key={`${item.instrumentId}-${item.issueType}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title="View Research" arrow>
                        <IconButton size="small" component={Link} to={item.researchUrl}>
                          <VisibilityOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight={700}>{item.symbol}</Typography>
                    </Box>
                    <Chip size="small" label={item.severity} color={item.severity === 'HIGH' ? 'error' : item.severity === 'MEDIUM' ? 'warning' : 'default'} />
                  </Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>{item.issueType}</Typography>
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
          <Box sx={{ flex: 1 }}>
            <InstrumentSearchSelect value={selectedInstrument} onChange={setSelectedInstrument} />
          </Box>
          <Button variant="contained" onClick={loadInstrument} disabled={!selectedInstrument}>Load</Button>
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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => {
                const outcome = outcomes.find((entry) => entry.signalResultId === item.signalResultId)?.outcomes.find((entry) => entry.horizon === horizon);
                return (
                  <TableRow key={item.signalResultId}>
                    <TableCell>{new Date(item.generated_at).toLocaleString()}</TableCell>
                    <TableCell><Typography variant="body2" fontWeight={700}>{item.symbol}</Typography></TableCell>
                    <TableCell>{item.score}</TableCell>
                    <TableCell>{item.direction}</TableCell>
                    <TableCell>{item.confidence}</TableCell>
                    <TableCell>{item.modelVersion || 'signal-engine-v1'}</TableCell>
                    <TableCell>{outcome?.available ? percent(outcome.forwardReturnPercent) : 'Insufficient future data'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open Research" arrow>
                        <IconButton size="small" component={Link} to={item.researchUrl}>
                          <VisibilityOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
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
