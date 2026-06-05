import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { PipelineCommandCatalogResponse, PipelineCommandKey, PipelineCommandResponse } from '../types';

export default function PipelineOpsPage() {
  const { scope } = useMarketScope();
  const [activeOnly, setActiveOnly] = useState(false);
  const [catalog, setCatalog] = useState<PipelineCommandCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState<PipelineCommandResponse | null>(null);
  const commandResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Clear transient command result after 12 seconds
  const showCommandResult = (result: PipelineCommandResponse) => {
    setCommandResult(result);
    if (commandResultTimerRef.current) clearTimeout(commandResultTimerRef.current);
    commandResultTimerRef.current = setTimeout(() => setCommandResult(null), 12000);
  };

  useEffect(() => () => {
    if (commandResultTimerRef.current) clearTimeout(commandResultTimerRef.current);
  }, []);

  const handleDailyPipeline = useCallback(async () => {
    setCommandError(null);
    setCommandResult(null);
    setCommandPendingKey('PIPELINE_RUN_ALL');
    try {
      const result = await executePipelineCommand({
        commandKey: 'PIPELINE_RUN_ALL',
        region: scope.region,
        assetType: scope.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        runMode: 'full_latest_trading_date',
        batchSize: 100,
        offset: 0,
        idempotencyKey: crypto.randomUUID(),
        force: false,
      });
      showCommandResult(result);
      await refresh();
    } catch (err: any) {
      const payloadMessage = typeof err?.response?.data?.error === 'string' ? err.response.data.error : null;
      const structuredErrors = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors.join(' | ') : null;
      setCommandError(structuredErrors || payloadMessage || (err instanceof Error ? err.message : 'Failed to run daily pipeline'));
    } finally {
      setCommandPendingKey(null);
    }
  }, [refresh, scope.assetType, scope.region]);

  // Build a human-readable summary from the command result for the transient alert
  const commandResultSummary = commandResult ? (() => {
    const { status, counts, warnings } = commandResult;
    const parts: string[] = [`Pipeline run: ${status}`];
    if (counts.skippedCount > 0) parts.push(`${counts.skippedCount} skipped (idempotency)`);
    if (counts.failedCount > 0) parts.push(`${counts.failedCount} failed`);
    if (counts.succeededCount > 0) parts.push(`${counts.succeededCount} succeeded`);
    if (warnings.length > 0) parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
    return parts.join(' | ');
  })() : null;
  const commandResultSeverity = commandResult
    ? commandResult.status === 'FAILED' ? 'error'
    : commandResult.status === 'SKIPPED' || commandResult.status === 'PARTIAL' || (commandResult.counts.skippedCount > 0 || commandResult.counts.failedCount > 0) ? 'warning'
    : 'success'
    : 'success';

  // Detect a PARTIAL last run with non-trivial skipped/failed counts
  const lastRunPartialWarning = !data?.activeRun && data?.lastRun?.status === 'PARTIAL'
    ? (() => {
      const { skippedCount, failedCount } = data.lastRun;
      const parts: string[] = ['Last pipeline run finished PARTIAL.'];
      if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
      if (failedCount > 0) parts.push(`${failedCount} failed`);
      return parts.join(' | ');
    })()
    : null;

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
        {commandError && <Alert severity="error" onClose={() => setCommandError(null)}>{commandError}</Alert>}
        {commandResult && commandResultSummary && (
          <Alert severity={commandResultSeverity} onClose={() => setCommandResult(null)}>{commandResultSummary}</Alert>
        )}
        {lastRunPartialWarning && (
          <Alert severity="warning">{lastRunPartialWarning}</Alert>
        )}
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
