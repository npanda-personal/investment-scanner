import React from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataTable, PageHeader } from '@/shared/components';
import { InstrumentSearchSelect } from '@/shared/components/EntitySearchSelect';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { V1Instrument } from '@/features/market-data-foundation';
import { evaluateStrategy, fetchStrategies, fetchStrategy, fetchStrategyPerformance, fetchStrategyRankings, runRegisteredStrategyBacktest } from '../api/strategyFrameworkApi';
import type { StrategyDefinition, StrategyEvaluationResult, StrategyPerformanceSummary, StrategyTimeframe } from '../types';

const timeframes: StrategyTimeframe[] = ['1Y', '3Y', '5Y', '10Y', '15Y'];

const StrategyFrameworkPage: React.FC = () => {
  const { scope } = useMarketScope();
  const [tab, setTab] = React.useState(0);
  const [strategies, setStrategies] = React.useState<StrategyDefinition[]>([]);
  const [selectedCode, setSelectedCode] = React.useState('TREND_MOMENTUM');
  const [selected, setSelected] = React.useState<StrategyDefinition | null>(null);
  const [timeframe, setTimeframe] = React.useState<StrategyTimeframe>('1Y');
  const [performance, setPerformance] = React.useState<StrategyPerformanceSummary[]>([]);
  const [rankings, setRankings] = React.useState<StrategyPerformanceSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [capital, setCapital] = React.useState(100000);
  const [maxPositions, setMaxPositions] = React.useState(10);
  const [cost, setCost] = React.useState(0.001);
  const [backtestResult, setBacktestResult] = React.useState<StrategyPerformanceSummary | null>(null);
  const [running, setRunning] = React.useState(false);
  const [instrument, setInstrument] = React.useState<V1Instrument | null>(null);
  const [evaluation, setEvaluation] = React.useState<StrategyEvaluationResult[]>([]);
  const [sortBy, setSortBy] = React.useState('ratingScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

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
      fetchStrategyPerformance(selectedCode, { timeframe, region: scope.region, assetType: scope.assetType }),
      fetchStrategyRankings({ timeframe, region: scope.region, assetType: scope.assetType }),
    ])
      .then(([detail, perf, ranks]) => {
        setSelected(detail);
        setPerformance(perf);
        setRankings(ranks);
      })
      .catch(() => {
        setSelected(null);
        setPerformance([]);
        setRankings([]);
      });
  }, [selectedCode, timeframe, scope.region, scope.assetType]);

  const sortedRankings = React.useMemo(() => {
    return [...rankings].sort((a, b) => {
      const left = Number((a as any)[sortBy] ?? 0);
      const right = Number((b as any)[sortBy] ?? 0);
      return sortDirection === 'asc' ? left - right : right - left;
    });
  }, [rankings, sortBy, sortDirection]);

  const runBacktest = async () => {
    if (!selectedCode) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runRegisteredStrategyBacktest(selectedCode, {
        timeframe,
        region: scope.region,
        assetType: scope.assetType,
        initialCapital: capital,
        maxPositions,
        transactionCostPercent: cost,
      });
      setBacktestResult(result.performanceSummary);
      setPerformance([result.performanceSummary]);
      setTab(2);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Backtest failed.');
    } finally {
      setRunning(false);
    }
  };

  const runEvaluation = async () => {
    if (!instrument) return;
    setRunning(true);
    try {
      const result = await evaluateStrategy({
        strategyCode: selectedCode || 'ALL',
        instrumentId: instrument.id,
        region: scope.region,
        assetType: scope.assetType,
      });
      setEvaluation(result.results);
      setTab(5);
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
      <Alert severity="info" sx={{ mb: 2 }}>Research support only, not financial advice. No live trading or broker execution is enabled.</Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Catalog" />
          <Tab label="Detail" />
          <Tab label="Performance" />
          <Tab label="Rankings" />
          <Tab label="Run Backtest" />
          <Tab label="Evaluate Stock" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <DataTable
          columns={[
            { id: 'code', label: 'Strategy', sortable: true, render: (row) => <Stack spacing={0.5}><Typography fontWeight={700}>{row.name}</Typography><Typography variant="caption">{row.code}</Typography></Stack> },
            { id: 'status', label: 'Status', render: (row) => <Chip size="small" label={row.status} color={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' ? 'warning' : 'default'} /> },
            { id: 'style', label: 'Style', render: (row) => row.style },
            { id: 'rating', label: 'Latest rating', render: (row) => ratingChip(row.latestPerformance?.ratingGrade) },
            { id: 'automation', label: 'Automation', render: (row) => <Chip size="small" label={row.latestPerformance?.automationEligibility || 'NOT_ELIGIBLE'} /> },
            { id: 'action', label: 'Actions', render: (row) => <Button startIcon={<VisibilityIcon />} size="small" onClick={() => { setSelectedCode(row.code); setTab(1); }}>View</Button> },
          ]}
          rows={strategies}
          getRowId={(row) => row.code}
          loading={loading}
          error={error}
          emptyMessage="No configured strategies found."
          page={0}
          pageSize={10}
          totalCount={strategies.length}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      )}

      {tab === 1 && selected && <StrategyDetail strategy={selected} selectedCode={selectedCode} onStrategyChange={setSelectedCode} strategies={strategies} />}

      {tab === 2 && (
        <Stack spacing={2}>
          <ToolbarSelector strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          <PerformanceCards summary={performance[0] || backtestResult} />
        </Stack>
      )}

      {tab === 3 && (
        <Stack spacing={2}>
          <ToolbarSelector strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          <DataTable
            columns={[
              { id: 'strategyCode', label: 'Strategy', sortable: true, render: (row) => row.strategyCode },
              { id: 'ratingScore', label: 'Rating', sortable: true, render: (row) => <Stack direction="row" spacing={1}>{ratingChip(row.ratingGrade)}<Typography>{row.ratingScore}</Typography></Stack> },
              { id: 'cagr', label: 'CAGR', sortable: true, render: (row) => percent(row.cagr) },
              { id: 'maxDrawdown', label: 'Worst drawdown', sortable: true, render: (row) => percent(row.maxDrawdown) },
              { id: 'tradeCount', label: 'Trades', sortable: true, render: (row) => row.tradeCount },
              { id: 'automationEligibility', label: 'Automation', render: (row) => <Chip size="small" label={row.automationEligibility} /> },
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

      {tab === 4 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <ToolbarSelector strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} timeframe={timeframe} onTimeframeChange={setTimeframe} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Initial capital" value={capital} onChange={(event) => setCapital(Number(event.target.value))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Max positions" value={maxPositions} onChange={(event) => setMaxPositions(Number(event.target.value))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Transaction cost" value={cost} onChange={(event) => setCost(Number(event.target.value))} /></Grid>
            </Grid>
            <Box><Button variant="contained" startIcon={running ? <CircularProgress size={18} /> : <PlayArrowIcon />} disabled={running} onClick={runBacktest}>Run Backtest</Button></Box>
          </Stack>
        </Paper>
      )}

      {tab === 5 && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}><InstrumentSearchSelect value={instrument} onChange={setInstrument} /></Grid>
              <Grid item xs={12} md={4}><ToolbarStrategySelect strategies={strategies} selectedCode={selectedCode} onStrategyChange={setSelectedCode} /></Grid>
              <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<FactCheckIcon />} disabled={!instrument || running} onClick={runEvaluation}>Evaluate</Button></Grid>
            </Grid>
          </Paper>
          <EvaluationList results={evaluation} />
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
        {strategies.map((strategy) => <MenuItem key={strategy.code} value={strategy.code}>{strategy.name}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function StrategyDetail({ strategy, selectedCode, onStrategyChange, strategies }: { strategy: StrategyDefinition; selectedCode: string; onStrategyChange: (value: string) => void; strategies: StrategyDefinition[] }) {
  return (
    <Stack spacing={2}>
      <ToolbarStrategySelect strategies={strategies} selectedCode={selectedCode} onStrategyChange={onStrategyChange} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center"><Typography variant="h6">{strategy.name}</Typography><Chip size="small" label={strategy.status} /></Stack>
          <Typography color="text.secondary">{strategy.description}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">{[strategy.category, strategy.style, strategy.timeframe, ...strategy.supportedRegions, ...strategy.assetTypes].map((item) => <Chip key={item} size="small" label={item} />)}</Stack>
          <Divider />
          <RuleSection title="Entry Rules" rules={strategy.entryRules} />
          <RuleSection title="Exit Rules" rules={strategy.exitRules} />
          <RuleSection title="Noise Filters" rules={strategy.noiseFilters} />
          <RuleSection title="Required Data" rules={strategy.requiredInputs.map((input) => ({ code: input, label: input, kind: 'REQUIRES', input }))} />
        </Stack>
      </Paper>
    </Stack>
  );
}

function RuleSection({ title, rules }: { title: string; rules: Array<{ code: string; label: string }> }) {
  return <Box><Typography variant="subtitle2" gutterBottom>{title}</Typography><Stack spacing={0.5}>{rules.length ? rules.map((rule) => <Typography key={rule.code} variant="body2">- {rule.label}</Typography>) : <Typography variant="body2" color="text.secondary">None configured.</Typography>}</Stack></Box>;
}

function PerformanceCards({ summary }: { summary?: StrategyPerformanceSummary | null }) {
  if (!summary) return <Alert severity="warning">No performance summary exists for this strategy/timeframe yet. Run a manual backtest to create one.</Alert>;
  const items = [
    ['Starting capital', money(summary.startingCapital)],
    ['Ending capital', money(summary.endingCapital)],
    ['Total return', percent(summary.totalReturn)],
    ['CAGR', percent(summary.cagr)],
    ['Max drawdown', percent(summary.maxDrawdown)],
    ['Sharpe', value(summary.sharpe)],
    ['Win rate', percent(summary.winRate)],
    ['Profit factor', value(summary.profitFactor)],
  ];
  return <Grid container spacing={2}>{items.map(([label, content]) => <Grid item xs={12} sm={6} md={3} key={label}><Paper variant="outlined" sx={{ p: 2 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6">{content}</Typography></Paper></Grid>)}<Grid item xs={12}><Stack direction="row" spacing={1}>{ratingChip(summary.ratingGrade)}<Chip label={summary.automationEligibility} /></Stack></Grid></Grid>;
}

function EvaluationList({ results }: { results: StrategyEvaluationResult[] }) {
  if (results.length === 0) return <Alert severity="info">Select a stock and run evaluation to see matches, blockers, and data gaps.</Alert>;
  return <Stack spacing={2}>{results.map((result) => <Paper key={result.strategyCode} variant="outlined" sx={{ p: 2 }}><Stack spacing={1}><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={700}>{result.strategyCode}</Typography><Chip size="small" label={result.decision} color={result.blockers.length ? 'warning' : 'success'} /><Chip size="small" label={`${result.score}/100`} /></Stack><Typography variant="body2">{result.reasons.slice(0, 3).join(' ') || 'No positive rules passed.'}</Typography>{result.blockers.length > 0 && <Alert severity="warning">{result.blockers.join(' ')}</Alert>}{result.dataGaps.length > 0 && <Typography variant="caption" color="text.secondary">Data gaps: {result.dataGaps.join('; ')}</Typography>}</Stack></Paper>)}</Stack>;
}

function ratingChip(grade?: string | null) {
  return <Chip size="small" label={grade || 'UNPROVEN'} color={grade === 'EXCELLENT' ? 'success' : grade === 'GOOD' ? 'primary' : grade === 'WEAK' ? 'warning' : 'default'} />;
}

function percent(value: number | null | undefined) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function value(input: number | null | undefined) {
  return typeof input === 'number' ? input.toFixed(2) : 'N/A';
}

export default StrategyFrameworkPage;
