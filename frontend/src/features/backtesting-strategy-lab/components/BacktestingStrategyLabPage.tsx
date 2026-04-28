import { useMemo, useState } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
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
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBacktestingStrategyLab } from '../hooks';
import type { BacktestRun, BacktestStrategyConfig, EntryRuleType, ExitRuleType, PositionSizeType, UniverseType } from '../types';

const today = new Date().toISOString().slice(0, 10);
const defaultStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const defaultConfig: BacktestStrategyConfig = {
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
};

const fmtMoney = (value: number | null | undefined) => value === null || value === undefined
  ? 'N/A'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const fmtPercent = (value: number | null | undefined) => value === null || value === undefined
  ? 'N/A'
  : `${(value * 100).toFixed(1)}%`;
const fmtNumber = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : value.toFixed(2);

export default function BacktestingStrategyLabPage() {
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
  const [symbolsText, setSymbolsText] = useState('AAPL,MSFT,SPY');
  const [config, setConfig] = useState<BacktestStrategyConfig>(defaultConfig);

  const canUseSymbols = config.universe.type === 'SYMBOLS';
  const latestRun = selectedRun ?? runs[0] ?? null;

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
    universe: {
      ...config.universe,
      symbols: canUseSymbols ? symbolsText.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) : config.universe.symbols,
    },
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
          <Typography color="text.secondary">Historical daily-close simulations for simple signal and trend strategies. Results are not predictions.</Typography>
        </Box>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => void runConfig(normalizedConfig())} disabled={running}>
          {running ? 'Running...' : 'Run Backtest'}
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Strategy Setup</Typography>
            <Stack spacing={2}>
              <TextField label="Strategy name" value={name} onChange={(event) => setName(event.target.value)} size="small" />
              <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} size="small" multiline minRows={2} />
              <FormControl size="small">
                <InputLabel>Universe</InputLabel>
                <Select label="Universe" value={config.universe.type} onChange={handleUniverseChange}>
                  <MenuItem value="ALL">All available instruments</MenuItem>
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
          </Paper>

          <Paper sx={{ p: 2 }}>
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
                        <Button size="small" onClick={() => void rerunStrategy(strategy.id)}>Run</Button>
                        <Button size="small" color="error" onClick={() => void removeStrategy(strategy.id)}><DeleteOutlineIcon fontSize="small" /></Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <ResultsPanel run={latestRun} chartData={chartData} />
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Saved Runs</Typography>
            {runs.length === 0 ? <Typography color="text.secondary">No runs yet. Configure a strategy and run the first simulation.</Typography> : (
              <Stack spacing={1}>
                {runs.slice(0, 8).map((run) => (
                  <Paper key={run.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={run.status} color={run.status === 'COMPLETED' ? 'success' : 'error'} />
                        <Typography variant="body2">{new Date(run.startedAt).toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary">{fmtPercent(run.metrics?.totalReturn)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setSelectedRun(run)}>View</Button>
                        <Button size="small" color="error" onClick={() => void removeRun(run.id)}>Delete</Button>
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
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <MetricCard label="Total Return" value={fmtPercent(metrics?.totalReturn)} />
        <MetricCard label="CAGR" value={fmtPercent(metrics?.cagr)} />
        <MetricCard label="Max Drawdown" value={fmtPercent(metrics?.maxDrawdown)} />
        <MetricCard label="Sharpe" value={fmtNumber(metrics?.sharpeRatio)} />
        <MetricCard label="Win Rate" value={fmtPercent(metrics?.winRate)} />
        <MetricCard label="Trades" value={String(metrics?.numberOfTrades ?? 0)} />
        <MetricCard label="Profit Factor" value={fmtNumber(metrics?.profitFactor)} />
        <MetricCard label="Avg Hold" value={metrics?.averageHoldingDays ? `${metrics.averageHoldingDays.toFixed(0)} days` : 'N/A'} />
      </Box>
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
              <YAxis yAxisId="left" tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value, name) => name === 'drawdownLabel' ? [`${value}%`, 'Drawdown'] : [fmtMoney(Number(value)), 'Equity']} />
              <Line yAxisId="left" type="monotone" dataKey="equityLabel" stroke="#1976d2" dot={false} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="drawdownLabel" stroke="#d32f2f" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
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
                    <TableCell align="right">{fmtMoney(trade.netPnL)}</TableCell>
                    <TableCell>{trade.exitReason}</TableCell>
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
