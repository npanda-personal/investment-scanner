import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ScienceIcon from '@mui/icons-material/Science';
import { DataTable, PageHeader } from '@/shared/components';
import { InstrumentSearchSelect } from '@/shared/components/EntitySearchSelect';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';
import { evaluateStrategy, fetchStrategies, fetchStrategy, fetchStrategyPerformance, fetchStrategyProof, fetchStrategyProofRegistry, fetchStrategyRankings } from '../api/strategyFrameworkApi';
import type { StrategyDefinition, StrategyEvaluationResult, StrategyPerformanceSummary, StrategyProofRegistryResponse, StrategyProofRegistryRow, StrategyTimeframe } from '../types';

const timeframes: StrategyTimeframe[] = ['1Y', '3Y', '5Y', '10Y', '15Y'];
const categoryFilters = ['ALL', 'ENTRY', 'EXIT', 'GATE', 'FILTER', 'DRAFT'] as const;

const StrategyFrameworkPage: React.FC = () => {
  const { scope } = useMarketScope();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = React.useState(0);
  const [strategies, setStrategies] = React.useState<StrategyDefinition[]>([]);
  const [selectedCode, setSelectedCode] = React.useState('TREND_MOMENTUM');
  const [selected, setSelected] = React.useState<StrategyDefinition | null>(null);
  const [timeframe, setTimeframe] = React.useState<StrategyTimeframe>('1Y');
  const [performance, setPerformance] = React.useState<StrategyPerformanceSummary[]>([]);
  const [rankings, setRankings] = React.useState<StrategyPerformanceSummary[]>([]);
  const [proofRegistry, setProofRegistry] = React.useState<StrategyProofRegistryResponse | null>(null);
  const [selectedProof, setSelectedProof] = React.useState<StrategyProofRegistryRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [evaluationError, setEvaluationError] = React.useState<string | null>(null);
  const [instrument, setInstrument] = React.useState<V1Instrument | null>(null);
  const [evaluation, setEvaluation] = React.useState<StrategyEvaluationResult[]>([]);
  const [sortBy, setSortBy] = React.useState('ratingScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = React.useState<typeof categoryFilters[number]>('ALL');

  React.useEffect(() => {
    const linkedCode = searchParams.get('strategyCode');
    if (linkedCode) {
      setSelectedCode(linkedCode.toUpperCase());
      setTab(2);
    }
  }, [searchParams]);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStrategies({ region: scope.region, assetType: scope.assetType })
      .then((items) => {
        setStrategies(items);
        if (!items.some((item) => item.code === selectedCode)) setSelectedCode(items[0]?.code || '');
      })
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load strategies.'))
      .finally(() => setLoading(false));
  }, [scope.region, scope.assetType]);

  React.useEffect(() => {
    if (!selectedCode) return;
    Promise.all([
      fetchStrategy(selectedCode, { region: scope.region, assetType: scope.assetType }),
      fetchStrategyPerformance(selectedCode, { region: scope.region, assetType: scope.assetType }),
      fetchStrategyRankings({ timeframe, region: scope.region, assetType: scope.assetType }),
      fetchStrategyProofRegistry({ timeframe, region: scope.region, assetType: scope.assetType }),
      fetchStrategyProof(selectedCode, { timeframe, region: scope.region, assetType: scope.assetType }),
    ])
      .then(([detail, perf, ranks, registry, proof]) => {
        setSelected(detail);
        setPerformance(perf);
        setRankings(ranks);
        setProofRegistry(registry);
        setSelectedProof(proof);
      })
      .catch(() => {
        setSelected(null);
        setPerformance([]);
        setRankings([]);
        setProofRegistry(null);
        setSelectedProof(null);
      });
  }, [selectedCode, timeframe, scope.region, scope.assetType]);

  React.useEffect(() => {
    setEvaluation([]);
    setEvaluationError(null);
  }, [instrument?.id, selectedCode, scope.region, scope.assetType]);

  const sortedRankings = React.useMemo(() => {
    return [...rankings].sort((a, b) => {
      const left = Number((a as any)[sortBy] ?? 0);
      const right = Number((b as any)[sortBy] ?? 0);
      return sortDirection === 'asc' ? left - right : right - left;
    });
  }, [rankings, sortBy, sortDirection]);

  const visibleStrategies = React.useMemo(() => {
    if (categoryFilter === 'ALL') return strategies;
    if (categoryFilter === 'DRAFT') return strategies.filter((strategy) => strategy.status === 'DRAFT');
    return strategies.filter((strategy) => strategy.category === categoryFilter && strategy.status !== 'DRAFT');
  }, [strategies, categoryFilter]);

  const runEvaluation = async () => {
    if (!instrument) return;
    setRunning(true);
    setEvaluationError(null);
    try {
      const result = await evaluateStrategy({
        strategyCode: selectedCode || 'ALL',
        instrumentId: instrument.id,
        region: scope.region,
        assetType: scope.assetType,
      });
      setEvaluation(result.results);
      setTab(5);
    } catch (err: any) {
      setEvaluation([]);
      setEvaluationError(err?.response?.data?.error || 'Strategy evaluation failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Strategy Framework"
        subtitle="Reusable deterministic strategy registry for signals, decisions, and backtests."
        badges={<Stack direction="row" spacing={1}>{[`${strategies.length} configured`, scope.region, scope.assetType].map((item) => <Chip key={item} size="small" label={item} />)}</Stack>}
      />
      <Alert severity="info" sx={{ mb: 2 }}>Research support only, not financial advice. No real-money automation is enabled.</Alert>
      <Alert severity="info" sx={{ mb: 2 }}>Active ENTRY strategies are standalone candidates for registered backtests. EXIT, GATE, FILTER, and DRAFT definitions support decisions and diagnostics until dedicated simulation semantics exist.</Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Catalog" />
          <Tab label="Proof Registry" />
          <Tab label="Detail" />
          <Tab label="Performance" />
          <Tab label="Rankings" />
          <Tab label="Evaluate Stock" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {categoryFilters.map((filter) => (
                <Chip
                  key={filter}
                  label={categoryFilterLabel(filter, strategies)}
                  color={categoryFilter === filter ? 'primary' : 'default'}
                  variant={categoryFilter === filter ? 'filled' : 'outlined'}
                  onClick={() => setCategoryFilter(filter)}
                  data-testid={`strategy-category-${filter.toLowerCase()}`}
                />
              ))}
            </Stack>
          </Paper>
          <DataTable
            columns={[
              { id: 'code', label: 'Strategy', sortable: true, render: (row) => <Stack spacing={0.5}><Typography fontWeight={700}>{row.name}</Typography><Typography variant="caption">{row.code}</Typography></Stack> },
              { id: 'category', label: 'Category', render: (row) => categoryChip(row.category) },
              { id: 'status', label: 'Status', render: (row) => <Chip size="small" label={row.status} color={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' ? 'warning' : 'default'} /> },
              { id: 'style', label: 'Style', render: (row) => row.style },
              { id: 'rating', label: 'Latest rating', render: (row) => <Stack direction="row" spacing={1} alignItems="center">{ratingChip(row.latestPerformance?.ratingGrade)}{hasWarnings(row.latestPerformance) && <Chip size="small" label="Warnings" color="warning" />}</Stack> },
              { id: 'readiness', label: 'Readiness', render: (row) => readinessChip(row.latestPerformance?.readinessLabel) },
              { id: 'action', label: 'Actions', render: (row) => <StrategyActions strategy={row} region={scope.region} assetType={scope.assetType} onView={() => { setSelectedCode(row.code); setTab(2); }} /> },
            ]}
            rows={visibleStrategies}
            getRowId={(row) => row.code}
            loading={loading}
            error={error}
            emptyMessage={`No ${categoryFilter === 'ALL' ? '' : categoryFilter.toLowerCase()} strategies found for the current scope.`}
            page={0}
            pageSize={10}
            totalCount={visibleStrategies.length}
            onPageChange={() => undefined}
            onPageSizeChange={() => undefined}
          />
        </Stack>
      )}

      {tab === 1 && (
        <StrategyProofRegistryView
          registry={proofRegistry}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onSelect={(code) => {
            setSelectedCode(code);
            setTab(2);
          }}
        />
      )}

      {tab === 2 && selected && <StrategyDetail strategy={selected} proof={selectedProof} onStrategyChange={setSelectedCode} strategies={strategies} region={scope.region} assetType={scope.assetType} />}

      {tab === 3 && (
        <Stack spacing={2}>
          <ToolbarSelector strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          <PerformanceMatrix summaries={performance} selected={selected} region={scope.region} assetType={scope.assetType} />
        </Stack>
      )}

      {tab === 4 && (
        <Stack spacing={2}>
          <ToolbarSelector strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          <DataTable
            columns={[
              { id: 'strategyCode', label: 'Strategy', sortable: true, render: (row) => row.strategyCode },
              { id: 'ratingScore', label: 'Rating', sortable: true, render: (row) => <Stack direction="row" spacing={1}>{ratingChip(row.ratingGrade)}<Typography>{row.ratingScore}</Typography></Stack> },
              { id: 'cagr', label: 'CAGR', sortable: true, render: (row) => percent(row.cagr) },
              { id: 'excessCagr', label: 'Excess CAGR', sortable: true, render: (row) => percent(row.excessCagr) },
              { id: 'maxDrawdown', label: 'Worst drawdown', sortable: true, render: (row) => percent(row.maxDrawdown) },
              { id: 'tradeCount', label: 'Trades', sortable: true, render: (row) => row.tradeCount },
              { id: 'readinessLabel', label: 'Readiness', render: (row) => readinessChip(row.readinessLabel) },
              { id: 'action', label: 'Action', render: (row) => <Button size="small" href={labLink(row.strategyCode, row.timeframe, scope.region, scope.assetType)}>View Detailed Backtest</Button> },
            ]}
            rows={sortedRankings}
            getRowId={(row) => `${row.strategyCode}-${row.timeframe}-${row.region}`}
            page={0}
            pageSize={10}
            totalCount={sortedRankings.length}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(nextSortBy, nextDirection) => { setSortBy(nextSortBy); setSortDirection(nextDirection); }}
            onPageChange={() => undefined}
            onPageSizeChange={() => undefined}
            emptyMessage="No persisted rankings yet. Run a manual backtest to create one."
          />
        </Stack>
      )}

      {tab === 5 && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}><InstrumentSearchSelect value={instrument} onChange={setInstrument} /></Grid>
              <Grid item xs={12} md={4}><ToolbarStrategySelect strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} /></Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={running ? <CircularProgress color="inherit" size={16} /> : <FactCheckIcon />}
                  disabled={!instrument || running}
                  onClick={runEvaluation}
                >
                  {running ? 'Evaluating' : 'Evaluate'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {evaluationError && <Alert severity="error">{evaluationError}</Alert>}
          <EvaluationList results={evaluation} instrument={instrument} />
        </Stack>
      )}
    </Box>
  );
};

function ToolbarSelector({ strategies, selectedCode, onStrategyChange, timeframe, onTimeframeChange }: { strategies: StrategyDefinition[]; selectedCode: string; onStrategyChange: (value: string) => void; timeframe: StrategyTimeframe; onTimeframeChange: (value: StrategyTimeframe) => void }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <ToolbarStrategySelect strategies={strategies} selectedCode={selectedCode} onStrategyChange={onStrategyChange} />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Timeframe</InputLabel>
        <Select label="Timeframe" value={timeframe} onChange={(event) => onTimeframeChange(event.target.value as StrategyTimeframe)}>
          {timeframes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  );
}

function ToolbarStrategySelect({ strategies, selectedCode, onStrategyChange }: { strategies: StrategyDefinition[]; selectedCode: string; onStrategyChange: (value: string) => void }) {
  return (
    <FormControl size="small" sx={{ minWidth: 260 }}>
      <InputLabel>Strategy</InputLabel>
      <Select label="Strategy" value={selectedCode} onChange={(event) => onStrategyChange(event.target.value)}>
        {strategies.map((strategy) => <MenuItem key={strategy.code} value={strategy.code}>{strategy.name} ({strategy.category}{strategy.status === 'DRAFT' ? ', draft' : ''})</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function StrategyProofRegistryView({ registry, timeframe, onTimeframeChange, onSelect }: { registry: StrategyProofRegistryResponse | null; timeframe: StrategyTimeframe; onTimeframeChange: (value: StrategyTimeframe) => void; onSelect: (code: string) => void }) {
  const rows = registry?.rows ?? [];
  const counts = registry?.statusCounts ?? { PROVEN: 0, LIMITED: 0, UNPROVEN: 0, BLOCKED: 0, MISSING: 0 };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select label="Timeframe" value={timeframe} onChange={(event) => onTimeframeChange(event.target.value as StrategyTimeframe)}>
            {timeframes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {(['PROVEN', 'LIMITED', 'UNPROVEN', 'BLOCKED', 'MISSING'] as const).map((status) => <Chip key={status} size="small" label={`${status} ${counts[status] || 0}`} color={proofStatusColor(status)} variant={status === 'MISSING' ? 'outlined' : 'filled'} />)}
        </Stack>
      </Stack>
      <DataTable
        columns={[
          { id: 'strategyCode', label: 'Strategy', render: (row) => <Stack spacing={0.5}><Typography fontWeight={700}>{row.strategyName}</Typography><Typography variant="caption">{row.strategyCode} v{row.strategyVersion}</Typography></Stack> },
          { id: 'status', label: 'Proof', render: (row) => proofStatusChip(row.status) },
          { id: 'scope', label: 'Scope', render: (row) => `${row.scope.region} / ${row.scope.assetType} / ${row.selectedTimeframe}` },
          { id: 'sample', label: 'Sample', render: (row) => <Stack spacing={0.5}><Typography>{row.sample.tradeCount}/{row.sample.requiredTradeCount || 'N/A'} trades</Typography><Chip size="small" label={row.sample.sampleSufficiency} variant="outlined" /></Stack> },
          { id: 'performance', label: 'Performance', render: (row) => <Stack spacing={0.5}><Typography variant="body2">CAGR {percent(row.performance.cagr)}</Typography><Typography variant="body2">DD {percent(row.performance.maxDrawdown)} Win {percent(row.performance.winRate)}</Typography></Stack> },
          { id: 'rating', label: 'Rating', render: (row) => <Stack spacing={0.5}>{ratingChip(row.rating.ratingGrade)}{readinessChip(row.rating.readinessLabel)}{(row.rating.warnings.length > 0 || row.rating.capsApplied.length > 0) && <Chip size="small" label="Warnings/Caps" color="warning" />}</Stack> },
          { id: 'reason', label: 'Evidence Gap', render: (row) => row.missingEvidenceReason || row.rating.warnings[0] || row.rating.capsApplied[0] || 'Compact proof criteria satisfied.' },
          { id: 'action', label: 'Next Action', render: (row) => <Stack direction="row" spacing={1}><Button size="small" onClick={() => onSelect(row.strategyCode)}>Details</Button>{row.nextAction && <Button size="small" href={row.nextAction.targetRoute}>{row.nextAction.label}</Button>}</Stack> },
        ]}
        rows={rows}
        getRowId={(row) => `${row.strategyCode}-${row.selectedTimeframe}-${row.scope.region}-${row.scope.assetType}`}
        page={0}
        pageSize={10}
        totalCount={rows.length}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        emptyMessage="No strategy proof rows found for the selected scope."
      />
    </Stack>
  );
}

function StrategyDetail({ strategy, proof, onStrategyChange, strategies, region, assetType }: { strategy: StrategyDefinition; proof: StrategyProofRegistryRow | null; onStrategyChange: (value: string) => void; strategies: StrategyDefinition[]; region: string; assetType: string }) {
  return (
    <Stack spacing={2}>
      <ToolbarStrategySelect strategies={strategies} selectedCode={strategy.code} onStrategyChange={onStrategyChange} />
      {proof && <StrategyProofPanel proof={proof} />}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center"><Typography variant="h6">{strategy.name}</Typography><Chip size="small" label={strategy.status} /></Stack>
            <BacktestButton strategy={strategy} region={region} assetType={assetType} variant="contained" />
          </Stack>
          <Typography color="text.secondary">{strategy.description}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">{[strategy.category, strategy.style, strategy.timeframe, ...strategy.supportedRegions, ...strategy.assetTypes].map((item) => <Chip key={item} size="small" label={item} />)}</Stack>
          <Divider />
          <RuleSection title="Entry Rules" rules={strategy.entryRules} />
          <RuleSection title="Exit Rules" rules={strategy.exitRules} />
          <RuleSection title="Noise Filters" rules={strategy.noiseFilters} />
          <RuleSection title="Default Risk Rules" rules={strategy.riskRules} />
          <RuleSection title="Required Data" rules={strategy.requiredInputs.map((input) => ({ code: input, label: input, kind: 'REQUIRES', input }))} />
        </Stack>
      </Paper>
    </Stack>
  );
}

function StrategyProofPanel({ proof }: { proof: StrategyProofRegistryRow }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h6">Proof Evidence</Typography>
          {proofStatusChip(proof.status)}
          <Chip size="small" label={`${proof.scope.region} / ${proof.scope.assetType} / ${proof.selectedTimeframe}`} />
          <Chip size="small" label={`${proof.sample.tradeCount}/${proof.sample.requiredTradeCount || 'N/A'} trades`} variant="outlined" />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><MetricBlock label="CAGR" value={percent(proof.performance.cagr)} /></Grid>
          <Grid item xs={12} md={4}><MetricBlock label="Max Drawdown" value={percent(proof.performance.maxDrawdown)} /></Grid>
          <Grid item xs={12} md={4}><MetricBlock label="Win Rate" value={percent(proof.performance.winRate)} /></Grid>
        </Grid>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {ratingChip(proof.rating.ratingGrade)}
          {readinessChip(proof.rating.readinessLabel)}
          {proof.rating.warnings.map((warning) => <Chip key={warning} size="small" label={warning} color="warning" />)}
          {proof.rating.capsApplied.map((cap) => <Chip key={cap} size="small" label={cap} color="warning" variant="outlined" />)}
        </Stack>
        {proof.missingEvidenceReason && <Alert severity={proof.status === 'BLOCKED' ? 'warning' : 'info'}>{proof.missingEvidenceReason}</Alert>}
        {proof.nextAction && <Button size="small" sx={{ alignSelf: 'flex-start' }} href={proof.nextAction.targetRoute}>{proof.nextAction.label}</Button>}
      </Stack>
    </Paper>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={700}>{value}</Typography></Box>;
}

function RuleSection({ title, rules }: { title: string; rules: Array<{ code: string; label: string }> }) {
  return <Box><Typography variant="subtitle2" gutterBottom>{title}</Typography><Stack spacing={0.5}>{rules.length ? rules.map((rule) => <Typography key={rule.code} variant="body2">- {rule.label}</Typography>) : <Typography variant="body2" color="text.secondary">None configured.</Typography>}</Stack></Box>;
}

function PerformanceMatrix({ summaries, selected, region, assetType }: { summaries: StrategyPerformanceSummary[]; selected: StrategyDefinition | null; region: string; assetType: string }) {
  const byTimeframe = new Map(summaries.map((summary) => [summary.timeframe, summary]));
  return (
    <DataTable
      columns={[
        { id: 'timeframe', label: 'Timeframe', render: (row) => row.timeframe },
        { id: 'availability', label: 'Availability', render: (row) => row.summary ? <Chip size="small" label="AVAILABLE" color="success" /> : <Chip size="small" label="NOT_RUN" /> },
        { id: 'cagr', label: 'CAGR', render: (row) => percent(row.summary?.cagr) },
        { id: 'totalReturn', label: 'Total return', render: (row) => percent(row.summary?.totalReturn) },
        { id: 'benchmark', label: 'Benchmark', render: (row) => percent(row.summary?.benchmarkCagr) },
        { id: 'excess', label: 'Excess', render: (row) => percent(row.summary?.excessCagr) },
        { id: 'maxDrawdown', label: 'Max drawdown', render: (row) => percent(row.summary?.maxDrawdown) },
        { id: 'sharpe', label: 'Sharpe', render: (row) => value(row.summary?.sharpe) },
        { id: 'trades', label: 'Trades', render: (row) => row.summary?.tradeCount ?? 0 },
        { id: 'rating', label: 'Rating', render: (row) => <Stack direction="row" spacing={1} alignItems="center">{ratingChip(row.summary?.ratingGrade)}{hasWarnings(row.summary) && <Chip size="small" label="Warnings" color="warning" />}</Stack> },
        { id: 'readiness', label: 'Readiness', render: (row) => readinessChip(row.summary?.readinessLabel) },
        { id: 'action', label: 'Action', render: (row) => selected ? <BacktestButton strategy={selected} region={region} assetType={assetType} timeframe={row.timeframe} /> : <Button size="small" disabled>Backtest in Lab</Button> },
      ]}
      rows={timeframes.map((item) => ({ timeframe: item, summary: byTimeframe.get(item) }))}
      getRowId={(row) => row.timeframe}
      page={0}
      pageSize={5}
      totalCount={5}
      onPageChange={() => undefined}
      onPageSizeChange={() => undefined}
      emptyMessage="No performance summaries yet."
    />
  );
}

function EvaluationList({ results, instrument }: { results: StrategyEvaluationResult[]; instrument: V1Instrument | null }) {
  if (results.length === 0) return <Alert severity="info">Select a stock and run evaluation to see matches, blockers, and data gaps.</Alert>;
  const matched = results.filter((result) => result.blockers.length === 0 && !['WAIT', 'INSUFFICIENT_DATA', 'AVOID'].includes(result.decision)).length;
  const blocked = results.filter((result) => result.blockers.length > 0 || result.decision === 'INSUFFICIENT_DATA' || result.decision === 'AVOID').length;
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        {instrument?.symbol || 'Selected instrument'} evaluated against {results.length} strategies: {matched} match{matched === 1 ? '' : 'es'}, {blocked} blocked or missing data.
      </Alert>
      {results.map((result) => (
        <Paper key={result.strategyCode} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography fontWeight={700}>{result.strategyCode}</Typography>
              <Chip size="small" label={result.decision} color={result.blockers.length ? 'warning' : result.decision === 'WAIT' ? 'default' : 'success'} />
              <Chip size="small" label={`${result.score}/100`} />
              {result.marketGateStatus && <Chip size="small" label={`Market: ${result.marketGateStatus}`} variant="outlined" />}
            </Stack>
            <Typography variant="body2">{result.reasons.slice(0, 3).join(' ') || 'No positive rules passed.'}</Typography>
            {result.blockers.length > 0 && <Alert severity="warning">{result.blockers.join(' ')}</Alert>}
            {result.dataGaps.length > 0 && <Typography variant="caption" color="text.secondary">Data gaps: {result.dataGaps.join('; ')}</Typography>}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function ratingChip(grade?: string | null) {
  return <Chip size="small" label={grade || 'UNPROVEN'} color={grade === 'EXCELLENT' ? 'success' : grade === 'GOOD' ? 'primary' : grade === 'WEAK' ? 'warning' : 'default'} />;
}

function proofStatusChip(status: StrategyProofRegistryRow['status']) {
  return <Chip size="small" label={status} color={proofStatusColor(status)} variant={status === 'MISSING' ? 'outlined' : 'filled'} />;
}

function proofStatusColor(status: StrategyProofRegistryRow['status']) {
  if (status === 'PROVEN') return 'success' as const;
  if (status === 'LIMITED') return 'primary' as const;
  if (status === 'UNPROVEN' || status === 'BLOCKED') return 'warning' as const;
  return 'default' as const;
}

function StrategyActions({ strategy, region, assetType, onView }: { strategy: StrategyDefinition; region: string; assetType: string; onView: () => void }) {
  return (
    <Stack direction="row" spacing={1}>
      <Button startIcon={<VisibilityIcon />} size="small" onClick={onView}>View</Button>
      <BacktestButton strategy={strategy} region={region} assetType={assetType} />
    </Stack>
  );
}

function BacktestButton({ strategy, region, assetType, timeframe = '3Y', variant = 'text' }: { strategy: StrategyDefinition; region: string; assetType: string; timeframe?: StrategyTimeframe; variant?: 'text' | 'contained' }) {
  const allowed = canRunStandaloneBacktest(strategy);
  const button = (
    <span>
      <Button
        startIcon={<ScienceIcon />}
        size="small"
        variant={variant}
        disabled={!allowed}
        href={allowed ? labLink(strategy.code, timeframe, region, assetType) : undefined}
      >
        Backtest in Lab
      </Button>
    </span>
  );
  return allowed ? button : <Tooltip title={backtestUnavailableReason(strategy)}>{button}</Tooltip>;
}

function canRunStandaloneBacktest(strategy: StrategyDefinition) {
  return strategy.status === 'ACTIVE' && strategy.category === 'ENTRY';
}

function backtestUnavailableReason(strategy: StrategyDefinition) {
  if (strategy.status !== 'ACTIVE') return `${strategy.name} is ${strategy.status.toLowerCase()} and is not available for registered backtests.`;
  return `${strategy.name} is a ${strategy.category.toLowerCase()} rule. Registered backtests currently support active entry strategies only.`;
}

function categoryChip(category: string) {
  const color = category === 'ENTRY' ? 'primary' : category === 'EXIT' ? 'warning' : category === 'GATE' ? 'secondary' : 'default';
  return <Chip size="small" label={category} color={color as any} variant={category === 'FILTER' ? 'outlined' : 'filled'} />;
}

function categoryFilterLabel(filter: typeof categoryFilters[number], strategies: StrategyDefinition[]) {
  const count = filter === 'ALL'
    ? strategies.length
    : filter === 'DRAFT'
      ? strategies.filter((strategy) => strategy.status === 'DRAFT').length
      : strategies.filter((strategy) => strategy.category === filter && strategy.status !== 'DRAFT').length;
  const label = filter === 'ALL' ? 'All' : filter === 'ENTRY' ? 'Entry' : filter === 'EXIT' ? 'Exit' : filter === 'GATE' ? 'Gates' : filter === 'FILTER' ? 'Filters' : 'Drafts';
  return `${label} (${count})`;
}

function readinessChip(label?: string | null) {
  const safe = label === 'PAPER_TEST_CANDIDATE' || label === 'WATCHLIST_CANDIDATE' || label === 'NOT_AUTOMATION_READY' ? label : 'RESEARCH_ONLY';
  return <Chip size="small" label={safe} color={safe === 'PAPER_TEST_CANDIDATE' ? 'primary' : safe === 'WATCHLIST_CANDIDATE' ? 'success' : safe === 'NOT_AUTOMATION_READY' ? 'warning' : 'default'} />;
}

function labLink(code: string, timeframe: StrategyTimeframe, region: string, assetType: string) {
  return `/backtests?mode=registered&strategyCode=${encodeURIComponent(code)}&timeframe=${timeframe}&region=${region}&assetType=${assetType}`;
}

function percent(value: number | null | undefined) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

function value(input: number | null | undefined) {
  return typeof input === 'number' ? input.toFixed(2) : 'N/A';
}

function hasWarnings(summary?: StrategyPerformanceSummary | null) {
  return Boolean(summary?.ratingWarnings?.length || summary?.ratingCapsApplied?.length || (summary?.endOfTestExitPercent ?? 0) >= 0.4);
}

export default StrategyFrameworkPage;
