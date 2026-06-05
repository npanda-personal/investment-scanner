import { Box, Chip, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { usePipelineStatus, type PipelineStatusStage, type PipelineStatusValue } from '@/features/pipeline-ops';
import { humanizeCode } from '@/shared/format/enumLabels';

type DataQualityPipelineStatusStripProps = {
  region: string;
  assetType: string;
};

type CompactPipelineIndicatorStatus = PipelineStatusValue | 'NO_RUN_EVIDENCE' | null;

const STAGE_KEY = 'DATA_QUALITY';
const STAGE_LABEL = 'Data Quality';

const formatDateTime = (value: string | null): string => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatDataThroughDate = (value: string | null): string => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const resolveProgress = (stage: PipelineStatusStage | null) => {
  if (!stage) {
    return {
      processedCount: null as number | null,
      totalCount: null as number | null,
      percent: null as number | null,
      hasKnownTotal: false,
    };
  }

  const totalCount = stage.totalCount > 0 ? stage.totalCount : null;
  const processedCount = stage.processedCount;
  const percent = totalCount ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : null;

  return {
    processedCount,
    totalCount,
    percent,
    hasKnownTotal: totalCount !== null,
  };
};

export function DataQualityPipelineStatusStrip({ region, assetType }: DataQualityPipelineStatusStripProps) {
  const { data, loading, refreshing, error } = usePipelineStatus(region, assetType);
  const stageGroup = data?.stages.find((stage) => stage.stageKey === STAGE_KEY) ?? null;
  const stage = stageGroup?.activeStage ?? stageGroup?.lastStage ?? null;
  const isLoadedNoRunEvidence = Boolean(data) && !loading && !error && !stageGroup;
  const status: CompactPipelineIndicatorStatus = stage ? stage.status : (isLoadedNoRunEvidence ? 'NO_RUN_EVIDENCE' : null);
  const progress = resolveProgress(stage);
  const warningsCount = stage?.warnings.length ?? 0;
  const errorsCount = stage?.errors.length ?? 0;
  const progressText = loading && !data
    ? 'Loading pipeline snapshot...'
    : error
      ? 'Pipeline status unavailable'
      : stage
        ? (progress.hasKnownTotal ? `${progress.processedCount} / ${progress.totalCount} (${progress.percent}%)` : `${progress.processedCount} processed`)
        : isLoadedNoRunEvidence
          ? 'No run evidence'
          : 'Unavailable';
  const progressVariant = stage
    ? (progress.percent === null ? 'indeterminate' : 'determinate')
    : (loading && !error ? 'indeterminate' : 'determinate');
  const progressValue = progressVariant === 'determinate' ? (progress.percent ?? 0) : undefined;

  return (
    <Box
      data-testid="data-quality-pipeline-status-strip"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 2,
        py: 1.5,
        mb: 2,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Pipeline stage</Typography>
            <Typography variant="body2" fontWeight={700}>{STAGE_LABEL}</Typography>
            <Chip size="small" label={`${region} / ${assetType}`} />
            {status && <Chip size="small" variant="outlined" label={humanizeCode(status)} />}
            {loading && <CircularProgress size={14} />}
            {refreshing && !loading && <Typography variant="caption" color="text.secondary">Refreshing...</Typography>}
          </Stack>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Progress: {progressText}</Typography>
            <Typography variant="caption" color="text.secondary">Warnings: {warningsCount}</Typography>
            <Typography variant="caption" color="text.secondary">Errors: {errorsCount}</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Started: {formatDateTime(stage?.startedAt ?? null)}</Typography>
            <Typography variant="caption" color="text.secondary">Completed: {formatDateTime(stage?.completedAt ?? null)}</Typography>
            <Typography variant="caption" color="text.secondary">Updated: {formatDateTime(stage?.updatedAt ?? null)}</Typography>
            <Typography variant="caption" color="text.secondary">Data through: {formatDataThroughDate(stage?.dataThroughDate ?? null)}</Typography>
          </Stack>
          {isLoadedNoRunEvidence && (
            <Typography variant="caption" color="text.secondary">
              No run evidence is available yet for the current scope.
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error.main">
              Pipeline status unavailable: {error}
            </Typography>
          )}
        </Stack>
        <Typography
          component={RouterLink}
          to="/pipeline-ops"
          variant="caption"
          sx={{ fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          View Pipeline Ops details
        </Typography>
      </Stack>
      <LinearProgress
        variant={progressVariant}
        value={progressValue}
        sx={{ mt: 1.25, height: 6, borderRadius: 1 }}
      />
    </Box>
  );
}
