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
import { DownloadOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { fetchCalibrationComparison, fetchTopCalibratedSignals, runSignalCalibration } from '../api/signalCalibrationEngineService';
import { useSignalCalibrationEngine } from '../hooks';
import type { CalibrationComparison, CalibrationRunResponse, SignalCalibrationResult } from '../types';
import { BatchProgressBar, FilterBar, InstrumentSearchSelect, PageHeader, DataTable, type DataTableColumn } from '@/shared/components';
import { useBatchRunner } from '@/shared/hooks';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';
import { signal_calibration_engine_batch_request_workers_count, signal_calibration_engine_batch_size } from '../config';

const delta = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const EXPORT_BATCH_SIZE = 100;

const labelize = (value: string | undefined | null) => String(value || '-')
  .toLowerCase()
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const DirectionChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={labelize(value)} color={value === 'BULLISH' ? 'success' : value === 'BEARISH' ? 'error' : 'default'} />
);

const ConfidenceChip: React.FC<{ value: string }> = ({ value }) => (
  <Chip size="small" label={labelize(value)} color={value === 'HIGH' ? 'success' : value === 'MEDIUM' ? 'primary' : value === 'LOW' ? 'warning' : 'error'} />
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

const exportColumns: Array<{ label: string; value: (row: SignalCalibrationResult) => string | number | null | undefined }> = [
  { label: 'Symbol', value: (row) => row.symbol },
  { label: 'Company', value: (row) => row.companyName },
  { label: 'Region', value: (row) => row.region },
  { label: 'Exchange', value: (row) => row.exchange },
  { label: 'Asset Type', value: (row) => row.assetType },
  { label: 'Raw Score', value: (row) => row.rawScore },
  { label: 'Calibrated Score', value: (row) => row.calibratedScore },
  { label: 'Score Delta', value: (row) => row.scoreDelta },
  { label: 'Direction', value: (row) => row.calibratedDirection },
  { label: 'Raw Confidence', value: (row) => row.rawConfidence },
  { label: 'Calibration Confidence', value: (row) => row.calibratedConfidence },
  { label: 'Readiness', value: (row) => row.calibrationReadiness?.status || 'UNAVAILABLE' },
  { label: 'Readiness Reasons', value: (row) => row.calibrationReadiness?.reasons?.join('; ') || '' },
  { label: 'Readiness Blockers', value: (row) => row.calibrationReadiness?.blockers?.join('; ') || '' },
  { label: 'Authoritative Score', value: (row) => row.calibrationReadiness?.authoritativeScore || row.authoritativeScore || 'RAW_SCORE' },
  { label: 'Downstream Influence', value: (row) => row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence || 'NONE' },
  { label: 'Evidence Status', value: (row) => row.evidenceStatus || row.calibrationEvidence?.evidenceStatus || 'UNKNOWN' },
  { label: 'Overall Samples', value: (row) => row.overallEvaluatedSamples ?? 0 },
  { label: 'Group Samples', value: (row) => row.groupEvaluatedSamples ?? 0 },
  { label: 'Top Boost', value: (row) => row.boosts[0]?.label || '' },
  { label: 'Top Penalty', value: (row) => row.penalties[0]?.label || '' },
  { label: 'Warnings', value: (row) => row.warningsCount ?? row.calibrationEvidence?.evidenceWarnings.length ?? 0 },
  { label: 'Data Gaps', value: (row) => row.dataGaps.join('; ') },
  { label: 'Calibration Reasons', value: (row) => row.calibrationReasons.join('; ') },
  { label: 'Calibration Model Version', value: (row) => row.calibrationModelVersion },
  { label: 'Raw Signal Model Version', value: (row) => row.rawSignalModelVersion },
  { label: 'Calibrated At', value: (row) => row.generatedAt },
  { label: 'Research URL', value: (row) => row.researchUrl },
];

function csvCell(value: string | number | null | undefined): string {
  const text = typeof value === 'number' ? String(value) : String(value ?? '').replace(/^[=+@-]/, "'$&");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCalibrationCsv(rows: SignalCalibrationResult[], scopeLabel: string) {
  const header = exportColumns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => exportColumns.map((column) => csvCell(column.value(row))).join(',')).join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const scopeSlug = scopeLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  link.href = url;
  link.download = `signal-calibration-${scopeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const SignalCalibrationEnginePage: React.FC = () => {
  const { scope } = useMarketScope();
  const { region, assetType } = scope;
  const { 
    data, model, health, loading, error, reload, 
    setPagination, setSorting, applySearch, applyFilters, resetFilters, changeHorizon, search, filters, horizon,
  } = useSignalCalibrationEngine();
  
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [runLimit, setRunLimit] = useState(String(signal_calibration_engine_batch_size));
  const [comparison, setComparison] = useState<CalibrationComparison | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [exportRunning, setExportRunning] = useState(false);
  const batchRunner = useBatchRunner<CalibrationRunResponse>();

  const summary = useMemo(() => {
    const items = data.items || [];
    const upgraded = items.filter((item) => item.scoreDelta > 0).length;
    const downgraded = items.filter((item) => item.scoreDelta < 0).length;
    const avgDelta = items.length ? items.reduce((sum, item) => sum + item.scoreDelta, 0) / items.length : 0;
    const unavailable = items.filter((item) => item.calibrationReadiness?.status === 'UNAVAILABLE' || item.downstreamInfluence === 'NONE').length;
    const limited = items.filter((item) => item.calibrationReadiness?.status === 'LIMITED' || item.downstreamInfluence === 'LIMITED').length;
    const usable = items.filter((item) => item.calibrationReadiness?.status === 'USABLE').length;
    const normalInfluence = items.filter((item) => (item.calibrationReadiness?.downstreamInfluence || item.downstreamInfluence) === 'NORMAL').length;
    const warningRows = items.filter((item) => (item.warningsCount ?? 0) > 0 || item.dataGaps.length > 0 || (item.calibrationEvidence?.evidenceWarnings.length ?? 0) > 0).length;
    const blockerRows = items.filter((item) => (item.calibrationReadiness?.blockers.length ?? 0) > 0).length;
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
      usable,
      normalInfluence,
      warningRows,
      blockerRows,
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

  const exportTable = async () => {
    setFormError(null);
    setActionMessage(null);
    setExportRunning(true);
    try {
      const rows: SignalCalibrationResult[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const page = await fetchTopCalibratedSignals({
          region,
          assetType,
          horizon,
          search: search || undefined,
          limit: EXPORT_BATCH_SIZE,
          offset,
          sortBy: data.sortBy || 'calibratedScore',
          sortDirection: data.sortDirection || 'desc',
          ...filters,
        });
        rows.push(...page.items);
        hasMore = page.hasMore && page.items.length > 0;
        offset += EXPORT_BATCH_SIZE;
      }
      downloadCalibrationCsv(rows, scopeLabel);
      setActionMessage(`Exported ${rows.length} latest-per-stock calibration rows for ${scopeLabel} as an Excel-compatible CSV.`);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to export signal calibration table');
    } finally {
      setExportRunning(false);
    }
  };

  const columns: DataTableColumn<SignalCalibrationResult>[] = [
    { id: 'symbol', label: 'Symbol', sortable: true, render: (row) => <Typography variant="body2" fontWeight={700}>{row.symbol}</Typography> },
    { id: 'companyName', label: 'Company', render: (row) => <Typography variant="body2">{row.companyName || '-'}</Typography> },
    { id: 'calibratedScore', label: 'Calibrated', sortable: true, render: (row) => row.calibratedScore },
    { id: 'scoreDelta', label: 'Score Adjustment', sortable: true, render: (row) => <Chip size="small" label={delta(row.scoreDelta)} color={row.scoreDelta > 0 ? 'success' : row.scoreDelta < 0 ? 'warning' : 'default'} /> },
    { id: 'calibratedDirection', label: 'Direction', render: (row) => <DirectionChip value={row.calibratedDirection} /> },
    { id: 'calibratedConfidence', label: 'Sample Confidence', render: (row) => <ConfidenceChip value={row.calibratedConfidence} /> },
    { id: 'readiness', label: 'Readiness', render: (row) => <Chip size="small" variant="outlined" label={labelize(row.calibrationReadiness?.status || 'UNAVAILABLE')} color={readinessTone(row.calibrationReadiness?.status) || 'default'} /> },
    { id: 'downstreamInfluence', label: 'Influence', render: (row) => <Chip size="small" label={labelize(row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence || 'NONE')} color={(row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence) === 'NORMAL' ? 'success' : (row.calibrationReadiness?.downstreamInfluence || row.downstreamInfluence) === 'LIMITED' ? 'warning' : 'error'} variant="outlined" /> },
    { id: 'evidenceStatus', label: 'Evidence', render: (row) => <Chip size="small" variant="outlined" label={labelize(row.evidenceStatus || 'UNKNOWN')} color={row.evidenceStatus === 'SUFFICIENT' ? 'success' : row.evidenceStatus === 'LOW_SAMPLE' ? 'warning' : 'error'} /> },
    { id: 'overallEvaluatedSamples', label: 'Samples', render: (row) => `${row.overallEvaluatedSamples ?? 0} / ${row.groupEvaluatedSamples ?? 0}` },
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

      {summary.warningRows > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>Calibration Evidence Warnings</Typography>
          <Typography variant="body2">{summary.warningRows} visible rows have warnings or data gaps. Use filters or CSV export for row-level evidence.</Typography>
        </Alert>
      )}
      {summary.blockerRows > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>Calibration Readiness Blocked</Typography>
          <Typography variant="body2">{summary.blockerRows} visible rows have blockers and should not influence downstream trusted workflows.</Typography>
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
        <MetricCard label="Usable on Page" value={summary.usable} tone={summary.usable > 0 ? 'success' : undefined} />
        <MetricCard label="Normal Influence on Page" value={summary.normalInfluence} tone={summary.normalInfluence > 0 ? 'success' : undefined} />
        <MetricCard label="Calibrated Signals" value={summary.calibrated} />
        <MetricCard label="Page Avg Delta" value={summary.avgDelta} />
        <MetricCard label="Applied on Page" value={summary.applied} />
        <MetricCard label="Passthrough on Page" value={summary.passthrough} />
        <MetricCard label="Limited Evidence on Page" value={summary.limited} tone={summary.limited > 0 ? 'warning' : undefined} />
        <MetricCard label="Unavailable Evidence on Page" value={summary.unavailable} tone={summary.unavailable > 0 ? 'error' : undefined} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <FilterBar onReset={resetFilters} showReset={Object.keys(filters).length > 0 || Boolean(search)}>
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
          <TextField select size="small" label="Sample Confidence" value={filters.calibrationConfidence || ''} onChange={(event) => applyFilters({ ...filters, calibrationConfidence: event.target.value || undefined })} sx={{ minWidth: 210 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="INSUFFICIENT_SAMPLE">Insufficient sample</MenuItem>
          </TextField>
          <TextField size="small" label="Min |Delta|" type="number" value={filters.minAbsDelta ?? ''} onChange={(event) => applyFilters({ ...filters, minAbsDelta: event.target.value === '' ? undefined : Number(event.target.value) })} sx={{ width: 130 }} />
          <TextField select size="small" label="Data gaps" value={filters.hasDataGaps === undefined ? '' : String(filters.hasDataGaps)} onChange={(event) => applyFilters({ ...filters, hasDataGaps: event.target.value === '' ? undefined : event.target.value === 'true' })} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Has gaps</MenuItem>
            <MenuItem value="false">No gaps</MenuItem>
          </TextField>
          <TextField label="Batch size (advanced)" size="small" value={runLimit} onChange={(event) => setRunLimit(event.target.value)} sx={{ width: 170 }} />
          <Button
            variant="outlined"
            onClick={exportTable}
            disabled={exportRunning || loading || data.totalCount === 0}
            startIcon={exportRunning ? <CircularProgress size={16} /> : <DownloadOutlined />}
          >
            {exportRunning ? 'Exporting' : 'Export CSV'}
          </Button>
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
          emptyMessage={`No latest calibrated rows found for ${scopeLabel} on ${horizon}. Run calibration after raw signals and Signal Quality evidence are available.`}
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
