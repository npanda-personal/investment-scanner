import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface DrawdownPoint {
  date: string;
  drawdown: number; // negative percentage, e.g., -0.05 for -5%
}

interface DrawdownChartProps {
  data: DrawdownPoint[];
  height?: number;
}

const DrawdownChart: React.FC<DrawdownChartProps> = ({ data, height = 250 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mui-palette-divider)" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
          stroke="var(--mui-palette-text-secondary)"
        />
        <YAxis
          stroke="var(--mui-palette-text-secondary)"
          tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
        />
        <Tooltip
          formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, 'Drawdown']}
          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          contentStyle={{
            backgroundColor: 'var(--mui-palette-background-paper)',
            borderColor: 'var(--mui-palette-divider)',
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="var(--mui-palette-error-main)"
          fill="var(--mui-palette-error-light)"
          fillOpacity={0.6}
          name="Drawdown"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DrawdownChart;