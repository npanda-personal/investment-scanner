import { Alert, Box, Button, FormControlLabel, Stack, Switch } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import { PipelineOpsTable } from './PipelineOpsTable';
import { PipelineStatusStrip } from './PipelineStatusStrip';
import { useState } from 'react';

export default function PipelineOpsPage() {
  const { scope } = useMarketScope();
  const [activeOnly, setActiveOnly] = useState(false);
  const { data, loading, refreshing, error, refresh } = usePipelineStatus(scope.region, scope.assetType);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
      <PageHeader
        title="Pipeline Ops Dashboard"
        subtitle="Bulk pipeline monitoring and ops for backend freshness, stage progress, and approved operation controls."
        primaryAction={
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => void refresh()} disabled={loading || refreshing}>
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Button>
        }
        secondaryActions={
          <FormControlLabel
            control={<Switch checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />}
            label="Active only"
          />
        }
      />

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <PipelineStatusStrip
          activeRun={data?.activeRun || null}
          lastRun={data?.lastRun || null}
          generatedAt={data?.generatedAt || null}
          region={scope.region}
          assetType={scope.assetType}
        />
        {!loading && !data?.activeRun && !data?.lastRun && data?.stages.length === 0 && (
          <Alert severity="info">No pipeline run evidence yet for this scope.</Alert>
        )}
        <PipelineOpsTable snapshot={data} activeOnly={activeOnly} />
      </Stack>
    </Box>
  );
}
