import React, { useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '@/shared/components';
import { useSignalPositionLedgerActiveRows } from '../hooks/useSignalPositionLedgerActiveRows';
import { useSignalPositionLedgerClosedRows } from '../hooks/useSignalPositionLedgerClosedRows';
import { ActivePositionsTable } from './ActivePositionsTable';
import { SignalPositionSummaryStrip } from './SignalPositionSummaryStrip';

type LedgerTab = 'active' | 'history';

const SignalPositionLedgerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LedgerTab>('active');
  const {
    data,
    loading,
    error,
    scope,
    page,
    pageSize,
    setPage,
    setPageSize,
    reload,
    refreshLedger,
    refreshingLedger,
  } = useSignalPositionLedgerActiveRows();
  const closed = useSignalPositionLedgerClosedRows();
  const scopeLabel = `${scope.region} / ${scope.assetType}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Position Ledger"
        subtitle={`Rule-triggered entry candidate evidence for the current market scope. Scope: ${scopeLabel}.`}
        primaryAction={<Button variant="contained" onClick={() => void refreshLedger()} disabled={refreshingLedger}>Refresh ledger data</Button>}
        secondaryActions={<Button variant="outlined" onClick={reload} disabled={loading}>Reload snapshot</Button>}
      />

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Ledger pipeline: {data.refresh.status} - processed {data.refresh.processedCount.toLocaleString()} / {data.refresh.totalCount.toLocaleString()} source signals - active {data.totalCount.toLocaleString()} - closed {closed.data.totalCount.toLocaleString()}.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated {data.refresh.updatedAt ? new Date(data.refresh.updatedAt).toLocaleString() : 'not yet'}
            </Typography>
          </Stack>
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
          <SignalPositionSummaryStrip data={data} scopeLabel={scopeLabel} loading={loading} />
          <ActivePositionsTable
            data={data}
            loading={loading}
            error={error}
            scopeLabel={scopeLabel}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
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
          onPageChange={closed.setPage}
          onPageSizeChange={closed.setPageSize}
        />
      )}
    </Box>
  );
};

export default SignalPositionLedgerPage;
