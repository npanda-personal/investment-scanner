import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Tab, Tabs } from '@mui/material';
import { PageHeader } from '@/shared/components';
import { useSignalPositionLedgerActiveRows } from '../hooks/useSignalPositionLedgerActiveRows';
import { ActivePositionsTable } from './ActivePositionsTable';
import { ClosedHistoryPlaceholder } from './ClosedHistoryPlaceholder';
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
  } = useSignalPositionLedgerActiveRows();
  const scopeLabel = `${scope.region} / ${scope.assetType}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Signal Position Ledger"
        subtitle={`System-picked signal-position evidence for the current market scope. Scope: ${scopeLabel}.`}
        primaryAction={<Button variant="outlined" onClick={reload} disabled={loading}>Refresh</Button>}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
          Active signal-position data could not be loaded for {scopeLabel}.
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
          <Tab value="active" label="Active Positions" />
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
        <ClosedHistoryPlaceholder />
      )}
    </Box>
  );
};

export default SignalPositionLedgerPage;
