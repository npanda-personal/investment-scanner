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
import type { CalibrationComparison, CalibrationRunResponse, SignalCalibrationResult } from '../types';
import { BatchProgressBar, FilterBar, InstrumentSearchSelect, PageHeader, DataTable, type DataTableColumn } from '@/shared/components';
import { useBatchRunner } from '@/shared/hooks';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';
import { signal_calibration_engine_batch_request_workers_count, signal_calibration_engine_batch_size } from '../config';

const delta = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

const DirectionChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={value} color={value === 'BULLISH' ? 'success' : value === 'BEARISH' ? 'error' : 'default'} />
);

const ConfidenceChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={value} color={value === 'HIGH' ? 'success' : value === 'MEDIUM' ? 'primary' : value === 'LOW' ? 'warning' : 'error'} />
);

const readinessTone = (value: string | undefined): 'success' | 'warning' | 'error' | undefined => (
  value === 'USABLE' ? 'success' : value === 'LIMITED' ? 'warning' : value === 'UNAVAILABLE' ? 'error' : undefined
);

const MetricCard: React.FC<{ label: string; value: string | number; tone?: 'success' | 'warning' | 'error' }> = ({ label, value, tone }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5" color={tone ? `${tone}.main` : 'text.primary'}>{value}</Typography>
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
  const [runLimit, setRunLimit] = useState(String(signal_calibration_engine_batch_size));
  const [comparison, setComparison] = useState<CalibrationComparison | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const batchRunner = useBatchRunner<CalibrationRunResponse>();

  const summary = useMemo(() => {
    const items = data.items || [];
    const upgraded = items.filter((item) => item.scoreDelta > 0).length;
    const downgraded = items.filter((item) => item.scoreDelta < 0).length;
    const avgDelta = items.length ? items.reduce((sum, item) => sum + item.scoreDelta, 0) / items.length : 0;
    const unavailable = items.filter((item) => item.calibrationReadiness?.status === 'UNAVAILABLE' || item.downstreamInfluence === 'NONE').length;
    const limited = items.filter((item) => item.calibrationReadiness?.status === 'LIMITED' || item.downstreamInfluence === 'LIMITED').length;
    return {
      calibrated: health?.calibratedSignals ?? data.totalCount,
      upgraded,
      downgraded,
      avgDelta: avgDelta.toFixed(1),
      highConfidence: items.filter((item) => item.calibratedConfidence === 'HIGH').length,
      dataGaps: items.reduce((sum, item) => sum + item.dataGaps.length, 0),
      applied: items.filter((item) => item.calibrationApplied).length,
      passthrough: items.filter((item) => item.calibrationApplied === false || item.calibratedConfidence === 'INSUFFICIENT_SAMPLE').length,
      unavailable,
      limited,
      firstReadiness: items[0]?.calibrationReadiness?.status || 'UNAVAILABLE',
      firstInfluence: items[0]?.calibrationReadiness?.downstreamInfluence || items[0]?.downstreamInfluence || 'NONE',
    };
  }, [health, data]);

  const run = async () => {
    setFormError(null);
    setActionMessage(null);
    try {
      const configuredBatchSize = Number(runLimit) || signal_calibration_engine_batch_size;
      const result = await batchRunner.run({
        batchSize: configuredBatchSize,
        parallelism: signal_calibration_engine_batch_request_workers_count,
        runBatch: ({ offset, batchSize }) => runSignalCalibration({ batchSize, offset, region, assetType, horizon }),
      });
      if (result) {
        await reload();
        setActionMessage(
          `Calibration complete for ${scopeLabel}. Processed ${result.aggregate.processedCount} / ${result.aggregate.totalCount ?? result.aggregate.processedCount}. ` +
          `Applied ${result.aggregate.calibratedCount}, passthrough ${result.aggregate.passthroughCount}, skipped ${result.aggregate.skippedCount}, failed ${result.aggregate.failedCount}.`
        );
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to run calibration');
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
    { id: 'readiness', label: 'Readiness', render: (row) => <Chip size="small" variant="outlined" label={row.calibrationReadiness?.status || 'UNAVAILABLE'} color={readinessTone(row.calibrationReadiness?.status) || 'default'} /> },
    { id: 'authoritativeScore', label: 'Authoritative', render: (row) => row.calibrationReadiness?.authoritativeScore || row.authoritativeScore || 'RAW_SCORE' },
    { id: 'downstreamInfluence', label: 'Influence', render: (row) => <Chip size="small" label={row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence || 'NONE'} color={(row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence) === 'NORMAL' ? 'success' : (row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence) === 'LIMITED' ? 'warning' : 'error'} variant="outlined" /> },
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
  const firstBlockers = data.items.find((item) => item.calibrationReadiness?.blockers?.length)?.calibrationReadiness?.blockers || [];
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
            disabled={batchRunner.running}
            startIcon={batchRunner.running ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {batchRunner.running ? 'Running' : 'Run Calibration'}
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
      {firstBlockers.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>Calibration Readiness Blocked</Typography>
          {firstBlockers.map((w, i) => <Typography key={i} variant="body2">{w}</Typography>)}
        </Alert>
      )}

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }}>{actionMessage}</Alert>}
      <BatchProgressBar
        running={batchRunner.running}
        complete={batchRunner.complete}
        error={batchRunner.error}
        label={`Signal calibration for ${scopeLabel}`}
        processedCount={batchRunner.processedCount}
        totalCount={batchRunner.totalCount}
        batchCount={batchRunner.batchCount}
        estimatedBatchTotal={batchRunner.totalCount ? Math.ceil(batchRunner.totalCount / (Number(runLimit) || signal_calibration_engine_batch_size)) : undefined}
        calibratedCount={batchRunner.calibratedCount}
        passthroughCount={batchRunner.passthroughCount}
        skippedCount={batchRunner.skippedCount}
        outOfScopeSkipped={batchRunner.outOfScopeSkipped}
        failedCount={batchRunner.failedCount}
        warningsCount={batchRunner.warnings.length}
      />
      <Alert severity="info" sx={{ mb: 3 }}>Calibration uses historical evidence and context snapshots for research support only.</Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
        <MetricCard label="Selected Horizon" value={horizon} />
        <MetricCard label="Readiness" value={summary.firstReadiness} tone={readinessTone(summary.firstReadiness)} />
        <MetricCard label="Downstream Influence" value={summary.firstInfluence} tone={summary.firstInfluence === 'NONE' ? 'error' : summary.firstInfluence === 'LIMITED' ? 'warning' : 'success'} />
        <MetricCard label="Calibrated Signals" value={summary.calibrated} />
        <MetricCard label="Page Avg Delta" value={summary.avgDelta} />
        <MetricCard label="Applied on Page" value={summary.applied} />
        <MetricCard label="Passthrough on Page" value={summary.passthrough} />
        <MetricCard label="Limited Evidence on Page" value={summary.limited} tone={summary.limited > 0 ? 'warning' : undefined} />
        <MetricCard label="Unavailable Evidence on Page" value={summary.unavailable} tone={summary.unavailable > 0 ? 'error' : undefined} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <FilterBar onReset={() => { applyFilters({}); applySearch(''); }} showReset={Object.keys(filters).length > 0 || Boolean(search)}>
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
          <TextField label="Run batch size" size="small" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 140 }} />
        </FilterBar>
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
                <Typography variant="body2" sx={{ mt: 1 }}><strong>Readiness:</strong> {comparison.calibratedSignal.calibrationReadiness?.status || 'UNAVAILABLE'} / {comparison.calibratedSignal.calibrationReadiness?.downstreamInfluence || 'NONE'} / {comparison.calibratedSignal.calibrationReadiness?.authoritativeScore || 'RAW_SCORE'}</Typography>
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
