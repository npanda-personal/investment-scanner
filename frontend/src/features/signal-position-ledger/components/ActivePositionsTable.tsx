import React, { useMemo } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { DataTable, StatusBadge, type DataTableColumn } from '@/shared/components';
import type { SignalPositionLedgerActiveListResponse, SignalPositionLedgerActiveRow } from '../types';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function labelize(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null): string {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unavailable';
  return dateFormatter.format(date);
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return numberFormatter.format(value);
}

function formatReturn(row: SignalPositionLedgerActiveRow): string {
  if (row.currentReturnStatus !== 'CURRENT' || row.currentReturnPercent === null) {
    return labelize(row.currentReturnStatus);
  }

  return `${row.currentReturnPercent >= 0 ? '+' : ''}${numberFormatter.format(row.currentReturnPercent)}%`;
}

function healthLabel(row: SignalPositionLedgerActiveRow): string {
  if (row.healthState === 'EXIT_TRIGGERED') return 'Exit-trigger compatibility';
  if (row.healthState === 'RISK_WARNING') return 'Risk warning';
  return 'No compatibility state';
}

type ActivePositionsTableProps = {
  data: SignalPositionLedgerActiveListResponse;
  loading: boolean;
  error: string | null;
  scopeLabel: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export const ActivePositionsTable: React.FC<ActivePositionsTableProps> = ({
  data,
  loading,
  error,
  scopeLabel,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const columns = useMemo<DataTableColumn<SignalPositionLedgerActiveRow>[]>(() => [
    {
      id: 'company',
      label: 'Company',
      render: (row) => (
        <Stack spacing={0.25} sx={{ minWidth: 160 }}>
          <Typography variant="body2" fontWeight={700} noWrap>{row.companyName || row.symbol}</Typography>
          <Typography color="text.secondary" variant="caption" noWrap>{row.symbol}</Typography>
        </Stack>
      ),
    },
    {
      id: 'scope',
      label: 'Scope',
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.region || 'Unavailable'}</Typography>
          <Typography color="text.secondary" variant="caption">{row.assetType || 'Unavailable'}</Typography>
        </Stack>
      ),
    },
    {
      id: 'entry',
      label: 'Entry trigger',
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{formatDate(row.entryTriggerTimestamp)}</Typography>
          <Typography color="text.secondary" variant="caption">{formatPrice(row.entryTriggerPrice)}</Typography>
        </Stack>
      ),
    },
    {
      id: 'reason',
      label: 'Reason summary',
      render: (row) => (
        <Tooltip title={row.entryReasonSummary} arrow>
          <Typography
            variant="body2"
            tabIndex={0}
            sx={{
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.entryReasonSummary}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'priceBasis',
      label: 'Latest price basis',
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{formatPrice(row.latestTrustedPrice)}</Typography>
          <Typography color="text.secondary" variant="caption">{formatDate(row.latestTrustedPriceDate)}</Typography>
        </Stack>
      ),
    },
    {
      id: 'return',
      label: 'Return from entry',
      align: 'right',
      render: (row) => (
        <Chip
          size="small"
          variant={row.currentReturnStatus === 'CURRENT' ? 'filled' : 'outlined'}
          color={row.currentReturnStatus === 'CURRENT' ? 'primary' : 'default'}
          label={formatReturn(row)}
        />
      ),
    },
    {
      id: 'state',
      label: 'Current state',
      render: (row) => <StatusBadge label={healthLabel(row)} />,
    },
    {
      id: 'trust',
      label: 'Trust',
      render: (row) => (
        <Stack spacing={0.5} alignItems="flex-start">
          <StatusBadge label={row.currentDataQualityStatus || 'DQ unavailable'} />
          <StatusBadge label={labelize(row.trustEvidenceStatus)} />
          <Typography color="text.secondary" variant="caption">
            {row.lifecycleEvidenceStatus === 'UNAVAILABLE' ? 'Lifecycle proof deferred' : labelize(row.lifecycleEvidenceStatus)}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'strategy',
      label: 'Strategy',
      render: (row) => (
        <Stack spacing={0.25} sx={{ minWidth: 150 }}>
          <Typography variant="body2" noWrap>{row.strategyId || 'Unavailable'}</Typography>
          <Typography color="text.secondary" variant="caption" noWrap>
            Version {row.strategyVersion || 'Unavailable'}
          </Typography>
        </Stack>
      ),
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      rows={data.items}
      getRowId={(row) => row.signalId || `${row.instrumentId}-${row.entryTriggerTimestamp}`}
      loading={loading}
      error={error ? `Active signal-position data could not be loaded for ${scopeLabel}. ${error}` : null}
      emptyMessage={`No active signal positions are available for ${scopeLabel}.`}
      page={page}
      pageSize={pageSize}
      totalCount={data.totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
};
