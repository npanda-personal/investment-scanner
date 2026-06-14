import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { fetchDataQualityDiagnostics } from '../api/dataQualityEngineService';
import { useDataQualityEngine } from '../hooks';
import type {
  CoverageStatus,
  DataQualityEvaluation,
  DataQualityFilters,
  DataQualityUseCaseTierStatus,
  DataQualityUseCaseTiers,
  LiquidityStatus,
  SignalReadinessStatus,
} from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { DataTable, FilterBar, PageHeader, StatusBadge, type DataTableColumn, type SortDirection } from '@/shared/components';
import { DataQualityPipelineStatusStrip } from './DataQualityPipelineStatusStrip';
import { humanizeCode } from '@/shared/format/enumLabels';

type QualityView = 'all' | 'ready' | 'blocked' | 'coverage' | 'liquidity' | 'backtest';
type QualityTierKey = 'dailyReview' | 'signal' | 'backtest' | 'calibration' | 'automation';

const QUALITY_TIER_ORDER: QualityTierKey[] = ['dailyReview', 'signal', 'backtest', 'calibration', 'automation'];
const QUALITY_TIER_LABELS: Record<QualityTierKey, string> = {
  dailyReview: 'Daily Review',
  signal: 'Signal',
  backtest: 'Backtest',
  calibration: 'Calibration',
  automation: 'Automation',
};

const TIER_REASON_LABELS: Record<string, string> = {
  PHASE0_AUTOMATION_NOT_AUTHORIZED: 'Policy gate: automation is blocked in Phase 0 and is not broker-authorized.',
  TRUST_CONTEXT_MISSING: 'Trusted baseline context is missing.',
  TRUSTED_BASELINE_HISTORY_INCOMPLETE: 'Trusted baseline history is incomplete.',
  LISTING_DATE_CONFIDENCE_MISSING: 'Listing-date confidence is missing.',
  SIGNAL_NOT_READY: 'Signal readiness is not ready.',
  SIGNAL_LIMITED: 'Signal readiness is limited.',
  SIGNAL_LEGACY_INELIGIBLE: 'Signal eligibility is blocked by legacy readiness checks.',
  THIN_LIQUIDITY: 'Liquidity is thin or illiquid.',
  STALE_PRICE: 'Latest price is stale.',
  UNUSABLE_COVERAGE: 'Coverage is unusable.',
  BACKTEST_LEGACY_INELIGIBLE: 'Backtesting is blocked by legacy readiness checks.',
  CALIBRATION_SIGNAL_HISTORY_MISSING: 'Signal history is missing for calibration.',
  CALIBRATION_LEGACY_INELIGIBLE: 'Calibration is blocked by legacy readiness checks.',
};

const normalizeTierReason = (reason: string): string => {
  const normalized = String(reason || '').trim();
  if (!normalized) return 'Unknown tier reason.';
  return TIER_REASON_LABELS[normalized] || normalized.replace(/_/g, ' ').toLowerCase();
};

const statusColor = (value: string): 'success' | 'warning' | 'error' | 'default' => {
  if (['GOOD', 'READY', 'LIQUID'].includes(value)) return 'success';
  if (['PARTIAL', 'LIMITED', 'THIN', 'UNKNOWN'].includes(value)) return 'warning';
  if (['POOR', 'UNUSABLE', 'NOT_READY', 'ILLIQUID', 'BLOCKED'].includes(value)) return 'error';
  return 'default';
};

const formatPercent = (value: number, total: number) => {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const fallbackUseCaseTiers = (item: DataQualityEvaluation): DataQualityUseCaseTiers => {
  const stale = item.dataGaps.some((gap) => gap.toLowerCase().includes('stale'));
  const dailyReview: DataQualityUseCaseTiers['dailyReview'] = stale || item.coverageStatus === 'UNUSABLE'
    ? { status: 'BLOCKED', reasons: [stale ? 'STALE_PRICE' : 'UNUSABLE_COVERAGE'] }
    : item.signalReadinessStatus === 'LIMITED' || item.signalReadinessStatus === 'NOT_READY' || item.liquidityStatus === 'THIN' || item.liquidityStatus === 'ILLIQUID'
      ? { status: 'LIMITED', reasons: [item.signalReadinessStatus === 'LIMITED' ? 'SIGNAL_LIMITED' : item.signalReadinessStatus === 'NOT_READY' ? 'SIGNAL_NOT_READY' : 'THIN_LIQUIDITY'] }
      : { status: 'READY', reasons: [] };

  const signal: DataQualityUseCaseTiers['signal'] = stale || item.signalReadinessStatus === 'NOT_READY'
    ? { status: 'BLOCKED', reasons: [stale ? 'STALE_PRICE' : 'SIGNAL_NOT_READY'] }
    : item.signalReadinessStatus === 'LIMITED' || !item.eligibleForSignals || item.liquidityStatus === 'THIN' || item.liquidityStatus === 'ILLIQUID'
      ? { status: 'LIMITED', reasons: [item.signalReadinessStatus === 'LIMITED' ? 'SIGNAL_LIMITED' : !item.eligibleForSignals ? 'SIGNAL_LEGACY_INELIGIBLE' : 'THIN_LIQUIDITY'] }
      : { status: 'READY', reasons: [] };

  const backtest: DataQualityUseCaseTiers['backtest'] = !item.eligibleForBacktesting
    ? { status: 'BLOCKED', reasons: ['BACKTEST_LEGACY_INELIGIBLE'] }
    : signal.status === 'LIMITED' || item.liquidityStatus === 'THIN'
      ? { status: 'LIMITED', reasons: [signal.status === 'LIMITED' ? 'SIGNAL_LIMITED' : 'THIN_LIQUIDITY'] }
      : { status: 'READY', reasons: [] };

  const calibration: DataQualityUseCaseTiers['calibration'] = !item.eligibleForCalibration
    ? { status: 'BLOCKED', reasons: ['CALIBRATION_LEGACY_INELIGIBLE'] }
    : signal.status === 'LIMITED'
      ? { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] }
      : { status: 'READY', reasons: [] };

  return {
    dailyReview,
    signal,
    backtest,
    calibration,
    automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
  };
};

const resolvedUseCaseTiers = (item: DataQualityEvaluation): DataQualityUseCaseTiers => item.useCaseTiers || fallbackUseCaseTiers(item);

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
        <Chip size="small" label={humanizeCode(status)} color={color} variant="outlined" />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, score))}
        color={progressColor}
      />
    </Stack>
  );
};

const TierStatusChip: React.FC<{ status: DataQualityUseCaseTierStatus }> = ({ status }) => (
  <Chip size="small" label={humanizeCode(status)} color={statusColor(status)} variant="outlined" sx={{ minWidth: 86 }} />
);

const DataQualityEnginePage: React.FC = () => {
  const { scope } = useMarketScope();
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

  const { summary, reviewReadiness, items, total, loading, error, reload } = useDataQualityEngine(filters);
  const selectedTiers = useMemo<DataQualityUseCaseTiers | null>(() => (selected ? resolvedUseCaseTiers(selected) : null), [selected]);
  const selectedTierBlockers = useMemo(() => {
    if (!selectedTiers) return [] as string[];
    return QUALITY_TIER_ORDER.flatMap((tierKey) => {
      const tier = selectedTiers[tierKey];
      if (tier.status !== 'BLOCKED') return [];
      return tier.reasons.map((reason) => `${QUALITY_TIER_LABELS[tierKey]}: ${normalizeTierReason(reason)}`);
    });
  }, [selectedTiers]);

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
    { id: 'dailyReviewTier', label: 'Daily Review', render: (item) => <TierStatusChip status={resolvedUseCaseTiers(item).dailyReview.status} /> },
    { id: 'signalTier', label: 'Signal Tier', render: (item) => <TierStatusChip status={resolvedUseCaseTiers(item).signal.status} /> },
    { id: 'backtestTier', label: 'Backtest Tier', render: (item) => <TierStatusChip status={resolvedUseCaseTiers(item).backtest.status} /> },
    { id: 'calibrationTier', label: 'Calibration Tier', render: (item) => <TierStatusChip status={resolvedUseCaseTiers(item).calibration.status} /> },
    { id: 'automationTier', label: 'Automation Tier', render: (item) => <TierStatusChip status={resolvedUseCaseTiers(item).automation.status} /> },
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
    <Box className="page-container page-container--workspace" sx={{ minWidth: 0 }}>
      <PageHeader
        title="Data Quality Engine"
        subtitle="Coverage, readiness, and liquidity checks for downstream research modules."
        secondaryActions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void reload()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <DataQualityPipelineStatusStrip region={scope.region} assetType={scope.assetType} />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          Market is controlled by the global header selector: <strong>{scope.region}</strong> / <strong>{scope.assetType}</strong>.
          Data Quality is a gatekeeper for signals, calibration, backtesting, and trade-plan readiness.
        </Typography>
      </Paper>

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{error || formError}</Alert>}

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
          <MetricCard label="Signal Ready / Total" value={`${summary.signalReadyCount}/${summary.totalInstruments}`} detail={`${formatPercent(summary.signalReadyCount, summary.totalInstruments)} signal-ready | ${evaluatedCount} evaluated`} />
          <MetricCard label="Signal Ready" value={summary.signalReadyCount} detail={`${formatPercent(summary.signalReadyCount, Math.max(evaluatedCount, 1))} of evaluated rows`} />
          <MetricCard label="Blocked Or Limited" value={blockedCount} detail="Not ready for signal generation" />
          <MetricCard label="Issue Flags" value={summary.stalePriceCount + summary.missingVolumeCount + summary.lowLiquidityCount} detail="Overlapping stale, volume, and liquidity flags" />
        </Box>
      )}

      {reviewReadiness && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>Review Readiness Summary</Typography>
              <Chip size="small" label={`Mode: ${humanizeCode(reviewReadiness.reviewMode)}`} color={reviewReadiness.reviewMode === 'FULL_REVIEW' ? 'success' : reviewReadiness.reviewMode === 'LIMITED_REVIEW' ? 'warning' : 'error'} />
              <Chip size="small" label={`Decision: ${reviewReadiness.userDecision}`} variant="outlined" />
              <Chip size="small" label={`Trust: ${reviewReadiness.trustStatus}`} variant="outlined" />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              <Typography variant="caption">Trusted / catalog: {reviewReadiness.reviewUniverse.trustedCount} / {reviewReadiness.reviewUniverse.catalogCount}</Typography>
              <Typography variant="caption">Provider-supported: {reviewReadiness.reviewUniverse.providerSupportedCount}</Typography>
              <Typography variant="caption">Stored data-through: {reviewReadiness.reviewUniverse.storedDataThroughDate || 'none'}</Typography>
              <Typography variant="caption">Next bounded action: {reviewReadiness.nextAction?.label || 'none'}</Typography>
              <Typography variant="caption">Batch size: {reviewReadiness.nextAction?.boundedRequest?.batchSize || 'n/a'}</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ mb: 2, px: 1, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={{ xs: 0.5, md: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: { xs: 1, md: 0 }, flexShrink: 0, fontWeight: 600 }}>
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
        emptyMessage={scope.assetType === 'CRYPTO' ? 'Data quality evaluation is not yet available for crypto. Crypto assets are tracked separately and are not part of the Data Quality Engine universe.' : activeFilters.length > 0 ? `No evaluations match ${activeFilters.join(', ')}.` : 'No data quality evaluations found. Use Pipeline Ops to run scope evaluation and refresh this page.'}
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
              <Chip size="small" variant="outlined" label={humanizeCode(selected.coverageStatus)} color={statusColor(selected.coverageStatus)} />
              <Chip size="small" variant="outlined" label={humanizeCode(selected.signalReadinessStatus)} color={statusColor(selected.signalReadinessStatus)} />
              <Chip size="small" variant="outlined" label={humanizeCode(selected.liquidityStatus)} color={statusColor(selected.liquidityStatus)} />
              <StatusBadge label={selected.eligibleForSignals ? 'SIGNALS YES' : 'SIGNALS NO'} />
            </Stack>
            {selectedTiers?.automation.status === 'BLOCKED' && (
              <Alert severity="warning">
                Automation remains policy-blocked in Phase 0 and is not broker-authorized.
              </Alert>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Scores</Typography>
              <Stack spacing={1.25}>
                <ScoreStatus score={selected.coverageScore} status={selected.coverageStatus} />
                <ScoreStatus score={selected.signalReadinessScore} status={selected.signalReadinessStatus} />
                <ScoreStatus score={selected.liquidityScore} status={selected.liquidityStatus} />
              </Stack>
            </Box>
            {selectedTiers && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Use-case Readiness</Typography>
                <Stack spacing={1}>
                  {QUALITY_TIER_ORDER.map((tierKey) => {
                    const tier = selectedTiers[tierKey];
                    return (
                      <Stack key={tierKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="body2">{QUALITY_TIER_LABELS[tierKey]}</Typography>
                        <TierStatusChip status={tier.status} />
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Eligibility</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2"><strong>Signals:</strong> {selected.eligibleForSignals ? 'YES' : 'NO'}</Typography>
                <Typography variant="body2"><strong>Backtesting:</strong> {selected.eligibleForBacktesting ? 'YES' : 'NO'}</Typography>
                <Typography variant="body2"><strong>Calibration:</strong> {selected.eligibleForCalibration ? 'YES' : 'NO'}</Typography>
              </Stack>
            </Box>
            {selected?.tierEvidence && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Tier Evidence</Typography>
                <Stack spacing={0.75}>
                  <Typography variant="body2"><strong>Trusted baseline:</strong> {selected.tierEvidence.trustedBaselineResidualState || 'n/a'}</Typography>
                  <Typography variant="body2"><strong>Required history:</strong> {selected.tierEvidence.requiredHistoryStatus || 'n/a'}</Typography>
                  <Typography variant="body2"><strong>Listing date status:</strong> {selected.tierEvidence.listingDateStatus || 'n/a'}</Typography>
                  <Typography variant="body2"><strong>Signal history:</strong> {selected.tierEvidence.hasSignalHistory ? 'present' : 'missing'}</Typography>
                </Stack>
              </Box>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Tier Blockers (blocker-first)</Typography>
              {selectedTierBlockers.length
                ? selectedTierBlockers.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>)
                : <Typography color="text.secondary" variant="body2">No tier blockers detected.</Typography>}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Data Gaps</Typography>
              {selected.dataGaps.length ? selected.dataGaps.map((item, i) => <Typography key={`${item}-${i}`} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No major gaps detected.</Typography>}
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
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
};

export default DataQualityEnginePage;
