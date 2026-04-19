import React from 'react';
import { BacktestResult } from '../../services/backtestService';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import EquityCurveChart, { EquityCurvePoint } from './charts/EquityCurveChart';
import DrawdownChart, { DrawdownPoint } from './charts/DrawdownChart';
import MetricsDashboard, { BacktestMetrics } from './charts/MetricsDashboard';
import TradeLogTable, { Trade } from './charts/TradeLogTable';

interface BacktestResultsViewProps {
  result: BacktestResult;
}

/**
 * Transform raw equityCurve data (assumed array of { date: string, equity: number }) to EquityCurvePoint[].
 * If equityCurve is null or empty, returns empty array.
 */
function transformEquityCurve(equityCurve: any): EquityCurvePoint[] {
  if (!equityCurve || !Array.isArray(equityCurve)) return [];
  return equityCurve.map((point: any) => ({
    date: point.date || point.timestamp || '',
    equity: typeof point.equity === 'number' ? point.equity : 0,
  })).filter((p: EquityCurvePoint) => p.date);
}

/**
 * Transform raw drawdown data (could be derived from equityCurve or separate).
 * For simplicity, we compute drawdown from equityCurve if not provided.
 */
function transformDrawdown(equityCurve: any): DrawdownPoint[] {
  if (!equityCurve || !Array.isArray(equityCurve)) return [];
  let peak = -Infinity;
  return equityCurve.map((point: any) => {
    const equity = typeof point.equity === 'number' ? point.equity : 0;
    if (equity > peak) peak = equity;
    const drawdown = peak === 0 ? 0 : (equity - peak) / peak;
    return {
      date: point.date || point.timestamp || '',
      drawdown,
    };
  }).filter((p: DrawdownPoint) => p.date);
}

/**
 * Transform raw tradeLedger to Trade[].
 */
function transformTradeLedger(tradeLedger: any): Trade[] {
  if (!tradeLedger || !Array.isArray(tradeLedger)) return [];
  return tradeLedger.map((trade: any, idx: number) => ({
    id: trade.id || `trade-${idx}`,
    entryDate: trade.entryDate || trade.entryTime || '',
    exitDate: trade.exitDate || trade.exitTime || '',
    symbol: trade.symbol || 'N/A',
    side: trade.side === 'short' ? 'short' : 'long',
    entryPrice: typeof trade.entryPrice === 'number' ? trade.entryPrice : 0,
    exitPrice: typeof trade.exitPrice === 'number' ? trade.exitPrice : 0,
    quantity: typeof trade.quantity === 'number' ? trade.quantity : 0,
    pnl: typeof trade.pnl === 'number' ? trade.pnl : 0,
    pnlPercent: typeof trade.pnlPercent === 'number' ? trade.pnlPercent : 0,
    commission: typeof trade.commission === 'number' ? trade.commission : undefined,
  }));
}

/**
 * Build metrics object from BacktestResult.
 */
function buildMetrics(result: BacktestResult): BacktestMetrics {
  return {
    sharpeRatio: result.sharpeRatio,
    maxDrawdown: result.maxDrawdown,
    winRate: result.winRate,
    profitFactor: result.profitFactor,
    totalReturn: result.totalReturn,
    totalTrades: result.totalTrades,
    avgTradeReturn: null, // not in result; could compute
    expectancy: null,
  };
}

const BacktestResultsView: React.FC<BacktestResultsViewProps> = ({ result }) => {
  const equityData = transformEquityCurve(result.equityCurve);
  const drawdownData = transformDrawdown(result.equityCurve);
  const trades = transformTradeLedger(result.tradeLedger);
  const metrics = buildMetrics(result);

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" gutterBottom>
              Backtest Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Config: {result.config?.name || 'Unknown'} • Run completed {new Date(result.completedAt).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={result.status}
            color={result.status === 'completed' ? 'success' : result.status === 'failed' ? 'error' : 'warning'}
            variant="outlined"
          />
        </Box>
        {result.error && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography variant="body2">Error: {result.error}</Typography>
          </Paper>
        )}
        <Divider sx={{ my: 3 }} />

        {/* Metrics Dashboard */}
        <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
        <MetricsDashboard metrics={metrics} />

        <Divider sx={{ my: 4 }} />

        {/* Charts */}
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Typography variant="h6" gutterBottom>Equity Curve</Typography>
            <EquityCurveChart data={equityData} height={350} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Typography variant="h6" gutterBottom>Drawdown</Typography>
            <DrawdownChart data={drawdownData} height={350} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Trade Log */}
        <Typography variant="h6" gutterBottom>Trade Log</Typography>
        {trades.length > 0 ? (
          <TradeLogTable trades={trades} />
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No trade data available</Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default BacktestResultsView;