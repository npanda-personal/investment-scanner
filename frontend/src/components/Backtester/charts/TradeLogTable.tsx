import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';

export interface Trade {
  id: string;
  entryDate: string;
  exitDate: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission?: number;
}

interface TradeLogTableProps {
  trades: Trade[];
}

const TradeLogTable: React.FC<TradeLogTableProps> = ({ trades }) => {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" sx={{ minWidth: 800 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell>Entry Date</TableCell>
            <TableCell>Exit Date</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Side</TableCell>
            <TableCell align="right">Entry Price</TableCell>
            <TableCell align="right">Exit Price</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">P&L</TableCell>
            <TableCell align="right">P&L %</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id} hover>
              <TableCell>{formatDate(trade.entryDate)}</TableCell>
              <TableCell>{formatDate(trade.exitDate)}</TableCell>
              <TableCell>
                <Chip label={trade.symbol} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip
                  label={trade.side}
                  size="small"
                  color={trade.side === 'long' ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="right">{formatCurrency(trade.entryPrice)}</TableCell>
              <TableCell align="right">{formatCurrency(trade.exitPrice)}</TableCell>
              <TableCell align="right">{trade.quantity}</TableCell>
              <TableCell align="right">
                <span style={{ color: trade.pnl >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                  {formatCurrency(trade.pnl)}
                </span>
              </TableCell>
              <TableCell align="right">
                <span style={{ color: trade.pnlPercent >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
                  {formatPercent(trade.pnlPercent)}
                </span>
              </TableCell>
              <TableCell>
                <Chip
                  label={trade.exitDate ? 'Closed' : 'Open'}
                  size="small"
                  color={trade.exitDate ? 'default' : 'warning'}
                  variant="outlined"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TradeLogTable;