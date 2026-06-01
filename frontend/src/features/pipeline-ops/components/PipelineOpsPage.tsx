import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import { PipelineOpsTable } from './PipelineOpsTable';
import { PipelineStatusStrip } from './PipelineStatusStrip';
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
  const dailyPipelineCommand = catalog?.commands.find((command) => command.commandKey === 'PIPELINE_RUN_ALL') || null;
  const dailyPipelineEnabled = dailyPipelineCommand?.availability === 'ENABLED';

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

  const handleDailyPipeline = useCallback(async () => {
    setCommandError(null);
    setCommandPendingKey('PIPELINE_RUN_ALL');
    try {
      await executePipelineCommand({
        commandKey: 'PIPELINE_RUN_ALL',
        region: scope.region,
        assetType: scope.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        runMode: 'single_batch',
        batchSize: 100,
        offset: 0,
        idempotencyKey: crypto.randomUUID(),
        force: false,
      });
      await refresh();
    } catch (err: any) {
      const payloadMessage = typeof err?.response?.data?.error === 'string' ? err.response.data.error : null;
      const structuredErrors = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors.join(' | ') : null;
      setCommandError(structuredErrors || payloadMessage || (err instanceof Error ? err.message : 'Failed to run daily pipeline'));
    } finally {
      setCommandPendingKey(null);
    }
  }, [refresh, scope.assetType, scope.region]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
      <PageHeader
        title="Daily Pipeline Ops"
        subtitle="Run and monitor the daily market-intelligence pipeline. Market-data backfill and source-file operations live in Market Data Ops."
        primaryAction={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => void handleDailyPipeline()}
              disabled={!dailyPipelineEnabled || catalogLoading || commandPendingKey !== null}
            >
              {commandPendingKey === 'PIPELINE_RUN_ALL' ? 'Running Pipeline' : 'Run Daily Pipeline'}
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void refresh()} disabled={loading || refreshing}>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
          </Stack>
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
        {!dailyPipelineEnabled && !catalogLoading && dailyPipelineCommand?.disabledReason && (
          <Alert severity="warning">{dailyPipelineCommand.disabledReason}</Alert>
        )}
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
