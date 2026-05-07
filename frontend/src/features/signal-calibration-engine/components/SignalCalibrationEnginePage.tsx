import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { VisibilityOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { fetchCalibrationComparison, runSignalCalibration } from '../api/signalCalibrationEngineService';
import { useSignalCalibrationEngine } from '../hooks';
import type { CalibrationComparison, SignalCalibrationResult } from '../types';
import { InstrumentSearchSelect, PageHeader, DataTable, type DataTableColumn } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';

const delta = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const DEFAULT_BATCH_SIZE = 25;

const DirectionChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={value} color={value === 'BULLISH' ? 'success' : value === 'BEARISH' ? 'error' : 'default'} />
);

const ConfidenceChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={value} color={value === 'HIGH' ? 'success' : value === 'MEDIUM' ? 'primary' : value === 'LOW' ? 'warning' : 'error'} />
);

const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5">{value}</Typography>
  </Paper>
);

const SignalCalibrationEnginePage: React.FC = () => {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  const { 
    data, model, health, loading, error, reload, 
    setPagination, setSorting, applySearch, applyFilters, changeHorizon, search, filters, horizon,
  } = useSignalCalibrationEngine();
  
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [runLimit, setRunLimit] = useState('25');
  const [comparison, setComparison] = useState<CalibrationComparison | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const summary = useMemo(() => {
    const items = data.items || [];
    const upgraded = items.filter((item) => item.scoreDelta > 0).length;
    const downgraded = items.filter((item) => item.scoreDelta < 0).length;
    const avgDelta = items.length ? items.reduce((sum, item) => sum + item.scoreDelta, 0) / items.length : 0;
    return {
      calibrated: health?.calibratedSignals ?? data.totalCount,
      upgraded,
      downgraded,
      avgDelta: avgDelta.toFixed(1),
      highConfidence: items.filter((item) => item.calibratedConfidence === 'HIGH').length,
      dataGaps: items.reduce((sum, item) => sum + item.dataGaps.length, 0),
    };
  }, [health, data]);

  const run = async () => {
    setFormError(null);
    setActionMessage(null);
    setRunning(true);
    let offset = 0;
    let batch = 0;
    let calibratedTotal = 0;
    let skippedTotal = 0;
    let failedTotal = 0;
    try {
      const batchSize = Number(runLimit) || DEFAULT_BATCH_SIZE;
      while (true) {
        const result = await runSignalCalibration({ batchSize, offset, region, assetType, horizon });
        batch += 1;
        calibratedTotal += result.calibratedCount;
        skippedTotal += result.skippedCount;
        failedTotal += result.failedCount;
        setActionMessage(
          `Batch ${batch} complete. Processed ${Math.min(result.offset + result.processedCount, result.totalCount)} / ${result.totalCount} instruments. ` +
          `Calibrated ${result.calibratedCount}, passthrough/skipped ${result.skippedCount}, failed ${result.failedCount}.`
        );
        await reload();
        if (!result.hasMore || result.nextOffset === null) {
          setActionMessage(`Calibration complete for ${scopeLabel}. Calibrated ${calibratedTotal}, passthrough/skipped ${skippedTotal}, failed ${failedTotal}.`);
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
      setComparison(await fetchCalibrationComparison(selectedInstrument?.id || '', region, assetType, horizon));
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to compare signal');
    }
  };

  const columns: DataTableColumn<SignalCalibrationResult>[] = [
    { id: 'symbol', label: 'Symbol', sortable: true, render: (row) => <Typography variant="body2" fontWeight={700}>{row.symbol}</Typography> },
    { id: 'companyName', label: 'Company', render: (row) => <Typography variant="body2">{row.companyName || '-'}</Typography> },
    { id: 'region', label: 'Region / Exchange', render: (row) => <Typography variant="body2">{[row.region, row.exchange].filter(Boolean).join(' / ') || '-'}</Typography> },
    { id: 'rawScore', label: 'Raw', sortable: true, render: (row) => row.rawScore },
    { id: 'calibratedScore', label: 'Calibrated', sortable: true, render: (row) => row.calibratedScore },
    { id: 'scoreDelta', label: 'Delta', sortable: true, render: (row) => <Chip size="small" label={delta(row.scoreDelta)} color={row.scoreDelta > 0 ? 'success' : row.scoreDelta < 0 ? 'warning' : 'default'} /> },
    { id: 'calibratedDirection', label: 'Direction', render: (row) => <DirectionChip value={row.calibratedDirection} /> },
    { id: 'rawConfidence', label: 'Confidence', render: (row) => <ConfidenceChip value={row.rawConfidence} /> },
    { id: 'calibratedConfidence', label: 'Calibration Confidence', render: (row) => <ConfidenceChip value={row.calibratedConfidence} /> },
    { id: 'evidenceStatus', label: 'Evidence', render: (row) => <Chip size="small" variant="outlined" label={row.evidenceStatus || 'UNKNOWN'} color={row.evidenceStatus === 'SUFFICIENT' ? 'success' : row.evidenceStatus === 'LOW_SAMPLE' ? 'warning' : 'error'} /> },
    { id: 'overallEvaluatedSamples', label: 'Samples', render: (row) => `${row.overallEvaluatedSamples ?? 0} / ${row.groupEvaluatedSamples ?? 0}` },
    { id: 'topBoost', label: 'Top Boost', render: (row) => row.boosts[0]?.label || '-' },
    { id: 'topPenalty', label: 'Top Penalty', render: (row) => row.penalties[0]?.label || '-' },
    { id: 'warnings', label: 'Warnings', render: (row) => row.warningsCount ?? row.calibrationEvidence?.evidenceWarnings.length ?? 0 },
    { id: 'dataGaps', label: 'Data Gaps', render: (row) => row.dataGaps.length },
    { id: 'generatedAt', label: 'Calibrated', sortable: true, render: (row) => new Date(row.generatedAt).toLocaleDateString() },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <Tooltip title="Open Research" arrow>
        <IconButton size="small" component={Link} to={row.researchUrl}>
          <VisibilityOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    )},
  ];

  if (loading && !model && data.items.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  const firstWarnings = data.items.find((item) => item.calibrationEvidence?.evidenceWarnings?.length)?.calibrationEvidence?.evidenceWarnings || [];
  const scopeLabel = `${region === 'GLOBAL' ? 'Global' : region} / ${assetType || 'ALL'}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Calibration Engine"
        subtitle={`Explainable historical calibration. Showing calibration for ${scopeLabel}.`}
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
          <Button component={Link} to="/signals/quality" variant="outlined">Signal Quality Lab</Button>
        }
      />

      {firstWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>Calibration Sample Warning</Typography>
          {firstWarnings.map((w, i) => <Typography key={i} variant="body2">{w}</Typography>)}
        </Alert>
      )}

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {running && <Alert severity="info" sx={{ mb: 2 }}>Running calibration for {scopeLabel}.</Alert>}
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }}>{actionMessage}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>Calibration uses historical evidence and context snapshots for research support only.</Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
        <MetricCard label="Selected Horizon" value={horizon} />
        <MetricCard label="Calibrated Signals" value={summary.calibrated} />
        <MetricCard label="Avg Delta" value={summary.avgDelta} />
        <MetricCard label="Upgraded" value={summary.upgraded} />
        <MetricCard label="Downgraded" value={summary.downgraded} />
        <MetricCard label="High Confidence" value={summary.highConfidence} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField select size="small" label="Horizon" value={horizon} onChange={(event) => changeHorizon(event.target.value)} sx={{ minWidth: 120 }}>
            {(model?.supportedHorizons || ['1D', '5D', '10D', '20D', '60D']).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField 
            size="small" 
            placeholder="Search symbol or company..." 
            value={search} 
            onChange={(e) => applySearch(e.target.value)} 
            sx={{ width: 300 }}
          />
          <TextField select size="small" label="Direction" value={filters.direction || ''} onChange={(event) => applyFilters({ ...filters, direction: event.target.value || undefined })} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="BULLISH">Bullish</MenuItem>
            <MenuItem value="NEUTRAL">Neutral</MenuItem>
            <MenuItem value="BEARISH">Bearish</MenuItem>
          </TextField>
          <TextField select size="small" label="Calibration Confidence" value={filters.calibrationConfidence || ''} onChange={(event) => applyFilters({ ...filters, calibrationConfidence: event.target.value || undefined })} sx={{ minWidth: 210 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="INSUFFICIENT_SAMPLE">Insufficient sample</MenuItem>
          </TextField>
          <TextField select size="small" label="Evidence" value={filters.evidenceStatus || ''} onChange={(event) => applyFilters({ ...filters, evidenceStatus: event.target.value || undefined })} sx={{ minWidth: 170 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="SUFFICIENT">Sufficient</MenuItem>
            <MenuItem value="LOW_SAMPLE">Low sample</MenuItem>
            <MenuItem value="INSUFFICIENT">Insufficient</MenuItem>
            <MenuItem value="MISSING">Missing</MenuItem>
          </TextField>
          <TextField size="small" label="Min |Delta|" type="number" value={filters.minAbsDelta ?? ''} onChange={(event) => applyFilters({ ...filters, minAbsDelta: event.target.value === '' ? undefined : Number(event.target.value) })} sx={{ width: 130 }} />
          <TextField select size="small" label="Data gaps" value={filters.hasDataGaps === undefined ? '' : String(filters.hasDataGaps)} onChange={(event) => applyFilters({ ...filters, hasDataGaps: event.target.value === '' ? undefined : event.target.value === 'true' })} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Has gaps</MenuItem>
            <MenuItem value="false">No gaps</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => applyFilters({})}>Reset Filters</Button>
        </Stack>
        <DataTable
          columns={columns}
          rows={data.items}
          getRowId={(row) => row.id || row.instrumentId}
          page={Math.floor(data.offset / data.limit)}
          pageSize={data.limit}
          totalCount={data.totalCount}
          sortBy={data.sortBy}
          sortDirection={data.sortDirection}
          onPageChange={(page) => setPagination(data.limit, page * data.limit)}
          onPageSizeChange={(pageSize) => setPagination(pageSize, 0)}
          onSortChange={setSorting}
          loading={loading}
          emptyMessage={`No calibrated signals found for ${scopeLabel}. Run calibration to populate this table.`}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 3, mb: 3 }}>
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
                <Typography variant="subtitle1" fontWeight={700}>Raw Signal</Typography>
                <Typography>{comparison.rawSignal.symbol}: {comparison.rawSignal.score} / {comparison.rawSignal.direction} / {comparison.rawSignal.confidence}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>{comparison.rawSignal.explanation}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Calibrated Signal</Typography>
                <Typography>{comparison.calibratedSignal.calibratedScore} ({delta(comparison.calibratedSignal.scoreDelta)}) / {comparison.calibratedSignal.calibratedDirection} / <ConfidenceChip value={comparison.calibratedSignal.calibratedConfidence} /></Typography>
                <Typography variant="body2" sx={{ mt: 1 }}><strong>Evidence Status:</strong> {comparison.calibratedSignal.evidenceStatus} ({comparison.calibratedSignal.overallEvaluatedSamples} samples)</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}><strong>Boosts:</strong> {comparison.calibratedSignal.boosts.map((item) => item.label).join('; ') || 'None'}</Typography>
                <Typography variant="body2"><strong>Penalties:</strong> {comparison.calibratedSignal.penalties.map((item) => item.label).join('; ') || 'None'}</Typography>
                
                {comparison.calibratedSignal.calibrationEvidence?.evidenceWarnings?.length ? (
                  <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                    {comparison.calibratedSignal.calibrationEvidence.evidenceWarnings.map((w, i) => <Typography key={i} variant="caption" display="block">{w}</Typography>)}
                  </Alert>
                ) : null}

                {comparison.calibratedSignal.dataQuality && (
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5 }}>
                    <Typography variant="body2" fontWeight={700}>Data Quality Context</Typography>
                    <Typography variant="body2">
                      Coverage: {comparison.calibratedSignal.dataQuality.coverageStatus} ({comparison.calibratedSignal.dataQuality.coverageScore})
                      <br/>Readiness: {comparison.calibratedSignal.dataQuality.signalReadinessStatus} ({comparison.calibratedSignal.dataQuality.signalReadinessScore})
                    </Typography>
                  </Paper>
                )}
                {comparison.calibratedSignal.dataGaps.length > 0 && <Typography color="text.secondary" variant="caption" display="block" sx={{ mt: 1 }}>Gaps: {comparison.calibratedSignal.dataGaps.join('; ')}</Typography>}
              </Paper>
            </Box>
          ) : <Typography color="text.secondary">Select an instrument to compare raw and calibrated outputs.</Typography>}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Calibration Model Rules</Typography>
          {model ? (
            <Stack spacing={1}>
              <Chip label={model.calibrationModelVersion} color="primary" sx={{ alignSelf: 'flex-start' }} />
              <Typography variant="body2"><strong>Horizon:</strong> {model.defaultHorizon} (Min samples: {model.minOverallSamples} overall, {model.minGroupSamples} group)</Typography>
              <Typography variant="body2"><strong>Delta Caps:</strong> +/-{model.perAdjustmentDeltaCap} per adjustment, +/-{model.totalDeltaCap} total.</Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Sample Safety:</Typography>
              {model.sampleSafetyRules?.map((rule) => <Typography key={rule} variant="body2" color="text.secondary">- {rule}</Typography>)}
              <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>Fallback: {model.fallbackBehavior}</Typography>
            </Stack>
          ) : <Typography color="text.secondary">Model details unavailable.</Typography>}
        </Paper>
      </Box>

    </Box>
  );
};

export default SignalCalibrationEnginePage;
