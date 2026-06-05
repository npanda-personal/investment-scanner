import React, { useState } from 'react';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '@/shared/components';
import { fetchSignalPositionLedgerActiveRows, fetchSignalPositionLedgerClosedRows } from '../api/signalPositionLedgerApi';
import { useSignalPositionLedgerActiveRows } from '../hooks/useSignalPositionLedgerActiveRows';
import { useSignalPositionLedgerClosedRows } from '../hooks/useSignalPositionLedgerClosedRows';
import { ActivePositionsTable } from './ActivePositionsTable';
import { SignalPositionSummaryStrip } from './SignalPositionSummaryStrip';
import type { SignalPositionLedgerActiveRow } from '../types';

type LedgerTab = 'active' | 'history';

const SignalPositionLedgerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LedgerTab>('active');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const {
    data,
    loading,
    error,
    scope,
    page,
    pageSize,
    sortBy,
    sortDirection,
    setPage,
    setPageSize,
    setSort,
    reload,
  } = useSignalPositionLedgerActiveRows();
  const closed = useSignalPositionLedgerClosedRows();
  const scopeLabel = `${scope.region} / ${scope.assetType}`;
  const currentTabLoading = activeTab === 'active' ? loading : closed.loading;

  const exportCurrentRows = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const rows: SignalPositionLedgerActiveRow[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      const fetchRows = activeTab === 'active' ? fetchSignalPositionLedgerActiveRows : fetchSignalPositionLedgerClosedRows;
      const currentSortBy = activeTab === 'active' ? sortBy : closed.sortBy;
      const currentSortDirection = activeTab === 'active' ? sortDirection : closed.sortDirection;
      while (hasMore) {
        const pageResult = await fetchRows({
          region: scope.region,
          assetType: scope.assetType,
          limit,
          offset,
          sortBy: currentSortBy,
          sortDirection: currentSortDirection,
        });
        rows.push(...pageResult.items);
        hasMore = pageResult.hasMore;
        offset = pageResult.nextOffset ?? offset + pageResult.items.length;
        if (pageResult.items.length === 0) break;
      }
      downloadLedgerCsv(rows, scopeLabel, activeTab);
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : 'Signal Position Ledger export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Trigger Monitor"
        subtitle={`Read-only rule-trigger lifecycle evidence for the current market scope. Scope: ${scopeLabel}.`}
        secondaryActions={(
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            <Button variant="outlined" onClick={reload} disabled={loading}>Reload snapshot</Button>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => void exportCurrentRows()} disabled={exporting || currentTabLoading}>
              {exporting ? 'Exporting' : 'Export CSV'}
            </Button>
          </Stack>
        )}
      />

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {data.refresh.status === 'RUNNING'
              ? 'Updating signal ledger entries. Rows already processed remain available below.'
              : `${data.totalCount.toLocaleString()} open entries and ${closed.data.totalCount.toLocaleString()} closed entries for ${scopeLabel}.`}
          </Typography>
          {data.refresh.status === 'RUNNING' && (
            <LinearProgress
              variant={data.refresh.totalCount > 0 ? 'determinate' : 'indeterminate'}
              value={data.refresh.totalCount > 0 ? Math.min(100, (data.refresh.processedCount / data.refresh.totalCount) * 100) : undefined}
            />
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
          Entry trigger candidate data could not be loaded for {scopeLabel}.
        </Alert>
      )}

      {data.warnings.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {data.warnings.join(' ')}
        </Alert>
      )}

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>
      )}

      <SignalPositionSummaryStrip data={data} scopeLabel={scopeLabel} loading={loading} />

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_unused, value: LedgerTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, minHeight: 44, '& .MuiTab-root': { minHeight: 44, fontSize: 13, textTransform: 'none' } }}
        >
          <Tab value="active" label="Entry Trigger Candidates" />
          <Tab value="history" label="Closed History" />
        </Tabs>
      </Paper>

      {activeTab === 'active' ? (
        <>
          <ActivePositionsTable
            data={data}
            loading={loading}
            error={error}
            scopeLabel={scopeLabel}
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
          />
        </>
      ) : (
        <ActivePositionsTable
          data={closed.data}
          loading={closed.loading}
          error={closed.error}
          scopeLabel={scopeLabel}
          variant="closed"
          page={closed.page}
          pageSize={closed.pageSize}
          sortBy={closed.sortBy}
          sortDirection={closed.sortDirection}
          onPageChange={closed.setPage}
          onPageSizeChange={closed.setPageSize}
          onSortChange={closed.setSort}
        />
      )}
    </Box>
  );
};

export default SignalPositionLedgerPage;

function downloadLedgerCsv(rows: SignalPositionLedgerActiveRow[], scopeLabel: string, tab: LedgerTab) {
  const header = ['Stock', 'Entry Price', 'Trigger Date', 'Trigger Reason'].map(csvCell).join(',');
  const body = rows.map((row) => [
    row.companyName ? `${row.symbol} - ${row.companyName}` : row.symbol,
    formatExportNumber(row.entryTriggerPrice),
    row.entryTriggerTimestamp,
    row.entryReasonSummary,
  ].map(csvCell).join(',')).join('\r\n');
  const csv = `${header}\r\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const scopeSlug = scopeLabel.replace(/[^A-Z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  link.href = URL.createObjectURL(blob);
  const tabSlug = tab === 'active' ? 'open-entries' : 'closed-history';
  link.download = `signal-position-ledger-${tabSlug}-${scopeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function formatExportNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}
