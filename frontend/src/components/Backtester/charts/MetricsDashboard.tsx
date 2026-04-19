import React from 'react';
import { Grid, Paper, Typography, Box, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface BacktestMetrics {
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  winRate: number | null;
  profitFactor: number | null;
  totalReturn: number | null;
  totalTrades: number | null;
  avgTradeReturn: number | null;
  expectancy: number | null;
}

interface MetricsDashboardProps {
  metrics: BacktestMetrics;
}

const metricConfigs: {
  key: keyof BacktestMetrics;
  label: string;
  formatter: (value: number | null) => string;
  tooltip: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}[] = [
  {
    key: 'sharpeRatio',
    label: 'Sharpe Ratio',
    formatter: (v) => (v !== null ? v.toFixed(3) : '-'),
    tooltip: 'Risk-adjusted return (higher is better)',
    color: 'primary',
  },
  {
    key: 'maxDrawdown',
    label: 'Max Drawdown',
    formatter: (v) => (v !== null ? `${(v * 100).toFixed(2)}%` : '-'),
    tooltip: 'Maximum peak-to-trough decline',
    color: 'error',
  },
  {
    key: 'winRate',
    label: 'Win Rate',
    formatter: (v) => (v !== null ? `${(v * 100).toFixed(1)}%` : '-'),
    tooltip: 'Percentage of profitable trades',
    color: 'success',
  },
  {
    key: 'profitFactor',
    label: 'Profit Factor',
    formatter: (v) => (v !== null ? v.toFixed(2) : '-'),
    tooltip: 'Gross profit / gross loss',
    color: 'primary',
  },
  {
    key: 'totalReturn',
    label: 'Total Return',
    formatter: (v) => (v !== null ? `${(v * 100).toFixed(2)}%` : '-'),
    tooltip: 'Cumulative return over the period',
    color: 'success',
  },
  {
    key: 'totalTrades',
    label: 'Total Trades',
    formatter: (v) => (v !== null ? v.toString() : '-'),
    tooltip: 'Number of trades executed',
    color: 'info',
  },
  {
    key: 'avgTradeReturn',
    label: 'Avg Trade Return',
    formatter: (v) => (v !== null ? `${(v * 100).toFixed(2)}%` : '-'),
    tooltip: 'Average return per trade',
    color: 'secondary',
  },
  {
    key: 'expectancy',
    label: 'Expectancy',
    formatter: (v) => (v !== null ? v.toFixed(3) : '-'),
    tooltip: 'Expected profit per trade',
    color: 'warning',
  },
];

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  return (
    <Grid container spacing={2}>
      {metricConfigs.map((config) => {
        const value = metrics[config.key];
        const formatted = config.formatter(value);
        return (
          <Grid item xs={12} sm={6} md={3} key={config.key}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderLeft: 4,
                borderColor: `${config.color}.main`,
              }}
              elevation={1}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Typography variant="subtitle2" color="text.secondary">
                  {config.label}
                </Typography>
                <Tooltip title={config.tooltip} arrow>
                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7 }} />
                </Tooltip>
              </Box>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 600 }}>
                {formatted}
              </Typography>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MetricsDashboard;