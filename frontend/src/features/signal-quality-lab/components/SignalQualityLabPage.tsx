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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { 
  VisibilityOutlined
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { fetchSignalHistory, fetchSignalOutcomes, recalculateSignalQuality } from '../api/signalQualityLabService';
import { useSignalQualityLab } from '../hooks';
import { BatchProgressBar, FilterBar, InstrumentSearchSelect, PageHeader } from '@/shared/components';
import { useBatchRunner } from '@/shared/hooks';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';
import type { QualityFilters, QualityHorizon, QualityMetricGroup, SignalHistoryItem, SignalOutcomeSet, SignalTypePerformance } from '../types';
import { signal_quality_lab_batch_request_workers_count, signal_quality_lab_batch_size } from '../config';

const horizons: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
const qualityTabs = ['overview', 'performance', 'noise', 'instrument'] as const;
type QualityTab = typeof qualityTabs[number];
function percent(value: number | null | undefined): string;
function percent(value: number | null | undefined, tooltip: string): string | React.ReactElement;
function percent(value: number | null | undefined, tooltip?: string): string | React.ReactElement {
  if (value === null || value === undefined) {
    if (tooltip) {
      return (
        <Tooltip title={tooltip} arrow>
          <Typography component="span" variant="inherit" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.disabled', color: 'text.disabled' }}>—</Typography>
        </Tooltip>
      );
    }
    return '—';
  }
  return `${(value * 100).toFixed(2)}%`;
}
const number = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : value.toLocaleString();
const plural = (count: number, singular: string, pluralLabel = `${singular}s`) => `${number(count)} ${count === 1 ? singular : pluralLabel}`;
const evidenceTone = (value: string | undefined): 'success' | 'warning' | 'error' | undefined => (
  value === 'USABLE' ? 'success' : value === 'LIMITED' ? 'warning' : value === 'UNAVAILABLE' ? 'error' : undefined
);
const activeFilterLabels = (filters: QualityFilters) => [
  filters.readinessStatus && `Readiness: ${filters.readinessStatus}`,
  filters.coverageStatus && `Coverage: ${filters.coverageStatus}`,
  filters.liquidityStatus && `Liquidity: ${filters.liquidityStatus}`,
  filters.modelVersion && `Model: ${filters.modelVersion}`,
  filters.onlySignalReady && 'Only signal-ready',
  filters.excludePoorQuality && 'Exclude poor quality',
].filter(Boolean) as string[];

const MetricCard: React.FC<{ label: string; value: string; tone?: 'success' | 'warning' | 'error' }> = ({ label, value, tone }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5" color={tone ? `${tone}.main` : 'text.primary'} sx={{ mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const NULL_COL_TOOLTIP = 'not computed in stored path';

const REGIME_ORDER = ['RISK_ON', 'NEUTRAL', 'RISK_OFF', 'UNKNOWN'] as const;
type KnownRegime = typeof REGIME_ORDER[number];

const regimeLabel: Record<KnownRegime, string> = {
  RISK_ON: 'Risk-On',
  NEUTRAL: 'Neutral',
  RISK_OFF: 'Risk-Off',
  UNKNOWN: 'Unknown',
};

const RegimeTable: React.FC<{ rows: QualityMetricGroup[] }> = ({ rows }) => {
  const byRegime = new Map(rows.map((r) => [r.group as KnownRegime, r]));
  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Performance by Regime</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Win rate and avg forward return grouped by market regime at signal date. Research-support only; not a prediction.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Regime</TableCell>
            <TableCell>N (directional)</TableCell>
            <TableCell>Win Rate</TableCell>
            <TableCell>Avg Fwd Return</TableCell>
            <TableCell>Confidence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {REGIME_ORDER.map((regime) => {
            const row = byRegime.get(regime);
            const n = row?.sampleSize ?? 0;
            const isLowSample = n > 0 && n < 30;
            const isNoSample = n === 0;
            return (
              <TableRow key={regime}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{regimeLabel[regime]}</Typography>
                </TableCell>
                <TableCell>
                  {isNoSample ? (
                    <Typography component="span" variant="body2" color="text.disabled">—</Typography>
                  ) : (
                    <>{n.toLocaleString()}</>
                  )}
                </TableCell>
                <TableCell>
                  {isNoSample ? (
                    <Tooltip title="No evaluated outcomes in this regime bucket" arrow>
                      <Typography component="span" variant="body2" color="text.disabled" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.disabled' }}>—</Typography>
                    </Tooltip>
                  ) : (
                    <>
                      {percent(row?.winRate)}
                      {isLowSample && (
                        <Tooltip title={`n=${n} — low sample; interpret with caution`} arrow>
                          <Chip size="small" label="low n" color="warning" variant="outlined" sx={{ ml: 0.5, cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  {isNoSample ? (
                    <Typography component="span" variant="body2" color="text.disabled">—</Typography>
                  ) : (
                    percent(row?.averageForwardReturn)
                  )}
                </TableCell>
                <TableCell>
                  {isNoSample ? (
                    <Typography component="span" variant="body2" color="text.disabled">no samples</Typography>
                  ) : isLowSample ? (
                    <Chip size="small" label="LOW" color="warning" variant="outlined" />
                  ) : n < 100 ? (
                    <Chip size="small" label="MEDIUM" color="info" variant="outlined" />
                  ) : (
                    <Chip size="small" label="HIGH" color="success" variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Confidence: HIGH ≥ 100 samples, MEDIUM ≥ 30, LOW &lt; 30. Regimes with no samples show "—".
        Historical measurement only; not prediction or trading advice.
      </Typography>
    </Paper>
  );
};

const MetricTable: React.FC<{ title: string; rows: (QualityMetricGroup | SignalTypePerformance)[]; nameKey?: 'group' | 'signalType'; emptyReason?: string }> = ({ title, rows, nameKey = 'group', emptyReason }) => (
  <Paper sx={{ p: 2, overflowX: 'auto' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    {rows.length === 0 ? (
      emptyReason
        ? <Alert severity="info" sx={{ mt: 1 }}>{emptyReason}</Alert>
        : <Typography color="text.secondary">No evaluated samples yet. Keep price history current to measure this view.</Typography>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Raw</TableCell>
            <TableCell>Samples</TableCell>
            <TableCell>Unevaluated</TableCell>
            <TableCell>Win Rate</TableCell>
            <TableCell>Avg Return</TableCell>
            <TableCell>Median</TableCell>
            <TableCell>Best</TableCell>
            <TableCell>Worst</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, 10).map((row: any) => (
            <TableRow key={`${row[nameKey]}-${row.horizon}`}>
              <TableCell>
                {row[nameKey]}
                {row.sampleSize < 30 && row.sampleSize > 0 && (
                  <Tooltip title={`n=${row.sampleSize}, low confidence`} arrow>
                    <Chip size="small" label="low n" color="warning" variant="outlined" sx={{ ml: 0.5, cursor: 'help' }} />
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{row.rawSignalCount ?? row.sampleSize}</TableCell>
              <TableCell>{row.sampleSize}</TableCell>
              <TableCell>{row.unevaluatedCount ?? 0}</TableCell>
              <TableCell>{percent(row.winRate)}</TableCell>
              <TableCell>{percent(row.averageForwardReturn)}</TableCell>
              <TableCell>{percent(row.medianForwardReturn, NULL_COL_TOOLTIP)}</TableCell>
              <TableCell>{percent(row.bestReturn, NULL_COL_TOOLTIP)}</TableCell>
              <TableCell>{percent(row.worstReturn, NULL_COL_TOOLTIP)}</TableCell>
              <TableCell>
                <Chip size="small" label={row.status || (row.sampleSize > 0 ? 'EVALUATED' : 'INSUFFICIENT_FUTURE_DATA')} color={row.sampleSize > 0 ? 'success' : 'warning'} variant="outlined" />
                {row.reason && <Typography variant="caption" color="text.secondary" display="block">{row.reason}</Typography>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
);

const SignalQualityLabPage: React.FC = () => {
  const [horizon, setHorizon] = useState<QualityHorizon>('20D');
  const [activeTab, setActiveTab] = useState<QualityTab>('overview');
  const [filters, setFilters] = useState<QualityFilters>({});
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [history, setHistory] = useState<SignalHistoryItem[]>([]);
  const [outcomes, setOutcomes] = useState<SignalOutcomeSet[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { scope } = useMarketScope();
  const { summary, byType, bySector, byRegime, byDataQuality, noisy, loading, error, reload } = useSignalQualityLab(horizon, filters);
  const batchRunner = useBatchRunner();
  const diagnostics = summary?.evaluationDiagnostics;
  const availability = summary?.horizonAvailability;
  const activeFilters = activeFilterLabels(filters);
  const selectedAvailability = availability?.[horizon];
  const evidenceUsability = summary?.evidenceUsability ?? (diagnostics ? (diagnostics.evaluatedSignals > 0 ? 'LIMITED' : 'UNAVAILABLE') : undefined);
  const hasEvaluableEvidence = Boolean(diagnostics && diagnostics.evaluatedSignals > 0);
  const insufficientFutureRowsText = diagnostics
    ? `${plural(diagnostics.insufficientFuturePriceCount, 'signal')} ${diagnostics.insufficientFuturePriceCount === 1 ? 'does' : 'do'} not yet have ${diagnostics.minimumRequiredFutureRows} future trading rows`
    : '';
  const unavailableEvidenceReason = diagnostics
    ? diagnostics.missingPriceHistoryCount > 0 && diagnostics.insufficientFuturePriceCount > 0
      ? `Missing local price history affects ${plural(diagnostics.missingPriceHistoryCount, 'signal')}, and ${insufficientFutureRowsText}.`
      : diagnostics.missingPriceHistoryCount > 0
        ? `Missing local price history affects ${plural(diagnostics.missingPriceHistoryCount, 'signal')}.`
        : diagnostics.insufficientFuturePriceCount > 0
          ? `${insufficientFutureRowsText}.`
          : diagnostics.recommendedAction
    : '';

  const loadInstrument = async () => {
    setFormError(null);
    try {
      const [nextHistory, nextOutcomes] = await Promise.all([
        fetchSignalHistory(selectedInstrument?.id || '', horizon, filters, { region: scope.region, assetType: scope.assetType }),
        fetchSignalOutcomes(selectedInstrument?.id || '', horizon, filters, { region: scope.region, assetType: scope.assetType }),
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
    try {
      const result = await batchRunner.run({
        batchSize: signal_quality_lab_batch_size,
        parallelism: signal_quality_lab_batch_request_workers_count,
        runBatch: async ({ offset, batchSize }) => {
          const response = await recalculateSignalQuality({ batchSize, offset, horizon, region: scope.region, assetType: scope.assetType, modelVersion: filters.modelVersion || undefined });
          await reload();
          return response;
        },
      });
      if (result) {
        await reload();
        setActionMessage(`Signal quality refresh complete. Processed ${result.aggregate.processedCount} / ${result.aggregate.totalCount ?? result.aggregate.processedCount} signal records. Evaluated ${result.aggregate.evaluatedCount}, insufficient future price rows ${result.aggregate.unevaluatedCount}, missing local price history ${result.aggregate.missingPriceHistoryCount}. Outcomes are refreshed and saved.`);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Signal quality diagnostics refresh failed');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Quality Lab"
        subtitle="Historical signal measurement. Outcomes describe past forward returns, not predictions or trading advice."
        primaryAction={
          <Button
            variant="outlined"
            onClick={recalculate}
            disabled={batchRunner.running}
            startIcon={batchRunner.running ? <CircularProgress size={16} /> : undefined}
          >
            {batchRunner.running ? 'Refreshing' : 'Refresh Diagnostics'}
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

      {loading && !summary && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<CircularProgress size={18} />}>
          Loading Signal Quality dashboard for {scope.region}/{scope.assetType}. This page will settle into measured content, an insufficient-data state, or a retryable error.
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
      {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
      {actionMessage && <Alert severity="info" sx={{ mb: 2 }}>{actionMessage}</Alert>}
      <BatchProgressBar
        running={batchRunner.running}
        complete={batchRunner.complete}
        error={batchRunner.error}
        label="Signal quality diagnostics refresh"
        processedCount={batchRunner.processedCount}
        totalCount={batchRunner.totalCount}
        batchCount={batchRunner.batchCount}
        estimatedBatchTotal={batchRunner.totalCount ? Math.ceil(batchRunner.totalCount / signal_quality_lab_batch_size) : undefined}
        evaluatedCount={batchRunner.evaluatedCount}
        unevaluatedCount={batchRunner.unevaluatedCount}
        missingPriceHistoryCount={batchRunner.missingPriceHistoryCount}
        warningsCount={batchRunner.warnings.length}
      />
      {summary?.dataQualityFilterSummary?.filterApplied && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Data quality filter applied: {summary.dataQualityFilterSummary.totalSignalsAfterFilter} / {summary.dataQualityFilterSummary.totalSignalsBeforeFilter} signals included,
          excluded {summary.dataQualityFilterSummary.excludedByDataQuality}, missing evaluations {summary.dataQualityFilterSummary.missingQualityEvaluationCount}.
        </Alert>
      )}
      {summary?.warnings && summary.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summary.warnings.map((w, i) => (
            <Typography key={i} variant="body2">{w}</Typography>
          ))}
        </Alert>
      )}
      {summary && summary.totalSignals === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No signal results are available for quality measurement yet. Run Signal Generation first, then rerun this page after enough future price data exists.
        </Alert>
      )}
      {!loading && !summary && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Signal Quality has no dashboard payload for the selected scope yet. Run Signal Generation or Retry after local data is refreshed.
          <Button color="inherit" size="small" onClick={reload} sx={{ ml: 1 }}>Retry</Button>
        </Alert>
      )}
      {diagnostics && diagnostics.totalSignals > 0 && diagnostics.evaluatedSignals === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Evidence usability is UNAVAILABLE. {diagnostics.totalSignals} signals found, but 0 can be evaluated for the selected {diagnostics.selectedHorizon} horizon.
          {' '}{unavailableEvidenceReason}
          {' '}Try 1D/5D, sync market data, or wait for more trading days. Historical measurement only; not prediction or trading advice.
        </Alert>
      )}
      {diagnostics && activeFilters.length > 0 && diagnostics.evaluatedSignals === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={() => setFilters({})}>Reset filters</Button>}
        >
          Active filters: {activeFilters.join(', ')}. {diagnostics.recommendedAction}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <FilterBar onReset={() => setFilters({})} showReset={activeFilters.length > 0}>
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
          <TextField
            size="small"
            label="Model version"
            value={filters.modelVersion || ''}
            onChange={(event) => setFilters({ ...filters, modelVersion: event.target.value.trim() || undefined })}
            placeholder="Default"
            sx={{ minWidth: 180 }}
          />
          <FormControlLabel control={<Checkbox checked={Boolean(filters.onlySignalReady)} onChange={(event) => setFilters({ ...filters, onlySignalReady: event.target.checked })} />} label="Only signal-ready" />
          <FormControlLabel control={<Checkbox checked={Boolean(filters.excludePoorQuality)} onChange={(event) => setFilters({ ...filters, excludePoorQuality: event.target.checked })} />} label="Exclude poor quality" />
        </FilterBar>
      </Box>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, minHeight: 44, '& .MuiTab-root': { minHeight: 44, fontSize: 13, textTransform: 'none' } }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="performance" label="Performance" />
          <Tab value="noise" label={`Noise (${noisy.length})`} />
          <Tab value="instrument" label="Instrument history" />
        </Tabs>
      </Paper>

      {activeTab === 'overview' && summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <MetricCard label="Selected Horizon" value={summary.selectedHorizon || horizon} />
          <MetricCard label="Evidence Usability" value={evidenceUsability || 'UNAVAILABLE'} tone={evidenceTone(evidenceUsability)} />
          <MetricCard label="Total Signals" value={number(summary.totalSignals)} />
          <MetricCard label="Eligible Signals" value={number(diagnostics?.signalsAfterFilters)} />
          <MetricCard label="Mature / Evaluable" value={number(diagnostics?.matureSignals ?? summary.matureSignals ?? summary.evaluatedSignals)} />
          <MetricCard label="Insufficient Future Rows" value={number(diagnostics?.insufficientFuturePriceCount ?? summary.notYetMatureSignals ?? summary.unevaluatedSignals)} tone={(diagnostics?.insufficientFuturePriceCount ?? summary.notYetMatureSignals ?? summary.unevaluatedSignals) > 0 ? 'warning' : undefined} />
          <MetricCard label="Missing Price History" value={number(diagnostics?.missingPriceHistoryCount)} tone={diagnostics?.missingPriceHistoryCount ? 'error' : undefined} />
          {hasEvaluableEvidence && <MetricCard label="Bullish Win Rate" value={percent(summary.overallBullishWinRate)} tone="success" />}
          {hasEvaluableEvidence && <MetricCard label="Bearish Win Rate" value={percent(summary.overallBearishWinRate)} tone="warning" />}
          {hasEvaluableEvidence && <MetricCard label="Average 5D Return" value={percent(summary.average5DReturn)} />}
          {hasEvaluableEvidence && <MetricCard label="Average 20D Return" value={percent(summary.average20DReturn)} />}
          <MetricCard label="Noisy Signals" value={number(summary.noisySignalCount)} tone={summary.noisySignalCount > 0 ? 'warning' : undefined} />
          <MetricCard label="Data Status" value={summary.dataStatus} />
        </Box>
      )}

      {activeTab === 'performance' && availability && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700}>Horizon Availability</Typography>
              {horizons.map((item) => (
                <Chip
                  key={item}
                  label={`${item}: ${availability[item]?.evaluated ?? 0} / ${availability[item]?.eligible ?? 0} mature`}
                  color={item === horizon ? 'primary' : (availability[item]?.evaluated ?? 0) > 0 ? 'success' : 'default'}
                  variant={item === horizon ? 'filled' : 'outlined'}
                  onClick={() => setHorizon(item)}
                />
              ))}
            </Stack>
            <Typography color="text.secondary" variant="body2">
              Selected {horizon}: eligible {number(selectedAvailability?.eligible)}, mature/evaluable {number(selectedAvailability?.evaluated)}, not yet mature {number(selectedAvailability?.insufficientFuturePrice)}, missing price {number(selectedAvailability?.missingPriceHistory)}, evidence {selectedAvailability?.evidenceUsability ?? evidenceUsability ?? 'UNAVAILABLE'}.
            </Typography>
            {availability[horizon]?.evaluated === 0 && (availability['1D']?.evaluated > 0 || availability['5D']?.evaluated > 0) && (
              <Typography color="text.secondary" variant="body2">A shorter horizon has evaluated samples.</Typography>
            )}
          </Stack>
        </Paper>
      )}

      {activeTab === 'performance' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 3, mb: 3 }}>
          <MetricTable title="Performance by Signal Type" rows={byType} nameKey="signalType" />
          <MetricTable title="Performance by Sector" rows={bySector} />
          <RegimeTable rows={byRegime} />
          <MetricTable
            title="Performance by Data Quality"
            rows={byDataQuality}
            emptyReason={summary?.warnings?.find((w) => /data.quality/i.test(w)) || (byDataQuality.length === 0 ? 'By-data-quality breakdown is not yet available.' : undefined)}
          />
        </Box>
      )}
      {activeTab === 'noise' && (
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
      )}

      {activeTab === 'instrument' && <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Instrument Signal History</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <InstrumentSearchSelect value={selectedInstrument} onChange={setSelectedInstrument} />
          </Box>
          <Button variant="contained" onClick={loadInstrument} disabled={!selectedInstrument}>Load</Button>
        </Stack>
        {history.length === 0 ? (
          <Typography color="text.secondary">Select an instrument to review scoped signal history and forward outcomes.</Typography>
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
                    <TableCell>{item.modelVersion || 'Default'}</TableCell>
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
      </Paper>}
    </Box>
  );
};

export default SignalQualityLabPage;
