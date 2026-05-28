import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
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

function formatMove(row: SignalPositionLedgerActiveRow): string {
  if (row.currentReturnStatus !== 'CURRENT' || row.currentReturnPercent === null) {
    return labelize(row.currentReturnStatus);
  }

  return `${row.currentReturnPercent >= 0 ? '+' : ''}${numberFormatter.format(row.currentReturnPercent)}%`;
}

function healthLabel(row: SignalPositionLedgerActiveRow): string {
  if (row.healthState === 'EXIT_TRIGGERED') return 'Exit review';
  if (row.healthState === 'RISK_WARNING') return 'Risk warning';
  return 'No exit evidence';
}

type ActivePositionsTableProps = {
  data: SignalPositionLedgerActiveListResponse;
  loading: boolean;
  error: string | null;
  scopeLabel: string;
  variant?: 'active' | 'closed';
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
  variant = 'active',
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedRow, setSelectedRow] = useState<SignalPositionLedgerActiveRow | null>(null);
  const columns = useMemo<DataTableColumn<SignalPositionLedgerActiveRow>[]>(() => {
    const baseColumns: DataTableColumn<SignalPositionLedgerActiveRow>[] = [
    {
      id: 'company',
      label: 'Stock',
      minWidth: 190,
      maxWidth: 260,
      render: (row) => (
        <Tooltip title={`${row.symbol} - ${row.companyName || 'Company unavailable'}`} arrow>
          <Typography variant="body2" fontWeight={800} noWrap>
            {row.symbol} - {row.companyName || 'Company unavailable'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'entry',
      label: 'Trigger',
      minWidth: 145,
      maxWidth: 170,
      render: (row) => (
        <Typography variant="body2" fontWeight={700} noWrap>
          {formatDate(row.entryTriggerTimestamp)} @ {formatPrice(row.entryTriggerPrice)}
        </Typography>
      ),
    },
    ...(variant === 'closed' ? [{
      id: 'exit',
      label: 'Exit',
      minWidth: 145,
      maxWidth: 170,
      render: (row: SignalPositionLedgerActiveRow) => (
        <Typography variant="body2" fontWeight={700} noWrap>
          {formatDate(row.exitTriggerTimestamp || null)} @ {formatPrice(row.exitTriggerPrice ?? null)}
        </Typography>
      ),
    } satisfies DataTableColumn<SignalPositionLedgerActiveRow>] : []),
    {
      id: 'move',
      label: variant === 'closed' ? 'Final return' : 'Return till date',
      align: 'right',
      render: (row) => (
        <Chip
          size="small"
          variant={row.currentReturnStatus === 'CURRENT' ? 'filled' : 'outlined'}
          color={row.currentReturnStatus === 'CURRENT' && (row.currentReturnPercent ?? 0) >= 0 ? 'success' : 'default'}
          label={formatMove(row)}
        />
      ),
    },
    {
      id: 'quality',
      label: 'Evidence',
      minWidth: 210,
      maxWidth: 240,
      render: (row) => (
        <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, overflow: 'hidden' }}>
          <StatusBadge label={row.currentDataQualityStatus || 'DQ unavailable'} />
          <StatusBadge label={row.strategyRatingGrade ? `Grade ${row.strategyRatingGrade}` : 'Grade N/A'} />
        </Stack>
      ),
    },
    {
      id: 'state',
      label: 'Lifecycle',
      render: (row) => <StatusBadge label={variant === 'closed' ? 'Closed' : healthLabel(row)} />,
    },
    {
      id: 'strategy',
      label: 'Rule',
      minWidth: 220,
      maxWidth: 300,
      render: (row) => (
        <Tooltip title={`${row.strategyId || 'Unavailable'} - ${row.entryRuleId || 'Entry rule unavailable'}`} arrow>
          <Typography variant="body2" noWrap>
            {row.strategyId || 'Unavailable'} - {row.entryRuleId || 'Entry rule unavailable'}
          </Typography>
        </Tooltip>
      ),
    },
    ];
    return baseColumns;
  }, [variant]);

  return (
    <>
      <DataTable
        columns={columns}
        rows={data.items}
        getRowId={(row) => row.signalId || `${row.instrumentId}-${row.entryTriggerTimestamp}`}
        loading={loading}
        error={error ? `${variant === 'closed' ? 'Closed history' : 'Entry trigger candidate'} data could not be loaded for ${scopeLabel}. ${error}` : null}
        emptyMessage={variant === 'closed' ? `No closed entry-trigger history is available for ${scopeLabel}.` : `No active entry trigger candidates are available for ${scopeLabel}.`}
        page={page}
        pageSize={pageSize}
        totalCount={data.totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={setSelectedRow}
      />

      <Dialog open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} maxWidth="md" fullWidth>
        {selectedRow && (
          <>
            <DialogTitle>
              <Stack spacing={0.5}>
                <Typography variant="h6">{selectedRow.symbol} {variant === 'closed' ? 'closed history' : 'entry trigger evidence'}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRow.companyName || 'Company unavailable'}</Typography>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Trigger ${formatDate(selectedRow.entryTriggerTimestamp)}`} variant="outlined" />
                  <Chip label={`Price ${formatPrice(selectedRow.entryTriggerPrice)}`} variant="outlined" />
                  <Chip label={`Raw move ${formatMove(selectedRow)}`} variant="outlined" />
                  <Chip label={`DQ ${selectedRow.currentDataQualityStatus || 'Unavailable'}`} variant="outlined" />
                  <Chip label={`Lifecycle ${healthLabel(selectedRow)}`} variant="outlined" />
                </Stack>

                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Reason</Typography>
                  <Typography color="text.secondary">{selectedRow.entryReasonSummary}</Typography>
                </Box>

                {variant === 'closed' && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>Exit Reason</Typography>
                    <Typography color="text.secondary">{selectedRow.exitReasonSummary || 'Exit reason unavailable.'}</Typography>
                  </Box>
                )}

                <Divider />

                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <DetailBlock label="Strategy" value={`${selectedRow.strategyId || 'Unavailable'} v${selectedRow.strategyVersion || 'N/A'}`} />
                  <DetailBlock label="Decision" value={labelize(selectedRow.strategyDecision)} />
                  <DetailBlock label="Entry Rule" value={selectedRow.entryRuleId || 'Unavailable'} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <DetailBlock label="Readiness" value={labelize(selectedRow.strategyReadinessLabel)} />
                  <DetailBlock label="Rating Grade" value={selectedRow.strategyRatingGrade || 'Unavailable'} />
                  <DetailBlock label="Forward Validation" value={labelize(selectedRow.calibrationEvidenceStatus)} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <DetailBlock label="Latest Trusted Price" value={`${formatPrice(selectedRow.latestTrustedPrice)} on ${formatDate(selectedRow.latestTrustedPriceDate)}`} />
                  <DetailBlock label="Trust Evidence" value={labelize(selectedRow.trustEvidenceStatus)} />
                  <DetailBlock label="Lifecycle Evidence" value={labelize(selectedRow.lifecycleEvidenceStatus)} />
                </Stack>

                {(selectedRow.displayWarnings || []).length > 0 && (
                  <AlertList warnings={selectedRow.displayWarnings || []} />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedRow(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700}>{value}</Typography>
    </Box>
  );
}

function AlertList({ warnings }: { warnings: string[] }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={800}>Warnings</Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {warnings.map((warning) => (
          <Typography key={warning} variant="body2" color="text.secondary">- {warning}</Typography>
        ))}
      </Stack>
    </Box>
  );
}
