import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface EquityCurvePoint {
  date: string;
  equity: number;
}

interface EquityCurveChartProps {
  data: EquityCurvePoint[];
  height?: number;
}

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ data, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mui-palette-divider)" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
          stroke="var(--mui-palette-text-secondary)"
        />
        <YAxis
          stroke="var(--mui-palette-text-secondary)"
          tickFormatter={(value) => `$${value.toFixed(2)}`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Equity']}
          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          contentStyle={{
            backgroundColor: 'var(--mui-palette-background-paper)',
            borderColor: 'var(--mui-palette-divider)',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="equity"
          stroke="var(--mui-palette-primary-main)"
          strokeWidth={2}
          dot={false}
          name="Portfolio Equity"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default EquityCurveChart;