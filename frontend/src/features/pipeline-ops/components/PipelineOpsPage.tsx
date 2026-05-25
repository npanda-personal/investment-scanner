import { Alert, Box, Button, FormControlLabel, Stack, Switch } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import { PipelineOpsTable } from './PipelineOpsTable';
import { PipelineStatusStrip } from './PipelineStatusStrip';
import { useCallback, useEffect, useState } from 'react';
import { executePipelineCommand, fetchPipelineCommandCatalog } from '../api/pipelineOpsService';
import type { PipelineCommandCatalogResponse, PipelineCommandKey } from '../types';

export default function PipelineOpsPage() {
  const { scope } = useMarketScope();
  const [activeOnly, setActiveOnly] = useState(false);
  const [catalog, setCatalog] = useState<PipelineCommandCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPendingKey, setCommandPendingKey] = useState<PipelineCommandKey | null>(null);
  const { data, loading, refreshing, error, refresh } = usePipelineStatus(scope.region, scope.assetType);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetchPipelineCommandCatalog({
        region: scope.region,
        assetType: scope.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
      });
      setCatalog(response);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Failed to load command catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, [scope.assetType, scope.region]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleTriggerCommand = useCallback(async (commandKey: PipelineCommandKey) => {
    setCommandError(null);
    setCommandPendingKey(commandKey);
    try {
      await executePipelineCommand({
        commandKey,
        region: scope.region,
        assetType: scope.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        runMode: 'single_batch',
        batchSize: 25,
        offset: 0,
        idempotencyKey: crypto.randomUUID(),
        force: false,
      });
      await refresh();
    } catch (err: any) {
      const payloadMessage = typeof err?.response?.data?.error === 'string' ? err.response.data.error : null;
      const structuredErrors = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors.join(' | ') : null;
      setCommandError(structuredErrors || payloadMessage || (err instanceof Error ? err.message : 'Failed to execute pipeline command'));
    } finally {
      setCommandPendingKey(null);
    }
  }, [refresh, scope.assetType, scope.region]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
      <PageHeader
        title="Bulk Pipeline Dashboard"
        subtitle="Monitoring and OPS for backend data load, processing stages, progress, and approved manual triggers."
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
        {catalogError && <Alert severity="error">{catalogError}</Alert>}
        {commandError && <Alert severity="error">{commandError}</Alert>}
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
        <PipelineOpsTable
          snapshot={data}
          activeOnly={activeOnly}
          catalog={catalog}
          catalogLoading={catalogLoading}
          commandPendingKey={commandPendingKey}
          onTriggerCommand={handleTriggerCommand}
        />
      </Stack>
    </Box>
  );
}
