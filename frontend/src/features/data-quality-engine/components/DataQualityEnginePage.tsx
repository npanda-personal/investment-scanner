import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { evaluateDataQuality, fetchDataQualityDiagnostics } from '../api/dataQualityEngineService';
import { useDataQualityEngine } from '../hooks';
import type { CoverageStatus, DataQualityEvaluation, DataQualityFilters, LiquidityStatus, SignalReadinessStatus } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { BatchProgressBar, DataTable, FilterBar, PageHeader, StatusBadge, type DataTableColumn, type SortDirection } from '@/shared/components';
import { useBatchRunner } from '@/shared/hooks';
import { data_quality_engine_batch_request_workers_count, data_quality_engine_batch_size } from '../config';

type QualityView = 'all' | 'ready' | 'blocked' | 'coverage' | 'liquidity' | 'backtest';

const statusColor = (value: string): 'success' | 'warning' | 'error' | 'default' => {
  if (['GOOD', 'READY', 'LIQUID'].includes(value)) return 'success';
  if (['PARTIAL', 'LIMITED', 'THIN', 'UNKNOWN'].includes(value)) return 'warning';
  if (['POOR', 'UNUSABLE', 'NOT_READY', 'ILLIQUID'].includes(value)) return 'error';
  return 'default';
};

const formatPercent = (value: number, total: number) => {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const MetricCard: React.FC<{ label: string; value: number | string; detail?: string }> = ({ label, value, detail }) => (
  <Paper variant="outlined" sx={{ p: 2, minHeight: 92 }}>
    <Typography variant="overline" color="text.secondary">{label}</Typography>
    <Typography variant="h5" sx={{ mt: 0.25 }}>{value}</Typography>
    {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
  </Paper>
);

const ScoreStatus: React.FC<{ score: number; status: string }> = ({ score, status }) => {
  const color = statusColor(status);
  const progressColor = color === 'default' ? 'primary' : color;
  return (
    <Stack spacing={0.5} sx={{ minWidth: 110 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" fontWeight={700}>{Math.round(score)}</Typography>
        <Chip size="small" label={status} color={color} variant="outlined" />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, score))}
        color={progressColor}
      />
    </Stack>
  );
};

const DataQualityEnginePage: React.FC = () => {
  const { scope } = useMarketScope();
  const batchRunner = useBatchRunner();
  const [search, setSearch] = useState('');
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | ''>('');
  const [readinessStatus, setReadinessStatus] = useState<SignalReadinessStatus | ''>('');
  const [liquidityStatus, setLiquidityStatus] = useState<LiquidityStatus | ''>('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [eligibleForSignals, setEligibleForSignals] = useState('');
  const [eligibleForBacktesting, setEligibleForBacktesting] = useState('');
  const [qualityView, setQualityView] = useState<QualityView>('all');
  const [selected, setSelected] = useState<DataQualityEvaluation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('signalReadinessScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filters = useMemo<DataQualityFilters>(() => ({
    search: search.trim() || undefined,
    status: coverageStatus || undefined,
    readinessStatus: readinessStatus || undefined,
    liquidityStatus: liquidityStatus || undefined,
    sector: sector.trim() || undefined,
    country: country.trim() || undefined,
    eligibleForSignals: eligibleForSignals === '' ? undefined : eligibleForSignals === 'true',
    eligibleForBacktesting: eligibleForBacktesting === '' ? undefined : eligibleForBacktesting === 'true',
    limit: pageSize,
    offset: page * pageSize,
    sortBy,
    sortOrder: sortDirection,
  }), [country, coverageStatus, eligibleForBacktesting, eligibleForSignals, liquidityStatus, page, pageSize, readinessStatus, search, sector, sortBy, sortDirection]);

  const { summary, items, total, loading, error, reload } = useDataQualityEngine(filters);

  const resetFilters = () => {
    setSearch('');
    setCoverageStatus('');
    setReadinessStatus('');
    setLiquidityStatus('');
    setSector('');
    setCountry('');
    setEligibleForSignals('');
    setEligibleForBacktesting('');
    setQualityView('all');
    setPage(0);
  };

  const applyQualityView = (view: QualityView) => {
    resetFilters();
    setQualityView(view);
    if (view === 'ready') {
      setReadinessStatus('READY');
      setEligibleForSignals('true');
    }
    if (view === 'blocked') {
      setReadinessStatus('NOT_READY');
    }
    if (view === 'coverage') {
      setCoverageStatus('POOR');
    }
    if (view === 'liquidity') {
      setLiquidityStatus('ILLIQUID');
    }
    if (view === 'backtest') {
      setEligibleForBacktesting('true');
    }
    setPage(0);
  };

  const runEvaluation = async () => {
    if (batchRunner.running) return;
    setFormError(null);
    setActionMessage(null);
    batchRunner.reset();
    try {
      const completedRun = await batchRunner.run({
        batchSize: data_quality_engine_batch_size,
        parallelism: data_quality_engine_batch_request_workers_count,
        runBatch: ({ offset, batchSize }) => evaluateDataQuality({
          batchSize,
          offset,
          region: scope.region,
          assetType: scope.assetType,
        }),
      });
      const finalState = completedRun?.aggregate;
      setActionMessage(
        `Evaluation complete. Processed ${finalState?.processedCount ?? 0} instruments across ${finalState?.batchCount ?? 0} batches. ` +
        `Evaluated ${finalState?.evaluatedCount ?? 0}, skipped ${finalState?.skippedCount ?? 0}, failed ${finalState?.failedCount ?? 0}.`
      );
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Data quality evaluation failed');
    }
  };

  const loadDiagnostics = async (instrumentId: string) => {
    setFormError(null);
    try {
      setSelected(await fetchDataQualityDiagnostics(instrumentId));
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to load diagnostics');
    }
  };

  const activeFilters = [
    search.trim() ? `Search = ${search.trim()}` : null,
    coverageStatus ? `Coverage = ${coverageStatus}` : null,
    readinessStatus ? `Readiness = ${readinessStatus}` : null,
    liquidityStatus ? `Liquidity = ${liquidityStatus}` : null,
    sector.trim() ? `Sector contains ${sector.trim()}` : null,
    country.trim() ? `Country contains ${country.trim()}` : null,
    eligibleForSignals ? `Signal eligible = ${eligibleForSignals === 'true' ? 'YES' : 'NO'}` : null,
    eligibleForBacktesting ? `Backtest eligible = ${eligibleForBacktesting === 'true' ? 'YES' : 'NO'}` : null,
  ].filter((item): item is string => Boolean(item));

  const columns: DataTableColumn<DataQualityEvaluation>[] = [
    { id: 'symbol', label: 'Symbol', sortable: true, render: (item) => <Typography fontWeight={700} fontSize={13}>{item.symbol}</Typography> },
    { id: 'companyName', label: 'Company', sortable: true, render: (item) => item.companyName || 'Missing' },
    { id: 'coverageScore', label: 'Coverage', sortable: true, render: (item) => <ScoreStatus score={item.coverageScore} status={item.coverageStatus} /> },
    { id: 'signalReadinessScore', label: 'Signal Readiness', sortable: true, render: (item) => <ScoreStatus score={item.signalReadinessScore} status={item.signalReadinessStatus} /> },
    { id: 'liquidityScore', label: 'Liquidity', sortable: true, render: (item) => <ScoreStatus score={item.liquidityScore} status={item.liquidityStatus} /> },
    { id: 'eligibleForSignals', label: 'Signals', render: (item) => item.eligibleForSignals ? 'YES' : 'NO' },
    { id: 'eligibleForBacktesting', label: 'Backtests', render: (item) => item.eligibleForBacktesting ? 'YES' : 'NO' },
    { id: 'gaps', label: 'Gaps', align: 'right', render: (item) => item.dataGaps.length },
    { id: 'warnings', label: 'Warnings', align: 'right', render: (item) => item.warnings.length },
    { id: 'evaluatedAt', label: 'Last Evaluated', sortable: true, render: (item) => formatDateTime(item.lastEvaluatedAt) },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (item) => (
        <Stack direction="row" justifyContent="flex-end" spacing={0.5} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Inspect diagnostics" arrow>
            <IconButton size="small" onClick={() => void loadDiagnostics(item.instrumentId)}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open research workspace" arrow>
            <IconButton size="small" component={Link} to={item.researchUrl}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const evaluatedCount = summary ? Math.max(0, summary.goodCoverageCount + summary.partialCoverageCount + summary.poorCoverageCount + summary.unusableCoverageCount) : 0;
  const blockedCount = summary ? summary.notSignalReadyCount : 0;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, width: '100%', mx: 'auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <PageHeader
        title="Data Quality Engine"
        subtitle="Coverage, readiness, and liquidity checks for downstream research modules."
        primaryAction={
          <Button
            variant="contained"
            onClick={runEvaluation}
            disabled={batchRunner.running}
            startIcon={batchRunner.running ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          >
            {batchRunner.running ? 'Evaluating...' : 'Evaluate Scope'}
          </Button>
        }
        secondaryActions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void reload()} disabled={loading || batchRunner.running}>
            Refresh
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          Market is controlled by the global header selector: <strong>{scope.region}</strong> / <strong>{scope.assetType}</strong>.
          Data Quality is a gatekeeper for signals, calibration, backtesting, and trade-plan readiness.
        </Typography>
      </Paper>

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{error || formError}</Alert>}
      <BatchProgressBar
        running={batchRunner.running}
        complete={batchRunner.complete}
        label={`${batchRunner.complete ? 'Data quality evaluation complete for' : 'Evaluating data quality for'} ${scope.region} / ${scope.assetType}`}
        processedCount={batchRunner.processedCount}
        totalCount={batchRunner.totalCount}
        batchCount={batchRunner.batchCount}
        estimatedBatchTotal={batchRunner.totalCount ? Math.ceil(batchRunner.totalCount / data_quality_engine_batch_size) : undefined}
        evaluatedCount={batchRunner.evaluatedCount}
        skippedCount={batchRunner.skippedCount}
        failedCount={batchRunner.failedCount}
        warningsCount={batchRunner.warnings.length}
        error={batchRunner.error}
      />
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionMessage(null)}>{actionMessage}</Alert>}

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
          <MetricCard label="Evaluated Coverage" value={`${evaluatedCount}/${summary.totalInstruments}`} detail={`${formatPercent(evaluatedCount, summary.totalInstruments)} of scoped instruments`} />
          <MetricCard label="Signal Ready" value={summary.signalReadyCount} detail={`${formatPercent(summary.signalReadyCount, Math.max(evaluatedCount, 1))} of evaluated rows`} />
          <MetricCard label="Blocked Or Limited" value={blockedCount} detail="Not ready for signal generation" />
          <MetricCard label="Issue Flags" value={summary.stalePriceCount + summary.missingVolumeCount + summary.lowLiquidityCount} detail="Overlapping stale, volume, and liquidity flags" />
        </Box>
      )}

      <Paper variant="outlined" sx={{ mb: 2, px: 1, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={{ xs: 0.5, md: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: { xs: 1, md: 0 }, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Quality Views
          </Typography>
          <Tabs
            value={qualityView}
            onChange={(_event, nextView: QualityView) => applyQualityView(nextView)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
              '& .MuiTab-root': { minHeight: 48, px: 2, textTransform: 'none', fontWeight: 700, fontSize: 13 },
            }}
          >
            <Tab value="all" label="All" />
            <Tab value="ready" label="Signal Ready" />
            <Tab value="blocked" label="Blocked" />
            <Tab value="coverage" label="Poor Coverage" />
            <Tab value="liquidity" label="Low Liquidity" />
            <Tab value="backtest" label="Backtest Ready" />
          </Tabs>
        </Stack>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <FilterBar onReset={resetFilters} showReset={activeFilters.length > 0}>
          <TextField
            sx={{ flexBasis: { xs: '100%', md: 320 }, flexGrow: { md: 2 } }}
            size="small"
            label="Search symbol or company"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField select size="small" label="Coverage" value={coverageStatus} onChange={(event) => { setCoverageStatus(event.target.value as CoverageStatus | ''); setQualityView('all'); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Readiness" value={readinessStatus} onChange={(event) => { setReadinessStatus(event.target.value as SignalReadinessStatus | ''); setQualityView('all'); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['READY', 'LIMITED', 'NOT_READY'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Liquidity" value={liquidityStatus} onChange={(event) => { setLiquidityStatus(event.target.value as LiquidityStatus | ''); setQualityView('all'); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Sector" value={sector} onChange={(event) => { setSector(event.target.value); setQualityView('all'); setPage(0); }} />
          <TextField select size="small" label="Signal Eligible" value={eligibleForSignals} onChange={(event) => { setEligibleForSignals(event.target.value); setQualityView('all'); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </FilterBar>
      </Box>

      {activeFilters.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          {activeFilters.map((filter) => <Chip key={filter} size="small" label={filter} />)}
          <Chip size="small" variant="outlined" label={`${total} matching ${total === 1 ? 'evaluation' : 'evaluations'}`} />
        </Stack>
      )}

      <DataTable
        columns={columns}
        rows={items}
        getRowId={(item) => item.instrumentId}
        loading={loading}
        emptyMessage={activeFilters.length > 0 ? `No evaluations match ${activeFilters.join(', ')}.` : 'No data quality evaluations found. Run Evaluate Scope to populate diagnostics.'}
        page={page}
        pageSize={pageSize}
        totalCount={total}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(nextSortBy, nextDirection) => {
          setSortBy(nextSortBy);
          setSortDirection(nextDirection);
          setPage(0);
        }}
        onRowClick={(item) => void loadDiagnostics(item.instrumentId)}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(0);
        }}
      />

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%', p: 3 } }}
      >
        {selected && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Data Quality Diagnostics</Typography>
              <Typography variant="h5" fontWeight={700}>{selected.symbol}</Typography>
              <Typography variant="body2" color="text.secondary">{selected.companyName || 'Unknown company'}</Typography>
            </Box>
            <Divider />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <StatusBadge label={selected.coverageStatus} />
              <StatusBadge label={selected.signalReadinessStatus} />
              <StatusBadge label={selected.liquidityStatus} />
              <StatusBadge label={selected.eligibleForSignals ? 'SIGNALS YES' : 'SIGNALS NO'} />
            </Stack>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Scores</Typography>
              <Stack spacing={1.25}>
                <ScoreStatus score={selected.coverageScore} status={selected.coverageStatus} />
                <ScoreStatus score={selected.signalReadinessScore} status={selected.signalReadinessStatus} />
                <ScoreStatus score={selected.liquidityScore} status={selected.liquidityStatus} />
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Eligibility</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Signals:</strong> {selected.eligibleForSignals ? 'YES' : 'NO'}</Typography>
                <Typography variant="body2"><strong>Backtesting:</strong> {selected.eligibleForBacktesting ? 'YES' : 'NO'}</Typography>
                <Typography variant="body2"><strong>Calibration:</strong> {selected.eligibleForCalibration ? 'YES' : 'NO'}</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Data Gaps</Typography>
              {selected.dataGaps.length ? selected.dataGaps.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No major gaps detected.</Typography>}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Readiness Blockers</Typography>
              {selected.readinessBlockers.length ? selected.readinessBlockers.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No readiness blockers detected.</Typography>}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Recommended Fixes</Typography>
              {selected.recommendedFixes.length ? selected.recommendedFixes.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No immediate data fixes recommended.</Typography>}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Warnings</Typography>
              {selected.warnings.length ? selected.warnings.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No warnings.</Typography>}
            </Box>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" component={Link} to={selected.researchUrl}>Open Research</Button>
              <Button variant="contained" onClick={() => void runEvaluation()} disabled={batchRunner.running}>Evaluate Scope</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
};

export default DataQualityEnginePage;
