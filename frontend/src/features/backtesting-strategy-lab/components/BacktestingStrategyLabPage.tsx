import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SelectChangeEvent } from '@mui/material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBacktestingStrategyLab } from '../hooks';
import type { BacktestRun, BacktestStrategyConfig, EntryRuleType, ExitRuleType, PositionSizeType, UniverseType } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchStrategies, type StrategyDefinition, type StrategyTimeframe } from '@/features/strategy-framework';

const today = new Date().toISOString().slice(0, 10);
const defaultStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const timeframes: StrategyTimeframe[] = ['1Y', '3Y', '5Y', '10Y', '15Y'];

const defaultConfig: BacktestStrategyConfig = {
  mode: 'CUSTOM_RULES',
  universe: { type: 'ALL', symbols: [] },
  entryRule: { type: 'PRICE_ABOVE_SMA50', threshold: 70 },
  exitRule: { type: 'PRICE_BELOW_SMA50', threshold: 40, holdingDays: 30 },
  startDate: defaultStart,
  endDate: today,
  initialCapital: 100000,
  positionSizeType: 'EQUAL_WEIGHT',
  fixedAmountPerTrade: 10000,
  maxPositions: 10,
  transactionCostPercent: 0.001,
  slippagePercent: 0,
  maxHoldingDays: 180,
  stopLossPercent: 0.08,
  trailingStopPercent: 0.12,
  takeProfitPercent: undefined,
  useDataQualityFilter: false,
  minSignalReadinessScore: 70,
  excludeNotReady: true,
  excludeIlliquid: true,
  excludeMissingQuality: false,
};

const fmtMoney = (value: number | null | undefined, region = 'GLOBAL') => value === null || value === undefined
  ? 'N/A'
  : new Intl.NumberFormat(region === 'IN' ? 'en-IN' : 'en-US', { style: 'currency', currency: region === 'IN' ? 'INR' : 'USD', maximumFractionDigits: 0 }).format(value);
const fmtPercent = (value: number | null | undefined) => value === null || value === undefined
  ? 'N/A'
  : `${(value * 100).toFixed(1)}%`;
const fmtNumber = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : value.toFixed(2);
const compactMoneyTick = (value: number, region = 'GLOBAL') => `${region === 'IN' ? '₹' : '$'}${Math.round(value / 1000)}k`;

export default function BacktestingStrategyLabPage() {
  const { scope } = useMarketScope();
  const [searchParams] = useSearchParams();
  const {
    strategies,
    runs,
    selectedRun,
    loading,
    running,
    error,
    setError,
    setSelectedRun,
    createStrategy,
    runConfig,
    rerunStrategy,
    removeStrategy,
    removeRun,
  } = useBacktestingStrategyLab();
  const [name, setName] = useState('SMA Trend Strategy');
  const [description, setDescription] = useState('Daily close MVP strategy using trend and signal proxy rules.');
  const [symbolsText, setSymbolsText] = useState('RELIANCE,TCS,INFY');
  const [config, setConfig] = useState<BacktestStrategyConfig>(defaultConfig);
  const [mode, setMode] = useState<'registered' | 'custom' | 'runs'>(searchParams.get('mode') === 'custom' ? 'custom' : 'registered');
  const [frameworkStrategies, setFrameworkStrategies] = useState<StrategyDefinition[]>([]);
  const [registeredCode, setRegisteredCode] = useState(searchParams.get('strategyCode') || 'TREND_MOMENTUM');
  const [registeredTimeframe, setRegisteredTimeframe] = useState<StrategyTimeframe>((searchParams.get('timeframe') as StrategyTimeframe) || '3Y');
  const [registeredUniverse, setRegisteredUniverse] = useState<UniverseType>('ALL');
  const [registeredSymbols, setRegisteredSymbols] = useState(searchParams.get('symbols') || '');
  const [registeredCapital, setRegisteredCapital] = useState(100000);
  const [registeredMaxPositions, setRegisteredMaxPositions] = useState(10);
  const [registeredCost, setRegisteredCost] = useState(0.001);
  const [registeredSlippage, setRegisteredSlippage] = useState(0.0005);
  const [registeredMaxHoldingDays, setRegisteredMaxHoldingDays] = useState(180);
  const [registeredStopLoss, setRegisteredStopLoss] = useState(0.08);
  const [registeredTrailingStop, setRegisteredTrailingStop] = useState(0.12);
  const [registeredTakeProfit, setRegisteredTakeProfit] = useState(0);

  const canUseSymbols = config.universe.type === 'SYMBOLS';
  const runMatchesScope = (run: BacktestRun) => run.config.region === scope.region && run.config.assetType === scope.assetType;
  const scopedRuns = useMemo(() => runs.filter(runMatchesScope), [runs, scope.region, scope.assetType]);
  const latestRun = selectedRun && runMatchesScope(selectedRun) ? selectedRun : scopedRuns[0] ?? null;
  const selectedFrameworkStrategy = frameworkStrategies.find((strategy) => strategy.code === registeredCode) ?? frameworkStrategies[0] ?? null;

  useEffect(() => {
    fetchStrategies({ region: searchParams.get('region') || scope.region, assetType: searchParams.get('assetType') || scope.assetType, status: 'ACTIVE', category: 'ENTRY' })
      .then((items) => {
        const entryStrategies = items.filter((item) => item.status === 'ACTIVE' && item.category === 'ENTRY');
        setFrameworkStrategies(entryStrategies);
        if (!entryStrategies.some((item) => item.code === registeredCode)) setRegisteredCode(entryStrategies[0]?.code || '');
      })
      .catch(() => undefined);
  }, [scope.region, scope.assetType, searchParams, registeredCode]);

  const chartData = useMemo(() => (latestRun?.equityCurve || []).map((point) => ({
    ...point,
    equityLabel: Math.round(point.equity),
    drawdownLabel: Math.round(point.drawdownPercent * 1000) / 10,
  })), [latestRun]);

  const updateConfig = (patch: Partial<BacktestStrategyConfig>) => setConfig((current) => ({ ...current, ...patch }));

  const handleUniverseChange = (event: SelectChangeEvent) => {
    const type = event.target.value as UniverseType;
    setConfig((current) => ({
      ...current,
      universe: {
        type,
        symbols: type === 'SYMBOLS' ? symbolsText.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) : [],
      },
    }));
  };

  const normalizedConfig = (): BacktestStrategyConfig => ({
    ...config,
    mode: 'CUSTOM_RULES',
    region: scope.region,
    assetType: scope.assetType,
    universe: {
      ...config.universe,
      symbols: canUseSymbols ? symbolsText.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) : config.universe.symbols,
    },
  });

  const registeredConfig = (): BacktestStrategyConfig => ({
    mode: 'REGISTERED_STRATEGY',
    strategyCode: registeredCode,
    strategyVersion: selectedFrameworkStrategy?.version,
    timeframe: registeredTimeframe,
    region: searchParams.get('region') || scope.region,
    assetType: searchParams.get('assetType') || scope.assetType,
    universe: {
      type: registeredUniverse,
      symbols: registeredUniverse === 'SYMBOLS' ? registeredSymbols.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) : undefined,
    },
    entryRule: { type: 'SIGNAL_DIRECTION_BULLISH', threshold: 70 },
    exitRule: { type: 'PRICE_BELOW_SMA50', threshold: 40, holdingDays: 45 },
    startDate: startForTimeframe(registeredTimeframe),
    endDate: today,
    initialCapital: registeredCapital,
    positionSizeType: 'EQUAL_WEIGHT',
    maxPositions: registeredMaxPositions,
    transactionCostPercent: registeredCost,
    slippagePercent: registeredSlippage,
    maxHoldingDays: registeredMaxHoldingDays || undefined,
    stopLossPercent: registeredStopLoss || undefined,
    trailingStopPercent: registeredTrailingStop || undefined,
    takeProfitPercent: registeredTakeProfit || undefined,
    useDataQualityFilter: true,
    minSignalReadinessScore: 65,
    excludeNotReady: true,
    excludeIlliquid: true,
    excludeMissingQuality: false,
  });

  const handleSave = async () => {
    try {
      await createStrategy(name, description, normalizedConfig());
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save strategy');
    }
  };

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ maxWidth: 1280 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Backtesting & Strategy Lab</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography color="text.secondary">Historical daily-close simulations. Results are not predictions.</Typography>
            <Chip label={`Scope: ${scope.region} / ${scope.assetType}`} size="small" variant="outlined" color="info" />
          </Stack>
        </Box>
        <Button data-testid="run-backtest-primary" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => void runConfig(mode === 'registered' ? registeredConfig() : normalizedConfig())} disabled={running || (mode === 'registered' && !registeredCode)}>
          {running ? 'Running...' : mode === 'registered' ? 'Run Registered Backtest' : 'Run Backtest'}
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={mode} onChange={(_event, value) => setMode(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
              <Tab value="registered" label="Registered Strategy" />
              <Tab value="custom" label="Custom Rules" />
              <Tab value="runs" label="Saved Runs" />
            </Tabs>
            {mode === 'registered' && (
              <Stack spacing={2}>
                <Typography variant="h6">Registered Strategy</Typography>
                <Alert severity="info">
                  Registered backtests currently run active entry strategies. Exit, gate, and filter rules support decisions, but need separate simulation semantics before they are treated as standalone backtests.
                </Alert>
                <FormControl size="small">
                  <InputLabel>Strategy</InputLabel>
                  <Select data-testid="registered-strategy-select" label="Strategy" value={registeredCode} onChange={(event) => setRegisteredCode(event.target.value)}>
                    {frameworkStrategies.map((strategy) => <MenuItem key={strategy.code} value={strategy.code}>{strategy.name}</MenuItem>)}
                  </Select>
                </FormControl>
                {frameworkStrategies.length === 0 && <Alert severity="warning">No active entry strategies are available for {scope.region} / {scope.assetType}.</Alert>}
                {selectedFrameworkStrategy && <Typography variant="body2" color="text.secondary">{selectedFrameworkStrategy.description}</Typography>}
                <FormControl size="small">
                  <InputLabel>Timeframe</InputLabel>
                  <Select label="Timeframe" value={registeredTimeframe} onChange={(event) => setRegisteredTimeframe(event.target.value as StrategyTimeframe)}>
                    {timeframes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Universe</InputLabel>
                  <Select label="Universe" value={registeredUniverse} onChange={(event) => setRegisteredUniverse(event.target.value as UniverseType)}>
                    <MenuItem value="ALL">All eligible instruments (bounded)</MenuItem>
                    <MenuItem value="SYMBOLS">Symbols</MenuItem>
                  </Select>
                </FormControl>
                {registeredUniverse === 'SYMBOLS' && <TextField label="Symbols" value={registeredSymbols} onChange={(event) => setRegisteredSymbols(event.target.value)} size="small" helperText="Comma separated symbols" />}
                <Stack direction="row" spacing={1}>
                  <TextField label="Initial capital" type="number" value={registeredCapital} onChange={(event) => setRegisteredCapital(Number(event.target.value))} size="small" fullWidth />
                  <TextField label="Max positions" type="number" value={registeredMaxPositions} onChange={(event) => setRegisteredMaxPositions(Number(event.target.value))} size="small" fullWidth />
                </Stack>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Realistic Assumptions</Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1}>
                      <TextField label="Cost %" type="number" value={registeredCost * 100} onChange={(event) => setRegisteredCost(Number(event.target.value) / 100)} size="small" fullWidth />
                      <TextField label="Slippage %" type="number" value={registeredSlippage * 100} onChange={(event) => setRegisteredSlippage(Number(event.target.value) / 100)} size="small" fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextField label="Max hold days" type="number" value={registeredMaxHoldingDays} onChange={(event) => setRegisteredMaxHoldingDays(Number(event.target.value))} size="small" fullWidth />
                      <TextField label="Stop loss %" type="number" value={registeredStopLoss * 100} onChange={(event) => setRegisteredStopLoss(Number(event.target.value) / 100)} size="small" fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextField label="Trailing stop %" type="number" value={registeredTrailingStop * 100} onChange={(event) => setRegisteredTrailingStop(Number(event.target.value) / 100)} size="small" fullWidth />
                      <TextField label="Take profit %" type="number" value={registeredTakeProfit ? registeredTakeProfit * 100 : 0} onChange={(event) => setRegisteredTakeProfit(Number(event.target.value) / 100)} size="small" fullWidth />
                    </Stack>
                  </Stack>
                </Paper>
                <Button data-testid="run-registered-backtest-panel" startIcon={<PlayArrowIcon />} variant="contained" onClick={() => void runConfig(registeredConfig())} disabled={running || !registeredCode}>Run Registered Backtest</Button>
              </Stack>
            )}
            {mode === 'custom' && (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6">Custom Rule Backtest</Typography>
                <Typography variant="body2" color="text.secondary">Experimental ad hoc rules. Registered Strategy is the primary strategy source.</Typography>
              </Stack>
              <TextField label="Strategy name" value={name} onChange={(event) => setName(event.target.value)} size="small" />
              <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} size="small" multiline minRows={2} />
              <FormControl size="small">
                <InputLabel>Universe</InputLabel>
                <Select label="Universe" value={config.universe.type} onChange={handleUniverseChange}>
                  <MenuItem value="ALL">All available instruments (bounded)</MenuItem>
                  <MenuItem value="SYMBOLS">Selected symbols</MenuItem>
                </Select>
              </FormControl>
              {canUseSymbols && <TextField label="Symbols" value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} size="small" helperText="Comma separated symbols" />}
              <Stack direction="row" spacing={1}>
                <TextField label="Start" type="date" value={config.startDate} onChange={(event) => updateConfig({ startDate: event.target.value })} size="small" InputLabelProps={{ shrink: true }} fullWidth />
                <TextField label="End" type="date" value={config.endDate} onChange={(event) => updateConfig({ endDate: event.target.value })} size="small" InputLabelProps={{ shrink: true }} fullWidth />
              </Stack>
              <FormControl size="small">
                <InputLabel>Entry rule</InputLabel>
                <Select label="Entry rule" value={config.entryRule.type} onChange={(event) => updateConfig({ entryRule: { ...config.entryRule, type: event.target.value as EntryRuleType } })}>
                  <MenuItem value="SIGNAL_SCORE_ABOVE">Signal score above threshold</MenuItem>
                  <MenuItem value="SIGNAL_DIRECTION_BULLISH">Signal direction bullish</MenuItem>
                  <MenuItem value="PRICE_ABOVE_SMA50">Price above SMA50</MenuItem>
                  <MenuItem value="SMA50_ABOVE_SMA200">SMA50 above SMA200</MenuItem>
                </Select>
              </FormControl>
              {config.entryRule.type === 'SIGNAL_SCORE_ABOVE' && <TextField label="Entry score threshold" type="number" value={config.entryRule.threshold ?? 70} onChange={(event) => updateConfig({ entryRule: { ...config.entryRule, threshold: Number(event.target.value) } })} size="small" />}
              <FormControl size="small">
                <InputLabel>Exit rule</InputLabel>
                <Select label="Exit rule" value={config.exitRule.type} onChange={(event) => updateConfig({ exitRule: { ...config.exitRule, type: event.target.value as ExitRuleType } })}>
                  <MenuItem value="SIGNAL_SCORE_BELOW">Signal score below threshold</MenuItem>
                  <MenuItem value="SIGNAL_DIRECTION_BEARISH">Signal direction bearish</MenuItem>
                  <MenuItem value="PRICE_BELOW_SMA50">Price below SMA50</MenuItem>
                  <MenuItem value="FIXED_HOLDING_PERIOD">Fixed holding period</MenuItem>
                </Select>
              </FormControl>
              {config.exitRule.type === 'SIGNAL_SCORE_BELOW' && <TextField label="Exit score threshold" type="number" value={config.exitRule.threshold ?? 40} onChange={(event) => updateConfig({ exitRule: { ...config.exitRule, threshold: Number(event.target.value) } })} size="small" />}
              {config.exitRule.type === 'FIXED_HOLDING_PERIOD' && <TextField label="Holding days" type="number" value={config.exitRule.holdingDays ?? 30} onChange={(event) => updateConfig({ exitRule: { ...config.exitRule, holdingDays: Number(event.target.value) } })} size="small" />}
              <TextField label="Initial capital" type="number" value={config.initialCapital} onChange={(event) => updateConfig({ initialCapital: Number(event.target.value) })} size="small" />
              <Stack direction="row" spacing={1}>
                <TextField label="Max positions" type="number" value={config.maxPositions} onChange={(event) => updateConfig({ maxPositions: Number(event.target.value) })} size="small" fullWidth />
                <TextField label="Cost %" type="number" value={config.transactionCostPercent * 100} onChange={(event) => updateConfig({ transactionCostPercent: Number(event.target.value) / 100 })} size="small" fullWidth />
              </Stack>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Realistic Assumptions</Typography>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1}>
                    <TextField label="Slippage %" type="number" value={(config.slippagePercent ?? 0) * 100} onChange={(event) => updateConfig({ slippagePercent: Number(event.target.value) / 100 })} size="small" fullWidth />
                    <TextField label="Max hold days" type="number" value={config.maxHoldingDays ?? ''} onChange={(event) => updateConfig({ maxHoldingDays: Number(event.target.value) || undefined })} size="small" fullWidth />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField label="Stop loss %" type="number" value={(config.stopLossPercent ?? 0) * 100} onChange={(event) => updateConfig({ stopLossPercent: Number(event.target.value) / 100 || undefined })} size="small" fullWidth />
                    <TextField label="Trailing stop %" type="number" value={(config.trailingStopPercent ?? 0) * 100} onChange={(event) => updateConfig({ trailingStopPercent: Number(event.target.value) / 100 || undefined })} size="small" fullWidth />
                  </Stack>
                  <TextField label="Take profit %" type="number" value={(config.takeProfitPercent ?? 0) * 100} onChange={(event) => updateConfig({ takeProfitPercent: Number(event.target.value) / 100 || undefined })} size="small" />
                </Stack>
              </Paper>
              <FormControlLabel
                control={<Checkbox checked={Boolean(config.useDataQualityFilter)} onChange={(event) => updateConfig({ useDataQualityFilter: event.target.checked })} />}
                label="Use data quality filter"
              />
              {config.useDataQualityFilter && (
                <TextField label="Minimum readiness score" type="number" value={config.minSignalReadinessScore ?? 70} onChange={(event) => updateConfig({ minSignalReadinessScore: Number(event.target.value) })} size="small" helperText="Filters instruments with insufficient, stale, or illiquid data." />
              )}
              <FormControl size="small">
                <InputLabel>Position size</InputLabel>
                <Select label="Position size" value={config.positionSizeType} onChange={(event) => updateConfig({ positionSizeType: event.target.value as PositionSizeType })}>
                  <MenuItem value="EQUAL_WEIGHT">Equal weight</MenuItem>
                  <MenuItem value="FIXED_AMOUNT">Fixed amount</MenuItem>
                </Select>
              </FormControl>
              {config.positionSizeType === 'FIXED_AMOUNT' && <TextField label="Fixed amount per trade" type="number" value={config.fixedAmountPerTrade ?? 10000} onChange={(event) => updateConfig({ fixedAmountPerTrade: Number(event.target.value) })} size="small" />}
              <Stack direction="row" spacing={1}>
                <Button startIcon={<SaveIcon />} variant="outlined" onClick={() => void handleSave()}>Save</Button>
                <Button startIcon={<PlayArrowIcon />} variant="contained" onClick={() => void runConfig(normalizedConfig())} disabled={running}>Run</Button>
              </Stack>
            </Stack>
            )}
          </Paper>

          {mode !== 'registered' && <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Saved Strategies</Typography>
            {strategies.length === 0 ? <Typography color="text.secondary">No saved strategies yet.</Typography> : (
              <Stack spacing={1}>
                {strategies.map((strategy) => (
                  <Paper key={strategy.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Box>
                        <Typography fontWeight={700}>{strategy.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{strategy.config.entryRule.type}{' -> '}{strategy.config.exitRule.type}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Rerun Strategy" arrow>
                          <IconButton size="small" onClick={() => void rerunStrategy(strategy.id)}>
                            <PlayArrowOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Strategy" arrow>
                          <IconButton size="small" color="error" onClick={() => void removeStrategy(strategy.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>}
        </Stack>

        <Stack spacing={2}>
          <ResultsPanel run={latestRun} chartData={chartData} />
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Saved Runs</Typography>
            {scopedRuns.length === 0 ? <Typography color="text.secondary">No runs yet for {scope.region} / {scope.assetType}. Configure a strategy and run the first simulation.</Typography> : (
              <Stack spacing={1}>
                {scopedRuns.slice(0, 8).map((run) => (
                  <Paper key={run.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={run.status} color={run.status === 'COMPLETED' ? 'success' : 'error'} />
                        <Chip size="small" label={run.config.mode === 'REGISTERED_STRATEGY' || run.config.strategyCode ? 'Saved Registered Strategy Run' : 'Custom Rule Backtest'} />
                        <Typography variant="body2">{new Date(run.startedAt).toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary">{fmtPercent(run.metrics?.totalReturn)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Results" arrow>
                          <IconButton size="small" onClick={() => setSelectedRun(run)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Run" arrow>
                          <IconButton size="small" color="error" onClick={() => void removeRun(run.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

function ResultsPanel({ run, chartData }: { run: BacktestRun | null; chartData: Array<{ equityLabel: number; drawdownLabel: number; date: string; equity: number; cash: number; investedValue: number; drawdownPercent: number }> }) {
  if (!run) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Results</Typography>
        <Typography color="text.secondary">Run a strategy to see metrics, equity curve, drawdown, and trades.</Typography>
      </Paper>
    );
  }

  if (run.status === 'FAILED') {
    return <Alert severity="warning">Backtest failed: {run.error || 'Unknown error'}</Alert>;
  }

  const metrics = run.metrics;
  const isRegistered = run.config.mode === 'REGISTERED_STRATEGY' || Boolean(run.config.strategyCode);
  return (
    <Stack spacing={2}>
      {isRegistered && (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="h6">{metrics?.frameworkStrategyName || run.config.strategyCode}</Typography>
              <Typography variant="body2" color="text.secondary">{run.config.strategyCode} {run.config.strategyVersion ? `v${run.config.strategyVersion}` : ''} · {run.config.timeframe} · {run.config.region || 'IN'} · {run.config.assetType || 'STOCK'}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={metrics?.frameworkRating?.ratingGrade || 'UNPROVEN'} color={metrics?.frameworkRating?.ratingGrade === 'EXCELLENT' ? 'success' : metrics?.frameworkRating?.ratingGrade === 'GOOD' ? 'primary' : 'default'} />
              <Chip size="small" label={safeReadiness(metrics?.frameworkRating?.readinessLabel)} />
              <Chip size="small" label={metrics?.availabilityStatus || 'NOT_RUN'} />
              {run.config.strategyCode && <Button size="small" href={`/strategies?strategyCode=${encodeURIComponent(run.config.strategyCode)}`}>Strategy Framework</Button>}
            </Stack>
          </Stack>
          {metrics?.frameworkRating?.ratingReasons?.length ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{metrics.frameworkRating.ratingReasons.join(' ')}</Typography> : null}
          {metrics?.frameworkRating?.ratingWarnings?.length ? <Alert severity="warning" sx={{ mt: 1 }}>{metrics.frameworkRating.ratingWarnings.join(' ')}</Alert> : null}
          {metrics?.frameworkRating?.ratingCapsApplied?.length ? <Typography variant="caption" color="text.secondary">Caps applied: {metrics.frameworkRating.ratingCapsApplied.join(', ')}</Typography> : null}
        </Paper>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <MetricCard label="Ending Capital" value={fmtMoney((run.config.initialCapital || 0) * (1 + (metrics?.totalReturn || 0)), run.config.region)} />
        <MetricCard label="Total Return" value={fmtPercent(metrics?.totalReturn)} />
        <MetricCard label="CAGR" value={fmtPercent(metrics?.cagr)} />
        <MetricCard label="Max Drawdown" value={fmtPercent(metrics?.maxDrawdown)} />
        <MetricCard label="Sharpe" value={fmtNumber(metrics?.sharpeRatio)} />
        <MetricCard label="Win Rate" value={fmtPercent(metrics?.winRate)} />
        <MetricCard label="Trades" value={String(metrics?.numberOfTrades ?? 0)} />
        <MetricCard label="Profit Factor" value={fmtNumber(metrics?.profitFactor)} />
        <MetricCard label="Avg Hold" value={metrics?.averageHoldingDays ? `${metrics.averageHoldingDays.toFixed(0)} days` : 'N/A'} />
        <MetricCard label="Longest Hold" value={metrics?.longestHoldingDays ? `${metrics.longestHoldingDays.toFixed(0)} days` : 'N/A'} />
      </Box>
      {metrics?.benchmarkComparison && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Benchmark Comparison</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
            <Chip size="small" label={metrics.benchmarkComparison.benchmarkDataStatus} />
            <Chip size="small" label={metrics.benchmarkComparison.benchmarkName || 'Benchmark unavailable'} />
            <Chip size="small" label={`Strategy CAGR ${fmtPercent(metrics.cagr)}`} />
            <Chip size="small" label={`Benchmark CAGR ${fmtPercent(metrics.benchmarkComparison.benchmarkCagr)}`} />
            <Chip size="small" label={`Excess CAGR ${fmtPercent(metrics.benchmarkComparison.excessCagr)}`} color={(metrics.benchmarkComparison.excessCagr ?? 0) < 0 ? 'warning' : 'success'} />
          </Stack>
          {metrics.benchmarkComparison.dataGap && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{metrics.benchmarkComparison.dataGap}</Typography>}
        </Paper>
      )}
      {metrics?.realismWarnings?.length ? <Alert severity="warning">{metrics.realismWarnings.join(' ')}</Alert> : null}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Equity Curve</Typography>
          <Typography variant="body2" color="text.secondary">Daily close simulation</Typography>
        </Stack>
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={32} />
              <YAxis yAxisId="left" tickFormatter={(value) => compactMoneyTick(Number(value), run.config.region)} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <ChartTooltip formatter={(value, name) => name === 'drawdownLabel' ? [`${value}%`, 'Drawdown'] : [fmtMoney(Number(value), run.config.region), 'Equity']} />
              <Line yAxisId="left" type="monotone" dataKey="equityLabel" stroke="#1976d2" dot={false} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="drawdownLabel" stroke="#d32f2f" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      {metrics?.dataQualityMetadata && (
        <Alert severity="info">
          Data quality filter universe: {metrics.dataQualityMetadata.universeAfterDataQualityFilter} / {metrics.dataQualityMetadata.universeBeforeDataQualityFilter} included;
          excluded {metrics.dataQualityMetadata.excludedForDataQuality}, missing evaluations {metrics.dataQualityMetadata.missingQualityEvaluationCount}.
        </Alert>
      )}
      {metrics?.dataCoverage && (
        <Alert severity={metrics.dataCoverage.warnings.length ? 'warning' : 'info'}>
          Data coverage: {metrics.dataCoverage.instrumentsWithEnoughHistory} / {metrics.dataCoverage.instrumentsConsidered} instruments had enough history;
          excluded for history {metrics.dataCoverage.instrumentsExcludedForHistory}, data quality {metrics.dataCoverage.instrumentsExcludedForDataQuality}.
          {metrics.dataCoverage.universeCapped && metrics.dataCoverage.universeTotalAvailable ? ` Bounded universe: ${metrics.dataCoverage.universeCap} of ${metrics.dataCoverage.universeTotalAvailable} instruments considered.` : ''}
          {metrics.dataCoverage.warnings.length ? ` ${metrics.dataCoverage.warnings.join(' ')}` : ''}
        </Alert>
      )}
      {metrics?.exitDiagnostics && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Exit Diagnostics</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`Strategy exits ${metrics.exitDiagnostics.strategyExitCount}`} />
            <Chip size="small" label={`Stop loss ${metrics.exitDiagnostics.stopLossExitCount}`} />
            <Chip size="small" label={`Trailing stop ${metrics.exitDiagnostics.trailingStopExitCount}`} />
            <Chip size="small" label={`Take profit ${metrics.exitDiagnostics.takeProfitExitCount}`} />
            <Chip size="small" label={`Max hold ${metrics.exitDiagnostics.maxHoldExitCount}`} />
            <Chip size="small" label={`End of test ${fmtPercent(metrics.exitDiagnostics.endOfTestExitPercent)}`} color={metrics.exitDiagnostics.endOfTestExitPercent >= 0.4 ? 'warning' : 'default'} />
            <Chip size="small" label={`Median hold ${metrics.exitDiagnostics.medianHoldingDays?.toFixed(0) ?? 'N/A'}d`} />
            <Chip size="small" label={`Longest hold ${metrics.exitDiagnostics.longestHoldingDays?.toFixed(0) ?? 'N/A'}d`} />
          </Stack>
        </Paper>
      )}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Trade Log</Typography>
        {run.trades.length === 0 ? <Typography color="text.secondary">No trades were generated for this configuration.</Typography> : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Entry</TableCell>
                  <TableCell>Exit</TableCell>
                  <TableCell align="right">Return</TableCell>
                  <TableCell align="right">Net P&L</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {run.trades.slice(0, 25).map((trade, index) => (
                  <TableRow key={`${trade.symbol}-${trade.entryDate}-${index}`}>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{trade.entryDate} @ {trade.entryPrice.toFixed(2)}</TableCell>
                    <TableCell>{trade.exitDate} @ {trade.exitPrice.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: trade.returnPercent >= 0 ? 'success.main' : 'error.main' }}>{fmtPercent(trade.returnPercent)}</TableCell>
                    <TableCell align="right">{fmtMoney(trade.netPnL, run.config.region)}</TableCell>
                    <TableCell>{[trade.entryReason, trade.exitReason].filter(Boolean).join(' / ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        {run.trades.length > 25 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">Showing first 25 trades of {run.trades.length}.</Typography>
          </>
        )}
      </Paper>
    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </Paper>
  );
}

function startForTimeframe(timeframe: StrategyTimeframe) {
  const years = Number(timeframe.replace('Y', '')) || 1;
  const start = new Date();
  start.setFullYear(start.getFullYear() - years);
  return start.toISOString().slice(0, 10);
}

function safeReadiness(label?: string | null) {
  if (label === 'PAPER_TEST_CANDIDATE' || label === 'WATCHLIST_CANDIDATE' || label === 'NOT_AUTOMATION_READY') return label;
  return 'RESEARCH_ONLY';
}
