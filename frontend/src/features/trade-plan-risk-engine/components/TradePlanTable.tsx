import React from 'react';
import { Chip, Typography, Button } from '@mui/material';
import { TradePlanResultDto } from '../types';
import { Link } from 'react-router-dom';
import { DataTable, DataTableColumn, SortDirection } from '@/shared/components/DataTable';
import { humanizeCode } from '@/shared/format/enumLabels';

interface TradePlanTableProps {
  plans: TradePlanResultDto[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  emptyMessage?: string;
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
  emptyMessage,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}) => {
  const currencyCode = (plan: TradePlanResultDto) => plan.marketDataSnapshot?.currency || (plan.region === 'IN' ? 'INR' : 'USD');
  const fmtMoney = (plan: TradePlanResultDto, value: number | null | undefined) =>
    value === null || value === undefined ? '-' : `${currencyCode(plan)} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtRR = (p: TradePlanResultDto) => typeof p.rewardRiskRatio === 'number' ? `${p.rewardRiskRatio.toFixed(1)}R` : '-';
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
      label: 'Risk',
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
      id: 'entryZone',
      label: 'Entry',
      render: (p) => p.entryZone
        ? <Typography variant="body2" noWrap>{fmtMoney(p, p.entryZone.preferredEntryMin)}–{fmtMoney(p, p.entryZone.preferredEntryMax)}</Typography>
        : <Typography variant="body2" color="text.secondary">-</Typography>,
    },
    {
      id: 'stopLoss',
      label: 'Stop',
      render: (p) => p.stopLoss
        ? <Typography variant="body2" color="error.main">{fmtMoney(p, p.stopLoss.price)}</Typography>
        : <Typography variant="body2" color="text.secondary">-</Typography>,
    },
    {
      id: 'target',
      label: 'Target',
      render: (p) => p.target
        ? <Typography variant="body2" color="success.main">{fmtMoney(p, p.target.price)}</Typography>
        : <Typography variant="body2" color="text.secondary">-</Typography>,
    },
    {
      id: 'rewardRiskRatio',
      label: 'R:R',
      sortable: true,
      render: (p) => <Typography variant="body2">{fmtRR(p)}</Typography>,
    },
    {
      id: 'paperReadinessStatus',
      label: 'Readiness',
      render: (p) => (
        <Chip
          label={p.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'Paper Review' : p.paperReadinessStatus || 'N/A'}
          color={p.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'success' : p.paperReadinessStatus === 'WATCH_ONLY' ? 'warning' : 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    { id: 'strategyRating', label: 'Rating', sortable: true, render: (p) => <Chip size="small" label={humanizeCode(p.strategyRating || 'UNPROVEN')} variant="outlined" /> },
    { id: 'latestPrice', label: 'Price', render: (p) => fmtMoney(p, p.latestPrice ?? p.marketDataSnapshot?.latestPrice) },
    { id: 'reason', label: 'Reason', render: (p) => <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{p.strategyDecisionSnapshot?.reasons?.[0] || p.paperReadinessReasons?.[0] || p.warnings?.[0] || '-'}</Typography> },
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
      emptyMessage={emptyMessage || 'No trade plans generated yet.'}
    />
  );
};
