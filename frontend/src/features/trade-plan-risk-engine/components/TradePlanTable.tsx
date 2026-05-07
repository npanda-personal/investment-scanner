import React from 'react';
import { Chip, Typography, Button } from '@mui/material';
import { TradePlanResultDto } from '../types';
import { Link } from 'react-router-dom';
import { DataTable, DataTableColumn, SortDirection } from '@/shared/components/DataTable';

interface TradePlanTableProps {
  plans: TradePlanResultDto[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, sortDirection: SortDirection) => void;
}

export const TradePlanTable: React.FC<TradePlanTableProps> = ({
  plans,
  loading,
  page,
  pageSize,
  totalCount,
  sortBy,
  sortDirection,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}) => {
  const columns: DataTableColumn<TradePlanResultDto>[] = [
    { id: 'symbol', label: 'Symbol', render: (p) => <strong>{p.symbol}</strong> },
    { id: 'strategy', label: 'Strategy', render: (p) => <Typography variant="body2">{p.strategy}</Typography> },
    { 
      id: 'planStatus', 
      label: 'Status', 
      sortable: true,
      render: (p) => (
        <Chip 
          label={p.planStatus} 
          color={p.planStatus === 'VALID' ? 'success' : p.planStatus === 'WATCH' ? 'warning' : 'error'} 
          size="small" 
        />
      )
    },
    { 
      id: 'riskGrade', 
      label: 'Risk Grade', 
      sortable: true,
      render: (p) => (
        <Chip 
          label={p.riskGrade} 
          color={p.riskGrade === 'LOW' ? 'success' : p.riskGrade === 'MEDIUM' ? 'warning' : 'error'} 
          size="small" 
          variant="outlined"
        />
      )
    },
    {
      id: 'paperReadinessStatus',
      label: 'Paper Readiness',
      render: (p) => (
        <Chip
          label={p.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'Paper Review Candidate' : p.paperReadinessStatus || 'Not Classified'}
          color={p.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'success' : p.paperReadinessStatus === 'WATCH_ONLY' ? 'warning' : 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    { id: 'strategyRating', label: 'Strategy Rating', sortable: true, render: (p) => <Chip size="small" label={p.strategyRating || 'UNPROVEN'} variant="outlined" /> },
    { id: 'backtestTimeframe', label: 'Proof Timeframe', render: (p) => p.backtestTimeframe || '-' },
    { id: 'entryZone', label: 'Entry Zone', render: (p) => p.entryZone ? `${p.entryZone.preferredEntryMin.toFixed(2)} - ${p.entryZone.preferredEntryMax.toFixed(2)}` : '-' },
    { id: 'stopLoss', label: 'Stop Loss', render: (p) => p.stopLoss ? p.stopLoss.price.toFixed(2) : '-' },
    { id: 'target', label: 'Target', render: (p) => p.target ? `${p.target.price.toFixed(2)}${p.target.method === 'REWARD_RISK_MULTIPLE' ? ' (Default 2R target)' : ''}` : '-' },
    { id: 'rewardRiskRatio', label: 'R/R', render: (p) => <strong>{p.rewardRiskRatio.toFixed(2)}</strong> },
    { id: 'actions', label: 'Actions', align: 'right', render: (p) => <Button size="small" component={Link} to={`/trade-plans/${p.instrumentId}`}>View</Button> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={plans}
      getRowId={(p) => p.id || p.instrumentId}
      loading={loading}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onSortChange={onSortChange}
      emptyMessage="No trade plans generated yet."
    />
  );
};
